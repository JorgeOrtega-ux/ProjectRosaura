<?php
require_once __DIR__ . '/vendor/autoload.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
$pdo->exec("ALTER TABLE subscription_tiers ADD COLUMN feat_live_share TINYINT(1) NOT NULL DEFAULT 0 AFTER feat_inject_templates");
$pdo->exec("UPDATE subscription_tiers SET feat_live_share = 1 WHERE tier_level >= 2");
echo "Done";
