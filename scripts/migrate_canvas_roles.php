<?php
require_once __DIR__ . '/../vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/../.env');

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_CANVASES);

    echo "Starting canvas roles migration...\n";

    // 1. Create new tables
    $sql = "
    CREATE TABLE IF NOT EXISTS `canvas_roles` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `canvas_id` int(11) DEFAULT NULL,
      `name` varchar(50) NOT NULL,
      `weight` int(11) NOT NULL DEFAULT 1,
      `is_system` tinyint(1) NOT NULL DEFAULT 0,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      CONSTRAINT `fk_cr_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE,
      UNIQUE KEY `idx_canvas_role_name` (`canvas_id`, `name`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS `canvas_permissions` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `name` varchar(100) NOT NULL,
      `description` varchar(255) DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `name` (`name`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS `canvas_role_permissions` (
      `role_id` int(11) NOT NULL,
      `permission_id` int(11) NOT NULL,
      PRIMARY KEY (`role_id`, `permission_id`),
      CONSTRAINT `fk_crp_role` FOREIGN KEY (`role_id`) REFERENCES `canvas_roles` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_crp_permission` FOREIGN KEY (`permission_id`) REFERENCES `canvas_permissions` (`id`) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS `canvas_user_roles` (
      `canvas_id` int(11) NOT NULL,
      `user_id` int(11) NOT NULL,
      `role_id` int(11) NOT NULL,
      PRIMARY KEY (`canvas_id`, `user_id`, `role_id`),
      CONSTRAINT `fk_cur_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE,
      CONSTRAINT `fk_cur_role` FOREIGN KEY (`role_id`) REFERENCES `canvas_roles` (`id`) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
    ";
    
    $pdo->exec($sql);
    echo "Tables created successfully.\n";

    // 2. Insert Base Roles
    $pdo->exec("
        INSERT IGNORE INTO canvas_roles (id, canvas_id, name, weight, is_system) VALUES
        (1, NULL, 'Usuario', 1, 1),
        (2, NULL, 'Moderator', 50, 1),
        (3, NULL, 'Administrator', 80, 1),
        (4, NULL, 'SuperAdministrator', 100, 1);
    ");
    echo "Base roles inserted.\n";

    // 3. Insert Permissions
    $pdo->exec("
        INSERT IGNORE INTO canvas_permissions (id, name, description) VALUES
        (1, 'place_pixels', 'desc_place_pixels'),
        (2, 'manage_settings', 'desc_manage_settings'),
        (3, 'manage_members', 'desc_manage_members'),
        (4, 'manage_roles', 'desc_manage_roles'),
        (5, 'assign_roles', 'desc_assign_roles'),
        (6, 'view_history', 'desc_view_history'),
        (7, 'manage_resets', 'desc_manage_resets');
    ");
    echo "Permissions inserted.\n";

    // 4. Assign Permissions to Roles
    $pdo->exec("
        INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
        (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7),
        (3, 1), (3, 2), (3, 3), (3, 5), (3, 6), (3, 7),
        (2, 1), (2, 3), (2, 6),
        (1, 1);
    ");
    echo "Permissions assigned to roles.\n";

    // 5. Migrate Existing Users
    // First, map everyone from canvas_members to canvas_user_roles based on current 'role' ENUM
    $stmt = $pdo->query("SELECT canvas_id, user_id, role FROM canvas_members");
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also get owners
    $stmt = $pdo->query("SELECT id as canvas_id, owner_id FROM canvases WHERE owner_id IS NOT NULL");
    $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $insertUserRole = $pdo->prepare("INSERT IGNORE INTO canvas_user_roles (canvas_id, user_id, role_id) VALUES (?, ?, ?)");

    // Give owners SuperAdministrator
    foreach ($owners as $owner) {
        $insertUserRole->execute([$owner['canvas_id'], $owner['owner_id'], 4]);
    }
    
    foreach ($members as $member) {
        $roleId = 1; // Default to Usuario
        if ($member['role'] === 'editor') $roleId = 2; // Moderator
        if ($member['role'] === 'admin') $roleId = 3; // Administrator
        
        $insertUserRole->execute([$member['canvas_id'], $member['user_id'], $roleId]);
    }
    echo "Users migrated to new role system.\n";

    // 6. Optional: Drop the 'role' column from canvas_members
    // $pdo->exec("ALTER TABLE canvas_members DROP COLUMN role;");
    // echo "Dropped 'role' column from canvas_members.\n";

    echo "Migration completed successfully!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
