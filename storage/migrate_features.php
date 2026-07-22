<?php
require 'vendor/autoload.php';

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

$stmt = $pdo->query("SELECT id, tier_level, features FROM subscription_tiers");
$tiers = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($tiers as $tier) {
    $oldFeatures = json_decode($tier['features'], true) ?? [];
    
    // Default structure
    $newFeatures = [
        'is_popular' => false,
        'price_monthly' => 0.00,
        'price_yearly' => 0.00,
        'limits' => [
            'max_canvases' => $oldFeatures['max_canvases'] ?? 1,
            'max_snapshots_per_canvas' => $oldFeatures['max_snapshots_per_canvas'] ?? 10,
            'max_storage_mb' => $oldFeatures['max_storage_mb'] ?? 20,
            'max_members_per_canvas' => $oldFeatures['max_members_per_canvas'] ?? 10,
        ],
        'benefits_list_1' => [],
        'benefits_list_2_title_key' => '',
        'benefits_list_2' => []
    ];
    
    $level = (int)$tier['tier_level'];
    
    if ($level === 1) { // Plus
        $newFeatures['price_monthly'] = 3.99;
        $newFeatures['price_yearly'] = 39.99;
        $newFeatures['benefits_list_1'] = [
            ['icon' => 'check', 'title_key' => 'plan_card_canvases', 'desc_key' => 'plan_desc_canvases_plus'],
            ['icon' => 'check', 'title_key' => 'plan_card_members', 'desc_key' => 'plan_desc_members_plus'],
            ['icon' => 'check', 'title_key' => 'plan_card_live_share', 'desc_key' => 'plan_desc_live_share']
        ];
    } elseif ($level === 2) { // Pro
        $newFeatures['is_popular'] = true;
        $newFeatures['price_monthly'] = 8.99;
        $newFeatures['price_yearly'] = 89.99;
        $newFeatures['benefits_list_1'] = [
            ['icon' => 'check', 'title_key' => 'plan_card_canvases', 'desc_key' => 'plan_desc_canvases_pro'],
            ['icon' => 'check', 'title_key' => 'plan_card_members', 'desc_key' => 'plan_desc_members_pro']
        ];
        $newFeatures['benefits_list_2_title_key'] = 'plan_feat_title_pro';
        $newFeatures['benefits_list_2'] = [
            ['icon' => 'palette', 'title_key' => 'plan_card_custom_palettes_limit', 'desc_key' => 'plan_desc_custom_palettes_pro'],
            ['icon' => 'admin_panel_settings', 'title_key' => 'plan_card_advanced_roles', 'desc_key' => 'plan_desc_advanced_roles'],
            ['icon' => 'history', 'title_key' => 'plan_card_snapshots', 'desc_key' => 'plan_desc_snapshots_pro']
        ];
    } elseif ($level === 3) { // Ultra
        $newFeatures['price_monthly'] = 19.99;
        $newFeatures['price_yearly'] = 199.99;
        $newFeatures['benefits_list_1'] = [
            ['icon' => 'check', 'title_key' => 'plan_card_canvases', 'desc_key' => 'plan_desc_canvases_ultra'],
            ['icon' => 'check', 'title_key' => 'plan_card_members', 'desc_key' => 'plan_desc_members_ultra'],
            ['icon' => 'check', 'title_key' => 'plan_card_snapshots_unlimited', 'desc_key' => 'plan_desc_snapshots_ultra']
        ];
        $newFeatures['benefits_list_2_title_key'] = 'plan_feat_title_ultra';
        $newFeatures['benefits_list_2'] = [
            ['icon' => 'palette', 'title_key' => 'plan_card_palettes_custom', 'desc_key' => 'plan_desc_custom_palettes_ultra']
        ];
    } else { // Basic/Free
        $newFeatures['benefits_list_1'] = [
            ['icon' => 'check', 'title_key' => 'plan_card_canvases', 'desc_key' => 'plan_desc_canvases_free'],
        ];
    }
    
    $json = json_encode($newFeatures);
    
    $updateStmt = $pdo->prepare("UPDATE subscription_tiers SET features = ? WHERE id = ?");
    $updateStmt->execute([$json, $tier['id']]);
}

echo "Migración completada.\n";
