<?php
// includes/core/Logger.php

namespace App\Core;

class Logger {
    const LEVEL_INFO = 'INFO';
    const LEVEL_WARNING = 'WARNING';
    const LEVEL_ERROR = 'ERROR';

    /**
     * Registra logs relacionados con la base de datos.
     */
    public static function database($message, $level = self::LEVEL_ERROR, $context = []) {
        self::write('database', $level, $message, $context);
    }

    /**
     * Registra logs relacionados con seguridad, autenticación, CSRF, correos, etc.
     */
    public static function security($message, $level = self::LEVEL_ERROR, $context = []) {
        self::write('security', $level, $message, $context);
    }

    /**
     * Registra logs generales de la aplicación (reservado para el futuro).
     */
    public static function app($message, $level = self::LEVEL_ERROR, $context = []) {
        self::write('app', $level, $message, $context);
    }

    /**
     * Motor interno para escribir el archivo log.
     */
    private static function write($category, $level, $message, $context = []) {
        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        // La ruta apunta a la carpeta raíz /logs/categoria
        $logDir = __DIR__ . '/../../logs/' . $category;

        // Crear la estructura de directorios si no existe
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
            // Proteger el directorio contra acceso web directo si el servidor no está bien configurado
            file_put_contents($logDir . '/.htaccess', "Deny from all");
        }

        $logFile = $logDir . '/' . $date . '.log';

        // Formatear el contexto extra como JSON si existe
        $contextStr = !empty($context) ? ' | Contexto: ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        
        // Formato: [14:30:00] [ERROR] Hubo una falla | Contexto: {"ip":"127...
        $formattedMessage = "[{$time}] [{$level}] {$message}{$contextStr}" . PHP_EOL;

        // Escribir en el archivo
        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }
}
?>