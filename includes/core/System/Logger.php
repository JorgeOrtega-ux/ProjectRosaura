<?php

namespace App\Core\System;

use App\Core\Helpers\EnvLoader;
use Exception;

class Logger {
    private static ?string $hmacKey = null;

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

    /**
     * Retrieve or derive HMAC signing key for cryptographic log integrity.
     */
    private static function getHmacKey(): string {
        if (self::$hmacKey !== null) {
            return self::$hmacKey;
        }

        $key = EnvLoader::get('LOG_HMAC_KEY', '')
            ?: EnvLoader::get('APP_KEY', '')
            ?: EnvLoader::get('INTERNAL_API_SECRET', 'rosaura_log_integrity_default_hmac_secret');

        self::$hmacKey = hash('sha256', $key, true);
        return self::$hmacKey;
    }

    /**
     * Get genesis hash for a daily log chain.
     */
    private static function getGenesisHash(string $category, string $date): string {
        return hash_hmac('sha256', "GENESIS_{$date}_{$category}", self::getHmacKey());
    }

    /**
     * Write structured log with HMAC cryptographic chaining and optional SIEM streaming.
     */
    private static function write($level, $message, array $context = [], string $category = 'app'): void {
        // Auto-detect database category if default 'app' category was passed
        if ($category === 'app') {
            if (self::isDatabaseError($message, $context)) {
                $category = 'database';
            }
        }

        $date = date('Y-m-d');
        $time = date('H:i:s');
        
        $rootPath = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
        $logDir = $rootPath . '/storage/private/logs/' . $category;

        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
            @file_put_contents($logDir . '/.htaccess', "Deny from all\nOptions -Indexes");
        }

        $logFile = $logDir . '/' . $date . '.log';
        $stateFile = $logDir . '/' . $date . '.hmac_state';

        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 5);
        $callerFile = 'Unknown';
        $callerLine = 'Unknown';
        
        foreach ($trace as $frame) {
            if (isset($frame['file']) && strpos($frame['file'], 'Logger.php') === false) {
                $callerFile = str_replace($rootPath . '/', '', $frame['file']);
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

        // --- Cryptographic HMAC Chaining (NIST SP 800-92) ---
        $hmacKey = self::getHmacKey();
        $prevHmac = file_exists($stateFile) ? trim((string)@file_get_contents($stateFile)) : self::getGenesisHash($category, $date);
        
        $canonicalPayload = json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $entryHmac = hash_hmac('sha256', $prevHmac . '|' . $canonicalPayload, $hmacKey);

        $logData['_prev_hmac'] = $prevHmac;
        $logData['_hmac'] = $entryHmac;

        $formattedMessage = json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

        @file_put_contents($logFile, $formattedMessage, FILE_APPEND | LOCK_EX);
        @file_put_contents($stateFile, $entryHmac, LOCK_EX);

        // --- Real-time Streaming to SIEM Collector (Wazuh / ELK / Syslog) ---
        self::streamToSiem($logData);
    }

    /**
     * Stream structured log event to remote SIEM receiver (Wazuh/ELK/Logstash/Syslog) via UDP/TCP.
     */
    private static function streamToSiem(array $logData): void {
        $siemHost = EnvLoader::get('SIEM_HOST', '');
        if (empty($siemHost)) {
            return;
        }

        $siemPort = (int)EnvLoader::get('SIEM_PORT', 514);
        $siemProto = strtolower(EnvLoader::get('SIEM_PROTOCOL', 'udp'));

        try {
            $payload = json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
            $remote = ($siemProto === 'tcp' ? 'tcp://' : 'udp://') . "{$siemHost}:{$siemPort}";
            
            $socket = @stream_socket_client($remote, $errno, $errstr, 0.5, STREAM_CLIENT_ASYNC_CONNECT);
            if ($socket) {
                stream_set_timeout($socket, 1);
                @fwrite($socket, $payload);
                @fclose($socket);
            }
        } catch (\Throwable $e) {
            // Fail open to never disrupt web requests if SIEM is unreachable
        }
    }

    /**
     * Verify the cryptographic HMAC integrity chain of a daily log file.
     * Returns whether the log file has been tampered with or if any lines were modified/deleted.
     *
     * @param string $category
     * @param string $date Format YYYY-MM-DD
     * @return array
     */
    public static function verifyLogIntegrity(string $category, string $date): array {
        $rootPath = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
        $logFile = $rootPath . '/storage/private/logs/' . $category . '/' . $date . '.log';

        if (!file_exists($logFile)) {
            return [
                'valid' => false,
                'error' => 'Log file not found',
                'file' => $logFile
            ];
        }

        $hmacKey = self::getHmacKey();
        $expectedPrevHmac = self::getGenesisHash($category, $date);
        
        $handle = fopen($logFile, 'r');
        if (!$handle) {
            return ['valid' => false, 'error' => 'Unable to open log file'];
        }

        $lineNumber = 0;
        while (($line = fgets($handle)) !== false) {
            $lineNumber++;
            $line = trim($line);
            if (empty($line)) continue;

            $record = json_decode($line, true);
            if (!is_array($record) || !isset($record['_hmac']) || !isset($record['_prev_hmac'])) {
                fclose($handle);
                return [
                    'valid' => false,
                    'tampered_line' => $lineNumber,
                    'error' => 'Missing HMAC signature in log record'
                ];
            }

            $recordedHmac = $record['_hmac'];
            $recordedPrevHmac = $record['_prev_hmac'];

            // 1. Check previous hash chain consistency
            if ($recordedPrevHmac !== $expectedPrevHmac) {
                fclose($handle);
                return [
                    'valid' => false,
                    'tampered_line' => $lineNumber,
                    'error' => 'Chain broken: previous HMAC mismatch (records may have been deleted or reordered)',
                    'expected_prev' => $expectedPrevHmac,
                    'found_prev' => $recordedPrevHmac
                ];
            }

            // 2. Reconstruct original unhashed payload
            unset($record['_hmac']);
            unset($record['_prev_hmac']);
            $canonicalPayload = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $calculatedHmac = hash_hmac('sha256', $recordedPrevHmac . '|' . $canonicalPayload, $hmacKey);

            if (!hash_equals($calculatedHmac, $recordedHmac)) {
                fclose($handle);
                return [
                    'valid' => false,
                    'tampered_line' => $lineNumber,
                    'error' => 'Tampered content: HMAC signature mismatch',
                    'expected_hmac' => $calculatedHmac,
                    'found_hmac' => $recordedHmac
                ];
            }

            $expectedPrevHmac = $recordedHmac;
        }

        fclose($handle);

        return [
            'valid' => true,
            'category' => $category,
            'date' => $date,
            'total_verified_records' => $lineNumber,
            'latest_chain_hash' => $expectedPrevHmac
        ];
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