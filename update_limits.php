<?php
require "vendor/autoload.php";
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;

$db = new DatabaseManager();
$pdo = $db->getConnection(DatabaseConstants::CONN_IDENTITY);

$stmt = $pdo->query("SELECT id, name, features FROM subscription_tiers");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $features = json_decode($row["features"], true);
    
    // Limits inside features
    if (isset($features["limits"])) {
        if ($row["name"] == "Plus") {
            $features["limits"]["max_members_per_canvas"] = 1000;
        } else if ($row["name"] == "Pro") {
            $features["limits"]["max_members_per_canvas"] = 10000;
        } else if ($row["name"] == "Ultra") {
            $features["limits"]["max_members_per_canvas"] = 100000;
        }
    } else {
        // Flat limits structure backward compatibility just in case
        if ($row["name"] == "Plus") {
            $features["max_members_per_canvas"] = 1000;
        } else if ($row["name"] == "Pro") {
            $features["max_members_per_canvas"] = 10000;
        } else if ($row["name"] == "Ultra") {
            $features["max_members_per_canvas"] = 100000;
        }
    }
    
    $updateStmt = $pdo->prepare("UPDATE subscription_tiers SET features = ? WHERE id = ?");
    $updateStmt->execute([json_encode($features, JSON_UNESCAPED_UNICODE), $row["id"]]);
    echo "Updated tier: " . $row["name"] . "\n";
}
?>
