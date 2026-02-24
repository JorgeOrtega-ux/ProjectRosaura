<?php
// includes/core/System/Logger.php

namespace App\Core\System;

use Psr\Log\LoggerInterface;

class Logger implements LoggerInterface {
    
    // Mantenemos estos estáticos por compatibilidad con tu código actual
    // mientras terminas la migración completa
    public static function database($message, $level = 'error', $context = []) {
        (new self())->log($level, $message, $context, 'database');
    }
    public static function security($message, $level = 'warning', $context = []) {
        (new self())->log($level, $message, $context, 'security');
    }

    // --- MÉTODOS ESTANDARIZADOS DE PSR-3 ---
    public function emergency($message, array $context = []): void { $this->log('emergency', $message, $context); }
    public function alert($message, array $context = []): void { $this->log('alert', $message, $context); }
    public function critical($message, array $context = []): void { $this->log('critical', $message, $context); }
    public function error($message, array $context = []): void { $this->log('error', $message, $context); }
    public function warning($message, array $context = []): void { $this->log('warning', $message, $context); }
    public function notice($message, array $context = []): void { $this->log('notice', $message, $context); }
    public function info($message, array $context = []): void { $this->log('info', $message, $context); }
    public function debug($message, array $context = []): void { $this->log('debug', $message, $context); }

    public function log($level, $message, array $context = [], string $category = 'app'): void {
        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        // SE AGREGÓ UN ../ EXTRA A LA RUTA
        $logDir = __DIR__ . '/../../../logs/' . $category;

        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
            file_put_contents($logDir . '/.htaccess', "Deny from all");
        }

        $logFile = $logDir . '/' . $date . '.log';
        $contextStr = !empty($context) ? ' | Contexto: ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        $formattedMessage = "[{$time}] [" . strtoupper($level) . "] {$message}{$contextStr}" . PHP_EOL;

        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }
}
?>