<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Config\Database;
use App\Core\Utils;
use App\Core\Mailer;
use App\Core\GoogleAuthenticator;
use PDO;

class SettingsServices {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function updateAvatar($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida o expirada.'];
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'avatar', 3, 1)) return ['success' => false, 'message' => 'Has alcanzado el límite de 3 cambios de foto por día.'];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) return ['success' => false, 'message' => 'Hubo un error al subir el archivo.'];

        $file = $files['avatar'];
        if ($file['size'] > 2 * 1024 * 1024) return ['success' => false, 'message' => 'La imagen supera el límite de 2MB.'];

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if ($mime !== 'image/png' && $mime !== 'image/jpeg') return ['success' => false, 'message' => 'Solo se permiten formatos PNG y JPG.'];

        $extension = ($mime === 'image/png') ? '.png' : '.jpg';
        $fileName = Utils::generateUUID() . $extension;
        
        $uploadDir = __DIR__ . '/../../public/storage/profilePictures/uploaded/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $destPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            $oldPic = $_SESSION['user_pic'] ?? '';
            if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
                $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
                if (file_exists($oldPath)) unlink($oldPath);
            }

            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;

            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            if ($stmt->execute([$newRelPath, $_SESSION['user_id']])) {
                $this->logProfileChange($_SESSION['user_id'], 'avatar', $oldPic, $newRelPath);
                $_SESSION['user_pic'] = $newRelPath;
                return ['success' => true, 'message' => 'Foto de perfil actualizada con éxito.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
            }
        }
        return ['success' => false, 'message' => 'No se pudo guardar la imagen en el servidor.'];
    }

    public function deleteAvatar() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $oldPic = $_SESSION['user_pic'] ?? '';
        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) unlink($oldPath);
        }

        $newRelPath = Utils::generateProfilePicture($_SESSION['user_name'], $_SESSION['user_uuid']);
        if (!$newRelPath) return ['success' => false, 'message' => 'Error al generar la foto por defecto.'];

        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        if ($stmt->execute([$newRelPath, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'avatar', $oldPic, $newRelPath);
            $_SESSION['user_pic'] = $newRelPath;
            return ['success' => true, 'message' => 'Foto eliminada. Se ha restaurado tu avatar por defecto.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
        }
        return ['success' => false, 'message' => 'Error en la base de datos al eliminar foto.'];
    }

    public function updateUsername($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'username', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu nombre de usuario 1 vez cada 7 días.'];

        $username = trim($data['username'] ?? '');
        if (strlen($username) < 3 || strlen($username) > 32) return ['success' => false, 'message' => 'El nombre de usuario debe tener entre 3 y 32 caracteres.'];

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt->execute([$username, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];

        $oldUsername = $_SESSION['user_name'] ?? '';

        $stmtUpd = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        if ($stmtUpd->execute([$username, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'username', $oldUsername, $username);
            $_SESSION['user_name'] = $username;
            return ['success' => true, 'message' => 'Nombre de usuario actualizado.', 'new_username' => $username];
        }
        return ['success' => false, 'message' => 'Error al actualizar el nombre.'];
    }

    public function requestEmailCode() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!empty($_SESSION['can_update_email_expires']) && $_SESSION['can_update_email_expires'] > time()) {
            return ['success' => true, 'message' => 'Identidad ya verificada.', 'skip_verification' => true];
        }

        $email = $_SESSION['user_email'];

        $rateCheck = $this->checkRateLimit('request_email_code', 3, 30);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND expires_at > NOW()");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) return ['success' => true, 'message' => 'El código ya fue enviado a tu correo previamente.'];

        $code = '';
        for ($i = 0; $i < 12; $i++) $code .= mt_rand(0, 9);

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
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $code = trim($data['code'] ?? '');
        $code = str_replace('-', '', $code);
        $email = $_SESSION['user_email'];

        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];

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
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['can_update_email_expires']) || $_SESSION['can_update_email_expires'] < time()) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu identidad con el código enviado a tu correo primero.'];
        }
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'email', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu correo 1 vez cada 7 días.'];

        $email = trim($data['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return ['success' => false, 'message' => 'El formato del correo electrónico no es válido.'];

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) return ['success' => false, 'message' => 'Este correo electrónico ya está registrado en otra cuenta.'];

        $oldEmail = $_SESSION['user_email'] ?? '';

        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'email', $oldEmail, $email);
            $_SESSION['user_email'] = $email;
            unset($_SESSION['can_update_email_expires']);

            return ['success' => true, 'message' => 'Correo electrónico actualizado con éxito.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar el correo en base de datos.'];
    }

    public function updatePreferences($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $rateCheck = $this->checkRateLimit('update_preferences', 20, 5, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        $allowedKeys = ['language', 'open_links_new_tab', 'theme', 'extended_alerts'];
        if (!in_array($key, $allowedKeys)) return ['success' => false, 'message' => 'Preferencia no válida.'];

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

    public function verifyCurrentPassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $rateCheck = $this->checkRateLimit('verify_current_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $currentPassword = trim($data['current_password'] ?? '');
        if (empty($currentPassword)) return ['success' => false, 'message' => 'La contraseña es obligatoria.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($currentPassword, $user['password'])) {
            $this->clearRateLimit('verify_current_password');
            $_SESSION['can_change_password_expires'] = time() + (15 * 60);
            return ['success' => true, 'message' => 'Identidad verificada.'];
        }

        $this->recordAttempt('verify_current_password', 5, 15);
        return ['success' => false, 'message' => 'La contraseña actual es incorrecta.'];
    }

    public function updatePassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['can_change_password_expires']) || $_SESSION['can_change_password_expires'] < time()) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu contraseña actual primero.'];
        }

        $rateCheck = $this->checkRateLimit('update_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $newPassword = trim($data['new_password'] ?? '');
        $confirmPassword = trim($data['confirm_password'] ?? '');

        if (empty($newPassword) || empty($confirmPassword)) return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        if ($newPassword !== $confirmPassword) return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];

        $passLen = strlen($newPassword);
        if ($passLen < 8 || $passLen > 64) return ['success' => false, 'message' => 'La contraseña debe tener entre 8 y 64 caracteres.'];

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($stmt->execute([$hashedPassword, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'password', '***', '***');
            unset($_SESSION['can_change_password_expires']);
            $this->clearRateLimit('update_password');
            return ['success' => true, 'message' => 'Contraseña actualizada correctamente.'];
        }

        $this->recordAttempt('update_password', 5, 15);
        return ['success' => false, 'message' => 'Hubo un error al actualizar tu contraseña.'];
    }

    // ==========================================
    // --- LÓGICA DE ELIMINAR CUENTA ---
    // ==========================================
    public function deleteAccount($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $password = trim($data['password'] ?? '');
        if (empty($password)) return ['success' => false, 'message' => 'La contraseña es obligatoria para confirmar la eliminación.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            // Pasamos el estado a deleted en lugar de eliminar el registro
            $upd = $this->pdo->prepare("UPDATE users SET user_status = 'deleted' WHERE id = ?");
            if ($upd->execute([$_SESSION['user_id']])) {
                
                // Forzamos cierre de sesión en TODOS los dispositivos
                $delTokens = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?");
                $delTokens->execute([$_SESSION['user_id']]);
                
                // Limpiamos la sesión y la cookie actual
                if (isset($_COOKIE['remember_token'])) {
                    setcookie('remember_token', '', [
                        'expires' => time() - 3600,
                        'path' => '/ProjectRosaura/',
                        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
                        'httponly' => true,
                        'samesite' => 'Strict'
                    ]);
                }
                session_unset();
                session_destroy();
                
                return ['success' => true, 'message' => 'Tu cuenta ha sido eliminada permanentemente.'];
            }
            return ['success' => false, 'message' => 'Error al actualizar la base de datos.'];
        }
        
        return ['success' => false, 'message' => 'La contraseña ingresada es incorrecta.'];
    }

    // ==========================================
    // --- LÓGICA DE 2FA ---
    // ==========================================
    public function generate2faSetup() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!empty($_SESSION['user_2fa'])) return ['success' => false, 'message' => 'El 2FA ya está activado en tu cuenta.'];

        $ga = new GoogleAuthenticator();
        $secret = $ga->createSecret();
        
        $_SESSION['2fa_setup_secret'] = $secret;
        
        $qrCodeUrl = $ga->getQRCodeUrl('ProjectRosaura', $_SESSION['user_email'], $secret);

        return [
            'success' => true, 
            'secret' => $secret, 
            'qr_url' => $qrCodeUrl
        ];
    }

    public function enable2fa($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!empty($_SESSION['user_2fa'])) return ['success' => false, 'message' => 'El 2FA ya está activado.'];

        $code = trim($data['code'] ?? '');
        $secret = $_SESSION['2fa_setup_secret'] ?? '';

        if (empty($secret) || empty($code)) return ['success' => false, 'message' => 'Faltan datos de configuración o código.'];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 2)) {
            $codes = [];
            for ($i = 0; $i < 10; $i++) {
                $codes[] = substr(bin2hex(random_bytes(4)), 0, 8);
            }
            $codesJson = json_encode($codes);

            $stmt = $this->pdo->prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_recovery_codes = ? WHERE id = ?");
            if ($stmt->execute([$secret, $codesJson, $_SESSION['user_id']])) {
                $_SESSION['user_2fa'] = 1;
                unset($_SESSION['2fa_setup_secret']);
                
                $this->logProfileChange($_SESSION['user_id'], '2fa', 'disabled', 'enabled');
                
                return [
                    'success' => true, 
                    'message' => 'Autenticación de dos factores activada con éxito.',
                    'recovery_codes' => $codes
                ];
            }
            return ['success' => false, 'message' => 'Error al guardar en la base de datos.'];
        }

        return ['success' => false, 'message' => 'El código de la aplicación es incorrecto.'];
    }

    public function disable2fa($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['user_2fa'])) return ['success' => false, 'message' => 'El 2FA no está activado.'];

        $password = trim($data['password'] ?? '');
        if (empty($password)) return ['success' => false, 'message' => 'Se requiere la contraseña para desactivar.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $update = $this->pdo->prepare("UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_recovery_codes = NULL WHERE id = ?");
            if ($update->execute([$_SESSION['user_id']])) {
                $_SESSION['user_2fa'] = 0;
                $this->logProfileChange($_SESSION['user_id'], '2fa', 'enabled', 'disabled');
                return ['success' => true, 'message' => 'Autenticación de dos factores desactivada.'];
            }
            return ['success' => false, 'message' => 'Error al actualizar base de datos.'];
        }
        
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    // ==========================================
    // --- LÓGICA DE GESTIÓN DE DISPOSITIVOS ---
    // ==========================================
    public function getDevices() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $currentSelector = '';
        if (isset($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (count($parts) === 2) {
                $currentSelector = $parts[0];
            }
        }

        $stmt = $this->pdo->prepare("SELECT id, user_agent, ip_address, expires_at, selector FROM auth_tokens WHERE user_id = ? ORDER BY expires_at DESC");
        $stmt->execute([$_SESSION['user_id']]);
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Identificamos cuál es la sesión actual en la que está el usuario
        foreach ($devices as &$device) {
            $device['is_current'] = ($device['selector'] === $currentSelector);
            unset($device['selector']); // Por seguridad no devolvemos el selector
        }

        return ['success' => true, 'devices' => $devices];
    }

    public function revokeDevice($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $deviceId = $data['device_id'] ?? null;
        if (!$deviceId) return ['success' => false, 'message' => 'ID de dispositivo inválido.'];

        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$deviceId, $_SESSION['user_id']])) {
            return ['success' => true, 'message' => 'La sesión en ese dispositivo ha sido cerrada.'];
        }
        return ['success' => false, 'message' => 'Hubo un error al cerrar la sesión.'];
    }

    public function revokeAllDevices() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $currentSelector = '';
        if (isset($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (count($parts) === 2) {
                $currentSelector = $parts[0];
            }
        }

        // Borra todos EXCEPTO la sesión actual
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ? AND selector != ?");
        if ($stmt->execute([$_SESSION['user_id'], $currentSelector])) {
            return ['success' => true, 'message' => 'Todas las demás sesiones han sido cerradas.'];
        }
        return ['success' => false, 'message' => 'Error al cerrar las sesiones de los dispositivos.'];
    }

    public function regenerateRecoveryCodes($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['user_2fa'])) return ['success' => false, 'message' => 'El 2FA no está activado.'];

        $password = trim($data['password'] ?? '');
        if (empty($password)) return ['success' => false, 'message' => 'Se requiere la contraseña actual para confirmar.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $codes = [];
            for ($i = 0; $i < 10; $i++) {
                $codes[] = substr(bin2hex(random_bytes(4)), 0, 8);
            }
            $codesJson = json_encode($codes);

            $update = $this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?");
            if ($update->execute([$codesJson, $_SESSION['user_id']])) {
                $this->logProfileChange($_SESSION['user_id'], '2fa', 'recovery_regenerated', 'recovery_regenerated');
                return [
                    'success' => true, 
                    'message' => 'Nuevos códigos de recuperación generados con éxito.',
                    'recovery_codes' => $codes
                ];
            }
            return ['success' => false, 'message' => 'Error al actualizar base de datos.'];
        }
        
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    private function canChangeProfileData($userId, $changeType, $maxAttempts, $days) {
        $days = (int)$days; 
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM profile_changes_log WHERE user_id = ? AND change_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL $days DAY)");
        $stmt->execute([$userId, $changeType]);
        return (int) $stmt->fetchColumn() < $maxAttempts;
    }

    private function logProfileChange($userId, $changeType, $oldValue, $newValue) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("INSERT INTO profile_changes_log (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $changeType, $oldValue, $newValue, $ip]);
    }

    private function getIpAddress() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) return $_SERVER['HTTP_CLIENT_IP'];
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        return trim($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    private function checkRateLimit($action, $maxAttempts, $lockoutMinutes, $customMsg = null) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit && $limit['blocked_until'] && strtotime($limit['blocked_until']) > time()) {
            $remainingMinutes = ceil((strtotime($limit['blocked_until']) - time()) / 60);
            $msg = $customMsg ? str_replace('{minutes}', $remainingMinutes, $customMsg) : "Por seguridad, espera {$remainingMinutes} minutos.";
            return ['allowed' => false, 'message' => $msg];
        }
        return ['allowed' => true];
    }

    private function recordAttempt($action, $maxAttempts, $lockoutMinutes) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            $attempts = ($limit['blocked_until'] && strtotime($limit['blocked_until']) <= time()) ? 1 : $limit['attempts'] + 1;
            $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $updateStmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE ip_address = ? AND action = ?");
            $updateStmt->execute([$attempts, $blockedUntil, $ip, $action]);
        } else {
            $blockedUntil = (1 >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $insertStmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, blocked_until) VALUES (?, ?, ?, ?)");
            $insertStmt->execute([$ip, $action, 1, $blockedUntil]);
        }
    }

    private function clearRateLimit($action) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
    }
}
?>