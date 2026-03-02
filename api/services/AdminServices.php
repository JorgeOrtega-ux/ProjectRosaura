<?php
// api/services/AdminServices.php

namespace App\Api\Services;

use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\Mail\Mailer;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Interfaces\RateLimiterInterface;

class AdminServices {
    private $userRepository;
    private $moderationRepository;
    private $sessionManager;
    private $configRepository;
    private $config;
    private $prefsManager;
    private $tokenRepository;
    private $rateLimiter;

    public function __construct(
        UserRepositoryInterface $userRepository,
        ModerationRepositoryInterface $moderationRepository,
        SessionManagerInterface $sessionManager,
        ServerConfigRepositoryInterface $configRepository,
        UserPrefsManagerInterface $prefsManager,
        TokenRepositoryInterface $tokenRepository,
        RateLimiterInterface $rateLimiter
    ) {
        $this->userRepository = $userRepository;
        $this->moderationRepository = $moderationRepository;
        $this->sessionManager = $sessionManager;
        $this->configRepository = $configRepository;
        $this->config = $configRepository->getConfig();
        $this->prefsManager = $prefsManager;
        $this->tokenRepository = $tokenRepository;
        $this->rateLimiter = $rateLimiter;
    }

    private function checkAdmin() {
        $role = $this->sessionManager->get('user_role');
        return in_array($role, ['founder', 'administrator']);
    }

    private function getRoleWeight($role) {
        $weights = [
            'user' => 1, 
            'moderator' => 10, 
            'administrator' => 50, 
            'founder' => 100
        ];
        return $weights[$role] ?? 0;
    }

    private function canEditUser($targetUser) {
        $currentUserId = $this->sessionManager->get('user_id');
        $currentUserRole = $this->sessionManager->get('user_role');
        
        if ($currentUserId == $targetUser['id']) {
            return ['allowed' => false, 'message' => 'No puedes editar tu propia cuenta desde aquí. Utiliza "Tu Perfil".'];
        }

        $currentWeight = $this->getRoleWeight($currentUserRole);
        $targetWeight = $this->getRoleWeight($targetUser['role']);

        if ($currentWeight <= $targetWeight) {
            return ['allowed' => false, 'message' => 'Privilegios insuficientes para modificar a este usuario.'];
        }

        return ['allowed' => true];
    }

    private function applyAdminRateLimit($action, $defaultAttempts, $defaultMinutes, $customMsg) {
        $attempts = $this->config[$action . '_attempts'] ?? $defaultAttempts;
        $minutes = $this->config[$action . '_minutes'] ?? $defaultMinutes;
        
        $currentUserId = $this->sessionManager->get('user_id');
        $actionKey = $action . '_admin_' . $currentUserId;
        
        $rateCheck = $this->rateLimiter->check($actionKey, $attempts, $minutes, $customMsg);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Rate limit alcanzado por Admin ID: {$currentUserId} en acción: {$action}", 'warning', ['ip' => Utils::getIpAddress()]);
            return $rateCheck;
        }
        
        $this->rateLimiter->record($actionKey, $attempts, $minutes);
        return ['allowed' => true];
    }

    public function getUser($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $userPrefs = $this->prefsManager->ensureDefaultPreferences($targetId);

        return [
            'success' => true, 
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'profile_picture' => $user['profile_picture'],
                'role' => $user['role'],
                
                'user_status' => $user['user_status'],
                'deleted_by' => $user['deleted_by'],
                'deleted_reason' => $user['deleted_reason'],
                
                'is_suspended' => $user['is_suspended'] ?? 0,
                'suspension_type' => $user['suspension_type'],
                'suspension_reason' => $user['suspension_reason'],
                'suspension_end_date' => $user['suspension_end_date'],

                'admin_notes' => $user['admin_notes'] ?? ''
            ],
            'preferences' => $userPrefs
        ];
    }

    public function updateAvatar($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_edit_avatar', 20, 30, "Límite de seguridad: Has modificado demasiados avatares. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Error al subir el archivo.'];
        }
        
        $file = $files['avatar'];
        $maxSizeMb = $this->config['max_avatar_size_mb'] ?? 2;
        
        if ($file['size'] > $maxSizeMb * 1024 * 1024) return ['success' => false, 'message' => "La imagen supera el límite."];

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if ($mime !== 'image/png' && $mime !== 'image/jpeg') return ['success' => false, 'message' => 'Solo formatos PNG y JPG.'];

        $fileName = Utils::generateUUID() . (($mime === 'image/png') ? '.png' : '.jpg');
        $uploadDir = __DIR__ . '/../../public/storage/profilePictures/uploaded/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        $destPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            $oldPic = $user['profile_picture'];
            if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
                $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
                if (file_exists($oldPath)) unlink($oldPath);
            }
            
            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;
            if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
                $currentUserId = $this->sessionManager->get('user_id');
                Logger::security("Admin ID: {$currentUserId} actualizó el avatar del Usuario ID: {$targetId}", 'warning');
                return ['success' => true, 'message' => 'Foto actualizada exitosamente.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
            }
        }
        return ['success' => false, 'message' => 'Error en el servidor.'];
    }

    public function deleteAvatar($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_edit_avatar', 20, 30, "Límite de seguridad: Has modificado demasiados avatares. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $oldPic = $user['profile_picture'];
        if (strpos($oldPic, '/default/') !== false) return ['success' => false, 'message' => 'Ya tiene foto por defecto.'];

        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) unlink($oldPath);
        }

        $newRelPath = Utils::generateProfilePicture($user['username'], $user['uuid']);
        if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
            $currentUserId = $this->sessionManager->get('user_id');
            Logger::security("Admin ID: {$currentUserId} eliminó el avatar del Usuario ID: {$targetId}", 'warning');
            return ['success' => true, 'message' => 'Foto eliminada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
        }
        return ['success' => false, 'message' => 'Error en la base de datos.'];
    }

    public function updateUsername($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_edit_username', 20, 30, "Límite de seguridad: Has cambiado demasiados nombres de usuario. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $username = trim($data['username'] ?? '');
        $minLen = $this->config['min_username_length'] ?? 3;
        $maxLen = $this->config['max_username_length'] ?? 32;
        
        if (strlen($username) < $minLen || strlen($username) > $maxLen) return ['success' => false, 'message' => "Longitud inválida."];

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];

        $oldUsername = $user['username'];
        if ($this->userRepository->updateUsername($targetId, $username)) {
            $currentUserId = $this->sessionManager->get('user_id');
            Logger::security("Admin ID: {$currentUserId} cambió el username del Usuario ID: {$targetId} de {$oldUsername} a {$username}", 'warning');
            return ['success' => true, 'message' => 'Nombre de usuario actualizado.', 'new_username' => $username];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updateEmail($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_edit_email', 20, 30, "Límite de seguridad: Has cambiado demasiados correos electrónicos. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message' => 'Correo registrado en otra cuenta.'];

        $oldEmail = $user['email'];
        if ($this->userRepository->updateEmail($targetId, $email)) {
            $currentUserId = $this->sessionManager->get('user_id');
            Logger::security("Admin ID: {$currentUserId} cambió el email del Usuario ID: {$targetId} de {$oldEmail} a {$email}", 'critical');
            
            $mailer = new Mailer();
            $mailer->sendSecurityAlertEmailChanged($oldEmail, $user['username'], $email);

            return ['success' => true, 'message' => 'Correo actualizado.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updatePreference($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_edit_prefs', 50, 30, "Límite de seguridad: Has actualizado demasiadas preferencias. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if (!in_array($key, ['language', 'open_links_new_tab', 'theme', 'extended_alerts'])) return ['success' => false, 'message' => 'Preferencia no válida.'];
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        if ($this->userRepository->updatePreference($targetId, $key, $value)) return ['success' => true, 'message' => 'Preferencia actualizada.'];
        return ['success' => false, 'message' => 'Error al actualizar preferencia.'];
    }

    public function updateRole($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $role = $data['role'] ?? '';
        $password = $data['password'] ?? '';

        $validRoles = ['user', 'moderator', 'administrator', 'founder'];
        if (!in_array($role, $validRoles)) {
            return ['success' => false, 'message' => 'Rol no válido.'];
        }

        if ($role === 'founder') {
            Logger::security("Intento bloqueado de asignar rol Founder a través de API web.", 'critical');
            return ['success' => false, 'message' => 'El rol de Fundador no puede ser asignado desde la interfaz web. Contacta al administrador de la base de datos.'];
        }

        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        if ($user['role'] === 'founder') {
            Logger::security("Intento bloqueado de modificar a un Fundador (Target ID: {$targetId}).", 'critical');
            return ['success' => false, 'message' => 'No es posible modificar el rol de un Fundador desde la plataforma.'];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) {
            return ['success' => false, 'message' => $authCheck['message']];
        }

        $rl = $this->applyAdminRateLimit('admin_edit_role', 10, 30, "Protección contra cambios masivos: Límite de modificación de roles alcanzado. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $currentUserRole = $this->sessionManager->get('user_role');
        $currentWeight = $this->getRoleWeight($currentUserRole);
        $newRoleWeight = $this->getRoleWeight($role);

        if ($currentUserRole !== 'founder' && $newRoleWeight >= $currentWeight) {
            return ['success' => false, 'message' => 'No puedes asignar un rol que sea de un nivel jerárquico igual o superior al tuyo.'];
        }

        $currentUserId = $this->sessionManager->get('user_id');
        $adminData = $this->userRepository->findById($currentUserId);

        if (!$adminData || !password_verify($password, $adminData['password'])) {
            Logger::security("Fallo de cambio de rol: Contraseña incorrecta por el Admin ID: $currentUserId", 'warning');
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        if ($this->userRepository->updateRole($targetId, $role)) {
            Logger::security("Admin ID: $currentUserId actualizó rol del usuario $targetId a $role", 'critical');
            return ['success' => true, 'message' => 'El rol de la cuenta ha sido actualizado.', 'new_role' => $role];
        }
        
        return ['success' => false, 'message' => 'Error al actualizar el rol en la base de datos.'];
    }

    public function updateStatus($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $password = $data['password'] ?? '';
        
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        if ($user['role'] === 'founder') {
            Logger::security("Intento bloqueado de modificar estado de un Fundador (Target ID: {$targetId}).", 'critical');
            return ['success' => false, 'message' => 'No es posible modificar el estado de un Fundador desde la plataforma.'];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) {
            return ['success' => false, 'message' => $authCheck['message']];
        }

        $rl = $this->applyAdminRateLimit('admin_edit_status', 20, 30, "Protección del sistema: Límite de sanciones y cambios de estado alcanzado. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $currentUserId = $this->sessionManager->get('user_id');

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            Logger::security("Fallo en cambio de estado: Contraseña de admin incorrecta por el Admin ID: $currentUserId", 'warning');
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        $sanitizeText = function($text) {
            if (empty($text)) return null;
            $clean = strip_tags($text);
            $clean = htmlspecialchars(trim($clean), ENT_QUOTES, 'UTF-8');
            return empty($clean) ? null : $clean;
        };

        $dbStatus = ($data['status'] === 'deleted') ? 'deleted' : 'active';
        $dbDeletedBy = null;
        $dbDeletedReason = null;

        if ($dbStatus === 'deleted') {
            $dbDeletedBy = ($data['deleted_by'] === 'user') ? 'user' : 'admin';
            $rawDeletedReason = ($data['deleted_by'] === 'user') ? ($data['deleted_reason_user'] ?? null) : ($data['deleted_reason_admin'] ?? null);
            $dbDeletedReason = $sanitizeText($rawDeletedReason);

            if ($dbDeletedReason && mb_strlen($dbDeletedReason) > 500) {
                return ['success' => false, 'message' => 'El motivo de eliminación no puede exceder los 500 caracteres.'];
            }
        }

        $dbIsSuspended = (isset($data['is_suspended']) && $data['is_suspended'] == 1) ? 1 : 0;
        $dbSuspensionType = null;
        $dbSuspensionReason = null;
        $dbEndDate = null;
        $dbAdminNotes = $sanitizeText($data['admin_notes'] ?? null);
        $notifyUser = (isset($data['notify_user']) && $data['notify_user'] == true);

        if ($dbIsSuspended === 1) {
            $dbSuspensionType = ($data['suspension_type'] === 'temporary') ? 'temporary' : 'permanent';
            $rawSuspensionReason = $data['suspension_reason'] ?? null;
            $dbSuspensionReason = $sanitizeText($rawSuspensionReason);

            if ($dbSuspensionReason && mb_strlen($dbSuspensionReason) > 500) {
                return ['success' => false, 'message' => 'El motivo de suspensión no puede exceder los 500 caracteres.'];
            }
            
            if ($dbSuspensionType === 'temporary' && !empty($data['end_date'])) {
                $format = 'Y-m-d H:i:s';
                $d = \DateTime::createFromFormat($format, $data['end_date']);
                
                if (!$d || $d->format($format) !== $data['end_date']) {
                    return ['success' => false, 'message' => 'El formato de la fecha de fin de suspensión es inválido. Utilice AAAA-MM-DD HH:MM:SS.'];
                }

                if ($d->getTimestamp() <= time()) {
                    return ['success' => false, 'message' => 'La fecha de fin de suspensión debe estar en el futuro.'];
                }
                
                $dbEndDate = $data['end_date'];
            }
        }

        $actionType = 'note_updated';
        $logReason = null;
        
        if ($dbStatus === 'deleted' && $user['user_status'] !== 'deleted') {
            $actionType = 'deleted';
            $logReason = $dbDeletedReason;
        } elseif ($dbStatus === 'active' && $user['user_status'] === 'deleted') {
            $actionType = 'restored';
        } elseif ($dbIsSuspended === 1 && (!isset($user['is_suspended']) || $user['is_suspended'] != 1)) {
            $actionType = 'suspended';
            $logReason = $dbSuspensionReason;
        } elseif ($dbIsSuspended === 0 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            $actionType = 'unsuspended';
        } elseif ($dbIsSuspended === 1 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            if ($dbSuspensionReason !== $user['suspension_reason'] || $dbEndDate !== $user['suspension_end_date']) {
                 $actionType = 'suspended'; 
                 $logReason = $dbSuspensionReason;
            }
        }

        if ($this->moderationRepository->updateStatus($targetId, $dbStatus, $dbDeletedBy, $dbDeletedReason, $dbIsSuspended, $dbSuspensionType, $dbSuspensionReason, $dbEndDate, $dbAdminNotes)) {
            
            if ($actionType !== 'note_updated') {
                $this->moderationRepository->logAction($targetId, $currentUserId, $actionType, $logReason, $dbEndDate, null);
                Logger::security("Admin ID: $currentUserId actualizó restricciones/estado del usuario $targetId", 'critical');
            }
            
            if ($dbStatus === 'deleted' || $dbIsSuspended === 1) {
                $this->tokenRepository->deleteAllByUserId($targetId);
                
                if ($notifyUser) {
                    $action = ($dbStatus === 'deleted') ? 'deleted' : 'suspended';
                    $reasonText = ($dbStatus === 'deleted') ? $dbDeletedReason : $dbSuspensionReason;
                    $mailer = new Mailer();
                    $mailer->sendAccountStatusNotification($user['email'], $user['username'], $action, $reasonText, $dbEndDate);
                }
            }

            return ['success' => true, 'message' => 'Las configuraciones de acceso han sido guardadas y registradas.'];
        }
        
        return ['success' => false, 'message' => 'Error al guardar los cambios en la base de datos.'];
    }

    public function getModerationKardex($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $logs = $this->moderationRepository->getKardex($targetId);

        return [
            'success' => true,
            'logs' => $logs
        ];
    }

    public function addAdminNote($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $rawNote = $data['note'] ?? '';
        
        $cleanNote = strip_tags($rawNote);
        $cleanNote = htmlspecialchars(trim($cleanNote), ENT_QUOTES, 'UTF-8');
        
        if (empty($cleanNote)) {
            return ['success' => false, 'message' => 'La nota no puede estar vacía o contener código no válido.'];
        }

        if (mb_strlen($cleanNote) > 1000) {
            return ['success' => false, 'message' => 'La nota no puede exceder los 1000 caracteres.'];
        }

        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit('admin_add_note', 30, 30, "Límite de seguridad: Has agregado demasiadas notas. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $currentUserId = $this->sessionManager->get('user_id');

        if ($this->moderationRepository->logAction($targetId, $currentUserId, 'note_updated', null, null, $cleanNote)) {
            Logger::security("Admin ID: $currentUserId agregó una nota al Kardex del usuario $targetId", 'info');
            return ['success' => true, 'message' => 'Nota administrativa agregada correctamente.'];
        }

        return ['success' => false, 'message' => 'Ocurrió un error al guardar la nota.'];
    }

    public function getServerConfig() {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        $freshConfig = $this->configRepository->getConfig();
        return ['success' => true, 'config' => $freshConfig];
    }

    public function updateServerConfig($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');
        $adminData = $this->userRepository->findById($currentUserId);

        if (!$adminData || !password_verify($password, $adminData['password'])) {
            Logger::security("Fallo en configuración del servidor: Contraseña de admin incorrecta por el Admin ID: $currentUserId", 'warning');
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        $allowedFields = [
            'min_password_length', 'max_password_length', 'min_username_length', 'max_username_length', 'max_avatar_size_mb',
            'username_change_cooldown_days', 'username_change_max_attempts', 'email_change_cooldown_days', 'email_change_max_attempts',
            'avatar_change_cooldown_days', 'avatar_change_max_attempts', 'login_rate_limit_attempts', 'login_rate_limit_minutes',
            'forgot_password_rate_limit_attempts', 'forgot_password_rate_limit_minutes', 'admin_edit_avatar_attempts', 'admin_edit_avatar_minutes',
            'admin_edit_username_attempts', 'admin_edit_username_minutes', 'admin_edit_email_attempts', 'admin_edit_email_minutes',
            'admin_edit_prefs_attempts', 'admin_edit_prefs_minutes', 'admin_edit_role_attempts', 'admin_edit_role_minutes',
            'admin_edit_status_attempts', 'admin_edit_status_minutes', 'admin_add_note_attempts', 'admin_add_note_minutes',
            'auto_backup_enabled', 'auto_backup_frequency_hours', 'auto_backup_retention_count',
            'maintenance_mode' 
        ];

        $updateData = [];
        if (isset($data['config']) && is_array($data['config'])) {
            foreach ($allowedFields as $field) {
                if (isset($data['config'][$field])) {
                    $val = (int)$data['config'][$field];
                    if ($val < 0) $val = 0; 
                    $updateData[$field] = $val;
                }
            }
        }

        if (empty($updateData)) {
            return ['success' => false, 'message' => 'No se enviaron datos válidos para actualizar.'];
        }

        if ($this->configRepository->updateConfig($updateData)) {
            Logger::security("Admin ID: $currentUserId actualizó la configuración global del servidor.", 'critical');
            return ['success' => true, 'message' => 'Configuración actualizada exitosamente.'];
        }

        return ['success' => false, 'message' => 'Error al guardar en la base de datos.'];
    }

    private function getBackupDir() {
        $dir = __DIR__ . '/../../storage/backups/';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
            file_put_contents($dir . '.htaccess', "Deny from all\nOptions -Indexes");
        }
        return $dir;
    }

    public function createBackup() {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $rl = $this->applyAdminRateLimit('admin_backup_create', 5, 30, "Límite de seguridad: Has creado demasiados backups manualmente. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];
        
        try {
            $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
            $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
            
            $connectionParams = [
                'scheme' => 'tcp',
                'host'   => $redisHost,
                'port'   => $redisPort,
            ];
            
            if (!empty($_ENV['REDIS_PASS'])) {
                $connectionParams['password'] = $_ENV['REDIS_PASS'];
            }

            $redis = new \Predis\Client($connectionParams);

            $jobId = Utils::generateUUID();
            $jobKey = "backup_job:{$jobId}";

            $redis->hmset($jobKey, [
                'status' => 'pending',
                'message' => 'En cola para ejecución...',
                'created_at' => time()
            ]);
            
            $redis->expire($jobKey, 3600);

            $redis->rpush('backup_queue', [json_encode([
                'job_id' => $jobId,
                'type' => 'manual',
                'requested_by' => $this->sessionManager->get('user_id')
            ])]);

            $currentUserId = $this->sessionManager->get('user_id');
            Logger::security("Admin ID: {$currentUserId} encoló una tarea de backup manual con ID: {$jobId}", 'info');

            return ['success' => true, 'message' => 'Copia de seguridad enviada a la cola.', 'job_id' => $jobId];

        } catch (\Exception $e) {
            Logger::security("Error de Redis al encolar backup: " . $e->getMessage(), 'error');
            return ['success' => false, 'message' => 'Error al comunicar con el sistema de trabajos en segundo plano.'];
        }
    }

    public function backupStatus($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $jobId = $data['job_id'] ?? '';
        if (empty($jobId)) return ['success' => false, 'message' => 'ID de tarea no proporcionado.'];

        try {
            $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
            $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
            
            $connectionParams = [
                'scheme' => 'tcp',
                'host'   => $redisHost,
                'port'   => $redisPort,
            ];
            
            if (!empty($_ENV['REDIS_PASS'])) {
                $connectionParams['password'] = $_ENV['REDIS_PASS'];
            }

            $redis = new \Predis\Client($connectionParams);

            $jobKey = "backup_job:{$jobId}";
            
            if (!$redis->exists($jobKey)) {
                return ['success' => false, 'status' => 'not_found', 'message' => 'La tarea no existe o ya ha expirado.'];
            }

            $statusData = $redis->hgetall($jobKey);
            
            return [
                'success' => true,
                'status' => $statusData['status'] ?? 'unknown',
                'job_message' => $statusData['message'] ?? ''
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Error al consultar el estado de la tarea en Redis.'];
        }
    }

    public function restoreBackup($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');
        $adminData = $this->userRepository->findById($currentUserId);
        
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            Logger::security("Intento de restauración fallido: Contraseña incorrecta por el Admin ID: $currentUserId", 'critical');
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        $rl = $this->applyAdminRateLimit('admin_backup_restore', 3, 30, "Límite de seguridad: Has intentado restaurar copias demasiadas veces. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $backupId = $data['backup_id'] ?? '';
        if (empty($backupId)) return ['success' => false, 'message' => 'ID de copia no válido.'];
        
        $filename = basename(base64_decode($backupId));
        $dir = $this->getBackupDir();
        $filepath = $dir . $filename;
        
        if (!file_exists($filepath) || pathinfo($filename, PATHINFO_EXTENSION) !== 'enc') {
            return ['success' => false, 'message' => 'El archivo de copia de seguridad no existe o es inválido.'];
        }

        try {
            $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
            $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
            
            $connectionParams = [
                'scheme' => 'tcp',
                'host'   => $redisHost,
                'port'   => $redisPort,
            ];
            
            if (!empty($_ENV['REDIS_PASS'])) {
                $connectionParams['password'] = $_ENV['REDIS_PASS'];
            }

            $redis = new \Predis\Client($connectionParams);

            $jobId = Utils::generateUUID();
            $jobKey = "backup_job:{$jobId}";

            $redis->hmset($jobKey, [
                'status' => 'pending',
                'message' => 'En cola para restauración...',
                'created_at' => time()
            ]);
            
            $redis->expire($jobKey, 3600);

            // === ACTIVAMOS EL CANDADO DE RESTAURACIÓN DE FORMA GLOBAL ===
            // TTL de 15 MIN (900 seg) como seguridad en caso de que el worker muera sin borrarlo
            $redis->setex('system_status:restoring', 900, '1');

            $redis->rpush('backup_queue', [json_encode([
                'job_id' => $jobId,
                'type' => 'restore',
                'backup_file' => $filename,
                'requested_by' => $currentUserId
            ])]);

            Logger::security("Admin ID: {$currentUserId} encoló una tarea de restauración con ID: {$jobId} para el archivo: {$filename}", 'critical');

            return ['success' => true, 'message' => 'Restauración enviada a la cola.', 'job_id' => $jobId];

        } catch (\Exception $e) {
            Logger::security("Error de Redis al encolar restauración: " . $e->getMessage(), 'error');
            return ['success' => false, 'message' => 'Error al comunicar con el sistema de trabajos en segundo plano.'];
        }
    }

    public function deleteBackup($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');
        $adminData = $this->userRepository->findById($currentUserId);
        
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            Logger::security("Intento de eliminación de backup fallido: Contraseña incorrecta por el Admin ID: $currentUserId", 'warning');
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        $rl = $this->applyAdminRateLimit('admin_backup_delete', 10, 30, "Límite de seguridad: Has eliminado demasiadas copias de seguridad. Espera {minutes} minutos.");
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $backupId = $data['backup_id'] ?? '';
        if (empty($backupId)) return ['success' => false, 'message' => 'ID de copia no válido.'];
        
        $filename = basename(base64_decode($backupId));
        $dir = $this->getBackupDir();
        $filepath = $dir . $filename;
        
        if (file_exists($filepath) && pathinfo($filename, PATHINFO_EXTENSION) === 'enc') {
            unlink($filepath);
            Logger::security("Admin ID: {$currentUserId} eliminó la copia de seguridad cifrada: {$filename}", 'info');
            return ['success' => true, 'message' => 'Copia de seguridad eliminada.'];
        }
        
        return ['success' => false, 'message' => 'El archivo no existe o no es válido.'];
    }

    public function readLogs($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $files = $data['files'] ?? [];
        if (!is_array($files) || empty($files)) return ['success' => false, 'message' => 'No se especificaron archivos.'];
        if (count($files) > 50) return ['success' => false, 'message' => 'Máximo 50 archivos a la vez.'];

        $contents = [];
        $logBaseDir = realpath(__DIR__ . '/../../logs/');

        foreach ($files as $encodedFile) {
            $filename = base64_decode($encodedFile);
            $filepath = realpath($logBaseDir . '/' . $filename);
            
            // Prevenir directory traversal vulnerabilidades
            if ($filepath && strpos($filepath, $logBaseDir) === 0 && file_exists($filepath) && !is_dir($filepath)) {
                $contents[$encodedFile] = [
                    'filename' => basename($filepath),
                    'category' => basename(dirname($filepath)),
                    'content' => file_get_contents($filepath)
                ];
            } else {
                $contents[$encodedFile] = [
                    'filename' => htmlspecialchars($filename),
                    'error' => 'Archivo no encontrado o acceso denegado.'
                ];
            }
        }

        return ['success' => true, 'data' => $contents];
    }

    public function deleteLogs($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');
        $adminData = $this->userRepository->findById($currentUserId);
        
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message' => 'Contraseña incorrecta. Acción denegada.'];
        }

        $files = $data['files'] ?? [];
        if (!is_array($files) || empty($files)) return ['success' => false, 'message' => 'No se especificaron archivos.'];
        if (count($files) > 50) return ['success' => false, 'message' => 'Solo puedes eliminar hasta 50 archivos a la vez.'];
        
        $logBaseDir = realpath(__DIR__ . '/../../logs/');
        $deleted = 0;
        
        foreach ($files as $encodedFile) {
            $filename = base64_decode($encodedFile);
            $filepath = realpath($logBaseDir . '/' . $filename);
            if ($filepath && strpos($filepath, $logBaseDir) === 0 && file_exists($filepath) && !is_dir($filepath)) {
                unlink($filepath);
                $deleted++;
            }
        }
        
        Logger::security("Admin ID: {$currentUserId} eliminó {$deleted} archivos de log de forma masiva.", 'info');
        return ['success' => true, 'message' => "Se eliminaron {$deleted} archivos correctamente."];
    }
}
?>