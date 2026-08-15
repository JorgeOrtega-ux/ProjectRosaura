<?php

namespace App\Api\Services\Settings;

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
use App\Core\System\SessionConstants;

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
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['avatar_change_max_attempts'];
        $cooldownDays = $this->config['avatar_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_AVATAR, $maxAttempts, $cooldownDays)) {
            $payload = json_encode(['event' => 'rate_limit_exceeded', 'type' => 'avatar_change', 'user_id' => $userId]);
            Logger::warning("rate_limit_event", ['details' => $payload]);
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar'])) return ['success' => false, 'message' => __('upload.error')];
        $file = $files['avatar'];
        
        $maxSizeMb = $this->config['max_avatar_size_mb'];

        $uploadDir = 'profilePictures/uploaded/';

        $uploadResult = Utils::uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb);

        if ($uploadResult['success']) {
            $fileName = $uploadResult['file_name'];
            $oldPic = $this->sessionManager->get('user_pic', '');
            
            Utils::deleteOldAvatar($oldPic);

            $newRelPath = 'profilePictures/uploaded/' . $fileName;

            if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
                $this->logProfileChange($userId, DB::LOG_CHANGE_AVATAR, json_encode(['avatar' => $oldPic]), json_encode(['avatar' => $newRelPath]));
                $this->sessionManager->set('user_pic', $newRelPath);
                
                $accounts = $this->sessionManager->getLinkedAccounts();
                if (isset($accounts[$userId])) {
                    $accounts[$userId]['user_pic'] = $newRelPath;
                    $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                }

                return ['success' => true, 'message' => __('settings.avatar_updated'), 'new_avatar' => \App\Core\Helpers\Utils::getS3PublicUrl($newRelPath)];
            }
        } else {
            return ['success' => false, 'message' => __($uploadResult['message_key'])];
        }
        
        return ['success' => false, 'message' => __('error.internal_server_error')];
    }

    public function deleteAvatar()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        $oldPic = $this->sessionManager->get('user_pic', '');

        if (Utils::isDefaultAvatar($oldPic)) {
            return ['success' => false, 'message' => __('settings.avatar_already_default')];
        }

        Utils::deleteOldAvatar($oldPic);

        $newRelPath = Utils::generateProfilePicture($this->sessionManager->get('user_name'), $this->sessionManager->get('user_email'));
        if ($this->userRepository->updateAvatar($userId, $newRelPath)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_AVATAR, json_encode(['avatar' => $oldPic]), json_encode(['avatar' => $newRelPath]));
            $this->sessionManager->set('user_pic', $newRelPath);

            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['user_pic'] = $newRelPath;
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }

            return ['success' => true, 'message' => __('settings.avatar_deleted'), 'new_avatar' => Utils::getS3PublicUrl($newRelPath)];
        }
        
        return ['success' => false, 'message' => __('error.database')];
    }

    public function updateUsername($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        
        $maxAttempts = $this->config['username_change_max_attempts'];
        $cooldownDays = $this->config['username_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_USERNAME, $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $username = Utils::sanitizeText($data['username'] ?? '');
        if (empty($username)) return ['success' => false, 'message' => __('validation.missing_fields')];

        $minLen = (int)($this->config['min_username_length'] ?? 3);
        $maxLen = (int)($this->config['max_username_length'] ?? 20);
        
        $userValidation = Utils::validateUsernameFormat($username, $minLen, $maxLen);
        if (!$userValidation['valid']) {
            return ['success' => false, 'message' => __($userValidation['message_key'])];
        }

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => __('validation.username_in_use')];
        }

        $oldUsername = $this->sessionManager->get('user_name', '');
        if ($this->userRepository->updateUsername($userId, $username)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_USERNAME, json_encode(['username' => $oldUsername]), json_encode(['username' => $username]));
            $this->sessionManager->set('user_name', $username);

            // Regenerar avatar por defecto si tiene uno para que se actualice la inicial
            $dbUser = $this->userRepository->findById($userId);
            $newAvatar = null;
            if ($dbUser && (empty($dbUser['profile_picture']) || strpos($dbUser['profile_picture'], '/avatar/') !== false)) {
                $newAvatar = Utils::generateProfilePicture($username, $dbUser['email']);
                if ($this->userRepository->updateAvatar($userId, $newAvatar)) {
                    $this->sessionManager->set('user_pic', $newAvatar);
                }
            }

            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['user_name'] = $username;
                if ($newAvatar !== null) {
                    $accounts[$userId]['user_pic'] = $newAvatar;
                }
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }

            return ['success' => true, 'message' => __('settings.username_updated'), 'new_username' => $username];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function requestEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        if ($this->sessionManager->has('can_update_email_expires') && $this->sessionManager->get('can_update_email_expires') > time()) {
            return ['success' => true, 'message' => __('settings.identity_already_verified'), 'skip_verification' => true];
        }

        $email = $this->sessionManager->get('user_email');
        $attempts = $this->config['email_code_request_attempts'];
        $minutes = $this->config['email_code_request_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_REQ_EMAIL_CODE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        if ($lastCode) {
            $elapsed = (int)($lastCode['seconds_elapsed'] ?? 0);
            return ['success' => true, 'message' => __('auth.code_already_sent'), 'elapsed' => $elapsed];
        }

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'];
        $expiresAt = Utils::calculateExpirationDate($codeMinutes);
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                return ['success' => true, 'message' => __('auth.verification_code_sent'), 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message' => __('error.internal_server_error')];
    }

    public function resendEmailCode()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        $email = $this->sessionManager->get('user_email');
        
        $attempts = $this->config['email_code_request_attempts'];
        $minutes = $this->config['email_code_request_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_RES_EMAIL_CODE . "_{$userId}", $attempts, $minutes);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'email_update');
        
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message' => __('error.cooldown_active'), 'cooldown' => $timeLeft];
        }

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'email_update');

        $code = Utils::generateNumericCode(12);
        $codeMinutes = $this->config['verification_code_minutes'];
        $expiresAt = Utils::calculateExpirationDate($codeMinutes);
        $payload = json_encode(['action' => 'email_update']);

        if ($this->verificationCodeRepository->createCode($email, 'email_update', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendEmailUpdateCode($email, $this->sessionManager->get('user_name'), $code)) {
                return ['success' => true, 'message' => __('auth.code_resent'), 'elapsed' => 0];
            }
        }
        return ['success' => false, 'message' => __('error.email_delivery')];
    }

    public function verifyEmailCode($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');

        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_VERIFY_EMAIL_CODE . "_{$userId}", RateLimitConstants::MAX_10, RateLimitConstants::TIME_15);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.too_many_attempts')];
        }

        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => __('validation.missing_fields')];

        $verification = $this->verificationCodeRepository->findValidByCodeAndType($code, 'email_update');

        if ($verification && $verification['identifier'] === $this->sessionManager->get('user_email')) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_VERIFY_EMAIL_CODE . "_{$userId}");
            $this->verificationCodeRepository->deleteById($verification['id']);
            $codeMinutes = $this->config['verification_code_minutes'];
            $this->sessionManager->set('can_update_email_expires', time() + ($codeMinutes * 60));
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_REQ_EMAIL_CODE . "_{$userId}");
            return ['success' => true, 'message' => __('settings.identity_verified')];
        }
        
        return ['success' => false, 'message' => __('auth.invalid_or_expired_code')];
    }

    public function updateEmail($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_update_email_expires') || $this->sessionManager->get('can_update_email_expires') < time()) {
            return ['success' => false, 'message' => __('settings.identity_not_verified')];
        }
        
        $maxAttempts = $this->config['email_change_max_attempts'];
        $cooldownDays = $this->config['email_change_cooldown_days'];

        if (!$this->canChangeProfileData($userId, DB::LOG_CHANGE_EMAIL, $maxAttempts, $cooldownDays)) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => __('validation.invalid_email')];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $userId) {
            return ['success' => false, 'message' => __('validation.email_in_use')];
        }

        $oldEmail = $this->sessionManager->get('user_email', '');
        if ($this->userRepository->updateEmail($userId, $email)) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_EMAIL, json_encode(['email' => $oldEmail]), json_encode(['email' => $email]));
            $this->sessionManager->set('user_email', $email);
            $this->sessionManager->remove('can_update_email_expires');

            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['user_email'] = $email;
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }

            return ['success' => true, 'message' => __('settings.email_updated'), 'new_email' => $email];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function updatePreferences($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['prefs_update_rate_limit_attempts'];
        $minutes = $this->config['prefs_update_rate_limit_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_UPDATE_PREFS . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if ($key === 'purchase_preference') {
            if (!in_array($value, ['fast', 'verify'])) return ['success' => false, 'message' => __('validation.invalid_preference')];
            
            if ($value === 'fast') {
                $user = $this->userRepository->findById($userId);
                if (!$user || !Utils::verifyUserIdentity($user, $data)) {
                    return ['success' => false, 'message' => __('auth.incorrect_password')];
                }
            }

            if ($this->userRepository->updatePurchasePreference($userId, $value)) {
                $this->sessionManager->set('purchase_preference', $value);
                $accounts = $this->sessionManager->getLinkedAccounts();
                if (isset($accounts[$userId])) {
                    $accounts[$userId]['purchase_preference'] = $value;
                    if (!isset($accounts[$userId]['user_prefs']) || !is_array($accounts[$userId]['user_prefs'])) {
                        $accounts[$userId]['user_prefs'] = [];
                    }
                    $accounts[$userId]['user_prefs']['purchase_preference'] = $value;
                    $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                }
                return ['success' => true, 'message' => __('settings.preference_updated')];
            }
            return ['success' => false, 'message' => __('error.update_failed')];
        }

        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return ['success' => false, 'message' => __('validation.invalid_preference')];
        
        if ($key === 'language') {
            $availableLanguages = \App\Core\System\Translator::getAvailableLanguages();
            if (!array_key_exists($value, $availableLanguages)) {
                return ['success' => false, 'message' => __('validation.invalid_language')];
            }
        }
        
        if (in_array($key, ['open_links_new_tab', 'extended_alerts', 'allow_telemetry', 'accepted_store_terms', 'accepted_content_store_terms'])) {
            $value = ($value == 1) ? 1 : 0;
        }

        if ($this->userRepository->updatePreference($userId, $key, $value)) {
            $userPrefs = $this->sessionManager->get('user_prefs', []);
            $userPrefs[$key] = $value;
            $this->sessionManager->set('user_prefs', $userPrefs);

            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['user_prefs'][$key] = $value;
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }

            return ['success' => true, 'message' => __('settings.preference_updated')];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function setFlag($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        $flagKey = trim($data['flag_key'] ?? '');

        if (empty($flagKey) || strlen($flagKey) > 100) {
            return ['success' => false, 'message' => __('validation.invalid_input')];
        }

        if ($this->userRepository->setFlag($userId, $flagKey)) {
            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                if (!isset($accounts[$userId]['user_flags'])) {
                    $accounts[$userId]['user_flags'] = [];
                }
                if (!in_array($flagKey, $accounts[$userId]['user_flags'])) {
                    $accounts[$userId]['user_flags'][] = $flagKey;
                }
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }
            return ['success' => true, 'message' => __('settings.preference_updated')];
        }

        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function verifyCurrentPassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        
        $attempts = $this->config['security_verify_attempts'];
        $minutes = $this->config['security_verify_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_VERIFY_PASSWORD . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $user = $this->userRepository->findById($userId);
        if (!$user) return ['success' => false, 'message' => __('error.user_not_found')];

        if (Utils::verifyUserIdentity($user, $data)) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_VERIFY_PASSWORD . "_{$userId}");
            $codeMinutes = $this->config['verification_code_minutes'];
            $this->sessionManager->set('can_change_password_expires', time() + ($codeMinutes * 60));
            return ['success' => true, 'message' => __('settings.identity_verified')];
        }

        return ['success' => false, 'message' => __('auth.incorrect_password')];
    }

    public function updatePassword($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        if (!$this->sessionManager->has('can_change_password_expires') || $this->sessionManager->get('can_change_password_expires') < time()) {
            return ['success' => false, 'message' => __('settings.identity_not_verified')];
        }

        $attempts = $this->config['password_update_rate_limit_attempts'];
        $minutes = $this->config['password_update_rate_limit_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_UPDATE_PASSWORD . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $newPassword = trim($data['new_password'] ?? '');
        if ($newPassword !== trim($data['confirm_password'] ?? '')) return ['success' => false, 'message' => __('validation.passwords_do_not_match')];
        
        $pVal = Utils::validatePasswordFormat($newPassword, $this->config['min_password_length'], $this->config['max_password_length']);
        if (!$pVal['valid']) return ['success' => false, 'message' => __('validation.invalid_password_format')];

        if ($this->userRepository->updatePassword($userId, password_hash($newPassword, PASSWORD_BCRYPT))) {
            $this->logProfileChange($userId, DB::LOG_CHANGE_PASSWORD, json_encode(['security' => 'redacted']), json_encode(['security' => 'updated']));
            $this->sessionManager->remove('can_change_password_expires');
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_UPDATE_PASSWORD . "_{$userId}");
            
            Utils::invalidateUserSessions($this->sessionManager, $userId);

            $mailer = new Mailer();
            $mailer->sendPasswordChangeNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'));
            
            return ['success' => true, 'message' => __('settings.password_updated')];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function deleteAccount($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'];
        $minutes = $this->config['security_verify_minutes'];
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_SET_DELETE_ACCOUNT . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.too_many_attempts')];
        }

        $user = $this->userRepository->findById($userId);
        $identityValid = $user && Utils::verifyUserIdentity($user, $data);

        if ($user && $identityValid) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_SET_DELETE_ACCOUNT . "_{$userId}");

            $this->tokenRepository->deleteAllByUserId($userId);
            Utils::invalidateUserSessions($this->sessionManager, $userId, true);
            $this->sessionManager->removeAccount($userId);

            // Synchronous Instant Eradication across all DBs & Filesystem
            $deleted = $this->userRepository->deleteUserHard($userId);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                $redisClient = $redisCache->getClient();
                if ($redisClient) {
                    $payload = json_encode([
                        'user_id' => $userId,
                        'email' => $user['email'] ?? '',
                        'username' => $user['username'] ?? '',
                        'reason' => 'user_requested_deletion'
                    ]);
                    $redisClient->rpush(\App\Core\System\CacheConstants::QUEUE_ACCOUNT_DELETION, [$payload]);
                }
            } catch (\Throwable $e) {
                Logger::error("Failed pushing instant deletion to Redis queue", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }

            if ($deleted) {
                return ['success' => true, 'message' => __('settings.account_deleted_success')];
            } else {
                return ['success' => false, 'message' => __('error.update_failed')];
            }
        }
        
        return ['success' => false, 'message' => __('auth.incorrect_password')];
    }

    public function generate2faSetup()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];
        if ($this->sessionManager->has('user_2fa') && $this->sessionManager->get('user_2fa') != 0) {
            return ['success' => false, 'message' => __('settings.2fa_already_active')];
        }

        $userId = $this->sessionManager->get('user_id');
        $ga = new GoogleAuthenticator();

        if ($this->sessionManager->has('2fa_setup_secret') && !empty($this->sessionManager->get('2fa_setup_secret'))) {
            $secret = $this->sessionManager->get('2fa_setup_secret');
        } else {
            $secret = $ga->createSecret();
            $this->sessionManager->set('2fa_setup_secret', $secret);
        }

        $totpUrl = $ga->getQRCodeUrl('ProjectRosaura', $this->sessionManager->get('user_email'), $secret);

        $qrSvg = null;
        try {
            if (class_exists('\\chillerlan\\QRCode\\QRCode')) {
                $options = new \chillerlan\QRCode\QROptions([
                    'version'             => 5,
                    'outputInterface'     => \chillerlan\QRCode\Output\QRMarkupSVG::class,
                    'drawCircularModules' => true,
                    'circleRadius'        => 0.45,
                    'addQuietzone'        => false,
                    'svgAddXmlHeader'     => false,
                    'imageBase64'         => false,
                ]);
                $qrcode = new \chillerlan\QRCode\QRCode($options);
                $qrSvg = $qrcode->render($totpUrl);
            }
        } catch (\Throwable $e) {
            Logger::warning("QR code SVG rendering failed in generate2faSetup", ['user_id' => $userId, 'exception' => $e]);
        }

        return [
            'success' => true,
            'secret'  => $secret,
            'qr_url'  => $totpUrl,
            'qr_svg'  => $qrSvg
        ];
    }

    public function enable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'];
        $minutes = $this->config['security_verify_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_ENABLE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $code = trim($data['code'] ?? '');
        $secret = $this->sessionManager->get('2fa_setup_secret', '');

        if (empty($secret) || empty($code)) return ['success' => false, 'message' => __('validation.missing_fields')];

        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($secret, $code, 1)) {
            $codes = Utils::generateRecoveryCodes(10, 8);
            
            $hashedCodes = array_map(function($c) {
                return password_hash($c, PASSWORD_BCRYPT);
            }, $codes);

            if ($this->userRepository->update2FA($userId, $secret, 1, json_encode($hashedCodes))) {
                $this->sessionManager->set('user_2fa', 1);
                $this->sessionManager->remove('2fa_setup_secret');
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_ENABLE . "_{$userId}"); 

                $accounts = $this->sessionManager->getLinkedAccounts();
                if (isset($accounts[$userId])) {
                    $accounts[$userId]['user_2fa'] = 1;
                    $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                }

                $this->logProfileChange($userId, DB::LOG_CHANGE_2FA, json_encode(['status' => 'disabled']), json_encode(['status' => 'enabled']));
                
                $mailer = new Mailer();
                $mailer->send2FAStatusNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'), 'enabled');
                
                return ['success' => true, 'message' => __('settings.2fa_enabled'), 'recovery_codes' => $codes];
            }
        }

        return ['success' => false, 'message' => __('auth.incorrect_code')];
    }

    public function disable2fa($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'];
        $minutes = $this->config['security_verify_minutes'];
        
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_DISABLE . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.rate_limit_exceeded')];
        }

        $user = $this->userRepository->findById($userId);

        if ($user && Utils::verifyUserIdentity($user, $data)) {
            if ($this->userRepository->update2FA($userId, null, 0, null)) {
                $this->sessionManager->set('user_2fa', 0);
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_DISABLE . "_{$userId}");

                $accounts = $this->sessionManager->getLinkedAccounts();
                if (isset($accounts[$userId])) {
                    $accounts[$userId]['user_2fa'] = 0;
                    $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                }

                $this->logProfileChange($userId, DB::LOG_CHANGE_2FA, json_encode(['status' => 'enabled']), json_encode(['status' => 'disabled']));
                
                $mailer = new Mailer();
                $mailer->send2FAStatusNotification($this->sessionManager->get('user_email'), $this->sessionManager->get('user_name'), 'disabled');
                
                return ['success' => true, 'message' => __('settings.2fa_disabled')];
            }
        }

        return ['success' => false, 'message' => __('auth.incorrect_password')];
    }

    public function getDevices()
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
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
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        $tokenId = (int)($data['device_id'] ?? 0);
        
        $selectorToRevoke = $this->tokenRepository->findSelectorByIdAndUserId($tokenId, $userId);

        if ($this->tokenRepository->revokeDevice($tokenId, $userId)) {
            
            if ($selectorToRevoke) {
                Utils::invalidateUserSessions($this->sessionManager, $userId, false, $selectorToRevoke);
            }
            
            return ['success' => true, 'message' => __('settings.session_revoked')];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function revokeAllDevices($data = [])
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');
        $currentSelector = Utils::getCurrentDeviceSelector($userId);
        
        $type = $data['type'] ?? 'revoke_other';

        if ($type === 'revoke_all') {
            if ($this->tokenRepository->deleteAllByUserId($userId)) {
                
                Utils::invalidateUserSessions($this->sessionManager, $userId, true);
                
                $this->sessionManager->removeAccount($userId);

                $cookiePath = parse_url(APP_URL, PHP_URL_PATH) ?: '/';
                $isSecure = Utils::isSecureConnection();

                if (isset($_COOKIE['remember_tokens'])) {
                    setcookie('remember_tokens', '', ['expires' => time() - 3600, 'path' => $cookiePath, 'secure' => $isSecure, 'httponly' => true, 'samesite' => 'Strict']);
                    unset($_COOKIE['remember_tokens']);
                }
                
                if (isset($_COOKIE['remember_token'])) {
                    setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => $cookiePath, 'secure' => $isSecure, 'httponly' => true, 'samesite' => 'Strict']);
                    unset($_COOKIE['remember_token']);
                }
                return ['success' => true, 'message' => __('settings.all_sessions_revoked')];
            }
       } else {
            $devicesToRevoke = $this->tokenRepository->getActiveDevicesByUserId($userId);

            if ($this->tokenRepository->revokeOtherDevices($userId, $currentSelector)) {
                
                foreach ($devicesToRevoke as $device) {
                    if ($device['selector'] !== $currentSelector) {
                        Utils::invalidateUserSessions($this->sessionManager, $userId, false, $device['selector']);
                    }
                }
                
                return ['success' => true, 'message' => __('settings.other_sessions_revoked')];
            }
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function regenerateRecoveryCodes($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];

        $userId = $this->sessionManager->get('user_id');

        $attempts = $this->config['security_verify_attempts'];
        $minutes = $this->config['security_verify_minutes'];
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_2FA_REGEN_CODES . "_{$userId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => __('error.too_many_attempts')];
        }

        $user = $this->userRepository->findById($userId);

        if ($user) {
            if (Utils::verifyUserIdentity($user, $data)) {
                $this->rateLimiter->clear(RateLimitConstants::KEY_2FA_REGEN_CODES . "_{$userId}");

                $codes = Utils::generateRecoveryCodes(10, 8);
                
                $hashedCodes = array_map(function($c) {
                    return password_hash($c, PASSWORD_BCRYPT);
                }, $codes);
                
                if ($this->userRepository->updateRecoveryCodes($userId, json_encode($hashedCodes))) {
                    return ['success' => true, 'message' => __('settings.recovery_codes_regenerated'), 'recovery_codes' => $codes];
                }
            }
        }
        
        return ['success' => false, 'message' => __('auth.incorrect_password')];
    }

    public function linkGoogle($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];
        $userId = $this->sessionManager->get('user_id');

        $credential = $data['credential'] ?? null;
        if (empty($credential)) return ['success' => false, 'message' => __('validation.missing_fields')];

        $payload = \App\Core\Security\GoogleOAuthProvider::verifyToken($credential);
        if (!$payload || !isset($payload['sub'])) {
            return ['success' => false, 'message' => __('auth.invalid_or_expired_code')];
        }

        $googleId = $payload['sub'];
        $existingUser = $this->userRepository->findByGoogleId($googleId);

        if ($existingUser) {
            if ((int)$existingUser['id'] === (int)$userId) {
                return ['success' => true, 'message' => __('google_already_linked', [])];
            }
            return ['success' => false, 'message' => __('google_linked_other_user', [])];
        }

        if ($this->userRepository->updateGoogleId($userId, $googleId)) {
            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['google_id'] = $googleId;
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }
            $this->logProfileChange($userId, 'link_google', null, json_encode(['google_id' => $googleId]));
            return ['success' => true, 'message' => __('google_linked_success', [])];
        }

        return ['success' => false, 'message' => __('error.database')];
    }

    public function unlinkGoogle($data)
    {
        if (!$this->sessionManager->has('user_id')) return ['success' => false, 'message' => __('auth.session_expired')];
        $userId = $this->sessionManager->get('user_id');

        $user = $this->userRepository->findById($userId);
        if (!$user) return ['success' => false, 'message' => __('error.user_not_found')];

        if (empty($user['google_id'])) {
            return ['success' => false, 'message' => __('google_not_linked', [])];
        }

        $newPassword = trim($data['new_password'] ?? '');
        $confirmPassword = trim($data['confirm_password'] ?? '');

        if (!empty($newPassword)) {
            if ($newPassword !== $confirmPassword) {
                return ['success' => false, 'message' => __('validation.passwords_do_not_match')];
            }
            $minLen = (int)($this->config['min_password_length'] ?? 8);
            $maxLen = (int)($this->config['max_password_length'] ?? 100);
            $pVal = Utils::validatePasswordFormat($newPassword, $minLen, $maxLen);
            if (!$pVal['valid']) {
                return ['success' => false, 'message' => __('validation.invalid_password_format')];
            }
            $this->userRepository->updatePassword($userId, password_hash($newPassword, PASSWORD_BCRYPT));
        }

        if ($this->userRepository->updateGoogleId($userId, null)) {
            $accounts = $this->sessionManager->getLinkedAccounts();
            if (isset($accounts[$userId])) {
                $accounts[$userId]['google_id'] = null;
                $this->sessionManager->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }
            $this->logProfileChange($userId, 'unlink_google', json_encode(['google_id' => $user['google_id']]), null);
            return ['success' => true, 'message' => __('google_unlinked_success', [])];
        }

        return ['success' => false, 'message' => __('error.database')];
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
            $errorPayload = json_encode([
                'event' => 'profile_log_failure',
                'user_id' => $userId,
                'change_type' => $changeType
            ]);
            Logger::error("profile_update_error", ['details' => $errorPayload]);
        }
    }
}