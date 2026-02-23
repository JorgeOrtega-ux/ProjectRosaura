<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Config\Database;
use App\Core\Utils;
use PDO;

class SettingsServices {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function updateAvatar($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida o expirada.'];
        }

        $files = $data['_files'] ?? [];
        
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Hubo un error al subir el archivo.'];
        }

        $file = $files['avatar'];
        
        // Validar tamaño (Máximo 2MB)
        if ($file['size'] > 2 * 1024 * 1024) {
            return ['success' => false, 'message' => 'La imagen supera el límite de 2MB.'];
        }

        // Validar tipo MIME real
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if ($mime !== 'image/png' && $mime !== 'image/jpeg') {
            return ['success' => false, 'message' => 'Solo se permiten formatos PNG y JPG.'];
        }

        $extension = ($mime === 'image/png') ? '.png' : '.jpg';
        $fileName = Utils::generateUUID() . $extension;
        
        $uploadDir = __DIR__ . '/../../public/storage/profilePictures/uploaded/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $destPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            // Eliminar imagen anterior SI pertenece a la carpeta uploaded
            $oldPic = $_SESSION['user_pic'] ?? '';
            if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
                $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }

            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;

            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            if ($stmt->execute([$newRelPath, $_SESSION['user_id']])) {
                $_SESSION['user_pic'] = $newRelPath;
                return [
                    'success' => true, 
                    'message' => 'Foto de perfil actualizada con éxito.',
                    'new_avatar' => '/ProjectRosaura/' . $newRelPath
                ];
            }
        }

        return ['success' => false, 'message' => 'No se pudo guardar la imagen en el servidor.'];
    }

    public function deleteAvatar() {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        // Eliminar imagen actual SI pertenece a uploaded
        $oldPic = $_SESSION['user_pic'] ?? '';
        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        // Generar nuevo avatar por defecto
        $newRelPath = Utils::generateProfilePicture($_SESSION['user_name'], $_SESSION['user_uuid']);

        if (!$newRelPath) {
            return ['success' => false, 'message' => 'Error al generar la foto por defecto.'];
        }

        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        if ($stmt->execute([$newRelPath, $_SESSION['user_id']])) {
            $_SESSION['user_pic'] = $newRelPath;
            return [
                'success' => true, 
                'message' => 'Foto eliminada. Se ha restaurado tu avatar por defecto.',
                'new_avatar' => '/ProjectRosaura/' . $newRelPath
            ];
        }

        return ['success' => false, 'message' => 'Error en la base de datos al eliminar foto.'];
    }

    public function updateUsername($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $username = trim($data['username'] ?? '');

        if (strlen($username) < 3 || strlen($username) > 32) {
            return ['success' => false, 'message' => 'El nombre de usuario debe tener entre 3 y 32 caracteres.'];
        }

        // Verificar si existe otro usuario con ese nombre
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt->execute([$username, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        }

        $stmtUpd = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        if ($stmtUpd->execute([$username, $_SESSION['user_id']])) {
            $_SESSION['user_name'] = $username;
            return [
                'success' => true, 
                'message' => 'Nombre de usuario actualizado.',
                'new_username' => $username
            ];
        }

        return ['success' => false, 'message' => 'Error al actualizar el nombre.'];
    }

    public function updateEmail($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $email = trim($data['email'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        }

        // Verificar si existe otro usuario con ese email
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'Este correo electrónico ya está registrado.'];
        }

        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $_SESSION['user_id']])) {
            $_SESSION['user_email'] = $email;
            return [
                'success' => true, 
                'message' => 'Correo electrónico actualizado.',
                'new_email' => $email
            ];
        }

        return ['success' => false, 'message' => 'Error al actualizar el correo.'];
    }
}
?>