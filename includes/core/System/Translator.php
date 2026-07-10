<?php

namespace App\Core\System;

class Translator {
    private static $translations = null;
    private static $cache = [];

    public static function init($lang) {
        $file = ROOT_PATH . '/translations/' . $lang . '/general.json';
        
        if (file_exists($file)) {
            $json = file_get_contents($file);
            self::$translations = json_decode($json, true) ?: [];
        } else {
            self::$translations = [];
        }
        $loadAdmin = false;
        $requestUri = $_SERVER['REQUEST_URI'] ?? '';
        if (strpos($requestUri, '/admin') !== false) {
            $loadAdmin = true;
        }
        if (!$loadAdmin) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (strpos($contentType, 'application/json') !== false) {
                $input = file_get_contents('php://input');
                if (!empty($input)) {
                    $data = json_decode($input, true);
                    if (is_array($data) && isset($data['route']) && strpos($data['route'], 'admin') === 0) {
                        $loadAdmin = true;
                    }
                }
            }
        }
        if (!$loadAdmin && isset($_REQUEST['route']) && strpos($_REQUEST['route'], 'admin') === 0) {
            $loadAdmin = true;
        }
        if ($loadAdmin) {
            self::loadContext($lang, 'admin');
        }
    }

    public static function loadContext($lang, $context = 'admin') {
        $file = ROOT_PATH . '/translations/' . $lang . '/' . $context . '.json';
        
        if (file_exists($file)) {
            $json = file_get_contents($file);
            $newTranslations = json_decode($json, true) ?: [];
            
            if (self::$translations === null) {
                self::$translations = $newTranslations;
            } else {
                self::$translations = array_merge(self::$translations, $newTranslations);
            }
        }
    }

    public static function get($key, $params = []) {
        $text = $key;
        
        if (self::$translations !== null && array_key_exists($key, self::$translations)) {
            $text = self::$translations[$key];
        }
        
        foreach ($params as $paramKey => $paramValue) {
            $text = str_replace('{' . $paramKey . '}', $paramValue, $text);
        }

        return $text; 
    }

    public static function getForLang($lang, $key, $params = []) {
        if (!isset(self::$cache[$lang])) {
            $generalFile = ROOT_PATH . '/translations/' . $lang . '/general.json';
            $adminFile = ROOT_PATH . '/translations/' . $lang . '/admin.json';
            
            $translations = [];
            
            if (file_exists($generalFile)) {
                $json = file_get_contents($generalFile);
                $translations = array_merge($translations, json_decode($json, true) ?: []);
            }
            if (file_exists($adminFile)) {
                $json = file_get_contents($adminFile);
                $translations = array_merge($translations, json_decode($json, true) ?: []);
            }

            self::$cache[$lang] = $translations;
        }

        $text = $key;
        if (array_key_exists($key, self::$cache[$lang])) {
            $text = self::$cache[$lang][$key];
        }

        foreach ($params as $paramKey => $paramValue) {
            $text = str_replace('{' . $paramKey . '}', $paramValue, $text);
        }
        return $text;
    }

    public static function getAll() {
        return self::$translations ?? [];
    }

    public static function getAvailableLanguages() {
        return [
            'en-US' => 'English (United States)',
            'en-GB' => 'English (United Kingdom)',
            'fr-FR' => 'Français (France)',
            'de-DE' => 'Deutsch (Deutschland)',
            'it-IT' => 'Italiano (Italia)',
            'es-419' => 'Español (Latinoamérica)',
            'es-MX' => 'Español (México)',
            'es-ES' => 'Español (España)',
            'pt-BR' => 'Português (Brasil)',
            'pt-PT' => 'Português (Portugal)'
        ];
    }
}
?>