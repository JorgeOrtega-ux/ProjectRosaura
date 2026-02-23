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

        if (!$this->canChangeProfileData($_SESSION['user_id'], 'avatar', 3, 1)) {
            return ['success' => false, 'message' => 'Has alcanzado el límite de 3 cambios de foto de perfil por día.'];
        }

        $files = $data['_files'] ?? [];
        
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Hubo un error al subir el archivo.'];
        }

        $file = $files['avatar'];
        
        if ($file['size'] > 2 * 1024 * 1024) {
            return ['success' => false, 'message' => 'La imagen supera el límite de 2MB.'];
        }

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
                
                $this->logProfileChange($_SESSION['user_id'], 'avatar', $oldPic, $newRelPath);

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
            
            $this->logProfileChange($_SESSION['user_id'], 'avatar', $oldPic, $newRelPath);

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

        if (!$this->canChangeProfileData($_SESSION['user_id'], 'username', 1, 7)) {
            return ['success' => false, 'message' => 'Solo puedes cambiar tu nombre de usuario 1 vez cada 7 días.'];
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

        $oldUsername = $_SESSION['user_name'] ?? '';

        $stmtUpd = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        if ($stmtUpd->execute([$username, $_SESSION['user_id']])) {
            
            $this->logProfileChange($_SESSION['user_id'], 'username', $oldUsername, $username);

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

        if (!empty($_SESSION['can_update_email_expires']) && $_SESSION['can_update_email_expires'] > time()) {
            return [
                'success' => true, 
                'message' => 'Identidad ya verificada.', 
                'skip_verification' => true 
            ];
        }

        $email = $_SESSION['user_email'];

        $rateCheck = $this->checkRateLimit('request_email_code', 3, 30);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

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
                $this->recordAttempt('request_email_code', 3, 30);
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

            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?");
            $delStmt->execute([$verification['id']]);

            $_SESSION['can_update_email_expires'] = time() + (15 * 60);

            $this->clearRateLimit('request_email_code');

            return ['success' => true, 'message' => 'Identidad verificada. Tienes 15 minutos para editar tu correo.'];
        }

        return ['success' => false, 'message' => 'El código ingresado es incorrecto o ha expirado.'];
    }

    public function updateEmail($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        if (empty($_SESSION['can_update_email_expires']) || $_SESSION['can_update_email_expires'] < time()) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu identidad con el código enviado a tu correo primero o la sesión ha expirado.'];
        }

        if (!$this->canChangeProfileData($_SESSION['user_id'], 'email', 1, 7)) {
            return ['success' => false, 'message' => 'Solo puedes cambiar tu correo electrónico 1 vez cada 7 días.'];
        }

        $email = trim($data['email'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        }

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'Este correo electrónico ya está registrado en otra cuenta.'];
        }

        $oldEmail = $_SESSION['user_email'] ?? '';

        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $_SESSION['user_id']])) {
            
            $this->logProfileChange($_SESSION['user_id'], 'email', $oldEmail, $email);

            $_SESSION['user_email'] = $email;
            
            unset($_SESSION['can_update_email_expires']);

            return [
                'success' => true, 
                'message' => 'Correo electrónico actualizado con éxito.',
                'new_email' => $email
            ];
        }

        return ['success' => false, 'message' => 'Error al actualizar el correo en base de datos.'];
    }

    public function updatePreferences($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $rateCheck = $this->checkRateLimit('update_preferences', 20, 5, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        $allowedKeys = ['language', 'open_links_new_tab', 'theme', 'extended_alerts'];
        
        if (!in_array($key, $allowedKeys)) {
            return ['success' => false, 'message' => 'Preferencia no válida.'];
        }

        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') {
            $value = ($value === '1' || $value === true || $value === 1) ? 1 : 0;
        }

        $stmt = $this->pdo->prepare("UPDATE user_preferences SET {$key} = ? WHERE user_id = ?");
        
        if ($stmt->execute([$value, $_SESSION['user_id']])) {
            $_SESSION['user_prefs'][$key] = $value;
            $this->recordAttempt('update_preferences', 20, 5);
            return ['success' => true, 'message' => 'Preferencia guardada.'];
        }

        return ['success' => false, 'message' => 'Error al guardar la preferencia.'];
    }
    
    // =========================================================================
    // --- NUEVO: SISTEMA DE SEGURIDAD (CAMBIO DE CONTRASEÑA) ---
    // =========================================================================

    public function verifyCurrentPassword($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        $rateCheck = $this->checkRateLimit('verify_current_password', 5, 15);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $currentPassword = trim($data['current_password'] ?? '');

        if (empty($currentPassword)) {
            return ['success' => false, 'message' => 'La contraseña es obligatoria.'];
        }

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($currentPassword, $user['password'])) {
            $this->clearRateLimit('verify_current_password');
            
            // Asignamos bandera temporal válida por 15 minutos en sesión
            $_SESSION['can_change_password_expires'] = time() + (15 * 60);

            return ['success' => true, 'message' => 'Identidad verificada.'];
        }

        $this->recordAttempt('verify_current_password', 5, 15);
        return ['success' => false, 'message' => 'La contraseña actual es incorrecta.'];
    }

    public function updatePassword($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Sesión no válida.'];
        }

        // Bloqueo estricto: Si la sesión expiró o se saltaron el paso 1
        if (empty($_SESSION['can_change_password_expires']) || $_SESSION['can_change_password_expires'] < time()) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu contraseña actual primero o la sesión ha expirado.'];
        }

        $rateCheck = $this->checkRateLimit('update_password', 5, 15);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $newPassword = trim($data['new_password'] ?? '');
        $confirmPassword = trim($data['confirm_password'] ?? '');

        if (empty($newPassword) || empty($confirmPassword)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }

        if ($newPassword !== $confirmPassword) {
            return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];
        }

        $passLen = strlen($newPassword);
        if ($passLen < 8 || $passLen > 64) {
            return ['success' => false, 'message' => 'La contraseña debe tener entre 8 y 64 caracteres.'];
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($stmt->execute([$hashedPassword, $_SESSION['user_id']])) {
            
            // Retiramos los permisos
            unset($_SESSION['can_change_password_expires']);
            $this->clearRateLimit('update_password');

            return ['success' => true, 'message' => 'Contraseña actualizada correctamente.'];
        }

        $this->recordAttempt('update_password', 5, 15);
        return ['success' => false, 'message' => 'Hubo un error al actualizar tu contraseña.'];
    }
    

    /* ========================================================================= */
    /* MÉTODOS PRIVADOS PARA LIMITACIÓN Y REGISTRO DE CAMBIOS DE PERFIL (LOG)    */
    /* ========================================================================= */

    private function canChangeProfileData($userId, $changeType, $maxAttempts, $days) {
        $days = (int)$days; 
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM profile_changes_log WHERE user_id = ? AND change_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL $days DAY)");
        $stmt->execute([$userId, $changeType]);
        
        $count = (int) $stmt->fetchColumn();
        
        return $count < $maxAttempts;
    }

    private function logProfileChange($userId, $changeType, $oldValue, $newValue) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("INSERT INTO profile_changes_log (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $changeType, $oldValue, $newValue, $ip]);
    }

    private function getIpAddress() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }
        return trim($ip);
    }

    private function checkRateLimit($action, $maxAttempts, $lockoutMinutes, $customMsg = null) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            if ($limit['blocked_until'] && strtotime($limit['blocked_until']) > time()) {
                $remainingMinutes = ceil((strtotime($limit['blocked_until']) - time()) / 60);
                
                $msg = $customMsg 
                    ? str_replace('{minutes}', $remainingMinutes, $customMsg)
                    : "Has enviado demasiados códigos. Por seguridad, por favor espera {$remainingMinutes} minutos.";

                return [
                    'allowed' => false, 
                    'message' => $msg
                ];
            }
        }
        
        return ['allowed' => true];
    }

    private function recordAttempt($action, $maxAttempts, $lockoutMinutes) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            if ($limit['blocked_until'] && strtotime($limit['blocked_until']) <= time()) {
                $attempts = 1;
                $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            } else {
                $attempts = $limit['attempts'] + 1;
                $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            }

            $updateStmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE ip_address = ? AND action = ?");
            $updateStmt->execute([$attempts, $blockedUntil, $ip, $action]);
        } else {
            $attempts = 1;
            $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            
            $insertStmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, blocked_until) VALUES (?, ?, ?, ?)");
            $insertStmt->execute([$ip, $action, $attempts, $blockedUntil]);
        }
    }

    private function clearRateLimit($action) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
    }
}
?>