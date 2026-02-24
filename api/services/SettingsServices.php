<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Core\Mailer;
use App\Core\GoogleAuthenticator;
use App\Core\Interfaces\RateLimiterInterface;
use PDO;

class SettingsServices {
    private $pdo;
    private $rateLimiter;

    // Recibimos herramientas vía Constructor usando Interfaces
    public function __construct(PDO $pdo, RateLimiterInterface $rateLimiter) {
        $this->pdo = $pdo;
        $this->rateLimiter = $rateLimiter;
    }

    public function updateAvatar($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida o expirada.'];
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'avatar', 3, 1)) return ['success' => false, 'message' => 'Has alcanzado el límite de 3 cambios de foto por día.'];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) return ['success' => false, 'message' => 'Hubo un error al subir el archivo.'];
        $file = $files['avatar'];
        if ($file['size'] > 2 * 1024 * 1024) return ['success' => false, 'message' => 'La imagen supera el límite de 2MB.'];

        $finfo = finfo_open(FILEINFO_MIME_TYPE); $mime = finfo_file($finfo, $file['tmp_name']); finfo_close($finfo);
        if ($mime !== 'image/png' && $mime !== 'image/jpeg') return ['success' => false, 'message' => 'Solo se permiten formatos PNG y JPG.'];

        $fileName = Utils::generateUUID() . (($mime === 'image/png') ? '.png' : '.jpg');
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
                return ['success' => true, 'message' => 'Foto actualizada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
            }
        }
        return ['success' => false, 'message' => 'Error en el servidor.'];
    }

    public function deleteAvatar() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $oldPic = $_SESSION['user_pic'] ?? '';
        
        // --- PROTECCIÓN ---
        // Evita proceder si la foto de perfil ya es la predeterminada del sistema.
        if (strpos($oldPic, '/default/') !== false) {
            return ['success' => false, 'message' => 'Ya tienes una foto de perfil por defecto.'];
        }

        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) unlink($oldPath);
        }
        $newRelPath = Utils::generateProfilePicture($_SESSION['user_name'], $_SESSION['user_uuid']);
        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        if ($stmt->execute([$newRelPath, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'avatar', $oldPic, $newRelPath);
            $_SESSION['user_pic'] = $newRelPath;
            return ['success' => true, 'message' => 'Foto eliminada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
        }
        return ['success' => false, 'message' => 'Error en la base de datos.'];
    }

    public function updateUsername($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'username', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu nombre 1 vez cada 7 días.'];
        $username = trim($data['username'] ?? '');
        if (strlen($username) < 3 || strlen($username) > 32) return ['success' => false, 'message' => 'Inválido.'];
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
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function requestEmailCode() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!empty($_SESSION['can_update_email_expires']) && $_SESSION['can_update_email_expires'] > time()) return ['success' => true, 'message' => 'Identidad ya verificada.', 'skip_verification' => true];
        
        $email = $_SESSION['user_email'];
        $rateCheck = $this->rateLimiter->check('request_email_code', 3, 30);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND expires_at > NOW()");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) return ['success' => true, 'message' => 'Código ya enviado.'];

        $code = Utils::generateNumericCode(12);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['action' => 'email_update']);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'email_update', ?, ?, ?)");
        if ($insertStmt->execute([$email, $code, $payload, $expiresAt])) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $_SESSION['user_name'], $code)) {
                $this->rateLimiter->record('request_email_code', 3, 30);
                return ['success' => true, 'message' => 'Código enviado.'];
            }
        }
        return ['success' => false, 'message' => 'Error interno.'];
    }

    public function verifyEmailCode($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND code = ? AND expires_at > NOW()");
        $stmt->execute([$_SESSION['user_email'], $code]);

        if ($stmt->rowCount() > 0) {
            $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?")->execute([$stmt->fetch(PDO::FETCH_ASSOC)['id']]);
            $_SESSION['can_update_email_expires'] = time() + (15 * 60);
            $this->rateLimiter->clear('request_email_code');
            return ['success' => true, 'message' => 'Identidad verificada. Tienes 15 minutos.'];
        }
        return ['success' => false, 'message' => 'El código es incorrecto o ha expirado.'];
    }

    public function updateEmail($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['can_update_email_expires']) || $_SESSION['can_update_email_expires'] < time()) return ['success' => false, 'message' => 'Verifica tu identidad primero.'];
        if (!$this->canChangeProfileData($_SESSION['user_id'], 'email', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu correo 1 vez cada 7 días.'];

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) return ['success' => false, 'message' => 'Correo registrado en otra cuenta.'];

        $oldEmail = $_SESSION['user_email'] ?? '';
        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'email', $oldEmail, $email);
            $_SESSION['user_email'] = $email;
            unset($_SESSION['can_update_email_expires']);
            return ['success' => true, 'message' => 'Correo actualizado.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updatePreferences($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $rateCheck = $this->rateLimiter->check('update_preferences', 20, 5, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $key = $data['key'] ?? ''; $value = $data['value'] ?? '';
        if (!in_array($key, ['language', 'open_links_new_tab', 'theme', 'extended_alerts'])) return ['success' => false, 'message' => 'Preferencia no válida.'];
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        $stmt = $this->pdo->prepare("UPDATE user_preferences SET {$key} = ? WHERE user_id = ?");
        if ($stmt->execute([$value, $_SESSION['user_id']])) {
            $_SESSION['user_prefs'][$key] = $value;
            $this->rateLimiter->record('update_preferences', 20, 5);
            return ['success' => true, 'message' => 'Preferencia guardada.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function verifyCurrentPassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $rateCheck = $this->rateLimiter->check('verify_current_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify(trim($data['current_password'] ?? ''), $user['password'])) {
            $this->rateLimiter->clear('verify_current_password');
            $_SESSION['can_change_password_expires'] = time() + (15 * 60);
            return ['success' => true, 'message' => 'Identidad verificada.'];
        }
        $this->rateLimiter->record('verify_current_password', 5, 15);
        return ['success' => false, 'message' => 'La contraseña es incorrecta.'];
    }

    public function updatePassword($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (empty($_SESSION['can_change_password_expires']) || $_SESSION['can_change_password_expires'] < time()) return ['success' => false, 'message' => 'Verifica tu contraseña primero.'];
        $rateCheck = $this->rateLimiter->check('update_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $newPassword = trim($data['new_password'] ?? '');
        if ($newPassword !== trim($data['confirm_password'] ?? '')) return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];
        $pVal = Utils::validatePasswordFormat($newPassword);
        if (!$pVal['valid']) return ['success' => false, 'message' => $pVal['message']];

        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($stmt->execute([password_hash($newPassword, PASSWORD_BCRYPT), $_SESSION['user_id']])) {
            $this->logProfileChange($_SESSION['user_id'], 'password', '***', '***');
            unset($_SESSION['can_change_password_expires']);
            $this->rateLimiter->clear('update_password');
            return ['success' => true, 'message' => 'Contraseña actualizada.'];
        }
        $this->rateLimiter->record('update_password', 5, 15);
        return ['success' => false, 'message' => 'Hubo un error.'];
    }

    public function deleteAccount($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            if ($this->pdo->prepare("UPDATE users SET user_status = 'deleted' WHERE id = ?")->execute([$_SESSION['user_id']])) {
                $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?")->execute([$_SESSION['user_id']]);
                if (isset($_COOKIE['remember_token'])) setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/ProjectRosaura/']);
                session_unset(); session_destroy();
                return ['success' => true, 'message' => 'Tu cuenta ha sido eliminada.'];
            }
        }
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function generate2faSetup() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        if (!empty($_SESSION['user_2fa'])) return ['success' => false, 'message' => 'El 2FA ya está activado.'];

        $ga = new GoogleAuthenticator();
        $_SESSION['2fa_setup_secret'] = $ga->createSecret();
        return ['success' => true, 'secret' => $_SESSION['2fa_setup_secret'], 'qr_url' => $ga->getQRCodeUrl('ProjectRosaura', $_SESSION['user_email'], $_SESSION['2fa_setup_secret'])];
    }

    public function enable2fa($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $code = trim($data['code'] ?? ''); $secret = $_SESSION['2fa_setup_secret'] ?? '';
        if (empty($secret) || empty($code)) return ['success' => false, 'message' => 'Faltan datos.'];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 2)) {
            $codes = Utils::generateRecoveryCodes(10, 8);
            $stmt = $this->pdo->prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_recovery_codes = ? WHERE id = ?");
            if ($stmt->execute([$secret, json_encode($codes), $_SESSION['user_id']])) {
                $_SESSION['user_2fa'] = 1; unset($_SESSION['2fa_setup_secret']);
                $this->logProfileChange($_SESSION['user_id'], '2fa', 'disabled', 'enabled');
                return ['success' => true, 'message' => 'Activado con éxito.', 'recovery_codes' => $codes];
            }
        }
        return ['success' => false, 'message' => 'Código incorrecto.'];
    }

    public function disable2fa($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            $this->pdo->prepare("UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_recovery_codes = NULL WHERE id = ?")->execute([$_SESSION['user_id']]);
            $_SESSION['user_2fa'] = 0;
            $this->logProfileChange($_SESSION['user_id'], '2fa', 'enabled', 'disabled');
            return ['success' => true, 'message' => 'Desactivado.'];
        }
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function getDevices() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';
        $stmt = $this->pdo->prepare("SELECT id, user_agent, ip_address, expires_at, selector FROM auth_tokens WHERE user_id = ? ORDER BY expires_at DESC");
        $stmt->execute([$_SESSION['user_id']]);
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($devices as &$device) { $device['is_current'] = ($device['selector'] === $currentSelector); unset($device['selector']); }
        return ['success' => true, 'devices' => $devices];
    }

    public function revokeDevice($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$data['device_id'] ?? null, $_SESSION['user_id']])) return ['success' => true, 'message' => 'Sesión cerrada.'];
        return ['success' => false, 'message' => 'Error.'];
    }

    public function revokeAllDevices() {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';
        if ($this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ? AND selector != ?")->execute([$_SESSION['user_id'], $currentSelector])) return ['success' => true, 'message' => 'Todas cerradas.'];
        return ['success' => false, 'message' => 'Error.'];
    }

    public function regenerateRecoveryCodes($data) {
        if (!isset($_SESSION['user_id'])) return ['success' => false, 'message' => 'Sesión no válida.'];
        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?"); $stmt->execute([$_SESSION['user_id']]);
        if ($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (password_verify(trim($data['password'] ?? ''), $user['password'])) {
                $codes = Utils::generateRecoveryCodes(10, 8);
                if ($this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?")->execute([json_encode($codes), $_SESSION['user_id']])) {
                    return ['success' => true, 'message' => 'Códigos generados.', 'recovery_codes' => $codes];
                }
            }
        }
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    private function canChangeProfileData($userId, $changeType, $maxAttempts, $days) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM profile_changes_log WHERE user_id = ? AND change_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
        $stmt->execute([$userId, $changeType, (int)$days]);
        return (int) $stmt->fetchColumn() < $maxAttempts;
    }

    private function logProfileChange($userId, $changeType, $oldValue, $newValue) {
        $ip = Utils::getIpAddress();
        $this->pdo->prepare("INSERT INTO profile_changes_log (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)")->execute([$userId, $changeType, $oldValue, $newValue, $ip]);
    }
}
?>