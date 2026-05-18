<?php
// api/services/AdminServices.php

namespace App\Api\Services;

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
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB; 
use App\Core\System\SecurityConstants;
use App\Core\System\CacheConstants;
use App\Core\System\RateLimitConstants;
use App\Core\System\SessionConstants;

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

    public function __construct(
        UserRepositoryInterface $userRepository,
        ModerationRepositoryInterface $moderationRepository,
        SessionManagerInterface $sessionManager,
        ServerConfigRepositoryInterface $configRepository,
        UserPrefsManagerInterface $prefsManager,
        TokenRepositoryInterface $tokenRepository,
        RateLimiterInterface $rateLimiter,
        RoleRepositoryInterface $roleRepository,
        ProfileLogRepositoryInterface $profileLogRepository
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
            return ['allowed' => false, 'message_key' => 'admin.cannot_edit_self'];
        }

        $highestTargetRole = $this->roleRepository->getHighestPriorityRole($targetUser['id']);
        $targetWeight = $highestTargetRole ? (int)$highestTargetRole['weight'] : 1;

        // [PARCHE DE SEGURIDAD]: Prohibir a SuperAdmins editar a otros SuperAdmins (Excepto el Dueño Sistema ID 1)
        if ($targetWeight >= SecurityConstants::WEIGHT_SUPER_ADMIN && $currentUserId != 1) {
            Logger::warning("Attempt to modify a SuperAdmin account blocked", [
                'admin_id' => $currentUserId,
                'target_user_id' => $targetUser['id']
            ]);
            return ['allowed' => false, 'message_key' => 'admin.insufficient_privileges'];
        }

        if ($currentWeight <= $targetWeight && $currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN) {
            Logger::warning("Insufficient privileges to modify target user", [
                'admin_id' => $currentUserId,
                'target_user_id' => $targetUser['id']
            ]);
            return ['allowed' => false, 'message_key' => 'admin.insufficient_privileges'];
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
            return ['allowed' => false, 'message_key' => 'error.rate_limit_exceeded'];
        }
        
        return ['allowed' => true];
    }

    public function getUser($data) {
        if (!$this->hasPermission('view_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $userPrefs = $this->prefsManager->ensureDefaultPreferences($targetId);
        $assignedRoles = !empty($user['assigned_roles_ids']) ? array_map('intval', explode(',', $user['assigned_roles_ids'])) : [SecurityConstants::DEFAULT_USER_ROLE_ID];

        $isDeleted = !empty($user['deletion_scheduled_at']) ? 'deleted' : 'active';

        return [
            'success' => true, 
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'profile_picture' => $user['profile_picture'],
                'roles' => $assignedRoles, 
                'role_name' => $user['role_name'] ?? SecurityConstants::DEFAULT_ROLE_NAME,
                'role_color' => $user['role_color'] ?? SecurityConstants::DEFAULT_ROLE_COLOR,
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

    public function updateAvatar($data) {
        if (!$this->hasPermission('edit_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_AVATAR, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $files = $data['_files'] ?? [];
        if (!isset($files['avatar'])) {
            return ['success' => false, 'message_key' => 'upload.error'];
        }
        
        $file = $files['avatar'];
        $maxSizeMb = $this->config['max_avatar_size_mb'] ?? 2;
        $uploadDir = ROOT_PATH . '/public/storage/profilePictures/uploaded/';

        $uploadResult = Utils::uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb);

        if ($uploadResult['success']) {
            $fileName = $uploadResult['file_name'];
            
            Utils::deleteOldAvatar($user['profile_picture']);
            
            $newRelPath = 'public/storage/profilePictures/uploaded/' . $fileName;

            if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
                $currentUserId = $this->sessionManager->get('user_id');
                $this->moderationRepository->logAction($targetId, $currentUserId, 'profile_avatar', "Avatar actualizado por el administrador", null);
                return ['success' => true, 'message_key' => 'admin.avatar_updated', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
            }
        } else {
            return ['success' => false, 'message_key' => $uploadResult['message_key']];
        }

        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

    public function deleteAvatar($data) {
        if (!$this->hasPermission('edit_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_AVATAR, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $oldPic = $user['profile_picture'];
        if (strpos($oldPic, '/default/') !== false) return ['success' => false, 'message_key' => 'admin.avatar_already_default'];

        Utils::deleteOldAvatar($oldPic);

        $newRelPath = Utils::generateProfilePicture($user['username'], $user['uuid']);
        if ($this->userRepository->updateAvatar($targetId, $newRelPath)) {
            $currentUserId = $this->sessionManager->get('user_id');
            $this->moderationRepository->logAction($targetId, $currentUserId, 'profile_avatar', "Avatar eliminado (restaurado a predeterminado)", null);
            return ['success' => true, 'message_key' => 'admin.avatar_deleted', 'new_avatar' => APP_URL . '/' . ltrim($newRelPath, '/')];
        }
        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function updateUsername($data) {
        if (!$this->hasPermission('edit_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        // [PARCHE DE SEGURIDAD]: Validación Sudo-Mode con protección Anti-DoS
        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');

        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_USERNAME, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $username = trim($data['username'] ?? '');
        $minLen = $this->config['min_username_length'] ?? 3;
        $maxLen = $this->config['max_username_length'] ?? 32;
        
        if (strlen($username) < $minLen || strlen($username) > $maxLen) return ['success' => false, 'message_key' => 'validation.invalid_length'];

        $existingUser = $this->userRepository->findByUsername($username);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message_key' => 'validation.username_in_use'];

        $oldUsername = $user['username'];
        if ($this->userRepository->updateUsername($targetId, $username)) {
            $this->moderationRepository->logAction($targetId, $currentUserId, 'profile_username', "Nombre de usuario cambiado de '{$oldUsername}' a '{$username}'", null);
            return ['success' => true, 'message_key' => 'admin.username_updated', 'new_username' => $username];
        }
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function updateEmail($data) {
        if (!$this->hasPermission('edit_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        // [PARCHE DE SEGURIDAD]: Validación Sudo-Mode con protección Anti-DoS
        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');

        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_EMAIL, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $email = trim($data['email'] ?? '');
        $emailValidation = Utils::validateEmailFormat($email);
        if (!$emailValidation['valid']) return ['success' => false, 'message_key' => 'validation.invalid_email'];

        $existingUser = $this->userRepository->findByEmail($email);
        if ($existingUser && $existingUser['id'] != $targetId) return ['success' => false, 'message_key' => 'validation.email_in_use'];

        $oldEmail = $user['email'];
        if ($this->userRepository->updateEmail($targetId, $email)) {
            $this->moderationRepository->logAction($targetId, $currentUserId, 'profile_email', "Correo cambiado de '{$oldEmail}' a '{$email}'", null);
            
            $mailer = new Mailer();
            $mailer->sendSecurityAlertEmailChanged($oldEmail, $user['username'], $email);

            return ['success' => true, 'message_key' => 'admin.email_updated', 'new_email' => $email];
        }
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function updatePreference($data) {
        if (!$this->hasPermission('edit_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_PREFS, 50, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $key = $data['key'] ?? '';
        $value = $data['value'] ?? '';

        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return ['success' => false, 'message_key' => 'validation.invalid_preference'];
        if ($key === 'open_links_new_tab' || $key === 'extended_alerts') $value = ($value == 1) ? 1 : 0;

        if ($this->userRepository->updatePreference($targetId, $key, $value)) {
            $currentUserId = $this->sessionManager->get('user_id');
            $valStr = is_bool($value) ? ($value ? 'true' : 'false') : (string)$value;
            $this->moderationRepository->logAction($targetId, $currentUserId, 'profile_preferences', "Preferencia '{$key}' actualizada a '{$valStr}'", null);
            return ['success' => true, 'message_key' => 'admin.preference_updated'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function updateRoles($data) {
        if (!$this->hasPermission('assign_roles')) return ['success' => false, 'message_key' => 'error.unauthorized'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $rolesIds = $data['roles'] ?? [];
        $password = $data['password'] ?? '';

        if (!is_array($rolesIds) || empty($rolesIds)) return ['success' => false, 'message_key' => 'validation.invalid_role'];

        $currentUserId = $this->sessionManager->get('user_id');
        $user = $this->userRepository->findById($targetId);
        
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        // [PARCHE DE SEGURIDAD]: Anti-DoS - Consumir RateLimit de Contraseña primero
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        // Consumir RateLimit Funcional después de validar password
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 10, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $currentWeight = $this->getCurrentAdminWeight();

        try {
            if ($this->roleRepository->syncUserRoles($targetId, $rolesIds, $currentWeight)) {
                $rolesStr = implode(', ', $rolesIds);
                Logger::critical("Admin updated user roles", ['admin_id' => $currentUserId, 'target_user_id' => $targetId, 'new_roles' => $rolesIds]);
                
                $this->moderationRepository->logAction($targetId, $currentUserId, 'role_changed', "Roles actualizados a IDs: [{$rolesStr}]", null, null);
                
                Utils::invalidateUserSessions($this->sessionManager, $targetId);
                
                return ['success' => true, 'message_key' => 'admin.role_updated'];
            }
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message_key' => 'admin.hierarchical_restriction'];
            }
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function deleteUsers($data) {
        if (!$this->hasPermission('delete_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];

        $userIds = $data['user_ids'] ?? [];
        $password = $data['password'] ?? '';
        
        if (!is_array($userIds) || empty($userIds)) {
            return ['success' => false, 'message_key' => 'validation.invalid_data'];
        }

        $currentUserId = $this->sessionManager->get('user_id');

        // [PARCHE DE SEGURIDAD]: Anti-DoS - Consumir RateLimit de Contraseña primero
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        // Consumir RateLimit Funcional
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_DELETE_USER, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $deletedReason = 'account_deleted_by_admin';
        $successCount = 0;
        $failedCount = 0;

        try {
            $redisClient = Utils::getRedisClient();

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

                $payload = json_encode([
                    'user_id' => $targetId,
                    'email' => $user['email'],
                    'username' => $user['username'],
                    'reason' => $deletedReason
                ]);
                $redisClient->rpush(CacheConstants::QUEUE_ACCOUNT_DELETION, $payload);
                
                $this->moderationRepository->logAction($targetId, $currentUserId, 'deleted', "Borrado duro y masivo por Admin.", null, null);
                
                $successCount++;
            }

            if ($successCount === 0) {
                 return ['success' => false, 'message_key' => 'admin.no_users_deleted', 'deleted_count' => 0, 'failed_count' => $failedCount];
            }

            return [
                'success' => true, 
                'message_key' => 'admin.account_deleted',
                'deleted_count' => $successCount,
                'failed_count' => $failedCount
            ];
        } catch (\Exception $e) {
            Logger::error("Error connecting to Redis for bulk account deletion job", ['exception' => $e]);
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function updateSuspension($data) {
        if (!$this->hasPermission('moderate_users')) return ['success' => false, 'message_key' => 'error.unauthorized'];

        $targetId = (int)($data['target_user_id'] ?? 0);
        $password = $data['password'] ?? '';
        
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $currentUserId = $this->sessionManager->get('user_id');

        $authCheck = $this->canEditUser($user);
        if (!$authCheck['allowed']) return ['success' => false, 'message_key' => $authCheck['message_key']];

        // [PARCHE DE SEGURIDAD]: Anti-DoS - Consumir RateLimit de Contraseña primero
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        // Consumir RateLimit Funcional
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_STATUS, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $dbIsSuspended = (isset($data['is_suspended']) && $data['is_suspended'] == 1) ? 1 : 0;
        $dbSuspensionType = null;
        $dbSuspensionReason = null;
        $dbEndDate = null;
        $notifyUser = (isset($data['notify_user']) && $data['notify_user'] == true);

        if ($dbIsSuspended === 1) {
            $dbSuspensionType = ($data['suspension_type'] === DB::SUSPENSION_TEMP) ? DB::SUSPENSION_TEMP : DB::SUSPENSION_PERM;
            $rawSuspensionReason = $data['suspension_reason'] ?? null;
            $dbSuspensionReason = Utils::sanitizeText($rawSuspensionReason);

            if ($dbSuspensionReason && mb_strlen($dbSuspensionReason) > 500) return ['success' => false, 'message_key' => 'validation.reason_too_long'];
            
            if ($dbSuspensionType === DB::SUSPENSION_TEMP && !empty($data['end_date'])) {
                $format = 'Y-m-d H:i:s';
                $d = \DateTime::createFromFormat($format, $data['end_date']);
                if (!$d || $d->format($format) !== $data['end_date']) return ['success' => false, 'message_key' => 'validation.invalid_date'];
                if ($d->getTimestamp() <= time()) return ['success' => false, 'message_key' => 'validation.date_in_past'];
                $dbEndDate = $data['end_date'];
            }
        }

        $actionType = 'note_updated';
        $logReason = null;
        
        if ($dbIsSuspended === 1 && (!isset($user['is_suspended']) || $user['is_suspended'] != 1)) {
            $actionType = 'suspended';
            $logReason = $dbSuspensionReason;
        } elseif ($dbIsSuspended === 0 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            $actionType = 'unsuspended';
        } elseif ($dbIsSuspended === 1 && (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            if ($dbSuspensionReason !== $user['suspension_reason'] || $dbEndDate !== $user['suspension_end_date']) {
                 $actionType = 'suspended'; 
                 $logReason = $dbSuspensionReason;
            }
        }

        if ($this->moderationRepository->updateStatus($targetId, 'active', null, null, $dbIsSuspended, $dbSuspensionType, $dbSuspensionReason, $dbEndDate, null)) {
            if ($actionType !== 'note_updated') {
                $this->moderationRepository->logAction($targetId, $currentUserId, $actionType, $logReason, $dbEndDate, null);
            }
            if ($dbIsSuspended === 1) {
                $this->tokenRepository->deleteAllByUserId($targetId);
                
                Utils::invalidateUserSessions($this->sessionManager, $targetId, true);
                
                if ($notifyUser) {
                    $mailer = new Mailer();
                    $mailer->sendAccountStatusNotification($user['email'], $user['username'], 'suspended', $dbSuspensionReason, $dbEndDate);
                }
            }
            return ['success' => true, 'message_key' => 'admin.status_updated'];
        }
        
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function getModerationKardex($data) {
        if (!$this->hasPermission('view_kardex')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];
        
        $targetId = (int)($data['target_user_id'] ?? 0);
        $user = $this->userRepository->findById($targetId);
        if (!$user) return ['success' => false, 'message_key' => 'admin.user_not_found'];

        $modLogs = $this->moderationRepository->getKardex($targetId);
        $profileLogs = $this->profileLogRepository->getLogsByUserId($targetId);
        
        foreach ($profileLogs as $pl) {
            $modLogs[] = [
                'created_at' => $pl['created_at'],
                'action_type' => 'profile_' . $pl['change_type'],
                'reason' => 'Dato: ' . $pl['change_type'] . ' | Valor previo: ' . ($pl['old_value'] ?? 'N/A') . ' | Nuevo: ' . ($pl['new_value'] ?? 'N/A'),
                'admin_username' => 'Acción del Usuario',
                'admin_profile_picture' => null,
                'admin_role' => 'user'
            ];
        }

        usort($modLogs, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return ['success' => true, 'logs' => $modLogs];
    }

    private function validateAndFormatRoleColor($data) {
        $type = $data['color_type'] ?? 'solid';
        $angle = (int)($data['angle'] ?? 0);
        $rawColors = $data['colors'] ?? [];

        if ($angle < 0) $angle = 0;
        if ($angle > 360) $angle = 360;

        if (!in_array($type, ['solid', 'gradient'])) {
            return ['valid' => false, 'message_key' => 'validation.invalid_color_type'];
        }

        if (!is_array($rawColors) || empty($rawColors)) {
            return ['valid' => false, 'message_key' => 'validation.invalid_color'];
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
            return ['valid' => false, 'message_key' => 'validation.invalid_color'];
        }

        if ($type === 'solid') {
            $validColors = [['hex' => $validColors[0]['hex'], 'percentage' => 100]]; 
        } elseif ($type === 'gradient') {
            if (count($validColors) < 2) {
                return ['valid' => false, 'message_key' => 'validation.gradient_requires_multiple_colors'];
            }
            if ($totalPercentage !== 100) {
                return ['valid' => false, 'message_key' => 'validation.invalid_percentage_sum'];
            }
        }

        $colorJson = json_encode(['type' => $type, 'angle' => $angle, 'colors' => $validColors]);
        return ['valid' => true, 'color_string' => $colorJson];
    }

    public function getRoles() {
        if (!$this->hasPermission('view_roles')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_READ_DATA, 120, 1);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];
        
        return ['success' => true, 'roles' => $this->roleRepository->getAll()];
    }

    public function createRole($data) {
        if (!$this->hasPermission('manage_roles_structure')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $name = trim($data['name'] ?? '');
        // [PARCHE DE SEGURIDAD]: Evitar pesos negativos
        $weight = max(1, (int)($data['weight'] ?? 1)); 
        $currentWeight = $this->getCurrentAdminWeight();

        if ($currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && $weight >= $currentWeight) {
            return ['success' => false, 'message_key' => 'admin.hierarchical_restriction'];
        }

        if (strlen($name) < 2 || strlen($name) > 50) return ['success' => false, 'message_key' => 'validation.invalid_length'];

        $colorCheck = $this->validateAndFormatRoleColor($data);
        if (!$colorCheck['valid']) return ['success' => false, 'message_key' => $colorCheck['message_key']];

        if ($this->roleRepository->findByName($name)) return ['success' => false, 'message_key' => 'validation.role_exists'];

        if ($this->roleRepository->create($name, $colorCheck['color_string'], $weight)) {
            return ['success' => true, 'message_key' => 'admin.role_created'];
        }

        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function editRole($data) {
        if (!$this->hasPermission('manage_roles_structure')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) return ['success' => false, 'message_key' => 'validation.invalid_data'];

        $existingById = $this->roleRepository->findById($id);
        if (!$existingById) return ['success' => false, 'message_key' => 'admin.role_not_found'];

        $currentWeight = $this->getCurrentAdminWeight();
        $isSystemRole = (isset($existingById['is_system']) ? (int)$existingById['is_system'] === 1 : $id <= SecurityConstants::MAX_SYSTEM_ROLE_ID);

        if ($isSystemRole) {
            $name = $existingById['name'];
            $weight = (int)$existingById['weight'];
        } else {
            $name = trim($data['name'] ?? '');
            // [PARCHE DE SEGURIDAD]: Evitar pesos negativos
            $weight = max(1, (int)($data['weight'] ?? 1));

            if ($currentWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && $weight >= $currentWeight) {
                return ['success' => false, 'message_key' => 'admin.hierarchical_restriction'];
            }

            if (strlen($name) < 2 || strlen($name) > 50) return ['success' => false, 'message_key' => 'validation.invalid_length'];
            
            $existingByName = $this->roleRepository->findByName($name);
            if ($existingByName && $existingByName['id'] !== $id) return ['success' => false, 'message_key' => 'validation.role_exists'];
        }

        $colorCheck = $this->validateAndFormatRoleColor($data);
        if (!$colorCheck['valid']) return ['success' => false, 'message_key' => $colorCheck['message_key']];

        try {
            if ($this->roleRepository->update($id, $name, $colorCheck['color_string'], $weight, $currentWeight)) {
                if (method_exists($this->sessionManager, 'invalidateRoleInPool')) {
                    $this->sessionManager->invalidateRoleInPool($id);
                }
                return ['success' => true, 'message_key' => 'admin.role_updated'];
            }
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message_key' => 'error.unauthorized', 'http_code' => 403];
            }
        }

        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function deleteRole($data) {
        if (!$this->hasPermission('manage_roles_structure')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) return ['success' => false, 'message_key' => 'validation.invalid_data'];

        $existingById = $this->roleRepository->findById($id);
        if (!$existingById) return ['success' => false, 'message_key' => 'admin.role_not_found'];

        $isSystemRole = (isset($existingById['is_system']) ? (int)$existingById['is_system'] === 1 : $id <= SecurityConstants::MAX_SYSTEM_ROLE_ID);
        if ($isSystemRole) {
            return ['success' => false, 'message_key' => 'admin.cannot_delete_base_role', 'http_code' => 403];
        }

        $currentWeight = $this->getCurrentAdminWeight();

        try {
            if ($this->roleRepository->delete($id, $currentWeight)) {
                return ['success' => true, 'message_key' => 'admin.role_deleted'];
            }
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message_key' => 'error.unauthorized', 'http_code' => 403];
            }
        }

        return ['success' => false, 'message_key' => 'error.database'];
    }

    public function getPermissionsList() {
        if ($this->getCurrentAdminWeight() < SecurityConstants::WEIGHT_SUPER_ADMIN) return ['success' => false, 'message_key' => 'error.unauthorized'];
        return ['success' => true, 'permissions' => $this->roleRepository->getAllPermissions()];
    }

    public function getRolePermissions($data) {
        if ($this->getCurrentAdminWeight() < SecurityConstants::WEIGHT_SUPER_ADMIN) return ['success' => false, 'message_key' => 'error.unauthorized'];
        
        $roleId = (int)($data['id'] ?? 0);
        if ($roleId <= 0) return ['success' => false, 'message_key' => 'validation.invalid_data'];

        return ['success' => true, 'permissions' => $this->roleRepository->getRolePermissions($roleId)];
    }

    public function updateRolePermissions($data) {
        if (!$this->hasPermission('manage_roles_structure')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_EDIT_ROLE, 20, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $roleId = (int)($data['id'] ?? 0);
        $permissionsArray = $data['permissions'] ?? [];

        if ($roleId <= 0 || !is_array($permissionsArray)) return ['success' => false, 'message_key' => 'validation.invalid_data'];

        $targetRole = $this->roleRepository->findById($roleId);
        if (!$targetRole) return ['success' => false, 'message_key' => 'admin.role_not_found'];
        
        if ($targetRole['weight'] >= SecurityConstants::WEIGHT_SUPER_ADMIN) {
            return ['success' => false, 'message_key' => 'admin.cannot_edit_superadmin_permissions'];
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
                return ['success' => false, 'message_key' => 'admin.insufficient_privileges_to_grant_critical', 'http_code' => 403];
            }
            if ((int)$targetRole['weight'] < SecurityConstants::WEIGHT_CRITICAL_ROLE_MIN) {
                return ['success' => false, 'message_key' => 'admin.role_weight_too_low_for_critical', 'http_code' => 403];
            }
        }

        try {
            if ($this->roleRepository->assignPermissionsToRole($roleId, $permissionsArray, $currentWeight)) {
                if (method_exists($this->sessionManager, 'invalidateRoleInPool')) {
                    $this->sessionManager->invalidateRoleInPool($roleId);
                }
                return ['success' => true, 'message_key' => 'admin.role_permissions_updated'];
            }
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Security Violation') !== false) {
                return ['success' => false, 'message_key' => 'error.unauthorized', 'http_code' => 403];
            }
        }

        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    public function getServerConfig() {
        if (!$this->hasPermission('manage_server_config')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        return ['success' => true, 'config' => $this->configRepository->getConfig()];
    }

    public function updateServerConfig($data) {
        if (!$this->hasPermission('manage_server_config')) return ['success' => false, 'message_key' => 'error.unauthorized'];

        $password = $data['password'] ?? '';
        $currentUserId = $this->sessionManager->get('user_id');

        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        
        $this->rateLimiter->clear("admin_password_verify_admin_{$currentUserId}");

        $allowedFields = [
            'min_password_length', 'max_password_length', 'min_username_length', 'max_username_length', 'max_avatar_size_mb',
            'session_lifetime_minutes', 'max_active_sessions_per_user', 'allow_registrations', 'registration_rate_limit_attempts', 'registration_rate_limit_minutes',
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
                    if ($field === 'backup_schema_config') {
                        $updateData[$field] = $data['config'][$field];
                    } else {
                        $updateData[$field] = max(0, (int)$data['config'][$field]);
                    }
                }
            }
        }

        if (empty($updateData)) return ['success' => false, 'message_key' => 'validation.invalid_data'];

        if ($this->configRepository->updateConfig($updateData)) {
            return ['success' => true, 'message_key' => 'admin.config_updated'];
        }
        return ['success' => false, 'message_key' => 'error.update_failed'];
    }

    private function _executeMaintenanceDeletion($password, $rateLimitKey, $patterns, $successMessageKey) {
        $currentUserId = $this->sessionManager->get('user_id');

        $rl = $this->applyAdminRateLimit($rateLimitKey, 5, 5);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }

        try {
            $redis = Utils::getRedisClient();
            
            $totalDeleted = 0;
            
            $patterns = is_array($patterns) ? $patterns : [$patterns];

            foreach ($patterns as $pattern) {
                $cursor = '0';
                $count = 100;

                do {
                    $result = $redis->executeRaw(['SCAN', $cursor, 'MATCH', $pattern, 'COUNT', $count]);
                    $cursor = $result[0];
                    $keys = $result[1];

                    if (!empty($keys)) {
                        $deleted = $redis->del($keys);
                        $totalDeleted += $deleted;
                    }
                } while ($cursor !== '0');
            }
            
            return ['success' => true, 'message_key' => $successMessageKey, 'deleted_count' => $totalDeleted];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function flushSessions($data) {
        if (!$this->hasPermission('perform_system_maintenance')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $patterns = [CacheConstants::PREFIX_PHPSESSID . '*', CacheConstants::PREFIX_USER_SESSIONS . '*'];
        return $this->_executeMaintenanceDeletion($data['password'] ?? '', RateLimitConstants::KEY_ADM_FLUSH_SESSIONS, $patterns, 'admin.maintenance_sessions_flushed');
    }

    public function clearSystemCache($data) {
        if (!$this->hasPermission('perform_system_maintenance')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $patterns = [CacheConstants::PATTERN_CACHE, CacheConstants::PATTERN_PR_CACHE];
        return $this->_executeMaintenanceDeletion($data['password'] ?? '', RateLimitConstants::KEY_ADM_REDIS_DELETE, $patterns, 'admin.maintenance_cache_cleared');
    }

    public function resetRateLimits($data) {
        if (!$this->hasPermission('perform_system_maintenance')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $patterns = [CacheConstants::PREFIX_RATE_LIMIT . '*', '*_attempts*', 'login_*', 'register_*'];
        return $this->_executeMaintenanceDeletion($data['password'] ?? '', RateLimitConstants::KEY_ADM_REDIS_DELETE, $patterns, 'admin.maintenance_rate_limits_reset');
    }

    // --- NUEVO MÉTODO: PROTOCOLO DE PÁNICO ---
    public function togglePanicMode($data) {
        if (!$this->hasPermission('perform_system_maintenance')) {
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $password = $data['password'] ?? '';
        $isActive = filter_var($data['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $currentUserId = $this->sessionManager->get('user_id');

        // [PARCHE DE SEGURIDAD]: Validación Sudo-Mode con protección Anti-DoS
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $adminData = $this->userRepository->findById($currentUserId);
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        // Consumir RateLimit Funcional
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_TOGGLE_PANIC, 5, 5);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        try {
            $redis = Utils::getRedisClient();

            if ($isActive) {
                // Activar modo pánico
                $redis->set(CacheConstants::KEY_SYSTEM_PANIC_MODE, '1');
                Logger::critical("SYSTEM PANIC MODE ACTIVATED by admin ID: {$currentUserId}", ['admin_id' => $currentUserId]);
                $messageKey = 'admin.panic_mode_activated';
            } else {
                // Desactivar modo pánico
                $redis->del(CacheConstants::KEY_SYSTEM_PANIC_MODE);
                Logger::info("SYSTEM PANIC MODE DEACTIVATED by admin ID: {$currentUserId}", ['admin_id' => $currentUserId]);
                $messageKey = 'admin.panic_mode_deactivated';
            }

            return ['success' => true, 'message_key' => $messageKey, 'is_active' => $isActive];
        } catch (\Exception $e) {
            Logger::error("Error toggling panic mode via Redis", ['exception' => $e->getMessage()]);
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    private function getBackupDir() {
        $dir = ROOT_PATH . '/storage/backups/';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
            file_put_contents($dir . '.htaccess', "Deny from all\nOptions -Indexes");
        }
        return $dir;
    }

    public function createBackup($data = []) {
        if (!$this->hasPermission('create_backups')) {
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_CREATE, 5, 30);
        if (!$rl['allowed']) {
            return ['success' => false, 'message_key' => $rl['message_key']];
        }
        
        $modules = $data['modules'] ?? ['db' => true, 'avatars_uploaded' => false, 'avatars_default' => false];

        try {
            $redis = Utils::getRedisClient();

            $lockAcquired = $redis->set(CacheConstants::PREFIX_LOCK_BACKUP, '1', 'EX', 1800, 'NX');
            
            if (!$lockAcquired) {
                return ['success' => false, 'message_key' => 'error.backup_in_progress'];
            }

            $jobId = Utils::generateUUID();
            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;

            $redis->hmset($jobKey, ['status' => 'pending', 'message' => 'En cola para ejecución de backup modular...', 'created_at' => time()]);
            $redis->expire($jobKey, 3600);

            $payload = json_encode([
                'job_id' => $jobId, 
                'type' => 'manual', 
                'modules' => $modules,
                'requested_by' => $this->sessionManager->get('user_id')
            ]);
            
            $redis->rpush(CacheConstants::QUEUE_BACKUP, $payload);

            return ['success' => true, 'message_key' => 'admin.backup_queued', 'job_id' => $jobId];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function getBackupSchema() {
        if (!$this->hasPermission('create_backups')) {
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }
        try {
            $dbManager = new DatabaseManager();
            $pdo = $dbManager->getGlobalConnection();
            $stmt = $pdo->query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
            $databases = $stmt->fetchAll(\PDO::FETCH_COLUMN);
            
            $schema = [];
            foreach ($databases as $dbName) {
                $stmtTables = $pdo->query("SHOW TABLES FROM `$dbName`");
                $schema[$dbName] = $stmtTables->fetchAll(\PDO::FETCH_COLUMN);
            }
            return ['success' => true, 'schema' => $schema];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.database'];
        }
    }

    public function createCustomBackup($data) {
        if (!$this->hasPermission('create_backups')) {
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }
        
        $schema = $data['schema'] ?? null;
        $modules = $data['modules'] ?? ['db' => true, 'avatars_uploaded' => false, 'avatars_default' => false];

        if (!$schema || !is_array($schema)) {
            return ['success' => false, 'message_key' => 'validation.invalid_data'];
        }

        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_CREATE, 5, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];
        
        try {
            $redis = Utils::getRedisClient();

            $lockAcquired = $redis->set(CacheConstants::PREFIX_LOCK_BACKUP, '1', 'EX', 1800, 'NX');
            if (!$lockAcquired) {
                return ['success' => false, 'message_key' => 'error.backup_in_progress'];
            }

            $jobId = Utils::generateUUID();
            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;

            $redis->hmset($jobKey, ['status' => 'pending', 'message' => 'En cola para ejecución personalizada modular...', 'created_at' => time()]);
            $redis->expire($jobKey, 3600);
            
            $payload = json_encode([
                'job_id' => $jobId, 
                'type' => 'manual_custom', 
                'schema' => $schema, 
                'modules' => $modules,
                'requested_by' => $this->sessionManager->get('user_id')
            ]);
            $redis->rpush(CacheConstants::QUEUE_BACKUP, $payload);

            return ['success' => true, 'message_key' => 'admin.backup_queued', 'job_id' => $jobId];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function backupStatus($data) {
        if (!$this->hasPermission('create_backups') && !$this->hasPermission('restore_backups')) {
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $jobId = $data['job_id'] ?? '';
        if (empty($jobId)) return ['success' => false, 'message_key' => 'validation.missing_job_id'];

        try {
            $redis = Utils::getRedisClient();

            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;
            if (!$redis->exists($jobKey)) {
                return ['success' => false, 'status' => 'not_found', 'message_key' => 'admin.backup_job_not_found'];
            }

            $statusData = $redis->hgetall($jobKey);
            return ['success' => true, 'status' => $statusData['status'] ?? 'unknown', 'job_message' => $statusData['message'] ?? ''];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function restoreBackup($data) {
        if (!$this->hasPermission('restore_backups')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        
        // [PARCHE DE SEGURIDAD]: Anti-DoS - Consumir RateLimit de Contraseña primero
        $currentUserId = $this->sessionManager->get('user_id');
        $rateCheck = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY, 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message_key' => $rateCheck['message_key']];

        $password = $data['password'] ?? '';
        $adminData = $this->userRepository->findById($currentUserId);
        
        if (!$adminData || !password_verify($password, $adminData['password'])) {
            return ['success' => false, 'message_key' => 'auth.incorrect_password'];
        }
        $this->rateLimiter->clear(RateLimitConstants::KEY_ADM_PASSWORD_VERIFY . "_admin_{$currentUserId}"); // Limpiar en éxito

        // Consumir RateLimit Funcional
        $rl = $this->applyAdminRateLimit(RateLimitConstants::KEY_ADM_BACKUP_RESTORE, 3, 30);
        if (!$rl['allowed']) return ['success' => false, 'message_key' => $rl['message_key']];

        $backupId = $data['backup_id'] ?? '';
        if (empty($backupId)) return ['success' => false, 'message_key' => 'validation.invalid_backup_id'];
        
        $filename = basename(base64_decode($backupId));
        $filepath = $this->getBackupDir() . $filename;
        
        if (!file_exists($filepath) || pathinfo($filename, PATHINFO_EXTENSION) !== 'enc') {
            return ['success' => false, 'message_key' => 'admin.backup_file_missing'];
        }

        try {
            $redis = Utils::getRedisClient();

            $lockAcquired = $redis->set(CacheConstants::PREFIX_LOCK_BACKUP, '1', 'EX', 1800, 'NX');
            if (!$lockAcquired) {
                return ['success' => false, 'message_key' => 'error.backup_in_progress'];
            }

            Utils::enableMaintenance();
            $redis->flushdb();

            $jobId = Utils::generateUUID();
            $jobKey = CacheConstants::PREFIX_BACKUP_JOB . $jobId;

            $redis->hmset($jobKey, ['status' => 'pending', 'message' => 'En cola para restauración...', 'created_at' => time()]);
            $redis->expire($jobKey, 3600);
            $redis->setex(CacheConstants::KEY_SYSTEM_RESTORING, 900, '1');
            
            $payload = json_encode(['job_id' => $jobId, 'type' => 'restore', 'backup_file' => $filename, 'requested_by' => $currentUserId]);
            $redis->rpush(CacheConstants::QUEUE_BACKUP, $payload);

            return ['success' => true, 'message_key' => 'admin.restore_queued', 'job_id' => $jobId];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }

    public function readLogs($data) {
        if (!$this->hasPermission('view_logs')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        $files = $data['files'] ?? [];
        if (!is_array($files) || empty($files)) return ['success' => false, 'message_key' => 'validation.no_files_specified'];
        if (count($files) > 10) return ['success' => false, 'message_key' => 'validation.too_many_files'];

        $contents = [];
        $logBaseDir = realpath(ROOT_PATH . '/logs/');

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
        if (!$this->hasPermission('view_logs')) return ['success' => false, 'message_key' => 'error.unauthorized'];
        
        try {
            $redis = Utils::getRedisClient();

            $isRestoring = $redis->exists(CacheConstants::KEY_SYSTEM_RESTORING);
            return ['success' => true, 'is_running' => (bool)$isRestoring, 'status' => $isRestoring ? 'restoring' : 'finished'];
        } catch (\Exception $e) {
            return ['success' => false, 'message_key' => 'error.redis_communication'];
        }
    }
}
?>