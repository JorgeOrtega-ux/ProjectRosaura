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

class AdminServices {
    private $userRepository;
    private $moderationRepository;
    private $sessionManager;
    private $config;
    private $prefsManager;
    private $tokenRepository;

    public function __construct(
        UserRepositoryInterface $userRepository,
        ModerationRepositoryInterface $moderationRepository,
        SessionManagerInterface $sessionManager,
        ServerConfigRepositoryInterface $configRepository,
        UserPrefsManagerInterface $prefsManager,
        TokenRepositoryInterface $tokenRepository
    ) {
        $this->userRepository = $userRepository;
        $this->moderationRepository = $moderationRepository;
        $this->sessionManager = $sessionManager;
        $this->config = $configRepository->getConfig();
        $this->prefsManager = $prefsManager;
        $this->tokenRepository = $tokenRepository;
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
                
                // Columnas independientes (ahora leídas desde el LEFT JOIN)
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

        // Lógica inteligente para determinar la acción registrada en el Log de Moderación
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

        // Ejecutar Update con el nuevo repositorio de Moderación
        if ($this->moderationRepository->updateStatus($targetId, $dbStatus, $dbDeletedBy, $dbDeletedReason, $dbIsSuspended, $dbSuspensionType, $dbSuspensionReason, $dbEndDate, $dbAdminNotes)) {
            
            // Guardar Log Inmutable en el historial
            $this->moderationRepository->logAction($targetId, $currentUserId, $actionType, $logReason, $dbEndDate, $dbAdminNotes);
            Logger::security("Admin ID: $currentUserId actualizó restricciones/estado del usuario $targetId", 'critical');
            
            if ($dbStatus === 'deleted' || $dbIsSuspended === 1) {
                // Cerrar todas las sesiones
                $this->tokenRepository->deleteAllByUserId($targetId);
                
                // NOTIFICAR AL USUARIO POR CORREO SI FUE SOLICITADO
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
}
?>