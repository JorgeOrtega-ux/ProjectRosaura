<?php
require __DIR__ . '/../vendor/autoload.php';

$appRoot = dirname(__DIR__);
\App\Core\Helpers\EnvLoader::load($appRoot . '/.env');

try {
    $db = new \App\Config\Database\DatabaseManager();
    $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

    $sqlCreateTable = "
    CREATE TABLE IF NOT EXISTS `store_perk_packages` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `uuid` CHAR(36) UNIQUE DEFAULT NULL,
      `perk_id` VARCHAR(100) UNIQUE NOT NULL,
      `name` varchar(100) NOT NULL,
      `description` varchar(255) DEFAULT NULL,
      `price_coins` INT NOT NULL DEFAULT 0,
      `icon` varchar(50) DEFAULT 'shield',
      `is_single_use` tinyint(1) NOT NULL DEFAULT 1,
      `is_active` tinyint(1) NOT NULL DEFAULT 1,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
    ";

    $pdo->exec($sqlCreateTable);
    echo "Table store_perk_packages created or already exists.\n";

    // Insert original 9 perks
    $perks = [
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000001',
            'perk_id' => 'proteccion_pixeles_1',
            'name' => 'store_content_proteccion_pixeles_1_name',
            'description' => 'store_content_proteccion_pixeles_1_desc',
            'price_coins' => 2000,
            'icon' => 'shield',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000002',
            'perk_id' => 'pixel_misil_1',
            'name' => 'store_content_pixel_misil_1_name',
            'description' => 'store_content_pixel_misil_1_desc',
            'price_coins' => 500,
            'icon' => 'rocket_launch',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000003',
            'perk_id' => 'bomba_pixel_1',
            'name' => 'store_content_bomba_pixel_1_name',
            'description' => 'store_content_bomba_pixel_1_desc',
            'price_coins' => 1000,
            'icon' => 'bomb',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000004',
            'perk_id' => 'bomba_racimo_1',
            'name' => 'store_content_bomba_racimo_1_name',
            'description' => 'store_content_bomba_racimo_1_desc',
            'price_coins' => 2500,
            'icon' => 'scatter_plot',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000005',
            'perk_id' => 'bomba_atomica_1',
            'name' => 'store_content_bomba_atomica_1_name',
            'description' => 'store_content_bomba_atomica_1_desc',
            'price_coins' => 5000,
            'icon' => 'crisis_alert',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000006',
            'perk_id' => 'lluvia_meteoritos_1',
            'name' => 'store_content_lluvia_meteoritos_1_name',
            'description' => 'store_content_lluvia_meteoritos_1_desc',
            'price_coins' => 10000,
            'icon' => 'storm',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000007',
            'perk_id' => 'canon_orbital_1',
            'name' => 'store_content_canon_orbital_1_name',
            'description' => 'store_content_canon_orbital_1_desc',
            'price_coins' => 15000,
            'icon' => 'satellite_alt',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000008',
            'perk_id' => 'agujero_negro_1',
            'name' => 'store_content_agujero_negro_1_name',
            'description' => 'store_content_agujero_negro_1_desc',
            'price_coins' => 20000,
            'icon' => 'cyclone',
            'is_single_use' => 1,
            'is_active' => 1
        ],
        [
            'uuid' => 'e0000000-0000-0000-0000-000000000009',
            'perk_id' => 'minas_1',
            'name' => 'store_content_minas_1_name',
            'description' => 'store_content_minas_1_desc',
            'price_coins' => 1500,
            'icon' => 'radar',
            'is_single_use' => 1,
            'is_active' => 1
        ]
    ];

    $stmt = $pdo->prepare("
        INSERT INTO `store_perk_packages` 
        (uuid, perk_id, name, description, price_coins, icon, is_single_use, is_active)
        VALUES (:uuid, :perk_id, :name, :description, :price_coins, :icon, :is_single_use, :is_active)
        ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            description = VALUES(description),
            price_coins = VALUES(price_coins),
            icon = VALUES(icon),
            is_single_use = VALUES(is_single_use),
            is_active = VALUES(is_active)
    ");

    foreach ($perks as $perk) {
        $stmt->execute($perk);
    }

    echo "Initial perks populated/updated.\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
