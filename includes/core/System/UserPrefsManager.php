<?php
// includes/core/System/UserPrefsManager.php

namespace App\Core\System;

use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Helpers\Utils;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB; // IMPORTACIÓN DE CONSTANTES
use PDO;

class UserPrefsManager implements UserPrefsManagerInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        // USO DE LA CONSTANTE DE CONEXIÓN
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    public function ensureDefaultPreferences($userId) {
        // USO DE LA CONSTANTE DE TABLA
        $tblUserPrefs = DB::TBL_USER_PREFERENCES;

        $stmtPref = $this->pdo->prepare("SELECT * FROM {$tblUserPrefs} WHERE user_id = ?");
        $stmtPref->execute([$userId]);
        $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

        if (!$userPrefs) {
            $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $assignedLang = Utils::getClosestLanguage($acceptLang);
            $themeSystem = DB::THEME_SYSTEM; // USO DE LA CONSTANTE DE TEMA
            
            $insPref = $this->pdo->prepare("INSERT INTO {$tblUserPrefs} (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, ?, 0)");
            $insPref->execute([$userId, $assignedLang, $themeSystem]);
            
            $stmtPref->execute([$userId]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
        }
        return $userPrefs;
    }
}
?>