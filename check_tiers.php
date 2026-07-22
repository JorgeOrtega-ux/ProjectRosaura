<?php
require "vendor/autoload.php";
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;

$db = new DatabaseManager();
$pdo = $db->getConnection(DatabaseConstants::CONN_IDENTITY);

// Get Tiers
$stmt = $pdo->query("SELECT id, name, tier_level FROM subscription_tiers");
echo "TIERS:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row["id"] . " - " . $row["name"] . " (Level " . $row["tier_level"] . ")\n";
}

// Get User
$stmt = $pdo->query("SELECT id, email, subscription_tier FROM users LIMIT 1");
echo "\nUSER:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $row["id"] . " - " . $row["email"] . " (Tier ID " . $row["subscription_tier"] . ")\n";
}

// Get Subscriptions
$stmt = $pdo->query("SELECT id, user_id, tier_id, status FROM subscriptions LIMIT 1");
echo "\nSUBSCRIPTIONS:\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: " . $row["id"] . ", User: " . $row["user_id"] . ", Tier: " . $row["tier_id"] . ", Status: " . $row["status"] . "\n";
}
?>
