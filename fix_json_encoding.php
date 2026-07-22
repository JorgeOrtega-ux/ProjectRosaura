<?php
$content = file_get_contents("translations/es-419/general.json");
// Convert from Windows-1252 or whatever it is to UTF-8 if needed
$content = mb_convert_encoding($content, "UTF-8", "auto");
// Strip BOM if present
$content = preg_replace("/^\xEF\xBB\xBF/", "", $content);

$data = json_decode($content, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "Still error: " . json_last_error_msg() . "\n";
} else {
    file_put_contents("translations/es-419/general.json", json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo "Fixed JSON encoding.\n";
}
?>
