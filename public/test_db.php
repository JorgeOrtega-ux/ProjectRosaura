<?php
require 'f:\htdocs\ProjectRosaura\vendor\autoload.php';
$envPath = 'f:\htdocs\ProjectRosaura\.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        putenv($line);
        list($name, $value) = explode('=', $line, 2);
        $_ENV[$name] = trim($value);
    }
}
$host = $_ENV['DB_HOST'];
$user = $_ENV['DB_USER'];
$pass = $_ENV['DB_PASS'] ?? '';
$pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->query("SHOW DATABASES WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')");
$databases = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "Databases: ";
print_r($databases);
