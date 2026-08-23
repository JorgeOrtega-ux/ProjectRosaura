<?php

namespace App\Core\System;

use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Helpers\Utils;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use PDO;

class UserPrefsManager implements UserPrefsManagerInterface {
    private $pdo;
    private $redisClient;

    public function __construct(DatabaseManager $db, ?RedisCache $redisCache = null) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    public function ensureDefaultPreferences($userId) {
        $cacheKey = CacheConstants::PREFIX_USER_PREFS . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $tblUserPrefs = DB::TBL_USER_PREFERENCES;

        $stmtPref = $this->pdo->prepare("SELECT * FROM {$tblUserPrefs} WHERE user_id = ?");
        $stmtPref->execute([$userId]);
        $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

        if (!$userPrefs) {
            $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $assignedLang = Utils::getClosestLanguage($acceptLang);
            $themeSystem = DB::THEME_SYSTEM;
            $insPref = $this->pdo->prepare("INSERT INTO {$tblUserPrefs} (user_id, language, open_links_new_tab, theme, extended_alerts, allow_telemetry) VALUES (?, ?, 1, ?, 0, 1)");
            $insPref->execute([$userId, $assignedLang, $themeSystem]);
            
            $stmtPref->execute([$userId]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
        }

        if ($userPrefs && $this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($userPrefs));
            } catch (\Throwable $e) {}
        }

        return $userPrefs;
    }

    public function getPreference($userId, string $key, $default = null) {
        $prefs = $this->ensureDefaultPreferences($userId);
        
        if (isset($prefs[$key])) {
            if ($prefs[$key] === '1' || $prefs[$key] === 1) return true;
            if ($prefs[$key] === '0' || $prefs[$key] === 0) return false;
            return $prefs[$key];
        }
        
        return $default;
    }

    public function getUserFlags($userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_FLAGS . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $tblFlags = DB::TBL_USER_FLAGS;
        $stmt = $this->pdo->prepare("SELECT flag_key FROM {$tblFlags} WHERE user_id = ?");
        $stmt->execute([$userId]);
        $flags = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        if ($this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($flags));
            } catch (\Throwable $e) {}
        }

        return $flags;
    }
}
?>