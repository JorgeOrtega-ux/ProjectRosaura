<?php
// includes/core/System/Logger.php

namespace App\Core\System;

// Se elimina "use Psr\Log\LoggerInterface;" ya que usaremos un enfoque 100% estático
// que se adapta mejor a tu arquitectura actual.

class Logger {
    
    // Mantenemos estos por compatibilidad si alguna parte de tu código viejo aún los usa
    public static function database($message, $level = 'error', $context = []) {
        self::write($level, $message, $context, 'database');
    }
    
    public static function security($message, $level = 'warning', $context = []) {
        self::write($level, $message, $context, 'security');
    }

    // --- MÉTODOS ESTÁTICOS PRINCIPALES ---
    public static function emergency($message, array $context = [], string $category = 'app'): void { self::write('emergency', $message, $context, $category); }
    public static function alert($message, array $context = [], string $category = 'app'): void { self::write('alert', $message, $context, $category); }
    public static function critical($message, array $context = [], string $category = 'app'): void { self::write('critical', $message, $context, $category); }
    public static function error($message, array $context = [], string $category = 'app'): void { self::write('error', $message, $context, $category); }
    public static function warning($message, array $context = [], string $category = 'app'): void { self::write('warning', $message, $context, $category); }
    public static function notice($message, array $context = [], string $category = 'app'): void { self::write('notice', $message, $context, $category); }
    public static function info($message, array $context = [], string $category = 'app'): void { self::write('info', $message, $context, $category); }
    public static function debug($message, array $context = [], string $category = 'app'): void { self::write('debug', $message, $context, $category); }

    // El motor central de escritura
    private static function write($level, $message, array $context = [], string $category = 'app'): void {
        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        $logDir = ROOT_PATH . '/logs/' . $category;

        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
            file_put_contents($logDir . '/.htaccess', "Deny from all\nOptions -Indexes");
        }

        $logFile = $logDir . '/' . $date . '.log';
        
        // Autocaptura de archivo y línea (Ignoramos el propio Logger)
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 3);
        $callerFile = 'Unknown';
        $callerLine = 'Unknown';
        
        foreach ($trace as $frame) {
            if (isset($frame['file']) && strpos($frame['file'], 'Logger.php') === false) {
                // Limpiamos la ruta para que sea relativa y más legible
                $callerFile = str_replace(ROOT_PATH . '/', '', $frame['file']);
                $callerLine = $frame['line'];
                break;
            }
        }

        // Extracción nativa de Excepciones (\Throwable)
        $exceptionData = null;
        if (isset($context['exception']) && $context['exception'] instanceof \Throwable) {
            $e = $context['exception'];
            $exceptionData = [
                'class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
                'trace' => explode("\n", $e->getTraceAsString()) // Convertimos el string a array para un JSON limpio
            ];
            unset($context['exception']); 
        }

        // Construcción de la estructura de log (Estandarizada para indexadores)
        $logData = [
            'timestamp' => "{$date} {$time}",
            'level' => strtoupper($level),
            'category' => $category,
            'message' => $message,
            'source' => "{$callerFile}:{$callerLine}"
        ];

        if (!empty($context)) {
            $logData['context'] = $context;
        }

        if ($exceptionData) {
            $logData['exception'] = $exceptionData;
        }

        // Escribimos en formato JSONL (JSON Lines)
        $formattedMessage = json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }
}
?>