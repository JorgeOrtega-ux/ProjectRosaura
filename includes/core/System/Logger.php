<?php

namespace App\Core\System;

class Logger {
    public static function database($message, $level = 'error', $context = []) {
        self::write($level, $message, $context, 'database');
    }
    
    public static function security($message, $level = 'warning', $context = []) {
        self::write($level, $message, $context, 'security');
    }
    public static function emergency($message, array $context = [], string $category = 'app'): void { self::write('emergency', $message, $context, $category); }
    public static function alert($message, array $context = [], string $category = 'app'): void { self::write('alert', $message, $context, $category); }
    public static function critical($message, array $context = [], string $category = 'app'): void { self::write('critical', $message, $context, $category); }
    public static function error($message, array $context = [], string $category = 'app'): void { self::write('error', $message, $context, $category); }
    public static function warning($message, array $context = [], string $category = 'app'): void { self::write('warning', $message, $context, $category); }
    public static function notice($message, array $context = [], string $category = 'app'): void { self::write('notice', $message, $context, $category); }
    public static function info($message, array $context = [], string $category = 'app'): void { self::write('info', $message, $context, $category); }
    public static function debug($message, array $context = [], string $category = 'app'): void { self::write('debug', $message, $context, $category); }
    private static function write($level, $message, array $context = [], string $category = 'app'): void {
        // Auto-detect database category if default 'app' category was passed
        if ($category === 'app') {
            if (self::isDatabaseError($message, $context)) {
                $category = 'database';
            }
        }

        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        $logDir = ROOT_PATH . '/storage/private/logs/' . $category;

        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
            file_put_contents($logDir . '/.htaccess', "Deny from all\nOptions -Indexes");
        }

        $logFile = $logDir . '/' . $date . '.log';
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5);
        $callerFile = 'Unknown';
        $callerLine = 'Unknown';
        
        foreach ($trace as $frame) {
            if (isset($frame['file']) && strpos($frame['file'], 'Logger.php') === false) {
                $callerFile = str_replace(ROOT_PATH . '/', '', $frame['file']);
                $callerLine = $frame['line'];
                break;
            }
        }
        $exceptionData = null;
        if (isset($context['exception']) && $context['exception'] instanceof \Throwable) {
            $e = $context['exception'];
            $exceptionData = [
                'class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
                'trace' => explode("\n", $e->getTraceAsString())
            ];
            unset($context['exception']); 
        }
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
        $formattedMessage = json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }

    private static function isDatabaseError($message, array $context): bool {
        if (isset($context['exception']) && $context['exception'] instanceof \Throwable) {
            $e = $context['exception'];
            if ($e instanceof \PDOException || ($e->getPrevious() && $e->getPrevious() instanceof \PDOException)) {
                return true;
            }
        }

        $searchString = (is_string($message) ? $message : '') . ' ' . json_encode($context);
        $dbKeywords = [
            'Database error',
            'Database Exception',
            'PDOException',
            'SQLSTATE',
            'Base table or view not found',
            'Unknown column',
            'Syntax error or access violation',
            'Table doesn\'t exist',
            'Column not found',
            'Connection refused',
            'SYSTEM_DB_OFFLINE',
            'database failure'
        ];

        foreach ($dbKeywords as $keyword) {
            if (stripos($searchString, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }
}
?>