<?php

namespace App\Core\Repositories;

use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\MonetizationRepositoryInterface;
use App\Core\System\CacheConstants;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\Logger;
use PDO;
use PDOException;
use Predis\Client;

class MonetizationRepository implements MonetizationRepositoryInterface {
    private DatabaseManager $db;
    private ?Client $redis;
    private ?PDO $pdo = null;

    public function __construct(DatabaseManager $db, ?Client $redis = null) {
        $this->db = $db;
        $this->redis = $redis;
    }

    private function getPdo(): ?PDO {
        if ($this->pdo === null) {
            try {
                $this->pdo = $this->db->getConnection(DB::CONN_MONETIZATION);
            } catch (\Throwable $e) {
                $this->_autoProvisionDatabase();
                try {
                    $this->pdo = $this->db->getConnection(DB::CONN_MONETIZATION);
                } catch (\Throwable $err) {
                    Logger::error('Failed connecting to monetization database: ' . $err->getMessage());
                    return null;
                }
            }
        }
        return $this->pdo;
    }

    private function _autoProvisionDatabase(): void {
        try {
            $globalPdo = $this->db->getGlobalConnection();
            $dbname = $_ENV['DB_MONETIZATION_NAME'] ?? 'db_monetization';
            $globalPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;");

            $pdo = $this->db->getConnection(DB::CONN_MONETIZATION);
            $tblSettings = DB::TBL_AD_MONETIZATION_SETTINGS;
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `{$tblSettings}` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `test_mode` tinyint(1) NOT NULL DEFAULT 0,
                    `adblock_notice_enabled` tinyint(1) NOT NULL DEFAULT 0,
                    `default_provider` varchar(50) NOT NULL DEFAULT 'mock',
                    `adsense_client_id` varchar(100) NOT NULL DEFAULT 'ca-pub-0000000000000000',
                    `adsense_auto_ads` tinyint(1) NOT NULL DEFAULT 0,
                    `custom_header_scripts` text DEFAULT NULL,
                    `exempt_roles` varchar(255) NOT NULL DEFAULT '[\"3\",\"4\"]',
                    `exempt_tiers` varchar(255) NOT NULL DEFAULT '[\"1\",\"2\",\"3\"]',
                    `feed_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `feed_ad_interval` int(11) NOT NULL DEFAULT 8,
                    `feed_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
                    `feed_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
                    `feed_adsense_layout_key` varchar(100) NOT NULL DEFAULT '-fb+5w+4e-db+86',
                    `feed_mock_title` varchar(150) NOT NULL DEFAULT 'Patrocinado',
                    `feed_mock_desc` varchar(255) NOT NULL DEFAULT 'Explora lienzos colaborativos y funciones exclusivas en Rosaura',
                    `feed_mock_badge` varchar(50) NOT NULL DEFAULT 'Patrocinado',
                    `feed_mock_cta_text` varchar(50) NOT NULL DEFAULT 'Descubrir más',
                    `feed_mock_cta_url` varchar(255) NOT NULL DEFAULT '/upgrade',
                    `feed_mock_image_url` varchar(255) NOT NULL DEFAULT '',
                    `feed_custom_html` text DEFAULT NULL,
                    `modal_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `modal_ad_cooldown_seconds` int(11) NOT NULL DEFAULT 180,
                    `modal_ad_duration_seconds` int(11) NOT NULL DEFAULT 5,
                    `modal_ad_pod_size` int(11) NOT NULL DEFAULT 1,
                    `modal_ad_muted_default` tinyint(1) NOT NULL DEFAULT 1,
                    `modal_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
                    `modal_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
                    `modal_mock_sponsor_title` varchar(150) NOT NULL DEFAULT 'Rosaura Cloud',
                    `modal_mock_sponsor_tagline` varchar(255) NOT NULL DEFAULT 'Infraestructura de renderizado colaborativo ultrarrápida',
                    `modal_mock_sponsor_url` varchar(255) NOT NULL DEFAULT 'https://rosaura.io',
                    `modal_mock_sponsor_avatar` varchar(100) NOT NULL DEFAULT 'cloud_done',
                    `modal_custom_html` text DEFAULT NULL,
                    `drawer_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `drawer_ad_palette_enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `drawer_ad_templates_enabled` tinyint(1) NOT NULL DEFAULT 1,
                    `drawer_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
                    `drawer_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
                    `drawer_mock_title` varchar(150) NOT NULL DEFAULT 'Paletas y Plantillas Pro',
                    `drawer_mock_tagline` varchar(255) NOT NULL DEFAULT 'Desbloquea exportaciones ilimitadas y tokens',
                    `drawer_mock_cta_url` varchar(255) NOT NULL DEFAULT '/upgrade',
                    `drawer_mock_cta_text` varchar(50) NOT NULL DEFAULT 'Ver planes',
                    `drawer_mock_badge` varchar(50) NOT NULL DEFAULT 'PRO',
                    `drawer_custom_html` text DEFAULT NULL,
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`)
                ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
            ");
            $pdo->exec("
                INSERT IGNORE INTO `{$tblSettings}` (`id`, `enabled`, `default_provider`) VALUES (1, 1, 'mock');
            ");
        } catch (\Throwable $e) {
            Logger::error('Auto provision monetization DB error: ' . $e->getMessage());
        }
    }

    public function getDefaultConfig(): array {
        return [
            'enabled' => 1,
            'test_mode' => 0,
            'adblock_notice_enabled' => 0,
            'default_provider' => 'mock',
            'adsense_client_id' => 'ca-pub-0000000000000000',
            'adsense_auto_ads' => 0,
            'custom_header_scripts' => '',
            'exempt_roles' => '["3","4"]',
            'exempt_tiers' => '["1","2","3"]',

            'feed_ads_enabled' => 1,
            'feed_ad_interval' => 8,
            'feed_ad_provider' => 'mock',
            'feed_adsense_slot' => '0000000000',
            'feed_adsense_layout_key' => '-fb+5w+4e-db+86',
            'feed_mock_title' => 'Patrocinado',
            'feed_mock_desc' => 'Explora lienzos colaborativos y funciones exclusivas en Rosaura',
            'feed_mock_badge' => 'Patrocinado',
            'feed_mock_cta_text' => 'Descubrir más',
            'feed_mock_cta_url' => '/upgrade',
            'feed_mock_image_url' => '',
            'feed_custom_html' => '',

            'modal_ads_enabled' => 1,
            'modal_ad_cooldown_seconds' => 180,
            'modal_ad_duration_seconds' => 5,
            'modal_ad_pod_size' => 1,
            'modal_ad_muted_default' => 1,
            'modal_ad_provider' => 'mock',
            'modal_adsense_slot' => '0000000000',
            'modal_mock_sponsor_title' => 'Rosaura Cloud',
            'modal_mock_sponsor_tagline' => 'Infraestructura de renderizado colaborativo ultrarrápida',
            'modal_mock_sponsor_url' => 'https://rosaura.io',
            'modal_mock_sponsor_avatar' => 'cloud_done',
            'modal_custom_html' => '',

            'drawer_ads_enabled' => 1,
            'drawer_ad_palette_enabled' => 1,
            'drawer_ad_templates_enabled' => 1,
            'drawer_ad_provider' => 'mock',
            'drawer_adsense_slot' => '0000000000',
            'drawer_mock_title' => 'Paletas y Plantillas Pro',
            'drawer_mock_tagline' => 'Desbloquea exportaciones ilimitadas y tokens',
            'drawer_mock_cta_url' => '/upgrade',
            'drawer_mock_cta_text' => 'Ver planes',
            'drawer_mock_badge' => 'PRO',
            'drawer_custom_html' => ''
        ];
    }

    public function getConfig(): array {
        $cacheKey = 'system:monetization_config';
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $data = json_decode($cached, true);
                    if (is_array($data)) {
                        return array_merge($this->getDefaultConfig(), $data);
                    }
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
        if (!$pdo) {
            return $this->getDefaultConfig();
        }

        $tbl = DB::TBL_AD_MONETIZATION_SETTINGS;
        try {
            $stmt = $pdo->query("SELECT * FROM `{$tbl}` LIMIT 1");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $merged = array_merge($this->getDefaultConfig(), $row);
                if ($this->redis) {
                    try {
                        $this->redis->setex($cacheKey, 3600, json_encode($merged));
                    } catch (\Throwable $e) {}
                }
                return $merged;
            }
        } catch (\Throwable $e) {
            $this->_autoProvisionDatabase();
        }

        return $this->getDefaultConfig();
    }

    public function updateConfig(array $data): bool {
        $pdo = $this->getPdo();
        if (!$pdo) return false;

        $tbl = DB::TBL_AD_MONETIZATION_SETTINGS;
        $allowedFields = array_keys($this->getDefaultConfig());
        $fieldsToUpdate = [];
        $params = [];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $fieldsToUpdate[] = "`{$field}` = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }

        if (empty($fieldsToUpdate)) return false;

        $sql = "UPDATE `{$tbl}` SET " . implode(', ', $fieldsToUpdate) . " WHERE `id` = 1";

        try {
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);

            if ($this->redis) {
                try {
                    $this->redis->del(['system:monetization_config']);
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (\Throwable $e) {
            Logger::error('Error updating monetization config: ' . $e->getMessage());
            return false;
        }
    }

    public function resetConfig(): bool {
        return $this->updateConfig($this->getDefaultConfig());
    }

    public function getCampaigns(?string $search = null, ?string $placement = null, int $page = 1, int $perPage = 20): array {
        $pdo = $this->getPdo();
        if (!$pdo) {
            return ['campaigns' => [], 'total' => 0, 'page' => 1, 'totalPages' => 1];
        }

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        $where = [];
        $params = [];

        if (!empty($search)) {
            $where[] = "(`name` LIKE :search OR `title` LIKE :search OR `description` LIKE :search)";
            $params[':search'] = '%' . trim($search) . '%';
        }

        if (!empty($placement)) {
            $where[] = "`placement` = :placement";
            $params[':placement'] = $placement;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        try {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `{$tbl}` {$whereClause}");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();

            $totalPages = max(1, (int)ceil($total / $perPage));
            $offset = ($page - 1) * $perPage;

            $stmt = $pdo->prepare("SELECT * FROM `{$tbl}` {$whereClause} ORDER BY `priority` DESC, `id` DESC LIMIT {$perPage} OFFSET {$offset}");
            $stmt->execute($params);
            $campaigns = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'campaigns' => $campaigns ?: [],
                'total' => $total,
                'page' => $page,
                'totalPages' => $totalPages
            ];
        } catch (\Throwable $e) {
            Logger::error('Error fetching campaigns: ' . $e->getMessage());
            return ['campaigns' => [], 'total' => 0, 'page' => 1, 'totalPages' => 1];
        }
    }

    public function getCampaignByUuid(string $uuid): ?array {
        $pdo = $this->getPdo();
        if (!$pdo) return null;

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        try {
            $stmt = $pdo->prepare("SELECT * FROM `{$tbl}` WHERE `uuid` = ? LIMIT 1");
            $stmt->execute([$uuid]);
            $res = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $res ?: null;
        } catch (\Throwable $e) {
            Logger::error('Error fetching campaign by uuid: ' . $e->getMessage());
            return null;
        }
    }

    public function saveCampaign(array $data): array {
        $pdo = $this->getPdo();
        if (!$pdo) return ['success' => false, 'message' => 'Database error'];

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        $uuid = $data['uuid'] ?? null;
        $name = trim((string)($data['name'] ?? ''));
        $placement = (string)($data['placement'] ?? 'feed');
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;
        $priority = (int)($data['priority'] ?? 1);
        $title = trim((string)($data['title'] ?? ''));
        $description = trim((string)($data['description'] ?? ''));
        $mediaUrl = trim((string)($data['media_url'] ?? ''));
        $targetUrl = trim((string)($data['target_url'] ?? ''));
        $badgeText = trim((string)($data['badge_text'] ?? 'Patrocinado'));
        $ctaText = trim((string)($data['cta_text'] ?? 'Ver oferta'));
        $htmlContent = trim((string)($data['html_content'] ?? ''));

        if (empty($name)) {
            return ['success' => false, 'message' => 'El nombre de la campaña es obligatorio'];
        }

        try {
            $existing = null;
            if (!empty($uuid)) {
                $checkStmt = $pdo->prepare("SELECT `id` FROM `{$tbl}` WHERE `uuid` = ? LIMIT 1");
                $checkStmt->execute([$uuid]);
                $existing = $checkStmt->fetchColumn();
            }

            if ($existing) {
                $stmt = $pdo->prepare("UPDATE `{$tbl}` SET 
                    `name` = ?, `placement` = ?, `is_active` = ?, `priority` = ?,
                    `title` = ?, `description` = ?, `media_url` = ?, `target_url` = ?,
                    `badge_text` = ?, `cta_text` = ?, `html_content` = ?
                    WHERE `uuid` = ?");
                $stmt->execute([
                    $name, $placement, $isActive, $priority,
                    $title, $description, $mediaUrl, $targetUrl,
                    $badgeText, $ctaText, $htmlContent, $uuid
                ]);
            } else {
                if (empty($uuid)) {
                    $uuid = \App\Core\Helpers\Utils::generateUUID();
                }
                $stmt = $pdo->prepare("INSERT INTO `{$tbl}` 
                    (`uuid`, `name`, `placement`, `is_active`, `priority`, `title`, `description`, `media_url`, `target_url`, `badge_text`, `cta_text`, `html_content`)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $uuid, $name, $placement, $isActive, $priority,
                    $title, $description, $mediaUrl, $targetUrl,
                    $badgeText, $ctaText, $htmlContent
                ]);
            }

            if ($this->redis) {
                try {
                    $this->redis->del(['system:active_campaigns']);
                } catch (\Throwable $e) {}
            }

            return ['success' => true, 'uuid' => $uuid];
        } catch (\Throwable $e) {
            Logger::error('Error saving campaign: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error al guardar la campaña'];
        }
    }

    public function toggleCampaignActive(string $uuid): bool {
        $pdo = $this->getPdo();
        if (!$pdo) return false;

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        try {
            $stmt = $pdo->prepare("UPDATE `{$tbl}` SET `is_active` = IF(`is_active` = 1, 0, 1) WHERE `uuid` = ?");
            $res = $stmt->execute([$uuid]);

            if ($this->redis) {
                try {
                    $this->redis->del(['system:active_campaigns']);
                } catch (\Throwable $e) {}
            }

            return $res;
        } catch (\Throwable $e) {
            Logger::error('Error toggling campaign: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteCampaign(string $uuid): bool {
        $pdo = $this->getPdo();
        if (!$pdo) return false;

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        try {
            $stmt = $pdo->prepare("DELETE FROM `{$tbl}` WHERE `uuid` = ?");
            $res = $stmt->execute([$uuid]);

            if ($this->redis) {
                try {
                    $this->redis->del(['system:active_campaigns']);
                } catch (\Throwable $e) {}
            }

            return $res;
        } catch (\Throwable $e) {
            Logger::error('Error deleting campaign: ' . $e->getMessage());
            return false;
        }
    }

    public function getActiveCampaigns(): array {
        if ($this->redis) {
            try {
                $cached = $this->redis->get('system:active_campaigns');
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) return $decoded;
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
        if (!$pdo) return [];

        $tbl = DB::TBL_AD_CUSTOM_CAMPAIGNS;
        try {
            $stmt = $pdo->query("SELECT * FROM `{$tbl}` WHERE `is_active` = 1 ORDER BY `priority` DESC, `id` DESC");
            $campaigns = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $grouped = [
                'feed' => [],
                'modal' => [],
                'drawer_palette' => [],
                'drawer_templates' => []
            ];

            foreach ($campaigns as $camp) {
                $pl = $camp['placement'] ?? 'feed';
                if (!isset($grouped[$pl])) $grouped[$pl] = [];
                $grouped[$pl][] = $camp;
            }

            if ($this->redis) {
                try {
                    $this->redis->setex('system:active_campaigns', 300, json_encode($grouped));
                } catch (\Throwable $e) {}
            }

            return $grouped;
        } catch (\Throwable $e) {
            Logger::error('Error fetching active campaigns: ' . $e->getMessage());
            return [];
        }
    }
}
