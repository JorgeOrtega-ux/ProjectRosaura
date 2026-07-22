<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DatabaseConstants::CONN_IDENTITY);
    
    // Add columns if they don't exist
    $pdo->exec("ALTER TABLE subscription_tiers ADD COLUMN uuid CHAR(36) NULL AFTER id, ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER uuid");
    
    // Generate UUIDs for existing rows
    $stmt = $pdo->query("SELECT id FROM subscription_tiers WHERE uuid IS NULL");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $updateStmt = $pdo->prepare("UPDATE subscription_tiers SET uuid = ? WHERE id = ?");
    
    foreach ($rows as $row) {
        // Generate v4 UUID
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        $uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        
        $updateStmt->execute([$uuid, $row['id']]);
        echo "Updated tier {$row['id']} with UUID {$uuid}\n";
    }
    
    // Make UUID UNIQUE and NOT NULL
    $pdo->exec("ALTER TABLE subscription_tiers MODIFY COLUMN uuid CHAR(36) NOT NULL, ADD UNIQUE INDEX (uuid)");
    
    echo "Migration completed successfully.\n";
} catch (\Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Columns already exist.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
