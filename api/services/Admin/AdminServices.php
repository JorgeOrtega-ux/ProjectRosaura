<?php

namespace App\Api\Services\Admin;

use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\Mail\Mailer;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\RoleRepositoryInterface;
use App\Core\Interfaces\ProfileLogRepositoryInterface;
use App\Core\Interfaces\TelemetryRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Database\CassandraManager;
use App\Core\System\DatabaseConstants as DB; 
use App\Core\System\SecurityConstants;
use App\Core\System\CacheConstants;
use App\Core\System\RateLimitConstants;
use App\Core\System\SessionConstants;
use App\Core\System\PermissionsConstants;
use App\Core\System\ModerationConstants;

class AdminServices {
    private $userRepository;
    private $moderationRepository;
    private $sessionManager;
    private $configRepository;
    private $config;
    private $prefsManager;
    private $tokenRepository;
    private $rateLimiter;
    private $roleRepository;
    private $profileLogRepository;
    private $telemetryRepository;
    private $dbManager;
    private $cassandraManager;

    public function __construct(
        UserRepositoryInterface $userRepository,
        ModerationRepositoryInterface $moderationRepository,
        SessionManagerInterface $sessionManager,
        ServerConfigRepositoryInterface $configRepository,
        UserPrefsManagerInterface $prefsManager,
        TokenRepositoryInterface $tokenRepository,
        RateLimiterInterface $rateLimiter,
        RoleRepositoryInterface $roleRepository,
        ProfileLogRepositoryInterface $profileLogRepository,
        TelemetryRepositoryInterface $telemetryRepository,
        DatabaseManager $dbManager,
        CassandraManager $cassandraManager
    ) {
        $this->userRepository = $userRepository;
        $this->moderationRepository = $moderationRepository;
        $this->sessionManager = $sessionManager;
        $this->configRepository = $configRepository;
        $this->config = $configRepository->getConfig();
        $this->prefsManager = $prefsManager;
        $this->tokenRepository = $tokenRepository;
        $this->rateLimiter = $rateLimiter;
        $this->roleRepository = $roleRepository;
        $this->profileLogRepository = $profileLogRepository;
        $this->telemetryRepository = $telemetryRepository;
        $this->dbManager = $dbManager;
        $this->cassandraManager = $cassandraManager;
    }

    private function hasPermission($permission) {
        $userPermissions = $this->sessionManager->get('user_permissions') ?? [];
        return in_array($permission, $userPermissions);
    }

    public function requirePermission($permission) {
        if (!$this->hasPermission($permission)) {
            throw new \Exception("Security Violation: Missing permission {$permission}");
        }
    }

    private function getRoleWeight($roleId) {
        $role = $this->roleRepository->findById($roleId);
        return $role ? (int)($role['weight'] ?? 0) : 0;
    }

    private function getCurrentAdminWeight() {
        return (int)($this->sessionManager->get('user_role_weight') ?? 0);
    }

    private function canEditUser($targetUser) {
        $currentUserId = $this->sessionManager->get('user_id');
        $currentWeight = $this->getCurrentAdminWeight();
        
        if ($currentUserId == $targetUser['id']) {
            return ['allowed' => false, 'message' => __('admin.cannot_edit_self')];
        }

        $highestTargetRole = $this->roleRepository->getHighestPriorityRole($targetUser['id']);
        $targetWeight = $highestTargetRole ? (int)$highestTargetRole['weight'] : 1;

        if ($targetWeight >= SecurityConstants::WEIGHT_SUPER_ADMIN && $currentUserId != 1) {
            Logger::warning("admin_privilege_escalation_blocked", [
                'admin_id' => $currentUserId,
                'target_user_id' => $targetUser['id']
            ]);
            return ['allowed' => false, 'message' => __('admin.insufficient_privileges')];
        }

        if ($currentWeight <= $targetWeight && $currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN) {
            Logger::warning("admin_insufficient_privileges", [
                'admin_id' => $currentUserId,
                'target_user_id' => $targetUser['id']
            ]);
            return ['allowed' => false, 'message' => __('admin.insufficient_privileges')];
        }

        return ['allowed' => true];
    }

    private function applyAdminRateLimit($action, $defaultAttempts, $defaultMinutes) {
        $attempts = $this->config[$action . '_attempts'] ?? $defaultAttempts;
        $minutes = $this->config[$action . '_minutes'] ?? $defaultMinutes;
        
        $currentUserId = $this->sessionManager->get('user_id');
        $actionKey = $action . '_admin';
        
        $rateCheck = $this->rateLimiter->consume("{$actionKey}_{$currentUserId}", $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            return ['allowed' => false, 'message' => __('error.rate_limit_exceeded')];
        }
        
        return ['allowed' => true];
    }

    private function verifyAdminSudoMode($passwordData): array {
        $currentUserId = $this->sessionManager->get('user_id');
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $adminData = $this->userRepository->findById($currentUserId);
        $payload = is_array($passwordData) ? $passwordData : ['password' => (string)$passwordData];
        if (!$adminData || !\App\Core\Helpers\Utils::verifyUserIdentity($adminData, $payload)) {
            $isGoogle = !empty($payload['credential']) || !empty($payload['google_token']);
            return ['success' => false, 'message' => $isGoogle ? __('auth.google_verification_failed') : __('auth.incorrect_password')];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}");
        return ['success' => true, 'admin_id' => $currentUserId];
    }

    private function dispatchBackupJob(string $type, array $modules, ?array $schema = null): array {
        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redis = $redisCache->getClient();

            if (!$redis) {
                return ['success' => false, 'message' => __('error.redis_communication')];
            }

            $lockAcquired = $redis->set(CacheConstants::PREFIX_LOCK_BACKUP, '1', 'EX', 1800, 'NX');
            if (!$lockAcquired) {
                return ['success' => false, 'message' => __('error.backup_in_progress')];
            }

            $jobId = Utils::generateUUID();
            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;
            $message = ($type === 'manual_custom') ? 'queued_custom_backup' : 'queued_modular_backup';

            $redis->hmset($jobKey, ['status' => \App\Core\System\StatusConstants::REQUEST_PENDING, 'message' => $message, 'created_at' => time()]);
            $redis->expire($jobKey, 3600);

            $payloadData = [
                'job_id' => $jobId, 
                'type' => $type, 
                'modules' => $modules,
                'requested_by' => $this->sessionManager->get('user_id')
            ];
            if ($schema !== null) {
                $payloadData['schema'] = $schema;
            }

            $redis->rpush(CacheConstants::QUEUE_BACKUP, [json_encode($payloadData)]);
            return ['success' => true, 'message' => __('admin.backup_queued'), 'job_id' => $jobId];
        } catch (\Exception $e) {
            Logger::error("dispatch_backup_job_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.redis_communication')];
        }
    }

    public function getUser($data) {
        if (!$this->hasPermission(PermissionsConstants::VIEW_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $userPrefs = $this->prefsManager->ensureDefaultPreferences($targetId);
        $assignedRoles = !empty($user['assigned_roles_ids']) ? array_map('intval', explode(',', $user['assigned_roles_ids'])) : [SecurityConstants::DEFAULT_USER_ROLE_ID];

        $isDeleted = 'active';

        return [
            'success' => true, 
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'profile_picture' => \App\Core\Helpers\Utils::getS3PublicUrl($user['profile_picture']),
                'roles' => $assignedRoles, 
                'role_name' => $user['role_name'] ?? SecurityConstants::DEFAULT_ROLE_NAME,
                'role_color' => $user['role_color'] ?? SecurityConstants::DEFAULT_ROLE_COLOR,
                'subscription_tier' => (int)($user['subscription_tier'] ?? 0),
                'subscription_color' => $user['subscription_color'] ?? SecurityConstants::DEFAULT_ROLE_COLOR,
                'user_status' => $isDeleted,
                'deleted_by' => $user['deleted_by'] ?? null,
                'deleted_reason' => $user['deleted_reason'] ?? null,
                'is_suspended' => $user['is_suspended'] ?? 0,
                'suspension_type' => $user['suspension_type'] ?? null,
                'suspension_reason' => $user['suspension_reason'] ?? null,
                'suspension_end_date' => $user['suspension_end_date'] ?? null,
                'deletion_scheduled_at' => $user['deletion_scheduled_at'] ?? null
            ],
            'preferences' => $userPrefs
        ];
    }

    public function getUserPurchases($data) {
        if (!$this->hasPermission(PermissionsConstants::VIEW_USER_PURCHASES)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }

        $targetUserUuid = $data['target_user_uuid'] ?? null;
        $targetUserId = (int)($data['target_user_id'] ?? 0);

        if (!$targetUserId && $targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
            if ($user) $targetUserId = (int)$user['id'];
        }

        if (!$targetUserId) {
            return ['success' => false, 'message' => __('admin.user_not_found')];
        }

        global $container;
        if (isset($container) && $container instanceof \App\Core\Container) {
            $stripeServices = $container->get(\App\Api\Services\Stripe\StripeServices::class);
            $history = $stripeServices->getPaymentHistoryForUser($targetUserId, ['limit' => 100, 'offset' => 0]);
            return ['success' => true, 'data' => $history];
        }

        return ['success' => false, 'message' => __('err_general')];
    }

    public function getUserCoinTransactions($data) {
        if (!$this->hasPermission(PermissionsConstants::VIEW_USER_PURCHASES)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }

        $targetUserUuid = $data['target_user_uuid'] ?? null;
        $targetUserId = (int)($data['target_user_id'] ?? 0);

        if (!$targetUserId && $targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
            if ($user) $targetUserId = (int)$user['id'];
        }

        if (!$targetUserId) {
            return ['success' => false, 'message' => __('admin.user_not_found')];
        }

        global $container;
        if (isset($container) && $container instanceof \App\Core\Container) {
            $storeRepo = $container->get(\App\Core\Interfaces\StoreRepositoryInterface::class);
            $limit = isset($data['limit']) ? (int)$data['limit'] : 100;
            $offset = isset($data['offset']) ? (int)$data['offset'] : 0;
            $history = $storeRepo->getCoinTransactionsHistory($targetUserId, $limit, $offset);
            return ['success' => true, 'data' => $history];
        }

        return ['success' => false, 'message' => __('err_general')];
    }

    public function updateAvatar($data) {
        if (!$this->hasPermission(PermissionsConstants::EDIT_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_AVATAR, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar'])) {
            return ['success' => false, 'message' => __('upload.error')];
        }
        
        $file = $files['avatar'];
        $maxSizeMb = $this->config['max_avatar_size_mb'] ?? 2;

        $uploadDir = 'profilePictures/uploaded/';

        $uploadResult = Utils::uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb);

        if ($uploadResult['success']) {
            $fileName = $uploadResult['file_name'];
            
            Utils::deleteOldAvatar($user['profile_picture']);

            $newRelPath = 'profilePictures/uploaded/' . $fileName;

            if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
                $currentUserId = $this->sessionManager->get('user_id');
                $logPayload = json_encode(['event' => 'admin_override_avatar', 'target_user' => $targetId, 'admin_user' => $currentUserId]);
                $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_PROFILE_AVATAR, $logPayload, null);
                return ['success' => true, 'message' => __('admin.avatar_updated'), 'new_avatar' => \App\Core\Helpers\Utils::getS3PublicUrl($newRelPath)];
            }
        } else {
            return ['success' => false, 'message' => __($uploadResult['message_key'])];
        }

        return ['success' => false, 'message' => __('error.internal_server_error')];
    }

    public function deleteAvatar($data) {
        if (!$this->hasPermission(PermissionsConstants::EDIT_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_AVATAR, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $oldPic = $user['profile_picture'];
        if (Utils::isDefaultAvatar($oldPic)) return ['success' => false, 'message' => __('admin.avatar_already_default')];

        Utils::deleteOldAvatar($oldPic);

        $newRelPath = Utils::generateProfilePicture($user['username'], $user['email']);
        if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
            $currentUserId = $this->sessionManager->get('user_id');
            $logPayload = json_encode(['event' => 'admin_delete_avatar', 'target_user' => $targetId, 'admin_user' => $currentUserId]);
            $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_PROFILE_AVATAR, $logPayload, null);
            return ['success' => true, 'message' => __('admin.avatar_deleted'), 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
        }
        return ['success' => false, 'message' => __('error.database')];
    }

    public function updateUsername($data) {
        if (!$this->hasPermission(PermissionsConstants::EDIT_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_USERNAME, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $username = Utils::sanitizeText($data['username'] ?? '');
        if (empty($username)) return ['success' => false, 'message' => __('validation.missing_fields')];
        $minLen = (int)($this->config['min_username_length'] ?? 3);
        $maxLen = (int)($this->config['max_username_length'] ?? 32);
        
        $userValidation = Utils::validateUsernameFormat($username, $minLen, $maxLen);
        if (!$userValidation['valid']) {
            return ['success' => false, 'message' => __($userValidation['message_key'])];
        }

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message' => __('validation.username_in_use')];

        $oldUsername = $user['username'];
        if ($this->userRepository->updateUsername($targetId, $username)) {
            $logPayload = json_encode(['event' => 'admin_update_username', 'old_username' => $oldUsername, 'new_username' => $username, 'admin_user' => $currentUserId]);
            $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_PROFILE_USERNAME, $logPayload, null);

            // Regenerar avatar por defecto si tiene uno para que se actualice la inicial
            if (empty($user['profile_picture']) || strpos($user['profile_picture'], '/avatar/') !== false) {
                $newAvatar = Utils::generateProfilePicture($username, $user['email']);
                $this->userRepository->updateAvatar($targetId, $newAvatar);
            }

            return ['success' => true, 'message' => __('admin.username_updated'), 'new_username' => $username];
        }
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function updateEmail($data) {
        if (!$this->hasPermission(PermissionsConstants::EDIT_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_EMAIL, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message' => __('validation.invalid_email')];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message' => __('validation.email_in_use')];

        $oldEmail = $user['email'];
        if ($this->userRepository->updateEmail($targetId, $email)) {
            $logPayload = json_encode(['event' => 'admin_update_email', 'old_email' => $oldEmail, 'new_email' => $email, 'admin_user' => $currentUserId]);
            $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_PROFILE_EMAIL, $logPayload, null);
            
            $mailer = new Mailer();
            $mailer->sendSecurityAlertEmailChanged($oldEmail, $user['username'], $email);

            return ['success' => true, 'message' => __('admin.email_updated'), 'new_email' => $email];
        }
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function updatePreference($data) {
        if (!$this->hasPermission(PermissionsConstants::EDIT_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_PREFS, 50, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return ['success' => false, 'message' => __('validation.invalid_preference')];
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        if ($this->userRepository->updatePreference($targetId, $key, $value)) {
            $currentUserId = $this->sessionManager->get('user_id');
            $valStr = is_bool($value) ? ($value ? 'true' : 'false') : (string)$value;
            $logPayload = json_encode(['event' => 'admin_update_preference', 'key' => $key, 'new_value' => $valStr, 'admin_user' => $currentUserId]);
            $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_PROFILE_PREFERENCES, $logPayload, null);
            return ['success' => true, 'message' => __('admin.preference_updated')];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function updateRoles($data) {
        if (!$this->hasPermission(PermissionsConstants::ASSIGN_ROLES)) return ['success' => false, 'message' => __('error.unauthorized')];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $rolesIds = $data['roles'] ?? [];

        if (!is_array($rolesIds) || empty($rolesIds)) return ['success' => false, 'message' => __('validation.invalid_role')];

        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 10, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        foreach ($rolesIds as $rId) {
            $r = $this->roleRepository->findById((int)$rId);
            if ($r && (int)$r['weight'] >= SecurityConstants::WEIGHT_SUPER_ADMIN && $currentUserId != 1) {
                return ['success' => false, 'message' => __('admin.hierarchical_restriction')];
            }
        }

        $currentWeight = $this->getCurrentAdminWeight();

        try {
            if ($this->roleRepository->syncUserRoles($targetId, $rolesIds, $currentWeight)) {
                Logger::info("admin_update_user_roles", ['admin_id' => $currentUserId, 'target_user_id' => $targetId, 'new_roles' => $rolesIds]);
                $logPayload = json_encode(['event' => 'admin_update_roles', 'new_roles' => $rolesIds, 'admin_user' => $currentUserId]);
                $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_ROLE_CHANGED, $logPayload, null, null);
                
                Utils::invalidateUserSessions($this->sessionManager, $targetId);
                
                return ['success' => true, 'message' => __('admin.role_updated')];
            }
        } catch (\Exception $e) {
            Logger::error("update_roles_failed", ["exception" => $e->getMessage()]);
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message' => __('admin.hierarchical_restriction')];
            }
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function deleteUsers($data) {
        if (!$this->hasPermission(PermissionsConstants::DELETE_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];

        $userIds = $data['user_ids'] ?? [];
        
        if (!is_array($userIds) || empty($userIds)) {
            return ['success' => false, 'message' => __('validation.invalid_data')];
        }

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_DELETE_USER, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $deletedReason = 'account_deleted_by_admin';
        $successCount = 0;
        $failedCount = 0;

        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redisClient = $redisCache->getClient();

            if (!$redisClient) {
                return ['success' => false, 'message' => __('error.redis_communication')];
            }

            foreach ($userIds as $targetId) {
                $targetId = (int)$targetId;
                $user = $this->userRepository->findById($targetId);
                
                if (!$user) {
                    $failedCount++;
                    continue;
                }

                $authCheck = $this->canEditUser($user);
                if (!$authCheck['allowed']) {
                    $failedCount++;
                    continue;
                }

                Utils::invalidateUserSessions($this->sessionManager, $targetId, true);
                $this->tokenRepository->deleteAllByUserId($targetId);

                $this->userRepository->deleteUserHard($targetId);

                $payload = json_encode([
                    'user_id' => $targetId,
                    'email' => $user['email'],
                    'username' => $user['username'],
                    'reason' => $deletedReason
                ]);
                if ($redisClient) {
                    $redisClient->rpush(CacheConstants::QUEUE_ACCOUNT_DELETION, [$payload]);
                }
                
                $logPayload = json_encode(['event' => 'admin_bulk_delete_user', 'admin_user' => $currentUserId]);
                $this->moderationRepository->logAction($targetId, $currentUserId, ModerationConstants::ACTION_DELETED, $logPayload, null, null);
                
                $successCount++;
            }

            if ($successCount === 0) {
                 return ['success' => false, 'message' => __('admin.no_users_deleted'), 'deleted_count' => 0, 'failed_count' => $failedCount];
            }

            return [
                'success' => true, 
                'message' => __('admin.account_deleted'),
                'deleted_count' => $successCount,
                'failed_count' => $failedCount
            ];
        } catch (\Exception $e) {
            Logger::error("redis_communication_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.redis_communication')];
        }
    }

    public function updateSuspension($data) {
        if (!$this->hasPermission(PermissionsConstants::MODERATE_USERS)) return ['success' => false, 'message' => __('error.unauthorized')];

        $targetId = (int)($data['target_user_id'] ?? 0);
        
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_STATUS, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $dbIsSuspended = (isset($data['is_suspended']) && $data['is_suspended'] == 1) ? 1 : 0;
        $dbSuspensionType = null;
        $dbSuspensionReason = null;
        $dbEndDate = null;
        $notifyUser = (isset($data['notify_user']) && $data['notify_user'] == true);

        if ($dbIsSuspended === 1) {
            $dbSuspensionType = ($data['suspension_type'] === DB::SUSPENSION_TEMP) ? DB::SUSPENSION_TEMP : DB::SUSPENSION_PERM;
            $rawSuspensionReason = $data['suspension_reason'] ?? null;
            $dbSuspensionReason = Utils::sanitizeText($rawSuspensionReason);

            $validReasons = array_column(Utils::getSanctionReasons()['suspensions'], 'key');
            if (!in_array($dbSuspensionReason, $validReasons)) {
                return ['success' => false, 'message' => __('validation.invalid_reason')];
            }
            
            if ($dbSuspensionType === DB::SUSPENSION_TEMP && !empty($data['end_date'])) {
                $format = 'Y-m-d H:i:s';
                $d = \DateTime::createFromFormat($format, $data['end_date']);
                if (!$d || $d->format($format) !== $data['end_date']) return ['success' => false, 'message' => __('validation.invalid_date')];
                if ($d->getTimestamp() <= time()) return ['success' => false, 'message' => __('validation.date_in_past')];
                $dbEndDate = $data['end_date'];
            }
        }

        $actionType = 'note_updated';
        $logReason = null;
        
        if ($dbIsSuspended === 1 && (!isset($user['is_suspended']) || $user['is_suspended'] != 1)) {
            $actionType = ModerationConstants::ACTION_SUSPENDED;
            $logReason = $dbSuspensionReason;
        } elseif ($dbIsSuspended === 0 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            $actionType = ModerationConstants::ACTION_UNSUSPENDED;
        } elseif ($dbIsSuspended === 1 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            if ($dbSuspensionReason !== $user['suspension_reason'] || $dbEndDate !== $user['suspension_end_date']) {
                 $actionType = ModerationConstants::ACTION_SUSPENDED; 
                 $logReason = $dbSuspensionReason;
            }
        }

        if ($this->moderationRepository->updateStatus($targetId, 'active', null, null, $dbIsSuspended, $dbSuspensionType, $dbSuspensionReason, $dbEndDate, null)) {
            $this->userRepository->invalidateProfileCache($targetId, $user['uuid'] ?? null);
            if ($actionType !== 'note_updated') {
                $logPayload = json_encode(['event' => 'admin_update_suspension', 'action' => $actionType, 'reason' => $logReason, 'admin_user' => $currentUserId]);
                $this->moderationRepository->logAction($targetId, $currentUserId, $actionType, $logPayload, $dbEndDate, null);
            }
            if ($dbIsSuspended === 1) {
                $this->tokenRepository->deleteAllByUserId($targetId);
                
                Utils::invalidateUserSessions($this->sessionManager, $targetId, true);
            }
            return ['success' => true, 'message' => __('admin.status_updated')];
        }
        
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function getModerationKardex($data) {
        if (!$this->hasPermission(PermissionsConstants::VIEW_KARDEX)) return ['success' => false, 'message' => __('error.unauthorized')];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $page = max(1, (int)($data['page'] ?? 1));
        $limit = max(1, (int)($data['limit'] ?? 10));
        $offset = ($page - 1) * $limit;

        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message' => __('admin.user_not_found')];

        $paginatedLogs = $this->moderationRepository->getUnifiedKardex($targetId, $limit, $offset);
        $totalItems = $this->moderationRepository->countUnifiedKardex($targetId);
        $totalPages = ceil($totalItems / $limit);

        return [
            'success' => true, 
            'data' => $paginatedLogs,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => $totalPages > 0 ? $totalPages : 1
            ]
        ];
    }

    private function validateAndFormatRoleColor($data) {
        $type = $data['color_type'] ?? 'solid';
        $angle = (int)($data['angle'] ?? 0);
        $rawColors = $data['colors'] ?? [];

        if ($angle < 0) $angle = 0;
        if ($angle > 360) $angle = 360;

        if (!in_array($type, ['solid', 'gradient'])) {
            return ['valid' => false, 'message' => __('validation.invalid_color_type')];
        }

        if (!is_array($rawColors) || empty($rawColors)) {
            return ['valid' => false, 'message' => __('validation.invalid_color') . ' (DEBUG1: rawColors is empty or not array)'];
        }

        $validColors = [];
        $totalPercentage = 0;
        $maxColors = 12;
        $count = 0;

        foreach ($rawColors as $c) {
            if ($count >= $maxColors) break;

            if (is_array($c)) {
                $hex = trim($c['hex'] ?? '');
                $percentage = (int)($c['percentage'] ?? ($c['stop'] ?? 0));
                
                if ($percentage < 0) $percentage = 0;
                if ($percentage > 100) $percentage = 100;

                if (preg_match('/^#[a-fA-F0-9]{6}$/', $hex)) {
                    $validColors[] = ['hex' => $hex, 'percentage' => $percentage];
                    $totalPercentage += $percentage;
                    $count++;
                }
            }
        }

        if (empty($validColors)) {
            return ['valid' => false, 'message' => __('validation.invalid_color') . ' (DEBUG: ' . json_encode($rawColors) . ')'];
        }

        if ($type === 'solid') {
            $validColors = [['hex' => $validColors[0]['hex'], 'percentage' => 100]]; 
        } elseif ($type === 'gradient') {
            if (count($validColors) < 2) {
                return ['valid' => false, 'message' => __('validation.gradient_requires_multiple_colors')];
            }
            if ($totalPercentage !== 100) {
                return ['valid' => false, 'message' => __('validation.invalid_percentage_sum')];
            }
        }

        $colorJson = json_encode(['type' => $type, 'angle' => $angle, 'colors' => $validColors]);
        return ['valid' => true, 'color_string' => $colorJson];
    }

    public function saveSubscription($data) {
        if (!$this->hasPermission(PermissionsConstants::ACCESS_ADMIN_PANEL)) return ['success' => false, 'message' => __('error.unauthorized')];
        $uuid = Utils::sanitizeText($data['uuid'] ?? '');
        $name = Utils::sanitizeText($data['name'] ?? '');
        $tier_level = (int)($data['tier_level'] ?? 1);
        $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
        $stripeMonthly = Utils::sanitizeText($data['stripe_price_id_monthly'] ?? '');
        $stripeYearly = Utils::sanitizeText($data['stripe_price_id_yearly'] ?? '');

        // Validation
        if (empty($name)) return ['success' => false, 'message' => 'Nombre requerido'];
        
        $colorData = $data['color'] ?? [];
        if (is_array($colorData)) {
            $colorValidation = $this->validateAndFormatRoleColor($colorData);
            if (!$colorValidation['valid']) {
                return ['success' => false, 'message' => $colorValidation['message']];
            }
            $colorString = $colorValidation['color_string'];
        } else {
            $colorString = $colorData;
        }

        $featuresData = $data['features'] ?? [];
        $priceMonthly = (float)($featuresData['price_monthly'] ?? 0);
        $priceYearly = (float)($featuresData['price_yearly'] ?? 0);
        
        $limits = $featuresData['limits'] ?? [];
        $maxCanvases = (int)($limits['max_canvases'] ?? 1);
        $maxStorageMb = (int)($limits['max_storage_mb'] ?? 20);
        $maxUploadMb = (int)($limits['max_upload_mb'] ?? 10);
        $maxSnapshots = (int)($limits['max_snapshots_per_canvas'] ?? 10);
        $maxMembers = (int)($limits['max_members_per_canvas'] ?? 10);
        $maxCustomPalettes = (int)($limits['max_custom_palettes'] ?? 0);
        $maxTemplateTokens = (int)($limits['max_template_tokens'] ?? 0);
        $maxPixelsPerBatch = (int)($limits['max_pixels_per_batch'] ?? 5);
        
        $featAdvancedRoles = empty($featuresData['feat_advanced_roles']) ? 0 : 1;
        $featChatRestriction = empty($featuresData['feat_chat_restriction']) ? 0 : 1;
        $featCustomPalettes = empty($featuresData['feat_custom_palettes']) ? 0 : 1;
        $featPriorityRendering = empty($featuresData['feat_priority_rendering']) ? 0 : 1;
        $featUnlimitedExports = empty($featuresData['feat_unlimited_exports']) ? 0 : 1;
        $featBetaAccess = empty($featuresData['feat_beta_access']) ? 0 : 1;
        $featInjectTemplates = empty($featuresData['feat_inject_templates']) ? 0 : 1;

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            
            if (!empty($uuid)) {
                // Update
                $stmt = $pdo->prepare("UPDATE subscription_tiers SET name = ?, tier_level = ?, is_active = ?, color = ?, stripe_price_id_monthly = ?, stripe_price_id_yearly = ?, price_monthly = ?, price_yearly = ?, max_canvases = ?, max_storage_mb = ?, max_snapshots_per_canvas = ?, max_members_per_canvas = ?, max_custom_palettes = ?, feat_advanced_roles = ?, feat_chat_restriction = ?, feat_custom_palettes = ?, feat_priority_rendering = ?, feat_unlimited_exports = ?, feat_beta_access = ?, feat_inject_templates = ?, max_template_tokens = ?, max_upload_mb = ?, max_pixels_per_batch = ? WHERE uuid = ?");
                $stmt->execute([$name, $tier_level, $is_active, $colorString, $stripeMonthly, $stripeYearly, $priceMonthly, $priceYearly, $maxCanvases, $maxStorageMb, $maxSnapshots, $maxMembers, $maxCustomPalettes, $featAdvancedRoles, $featChatRestriction, $featCustomPalettes, $featPriorityRendering, $featUnlimitedExports, $featBetaAccess, $featInjectTemplates, $maxTemplateTokens, $maxUploadMb, $maxPixelsPerBatch, $uuid]);

                try {
                    $redisCache = new \App\Config\Database\RedisCache();
                    $redis = $redisCache->getClient();
                    $invalidator = new \App\Core\System\CacheInvalidator($redis);
                    $invalidator->allUsers();
                    $invalidator->subscriptionTiers();
                } catch (\Throwable $t) {}

                return ['success' => true, 'message' => __('admin.subscription_updated')];
            } else {
                // Insert
                $uuid = \App\Core\Helpers\Utils::generateUUID();
                $stmt = $pdo->prepare("INSERT INTO subscription_tiers (uuid, name, tier_level, is_active, color, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly, max_canvases, max_storage_mb, max_snapshots_per_canvas, max_members_per_canvas, max_custom_palettes, feat_advanced_roles, feat_chat_restriction, feat_custom_palettes, feat_priority_rendering, feat_unlimited_exports, feat_beta_access, feat_inject_templates, max_template_tokens, max_upload_mb, max_pixels_per_batch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$name, $tier_level, $is_active, $colorString, $stripeMonthly, $stripeYearly, $priceMonthly, $priceYearly, $maxCanvases, $maxStorageMb, $maxSnapshots, $maxMembers, $maxCustomPalettes, $featAdvancedRoles, $featChatRestriction, $featCustomPalettes, $featPriorityRendering, $featUnlimitedExports, $featBetaAccess, $featInjectTemplates, $maxTemplateTokens, $maxUploadMb, $maxPixelsPerBatch]);
                
                try {
                    $redisCache = new \App\Config\Database\RedisCache();
                    $redis = $redisCache->getClient();
                    $invalidator = new \App\Core\System\CacheInvalidator($redis);
                    $invalidator->allUsers();
                    $invalidator->subscriptionTiers();
                } catch (\Throwable $t) {}

                return ['success' => true, 'message' => __('admin.subscription_created'), 'data' => ['uuid' => $uuid]];
            }
        } catch (\PDOException $e) {
            Logger::error("saveSubscription Error", ['exception' => $e]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function toggleSubscriptionVisibility($data) {
        if (!$this->hasPermission(PermissionsConstants::ACCESS_ADMIN_PANEL)) return ['success' => false, 'message' => __('error.unauthorized')];
        $uuid = Utils::sanitizeText($data['uuid'] ?? '');
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID requerido'];

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $pdo->prepare("UPDATE subscription_tiers SET is_active = NOT is_active WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->subscriptionTiers();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => 'Visibilidad actualizada'];
        } catch (\PDOException $e) {
            Logger::error("toggleSubscriptionVisibility Error", ['exception' => $e]);
            return ['success' => false, 'message' => 'Error de base de datos'];
        }
    }

    public function setSubscriptionPopular($data) {
        if (!$this->hasPermission(PermissionsConstants::ACCESS_ADMIN_PANEL)) return ['success' => false, 'message' => __('error.unauthorized')];
        $uuid = Utils::sanitizeText($data['uuid'] ?? '');
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID requerido'];

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $pdo->beginTransaction();
            // Reset all to 0
            $pdo->query("UPDATE subscription_tiers SET is_popular = 0");
            // Set selected to 1
            $stmt = $pdo->prepare("UPDATE subscription_tiers SET is_popular = 1 WHERE uuid = ?");
            $stmt->execute([$uuid]);
            $pdo->commit();

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->subscriptionTiers();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => 'Popularidad actualizada'];
        } catch (\PDOException $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error("setSubscriptionPopular Error", ['exception' => $e]);
            return ['success' => false, 'message' => 'Error de base de datos'];
        }
    }

    public function deleteSubscription($data) {
        if (!$this->hasPermission(PermissionsConstants::ACCESS_ADMIN_PANEL)) return ['success' => false, 'message' => __('error.unauthorized')];
        $uuid = Utils::sanitizeText($data['uuid'] ?? '');
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID requerido'];

        try {
            $db = new \App\Config\Database\DatabaseManager();
            $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            
            // Protect system tiers from deletion and get tier info
            $stmtCheck = $pdo->prepare("SELECT id, tier_level, is_active FROM subscription_tiers WHERE uuid = ?");
            $stmtCheck->execute([$uuid]);
            $tierInfo = $stmtCheck->fetch(\PDO::FETCH_ASSOC);
            
            if (!$tierInfo) return ['success' => false, 'message' => 'Suscripción no encontrada'];
            
            $tierId = (int)$tierInfo['id'];
            $tierLevel = (int)$tierInfo['tier_level'];
            
            if ($tierId > 0 && $tierId <= 1) return ['success' => false, 'message' => __('admin.cannot_delete_base_role')];

            // Check if there are users with this tier
            $stmtUsers = $pdo->prepare("SELECT COUNT(id) FROM users WHERE subscription_tier = ?");
            $stmtUsers->execute([$tierLevel]);
            $usersCount = (int)$stmtUsers->fetchColumn();

            if ($usersCount > 0) {
                // Soft Delete (Archive)
                if ((int)$tierInfo['is_active'] === 0) {
                    return ['success' => false, 'message' => 'La suscripción ya está archivada y tiene usuarios activos. No se puede eliminar.'];
                }
                
                $stmt = $pdo->prepare("UPDATE subscription_tiers SET is_active = 0 WHERE uuid = ?");
                $stmt->execute([$uuid]);

                try {
                    $redisCache = new \App\Config\Database\RedisCache();
                    (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->subscriptionTiers();
                } catch (\Throwable $t) {}

                return [
                    'success' => true, 
                    'message' => 'Suscripción archivada. Tiene ' . $usersCount . ' usuario(s) asignados y no puede ser eliminada permanentemente.'
                ];
            } else {
                // Hard Delete
                $stmt = $pdo->prepare("DELETE FROM subscription_tiers WHERE uuid = ?");
                $stmt->execute([$uuid]);

                try {
                    $redisCache = new \App\Config\Database\RedisCache();
                    (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->subscriptionTiers();
                } catch (\Throwable $t) {}

                return ['success' => true, 'message' => 'Suscripción eliminada permanentemente'];
            }
        } catch (\PDOException $e) {
            Logger::error("deleteSubscription Error", ['exception' => $e]);
            return ['success' => false, 'message' => 'Error al eliminar'];
        }
    }

    public function saveStorePackage($data) {
        $uuid = $data['uuid'] ?? null;
        $amount = (int)($data['amount'] ?? 0);
        $bonusAmount = (int)($data['bonus_amount'] ?? 0);
        $priceUsd = (float)($data['price_usd'] ?? 0);
        $stripePriceId = $data['stripe_price_id'] ?? null;

        if ($amount <= 0 || $priceUsd < 0) {
            return ['success' => false, 'message' => 'Datos inválidos. La cantidad y el precio son obligatorios.'];
        }

        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            
            if ($uuid) {
                // Update
                $stmt = $pdo->prepare("UPDATE store_coin_packages SET amount = ?, bonus_amount = ?, price_usd = ?, stripe_price_id = ? WHERE uuid = ?");
                $stmt->execute([$amount, $bonusAmount, $priceUsd, $stripePriceId, $uuid]);
                $msg = 'Paquete actualizado correctamente';
            } else {
                // Insert
                $uuid = Utils::generateUUID();
                $stmt = $pdo->prepare("INSERT INTO store_coin_packages (uuid, amount, bonus_amount, price_usd, stripe_price_id, is_active) VALUES (?, ?, ?, ?, ?, 1)");
                $stmt->execute([$uuid, $amount, $bonusAmount, $priceUsd, $stripePriceId]);
                $msg = 'Paquete creado correctamente';
            }

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => $msg, 'uuid' => $uuid];
        } catch (\PDOException $e) {
            Logger::error("saveStorePackage Error", ['exception' => $e]);
            return ['success' => false, 'message' => 'Error al guardar el paquete de monedas'];
        }
    }

    public function toggleStorePackageVisibility($data) {
        $uuid = $data['uuid'] ?? '';
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID faltante'];
        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            $stmt = $pdo->prepare("UPDATE store_coin_packages SET is_active = 1 - is_active WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => 'Visibilidad actualizada'];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => 'Error de BD'];
        }
    }

    public function setStorePackagePopular($data) {
        $uuid = $data['uuid'] ?? '';
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID faltante'];
        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            // Primero limpiamos el popular de todos
            $pdo->query("UPDATE store_coin_packages SET is_popular = 0");
            $stmt = $pdo->prepare("UPDATE store_coin_packages SET is_popular = 1 WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => 'Paquete marcado como popular'];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => 'Error de BD'];
        }
    }

    public function deleteStorePackage($data) {
        $uuid = $data['uuid'] ?? '';
        if (empty($uuid)) return ['success' => false, 'message' => 'UUID faltante'];
        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            $stmt = $pdo->prepare("DELETE FROM store_coin_packages WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => 'Paquete eliminado permanentemente'];
        } catch (\PDOException $e) {
            Logger::error("deleteStorePackage Error", ['exception' => $e]);
            return ['success' => false, 'message' => 'Error al eliminar el paquete'];
        }
    }

    public function saveStorePerk($data) {
        $uuid = $data['uuid'] ?? '';
        $perkId = $data['perk_id'] ?? '';
        $priceCoins = (int)($data['price_coins'] ?? 0);

        if (empty($perkId) || $priceCoins < 0) {
            return ['success' => false, 'message' => __('err_invalid_perk_data')];
        }

        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            
            if ($uuid) {
                // Update
                $stmt = $pdo->prepare("UPDATE store_perk_packages SET perk_id = ?, price_coins = ? WHERE uuid = ?");
                $stmt->execute([$perkId, $priceCoins, $uuid]);
                $msg = __('msg_perk_updated_success');
            } else {
                // Insert
                $uuid = Utils::generateUUID();
                $stmt = $pdo->prepare("INSERT INTO store_perk_packages (uuid, perk_id, price_coins, is_active) VALUES (?, ?, ?, 1)");
                $stmt->execute([$uuid, $perkId, $priceCoins]);
                $msg = __('msg_perk_created_success');
            }

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePerkPackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => $msg, 'uuid' => $uuid];
        } catch (\PDOException $e) {
            Logger::error("saveStorePerk Error", ['exception' => $e]);
            return ['success' => false, 'message' => __('err_save_perk_failed')];
        }
    }

    public function toggleStorePerkVisibility($data) {
        $uuid = $data['uuid'] ?? '';
        if (empty($uuid)) return ['success' => false, 'message' => __('err_missing_uuid')];
        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            $stmt = $pdo->prepare("UPDATE store_perk_packages SET is_active = 1 - is_active WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePerkPackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => __('msg_perk_visibility_updated')];
        } catch (\PDOException $e) {
            return ['success' => false, 'message' => __('err_db_error')];
        }
    }

    public function deleteStorePerk($data) {
        $uuid = $data['uuid'] ?? '';
        if (empty($uuid)) return ['success' => false, 'message' => __('err_missing_uuid')];
        try {
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            $stmt = $pdo->prepare("DELETE FROM store_perk_packages WHERE uuid = ?");
            $stmt->execute([$uuid]);

            try {
                $redisCache = new \App\Config\Database\RedisCache();
                (new \App\Core\System\CacheInvalidator($redisCache->getClient()))->storePerkPackages();
            } catch (\Throwable $t) {}

            return ['success' => true, 'message' => __('msg_perk_deleted_success')];
        } catch (\PDOException $e) {
            Logger::error("deleteStorePerk Error", ['exception' => $e]);
            return ['success' => false, 'message' => __('err_delete_perk_failed')];
        }
    }


    public function getRoles() {
        if (!$this->hasPermission(PermissionsConstants::VIEW_ROLES)) return ['success' => false, 'message' => __('error.unauthorized')];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];
        
        return ['success' => true, 'roles' => $this->roleRepository->getAll()];
    }

    public function createRole($data) {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE)) return ['success' => false, 'message' => __('error.unauthorized')];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $name = Utils::sanitizeText($data['name'] ?? '');
        $weight = max(1, (int)($data['weight'] ?? 1)); 
        $currentWeight = $this->getCurrentAdminWeight();

        if ($currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && $weight >= $currentWeight) {
            return ['success' => false, 'message' => __('admin.hierarchical_restriction')];
        }

        if (strlen($name) < 2 || strlen($name) > 50) return ['success' => false, 'message' => __('validation.invalid_length')];

        if ($this->roleRepository->findByName($name)) return ['success' => false, 'message' => __('validation.role_exists')];

        if ($this->roleRepository->create($name, $weight)) {
            return ['success' => true, 'message' => __('admin.role_created')];
        }

        return ['success' => false, 'message' => __('error.database')];
    }

    public function editRole($data) {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE)) return ['success' => false, 'message' => __('error.unauthorized')];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) return ['success' => false, 'message' => __('validation.invalid_data')];

        $existingById = $this->roleRepository->findById($id);
        if (!$existingById) return ['success' => false, 'message' => __('admin.role_not_found')];

        $currentWeight = $this->getCurrentAdminWeight();
        $isSystemRole = (isset($existingById['is_system']) ? (int)$existingById['is_system'] === 1 : $id <= SecurityConstants::MAX_SYSTEM_ROLE_ID);

        if ($isSystemRole) {
            $name = $existingById['name'];
            $weight = (int)$existingById['weight'];
        } else {
            $name = Utils::sanitizeText($data['name'] ?? '');
            $weight = max(1, (int)($data['weight'] ?? 1));

            if ($currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && $weight >= $currentWeight) {
                return ['success' => false, 'message' => __('admin.hierarchical_restriction')];
            }

            if (strlen($name) < 2 || strlen($name) > 50) return ['success' => false, 'message' => __('validation.invalid_length')];
            
            $existingByName = $this->roleRepository->findByName($name);
            if ($existingByName && $existingByName['id'] !== $id) return ['success' => false, 'message' => __('validation.role_exists')];
        }

        try {
            if ($this->roleRepository->update($id, $name, $weight, $currentWeight)) {
                return ['success' => true, 'message' => __('admin.role_updated')];
            }
        } catch (\Exception $e) {
            Logger::error("edit_role_failed", ["exception" => $e->getMessage()]);
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message' => __('error.unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }
        }

        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function deleteRole($data) {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE)) return ['success' => false, 'message' => __('error.unauthorized')];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) return ['success' => false, 'message' => __('validation.invalid_data')];

        $existingById = $this->roleRepository->findById($id);
        if (!$existingById) return ['success' => false, 'message' => __('admin.role_not_found')];

        $isSystemRole = (isset($existingById['is_system']) ? (int)$existingById['is_system'] === 1 : $id <= SecurityConstants::MAX_SYSTEM_ROLE_ID);
        if ($isSystemRole) {
            return ['success' => false, 'message' => __('admin.cannot_delete_base_role'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
        }

        $currentWeight = $this->getCurrentAdminWeight();

        try {
            if ($this->roleRepository->delete($id, $currentWeight)) {
                return ['success' => true, 'message' => __('admin.role_deleted')];
            }
        } catch (\Exception $e) {
            Logger::error("delete_role_failed", ["exception" => $e->getMessage()]);
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message' => __('error.unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }
        }

        return ['success' => false, 'message' => __('error.database')];
    }

    public function getPermissionsList() {
        if ($this->getCurrentAdminWeight() < SecurityConstants::WEIGHT_SUPER_ADMIN) return ['success' => false, 'message' => __('error.unauthorized')];
        return ['success' => true, 'permissions' => $this->roleRepository->getAllPermissions()];
    }

    public function getRolePermissions($data) {
        if ($this->getCurrentAdminWeight() < SecurityConstants::WEIGHT_SUPER_ADMIN) return ['success' => false, 'message' => __('error.unauthorized')];
        
        $roleId = (int)($data['id'] ?? 0);
        if ($roleId <= 0) return ['success' => false, 'message' => __('validation.invalid_data')];

        return ['success' => true, 'permissions' => $this->roleRepository->getRolePermissions($roleId)];
    }

    public function updateRolePermissions($data) {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE)) return ['success' => false, 'message' => __('error.unauthorized')];
        
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $roleId = (int)($data['id'] ?? 0);
        $permissionsArray = $data['permissions'] ?? [];

        if ($roleId <= 0 || !is_array($permissionsArray)) return ['success' => false, 'message' => __('validation.invalid_data')];

        $targetRole = $this->roleRepository->findById($roleId);
        if (!$targetRole) return ['success' => false, 'message' => __('admin.role_not_found')];
        
        if ($targetRole['weight'] >= SecurityConstants::WEIGHT_SUPER_ADMIN) {
            return ['success' => false, 'message' => __('admin.cannot_edit_superadmin_permissions')];
        }

        $currentWeight = $this->getCurrentAdminWeight();
        $allPerms = $this->roleRepository->getAllPermissions();
        $criticalIds = [];
        
        foreach($allPerms as $p) {
             if (isset($p['is_critical']) && $p['is_critical'] == 1) {
                  $criticalIds[] = $p['id'];
             }
        }

        $attemptingToGrantCritical = count(array_intersect($permissionsArray, $criticalIds)) > 0;

        if ($attemptingToGrantCritical) {
            if ($currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN) {
                return ['success' => false, 'message' => __('admin.insufficient_privileges_to_grant_critical'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }
            if ((int)$targetRole['weight'] < SecurityConstants::WEIGHT_CRITICAL_ROLE_MIN) {
                return ['success' => false, 'message' => __('admin.role_weight_too_low_for_critical'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }
        }

        try {
            if ($this->roleRepository->assignPermissionsToRole($roleId, $permissionsArray, $currentWeight)) {
                return ['success' => true, 'message' => __('admin.role_permissions_updated')];
            }
        } catch (\Exception $e) {
            Logger::error("update_role_permissions_failed", ["exception" => $e->getMessage()]);
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message' => __('error.unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }
        }

        return ['success' => false, 'message' => __('error.update_failed')];
    }

    public function getServerConfig() {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_SERVER_CONFIG)) return ['success' => false, 'message' => __('error.unauthorized')];
        return ['success' => true, 'config' => $this->configRepository->getConfig()];
    }

    public function updateServerConfig($data) {
        if (!$this->hasPermission(PermissionsConstants::MANAGE_SERVER_CONFIG)) return ['success' => false, 'message' => __('error.unauthorized')];

        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;

        $allowedFields = [
            'min_password_length', 'max_password_length', 'min_username_length', 'max_username_length', 'max_avatar_size_mb',
            'session_lifetime_minutes', 'max_active_sessions_per_user', 'allow_registrations', 'allowed_email_domains', 'registration_rate_limit_attempts', 'registration_rate_limit_minutes',
            'verification_code_expiration_minutes', 'password_reset_expiration_minutes',
            'username_change_cooldown_days', 'username_change_max_attempts', 'email_change_cooldown_days', 'email_change_max_attempts',
            'avatar_change_cooldown_days', 'avatar_change_max_attempts', 'login_rate_limit_attempts', 'login_rate_limit_minutes',
            'forgot_password_rate_limit_attempts', 'forgot_password_rate_limit_minutes', 'admin_edit_avatar_attempts', 'admin_edit_avatar_minutes',
            'admin_edit_username_attempts', 'admin_edit_username_minutes', 'admin_edit_email_attempts', 'admin_edit_email_minutes',
            'admin_edit_prefs_attempts', 'admin_edit_prefs_minutes', 'admin_edit_role_attempts', 'admin_edit_role_minutes',
            'admin_edit_status_attempts', 'admin_edit_status_minutes', 'admin_add_note_attempts', 'admin_add_note_minutes',
            'admin_read_data_attempts', 'admin_read_data_minutes', 'admin_password_verify_attempts', 'admin_password_verify_minutes',
            'admin_redis_read_attempts', 'admin_redis_read_minutes', 'admin_redis_delete_attempts', 'admin_redis_delete_minutes',
            'admin_flush_redis_sessions_attempts', 'admin_flush_redis_sessions_minutes', 'admin_backup_create_attempts', 'admin_backup_create_minutes',
            'admin_backup_restore_attempts', 'admin_backup_restore_minutes',
            'auto_backup_enabled', 'auto_backup_frequency_hours', 'auto_backup_retention_count',
            'maintenance_mode', 'backup_schema_config'
        ];

        $updateData = [];
        if (isset($data['config']) && is_array($data['config'])) {
            foreach ($allowedFields as $field) {
                if (isset($data['config'][$field])) {
                    if ($field === 'backup_schema_config' || $field === 'allowed_email_domains') {
                        $updateData[$field] = $data['config'][$field];
                    } else {
                        $updateData[$field] = max(0, (int)$data['config'][$field]);
                    }
                }
            }
        }

        if (empty($updateData)) return ['success' => false, 'message' => __('validation.invalid_data')];

        if ($this->configRepository->updateConfig($updateData)) {
            return ['success' => true, 'message' => __('admin.config_updated')];
        }
        return ['success' => false, 'message' => __('error.update_failed')];
    }

    private function getBackupDir() {

        $dir = ROOT_PATH . '/storage/private/backups/';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
            file_put_contents($dir . '.htaccess', "Deny from all\nOptions -Indexes");
        }
        return $dir;
    }

    public function createBackup($data = []) {
        if (!$this->hasPermission(PermissionsConstants::CREATE_BACKUPS)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_CREATE, 5, 30);
        if (!$rl['allowed']) {
            return ['success' => false, 'message' => $rl['message']];
        }
        
        $modules = $data['modules'] ?? ['db' => true, 'avatars_uploaded' => false, 'avatars_default' => false];

        return $this->dispatchBackupJob('manual', $modules);
    }

    public function getBackupSchema() {
        if (!$this->hasPermission(PermissionsConstants::CREATE_BACKUPS)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }
        try {
            $pdo = $this->dbManager->getGlobalConnection();
            $stmt = $pdo->query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
            $databases = $stmt->fetchAll(\PDO::FETCH_COLUMN);
            
            $schema = [];
            foreach ($databases as $dbName) {
                $stmtTables = $pdo->query("SHOW TABLES FROM `$dbName`");
                $schema[$dbName] = $stmtTables->fetchAll(\PDO::FETCH_COLUMN);
            }
            
            // Query Cassandra user keyspaces and tables
            $session = $this->cassandraManager->getSession();
            if ($session) {
                try {
                    $ksRows = $session->query("SELECT keyspace_name FROM system_schema.keyspaces")->asRowsResult();
                    foreach ($ksRows as $ksRow) {
                        $ksName = $ksRow['keyspace_name'];
                        // Skip internal system keyspaces
                        if (strpos($ksName, 'system') === 0) {
                            continue;
                        }
                        
                        $tableRows = $session->query("SELECT table_name FROM system_schema.tables WHERE keyspace_name = '$ksName'")->asRowsResult();
                        $schema[$ksName] = [];
                        foreach ($tableRows as $tRow) {
                            $schema[$ksName][] = $tRow['table_name'];
                        }
                    }
                } catch (\Exception $cassandraEx) {
                    Logger::error("get_backup_schema_cassandra_failed", ["exception" => $cassandraEx->getMessage()]);
                }
            }
            
            return ['success' => true, 'schema' => $schema];
        } catch (\Exception $e) {
            Logger::error("get_backup_schema_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    public function createCustomBackup($data) {
        if (!$this->hasPermission(PermissionsConstants::CREATE_BACKUPS)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }
        
        $schema = $data['schema'] ?? null;
        $modules = $data['modules'] ?? ['db' => true, 'avatars_uploaded' => false, 'avatars_default' => false];

        if (!$schema || !is_array($schema)) {
            return ['success' => false, 'message' => __('validation.invalid_data')];
        }

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_CREATE, 5, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];
        
        return $this->dispatchBackupJob('manual_custom', $modules, $schema);
    }

    public function backupStatus($data) {
        if (!$this->hasPermission(PermissionsConstants::CREATE_BACKUPS) && !$this->hasPermission(PermissionsConstants::RESTORE_BACKUPS)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }

        $jobId = $data['job_id'] ?? '';
        if (empty($jobId)) return ['success' => false, 'message' => __('validation.missing_job_id')];

        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redis = $redisCache->getClient();

            if (!$redis) {
                return ['success' => false, 'message' => __('error.redis_communication')];
            }

            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;
            if (!$redis->exists($jobKey)) {
                return ['success' => false, 'status' => 'not_found', 'message' => __('admin.backup_job_not_found')];
            }

            $statusData = $redis->hgetall($jobKey);
            return ['success' => true, 'status' => $statusData['status'] ?? 'unknown', 'job_message' => $statusData['message'] ?? ''];
        } catch (\Exception $e) {
            Logger::error("get_backup_status_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.redis_communication')];
        }
    }

    public function restoreBackup($data) {
        if (!$this->hasPermission(PermissionsConstants::RESTORE_BACKUPS)) return ['success' => false, 'message' => __('error.unauthorized')];
        
        $sudo = $this->verifyAdminSudoMode($data);
        if (!$sudo['success']) return $sudo;
        $currentUserId = $sudo['admin_id'];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_RESTORE, 3, 30);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $backupId = $data['backup_id'] ?? '';
        if (empty($backupId)) return ['success' => false, 'message' => __('validation.invalid_backup_id')];
        
        $filename = basename(base64_decode($backupId));
        $filepath = $this->getBackupDir() . $filename;
        
        if (!file_exists($filepath) || pathinfo($filename, PATHINFO_EXTENSION) !== 'enc') {
            return ['success' => false, 'message' => __('admin.backup_file_missing')];
        }

        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redis = $redisCache->getClient();

            if (!$redis) {
                return ['success' => false, 'message' => __('error.redis_communication')];
            }

            $lockAcquired = $redis->set(CacheConstants::PREFIX_LOCK_BACKUP, '1', 'EX', 1800, 'NX');
            if (!$lockAcquired) {
                return ['success' => false, 'message' => __('error.backup_in_progress')];
            }

            Utils::enableMaintenance();
            $redis->flushdb();

            $jobId = Utils::generateUUID();
            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;

            $redis->hmset($jobKey, ['status' => \App\Core\System\StatusConstants::REQUEST_PENDING, 'message' => 'queued_restore', 'created_at' => time()]);
            $redis->expire($jobKey, 3600);
            $redis->setex(CacheConstants::KEY_SYSTEM_RESTORING, 900, '1');
            
            $schema = $data['schema'] ?? null;
            $payload = json_encode([
                'job_id' => $jobId,
                'type' => 'restore',
                'backup_file' => $filename,
                'schema' => $schema,
                'requested_by' => $currentUserId
            ]);
            $redis->rpush(CacheConstants::QUEUE_BACKUP, [$payload]);

            return ['success' => true, 'message' => __('admin.restore_queued'), 'job_id' => $jobId];
        } catch (\Exception $e) {
            Logger::error("restore_backup_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.redis_communication')];
        }
    }

    public function readLogs($data) {
        if (!$this->hasPermission(PermissionsConstants::VIEW_LOGS)) return ['success' => false, 'message' => __('error.unauthorized')];
        $files = $data['files'] ?? [];
        if (!is_array($files) || empty($files)) return ['success' => false, 'message' => __('validation.no_files_specified')];
        if (count($files) > 10) return ['success' => false, 'message' => __('validation.too_many_files')];

        $contents = [];

        $logBaseDir = realpath(ROOT_PATH . '/storage/private/logs/');

        foreach ($files as $encodedFile) {
            $filename = base64_decode($encodedFile);
            $filepath = realpath($logBaseDir . '/' . $filename);
            
            if ($filepath && strpos($filepath, $logBaseDir . DIRECTORY_SEPARATOR) === 0 && file_exists($filepath) && !is_dir($filepath)) {
                $maxBytes = 2 * 1024 * 1024; 
                $filesize = filesize($filepath);
                
                if ($filesize > $maxBytes) {
                    $content = file_get_contents($filepath, false, null, $filesize - $maxBytes, $maxBytes);
                    $content = "[SYSTEM ALERT: File is too large (" . round($filesize / 1048576, 2) . " MB). Showing only the last 2 MB to prevent memory exhaustion.]\n\n" . $content;
                } else {
                    $content = file_get_contents($filepath);
                }

                $contents[$encodedFile] = [
                    'filename' => htmlspecialchars(basename($filepath), ENT_QUOTES, 'UTF-8'),
                    'category' => htmlspecialchars(basename(dirname($filepath)), ENT_QUOTES, 'UTF-8'),
                    'content' => $content
                ];
            } else {
                $contents[$encodedFile] = ['filename' => htmlspecialchars($filename, ENT_QUOTES, 'UTF-8'), 'error' => 'File not found or access denied.'];
            }
        }
        return ['success' => true, 'data' => $contents];
    }

    public function checkWorkerStatus() {
        if (!$this->hasPermission(PermissionsConstants::VIEW_LOGS)) return ['success' => false, 'message' => __('error.unauthorized')];
        
        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $redis = $redisCache->getClient();

            if (!$redis) {
                return ['success' => false, 'message' => __('error.redis_communication')];
            }

            $isRunning = $redis->exists(CacheConstants::KEY_SYSTEM_RESTORING);
            return ['success' => true, 'is_running' => (bool)$isRunning, 'status' => $isRunning ? 'restoring' : 'finished'];
        } catch (\Exception $e) {
            Logger::error("check_worker_status_failed", ["exception" => $e->getMessage()]);
            return ['success' => false, 'message' => __('error.redis_communication')];
        }
    }

    public function getDashboardMetrics($data) {
        if (!$this->hasPermission(PermissionsConstants::ACCESS_ADMIN_PANEL)) {
            return ['success' => false, 'message' => __('error.unauthorized')];
        }
        
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message' => $rl['message']];

        $startDate = $data['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $data['end_date'] ?? date('Y-m-d');

        $start = $startDate . ' 00:00:00';
        $end = $endDate . ' 23:59:59';

        $registrations = $this->userRepository->getRegistrationStats($start, $end);
        $pageviews = $this->telemetryRepository->getPageviewsOverTime($start, $end);
        $logins = $this->telemetryRepository->getAuthEventsOverTime($start, $end, 'login_success');

        $labels = [];
        $current = strtotime($startDate);
        $last = strtotime($endDate);
        while ($current <= $last) {
            $labels[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        $formatDataset = function($dataArray, $labels) {
            $map = [];
            foreach ($dataArray as $row) {
                $map[$row['date']] = (int)$row['count'];
            }
            $result = [];
            foreach ($labels as $lbl) {
                $result[] = $map[$lbl] ?? 0;
            }
            return $result;
        };

        $regData = $formatDataset($registrations, $labels);
        $pvData = $formatDataset($pageviews, $labels);
        $loginData = $formatDataset($logins, $labels);

        $loginFailedData = $formatDataset($this->telemetryRepository->getAuthEventsOverTime($start, $end, 'login_failed'), $labels);

        $totalRegs = array_sum($regData);
        $totalPv = array_sum($pvData);
        $totalLogins = array_sum($loginData);

        // Fetch extra metrics
        $dbManager = new \App\Config\Database\DatabaseManager();
        $pdoCanvases = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
        $pdoIdentity = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
        
        $totalMessages = 0;
        try { 
            $totalMessages = (int)$pdoCanvases->query("SELECT COALESCE(SUM(total_messages), 0) FROM canvases")->fetchColumn();
            if ($totalMessages === 0) {
                $totalMessages = (int)$pdoCanvases->query("SELECT COUNT(*) FROM canvas_chat_messages")->fetchColumn();
            }
        } catch (\Exception $e) {}

        $totalPixels = 0;
        try {
            $totalPixels = (int)$pdoCanvases->query("SELECT COALESCE(SUM(total_pixels), 0) FROM canvases")->fetchColumn();
        } catch (\Exception $e) {}

        $totalPerksUsed = 0;
        try {
            $totalPerksUsed = (int)$pdoIdentity->query("SELECT COUNT(*) FROM user_perks WHERE is_used = 1")->fetchColumn();
        } catch (\Exception $e) {}

        $totalCanvases = 0;
        try { $totalCanvases = (int)$pdoCanvases->query("SELECT COUNT(*) FROM " . \App\Core\System\DatabaseConstants::TBL_CANVASES)->fetchColumn(); } catch (\Exception $e) {}

        $totalBanned = 0;
        try { $totalBanned = (int)$pdoIdentity->query("SELECT COUNT(*) FROM " . \App\Core\System\DatabaseConstants::TBL_USERS . " WHERE is_suspended = 1")->fetchColumn(); } catch (\Exception $e) {}

        $avgLatency = 0.0;
        try { 
            $latencyStats = $this->telemetryRepository->getApiLatencyStats($start, $end);
            $totalLatency = 0.0;
            $totalReqs = 0;
            foreach ($latencyStats as $stat) {
                $totalLatency += $stat['avg_latency'] * $stat['total_requests'];
                $totalReqs += $stat['total_requests'];
            }
            $avgLatency = $totalReqs > 0 ? round($totalLatency / $totalReqs, 2) : 0.0;
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Failed to compute average latency", ['exception' => $e->getMessage()]);
        }

        $privacyCounts = ['public' => 0, 'private' => 0, 'unlisted' => 0];
        try {
            $privacyData = $pdoCanvases->query("SELECT privacy, COUNT(*) as count FROM " . \App\Core\System\DatabaseConstants::TBL_CANVASES . " GROUP BY privacy")->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($privacyData as $row) {
                $privacyCounts[$row['privacy']] = (int)$row['count'];
            }
        } catch (\Exception $e) {}

        return [
            'success' => true,
            'summary' => [
                'new_users' => $totalRegs,
                'pageviews' => $totalPv,
                'logins' => $totalLogins,
                'messages' => $totalMessages,
                'pixels' => $totalPixels,
                'perks_used' => $totalPerksUsed,
                'canvases' => $totalCanvases,
                'banned_users' => $totalBanned,
                'avg_latency' => $avgLatency
            ],
            'charts' => [
                'labels' => $labels,
                'registrations' => $regData,
                'pageviews' => $pvData,
                'logins' => $loginData,
                'login_fails' => $loginFailedData,
                'privacy' => $privacyCounts
            ]
        ];
    }

    public function getAllMessages($page = 1, $limit = 50) {
        $this->requirePermission('view_logs'); // Usamos view_logs o rol de admin genÃƒÂ©rico

        $offset = ($page - 1) * $limit;
        
        $pdoCanvases = $this->dbManager->getConnection(DB::CONN_CANVASES);
        $pdoIdentity = $this->dbManager->getConnection(DB::CONN_IDENTITY);
        
        $session = $this->cassandraManager->getSession();
        $allMessages = [];
        $totalItems = 0;
        
        if ($session) {
            try {
                // Get approximate count by summing total_messages from canvases table
                $totalItems = (int)$pdoCanvases->query("SELECT COALESCE(SUM(total_messages), 0) FROM canvases")->fetchColumn();
                
                // Scan latest messages from Cassandra (limited to 1000 for admin log view performance)
                $rows = $session->query("SELECT uuid, canvas_id, user_id, message, attachments, file_size, visibility, created_at FROM canvas_chat_messages LIMIT 1000")->asRowsResult();
                
                foreach ($rows as $row) {
                    $createdAt = '';
                    if (isset($row['created_at'])) {
                        $dt = null;
                        if ($row['created_at'] instanceof \DateTime) {
                            $dt = $row['created_at'];
                        } else if (is_string($row['created_at'])) {
                            try {
                                $dt = new \DateTime($row['created_at']);
                            } catch (\Exception $ex) {}
                        } else if (is_numeric($row['created_at'])) {
                            $dt = new \DateTime('@' . intval($row['created_at'] / 1000));
                        }
                        
                        if ($dt) {
                            $dt->setTimezone(new \DateTimeZone(date_default_timezone_get()));
                            $createdAt = $dt->format('Y-m-d H:i:s');
                        } else if (is_string($row['created_at'])) {
                            $createdAt = $row['created_at'];
                        }
                    }
                    
                    $allMessages[] = [
                        'id' => $row['uuid'] ?? '',
                        'uuid' => $row['uuid'] ?? '',
                        'canvas_id' => (int)($row['canvas_id'] ?? 0),
                        'user_id' => (int)($row['user_id'] ?? 0),
                        'message' => $row['message'] ?? '',
                        'attachments' => $row['attachments'] ?? null,
                        'visibility' => $row['visibility'] ?? 'visible',
                        'created_at' => $createdAt
                    ];
                }
                
                // Sort by created_at DESC
                usort($allMessages, function($a, $b) {
                    return strcmp($b['created_at'], $a['created_at']);
                });
            } catch (\Exception $e) {
                Logger::error("Error scanning messages from Cassandra for admin", ['exception' => $e]);
            }
        }
        
        $totalPages = ceil($totalItems / $limit);
        $messages = array_slice($allMessages, $offset, $limit);
        
        if (!empty($messages)) {
            $canvasIds = array_values(array_unique(array_column($messages, 'canvas_id')));
            if (!empty($canvasIds)) {
                $placeholders = implode(',', array_fill(0, count($canvasIds), '?'));
                $canvasStmt = $pdoCanvases->prepare("SELECT id, name FROM canvases WHERE id IN ($placeholders)");
                $canvasStmt->execute($canvasIds);
                $canvasMap = [];
                while ($cRow = $canvasStmt->fetch(\PDO::FETCH_ASSOC)) {
                    $canvasMap[$cRow['id']] = $cRow['name'];
                }
                foreach ($messages as &$msg) {
                    $msg['canvas_name'] = $canvasMap[$msg['canvas_id']] ?? __('canvas');
                }
                unset($msg);
            }
        }

        if (!empty($messages)) {
            $userIds = array_values(array_unique(array_column($messages, 'user_id')));
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $userStmt = $pdoIdentity->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
            $userStmt->execute($userIds);
            $usersMap = [];
            while ($row = $userStmt->fetch(\PDO::FETCH_ASSOC)) {
                $usersMap[$row['id']] = $row['username'];
            }
            
            foreach ($messages as &$msg) {
                $uid = $msg['user_id'];
                $msg['username'] = $usersMap[$uid] ?? __('user');
            }
            unset($msg);
        }
        
        return [
            'success' => true,
            'messages' => $messages,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_items' => $totalItems,
                'total_pages' => $totalPages
            ]
        ];
    }

    public function updateMessageVisibility(array $data) {
        $this->requirePermission('view_logs'); // Required permission for this action
        
        $messageUuid = $data['uuid'] ?? null;
        $visibility = $data['visibility'] ?? 'visible';
        $deletedBy = $data['deleted_by'] ?? null;
        $deleteReason = $data['delete_reason'] ?? null;
        
        if (!$messageUuid) {
            throw new \Exception("UUID de mensaje requerido.");
        }
        
        if (!in_array($visibility, ['visible', 'under_review', 'deleted'])) {
            throw new \Exception("Visibilidad no vÃƒÂ¡lida.");
        }

        if ($visibility !== 'deleted') {
            $deletedBy = null;
            $deleteReason = null;
        } else {
            if (!in_array($deletedBy, ['user', 'admin'])) {
                $deletedBy = null;
            }
            if ($deletedBy !== 'admin') {
                $deleteReason = null;
            }
        }
        
        $session = $this->cassandraManager->getSession();
        if (!$session) {
            throw new \Exception("Servicio NoSQL no disponible.");
        }

        // Retrieve message full key using uuid secondary index
        $stmt = $session->prepare("SELECT canvas_id, created_at FROM canvas_chat_messages WHERE uuid = ?");
        $rows = $session->execute($stmt, [$messageUuid])->asRowsResult();
        $msg = null;
        foreach ($rows as $row) {
            $msg = $row;
            break;
        }

        if (!$msg) {
            throw new \Exception("Mensaje no encontrado en Cassandra.");
        }

        $updateStmt = $session->prepare("
            UPDATE canvas_chat_messages 
            SET visibility = ?, 
                deleted_by = ?, 
                delete_reason = ? 
            WHERE canvas_id = ? AND created_at = ? AND uuid = ?
        ");
        
        $session->execute($updateStmt, [
            $visibility,
            $deletedBy,
            $deleteReason,
            (int)$msg['canvas_id'],
            $msg['created_at'],
            $messageUuid
        ]);
        
        return [
            'success' => true,
            'message' => 'Visibilidad actualizada correctamente.'
        ];
    }

    public function getMessageReports(string $messageUuid) {
        $this->requirePermission('view_logs');

        if (empty($messageUuid)) {
            throw new \Exception("UUID de mensaje requerido.");
        }

        $pdoCanvases = $this->dbManager->getConnection(DB::CONN_CANVASES);
        $pdoIdentity = $this->dbManager->getConnection(DB::CONN_IDENTITY);

        $session = $this->cassandraManager->getSession();
        $message = null;

        if ($session) {
            try {
                $stmt = $session->prepare("SELECT uuid, canvas_id, user_id, message, attachments, visibility, created_at FROM canvas_chat_messages WHERE uuid = ?");
                $rows = $session->execute($stmt, [$messageUuid])->asRowsResult();
                
                foreach ($rows as $row) {
                    $createdAt = '';
                    if (isset($row['created_at'])) {
                        $dt = null;
                        if ($row['created_at'] instanceof \DateTime) {
                            $dt = $row['created_at'];
                        } else if (is_string($row['created_at'])) {
                            try {
                                $dt = new \DateTime($row['created_at']);
                            } catch (\Exception $ex) {}
                        } else if (is_numeric($row['created_at'])) {
                            $dt = new \DateTime('@' . intval($row['created_at'] / 1000));
                        }
                        
                        if ($dt) {
                            $dt->setTimezone(new \DateTimeZone(date_default_timezone_get()));
                            $createdAt = $dt->format('Y-m-d H:i:s');
                        } else if (is_string($row['created_at'])) {
                            $createdAt = $row['created_at'];
                        }
                    }
                    
                    $message = [
                        'id' => $row['uuid'] ?? '',
                        'uuid' => $row['uuid'] ?? '',
                        'canvas_id' => (int)($row['canvas_id'] ?? 0),
                        'user_id' => (int)($row['user_id'] ?? 0),
                        'message' => $row['message'] ?? '',
                        'attachments' => $row['attachments'] ?? null,
                        'visibility' => $row['visibility'] ?? 'visible',
                        'created_at' => $createdAt,
                        'canvas_name' => '',
                        'canvas_uuid' => ''
                    ];
                    break;
                }
            } catch (\Exception $e) {
                Logger::error("Error querying message for reports from Cassandra", ['exception' => $e]);
            }
        }

        if (!$message) {
            throw new \Exception("Mensaje no encontrado.");
        }

        $canvasStmt = $pdoCanvases->prepare("SELECT name, uuid FROM canvases WHERE id = ?");
        $canvasStmt->execute([$message['canvas_id']]);
        $canvas = $canvasStmt->fetch(\PDO::FETCH_ASSOC);
        if ($canvas) {
            $message['canvas_name'] = $canvas['name'];
            $message['canvas_uuid'] = $canvas['uuid'];
        }

        $senderStmt = $pdoIdentity->prepare("SELECT username FROM users WHERE id = ?");
        $senderStmt->execute([$message['user_id']]);
        $message['sender_username'] = $senderStmt->fetchColumn() ?: __('user');

        $repStmt = $pdoCanvases->prepare("
            SELECT r.id, r.message_id, r.reporter_user_id, r.reason_key, r.details, r.status, r.created_at
            FROM canvas_chat_reports r
            WHERE r.message_id = :message_id
            ORDER BY r.id DESC
        ");
        $repStmt->execute([':message_id' => $message['uuid']]);
        $reports = $repStmt->fetchAll(\PDO::FETCH_ASSOC);

        if (!empty($reports)) {
            $reporterIds = array_values(array_unique(array_column($reports, 'reporter_user_id')));
            $placeholders = implode(',', array_fill(0, count($reporterIds), '?'));
            $uStmt = $pdoIdentity->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
            $uStmt->execute($reporterIds);
            $uMap = [];
            while ($row = $uStmt->fetch(\PDO::FETCH_ASSOC)) {
                $uMap[$row['id']] = $row['username'];
            }
            foreach ($reports as &$rep) {
                $rep['reporter_username'] = $uMap[$rep['reporter_user_id']] ?? __('user');
            }
            unset($rep);
        }

        return [
            'success' => true,
            'message_data' => $message,
            'reports' => $reports
        ];
    }

    public function updateReportStatus(array $data) {
        $this->requirePermission('view_logs');

        $reportId = (int)($data['report_id'] ?? 0);
        $status = $data['status'] ?? 'pending';

        if ($reportId <= 0) {
            throw new \Exception("ID de reporte invalido.");
        }

        if (!in_array($status, ['pending', 'reviewed', 'dismissed'])) {
            throw new \Exception("Estado de reporte invalido.");
        }

        $pdoCanvases = $this->dbManager->getConnection(DB::CONN_CANVASES);

        $stmt = $pdoCanvases->prepare("UPDATE canvas_chat_reports SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $reportId]);

        return [
            'success' => true,
            'message' => 'Estado del reporte actualizado correctamente.'
        ];
    }

    public function sendPasswordReset(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        try {
            $token = bin2hex(random_bytes(32));
            $resetLink = rtrim(APP_URL, '/') . "/reset-password?token=" . $token;
            $expiresAt = Utils::calculateExpirationDate(15);
            $payload = json_encode(['email' => $user['email']]);

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            $verificationRepo = new \App\Core\Repositories\RedisVerificationCodeRepository($redis);
            $verificationRepo->deleteByIdentifierAndType($user['email'], DB::VERIFY_TYPE_PASSWORD);
            $created = $verificationRepo->createCode($user['email'], DB::VERIFY_TYPE_PASSWORD, $token, $payload, $expiresAt);

            if (!$created) {
                return ['success' => false, 'message' => __('err_internal_server_error')];
            }

            $mailer = new Mailer();
            $sent = $mailer->sendPasswordResetLink($user['email'], $user['username'], $resetLink);
            if ($sent) {
                Logger::info("Admin triggered password reset email for user {$user['uuid']} ({$user['email']})");
                return ['success' => true, 'message' => __('msg_password_reset_sent_success')];
            }
            return ['success' => false, 'message' => __('err_email_delivery_failed')];
        } catch (\Throwable $e) {
            Logger::error("Failed to send password reset: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function unlockRateLimit(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        try {
            $redisCache = new \App\Config\Database\RedisCache();
            $client = $redisCache->getClient();

            if ($client) {
                $keys = $client->keys(CacheConstants::PREFIX_RATE_LIMIT . '*');
                if (!empty($keys)) {
                    foreach ($keys as $k) {
                        if (
                            str_contains($k, 'login_attempts') ||
                            str_contains($k, 'login_2fa') ||
                            str_contains($k, 'password_reset') ||
                            str_contains($k, 'auth_')
                        ) {
                            $client->del($k);
                        }
                    }
                }
            }

            $adminId = $this->sessionManager->get('user_id');
            Logger::info("Admin [{$adminId}] unlocked login rate limits for user {$user['uuid']} ({$user['email']})");

            return [
                'success' => true,
                'message' => __('msg_rate_limit_unlocked_success')
            ];
        } catch (\Throwable $e) {
            Logger::error("Failed to unlock rate limits: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function adjustCoins(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;
        $amount = (int)($data['amount'] ?? 0);
        $action = trim($data['action'] ?? 'add'); // add, subtract, set
        $reason = trim($data['reason'] ?? 'Admin adjustment');

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        try {
            $userId = (int)$user['id'];
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("SELECT coins FROM " . DB::TBL_USERS . " WHERE id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $currentCoins = (int)$stmt->fetchColumn();

            $newBalance = $currentCoins;
            if ($action === 'set') {
                $newBalance = max(0, $amount);
            } elseif ($action === 'subtract') {
                $newBalance = max(0, $currentCoins - $amount);
            } else {
                $newBalance = max(0, $currentCoins + $amount);
            }

            $upd = $pdo->prepare("UPDATE " . DB::TBL_USERS . " SET coins = ? WHERE id = ?");
            $upd->execute([$newBalance, $userId]);

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis) {
                $redis->del(CacheConstants::PREFIX_STORE_COINS . $userId);
                $redis->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            }

            $adminId = $this->sessionManager->get('user_id');
            Logger::info("Admin [{$adminId}] adjusted coins for user {$user['uuid']}: {$currentCoins} -> {$newBalance} (Reason: {$reason})");

            return [
                'success' => true,
                'message' => __('msg_coins_adjusted_success'),
                'coins' => $newBalance
            ];
        } catch (\Throwable $e) {
            Logger::error("Failed to adjust coins: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function terminateSessions(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message' => $authCheck['message']];

        try {
            $this->tokenRepository->deleteAllByUserId((int)$user['id']);

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis) {
                $redis->setex(CacheConstants::PREFIX_FORCE_REAUTH_USER . $user['id'], 86400, time());
                $userSessionsKey = CacheConstants::PREFIX_USER_SESSIONS . $user['id'];
                $sessionIds = $redis->smembers($userSessionsKey);
                if (!empty($sessionIds)) {
                    foreach ($sessionIds as $sessId) {
                        $redis->del(CacheConstants::PREFIX_PHPSESSID . $sessId);
                    }
                    $redis->del($userSessionsKey);
                }
            }

            $adminId = $this->sessionManager->get('user_id');
            Logger::info("Admin [{$adminId}] terminated all sessions for user {$user['uuid']}");

            return [
                'success' => true,
                'message' => __('msg_sessions_terminated_success')
            ];
        } catch (\Throwable $e) {
            Logger::error("Failed to terminate user sessions: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function disable2FA(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;
        $reason = trim($data['reason'] ?? '');

        if (empty($reason)) {
            return ['success' => false, 'message' => __('err_reason_required', [], 'Se requiere un motivo obligatorio.')];
        }

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        try {
            $userId = (int)$user['id'];
            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("UPDATE " . DB::TBL_USERS . " SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = ?");
            $stmt->execute([$userId]);

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis) {
                $redis->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            }

            $adminId = $this->sessionManager->get('user_id');
            Logger::info("Admin [{$adminId}] disabled 2FA for user {$user['uuid']} ({$user['email']}) - Reason: {$reason}");

            return [
                'success' => true,
                'message' => __('msg_2fa_disabled_success')
            ];
        } catch (\Throwable $e) {
            Logger::error("Failed to disable 2FA: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function syncStripeSubscription(array $data): array {
        $this->requirePermission(PermissionsConstants::EDIT_USERS);

        $targetUserId = !empty($data['target_user_id']) ? (int)$data['target_user_id'] : null;
        $targetUserUuid = !empty($data['target_user_uuid']) ? trim($data['target_user_uuid']) : null;

        $user = null;
        if ($targetUserId) {
            $user = $this->userRepository->findById($targetUserId);
        } elseif ($targetUserUuid) {
            $user = $this->userRepository->findByUuid($targetUserUuid);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('err_user_not_found')];
        }

        try {
            $stripeCustomerId = $user['stripe_customer_id'] ?? null;
            $stripeSecret = $_ENV['STRIPE_SECRET_KEY'] ?? null;

            if ($stripeCustomerId && $stripeSecret && class_exists('\Stripe\Stripe')) {
                \Stripe\Stripe::setApiKey($stripeSecret);
                try {
                    $subscriptions = \Stripe\Subscription::all([
                        'customer' => $stripeCustomerId,
                        'status' => 'active',
                        'limit' => 1
                    ]);

                    if (!empty($subscriptions->data)) {
                        $activeSub = $subscriptions->data[0];
                        $priceId = $activeSub->items->data[0]->price->id ?? null;

                        if ($priceId) {
                            $pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
                            $stmt = $pdo->prepare("SELECT tier_level FROM subscription_tiers WHERE stripe_price_id_monthly = ? OR stripe_price_id_yearly = ? LIMIT 1");
                            $stmt->execute([$priceId, $priceId]);
                            $tierLevel = $stmt->fetchColumn();

                            if ($tierLevel !== false) {
                                $upd = $pdo->prepare("UPDATE " . DB::TBL_USERS . " SET subscription_tier = ? WHERE id = ?");
                                $upd->execute([(int)$tierLevel, (int)$user['id']]);

                                $redis = (new \App\Config\Database\RedisCache())->getClient();
                                if ($redis) {
                                    $redis->del(CacheConstants::PREFIX_USER_PROFILE . $user['id']);
                                    $redis->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $user['id']);
                                }

                                return [
                                    'success' => true,
                                    'message' => __('msg_subscription_synced_success'),
                                    'tier' => (int)$tierLevel
                                ];
                            }
                        }
                    }
                } catch (\Throwable $se) {
                    Logger::warning("Stripe API sync error: " . $se->getMessage());
                }
            }

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            if ($redis) {
                $redis->del(CacheConstants::PREFIX_USER_PROFILE . $user['id']);
                $redis->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $user['id']);
            }

            return [
                'success' => true,
                'message' => __('msg_subscription_synced_success')
            ];
        } catch (\Throwable $e) {
            Logger::error("Failed to sync stripe: " . $e->getMessage());
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }
}