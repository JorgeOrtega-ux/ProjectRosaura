<?php
// api/services/SettingsServices.php

namespace App\Api\Services;

use App\Core\Helpers\Utils;
use App\Core\Mail\Mailer;
use App\Core\Security\GoogleAuthenticator;
use App\Core\System\Logger;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\Interfaces\ProfileLogRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface; 

class SettingsServices
{
    private $rateLimiter;
    private $sessionManager;
    private $userRepository;
    private $moderationRepository;
    private $tokenRepository;
    private $verificationCodeRepository;
    private $profileLogRepository;
    private $config; 

    public function __construct(
        RateLimiterInterface $rateLimiter,
        SessionManagerInterface $sessionManager,
        UserRepositoryInterface $userRepository,
        ModerationRepositoryInterface $moderationRepository,
        TokenRepositoryInterface $tokenRepository,
        VerificationCodeRepositoryInterface $verificationCodeRepository,
        ProfileLogRepositoryInterface $profileLogRepository,
        ServerConfigRepositoryInterface $configRepository 
    ) {
        $this->rateLimiter = $rateLimiter;
        $this->sessionManager = $sessionManager;
        $this->userRepository = $userRepository;
        $this->moderationRepository = $moderationRepository;
        $this->tokenRepository = $tokenRepository;
        $this->verificationCodeRepository = $verificationCodeRepository;
        $this->profileLogRepository = $profileLogRepository;
        $this->config = $configRepository->getConfig(); 
    }

    public function updateAvatar($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida o expirada.'];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['avatar_change_max_attempts'];
        $cooldownDays = $this->config['avatar_change_cooldown_days'];
        if (!$this->canChangeProfileData($userId, 'avatar', $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => "Has alcanzado el límite de {$maxAttempts} cambios de foto en {$cooldownDays} días."];
        }

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar']) || $files['avatar']['error'] !== UPLOAD_ERR_OK) return ['success' => false, 'message' => 'Hubo un error al subir el archivo.'];
        $file = $files['avatar'];
        
        $maxSizeMb = $this->config['max_avatar_size_mb'];
        if ($file['size'] > $maxSizeMb * 1024 * 1024) {
            return ['success' => false, 'message' => "La imagen supera el límite de {$maxSizeMb}MB."];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if ($mime !== 'image/png' && $mime !== 'image/jpeg') return ['success' => false, 'message' => 'Solo se permiten formatos PNG y JPG.'];

        $fileName = Utils::generateUUID() . (($mime === 'image/png') ? '.png' : '.jpg');
        $uploadDir = ROOT_PATH . '/public/storage/profilePictures/uploaded/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        $destPath = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            $oldPic = $this->sessionManager->get('user_pic', '');
            if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
                $oldPicRelative = str_replace(['/ProjectRosaura/', APP_URL . '/'], '', $oldPic);
                $oldPath = ROOT_PATH . '/' . ltrim($oldPicRelative, '/');
                if (file_exists($oldPath)) unlink($oldPath);
            }
            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;

            if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
                $this->logProfileChange($userId, 'avatar', $oldPic, $newRelPath);
                $this->sessionManager->set('user_pic', $newRelPath);
                Logger::security("Avatar de usuario actualizado", 'info', ['user_id' => $userId]);
                return ['success' => true, 'message' => 'Foto actualizada.', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
            }
        }
        return ['success' => false, 'message' => 'Error en el servidor.'];
    }

    public function deleteAvatar()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $oldPic = $this->sessionManager->get('user_pic', '');

        if (strpos($oldPic, '/default/') !== false) {
            return ['success' => false, 'message' => 'Ya tienes una foto de perfil por defecto.'];
        }

        if (!empty($oldPic) && strpos($oldPic, 'uploaded/') !== false) {
            $oldPicRelative = str_replace(['/ProjectRosaura/', APP_URL . '/'], '', $oldPic);
            $oldPath = ROOT_PATH . '/' . ltrim($oldPicRelative, '/');
            if (file_exists($oldPath)) unlink($oldPath);
        }

        $newRelPath = Utils::generateProfilePicture($this->sessionManager->get('user_name'), $this->sessionManager->get('user_uuid'));
        if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
            $this->logProfileChange($userId, 'avatar', $oldPic, $newRelPath);
            $this->sessionManager->set('user_pic', $newRelPath);
            Logger::security("Avatar de usuario eliminado", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Foto eliminada.', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
        }
        return ['success' => false, 'message' => 'Error en la base de datos.'];
    }

    public function updateUsername($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['username_change_max_attempts'];
        $cooldownDays = $this->config['username_change_cooldown_days'];
        if (!$this->canChangeProfileData($userId, 'username', $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => "Solo puedes cambiar tu nombre {$maxAttempts} vez cada {$cooldownDays} días."];
        }

        $username = trim($data['username'] ?? '');
        $minLen = $this->config['min_username_length'];
        $maxLen = $this->config['max_username_length'];
        
        if (strlen($username) < $minLen || strlen($username) > $maxLen) {
            return ['success' => false, 'message' => "El nombre de usuario debe tener entre {$minLen} y {$maxLen} caracteres."];
        }

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        }

        $oldUsername = $this->sessionManager->get('user_name', '');
        if ($this->userRepository->updateUsername($userId, $username)) {
            $this->logProfileChange($userId, 'username', $oldUsername, $username);
            $this->sessionManager->set('user_name', $username);
            Logger::security("Nombre de usuario actualizado: {$oldUsername} -> {$username}", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Nombre de usuario actualizado.', 'new_username' => $username];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updateIdentifier($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['username_change_max_attempts'] ?? 1;
        $cooldownDays = $this->config['username_change_cooldown_days'] ?? 7;
        
        if (!$this->canChangeProfileData($userId, 'identifier', $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => "Solo puedes cambiar tu identificador {$maxAttempts} vez cada {$cooldownDays} días."];
        }

        $identifier = strtolower(trim($data['identifier'] ?? ''));
        
        if (!preg_match('/^[a-z0-9_]{3,20}$/', $identifier)) {
            return ['success' => false, 'message' => 'El identificador debe tener entre 3 y 20 caracteres y contener solo letras minúsculas, números o guiones bajos.'];
        }
        
        $reserved = ['admin', 'settings', 'studio', 'login', 'register', 'api', 'explore', 'feed'];
        if (in_array($identifier, $reserved)) {
            return ['success' => false, 'message' => 'Este identificador no está permitido.'];
        }

        $existingUser = $this->userRepository->findByIdentifier($identifier);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => 'Este identificador ya está en uso.'];
        }

        $oldIdentifier = $this->sessionManager->get('user_identifier', '');
        if ($this->userRepository->updateIdentifier($userId, $identifier)) {
            $this->logProfileChange($userId, 'identifier', $oldIdentifier, $identifier);
            $this->sessionManager->set('user_identifier', $identifier);
            Logger::security("Identificador de canal actualizado: @{$oldIdentifier} -> @{$identifier}", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Identificador actualizado exitosamente.', 'new_identifier' => $identifier];
        }
        return ['success' => false, 'message' => 'Error al actualizar el identificador.'];
    }

    public function requestEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        if ($this->sessionManager->has('can_update_email_expires') && $this->sessionManager->get('can_update_email_expires') > time()) {
            return ['success' => true, 'message' => 'Identidad ya verificada.', 'skip_verification' => true];
        }

        $email = $this->sessionManager->get('user_email');
        
        $attempts = $this->config['email_code_request_attempts'] ?? 3;
        $minutes = $this->config['email_code_request_minutes'] ?? 30;
        $rateCheck = $this->rateLimiter->check('request_email_code', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en solicitud de código de cambio de email", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        if ($lastCode) {
            $elapsed = (int)($lastCode['seconds_elapsed'] ?? 0);
            return ['success' => true, 'message' => 'Código ya enviado.', 'elapsed' => $elapsed];
        }

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$codeMinutes} minutes"));
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                $this->rateLimiter->record('request_email_code', $attempts, $minutes);
                Logger::security("Código para actualización de email enviado", 'info', ['user_id' => $userId]);
                return ['success' => true, 'message' => 'Código enviado.', 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message' => 'Error interno.'];
    }

    public function resendEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $email = $this->sessionManager->get('user_email');

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message' => "Por favor, espera {$timeLeft} segundos antes de solicitar otro código.", 'cooldown' => $timeLeft];
        }

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'email_update');

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$codeMinutes} minutes"));
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                Logger::security("Código de cambio de email reenviado", 'info', ['user_id' => $userId]);
                return ['success' => true, 'message' => 'Código reenviado con éxito.', 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message' => 'Error interno al enviar el correo.'];
    }

    public function verifyEmailCode($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];

        $verification = $this->verificationCodeRepository->findValidByCodeAndType($code, 'email_update');

        if ($verification && $verification['identifier'] === $this->sessionManager->get('user_email')) {
            $this->verificationCodeRepository->deleteById($verification['id']);
            $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
            $this->sessionManager->set('can_update_email_expires', time() + ($codeMinutes * 60));
            $this->rateLimiter->clear('request_email_code');
            Logger::security("Identidad verificada exitosamente para cambio de email", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => "Identidad verificada. Tienes {$codeMinutes} minutos."];
        }
        Logger::security("Código de verificación incorrecto en cambio de email", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'El código es incorrecto o ha expirado.'];
    }

    public function updateEmail($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_update_email_expires') || $this->sessionManager->get('can_update_email_expires') < time()) {
            Logger::security("Intento de cambio de email sin identidad verificada", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'Verifica tu identidad primero.'];
        }
        
        $maxAttempts = $this->config['email_change_max_attempts'];
        $cooldownDays = $this->config['email_change_cooldown_days'];
        if (!$this->canChangeProfileData($userId, 'email', $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => "Solo puedes cambiar tu correo {$maxAttempts} vez cada {$cooldownDays} días."];
        }

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => $emailValidation['message']];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => 'Correo registrado en otra cuenta.'];
        }

        $oldEmail = $this->sessionManager->get('user_email', '');
        if ($this->userRepository->updateEmail($userId, $email)) {
            $this->logProfileChange($userId, 'email', $oldEmail, $email);
            $this->sessionManager->set('user_email', $email);
            $this->sessionManager->remove('can_update_email_expires');
            Logger::security("Correo electrónico actualizado: {$oldEmail} -> {$email}", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Correo actualizado.', 'new_email' => $email];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }

    public function updatePreferences($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['prefs_update_rate_limit_attempts'] ?? 20;
        $minutes = $this->config['prefs_update_rate_limit_minutes'] ?? 5;
        $rateCheck = $this->rateLimiter->check('update_preferences', $attempts, $minutes, "Has cambiado tus preferencias demasiadas veces. Por favor espera {minutes} minutos.");
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';
        
        if (!in_array($key, ['language', 'measurement_system', 'open_links_new_tab', 'theme', 'extended_alerts'])) return ['success' => false, 'message' => 'Preferencia no válida.'];
        
        if ($key === 'measurement_system' && !in_array($value, ['metric', 'imperial'])) return ['success' => false, 'message' => 'Sistema de medición no válido.'];
        
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        if ($this->userRepository->updatePreference($userId, $key, $value)) {
            $userPrefs = $this->sessionManager->get('user_prefs', []);
            $userPrefs[$key] = $value;
            $this->sessionManager->set('user_prefs', $userPrefs);

            $this->rateLimiter->record('update_preferences', $attempts, $minutes);
            return ['success' => true, 'message' => 'Preferencia guardada.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function verifyCurrentPassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->check('verify_current_password', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en verificación de contraseña actual", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['current_password'] ?? ''), $user['password'])) {
            $this->rateLimiter->clear('verify_current_password');
            $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
            $this->sessionManager->set('can_change_password_expires', time() + ($codeMinutes * 60));
            Logger::security("Contraseña actual verificada exitosamente", 'info', ['user_id' => $userId]);
            return ['success' => true, 'message' => 'Identidad verificada.'];
        }

        $this->rateLimiter->record('verify_current_password', $attempts, $minutes);
        Logger::security("Verificación de contraseña actual fallida", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'La contraseña es incorrecta.'];
    }

    public function updatePassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_change_password_expires') || $this->sessionManager->get('can_change_password_expires') < time()) {
            Logger::security("Intento de actualización de contraseña sin verificación previa", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'Verifica tu contraseña primero.'];
        }

        $attempts = $this->config['password_update_rate_limit_attempts'] ?? 5;
        $minutes = $this->config['password_update_rate_limit_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->check('update_password', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $newPassword = trim($data['new_password'] ?? '');
        if ($newPassword !== trim($data['confirm_password'] ?? '')) return ['success' => false, 'message' => 'Las contraseñas no coinciden.'];
        
        $pVal = Utils::validatePasswordFormat($newPassword, $this->config['min_password_length'], $this->config['max_password_length']);
        if (!$pVal['valid']) return ['success' => false, 'message' => $pVal['message']];

        if ($this->userRepository->updatePassword($userId, password_hash($newPassword, PASSWORD_BCRYPT))) {
            $this->logProfileChange($userId, 'password', '***', '***');
            $this->sessionManager->remove('can_change_password_expires');
            $this->rateLimiter->clear('update_password');
            Logger::security("Contraseña de cuenta actualizada manualmente", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Contraseña actualizada.'];
        }
        $this->rateLimiter->record('update_password', $attempts, $minutes);
        return ['success' => false, 'message' => 'Hubo un error.'];
    }

    public function deleteAccount($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            if ($this->moderationRepository->updateStatus(
                $userId, 
                'deleted', 
                'user', 
                'Eliminada por el propio usuario desde la configuración.', 
                (int)($user['is_suspended'] ?? 0), 
                $user['suspension_type'] ?? null, 
                $user['suspension_reason'] ?? null, 
                $user['suspension_end_date'] ?? null,
                $user['admin_notes'] ?? null
            )) {
                $this->moderationRepository->logAction($userId, null, 'deleted', 'Eliminada por el propio usuario desde la configuración.', null, null);
                
                $this->tokenRepository->deleteAllByUserId($userId);
                if (isset($_COOKIE['remember_token'])) setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => APP_URL ?: '/']);
                Logger::security("Cuenta de usuario eliminada por si mismo", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);

                $this->sessionManager->destroy();
                return ['success' => true, 'message' => 'Tu cuenta ha sido eliminada.'];
            }
        }
        Logger::security("Intento fallido de eliminación de cuenta (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function generate2faSetup()
    {
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

    public function enable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->check('enable_2fa', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido al intentar activar 2FA", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $code = trim($data['code'] ?? '');
        $secret = $this->sessionManager->get('2fa_setup_secret', '');

        if (empty($secret) || empty($code)) return ['success' => false, 'message' => 'Faltan datos.'];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 2)) {
            $codes = Utils::generateRecoveryCodes(10, 8);
            if ($this->userRepository->update2FA($userId, $secret, 1, json_encode($codes))) {
                
                $this->sessionManager->set('user_2fa', 1);
                $this->sessionManager->set('two_factor_enabled', 1); 

                $this->sessionManager->remove('2fa_setup_secret');
                $this->rateLimiter->clear('enable_2fa'); 
                $this->logProfileChange($userId, '2fa', 'disabled', 'enabled');
                Logger::security("Autenticación de Dos Factores (2FA) habilitada", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Activado con éxito.', 'recovery_codes' => $codes];
            }
        }

        $this->rateLimiter->record('enable_2fa', $attempts, $minutes); 
        Logger::security("Fallo al intentar habilitar 2FA (Código incorrecto)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Código incorrecto.'];
    }

    public function disable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->check('disable_2fa', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            if ($this->userRepository->update2FA($userId, null, 0, null)) {
                
                $this->sessionManager->set('user_2fa', 0);
                $this->sessionManager->set('two_factor_enabled', 0); 
                
                $this->rateLimiter->clear('disable_2fa');
                $this->logProfileChange($userId, '2fa', 'enabled', 'disabled');
                Logger::security("Autenticación de Dos Factores (2FA) deshabilitada", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Desactivado.'];
            }
        }

        $this->rateLimiter->record('disable_2fa', $attempts, $minutes);
        Logger::security("Intento fallido de deshabilitar 2FA (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    public function getDevices()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';

        $devices = $this->tokenRepository->getActiveDevicesByUserId($userId);
        foreach ($devices as &$device) {
            $device['is_current'] = ($device['selector'] === $currentSelector);
            unset($device['selector']);
        }
        return ['success' => true, 'devices' => $devices];
    }

    public function revokeDevice($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        if ($this->tokenRepository->revokeDevice((int)($data['device_id'] ?? 0), $userId)) {
            Logger::security("Sesión de dispositivo revocada manualmente", 'info', ['user_id' => $userId, 'device_id' => $data['device_id']]);
            return ['success' => true, 'message' => 'Sesión cerrada.'];
        }
        return ['success' => false, 'message' => 'Error.'];
    }

    public function revokeAllDevices($data = [])
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $currentSelector = isset($_COOKIE['remember_token']) ? explode(':', $_COOKIE['remember_token'])[0] : '';
        
        $type = $data['type'] ?? 'revoke_other';

        if ($type === 'revoke_all') {
            if ($this->tokenRepository->deleteAllByUserId($userId)) {
                Logger::security("Todas las sesiones de dispositivos fueron revocadas (incluyendo la actual)", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                $this->sessionManager->destroy();
                if (isset($_COOKIE['remember_token'])) {
                    setcookie('remember_token', '', [
                        'expires' => time() - 3600, 
                        'path' => APP_URL ?: '/', 
                        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', 
                        'httponly' => true, 
                        'samesite' => 'Strict'
                    ]);
                    unset($_COOKIE['remember_token']);
                }
                return ['success' => true, 'message' => 'Todas las sesiones cerradas.'];
            }
        } else {
            if ($this->tokenRepository->revokeOtherDevices($userId, $currentSelector)) {
                Logger::security("Todas las demás sesiones de dispositivos fueron revocadas", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Todas cerradas excepto esta.'];
            }
        }
        
        return ['success' => false, 'message' => 'Error.'];
    }

    public function regenerateRecoveryCodes($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => 'Sesión no válida.'];

        $userId = $this->sessionManager->get('user_id');
        $user = $this->userRepository->findById($userId);

        if ($user) {
            if (password_verify(trim($data['password'] ?? ''), $user['password'])) {
                $codes = Utils::generateRecoveryCodes(10, 8);
                if ($this->userRepository->updateRecoveryCodes($userId, json_encode($codes))) {
                    Logger::security("Códigos de recuperación de 2FA regenerados", 'info', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
                    return ['success' => true, 'message' => 'Códigos generados.', 'recovery_codes' => $codes];
                }
            }
        }
        Logger::security("Intento fallido de regenerar códigos 2FA (Contraseña incorrecta)", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Contraseña incorrecta.'];
    }

    private function canChangeProfileData($userId, $changeType, $maxAttempts, $days)
    {
        $count = $this->profileLogRepository->countRecentChanges($userId, $changeType, (int)$days);
        return $count < $maxAttempts;
    }

    private function logProfileChange($userId, $changeType, $oldValue, $newValue)
    {
        $ip = Utils::getIpAddress();
        $this->profileLogRepository->logChange($userId, $changeType, $oldValue, $newValue, $ip);
    }
}
?>