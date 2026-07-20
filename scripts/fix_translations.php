<?php

function fixMojibake(string $text): string {
    if (strpos($text, 'Ã') !== false || strpos($text, 'Â') !== false || preg_match('/[\xC2\xC3]/', $text)) {
        $decoded = @utf8_decode($text);
        if ($decoded !== false && $decoded !== '') {
            return $decoded;
        }
    }
    return $text;
}

function processTranslationFile(string $filepath): void {
    if (!file_exists($filepath)) {
        echo "[!] File not found: {$filepath}\n";
        return;
    }

    $raw = file_get_contents($filepath);
    // Strip UTF-8 BOM
    $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        echo "[!] Failed to parse JSON in {$filepath}: " . json_last_error_msg() . "\n";
        // Find line of error
        for ($i = 1; $i <= strlen($raw); $i++) {
            $sub = substr($raw, 0, $i);
            json_decode($sub);
            if (json_last_error() === JSON_ERROR_SYNTAX) {
                $line = substr_count($sub, "\n") + 1;
                echo "    Error around line: $line\n";
                break;
            }
        }
        return;
    }

    $fixedCount = 0;
    foreach ($data as $key => $value) {
        if (is_string($value)) {
            $fixed = fixMojibake($value);
            if ($fixed !== $value) {
                $data[$key] = $fixed;
                $fixedCount++;
            }
        }
    }

    // Fix store_content_title if present
    if (isset($data['store_content_title'])) {
        $data['store_content_title'] = "Tienda de Contenido";
    }

    echo "[+] Fixed {$fixedCount} entries in {$filepath}\n";

    $newJson = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($filepath, $newJson);
}

processTranslationFile('/var/www/html/translations/es-419/general.json');
processTranslationFile('/var/www/html/translations/es-419/admin.json');

echo "[+] Done fixing translations!\n";
