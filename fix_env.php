<?php
$content = file_get_contents('.env');
$content = preg_replace('/\\x00/', '', $content);
$lines = explode("\n", $content);
$cleanLines = [];
foreach ($lines as $line) {
    $line = trim($line);
    if (strpos($line, 'M I N I O') !== false) break;
    if (strpos($line, '#   = = =') !== false) break;
    $cleanLines[] = $line;
}
$cleanLines[] = "";
$cleanLines[] = "# MINIO";
$cleanLines[] = "MINIO_ENDPOINT=minio";
$cleanLines[] = "MINIO_ROOT_USER=admin";
$cleanLines[] = "MINIO_ROOT_PASSWORD=password";
$cleanLines[] = "MINIO_BUCKET=rosaura-storage";

file_put_contents('.env', implode("\n", $cleanLines) . "\n");
echo "Fixed .env\n";
