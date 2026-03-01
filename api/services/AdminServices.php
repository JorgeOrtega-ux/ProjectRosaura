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

        $dbStatus = ($data['status'] === 'deleted') ? 'deleted' : 'active';
        $dbDeletedBy = null;
        $dbDeletedReason = null;

        if ($dbStatus === 'deleted') {
            $dbDeletedBy = ($data['deleted_by'] === 'user') ? 'user' : 'admin';
            $dbDeletedReason = ($data['deleted_by'] === 'user') ? ($data['deleted_reason_user'] ?? null) : ($data['deleted_reason_admin'] ?? null);
        }

        $dbIsSuspended = (isset($data['is_suspended']) && $data['is_suspended'] == 1) ? 1 : 0;
        $dbSuspensionType = null;
        $dbSuspensionReason = null;
        $dbEndDate = null;
        $dbAdminNotes = $data['admin_notes'] ?? null;
        $notifyUser = (isset($data['notify_user']) && $data['notify_user'] == true);

        if ($dbIsSuspended === 1) {
            $dbSuspensionType = ($data['suspension_type'] === 'temporary') ? 'temporary' : 'permanent';
            $dbSuspensionReason = $data['suspension_reason'] ?? null;
            
            if ($dbSuspensionType === 'temporary' && !empty($data['end_date'])) {
                if (strtotime($data['end_date']) <= time()) {
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
        
        // --- 1. SANITIZACIÓN ULTRA ESTRICTA ---
        $rawNote = $data['note'] ?? '';
        
        // Remover cualquier etiqueta HTML o PHP inyectada
        $cleanNote = strip_tags($rawNote);
        // Convertir caracteres especiales (como comillas, '&') en entidades seguras
        $cleanNote = htmlspecialchars(trim($cleanNote), ENT_QUOTES, 'UTF-8');
        
        if (empty($cleanNote)) {
            return ['success' => false, 'message' => 'La nota no puede estar vacía o contener código no válido.'];
        }

        // --- 2. VALIDACIÓN DE LONGITUD MÁXIMA ---
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
}
?>