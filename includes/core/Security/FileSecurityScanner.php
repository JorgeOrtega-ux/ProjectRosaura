<?php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;
use Exception;

class FileSecurityScanner {
    private const CLAMAV_CHUNK_SIZE = 8192;
    private const MAX_HEURISTIC_SCAN_BYTES = 10485760; // 10MB

    /**
     * Scan a file path for malware, viruses, and malicious embedded payloads.
     *
     * @param string $filePath Absolute path to the file to scan
     * @return array ['clean' => bool, 'threat' => ?string, 'engine' => string]
     */
    public static function scanFile(string $filePath): array {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return ['clean' => false, 'threat' => 'file_unreadable', 'engine' => 'system'];
        }

        // 1. Try ClamAV Daemon via TCP Socket
        $clamHost = EnvLoader::get('CLAMAV_HOST', '');
        $clamPort = (int)EnvLoader::get('CLAMAV_PORT', 3310);

        if (!empty($clamHost)) {
            $clamResult = self::scanViaClamAvDaemon($filePath, $clamHost, $clamPort);
            if ($clamResult !== null) {
                if (!$clamResult['clean']) {
                    Logger::security("Malware detected by ClamAV daemon", 'critical', [
                        'file' => basename($filePath),
                        'threat' => $clamResult['threat']
                    ]);
                }
                return $clamResult;
            }
        }

        // 2. Try local clamscan binary if present
        $cliResult = self::scanViaClamScanCli($filePath);
        if ($cliResult !== null) {
            if (!$cliResult['clean']) {
                Logger::security("Malware detected by ClamAV CLI", 'critical', [
                    'file' => basename($filePath),
                    'threat' => $cliResult['threat']
                ]);
            }
            return $cliResult;
        }

        // 3. Fallback to Deep Heuristic Polyglot and WebShell Inspector
        $heuristicResult = self::scanViaHeuristics($filePath);
        if (!$heuristicResult['clean']) {
            Logger::security("Malicious signature detected by Heuristic Scanner", 'critical', [
                'file' => basename($filePath),
                'threat' => $heuristicResult['threat']
            ]);
        }

        return $heuristicResult;
    }

    /**
     * Scan file via ClamAV clamd TCP daemon using INSTREAM protocol.
     */
    private static function scanViaClamAvDaemon(string $filePath, string $host, int $port): ?array {
        $socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 2.0);
        if (!$socket) {
            return null;
        }

        try {
            stream_set_timeout($socket, 5);
            fwrite($socket, "zINSTREAM\0");

            $fp = fopen($filePath, 'rb');
            if (!$fp) {
                fclose($socket);
                return null;
            }

            while (!feof($fp)) {
                $chunk = fread($fp, self::CLAMAV_CHUNK_SIZE);
                $length = pack('N', strlen($chunk));
                fwrite($socket, $length . $chunk);
            }
            fclose($fp);

            // Zero-length chunk marks EOF in INSTREAM protocol
            fwrite($socket, pack('N', 0));

            $response = trim(fgets($socket));
            fclose($socket);

            if (str_ends_with($response, 'OK')) {
                return ['clean' => true, 'threat' => null, 'engine' => 'clamav_daemon'];
            }

            if (preg_match('/stream:\s+(.+?)\s+FOUND/i', $response, $matches)) {
                return ['clean' => false, 'threat' => $matches[1], 'engine' => 'clamav_daemon'];
            }

            return null;
        } catch (Exception $e) {
            if (is_resource($socket)) fclose($socket);
            return null;
        }
    }

    /**
     * Scan file via local clamscan CLI binary.
     */
    private static function scanViaClamScanCli(string $filePath): ?array {
        if (!function_exists('exec')) {
            return null;
        }

        $escapedPath = escapeshellarg($filePath);
        $output = [];
        $returnCode = 0;

        @exec("clamscan --no-summary {$escapedPath} 2>&1", $output, $returnCode);

        // 0: Clean, 1: Infected, other: not installed or error
        if ($returnCode === 0) {
            return ['clean' => true, 'threat' => null, 'engine' => 'clamscan_cli'];
        } elseif ($returnCode === 1) {
            $threat = 'Infection detected';
            if (!empty($output[0]) && preg_match('/: (.+) FOUND/i', $output[0], $m)) {
                $threat = $m[1];
            }
            return ['clean' => false, 'threat' => $threat, 'engine' => 'clamscan_cli'];
        }

        return null;
    }

    /**
     * Deep Heuristic Scanner: inspects magic bytes, polyglots, and embedded server-side payloads.
     */
    public static function scanViaHeuristics(string $filePath): array {
        $fp = fopen($filePath, 'rb');
        if (!$fp) {
            return ['clean' => true, 'threat' => null, 'engine' => 'heuristics'];
        }

        $header = fread($fp, 512);
        
        // Check for Executable Magic Bytes
        if (str_starts_with($header, "MZ")) {
            fclose($fp);
            return ['clean' => false, 'threat' => 'Executable.PE.Windows', 'engine' => 'heuristics'];
        }
        if (str_starts_with($header, "\x7fELF")) {
            fclose($fp);
            return ['clean' => false, 'threat' => 'Executable.ELF.Linux', 'engine' => 'heuristics'];
        }
        if (str_starts_with($header, "\xca\xfe\xba\xbe") || str_starts_with($header, "\xfe\xed\xfa\xce") || str_starts_with($header, "\xcf\xfa\xed\xfe")) {
            fclose($fp);
            return ['clean' => false, 'threat' => 'Executable.MachO.Apple', 'engine' => 'heuristics'];
        }

        // Scan full contents for embedded webshell & script injection patterns
        fseek($fp, 0);
        $content = fread($fp, self::MAX_HEURISTIC_SCAN_BYTES);
        fclose($fp);

        $suspiciousPatterns = [
            'Webshell.PHP.Tag' => '/<\?(php|=|\s)/i',
            'Webshell.ASP.Tag' => '/<%(=\s*|\s)/i',
            'Webshell.Script.Exec' => '/<script\b[^>]*\blanguage\s*=\s*["\']?(php|vbscript)["\']?/i',
            'Exploit.PHP.Backdoor' => '/(passthru|shell_exec|system|base64_decode\s*\(\s*["\'][A-Za-z0-9+\/=]{30,}|eval\s*\(\s*(gzuncompress|gzinflate|base64_decode|\$_POST|\$_GET|\$_REQUEST))\b/i',
            'Exploit.Polyglot.SVG.Script' => '/<svg\b[^>]*>.*?<script\b/is',
            'Exploit.HTML.Iframe' => '/<iframe\b[^>]*\bsrc\s*=\s*["\']?javascript:/i'
        ];

        foreach ($suspiciousPatterns as $threatName => $pattern) {
            if (preg_match($pattern, $content)) {
                return ['clean' => false, 'threat' => $threatName, 'engine' => 'heuristics'];
            }
        }

        return ['clean' => true, 'threat' => null, 'engine' => 'heuristics'];
    }
}
