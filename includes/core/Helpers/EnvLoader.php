<?php

namespace App\Core\Helpers;

class EnvLoader {
    public static function load(string $path): void {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (strpos($line, '#') === 0 || empty($line)) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                if (preg_match('/^"(.*)"$/', $value, $matches) || preg_match("/^'(.*)'$/", $value, $matches)) {
                    $value = $matches[1];
                }
                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
    public static function get(string $key) {
        $value = getenv($key);
        if ($value === false) {
            return $_ENV[$key] ?? ($_SERVER[$key] ?? null);
        }
        return $value;
    }
    public static function require(array $keys): void {
        foreach ($keys as $key) {
            if (self::get($key) === null) {
                throw new \Exception("Missing required environment variable: {$key}");
            }
        }
    }
}
?>