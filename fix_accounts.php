<?php
require "vendor/autoload.php";
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;

$db = new DatabaseManager();
$pdo = $db->getConnection(DatabaseConstants::CONN_IDENTITY);

$stmt = $pdo->query("SELECT id, subscription_tier FROM users LIMIT 1");
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    $userId = $user["id"];
    $tierId = $user["subscription_tier"];
    $stmt = $pdo->prepare("UPDATE accounts SET subscription_tier = ? WHERE owner_id = ?");
    $stmt->execute([$tierId, $userId]);
    echo "Updated account for user {$userId} to tier {$tierId}.\n";
}
?>
