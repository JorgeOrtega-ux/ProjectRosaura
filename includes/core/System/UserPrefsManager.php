<?php

namespace App\Core\System;

use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Helpers\Utils;
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class UserPrefsManager implements UserPrefsManagerInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    public function ensureDefaultPreferences($userId) {
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
}
?>