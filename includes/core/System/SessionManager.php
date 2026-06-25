<?php
// includes/core/System/SessionManager.php

namespace App\Core\System;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\System\Logger;
use App\Core\System\SessionConstants;
use App\Core\System\CacheConstants;
use Exception;
use Predis\Client;

class SessionManager implements SessionManagerInterface {
    
    private $redis;

    public function __construct(Client $redis) {
        $this->redis = $redis;
        $this->start();
    }

    public function start(): void {
        try {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            $this->getCsrfToken();
            
            if (!$this->has(SessionConstants::KEY_LINKED_ACCOUNTS)) {
                $this->set(SessionConstants::KEY_LINKED_ACCOUNTS, []);
            }
            
            // Garantizamos la lectura pasiva de invalidación en cada ciclo de solicitud
            $this->enforcePassiveInvalidation();

        } catch (Exception $e) {
            Logger::error("Failed to start session", ['exception' => $e]);
        }
    }

    public function set(string $key, $value): void {
        $_SESSION[$key] = $value;
    }

    public function get(string $key, $default = null) {
        return $_SESSION[$key] ?? $default;
    }

    public function has(string $key): bool {
        return isset($_SESSION[$key]);
    }

    public function remove(string $key): void {
        unset($_SESSION[$key]);
    }

    public function destroy(): void {
        try {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            session_unset();
            session_destroy();
        } catch (Exception $e) {
            Logger::error("Failed to destroy session completely", ['exception' => $e]);
        }
    }

    public function regenerate(bool $deleteOldSession = true): bool {
        try {
            return session_regenerate_id($deleteOldSession);
        } catch (Exception $e) {
            Logger::error("Failed to regenerate session ID", ['exception' => $e]);
            return false;
        }
    }

    public function isLoggedIn(): bool {
        return $this->has(SessionConstants::KEY_ACTIVE_ACCOUNT) && !empty($this->get(SessionConstants::KEY_LINKED_ACCOUNTS, []));
    }

    public function getActiveAccountId(): ?int {
        return $this->get(SessionConstants::KEY_ACTIVE_ACCOUNT);
    }

    public function getActiveAccountAsn(): ?string {
        return $this->get('user_asn');
    }

    // NOTA DE IMPLEMENTACIÓN: Helper nuevo para obtener el Tier desde la sesión
    public function getSubscriptionTier(): int {
        return (int) $this->get('subscription_tier', 0);
    }

    public function getLinkedAccounts(): array {
        return $this->get(SessionConstants::KEY_LINKED_ACCOUNTS, []);
    }

    public function syncRootState(): void {
        $activeId = $this->getActiveAccountId();
        $accounts = $this->getLinkedAccounts();
        
        if ($activeId && isset($accounts[$activeId])) {
            $activeData = $accounts[$activeId];
            foreach ($activeData as $key => $value) {
                if ($key !== SessionConstants::KEY_LAST_ACCESSED && $key !== SessionConstants::KEY_CSRF_TOKEN && $key !== SessionConstants::KEY_SESSION_CREATED_AT) {
                    $this->set($key, $value);
                }
            }
        } else {
            foreach (SessionConstants::ROOT_KEYS as $key) {
                $this->remove($key);
            }
            $this->remove('user_asn'); 
        }
    }

    public function addAccount(int $userId, array $userData): bool {
        $accounts = $this->getLinkedAccounts();
        
        if (count($accounts) >= SessionConstants::MAX_CONCURRENT_ACCOUNTS && !isset($accounts[$userId])) {
            return false; 
        }

        $accounts[$userId] = array_merge($userData, [
            SessionConstants::KEY_LAST_ACCESSED => time(),
            SessionConstants::KEY_SESSION_CREATED_AT => time()
        ]);
        
        if (!isset($accounts[$userId][SessionConstants::KEY_CSRF_TOKEN])) {
            $accounts[$userId][SessionConstants::KEY_CSRF_TOKEN] = bin2hex(random_bytes(32));
        }
        
        $this->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
        $this->set(SessionConstants::KEY_ACTIVE_ACCOUNT, $userId); 
        
        $this->syncRootState();
        
        return true;
    }

    public function switchActiveAccount(int $userId): bool {
        $accounts = $this->getLinkedAccounts();
        
        if (isset($accounts[$userId])) {
            $this->regenerate(true);
            
            $this->set(SessionConstants::KEY_ACTIVE_ACCOUNT, $userId);
            $accounts[$userId][SessionConstants::KEY_LAST_ACCESSED] = time();
            $this->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            
            $this->syncRootState();
            
            return true;
        }
        
        return false;
    }

    public function removeAccount(int $userId): void {
        $this->removeAccountSilently($userId);
    }

    public function getCsrfToken(): string {
        $activeId = $this->getActiveAccountId();
        
        if ($activeId) {
            $accounts = $this->getLinkedAccounts();
            if (!isset($accounts[$activeId][SessionConstants::KEY_CSRF_TOKEN])) {
                $accounts[$activeId][SessionConstants::KEY_CSRF_TOKEN] = bin2hex(random_bytes(32));
                $this->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            }
            return $accounts[$activeId][SessionConstants::KEY_CSRF_TOKEN];
        }

        if (!$this->has(SessionConstants::KEY_CSRF_TOKEN)) {
            $this->set(SessionConstants::KEY_CSRF_TOKEN, bin2hex(random_bytes(32)));
        }
        return $this->get(SessionConstants::KEY_CSRF_TOKEN);
    }

    public function validateCsrfToken(string $token): bool {
        $activeId = $this->getActiveAccountId();
        
        if ($activeId) {
            $accounts = $this->getLinkedAccounts();
            $expectedToken = $accounts[$activeId][SessionConstants::KEY_CSRF_TOKEN] ?? '';
            return hash_equals($expectedToken, $token);
        }

        return hash_equals($this->get(SessionConstants::KEY_CSRF_TOKEN, ''), $token);
    }

    public function destroyUserSessions(int $userId): void {
        $this->invalidateAccountInPool($userId);
    }

    public function flushAllSessionsForUser(int $userId): void {
        try {
            $idxKey = CacheConstants::PREFIX_USER_SESSIONS . $userId;
            $sessionIds = $this->redis->smembers($idxKey);
            
            if (!empty($sessionIds)) {
                foreach ($sessionIds as $sessionId) {
                    $this->redis->del(CacheConstants::PREFIX_PHPSESSID . $sessionId);
                }
            }
            
            $this->redis->del($idxKey);
            $this->invalidateAccountInPool($userId);

        } catch (Exception $e) {
            Logger::error("Failed to flush all active sessions for user", ['user_id' => $userId, 'exception' => $e]);
        }
    }

    public function destroySessionsByRoleId(int $roleId): void {
        $this->invalidateRoleInPool($roleId);
    }

    public function destroySessionsByRoles(array $roleIds): void {
        foreach ($roleIds as $roleId) {
            $this->invalidateRoleInPool((int)$roleId);
        }
    }

    public function invalidateAccountInPool(int $userId): void {
        try {
            $this->redis->setex(CacheConstants::PREFIX_FORCE_REAUTH_USER . $userId, CacheConstants::TTL_ONE_DAY, time());
        } catch (Exception $e) {
            Logger::error("Failed to mark user for passive invalidation", ['exception' => $e]);
        }
    }

    public function invalidateDeviceInPool(string $selector): void {
        try {
            $this->redis->setex(CacheConstants::PREFIX_FORCE_REAUTH_DEVICE . $selector, CacheConstants::TTL_ONE_DAY, time());
        } catch (Exception $e) {
            Logger::error("Failed to mark selector for passive invalidation", ['exception' => $e]);
        }
    }

    public function restoreAccountInPool(int $userId): void {
        try {
            $this->redis->del(CacheConstants::PREFIX_FORCE_REAUTH_USER . $userId);
        } catch (Exception $e) {
            Logger::error("Failed to restore user in pool", ['exception' => $e]);
        }
    }

    public function invalidateRoleInPool(int $roleId): void {
        try {
            $this->redis->setex(CacheConstants::PREFIX_FORCE_REAUTH_ROLE . $roleId, CacheConstants::TTL_ONE_DAY, time());
        } catch (Exception $e) {
            Logger::error("Failed to mark role for passive invalidation", ['exception' => $e]);
        }
    }

    public function enforcePassiveInvalidation(): void {
        $accounts = $this->getLinkedAccounts();
        if (empty($accounts)) return;

        try {
            $accountsToDrop = [];

            foreach ($accounts as $userId => $accountData) {
                $sessionCreatedAt = $accountData[SessionConstants::KEY_SESSION_CREATED_AT] ?? 0;

                $currentSelector = \App\Core\Helpers\Utils::getCurrentDeviceSelector($userId);
                $selectorReauthTime = (!empty($currentSelector)) ? $this->redis->get(CacheConstants::PREFIX_FORCE_REAUTH_DEVICE . $currentSelector) : null;

                if ($selectorReauthTime !== null && $sessionCreatedAt < (int)$selectorReauthTime) {
                    $accountsToDrop[] = $userId;
                    continue;
                }

                $userReauthTime = $this->redis->get(CacheConstants::PREFIX_FORCE_REAUTH_USER . $userId);
                if ($userReauthTime !== null && $sessionCreatedAt < (int)$userReauthTime) {
                    $accountsToDrop[] = $userId;
                    continue;
                }

                $roles = $accountData['user_roles'] ?? [];
                foreach ($roles as $roleId) {
                    $roleReauthTime = $this->redis->get(CacheConstants::PREFIX_FORCE_REAUTH_ROLE . $roleId);
                    if ($roleReauthTime !== null && $sessionCreatedAt < (int)$roleReauthTime) {
                        $accountsToDrop[] = $userId;
                        break; 
                    }
                }
            }

            foreach ($accountsToDrop as $userId) {
                $this->removeAccountSilently($userId);
            }

        } catch (Exception $e) {
            Logger::error("Passive invalidation check failed", ['exception' => $e]);
        }
    }

    private function removeAccountSilently(int $userId): void {
        $accounts = $this->getLinkedAccounts();
        if (isset($accounts[$userId])) {
            unset($accounts[$userId]);
            $this->set(SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
            
            if ($this->get(SessionConstants::KEY_ACTIVE_ACCOUNT) === $userId) {
                if (!empty($accounts)) {
                    $firstAvailableId = array_key_first($accounts);
                    $this->set(SessionConstants::KEY_ACTIVE_ACCOUNT, $firstAvailableId);
                    $this->syncRootState();
                } else {
                    $this->remove(SessionConstants::KEY_ACTIVE_ACCOUNT);
                    $this->syncRootState();
                    $this->destroy(); 
                }
            }
        }
    }
}
?>