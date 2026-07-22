<?php
$host = 'db';
$db   = 'db_identity';
$user = 'system_web_executor';
$pass = 'e4b3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

$sql = "
INSERT IGNORE INTO subscription_tiers (id, tier_level, name, color, stripe_price_id_monthly, stripe_price_id_yearly) VALUES
  (1, 0, 'Basic', '{\"type\":\"solid\",\"colors\":[{\"hex\":\"#808080\",\"percentage\":100}]}', NULL, NULL),
  (2, 1, 'Plus', '{\"type\":\"solid\",\"colors\":[{\"hex\":\"#28a745\",\"percentage\":100}]}', 'price_plus_monthly', 'price_plus_yearly'),
  (3, 2, 'Pro', '{\"type\":\"solid\",\"colors\":[{\"hex\":\"#ffc107\",\"percentage\":100}]}', 'price_pro_monthly', 'price_pro_yearly'),
  (4, 3, 'Ultra', '{\"type\":\"gradient\",\"angle\":0,\"colors\":[{\"hex\":\"#ff0000\",\"percentage\":20},{\"hex\":\"#ffff00\",\"percentage\":30},{\"hex\":\"#00ff00\",\"percentage\":60},{\"hex\":\"#0000ff\",\"percentage\":90},{\"hex\":\"#ff0000\",\"percentage\":100}]}', 'price_ultra_monthly', 'price_ultra_yearly')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  color = VALUES(color);
";

try {
    $pdo->exec($sql);
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
