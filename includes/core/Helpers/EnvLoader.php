<?php
// includes/core/Helpers/EnvLoader.php

namespace App\Core\Helpers;

class EnvLoader {
    /**
     * Carga y parsea un archivo .env de forma segura.
     * @param string $path Ruta absoluta al archivo .env
     */
    public static function load(string $path): void {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);

            // Ignorar líneas vacías o comentarios
            if (strpos($line, '#') === 0 || empty($line)) {
                continue;
            }

            // Asegurar que la línea contiene una asignación
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Eliminar comillas dobles o simples alrededor del valor de forma segura
                if (preg_match('/^"(.*)"$/', $value, $matches) || preg_match("/^'(.*)'$/", $value, $matches)) {
                    $value = $matches[1];
                }

                // Cargar en el entorno si no existen previamente
                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }

    /**
     * Obtiene una variable de entorno de forma segura.
     */
    public static function get(string $key, $default = null) {
        $value = getenv($key);
        if ($value === false) {
            return $_ENV[$key] ?? ($_SERVER[$key] ?? $default);
        }
        return $value;
    }

    /**
     * Valida que las variables de entorno existan. Útil para el bootstrap.
     */
    public static function require(array $keys): void {
        foreach ($keys as $key) {
            if (self::get($key) === null) {
                throw new \Exception("Falta la variable de entorno obligatoria: {$key}");
            }
        }
    }
}
?>