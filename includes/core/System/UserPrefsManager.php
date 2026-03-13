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
            
            $insPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
            $insPref->execute([$userId, $assignedLang]);
            
            $stmtPref->execute([$userId]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
        }
        return $userPrefs;
    }

    /**
     * Obtiene de forma global el idioma activo que está visualizando el usuario.
     * Sirve para que la capa de Repositorio o Servicios pueda ejecutar 
     * traducciones dinámicas o fallback (ej: títulos de los videos).
     * * Orden de prioridad:
     * 1. Cookie 'language' (Prioridad frontend).
     * 2. Si está logueado, preferencia en base de datos.
     * 3. Cabecera HTTP del navegador.
     * 4. Fallback a 'en-US'.
     */
    public static function getActiveLanguage(PDO $pdo = null, $userId = null): string {
        // 1. Verificar cookie local
        if (isset($_COOKIE['language']) && !empty($_COOKIE['language'])) {
            return $_COOKIE['language'];
        }

        // 2. Verificar en la base de datos si tenemos instancia y usuario
        if ($pdo !== null && $userId !== null) {
            $stmt = $pdo->prepare("SELECT language FROM user_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $lang = $stmt->fetchColumn();
            if ($lang) {
                return $lang;
            }
        }

        // 3. Verificar cabecera HTTP
        if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            return Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE']);
        }

        // 4. Default
        return 'en-US';
    }
}
?>