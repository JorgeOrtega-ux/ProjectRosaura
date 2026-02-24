<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Config\Database;
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

        $rateCheck = Utils::checkRateLimit($this->pdo, 'request_email_code', 3, 30);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND expires_at > NOW()");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) return ['success' => true, 'message' => 'El código ya fue enviado a tu correo previamente.'];

        $code = Utils::generateNumericCode(12);

        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['action' => 'email_update']);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'email_update', ?, ?, ?)");
        
        if ($insertStmt->execute([$email, $code, $payload, $expiresAt])) {
            $mailer = new Mailer();
            $emailSent = $mailer->sendEmailUpdateCode($email, $_SESSION['user_name'], $code);

            if ($emailSent) {
                Utils::recordAttempt($this->pdo, 'request_email_code', 3, 30);
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
            Utils::clearRateLimit($this->pdo, 'request_email_code');

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
        
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

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

        $rateCheck = Utils::checkRateLimit($this->pdo, 'update_preferences', 20, 5, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
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
            Utils::recordAttempt($this->pdo, 'update_preferences', 20, 5);
            return ['success' => true, 'message' => 'Preferencia guardada.'];
        }
        return ['success' => false, 'message' => 'Error al guardar la preferencia.'];
    }

    public function verifyCurrentPassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $rateCheck = Utils::checkRateLimit($this->pdo, 'verify_current_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $currentPassword = trim($data['current_password'] ?? '');
        if (empty($currentPassword)) return ['success' => false, 'message' => 'La contraseña es obligatoria.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($currentPassword, $user['password'])) {
            Utils::clearRateLimit($this->pdo, 'verify_current_password');
            $_SESSION['can_change_password_expires'] = time() + (15 * 60);
            return ['success' => true, 'message' => 'Identidad verificada.'];
        }

        Utils::recordAttempt($this->pdo, 'verify_current_password', 5, 15);
        return ['success' => false, 'message' => 'La contraseña actual es incorrecta.'];
    }

    public function updatePassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['can_change_password_expires']) || $_SESSION['can_change_password_expires'] < time()) {
            return ['success' => false, 'message' => 'Por seguridad, debes verificar tu contraseña actual primero.'];
        }

        $rateCheck = Utils::checkRateLimit($this->pdo, 'update_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $newPassword = trim($data['new_password'] ?? '');
        $confirmPassword = trim($data['confirm_password'] ?? '');

        if (empty($newPassword) || empty($confirmPassword)) return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        if ($newPassword !== $confirmPassword) return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];

        $passValidation = Utils::validatePasswordFormat($newPassword);
        if (!$passValidation['valid']) return ['success' => false, 'message' => $passValidation['message']];

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($stmt->execute([$hashedPassword, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'password', '***', '***');
            unset($_SESSION['can_change_password_expires']);
            Utils::clearRateLimit($this->pdo, 'update_password');
            return ['success' => true, 'message' => 'Contraseña actualizada correctamente.'];
        }

        Utils::recordAttempt($this->pdo, 'update_password', 5, 15);
        return ['success' => false, 'message' => 'Hubo un error al actualizar tu contraseña.'];
    }

    public function deleteAccount($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];

        $password = trim($data['password'] ?? '');
        if (empty($password)) return ['success' => false, 'message' => 'La contraseña es obligatoria para confirmar la eliminación.'];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $upd = $this->pdo->prepare("UPDATE users SET user_status = 'deleted' WHERE id = ?");
            if ($upd->execute([$_SESSION['user_id']])) {
                $delTokens = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?");
                $delTokens->execute([$_SESSION['user_id']]);
                
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
            $codes = Utils::generateRecoveryCodes(10, 8);
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

        foreach ($devices as &$device) {
            $device['is_current'] = ($device['selector'] === $currentSelector);
            unset($device['selector']);
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
            $codes = Utils::generateRecoveryCodes(10, 8);
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
        $ip = Utils::getIpAddress();
        $stmt = $this->pdo->prepare("INSERT INTO profile_changes_log (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $changeType, $oldValue, $newValue, $ip]);
    }
}
?>