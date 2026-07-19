<?php

require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Core\Helpers\Utils;

try {
    $host = $_ENV['DB_HOST'] ?? 'db';
    $dbname = $_ENV['DB_IDENTITY_NAME'] ?? 'rosaura_identity';
    $user = $_ENV['DB_USER'] ?? 'root';
    $pass = $_ENV['DB_PASS'] ?? '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "[*] Fetching all users from database...\n";
    $stmt = $pdo->query("SELECT id, username FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "[*] Found " . count($users) . " users. Starting migration...\n";

    $updatedCount = 0;
    foreach ($users as $u) {
        $newRelPath = Utils::generateProfilePicture($u['username']);
        
        $updateStmt = $pdo->prepare("UPDATE users SET profile_picture = :pic WHERE id = :id");
        $updateStmt->execute([
            ':pic' => $newRelPath,
            ':id' => $u['id']
        ]);
        $updatedCount++;
    }

    echo "[+] Migration completed. Successfully updated {$updatedCount} users to use deterministic default avatars.\n";

} catch (\Exception $e) {
    echo "[!] Migration failed: " . $e->getMessage() . "\n";
}
