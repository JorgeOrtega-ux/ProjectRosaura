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
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\RateLimitConstants;

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
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['avatar_change_max_attempts'];
        $cooldownDays = $this->config['avatar_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_AVATAR, $maxAttempts, $cooldownDays)) {
            Logger::warning("Rate limit exceeded for avatar change", ['user_id' => $userId]);
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar'])) return ['success' => false, 'message_key' => 'upload.error'];
        $file = $files['avatar'];
        
        $maxSizeMb = $this->config['max_avatar_size_mb'] ?? 2;
        $uploadDir = ROOT_PATH . '/public/storage/profilePictures/uploaded/';

        $uploadResult = Utils::uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb);

        if ($uploadResult['success']) {
            $fileName = $uploadResult['file_name'];
            $oldPic = $this->sessionManager->get('user_pic', '');
            
            Utils::deleteOldAvatar($oldPic);
            
            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;

            if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
                $this->logProfileChange($userId, DB::LOG_CHANGE_AVATAR, $oldPic, $newRelPath);
                $this->sessionManager->set('user_pic', $newRelPath);
                return ['success' => true, 'message_key' => 'settings.avatar_updated', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
            }
        } else {
            return ['success' => false, 'message_key' => $uploadResult['message_key']];
        }
        
        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

    public function deleteAvatar()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        $oldPic = $this->sessionManager->get('user_pic', '');

        if (strpos($oldPic, '/default/') !== false) {
            return ['success' => false, 'message_key' => 'settings.avatar_already_default'];
        }

        Utils::deleteOldAvatar($oldPic);

        $newRelPath = Utils::generateProfilePicture($this->sessionManager->get('user_name'), $this->sessionManager->get('user_uuid'));
        if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_AVATAR, $oldPic, $newRelPath);
            $this->sessionManager->set('user_pic', $newRelPath);
            return ['success' => true, 'message_key' => 'settings.avatar_deleted', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
        }
        
        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function updateUsername($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['username_change_max_attempts'];
        $cooldownDays = $this->config['username_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_USERNAME, $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $username = trim($data['username'] ?? '');
        $minLen = $this->config['min_username_length'];
        $maxLen = $this->config['max_username_length'];
        
        if (strlen($username) < $minLen || strlen($username) > $maxLen) {
            return ['success' => false, 'message_key' => 'validation.invalid_length'];
        }

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message_key' => 'validation.username_in_use'];
        }

        $oldUsername = $this->sessionManager->get('user_name', '');
        if ($this->userRepository->updateUsername($userId, $username)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_USERNAME, $oldUsername, $username);
            $this->sessionManager->set('user_name', $username);
            return ['success' => true, 'message_key' => 'settings.username_updated', 'new_username' => $username];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function requestEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        if ($this->sessionManager->has('can_update_email_expires') && $this->sessionManager->get('can_update_email_expires') > time()) {
            return ['success' => true, 'message_key' => 'settings.identity_already_verified', 'skip_verification' => true];
        }

        $email = $this->sessionManager->get('user_email');
        $attempts = $this->config['email_code_request_attempts'] ?? 3;
        $minutes = $this->config['email_code_request_minutes'] ?? 30;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_REQ_EMAIL_CODE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        if ($lastCode) {
            $elapsed = (int)($lastCode['seconds_elapsed'] ?? 0);
            return ['success' => true, 'message_key' => 'auth.code_already_sent', 'elapsed' => $elapsed];
        }

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = Utils::calculateExpirationDate($codeMinutes);
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                return ['success' => true, 'message_key' => 'auth.verification_code_sent', 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

    public function resendEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        $email = $this->sessionManager->get('user_email');
        
        $attempts = $this->config['email_code_request_attempts'] ?? 3;
        $minutes = $this->config['email_code_request_minutes'] ?? 30;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_RES_EMAIL_CODE . "_{$userId}", $attempts, $minutes);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message_key' => 'error.cooldown_active', 'cooldown' => $timeLeft];
        }

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'email_update');

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = Utils::calculateExpirationDate($codeMinutes);
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                return ['success' => true, 'message_key' => 'auth.code_resent', 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message_key' => 'error.email_delivery'];
    }

    public function verifyEmailCode($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');

        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_VERIFY_EMAIL_CODE . "_{$userId}", RateLimitConstants::MAX_10, RateLimitConstants::TIME_15);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.too_many_attempts'];
        }

        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message_key' => 'validation.missing_fields'];

        $verification = $this->verificationCodeRepository->findValidByCodeAndType($code, 'email_update');

        if ($verification && $verification['identifier'] === $this->sessionManager->get('user_email')) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_VERIFY_EMAIL_CODE . "_{$userId}");
            $this->verificationCodeRepository->deleteById($verification['id']);
            $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
            $this->sessionManager->set('can_update_email_expires', time() + ($codeMinutes * 60));
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_REQ_EMAIL_CODE . "_{$userId}");
            return ['success' => true, 'message_key' => 'settings.identity_verified'];
        }
        
        return ['success' => false, 'message_key' => 'auth.invalid_or_expired_code'];
    }

    public function updateEmail($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_update_email_expires') || $this->sessionManager->get('can_update_email_expires') < time()) {
            return ['success' => false, 'message_key' => 'settings.identity_not_verified'];
        }
        
        $maxAttempts = $this->config['email_change_max_attempts'];
        $cooldownDays = $this->config['email_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_EMAIL, $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message_key' => 'validation.invalid_email'];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message_key' => 'validation.email_in_use'];
        }

        $oldEmail = $this->sessionManager->get('user_email', '');
        if ($this->userRepository->updateEmail($userId, $email)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_EMAIL, $oldEmail, $email);
            $this->sessionManager->set('user_email', $email);
            $this->sessionManager->remove('can_update_email_expires');
            return ['success' => true, 'message_key' => 'settings.email_updated', 'new_email' => $email];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function updatePreferences($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['prefs_update_rate_limit_attempts'] ?? 20;
        $minutes = $this->config['prefs_update_rate_limit_minutes'] ?? 5;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_UPDATE_PREFS . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return ['success' => false, 'message_key' => 'validation.invalid_preference'];
        
        if ($key === 'language') {
            $availableLanguages = \App\Core\System\Translator::getAvailableLanguages();
            if (!array_key_exists($value, $availableLanguages)) {
                return ['success' => false, 'message_key' => 'validation.invalid_language'];
            }
        }
        
        // MODIFICACIÓN APLICADA AQUÍ: Se añade allow_telemetry a la comprobación
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts' || $key === 'allow_telemetry') $value = ($value == 1) ? 1 : 0;

        if ($this->userRepository->updatePreference($userId, $key, $value)) {
            $userPrefs = $this->sessionManager->get('user_prefs', []);
            $userPrefs[$key] = $value;
            $this->sessionManager->set('user_prefs', $userPrefs);

            return ['success' => true, 'message_key' => 'settings.preference_updated'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function verifyCurrentPassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_VERIFY_PASSWORD . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['current_password'] ?? ''), $user['password'])) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_VERIFY_PASSWORD . "_{$userId}");
            $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
            $this->sessionManager->set('can_change_password_expires', time() + ($codeMinutes * 60));
            return ['success' => true, 'message_key' => 'settings.identity_verified'];
        }

        return ['success' => false, 'message_key' => 'auth.incorrect_password'];
    }

    public function updatePassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_change_password_expires') || $this->sessionManager->get('can_change_password_expires') < time()) {
            return ['success' => false, 'message_key' => 'settings.identity_not_verified'];
        }

        $attempts = $this->config['password_update_rate_limit_attempts'] ?? 5;
        $minutes = $this->config['password_update_rate_limit_minutes'] ?? 15;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_UPDATE_PASSWORD . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $newPassword = trim($data['new_password'] ?? '');
        if ($newPassword !== trim($data['confirm_password'] ?? '')) return ['success' => false, 'message_key' => 'validation.passwords_do_not_match'];
        
        $pVal = Utils::validatePasswordFormat($newPassword, $this->config['min_password_length'], $this->config['max_password_length']);
        if (!$pVal['valid']) return ['success' => false, 'message_key' => 'validation.invalid_password_format'];

        if ($this->userRepository->updatePassword($userId, password_hash($newPassword, PASSWORD_BCRYPT))) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_PASSWORD, '***', '***');
            $this->sessionManager->remove('can_change_password_expires');
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_UPDATE_PASSWORD . "_{$userId}");
            
            Utils::invalidateUserSessions($this->sessionManager, $userId);

            $mailer = new Mailer();
            $mailer->sendPasswordChangeNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'));
            
            return ['success' => true, 'message_key' => 'settings.password_updated'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function deleteAccount($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_DELETE_ACCOUNT . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.too_many_attempts'];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_DELETE_ACCOUNT . "_{$userId}");

            $deletionDate = date('Y-m-d H:i:s', strtotime('+30 days'));

            if ($this->userRepository->scheduleDeletion($userId, $deletionDate)) {
                
                $this->tokenRepository->deleteAllByUserId($userId);
                Utils::invalidateUserSessions($this->sessionManager, $userId, true);
                $this->sessionManager->removeAccount($userId);

                return ['success' => true, 'message_key' => 'settings.account_deletion_scheduled', 'scheduled_at' => $deletionDate];
            }
        }
        
        return ['success' => false, 'message_key' => 'auth.incorrect_password'];
    }

    public function generate2faSetup()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];
        if ($this->sessionManager->has('user_2fa') && $this->sessionManager->get('user_2fa') != 0) {
            return ['success' => false, 'message_key' => 'settings.2fa_already_active'];
        }

        $userId = $this->sessionManager->get('user_id');
        $ga = new GoogleAuthenticator();
        $secret = $ga->createSecret();

        $this->sessionManager->set('2fa_setup_secret', $secret);

        return [
            'success' => true,
            'secret' => $secret,
            'qr_url' => $ga->getQRCodeUrl('ProjectRosaura', $this->sessionManager->get('user_email'), $secret)
        ];
    }

    public function enable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_ENABLE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $code = trim($data['code'] ?? '');
        $secret = $this->sessionManager->get('2fa_setup_secret', '');

        if (empty($secret) || empty($code)) return ['success' => false, 'message_key' => 'validation.missing_fields'];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 2)) {
            $codes = Utils::generateRecoveryCodes(10, 8);
            
            $hashedCodes = array_map(function($c) {
                return password_hash($c, PASSWORD_BCRYPT);
            }, $codes);

            if ($this->userRepository->update2FA($userId, $secret, 1, json_encode($hashedCodes))) {
                $this->sessionManager->set('user_2fa', 1);
                $this->sessionManager->remove('2fa_setup_secret');
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_ENABLE . "_{$userId}"); 

                $this->logProfileChange($userId, DB::LOG_CHANGE_2FA, 'disabled', 'enabled');
                
                $mailer = new Mailer();
                $mailer->send2FAStatusNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'), 'enabled');
                
                return ['success' => true, 'message_key' => 'settings.2fa_enabled', 'recovery_codes' => $codes];
            }
        }

        return ['success' => false, 'message_key' => 'auth.incorrect_code'];
    }

    public function disable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_DISABLE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && password_verify(trim($data['password'] ?? ''), $user['password'])) {
            if ($this->userRepository->update2FA($userId, null, 0, null)) {
                $this->sessionManager->set('user_2fa', 0);
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_DISABLE . "_{$userId}");

                $this->logProfileChange($userId, DB::LOG_CHANGE_2FA, 'enabled', 'disabled');
                
                $mailer = new Mailer();
                $mailer->send2FAStatusNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'), 'disabled');
                
                return ['success' => true, 'message_key' => 'settings.2fa_disabled'];
            }
        }

        return ['success' => false, 'message_key' => 'auth.incorrect_password'];
    }

    public function getDevices()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        // REFACTORIZADO: Remoción de bloque repetido, ahora usa el helper unificado
        $currentSelector = Utils::getCurrentDeviceSelector($userId);

        $devices = $this->tokenRepository->getActiveDevicesByUserId($userId);
        $currentDeviceIndex = -1;

        foreach ($devices as $index => &$device) {
            $device['is_current'] = ($device['selector'] === $currentSelector);
            if ($device['is_current']) {
                $currentDeviceIndex = $index;
            }
            unset($device['selector']); 
        }

        if ($currentDeviceIndex > 0) {
            $currentDevice = array_splice($devices, $currentDeviceIndex, 1)[0];
            array_unshift($devices, $currentDevice);
        }

        return ['success' => true, 'devices' => $devices];
    }

    public function revokeDevice($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        $tokenId = (int)($data['device_id'] ?? 0);
        
        $selectorToRevoke = $this->tokenRepository->findSelectorByIdAndUserId($tokenId, $userId);

        if ($this->tokenRepository->revokeDevice($tokenId, $userId)) {
            
            if ($selectorToRevoke) {
                Utils::invalidateUserSessions($this->sessionManager, $userId, false, $selectorToRevoke);
            }
            
            return ['success' => true, 'message_key' => 'settings.session_revoked'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function revokeAllDevices($data = [])
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');
        
        // REFACTORIZADO: Remoción de bloque repetido, ahora usa el helper unificado
        $currentSelector = Utils::getCurrentDeviceSelector($userId);
        
        $type = $data['type'] ?? 'revoke_other';

        if ($type === 'revoke_all') {
            if ($this->tokenRepository->deleteAllByUserId($userId)) {
                
                Utils::invalidateUserSessions($this->sessionManager, $userId, true);
                
                $this->sessionManager->removeAccount($userId);

                if (isset($_COOKIE['remember_tokens'])) {
                    $tokens = json_decode($_COOKIE['remember_tokens'], true) ?: [];
                    if (isset($tokens[$userId])) unset($tokens[$userId]);
                    
                    if (empty($tokens)) {
                        setcookie('remember_tokens', '', ['expires' => time() - 3600, 'path' => APP_URL ?: '/']);
                        unset($_COOKIE['remember_tokens']);
                    } else {
                        $isSecure = Utils::isSecureConnection();
                        $encoded = json_encode($tokens);
                        setcookie('remember_tokens', $encoded, ['expires' => time() + (86400 * 30), 'path' => APP_URL ?: '/', 'secure' => $isSecure, 'httponly' => true, 'samesite' => 'Strict']);
                    }
                }
                
                if (isset($_COOKIE['remember_token'])) {
                    $isSecure = Utils::isSecureConnection();
                    setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => APP_URL ?: '/', 'secure' => $isSecure, 'httponly' => true, 'samesite' => 'Strict']);
                    unset($_COOKIE['remember_token']);
                }
                return ['success' => true, 'message_key' => 'settings.all_sessions_revoked'];
            }
       } else {
            $devicesToRevoke = $this->tokenRepository->getActiveDevicesByUserId($userId);

            if ($this->tokenRepository->revokeOtherDevices($userId, $currentSelector)) {
                
                foreach ($devicesToRevoke as $device) {
                    if ($device['selector'] !== $currentSelector) {
                        Utils::invalidateUserSessions($this->sessionManager, $userId, false, $device['selector']);
                    }
                }
                
                return ['success' => true, 'message_key' => 'settings.other_sessions_revoked'];
            }
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function regenerateRecoveryCodes($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'] ?? 5;
        $minutes = $this->config['security_verify_minutes'] ?? 15;
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_REGEN_CODES . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => 'error.too_many_attempts'];
        }

        $user = $this->userRepository->findById($userId);

        if ($user) {
            if (password_verify(trim($data['password'] ?? ''), $user['password'])) {
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_REGEN_CODES . "_{$userId}");

                $codes = Utils::generateRecoveryCodes(10, 8);
                
                $hashedCodes = array_map(function($c) {
                    return password_hash($c, PASSWORD_BCRYPT);
                }, $codes);
                
                if ($this->userRepository->updateRecoveryCodes($userId, json_encode($hashedCodes))) {
                    return ['success' => true, 'message_key' => 'settings.recovery_codes_regenerated', 'recovery_codes' => $codes];
                }
            }
        }
        
        return ['success' => false, 'message_key' => 'auth.incorrect_password'];
    }

    private function canChangeProfileData($userId, $changeType, $maxAttempts, $days)
    {
        $count = $this->profileLogRepository->countRecentChanges($userId, $changeType, (int)$days);
        return $count < $maxAttempts;
    }

    private function logProfileChange($userId, $changeType, $oldValue, $newValue)
    {
        $ip = Utils::getIpAddress();
        if (!$this->profileLogRepository->logChange($userId, $changeType, $oldValue, $newValue, $ip)) {
            Logger::error("Failed to log profile change in database", ['user_id' => $userId, 'change_type' => $changeType]);
        }
    }
}
?>