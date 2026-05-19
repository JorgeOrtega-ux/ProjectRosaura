<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Helpers\Utils;
use App\Core\Mail\Mailer; 
use App\Core\Security\GoogleAuthenticator;
use App\Core\System\Logger;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface; 
use App\Core\Interfaces\RoleRepositoryInterface;
use App\Config\RedisCache;
use App\Core\System\RateLimitConstants;
use App\Core\System\SecurityConstants;
use App\Core\System\CacheConstants;
use App\Core\System\DatabaseConstants;
use App\Core\System\SessionConstants;

class AuthServices {
    private $rateLimiter;
    private $prefsManager;
    private $userRepository;
    private $sessionManager;
    private $tokenRepository;
    private $verificationCodeRepository;
    private $config; 
    private $roleRepository;
    private $telemetryServices; // NUEVO: Instancia de telemetría

    public function __construct(
        RateLimiterInterface $rateLimiter, 
        UserPrefsManagerInterface $prefsManager,
        UserRepositoryInterface $userRepository,
        SessionManagerInterface $sessionManager,
        TokenRepositoryInterface $tokenRepository,
        VerificationCodeRepositoryInterface $verificationCodeRepository,
        ServerConfigRepositoryInterface $configRepository,
        RoleRepositoryInterface $roleRepository,
        TelemetryServices $telemetryServices // NUEVO: Inyección del servicio
    ) {
        $this->rateLimiter = $rateLimiter;
        $this->prefsManager = $prefsManager;
        $this->userRepository = $userRepository;
        $this->sessionManager = $sessionManager;
        $this->tokenRepository = $tokenRepository;
        $this->verificationCodeRepository = $verificationCodeRepository;
        $this->config = $configRepository->getConfig(); 
        $this->roleRepository = $roleRepository;
        $this->telemetryServices = $telemetryServices; // NUEVO: Asignación
    }

    // NUEVO MÉTODO PRIVADO: Centraliza y abstrae la lectura segura de cookies remember para mitigar inflación DoS
    private function readRememberTokens(): array {
        $tokens = [];
        if (isset($_COOKIE['remember_tokens'])) {
            $parsed = json_decode($_COOKIE['remember_tokens'], true) ?: [];
            if (is_array($parsed)) {
                foreach ($parsed as $k => $v) {
                    if (is_string($v) && (is_numeric($k) || $k === 'legacy')) {
                        $tokens[$k] = $v;
                    }
                }
            }
        } elseif (isset($_COOKIE['remember_token'])) {
            $tokens['legacy'] = $_COOKIE['remember_token'];
        }
        return $tokens;
    }

    // NUEVO MÉTODO PRIVADO: Centraliza la persistencia estructurada y segura de cookies remember
    private function saveRememberTokens(array $tokens, int $days): void {
        if (count($tokens) > 5) {
            $tokens = array_slice($tokens, -5, 5, true);
        }
        
        $encodedTokens = json_encode($tokens);
        $isSecure = Utils::isSecureConnection();

        setcookie('remember_tokens', $encodedTokens, [
            'expires' => time() + (CacheConstants::TTL_ONE_DAY * $days),
            'path' => parse_url(APP_URL, PHP_URL_PATH) ?: '/',
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);

        $_COOKIE['remember_tokens'] = $encodedTokens;
    }

    public function isCurrentDeviceValid() {
        if (!$this->sessionManager->has(SessionConstants::KEY_ACTIVE_ACCOUNT)) return false;
        $userId = $this->sessionManager->get(SessionConstants::KEY_ACTIVE_ACCOUNT);
        
        // REFACTORIZADO: Uso del método centralizado del helper global para extraer el selector activo
        $selector = Utils::getCurrentDeviceSelector($userId);
        if (empty($selector)) return false;

        $token = $this->tokenRepository->findValidTokenBySelectorAndUserId($selector, $userId);
        return $token !== null;
    }

    public function createRememberToken($userId) {
        $selector = bin2hex(random_bytes(16));
        $validator = bin2hex(random_bytes(32));
        $hashedValidator = hash('sha256', $validator);
        
        $days = $this->config['remember_me_days'] ?? 30;
        $expiresAt = date('Y-m-d H:i:s', time() + (CacheConstants::TTL_ONE_DAY * $days));
        
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255);
        $ipAddress = substr(Utils::getIpAddress(), 0, 45);
        
        // --- MODIFICADO: Geolocalización diferida para evitar latencia y bloqueos síncronos ---
        $location = 'Unknown'; 
        
        if (!$this->tokenRepository->createToken($userId, $selector, $hashedValidator, $expiresAt, $userAgent, $ipAddress, $location)) {
             Logger::error("Failed to create remember token in database", ['user_id' => $userId]);
        }
        
        $cookieValue = $selector . ':' . $validator;
        
        // REFACTORIZADO: Uso de abstracciones de cookies para manipulación limpia
        $tokens = $this->readRememberTokens();
        $tokens[$userId] = $cookieValue;
        
        $this->saveRememberTokens($tokens, $days);
    }

    public function clearRememberToken($userId = null) {
        if ($userId === null) {
            $tokens = $this->readRememberTokens();
            // MITIGACIÓN DOS: Limitar estrictamente a 5 operaciones de base de datos
            $tokens = array_slice($tokens, 0, 5, true);
            foreach ($tokens as $tokenStr) {
                if (!is_string($tokenStr)) continue; 
                $parts = explode(':', $tokenStr);
                if (count($parts) === 2) $this->tokenRepository->deleteBySelector($parts[0]);
            }

            setcookie('remember_tokens', '', ['expires' => time() - 3600, 'path' => '/']);
            setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/']);
            
            unset($_COOKIE['remember_tokens']);
            unset($_COOKIE['remember_token']);
        } else {
            if (isset($_COOKIE['remember_tokens'])) {
                $tokens = json_decode($_COOKIE['remember_tokens'], true) ?: [];
                if (is_array($tokens) && isset($tokens[$userId]) && is_string($tokens[$userId])) { 
                    $parts = explode(':', $tokens[$userId]);
                    if (count($parts) === 2) $this->tokenRepository->deleteBySelector($parts[0]);
                    
                    unset($tokens[$userId]);
                    
                    // Filtrar basura antes de guardar de nuevo
                    $cleanTokens = [];
                    // MITIGACIÓN DOS: Evitar procesamiento de miles de nodos falsos
                    $tokens = array_slice($tokens, 0, 10, true); 
                    foreach ($tokens as $k => $v) {
                        if (is_string($v) && (is_numeric($k) || $k === 'legacy')) {
                            $cleanTokens[$k] = $v;
                        }
                    }

                    if (empty($cleanTokens)) {
                        setcookie('remember_tokens', '', ['expires' => time() - 3600, 'path' => '/']);
                        unset($_COOKIE['remember_tokens']);
                    } else {
                        $days = $this->config['remember_me_days'] ?? 30;
                        $encodedTokens = json_encode($cleanTokens);
                        $isSecure = Utils::isSecureConnection();
                        
                        setcookie('remember_tokens', $encodedTokens, [
                            'expires' => time() + (CacheConstants::TTL_ONE_DAY * $days), 'path' => '/', 'secure' => $isSecure, 'httponly' => true, 'samesite' => 'Strict'
                        ]);
                        $_COOKIE['remember_tokens'] = $encodedTokens;
                    }
                }
            }
        }
    }

    private function setAuthSession($user, bool $regenerate = true): bool {
        if (session_status() === PHP_SESSION_NONE) {
            $this->sessionManager->start();
        }
        
        if ($regenerate) {
            $this->sessionManager->regenerate(true);
        }
        
        $userPrefs = $this->prefsManager->ensureDefaultPreferences($user['id']);
        $permissions = $this->roleRepository->getMergedPermissionsForUser($user['id']);
        $assignedRolesIds = !empty($user['assigned_roles_ids']) ? array_map('intval', explode(',', $user['assigned_roles_ids'])) : [SecurityConstants::DEFAULT_USER_ROLE_ID];

        $userData = [
            'user_id' => $user['id'],
            'user_uuid' => $user['uuid'],
            'user_name' => $user['username'],
            'user_email' => $user['email'],
            'user_roles' => $assignedRolesIds,
            'user_role_weight' => $user['role_weight'] ?? 1,
            'user_role_name' => $user['role_name'] ?? SecurityConstants::DEFAULT_ROLE_NAME,
            'user_role_color' => $user['role_color'] ?? SecurityConstants::DEFAULT_ROLE_COLOR,
            'user_permissions' => $permissions,
            'user_pic' => $user['profile_picture'],
            'user_prefs' => $userPrefs,
            'user_2fa' => $user['two_factor_enabled'] ?? 0
        ];

        return $this->sessionManager->addAccount($user['id'], $userData);
    }

    public function switchAccount($data) {
        $targetUserId = (int)($data['user_id'] ?? 0);
        if ($targetUserId <= 0) return ['success' => false, 'message_key' => 'validation.missing_fields'];

        $redisCache = new RedisCache();
        $sessionId = session_id() ?: 'cli';
        $lockName = "session_pool_switch_sess_" . $sessionId;

        // REFACTORIZADO: Eliminado Boilerplate try-finally delegando el control a executeWithLock
        return $redisCache->executeWithLock($lockName, 3, function($lockToken) use ($targetUserId) {
            if ($this->sessionManager->switchActiveAccount($targetUserId)) {
                $user = $this->userRepository->findById($targetUserId);
                $this->telemetryServices->logAuthEvent([
                    'event_type' => 'switch_account_success',
                    'user_uuid' => $user ? $user['uuid'] : null,
                    'ip_address' => Utils::getIpAddress()
                ]);
                return ['success' => true, 'message_key' => 'auth.account_switched'];
            }
            $this->telemetryServices->logAuthEvent([
                'event_type' => 'switch_account_failed',
                'user_uuid' => null,
                'ip_address' => Utils::getIpAddress()
            ]);
            return ['success' => false, 'message_key' => 'auth.account_not_found'];
        });
    }

    public function autoLogin() {
        if ($this->sessionManager->isLoggedIn() && empty($_COOKIE['remember_tokens']) && empty($_COOKIE['remember_token'])) return false;
        
        // REFACTORIZADO: Extrae de forma masiva e i18n todos los selectores de cookies concurrentes desde el Helper global
        $selectors = Utils::getAllDeviceSelectors();

        if (empty($selectors) || count($selectors) > 10) {
            $this->clearRememberToken();
            return false;
        }

        // Reconstrucción controlada del mapa de validadores para hash_equals posterior
        $validators = [];
        $tokensMap = $this->readRememberTokens();
        foreach ($tokensMap as $cookieVal) {
            if (!is_string($cookieVal)) continue;
            $parts = explode(':', $cookieVal);
            if (count($parts) === 2) {
                $validators[$parts[0]] = $parts[1];
            }
        }

        $dbTokens = $this->tokenRepository->findValidTokensBySelectors($selectors);
        $loginSuccess = false;
        $needsRegeneration = false;
        $initialActiveId = $this->sessionManager->getActiveAccountId();

        $redisCache = new RedisCache();
        $lockName = "autologin_pool_" . md5(implode('|', $selectors));

        // REFACTORIZADO: Ejecución síncrona segura encapsulada mediante executeWithLock de RedisCache
        return $redisCache->executeWithLock($lockName, 5, function($lockToken) use ($dbTokens, $validators, &$loginSuccess, &$needsRegeneration, $initialActiveId) {
            foreach ($dbTokens as $token) {
                $selector = $token['selector'];
                $expectedValidator = $validators[$selector] ?? '';
                
                if (hash_equals($token['hashed_validator'], hash('sha256', $expectedValidator))) {
                    $user = $this->userRepository->findById($token['user_id']);

                    if ($user && empty($user['deletion_scheduled_at'])) {
                        if (isset($user['is_suspended']) && $user['is_suspended'] == 1) {
                            if ($user['suspension_type'] === DatabaseConstants::SUSPENSION_TEMP && $user['suspension_end_date'] && strtotime($user['suspension_end_date']) <= time()) {
                                $this->userRepository->liftSuspension($user['id']);
                                $user['is_suspended'] = 0;
                            } else {
                                $this->tokenRepository->deleteAllByUserId($user['id']);
                                continue;
                            }
                        }
                        
                        if ($this->setAuthSession($user, false)) {
                            $this->tokenRepository->deleteById($token['id']);
                            $this->createRememberToken($user['id']);
                            $loginSuccess = true;
                            $needsRegeneration = true;
                            
                            // Log Auto-login Exitoso
                            $this->telemetryServices->logAuthEvent([
                                'event_type' => 'auto_login_success',
                                'user_uuid' => $user['uuid'],
                                'ip_address' => Utils::getIpAddress()
                            ]);
                        } else {
                            continue;
                        }
                    } else {
                        $this->tokenRepository->deleteAllByUserId($token['user_id']);
                    }
                } else {
                    $this->tokenRepository->deleteAllByUserId($token['user_id']);
                }
            }
            
            if ($needsRegeneration) {
                $this->sessionManager->regenerate(true);
            }

            if ($loginSuccess && $initialActiveId) {
                $this->switchAccount(['user_id' => $initialActiveId]);
            }

            if (!$loginSuccess && !$this->sessionManager->isLoggedIn()) {
                $this->clearRememberToken();
                return false;
            }
            return $loginSuccess;
        });
    }

    public function registerStep1($data) {
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_REGISTER_STEP1 . "_{$email}", RateLimitConstants::MAX_10, RateLimitConstants::TIME_60, true); 
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];
        }

        $eVal = Utils::validateEmailFormat($email); 
        if (!$eVal['valid']) return ['success' => false, 'message_key' => 'validation.invalid_email'];
        
        if (!empty($this->config['allowed_email_domains'])) {
            $allowedDomainsRaw = $this->config['allowed_email_domains'];
            $allowedDomains = json_decode($allowedDomainsRaw, true);
            if (!is_array($allowedDomains)) {
                $allowedDomains = array_map('trim', explode(',', $allowedDomainsRaw));
            }
            $allowedDomains = array_filter($allowedDomains);
            
            if (!empty($allowedDomains)) {
                $emailParts = explode('@', $email);
                $domain = isset($emailParts[1]) ? '@' . strtolower($emailParts[1]) : '';
                $isAllowed = false;
                foreach ($allowedDomains as $allowed) {
                    $allowed = strtolower(trim($allowed));
                    if (strpos($allowed, '@') !== 0) $allowed = '@' . $allowed;
                    if ($domain === $allowed) { $isAllowed = true; break; }
                }
                if (!$isAllowed) return ['success' => false, 'message_key' => 'validation.domain_not_allowed'];
            }
        }

        $pVal = Utils::validatePasswordFormat($password, $this->config['min_password_length'], $this->config['max_password_length']); 
        if (!$pVal['valid']) return ['success' => false, 'message_key' => 'validation.invalid_password_format'];
        
        if ($this->userRepository->findByEmail($email)) {
            return ['success' => false, 'message_key' => 'validation.email_in_use'];
        }
        
        $regToken = bin2hex(random_bytes(16));
        $regFlows = $this->sessionManager->get(SessionConstants::KEY_REG_FLOWS, []);
        
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $regFlows[$regToken] = ['email' => $email, 'password' => $hashedPassword];
        
        $this->sessionManager->set(SessionConstants::KEY_REG_FLOWS, $regFlows);
        
        return ['success' => true, 'message_key' => 'auth.register_step1_success', 'reg_token' => $regToken];
    }

    public function registerStep2($data) {
        $regToken = $data['reg_token'] ?? '';
        $regFlows = $this->sessionManager->get(SessionConstants::KEY_REG_FLOWS, []);
        
        if (empty($regToken) || !isset($regFlows[$regToken])) {
            return ['success' => false, 'message_key' => 'auth.session_expired'];
        }

        $regEmail = $regFlows[$regToken]['email'];
        $regPassword = $regFlows[$regToken]['password']; 
        
        // REFACTORIZADO: Saneamiento estricto contra inyecciones XSS usando el helper global
        $username = Utils::sanitizeText($data['username'] ?? '');
        if (empty($username)) return ['success' => false, 'message_key' => 'validation.missing_fields'];

        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_REGISTER_STEP2 . "_{$regEmail}", RateLimitConstants::MAX_5, RateLimitConstants::TIME_60, true);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];
        
        $minUser = $this->config['min_username_length'];
        $maxUser = $this->config['max_username_length'];
        
        // REFACTORIZADO: Validación centralizada delegando la responsabilidad de longitud al Helper
        $userValidation = Utils::validateUsernameFormat($username, $minUser, $maxUser);
        if (!$userValidation['valid']) return ['success' => false, 'message_key' => $userValidation['message_key']];
        
        if ($this->userRepository->findByUsername($username)) return ['success' => false, 'message_key' => 'validation.username_in_use'];

        $code = Utils::generateNumericCode(12);
        $payload = json_encode(['email' => $regEmail, 'password' => $regPassword, 'username' => $username]);
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = Utils::calculateExpirationDate($codeMinutes); 

        if ($this->verificationCodeRepository->createCode($regEmail, DatabaseConstants::VERIFY_TYPE_ACTIVATION, $code, $payload, $expiresAt)) {
            $regFlows[$regToken]['username'] = $username;
            $this->sessionManager->set(SessionConstants::KEY_REG_FLOWS, $regFlows);
            
            $mailer = new Mailer();
            if ($mailer->sendVerificationCode($regEmail, $username, $code)) {
                return ['success' => true, 'message_key' => 'auth.verification_code_sent'];
            } else {
                return ['success' => false, 'message_key' => 'error.email_delivery'];
            }
        }
        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function registerResendCode($data) {
        $regToken = $data['reg_token'] ?? '';
        $regFlows = $this->sessionManager->get(SessionConstants::KEY_REG_FLOWS, []);
        
        if (empty($regToken) || !isset($regFlows[$regToken]) || !isset($regFlows[$regToken]['username'])) {
            return ['success' => false, 'message_key' => 'auth.session_expired'];
        }

        $email = $regFlows[$regToken]['email'];
        
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_RESEND_CODE . "_{$email}", RateLimitConstants::MAX_5, RateLimitConstants::TIME_60, true); 
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];
        
        $username = $regFlows[$regToken]['username'];
        $password = $regFlows[$regToken]['password']; 

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, DatabaseConstants::VERIFY_TYPE_ACTIVATION);
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message_key' => 'error.cooldown_active', 'cooldown' => $timeLeft];
        }

        $code = Utils::generateNumericCode(12);
        $payload = json_encode(['email' => $email, 'password' => $password, 'username' => $username]);
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = Utils::calculateExpirationDate($codeMinutes); 

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, DatabaseConstants::VERIFY_TYPE_ACTIVATION);

        if ($this->verificationCodeRepository->createCode($email, DatabaseConstants::VERIFY_TYPE_ACTIVATION, $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendVerificationCode($email, $username, $code)) {
                return ['success' => true, 'message_key' => 'auth.code_resent'];
            } else {
                return ['success' => false, 'message_key' => 'error.email_delivery'];
            }
        }
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function registerVerify($data) {
        $regToken = $data['reg_token'] ?? '';
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code) || empty($regToken)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        $regFlows = $this->sessionManager->get(SessionConstants::KEY_REG_FLOWS, []);
        if (!isset($regFlows[$regToken])) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $identifier = $regFlows[$regToken]['email'];
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_REGISTER_VERIFY . "_{$identifier}", RateLimitConstants::MAX_10, RateLimitConstants::TIME_15, true); 
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.too_many_attempts'];

        $verification = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($identifier, DatabaseConstants::VERIFY_TYPE_ACTIVATION);
        if (!$verification) return ['success' => false, 'message_key' => 'auth.invalid_or_expired_code'];
        if ($verification['code'] !== $code) return ['success' => false, 'message_key' => 'auth.incorrect_code'];

        $this->rateLimiter->clear(RateLimitConstants::KEY_AUTH_REGISTER_VERIFY . "_{$identifier}"); 
        $payload = json_decode($verification['payload'], true);
        $uuid = Utils::generateUUID();
        $profilePic = Utils::generateProfilePicture($payload['username'], $uuid);
        
        if (!$profilePic) return ['success' => false, 'message_key' => 'error.internal_server_error'];

        $defaultRoleId = $this->config['default_user_role_id'] ?? SecurityConstants::DEFAULT_USER_ROLE_ID;

        $newUserId = $this->userRepository->createUser([
            'uuid' => $uuid,
            'username' => $payload['username'],
            'email' => $payload['email'],
            'password' => $payload['password'], 
            'profile_picture' => $profilePic,
            'roles' => [$defaultRoleId]
        ]);

        if ($newUserId > 0) {
            $user = $this->userRepository->findById($newUserId);
            
            // Log de Registro Exitoso
            $this->telemetryServices->logAuthEvent([
                'event_type' => 'register_success',
                'user_uuid' => $user['uuid'],
                'ip_address' => Utils::getIpAddress()
            ]);
            
            $redisCache = new RedisCache();
            $lockName = "session_pool_reg_" . $newUserId;

            // REFACTORIZADO: Encapsulamiento del lock síncrono mediante callback aislado
            return $redisCache->executeWithLock($lockName, 5, function($lockToken) use ($user, $newUserId, &$regFlows, $regToken, $verification) {
                if (!$this->setAuthSession($user)) {
                    unset($regFlows[$regToken]);
                    $this->sessionManager->set(SessionConstants::KEY_REG_FLOWS, $regFlows);
                    $this->verificationCodeRepository->deleteById($verification['id']);
                    return ['success' => true, 'message_key' => 'auth.account_created_limit_reached'];
                }

                if (method_exists($this->sessionManager, 'restoreAccountInPool')) {
                    $this->sessionManager->restoreAccountInPool($newUserId);
                }

                $this->createRememberToken($newUserId);
                
                unset($regFlows[$regToken]);
                $this->sessionManager->set(SessionConstants::KEY_REG_FLOWS, $regFlows);
                $this->verificationCodeRepository->deleteById($verification['id']);

                return ['success' => true, 'message_key' => 'auth.account_created'];
            });
        }
        
        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function login($data) {
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message_key' => 'validation.missing_fields'];

        $attempts = $this->config['login_rate_limit_attempts'];
        $minutes = $this->config['login_rate_limit_minutes'];
        
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_LOGIN . "_{$email}", $attempts, $minutes, true);
        
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];

        $user = $this->userRepository->findByEmail($email);

        if ($user && password_verify($password, $user['password'])) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_AUTH_LOGIN . "_{$email}");
            
            if (!empty($user['deletion_scheduled_at'])) {
                if (strtotime($user['deletion_scheduled_at']) <= time()) {
                    $this->telemetryServices->logAuthEvent([
                        'event_type' => 'login_blocked_deleted',
                        'user_uuid' => $user['uuid'],
                        'ip_address' => Utils::getIpAddress()
                    ]);
                    return ['success' => false, 'status' => 'deleted', 'message_key' => 'auth.account_deleted'];
                }

                $tempToken = bin2hex(random_bytes(16));
                $pendingDeletion = $this->sessionManager->get(SessionConstants::KEY_PENDING_DELETION, []);
                $pendingDeletion[$tempToken] = $user['id'];
                $this->sessionManager->set(SessionConstants::KEY_PENDING_DELETION, $pendingDeletion);
                
                return [
                    'success' => false, 
                    'status' => 'pending_deletion', 
                    'requires_action' => 'cancel_deletion',
                    'temp_auth_token' => $tempToken, 
                    'scheduled_at' => $user['deletion_scheduled_at'],
                    'message_key' => 'auth.account_pending_deletion'
                ];
            }
            
            if (isset($user['is_suspended']) && $user['is_suspended'] == 1) {
                if ($user['suspension_type'] === DatabaseConstants::SUSPENSION_TEMP && $user['suspension_end_date'] && strtotime($user['suspension_end_date']) <= time()) {
                    $this->userRepository->liftSuspension($user['id']);
                    $user['is_suspended'] = 0;
                } else {
                    $this->telemetryServices->logAuthEvent([
                        'event_type' => 'login_blocked_suspended',
                        'user_uuid' => $user['uuid'],
                        'ip_address' => Utils::getIpAddress()
                    ]);
                    return ['success' => false, 'status' => 'suspended', 'message_key' => 'auth.account_suspended'];
                }
            }
            
            if (!empty($user['two_factor_enabled'])) {
                $tempToken = bin2hex(random_bytes(16));
                $pending2fa = $this->sessionManager->get(SessionConstants::KEY_PENDING_2FA, []);
                $pending2fa[$tempToken] = $user['id'];
                $this->sessionManager->set(SessionConstants::KEY_PENDING_2FA, $pending2fa);
                
                $this->telemetryServices->logAuthEvent([
                    'event_type' => 'login_pending_2fa',
                    'user_uuid' => $user['uuid'],
                    'ip_address' => Utils::getIpAddress()
                ]);
                
                return ['success' => true, 'requires_2fa' => true, 'temp_auth_token' => $tempToken, 'message_key' => 'auth.requires_2fa'];
            }

            $redisCache = new RedisCache();
            $lockName = "session_pool_login_" . $user['id'];

            // REFACTORIZADO: Abstracción try-finally con executeWithLock para automatizar el ciclo de vida del mutex
            return $redisCache->executeWithLock($lockName, 5, function($lockToken) use ($user) {
                if (!$this->setAuthSession($user)) {
                    $this->telemetryServices->logAuthEvent([
                        'event_type' => 'login_failed_max_sessions',
                        'user_uuid' => $user['uuid'],
                        'ip_address' => Utils::getIpAddress()
                    ]);
                    return ['success' => false, 'message_key' => 'auth.max_accounts_reached'];
                }
                
                if (method_exists($this->sessionManager, 'restoreAccountInPool')) {
                    $this->sessionManager->restoreAccountInPool($user['id']);
                }
                
                $this->createRememberToken($user['id']);
                
                $this->telemetryServices->logAuthEvent([
                    'event_type' => 'login_success',
                    'user_uuid' => $user['uuid'],
                    'ip_address' => Utils::getIpAddress()
                ]);
                
                return ['success' => true, 'requires_2fa' => false, 'message_key' => 'auth.login_success'];
            });
        }
        
        // Evento de Fallo de Autenticación
        $this->telemetryServices->logAuthEvent([
            'event_type' => 'login_failed',
            'user_uuid' => $user ? $user['uuid'] : null,
            'email_attempt' => $email, // Dato adicional opcional
            'ip_address' => Utils::getIpAddress()
        ]);
        
        return ['success' => false, 'message_key' => 'auth.incorrect_credentials'];
    }

    public function cancelAccountDeletion($data) {
        $tempToken = trim($data['temp_auth_token'] ?? '');
        $rememberDevice = !empty($data['remember_device']);
        if (empty($tempToken)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        $pendingDeletion = $this->sessionManager->get(SessionConstants::KEY_PENDING_DELETION, []);
        if (!isset($pendingDeletion[$tempToken])) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $pendingDeletion[$tempToken];
        $user = $this->userRepository->findById($userId);

        if (!$user) {
            return ['success' => false, 'message_key' => 'auth.invalid_account_status'];
        }

        if ($this->userRepository->cancelDeletion($userId)) {
            unset($pendingDeletion[$tempToken]);
            $this->sessionManager->set(SessionConstants::KEY_PENDING_DELETION, $pendingDeletion);
            
            $user['deletion_scheduled_at'] = null;

            if (method_exists($this->sessionManager, 'restoreAccountInPool')) {
                $this->sessionManager->restoreAccountInPool($userId);
            }

            $this->tokenRepository->deleteAllByUserId($userId);

            if (!empty($user['two_factor_enabled'])) {
                $token2fa = bin2hex(random_bytes(16));
                $pending2fa = $this->sessionManager->get(SessionConstants::KEY_PENDING_2FA, []);
                $pending2fa[$token2fa] = $user['id'];
                $this->sessionManager->set(SessionConstants::KEY_PENDING_2FA, $pending2fa);
                
                return ['success' => true, 'requires_2fa' => true, 'temp_auth_token' => $token2fa, 'message_key' => 'auth.requires_2fa'];
            }

            $redisCache = new RedisCache();
            $lockName = "session_pool_login_" . $user['id'];

            // REFACTORIZADO: Boilerplate try-finally extirpado mediante encapsulación funcional con candado mutex
            return $redisCache->executeWithLock($lockName, 5, function($lockToken) use ($user, $rememberDevice) {
                if (!$this->setAuthSession($user)) {
                    $this->telemetryServices->logAuthEvent([
                        'event_type' => 'cancel_deletion_failed_max_sessions',
                        'user_uuid' => $user['uuid'],
                        'ip_address' => Utils::getIpAddress()
                    ]);
                    return ['success' => false, 'message_key' => 'auth.max_accounts_reached'];
                }
                
                if ($rememberDevice) {
                    $this->createRememberToken($user['id']);
                }
                
                $this->telemetryServices->logAuthEvent([
                    'event_type' => 'cancel_deletion_success',
                    'user_uuid' => $user['uuid'],
                    'ip_address' => Utils::getIpAddress()
                ]);
                
                return ['success' => true, 'requires_2fa' => false, 'message_key' => 'auth.login_success'];
            });
        }

        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function loginVerify2FA($data) {
        $code = trim($data['code'] ?? '');
        $tempToken = trim($data['temp_auth_token'] ?? '');
        
        if (empty($code) || empty($tempToken)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        $pending2fa = $this->sessionManager->get(SessionConstants::KEY_PENDING_2FA, []);
        if (!isset($pending2fa[$tempToken])) return ['success' => false, 'message_key' => 'auth.session_expired'];

        $userId = $pending2fa[$tempToken];
        
        $attempts = $this->config['login_rate_limit_attempts'];
        $minutes = $this->config['login_rate_limit_minutes'];
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_LOGIN_2FA . "_{$userId}", $attempts, $minutes, true);
        
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];

        $user = $this->userRepository->findById($userId);

        if (!$user || empty($user['two_factor_enabled']) || !empty($user['deletion_scheduled_at']) || (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            return ['success' => false, 'message_key' => 'auth.invalid_account_status'];
        }

        $isValid = false;
        
        if (strlen($code) === 8) {
            $codes = json_decode($user['two_factor_recovery_codes'], true) ?: [];
            foreach ($codes as $index => $hashedCode) {
                if (password_verify($code, $hashedCode)) {
                    unset($codes[$index]);
                    $this->userRepository->updateRecoveryCodes($userId, json_encode(array_values($codes)));
                    $isValid = true;
                    break;
                }
            }
        } else {
            $ga = new GoogleAuthenticator();
            $isValid = $ga->verifyCode($user['two_factor_secret'], $code, 2);
        }

        if ($isValid) {
            $this->rateLimiter->clear(RateLimitConstants::KEY_AUTH_LOGIN_2FA . "_{$userId}");
            
            $redisCache = new RedisCache();
            $lockName = "session_pool_2fa_" . $user['id'];

            // REFACTORIZADO: Remoción de try-finally delegando el release del candado a executeWithLock
            return $redisCache->executeWithLock($lockName, 5, function($lockToken) use ($user, $tempToken, &$pending2fa) {
                if (!$this->setAuthSession($user)) {
                    unset($pending2fa[$tempToken]);
                    $this->sessionManager->set(SessionConstants::KEY_PENDING_2FA, $pending2fa);
                    return ['success' => false, 'message_key' => 'auth.max_accounts_reached'];
                }
                
                if (method_exists($this->sessionManager, 'restoreAccountInPool')) {
                    $this->sessionManager->restoreAccountInPool($user['id']);
                }
                
                unset($pending2fa[$tempToken]);
                $this->sessionManager->set(SessionConstants::KEY_PENDING_2FA, $pending2fa);
                $this->createRememberToken($user['id']);
                
                $this->telemetryServices->logAuthEvent([
                    'event_type' => '2fa_success',
                    'user_uuid' => $user['uuid'],
                    'ip_address' => Utils::getIpAddress()
                ]);
                
                return ['success' => true, 'message_key' => 'auth.login_success'];
            });
        }

        $this->telemetryServices->logAuthEvent([
            'event_type' => '2fa_failed',
            'user_uuid' => $user['uuid'],
            'ip_address' => Utils::getIpAddress()
        ]);
        
        return ['success' => false, 'message_key' => 'auth.incorrect_code'];
    }

    public function logout() {
        $activeUserId = $this->sessionManager->getActiveAccountId();
        $userUuid = null;
        
        if ($activeUserId) {
            $user = $this->userRepository->findById($activeUserId);
            $userUuid = $user ? $user['uuid'] : null;
            $this->clearRememberToken($activeUserId);
            $this->sessionManager->removeAccount($activeUserId);
        } else {
            $this->clearRememberToken();
            $this->sessionManager->destroy();
        }
        
        $this->telemetryServices->logAuthEvent([
            'event_type' => 'logout',
            'user_uuid' => $userUuid,
            'ip_address' => Utils::getIpAddress()
        ]);
        
        return ['success' => true, 'message_key' => 'auth.logout_success'];
    }

    public function logoutAll() {
        $activeUserId = $this->sessionManager->getActiveAccountId();
        $userUuid = null;
        
        if ($activeUserId) {
            $user = $this->userRepository->findById($activeUserId);
            $userUuid = $user ? $user['uuid'] : null;
        }
        
        $this->clearRememberToken(); 
        $this->sessionManager->destroy();
        
        $this->telemetryServices->logAuthEvent([
            'event_type' => 'logout_all',
            'user_uuid' => $userUuid,
            'ip_address' => Utils::getIpAddress()
        ]);
        
        return ['success' => true, 'message_key' => 'auth.logout_success'];
    }

    public function forgotPassword($data) {
        $email = trim($data['email'] ?? '');
        if (empty($email)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        $attempts = $this->config['forgot_password_rate_limit_attempts'];
        $minutes = $this->config['forgot_password_rate_limit_minutes'];
        
        // Se añade true (isCritical) al rate limiter
        $rateCheck = $this->rateLimiter->consume(RateLimitConstants::KEY_AUTH_FORGOT_PASSWORD . "_{$email}", $attempts, $minutes, true);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key'] ?? 'error.rate_limit_exceeded'];

        $user = $this->userRepository->findByEmail($email);

        if (!$user || !empty($user['deletion_scheduled_at']) || (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            return ['success' => false, 'message_key' => 'auth.account_unavailable'];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, DatabaseConstants::VERIFY_TYPE_PASSWORD);
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message_key' => 'error.cooldown_active', 'cooldown' => $timeLeft];
        }

        $token = bin2hex(random_bytes(32)); 
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = Utils::calculateExpirationDate($codeMinutes);
        
        $payload = json_encode(['email' => $email]);

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, DatabaseConstants::VERIFY_TYPE_PASSWORD);
        
        if ($this->verificationCodeRepository->createCode($email, DatabaseConstants::VERIFY_TYPE_PASSWORD, $token, $payload, $expiresAt)) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            
            $safeHost = \App\Core\Helpers\EnvLoader::get('APP_DOMAIN', 'localhost');
            $resetLink = $protocol . $safeHost . APP_URL . "/reset-password?token=" . $token;
            
            $mailer = new Mailer();
            if ($mailer->sendPasswordResetLink($email, $user['username'], $resetLink)) {
                
                $this->telemetryServices->logAuthEvent([
                    'event_type' => 'password_reset_request',
                    'user_uuid' => $user['uuid'],
                    'ip_address' => Utils::getIpAddress()
                ]);
                
                return ['success' => true, 'message_key' => 'auth.recovery_email_sent'];
            }
        }
        
        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

    public function resetPassword($data) {
        $token = trim($data['token'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($token) || empty($password)) return ['success' => false, 'message_key' => 'validation.missing_fields'];
        
        $passValidation = Utils::validatePasswordFormat($password, $this->config['min_password_length'], $this->config['max_password_length']);
        if (!$passValidation['valid']) return ['success' => false, 'message_key' => 'validation.invalid_password_format'];

        $verification = $this->verificationCodeRepository->findValidByCodeAndType($token, DatabaseConstants::VERIFY_TYPE_PASSWORD);

        if (!$verification) return ['success' => false, 'message_key' => 'auth.invalid_or_expired_token'];

        $email = $verification['identifier'];
        $user = $this->userRepository->findByEmail($email);
        
        if ($user && $this->userRepository->updatePassword($user['id'], password_hash($password, PASSWORD_BCRYPT))) {
            $this->tokenRepository->deleteAllByUserId($user['id']);
            $this->verificationCodeRepository->deleteByIdentifierAndType($email, DatabaseConstants::VERIFY_TYPE_PASSWORD);
            
            Utils::invalidateUserSessions($this->sessionManager, $user['id']);
            
            $mailer = new Mailer();
            $mailer->sendPasswordChangeNotification($email, $user['username']);
            
            $this->telemetryServices->logAuthEvent([
                'event_type' => 'password_reset_success',
                'user_uuid' => $user['uuid'],
                'ip_address' => Utils::getIpAddress()
            ]);
            
            return ['success' => true, 'message_key' => 'auth.password_reset_success'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }
}
?>