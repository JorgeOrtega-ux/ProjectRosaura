<?php
// includes/core/Translator.php

namespace App\Core;

class Translator {
    private static $translations = null;

    public static function init($lang) {
        // Buscamos el archivo JSON correspondiente al código de idioma (ej. es-419.json)
        $file = __DIR__ . '/../../translations/' . $lang . '.json';
        
        if (file_exists($file)) {
            $json = file_get_contents($file);
            self::$translations = json_decode($json, true) ?: [];
        } else {
            self::$translations = [];
        }
    }

    public static function get($key) {
        if (self::$translations !== null && array_key_exists($key, self::$translations)) {
            return self::$translations[$key];
        }
        // Si no existe la traducción o el archivo, devuelve la clave misma (Fallback)
        return $key; 
    }

    public static function getAll() {
        return self::$translations ?? [];
    }
}
?>