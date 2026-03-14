<?php
// includes/core/System/UserPrefsManager.php

namespace App\Core\System;

use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Helpers\Utils;
use PDO;

class UserPrefsManager implements UserPrefsManagerInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function ensureDefaultPreferences($userId) {
        $stmtPref = $this->pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
        $stmtPref->execute([$userId]);
        $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

        if (!$userPrefs) {
            $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $assignedLang = Utils::getClosestLanguage($acceptLang);
            
            $insPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, measurement_system, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 'metric', 1, 'system', 0)");
            $insPref->execute([$userId, $assignedLang]);
            
            $stmtPref->execute([$userId]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
        }
        return $userPrefs;
    }

    /**
     * Obtiene de forma global el idioma activo que está visualizando el usuario.
     */
    public static function getActiveLanguage(PDO $pdo = null, $userId = null): string {
        if (isset($_COOKIE['language']) && !empty($_COOKIE['language'])) {
            return $_COOKIE['language'];
        }

        if ($pdo !== null && $userId !== null) {
            $stmt = $pdo->prepare("SELECT language FROM user_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $lang = $stmt->fetchColumn();
            if ($lang) {
                return $lang;
            }
        }

        if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            return Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        }

        return 'en-US';
    }

    /**
     * Obtiene de forma global el sistema de medición activo ('metric' o 'imperial').
     */
    public static function getActiveMeasurementSystem(PDO $pdo = null, $userId = null): string {
        if (isset($_COOKIE['measurement_system']) && !empty($_COOKIE['measurement_system'])) {
            return $_COOKIE['measurement_system'];
        }

        if ($pdo !== null && $userId !== null) {
            $stmt = $pdo->prepare("SELECT measurement_system FROM user_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $sys = $stmt->fetchColumn();
            if ($sys) {
                return $sys;
            }
        }

        return 'metric';
    }
}
?>