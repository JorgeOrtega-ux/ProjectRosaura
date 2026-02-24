<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Core\Mailer;
use App\Core\GoogleAuthenticator;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Logger;
use PDO;

class SettingsServices {
    private $pdo; // Mantenido para profile_changes_log, verification_codes, auth_tokens y user_preferences
    private $rateLimiter;
    private $sessionManager;
    private $userRepository;

    // 1. Inyección de Dependencias Actualizada con Interfaces Clean Architecture
    public function __construct(
        PDO $pdo, 
        RateLimiterInterface $rateLimiter,
        SessionManagerInterface $sessionManager,
        UserRepositoryInterface $userRepository
    ) {
        $this->pdo = $pdo;
        $this->rateLimiter = $rateLimiter;
        $this->sessionManager = $sessionManager;
        $this->userRepository = $userRepository;
    }

    public function updateAvatar($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida o expirada.'];
        
        $userId = $this->sessionManager->get('user_id');
        if (!$this->canChangeProfileData($userId, 'avatar', 3, 1)) return ['success' => false, 'message' => 'Has alcanzado el límite de 3 cambios de foto por día.'];

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
            $oldPic = $this->sessionManager->get('user_pic', '');
            if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
                $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
                if (file_exists($oldPath)) unlink($oldPath);
            }
            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;
            
            // Idealmente esto iría en un UserRepository->updateAvatar()
            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            if ($stmt->execute([$newRelPath, $userId])) {
                $this->logProfileChange($userId, 'avatar', $oldPic, $newRelPath);
                $this->sessionManager->set('user_pic', $newRelPath);
                Logger::security("Avatar de usuario actualizado", 'info', ['user_id' => $userId]);
                return ['success' => true, 'message' => 'Foto actualizada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
            }
        }
        return ['success' => false, 'message' => 'Error en el servidor.'];
    }

    public function deleteAvatar() {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $oldPic = $this->sessionManager->get('user_pic', '');
        
        // --- PROTECCIÓN ---
        if (strpos($oldPic, '/default/') !== false) {
            return ['success' => false, 'message' => 'Ya tienes una foto de perfil por defecto.'];
        }

        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPath = __DIR__ . '/../../' . ltrim($oldPic, '/ProjectRosaura/');
            if (file_exists($oldPath)) unlink($oldPath);
        }
        
        $newRelPath = Utils::generateProfilePicture($this->sessionManager->get('user_name'), $this->sessionManager->get('user_uuid'));
        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        if ($stmt->execute([$newRelPath, $userId])) {
            $this->logProfileChange($userId, 'avatar', $oldPic, $newRelPath);
            $this->sessionManager->set('user_pic', $newRelPath);
            Logger::security("Avatar de usuario eliminado", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Foto eliminada.', 'new_avatar' => '/ProjectRosaura/' . $newRelPath];
        }
        return ['success' => false, 'message' => 'Error en la base de datos.'];
    }

    public function updateUsername($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        if (!$this->canChangeProfileData($userId, 'username', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu nombre 1 vez cada 7 días.'];
        
        $username = trim($data['username'] ?? '');
        if (strlen($username) < 3 || strlen($username) > 32) return ['success' => false, 'message' => 'Inválido.'];
        
        // 2. Uso del UserRepository
        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        }
        
        $oldUsername = $this->sessionManager->get('user_name', '');
        $stmtUpd = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        if ($stmtUpd->execute([$username, $userId])) {
            $this->logProfileChange($userId, 'username', $oldUsername, $username);
            $this->sessionManager->set('user_name', $username);
            Logger::security("Nombre de usuario actualizado: {$oldUsername} -> {$username}", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Nombre de usuario actualizado.', 'new_username' => $username];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function requestEmailCode() {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        if ($this->sessionManager->has('can_update_email_expires') && $this->sessionManager->get('can_update_email_expires') > time()) {
            return ['success' => true, 'message' => 'Identidad ya verificada.', 'skip_verification' => true];
        }
        
        $email = $this->sessionManager->get('user_email');
        $rateCheck = $this->rateLimiter->check('request_email_code', 3, 30);
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en solicitud de código de cambio de email", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND expires_at > NOW()");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) return ['success' => true, 'message' => 'Código ya enviado.'];

        $code = Utils::generateNumericCode(12);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['action' => 'email_update']);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'email_update', ?, ?, ?)");
        if ($insertStmt->execute([$email, $code, $payload, $expiresAt])) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                $this->rateLimiter->record('request_email_code', 3, 30);
                Logger::security("Código para actualización de email enviado", 'info', ['user_id' => $userId]);
                return ['success' => true, 'message' => 'Código enviado.'];
            }
        }
        return ['success' => false, 'message' => 'Error interno.'];
    }

    public function verifyEmailCode($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];

        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = 'email_update' AND code = ? AND expires_at > NOW()");
        $stmt->execute([$this->sessionManager->get('user_email'), $code]);

        if ($stmt->rowCount() > 0) {
            $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?")->execute([$stmt->fetch(PDO::FETCH_ASSOC)['id']]);
            $this->sessionManager->set('can_update_email_expires', time() + (15 * 60));
            $this->rateLimiter->clear('request_email_code');
            Logger::security("Identidad verificada exitosamente para cambio de email", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Identidad verificada. Tienes 15 minutos.'];
        }
        Logger::security("Código de verificación incorrecto en cambio de email", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'El código es incorrecto o ha expirado.'];
    }

    public function updateEmail($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_update_email_expires') || $this->sessionManager->get('can_update_email_expires') < time()) {
            Logger::security("Intento de cambio de email sin identidad verificada", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'Verifica tu identidad primero.'];
        }
        if (!$this->canChangeProfileData($userId, 'email', 1, 7)) return ['success' => false, 'message' => 'Solo puedes cambiar tu correo 1 vez cada 7 días.'];

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

        // 3. Uso del UserRepository
        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => 'Correo registrado en otra cuenta.'];
        }

        $oldEmail = $this->sessionManager->get('user_email', '');
        $stmtUpd = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        if ($stmtUpd->execute([$email, $userId])) {
            $this->logProfileChange($userId, 'email', $oldEmail, $email);
            $this->sessionManager->set('user_email', $email);
            $this->sessionManager->remove('can_update_email_expires');
            Logger::security("Correo electrónico actualizado: {$oldEmail} -> {$email}", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Correo actualizado.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updatePreferences($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $rateCheck = $this->rateLimiter->check('update_preferences', 20, 5, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $key = $data['key'] ?? ''; $value = $data['value'] ?? '';
        if (!in_array($key, ['language', 'open_links_new_tab', 'theme', 'extended_alerts'])) return ['success' => false, 'message' => 'Preferencia no válida.'];
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        $stmt = $this->pdo->prepare("UPDATE user_preferences SET {$key} = ? WHERE user_id = ?");
        if ($stmt->execute([$value, $userId])) {
            $userPrefs = $this->sessionManager->get('user_prefs', []);
            $userPrefs[$key] = $value;
            $this->sessionManager->set('user_prefs', $userPrefs);
            
            $this->rateLimiter->record('update_preferences', 20, 5);
            return ['success' => true, 'message' => 'Preferencia guardada.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function verifyCurrentPassword($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $rateCheck = $this->rateLimiter->check('verify_current_password', 5, 15);
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en verificación de contraseña actual", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        // 4. Uso del UserRepository
        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['current_password'] ?? ''), $user['password'])) {
            $this->rateLimiter->clear('verify_current_password');
            $this->sessionManager->set('can_change_password_expires', time() + (15 * 60));
            Logger::security("Contraseña actual verificada exitosamente", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Identidad verificada.'];
        }
        
        $this->rateLimiter->record('verify_current_password', 5, 15);
        Logger::security("Verificación de contraseña actual fallida", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'La contraseña es incorrecta.'];
    }

    public function updatePassword($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_change_password_expires') || $this->sessionManager->get('can_change_password_expires') < time()) {
            Logger::security("Intento de actualización de contraseña sin verificación previa", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'Verifica tu contraseña primero.'];
        }
        
        $rateCheck = $this->rateLimiter->check('update_password', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $newPassword = trim($data['new_password'] ?? '');
        if ($newPassword !== trim($data['confirm_password'] ?? '')) return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];
        $pVal = Utils::validatePasswordFormat($newPassword);
        if (!$pVal['valid']) return ['success' => false, 'message' => $pVal['message']];

        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($stmt->execute([password_hash($newPassword, PASSWORD_BCRYPT), $userId])) {
            $this->logProfileChange($userId, 'password', '***', '***');
            $this->sessionManager->remove('can_change_password_expires');
            $this->rateLimiter->clear('update_password');
            Logger::security("Contraseña de cuenta actualizada manualmente", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Contraseña actualizada.'];
        }
        $this->rateLimiter->record('update_password', 5, 15);
        return ['success' => false, 'message' => 'Hubo un error.'];
    }

    public function deleteAccount($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        
        // 5. Uso del UserRepository
        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            if ($this->userRepository->updateStatus($userId, 'deleted')) {
                $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?")->execute([$userId]);
                if (isset($_COOKIE['remember_token'])) setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/ProjectRosaura/']);
                Logger::security("Cuenta de usuario marcada como eliminada", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                
                $this->sessionManager->destroy();
                return ['success' => true, 'message' => 'Tu cuenta ha sido eliminada.'];
            }
        }
        Logger::security("Intento fallido de eliminación de cuenta (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function generate2faSetup() {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        if ($this->sessionManager->has('user_2fa') && $this->sessionManager->get('user_2fa') != 0) {
            return ['success' => false, 'message' => 'El 2FA ya está activado.'];
        }

        $userId = $this->sessionManager->get('user_id');
        $ga = new GoogleAuthenticator();
        $secret = $ga->createSecret();
        
        $this->sessionManager->set('2fa_setup_secret', $secret);
        Logger::security("Solicitud de generación de credenciales 2FA iniciada", 'info', ['user_id' => $userId]);
        
        return [
            'success' => true, 
            'secret' => $secret, 
            'qr_url' => $ga->getQRCodeUrl('ProjectRosaura', $this->sessionManager->get('user_email'), $secret)
        ];
    }

    public function enable2fa($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $code = trim($data['code'] ?? ''); 
        $secret = $this->sessionManager->get('2fa_setup_secret', '');
        
        if (empty($secret) || empty($code)) return ['success' => false, 'message' => 'Faltan datos.'];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 2)) {
            $codes = Utils::generateRecoveryCodes(10, 8);
            $stmt = $this->pdo->prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_recovery_codes = ? WHERE id = ?");
            if ($stmt->execute([$secret, json_encode($codes), $userId])) {
                $this->sessionManager->set('user_2fa', 1); 
                $this->sessionManager->remove('2fa_setup_secret');
                $this->logProfileChange($userId, '2fa', 'disabled', 'enabled');
                Logger::security("Autenticación de Dos Factores (2FA) habilitada", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Activado con éxito.', 'recovery_codes' => $codes];
            }
        }
        Logger::security("Fallo al intentar habilitar 2FA (Código incorrecto)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Código incorrecto.'];
    }

    public function disable2fa($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            $this->pdo->prepare("UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_recovery_codes = NULL WHERE id = ?")->execute([$userId]);
            $this->sessionManager->set('user_2fa', 0);
            $this->logProfileChange($userId, '2fa', 'enabled', 'disabled');
            Logger::security("Autenticación de Dos Factores (2FA) deshabilitada", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Desactivado.'];
        }
        Logger::security("Intento fallido de deshabilitar 2FA (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function getDevices() {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';
        $stmt = $this->pdo->prepare("SELECT id, user_agent, ip_address, expires_at, selector FROM auth_tokens WHERE user_id = ? ORDER BY expires_at DESC");
        $stmt->execute([$userId]);
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($devices as &$device) { $device['is_current'] = ($device['selector'] === $currentSelector); unset($device['selector']); }
        return ['success' => true, 'devices' => $devices];
    }

    public function revokeDevice($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$data['device_id'] ?? null, $userId])) {
            Logger::security("Sesión de dispositivo revocada manualmente", 'info', ['user_id' => $userId, 'device_id' => $data['device_id']]);
            return ['success' => true, 'message' => 'Sesión cerrada.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function revokeAllDevices() {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';
        if ($this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ? AND selector != ?")->execute([$userId, $currentSelector])) {
            Logger::security("Todas las demás sesiones de dispositivos fueron revocadas", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Todas cerradas.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function regenerateRecoveryCodes($data) {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];
        
        $userId = $this->sessionManager->get('user_id');
        $user = $this->userRepository->findById($userId);
        
        if ($user) {
            if (password_verify(trim($data['password'] ?? ''), $user['password'])) {
                $codes = Utils::generateRecoveryCodes(10, 8);
                if ($this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?")->execute([json_encode($codes), $userId])) {
                    Logger::security("Códigos de recuperación de 2FA regenerados", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                    return ['success' => true, 'message' => 'Códigos generados.', 'recovery_codes' => $codes];
                }
            }
        }
        Logger::security("Intento fallido de regenerar códigos 2FA (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
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