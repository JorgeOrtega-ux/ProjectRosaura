<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Config\Database;
use App\Core\Utils;
use App\Core\Mailer;
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

        $oldPic = $_SESSION['user_pic'] ?? '';
        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

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

    public function requestEmailCode() {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $email = $_SESSION['user_email'];

        // PREVENCIÓN DE SPAM: Evitar enviar si ya hay uno activo para modificar el correo.
        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND expires_at > NOW()");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) {
            return ['success' => true, 'message' => 'El código ya fue enviado a tu correo previamente.'];
        }

        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= mt_rand(0, 9);
        }

        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['action' => 'email_update']);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'email_update', ?, ?, ?)");
        
        if ($insertStmt->execute([$email, $code, $payload, $expiresAt])) {
            $mailer = new Mailer();
            $emailSent = $mailer->sendEmailUpdateCode($email, $_SESSION['user_name'], $code);

            if ($emailSent) {
                return ['success' => true, 'message' => 'Se ha enviado un código a tu correo actual.'];
            } else {
                return ['success' => false, 'message' => 'Error al enviar el correo electrónico. Inténtalo más tarde.'];
            }
        }

        return ['success' => false, 'message' => 'Error interno al procesar la solicitud.'];
    }

    public function verifyEmailCode($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $code = trim($data['code'] ?? '');
        $code = str_replace('-', '', $code);
        $email = $_SESSION['user_email'];

        if (empty($code)) {
            return ['success' => false, 'message' => 'El código es obligatorio.'];
        }

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND code = ? AND expires_at > NOW()");
        $stmt->execute([$email, $code]);

        if ($stmt->rowCount() > 0) {
            $verification = $stmt->fetch(PDO::FETCH_ASSOC);

            // Eliminar token usado
            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?");
            $delStmt->execute([$verification['id']]);

            // Crear bandera en sesión que autorice cambiar el correo
            $_SESSION['can_update_email'] = true;

            return ['success' => true, 'message' => 'Identidad verificada. Ya puedes editar tu correo.'];
        }

        return ['success' => false, 'message' => 'El código ingresado es incorrecto o ha expirado.'];
    }

    public function updateEmail($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        // SEGURIDAD: Verificar que el usuario pasó por el código de validación
        if (empty($_SESSION['can_update_email']) || $_SESSION['can_update_email'] !== true) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu identidad con el código enviado a tu correo primero.'];
        }

        $email = trim($data['email'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        }

        // Verificar si existe otro usuario con ese email
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'Este correo electrónico ya está registrado en otra cuenta.'];
        }

        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $_SESSION['user_id']])) {
            $_SESSION['user_email'] = $email;
            
            // Destruir bandera de actualización por seguridad tras concretar
            unset($_SESSION['can_update_email']);

            return [
                'success' => true, 
                'message' => 'Correo electrónico actualizado con éxito.',
                'new_email' => $email
            ];
        }

        return ['success' => false, 'message' => 'Error al actualizar el correo en base de datos.'];
    }
}
?>