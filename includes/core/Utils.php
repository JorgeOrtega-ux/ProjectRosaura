<?php
// includes/core/Utils.php

namespace App\Core;

class Utils {
    
    /**
     * Genera un UUID v4 de forma aleatoria.
     * @return string
     */
    public static function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Genera una foto de perfil predeterminada usando la inicial del nombre.
     * @param string $username Nombre de usuario para extraer la inicial.
     * @param string $uuid Identificador para nombrar el archivo físico.
     * @return string|false Ruta relativa de la imagen creada o false si hay error.
     */
    public static function generateProfilePicture($username, $uuid) {
        $initial = mb_substr($username, 0, 1, "UTF-8");
        
        $allowedColors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        $randomColor = $allowedColors[array_rand($allowedColors)];
        
        $url = "https://ui-avatars.com/api/?name=" . urlencode($initial) . "&background=" . $randomColor . "&color=fff&size=512&font-size=0.5";
        
        $imageContent = @file_get_contents($url);
        
        if ($imageContent === false) {
            return false;
        }

        $storageDir = __DIR__ . '/../../public/storage/profilePictures/default/';
        
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0777, true);
        }

        $fileName = $uuid . '.png';
        $filePath = $storageDir . $fileName;

        file_put_contents($filePath, $imageContent);

        return 'public/storage/profilePictures/default/' . $fileName;
    }

    /**
     * Genera un token CSRF único para la sesión actual y lo almacena.
     * @return string
     */
    public static function generateCSRFToken() {
        if (empty($_SESSION['csrf_token'])) {
            // Genera una cadena aleatoria criptográficamente segura
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Valida si un token proporcionado coincide con el de la sesión.
     * @param string $token
     * @return bool
     */
    public static function validateCSRFToken($token) {
        if (empty($_SESSION['csrf_token']) || empty($token)) {
            return false;
        }
        // hash_equals previene ataques de sincronización (timing attacks)
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    /**
     * Analiza el header de idioma HTTP_ACCEPT_LANGUAGE y devuelve el idioma más cercano disponible.
     * @param string $acceptLanguage
     * @return string
     */
    public static function getClosestLanguage($acceptLanguage) {
        $available = [
            'en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 
            'es-419', 'es-MX', 'es-ES', 'pt-BR', 'pt-PT'
        ];
        
        if (empty($acceptLanguage)) return 'en-US';

        // Extrae todos los idiomas solicitados y los ordena por su prioridad "q"
        preg_match_all('/([a-z]{1,8}(-[a-z]{1,8})?)\s*(;\s*q\s*=\s*(1|0\.[0-9]+))?/i', $acceptLanguage, $lang_parse);
        $langs = [];
        if (count($lang_parse[1])) {
            $langs = array_combine($lang_parse[1], $lang_parse[4]);
            foreach ($langs as $lang => $val) {
                if ($val === '') $langs[$lang] = 1;
            }
            arsort($langs, SORT_NUMERIC);
        }

        foreach ($langs as $lang => $q) {
            $lang = str_replace('_', '-', $lang);
            
            // 1. Coincidencia exacta (ej. es-MX)
            foreach ($available as $avail) {
                if (strcasecmp($lang, $avail) === 0) {
                    return $avail;
                }
            }
            
            // 2. Coincidencia base/fallback (ej. es-AR -> detecta 'es' y asigna 'es-419')
            $base = strtolower(explode('-', $lang)[0]);
            if ($base === 'es') return 'es-419';
            if ($base === 'en') return 'en-US';
            if ($base === 'pt') return 'pt-BR';
            if ($base === 'fr') return 'fr-FR';
            if ($base === 'de') return 'de-DE';
            if ($base === 'it') return 'it-IT';
        }

        // Si nada coincide, inglés por defecto.
        return 'en-US'; 
    }
}
?>