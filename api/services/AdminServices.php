<?php
// api/services/AdminServices.php

namespace App\Api\Services;

use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;

class AdminServices {
    private $userRepository;
    private $sessionManager;
    private $config;
    private $prefsManager;

    public function __construct(
        UserRepositoryInterface $userRepository,
        SessionManagerInterface $sessionManager,
        ServerConfigRepositoryInterface $configRepository,
        UserPrefsManagerInterface $prefsManager
    ) {
        $this->userRepository = $userRepository;
        $this->sessionManager = $sessionManager;
        $this->config = $configRepository->getConfig();
        $this->prefsManager = $prefsManager;
    }

    private function checkAdmin() {
        $role = $this->sessionManager->get('user_role');
        return in_array($role, ['founder', 'administrator']);
    }

    public function getUser($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];
        
        // Obtener preferencias del usuario a editar
        $userPrefs = $this->prefsManager->ensureDefaultPreferences($targetId);

        return [
            'success' => true, 
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'profile_picture' => $user['profile_picture'],
                'role' => $user['role']
            ],
            'preferences' => $userPrefs
        ];
    }

    public function updateAvatar($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Error al subir el archivo.'];
        }
        
        $file = $files['avatar'];
        $maxSizeMb = $this->config['max_avatar_size_mb'] ?? 2;
        
        if ($file['size'] > $maxSizeMb * 1024 * 1024) {
            return ['success' => false, 'message' => "La imagen supera el límite de {$maxSizeMb}MB."];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if ($mime !== 'image/png' && $mime !== 'image/jpeg') {
            return ['success' => false, 'message' => 'Solo formatos PNG y JPG.'];
        }

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
                Logger::security("Admin " . $this->sessionManager->get('user_id') . " actualizó avatar del usuario $targetId", 'info');
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

        $oldPic = $user['profile_picture'];
        if (strpos($oldPic, '/default/') !== false) {
            return ['success' => false, 'message' => 'El usuario ya tiene una foto por defecto.'];
        }

        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) unlink($oldPath);
        }

        $newRelPath = Utils::generateProfilePicture($user['username'], $user['uuid']);
        if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
            Logger::security("Admin " . $this->sessionManager->get('user_id') . " eliminó avatar del usuario $targetId", 'info');
            return ['success' => true, 'message' => 'Foto eliminada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
        }
        return ['success' => false, 'message' => 'Error en la base de datos.'];
    }

    public function updateUsername($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $username = trim($data['username'] ?? '');
        
        $minLen = $this->config['min_username_length'] ?? 3;
        $maxLen = $this->config['max_username_length'] ?? 32;
        
        if (strlen($username) < $minLen || strlen($username) > $maxLen) {
            return ['success' => false, 'message' => "El usuario debe tener entre {$minLen} y {$maxLen} caracteres."];
        }

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $targetId) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        }

        if ($this->userRepository->updateUsername($targetId, $username)) {
            Logger::security("Admin " . $this->sessionManager->get('user_id') . " actualizó username del usuario $targetId a $username", 'info');
            return ['success' => true, 'message' => 'Nombre de usuario actualizado.', 'new_username' => $username];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updateEmail($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $email = trim($data['email'] ?? '');
        
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $targetId) {
            return ['success' => false, 'message' => 'Correo registrado en otra cuenta.'];
        }

        if ($this->userRepository->updateEmail($targetId, $email)) {
            Logger::security("Admin " . $this->sessionManager->get('user_id') . " actualizó email del usuario $targetId a $email", 'info');
            return ['success' => true, 'message' => 'Correo actualizado.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updatePreference($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if (!in_array($key, ['language', 'open_links_new_tab', 'theme', 'extended_alerts'])) {
            return ['success' => false, 'message' => 'Preferencia no válida.'];
        }
        
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') {
            $value = ($value == 1) ? 1 : 0;
        }

        if ($this->userRepository->updatePreference($targetId, $key, $value)) {
            Logger::security("Admin " . $this->sessionManager->get('user_id') . " actualizó preferencia {$key} del usuario $targetId", 'info');
            return ['success' => true, 'message' => 'Preferencia actualizada.'];
        }
        return ['success' => false, 'message' => 'Error al actualizar preferencia.'];
    }

    public function updateRole($data) {
        if (!$this->checkAdmin()) return ['success' => false, 'message' => 'No autorizado.'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $role = $data['role'] ?? '';

        $validRoles = ['user', 'moderator', 'administrator', 'founder'];
        if (!in_array($role, $validRoles)) {
            return ['success' => false, 'message' => 'Rol no válido.'];
        }

        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => 'Usuario no encontrado.'];

        $currentAdminRole = $this->sessionManager->get('user_role');
        if ($user['role'] === 'founder' && $currentAdminRole !== 'founder') {
            return ['success' => false, 'message' => 'No tienes permisos para modificar a un fundador.'];
        }

        if ($this->userRepository->updateRole($targetId, $role)) {
            Logger::security("Admin " . $this->sessionManager->get('user_id') . " actualizó rol del usuario $targetId a $role", 'info');
            return ['success' => true, 'message' => 'Rol actualizado exitosamente.', 'new_role' => $role];
        }
        return ['success' => false, 'message' => 'Error al actualizar el rol.'];
    }
}
?>