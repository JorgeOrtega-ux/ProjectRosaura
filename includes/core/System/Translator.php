<?php
// includes/core/System/Translator.php

namespace App\Core\System;

class Translator {
    private static $translations = null;

    public static function init($lang) {
        // Utilizamos la constante absoluta para no depender de la ubicación del archivo
        $file = ROOT_PATH . '/translations/' . $lang . '.json';
        
        if (file_exists($file)) {
            $json = file_get_contents($file);
            self::$translations = json_decode($json, true) ?: [];
        } else {
            self::$translations = [];
        }
    }

    // AHORA ACEPTA PARÁMETROS PARA REEMPLAZO DINÁMICO
    public static function get($key, $params = []) {
        $text = $key; // Fallback inicial a la clave misma
        
        if (self::$translations !== null && array_key_exists($key, self::$translations)) {
            $text = self::$translations[$key];
        }
        
        // Reemplazar las variables dinámicas en el texto {variable}
        foreach ($params as $paramKey => $paramValue) {
            $text = str_replace('{' . $paramKey . '}', $paramValue, $text);
        }

        return $text; 
    }

    public static function getAll() {
        return self::$translations ?? [];
    }
}
?>