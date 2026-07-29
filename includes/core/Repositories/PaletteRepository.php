<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\PaletteRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;
use PDO;
use PDOException;
use App\Core\System\Logger;

class PaletteRepository implements PaletteRepositoryInterface {
    private $dbManager;
    private $pdo;

    public function __construct(DatabaseManager $dbManager) {
        $this->dbManager = $dbManager;
        $this->pdo = $dbManager->getConnection(DatabaseConstants::CONN_IDENTITY);
    }

    public function getCustomPalettes(int $userId): array {
        try {
            $stmt = $this->pdo->prepare("SELECT id, palette_key, name, colors FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            $palettes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($palettes as &$p) {
                $p['colors'] = json_decode($p['colors'], true) ?? [];
            }
            return $palettes;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }

    public function createCustomPalette(int $userId, string $paletteKey, string $name, array $colors): bool {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO custom_palettes (user_id, palette_key, name, colors) VALUES (:user_id, :palette_key, :name, :colors)");
            return $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey,
                ':name' => $name,
                ':colors' => json_encode($colors)
            ]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function deleteCustomPalette(int $userId, string $paletteKey): bool {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM custom_palettes WHERE user_id = :user_id AND palette_key = :palette_key");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey
            ]);
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function countCustomPalettes(int $userId): int {
        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            return (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0;
        }
    }
}
