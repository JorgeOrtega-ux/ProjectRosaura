<?php

namespace App\Core\System;

class Translator {
    private static $translations = null;
    private static $cache = [];

    private static function decodeJsonFile($file) {
        if (!file_exists($file)) {
            return [];
        }
        $json = file_get_contents($file);
        // Eliminar el BOM UTF-8 si existe (\xEF\xBB\xBF)
        if (substr($json, 0, 3) === "\xEF\xBB\xBF") {
            $json = substr($json, 3);
        }
        return json_decode($json, true) ?: [];
    }

    public static function init($lang) {
        $file = ROOT_PATH . '/translations/' . $lang . '/general.json';
        
        self::$translations = self::decodeJsonFile($file);

        // Siempre cargamos el contexto de políticas del sitio (site-policy) ya que se
        // requiere para modales de consentimiento, footers y páginas de políticas en todo el sitio.
        self::loadContext($lang, 'site-policy');

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
                    if (is_array($data) && isset($data['route'])) {
                        if (strpos($data['route'], 'admin') === 0) $loadAdmin = true;
                    }
                }
            }
        }

        if (isset($_REQUEST['route'])) {
            if (strpos($_REQUEST['route'], 'admin') === 0) $loadAdmin = true;
        }

        if ($loadAdmin) {
            self::loadContext($lang, 'admin');
        }
    }

    public static function loadContext($lang, $context = 'admin') {
        $path = ROOT_PATH . '/translations/' . $lang . '/' . $context;
        
        if (is_dir($path)) {
            $files = glob($path . '/*.json');
            foreach ($files as $file) {
                $newTranslations = self::decodeJsonFile($file);
                if (self::$translations === null) {
                    self::$translations = $newTranslations;
                } else {
                    self::$translations = array_merge(self::$translations, $newTranslations);
                }
            }
        } else {
            $file = $path . '.json';
            if (file_exists($file)) {
                $newTranslations = self::decodeJsonFile($file);
                if (self::$translations === null) {
                    self::$translations = $newTranslations;
                } else {
                    self::$translations = array_merge(self::$translations, $newTranslations);
                }
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
            $text = str_replace(':' . $paramKey, $paramValue, $text);
        }

        return $text; 
    }

    public static function getForLang($lang, $key, $params = []) {
        if (!isset(self::$cache[$lang])) {
            $generalFile = ROOT_PATH . '/translations/' . $lang . '/general.json';
            $adminFile = ROOT_PATH . '/translations/' . $lang . '/admin.json';
            
            $translations = [];
            
            $translations = array_merge($translations, self::decodeJsonFile($generalFile));
            $translations = array_merge($translations, self::decodeJsonFile($adminFile));
            
            $sitePolicyPath = ROOT_PATH . '/translations/' . $lang . '/site-policy';
            if (is_dir($sitePolicyPath)) {
                $files = glob($sitePolicyPath . '/*.json');
                foreach ($files as $file) {
                    $translations = array_merge($translations, self::decodeJsonFile($file));
                }
            } else {
                $sitePolicyFile = $sitePolicyPath . '.json';
                if (file_exists($sitePolicyFile)) {
                    $translations = array_merge($translations, self::decodeJsonFile($sitePolicyFile));
                }
            }

            self::$cache[$lang] = $translations;
        }

        $text = $key;
        if (array_key_exists($key, self::$cache[$lang])) {
            $text = self::$cache[$lang][$key];
        } elseif ($lang !== 'es-419') {
            return self::getForLang('es-419', $key, $params);
        }

        foreach ($params as $paramKey => $paramValue) {
            $text = str_replace('{' . $paramKey . '}', $paramValue, $text);
            $text = str_replace(':' . $paramKey, $paramValue, $text);
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