<?php

namespace App\Api\Services\Admin;

use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

class AdminAdvertisementsService {
    private DatabaseManager $dbManager;

    public function __construct(DatabaseManager $dbManager) {
        $this->dbManager = $dbManager;
    }

    private function getPdo(): \PDO {
        return $this->dbManager->getConnection(DB::CONN_ADVERTISEMENTS);
    }

    public function getProvidersList(?string $searchQuery, ?string $typeFilter = null, ?string $statusFilter = null, int $page = 1, int $perPage = 25): array {
        $pdo = $this->getPdo();
        $searchQuery = trim($searchQuery ?? '');
        $limit = max(1, min(100, $perPage));
        if ($page < 1) $page = 1;

        $whereClauses = [];
        $params = [];

        if ($searchQuery !== '') {
            $whereClauses[] = "(p.name LIKE :search OR p.network_id LIKE :search)";
            $params[':search'] = '%' . $searchQuery . '%';
        }

        if (!empty($typeFilter) && $typeFilter !== 'all') {
            $whereClauses[] = "p.provider_type = :type";
            $params[':type'] = $typeFilter;
        }

        if (!empty($statusFilter) && $statusFilter !== 'all') {
            $whereClauses[] = "p.is_active = :status";
            $params[':status'] = ($statusFilter === 'active') ? 1 : 0;
        }

        $whereSql = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

        $totalProviders = 0;
        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(p.id) FROM ad_providers p {$whereSql}");
            foreach ($params as $k => $v) {
                $stmtCount->bindValue($k, $v);
            }
            $stmtCount->execute();
            $totalProviders = (int)$stmtCount->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getProvidersList count error: " . $e->getMessage());
        }

        $totalPages = (int)ceil($totalProviders / $limit);
        if ($totalPages < 1) $totalPages = 1;
        if ($page > $totalPages) $page = $totalPages;
        $offset = ($page - 1) * $limit;

        $providers = [];
        try {
            $sql = "SELECT p.*, 
                           (SELECT COUNT(a.id) FROM advertisements a WHERE a.provider_id = p.id) AS total_ads,
                           (SELECT COUNT(m.id) FROM ad_metrics m WHERE m.provider_id = p.id) AS total_impressions
                    FROM ad_providers p
                    {$whereSql}
                    ORDER BY p.id DESC
                    LIMIT :limit OFFSET :offset";

            $stmt = $pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $providers = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getProvidersList query error: " . $e->getMessage());
        }

        return [
            'providers' => $providers,
            'totalProviders' => $totalProviders,
            'page' => $page,
            'totalPages' => $totalPages,
            'searchQuery' => $searchQuery,
            'typeFilter' => $typeFilter,
            'statusFilter' => $statusFilter
        ];
    }

    public function createProvider(array $data): array {
        $pdo = $this->getPdo();

        $name = trim($data['name'] ?? '');
        $providerType = in_array($data['provider_type'] ?? '', ['network', 'direct'], true) ? $data['provider_type'] : 'direct';
        $networkId = $providerType === 'network' ? trim($data['network_id'] ?? '') : null;
        $hasExpiration = !empty($data['has_expiration']) ? 1 : 0;
        $expirationDate = $hasExpiration && !empty($data['expiration_date']) ? date('Y-m-d H:i:s', strtotime($data['expiration_date'])) : null;
        $startDate = !empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : date('Y-m-d H:i:s');
        $isActive = isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1;

        if (empty($name)) {
            return ['success' => false, 'message_key' => 'err_provider_name_required'];
        }

        if ($providerType === 'network' && empty($networkId)) {
            return ['success' => false, 'message_key' => 'err_network_id_required'];
        }

        $uuid = Utils::generateUUID();

        try {
            $stmt = $pdo->prepare("INSERT INTO ad_providers (uuid, name, provider_type, network_id, is_active, has_expiration, start_date, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $uuid,
                $name,
                $providerType,
                $networkId,
                $isActive,
                $hasExpiration,
                $startDate,
                $expirationDate
            ]);

            return [
                'success' => true,
                'uuid' => $uuid,
                'message_key' => 'msg_provider_created_success'
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::createProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_provider_create_failed'];
        }
    }

    public function updateProvider(string $uuid, array $data): array {
        $pdo = $this->getPdo();

        $name = trim($data['name'] ?? '');
        $providerType = in_array($data['provider_type'] ?? '', ['network', 'direct'], true) ? $data['provider_type'] : null;
        $networkId = isset($data['network_id']) ? trim($data['network_id']) : null;
        $hasExpiration = isset($data['has_expiration']) ? (!empty($data['has_expiration']) ? 1 : 0) : null;
        $expirationDate = !empty($data['expiration_date']) ? date('Y-m-d H:i:s', strtotime($data['expiration_date'])) : null;

        if (empty($name)) {
            return ['success' => false, 'message_key' => 'err_provider_name_required'];
        }

        try {
            $stmtFind = $pdo->prepare("SELECT id FROM ad_providers WHERE uuid = ?");
            $stmtFind->execute([$uuid]);
            $providerId = $stmtFind->fetchColumn();

            if (!$providerId) {
                return ['success' => false, 'message_key' => 'err_provider_not_found'];
            }

            $fields = ['name = ?'];
            $params = [$name];

            if ($providerType !== null) {
                $fields[] = 'provider_type = ?';
                $params[] = $providerType;
            }
            if ($networkId !== null) {
                $fields[] = 'network_id = ?';
                $params[] = $networkId;
            }
            if ($hasExpiration !== null) {
                $fields[] = 'has_expiration = ?';
                $params[] = $hasExpiration;
                $fields[] = 'expiration_date = ?';
                $params[] = $hasExpiration ? $expirationDate : null;
            }

            $params[] = $uuid;
            $setSql = implode(', ', $fields);
            $stmtUpdate = $pdo->prepare("UPDATE ad_providers SET {$setSql} WHERE uuid = ?");
            $stmtUpdate->execute($params);

            return ['success' => true, 'message_key' => 'msg_provider_updated_success'];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::updateProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_provider_update_failed'];
        }
    }

    public function toggleProviderActive(string $uuid): array {
        $pdo = $this->getPdo();
        try {
            $stmt = $pdo->prepare("SELECT is_active FROM ad_providers WHERE uuid = ?");
            $stmt->execute([$uuid]);
            $provider = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$provider) {
                return ['success' => false, 'message_key' => 'err_provider_not_found'];
            }

            $newStatus = ($provider['is_active'] == 1) ? 0 : 1;
            $stmtUpdate = $pdo->prepare("UPDATE ad_providers SET is_active = ? WHERE uuid = ?");
            $stmtUpdate->execute([$newStatus, $uuid]);

            return [
                'success' => true,
                'is_active' => $newStatus,
                'message_key' => $newStatus ? 'msg_provider_activated' : 'msg_provider_deactivated'
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::toggleProviderActive error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_toggle_status_failed'];
        }
    }

    public function deleteProvider(string $uuid): array {
        $pdo = $this->getPdo();
        try {
            $stmt = $pdo->prepare("DELETE FROM ad_providers WHERE uuid = ?");
            $stmt->execute([$uuid]);

            if ($stmt->rowCount() === 0) {
                return ['success' => false, 'message_key' => 'err_provider_not_found'];
            }

            return ['success' => true, 'message_key' => 'msg_provider_deleted_success'];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::deleteProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_delete_provider_failed'];
        }
    }

    public function getProviderDetails(string $uuid): array {
        $pdo = $this->getPdo();
        try {
            $stmt = $pdo->prepare("SELECT * FROM ad_providers WHERE uuid = ?");
            $stmt->execute([$uuid]);
            $provider = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$provider) {
                return ['success' => false, 'message_key' => 'err_provider_not_found'];
            }

            $stmtAds = $pdo->prepare("SELECT a.*, 
                                             (SELECT COUNT(r.id) FROM ad_resources r WHERE r.ad_id = a.id) AS total_resources
                                      FROM advertisements a
                                      WHERE a.provider_id = ?
                                      ORDER BY a.id DESC");
            $stmtAds->execute([$provider['id']]);
            $ads = $stmtAds->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($ads as &$ad) {
                $stmtRes = $pdo->prepare("SELECT * FROM ad_resources WHERE ad_id = ? ORDER BY sort_order ASC, id ASC");
                $stmtRes->execute([$ad['id']]);
                $ad['resources'] = $stmtRes->fetchAll(\PDO::FETCH_ASSOC);
            }

            return [
                'success' => true,
                'provider' => $provider,
                'ads' => $ads
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getProviderDetails error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_provider_fetch_failed'];
        }
    }

    public function getAdsForProvider(string $providerUuid): array {
        $pdo = $this->getPdo();
        try {
            $stmtFind = $pdo->prepare("SELECT id FROM ad_providers WHERE uuid = ?");
            $stmtFind->execute([$providerUuid]);
            $providerId = $stmtFind->fetchColumn();

            if (!$providerId) {
                return ['success' => false, 'message_key' => 'err_provider_not_found', 'ads' => []];
            }

            $stmt = $pdo->prepare("SELECT * FROM advertisements WHERE provider_id = ? ORDER BY id DESC");
            $stmt->execute([$providerId]);
            $ads = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($ads as &$ad) {
                $stmtRes = $pdo->prepare("SELECT * FROM ad_resources WHERE ad_id = ? ORDER BY sort_order ASC, id ASC");
                $stmtRes->execute([$ad['id']]);
                $ad['resources'] = $stmtRes->fetchAll(\PDO::FETCH_ASSOC);
            }

            return ['success' => true, 'ads' => $ads];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getAdsForProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_ads_fetch_failed', 'ads' => []];
        }
    }

    public function getProviderAdsPaginated(string $providerUuid, ?string $searchQuery = '', ?string $formatFilter = null, ?string $statusFilter = null, int $page = 1, int $perPage = 25): array {
        $pdo = $this->getPdo();
        $searchQuery = trim($searchQuery ?? '');
        $limit = max(1, min(100, $perPage));
        if ($page < 1) $page = 1;

        try {
            $stmtFind = $pdo->prepare("SELECT * FROM ad_providers WHERE uuid = ?");
            $stmtFind->execute([$providerUuid]);
            $provider = $stmtFind->fetch(\PDO::FETCH_ASSOC);

            if (!$provider) {
                return [
                    'success' => false,
                    'provider' => null,
                    'ads' => [],
                    'totalAds' => 0,
                    'totalPages' => 1,
                    'page' => 1,
                    'searchQuery' => $searchQuery,
                    'formatFilter' => $formatFilter,
                    'statusFilter' => $statusFilter
                ];
            }

            $providerId = (int)$provider['id'];
            $whereClauses = ['a.provider_id = :provider_id'];
            $params = [':provider_id' => $providerId];

            if ($searchQuery !== '') {
                $whereClauses[] = "(a.name LIKE :search OR a.title LIKE :search OR a.description LIKE :search)";
                $params[':search'] = '%' . $searchQuery . '%';
            }

            if (!empty($formatFilter) && $formatFilter !== 'all') {
                if ($formatFilter === 'modules') {
                    $whereClauses[] = "a.format LIKE 'module_%'";
                } else {
                    $whereClauses[] = "a.format = :format";
                    $params[':format'] = $formatFilter;
                }
            }

            if (!empty($statusFilter) && $statusFilter !== 'all') {
                $whereClauses[] = "a.status = :status";
                $params[':status'] = $statusFilter;
            }

            $whereSql = 'WHERE ' . implode(' AND ', $whereClauses);

            $totalAds = 0;
            $stmtCount = $pdo->prepare("SELECT COUNT(a.id) FROM advertisements a {$whereSql}");
            foreach ($params as $k => $v) {
                $stmtCount->bindValue($k, $v);
            }
            $stmtCount->execute();
            $totalAds = (int)$stmtCount->fetchColumn();

            $totalPages = (int)ceil($totalAds / $limit);
            if ($totalPages < 1) $totalPages = 1;
            if ($page > $totalPages) $page = $totalPages;
            $offset = ($page - 1) * $limit;

            $sql = "SELECT a.*, 
                           (SELECT COUNT(r.id) FROM ad_resources r WHERE r.ad_id = a.id) AS total_resources
                    FROM advertisements a
                    {$whereSql}
                    ORDER BY a.id DESC
                    LIMIT :limit OFFSET :offset";

            $stmt = $pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $ads = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($ads as &$ad) {
                $stmtRes = $pdo->prepare("SELECT * FROM ad_resources WHERE ad_id = ? ORDER BY sort_order ASC, id ASC");
                $stmtRes->execute([$ad['id']]);
                $ad['resources'] = $stmtRes->fetchAll(\PDO::FETCH_ASSOC);
            }

            return [
                'success' => true,
                'provider' => $provider,
                'ads' => $ads,
                'totalAds' => $totalAds,
                'totalPages' => $totalPages,
                'page' => $page,
                'searchQuery' => $searchQuery,
                'formatFilter' => $formatFilter,
                'statusFilter' => $statusFilter
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getProviderAdsPaginated error: " . $e->getMessage());
            return [
                'success' => false,
                'provider' => null,
                'ads' => [],
                'totalAds' => 0,
                'totalPages' => 1,
                'page' => 1,
                'searchQuery' => $searchQuery,
                'formatFilter' => $formatFilter,
                'statusFilter' => $statusFilter
            ];
        }
    }

    public function createAd(string $providerUuid, array $adData, array $resources = []): array {
        $pdo = $this->getPdo();
        try {
            $stmtFind = $pdo->prepare("SELECT id, name FROM ad_providers WHERE uuid = ?");
            $stmtFind->execute([$providerUuid]);
            $provider = $stmtFind->fetch(\PDO::FETCH_ASSOC);

            if (!$provider) {
                return ['success' => false, 'message_key' => 'err_provider_not_found'];
            }

            $providerId = (int)$provider['id'];
            $name = trim($adData['name'] ?? '');
            $title = trim($adData['title'] ?? $name);
            $description = trim($adData['description'] ?? '');
            $targetUrl = trim($adData['target_url'] ?? '');
            $sponsorLabel = trim($adData['sponsor_label'] ?? $provider['name']);
            $format = in_array($adData['format'] ?? '', ['feed', 'module_colors', 'module_templates', 'module_info', 'banner', 'custom'], true) ? $adData['format'] : 'feed';
            $status = in_array($adData['status'] ?? '', ['active', 'inactive', 'paused', 'expired'], true) ? $adData['status'] : 'active';
            $hasExpiration = !empty($adData['has_expiration']) ? 1 : 0;
            $expirationDate = $hasExpiration && !empty($adData['expiration_date']) ? date('Y-m-d H:i:s', strtotime($adData['expiration_date'])) : null;
            $startDate = !empty($adData['start_date']) ? date('Y-m-d H:i:s', strtotime($adData['start_date'])) : date('Y-m-d H:i:s');
            $settings = isset($adData['settings']) && is_array($adData['settings']) ? json_encode($adData['settings']) : null;

            if (empty($name)) {
                return ['success' => false, 'message_key' => 'err_ad_name_required'];
            }

            $adUuid = Utils::generateUUID();

            $pdo->beginTransaction();

            $stmtAd = $pdo->prepare("INSERT INTO advertisements (uuid, provider_id, name, title, description, target_url, sponsor_label, format, status, has_expiration, start_date, expiration_date, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmtAd->execute([
                $adUuid,
                $providerId,
                $name,
                $title,
                $description,
                $targetUrl,
                $sponsorLabel,
                $format,
                $status,
                $hasExpiration,
                $startDate,
                $expirationDate,
                $settings
            ]);

            $adId = (int)$pdo->lastInsertId();

            if (!empty($resources) && is_array($resources)) {
                $stmtRes = $pdo->prepare("INSERT INTO ad_resources (uuid, ad_id, resource_type, content_url, raw_content, alt_text, sort_order, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($resources as $index => $res) {
                    $resUuid = Utils::generateUUID();
                    $resType = in_array($res['resource_type'] ?? '', ['image', 'video', 'text', 'script', 'vast', 'html'], true) ? $res['resource_type'] : 'image';
                    $contentUrl = trim($res['content_url'] ?? '');
                    $rawContent = isset($res['raw_content']) ? trim($res['raw_content']) : null;
                    $altText = trim($res['alt_text'] ?? $name);
                    $sortOrder = isset($res['sort_order']) ? (int)$res['sort_order'] : $index;
                    $metadata = isset($res['metadata']) && is_array($res['metadata']) ? json_encode($res['metadata']) : null;

                    $stmtRes->execute([
                        $resUuid,
                        $adId,
                        $resType,
                        $contentUrl,
                        $rawContent,
                        $altText,
                        $sortOrder,
                        $metadata
                    ]);
                }
            }

            $pdo->commit();

            return [
                'success' => true,
                'uuid' => $adUuid,
                'message_key' => 'msg_ad_created_success'
            ];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error("AdminAdvertisementsService::createAd error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_ad_create_failed'];
        }
    }

    public function updateAd(string $adUuid, array $adData, ?array $resources = null): array {
        $pdo = $this->getPdo();
        try {
            $stmtFind = $pdo->prepare("SELECT id FROM advertisements WHERE uuid = ?");
            $stmtFind->execute([$adUuid]);
            $adId = $stmtFind->fetchColumn();

            if (!$adId) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $name = trim($adData['name'] ?? '');
            $title = trim($adData['title'] ?? $name);
            $description = trim($adData['description'] ?? '');
            $targetUrl = trim($adData['target_url'] ?? '');
            $sponsorLabel = trim($adData['sponsor_label'] ?? '');
            $format = in_array($adData['format'] ?? '', ['feed', 'module_colors', 'module_templates', 'module_info', 'banner', 'custom'], true) ? $adData['format'] : 'feed';
            $status = in_array($adData['status'] ?? '', ['active', 'inactive', 'paused', 'expired'], true) ? $adData['status'] : 'active';
            $hasExpiration = !empty($adData['has_expiration']) ? 1 : 0;
            $expirationDate = $hasExpiration && !empty($adData['expiration_date']) ? date('Y-m-d H:i:s', strtotime($adData['expiration_date'])) : null;

            if (empty($name)) {
                return ['success' => false, 'message_key' => 'err_ad_name_required'];
            }

            $pdo->beginTransaction();

            $stmtUpdate = $pdo->prepare("UPDATE advertisements SET name = ?, title = ?, description = ?, target_url = ?, sponsor_label = ?, format = ?, status = ?, has_expiration = ?, expiration_date = ? WHERE id = ?");
            $stmtUpdate->execute([
                $name,
                $title,
                $description,
                $targetUrl,
                $sponsorLabel,
                $format,
                $status,
                $hasExpiration,
                $expirationDate,
                $adId
            ]);

            if ($resources !== null && is_array($resources)) {
                $stmtDel = $pdo->prepare("DELETE FROM ad_resources WHERE ad_id = ?");
                $stmtDel->execute([$adId]);

                $stmtRes = $pdo->prepare("INSERT INTO ad_resources (uuid, ad_id, resource_type, content_url, raw_content, alt_text, sort_order, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($resources as $index => $res) {
                    $resUuid = Utils::generateUUID();
                    $resType = in_array($res['resource_type'] ?? '', ['image', 'video', 'text', 'script', 'vast', 'html'], true) ? $res['resource_type'] : 'image';
                    $contentUrl = trim($res['content_url'] ?? '');
                    $rawContent = isset($res['raw_content']) ? trim($res['raw_content']) : null;
                    $altText = trim($res['alt_text'] ?? $name);
                    $sortOrder = isset($res['sort_order']) ? (int)$res['sort_order'] : $index;
                    $metadata = isset($res['metadata']) && is_array($res['metadata']) ? json_encode($res['metadata']) : null;

                    $stmtRes->execute([
                        $resUuid,
                        $adId,
                        $resType,
                        $contentUrl,
                        $rawContent,
                        $altText,
                        $sortOrder,
                        $metadata
                    ]);
                }
            }

            $pdo->commit();

            return ['success' => true, 'message_key' => 'msg_ad_updated_success'];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            Logger::error("AdminAdvertisementsService::updateAd error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_ad_update_failed'];
        }
    }

    public function toggleAdStatus(string $adUuid): array {
        $pdo = $this->getPdo();
        try {
            $stmt = $pdo->prepare("SELECT status FROM advertisements WHERE uuid = ?");
            $stmt->execute([$adUuid]);
            $ad = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$ad) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $newStatus = ($ad['status'] === 'active') ? 'inactive' : 'active';
            $stmtUpdate = $pdo->prepare("UPDATE advertisements SET status = ? WHERE uuid = ?");
            $stmtUpdate->execute([$newStatus, $adUuid]);

            return [
                'success' => true,
                'status' => $newStatus,
                'message_key' => ($newStatus === 'active') ? 'msg_ad_activated' : 'msg_ad_deactivated'
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::toggleAdStatus error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_toggle_status_failed'];
        }
    }

    public function deleteAd(string $adUuid): array {
        $pdo = $this->getPdo();
        try {
            $stmt = $pdo->prepare("DELETE FROM advertisements WHERE uuid = ?");
            $stmt->execute([$adUuid]);

            if ($stmt->rowCount() === 0) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            return ['success' => true, 'message_key' => 'msg_ad_deleted_success'];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::deleteAd error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_delete_ad_failed'];
        }
    }

    public function getPublicActiveAds(): array {
        $pdo = $this->getPdo();
        try {
            $sql = "SELECT a.id, a.uuid, a.name, a.title, a.description, a.target_url, a.sponsor_label, a.format, a.settings,
                           p.name AS provider_name, p.provider_type, p.network_id
                    FROM advertisements a
                    INNER JOIN ad_providers p ON a.provider_id = p.id
                    WHERE p.is_active = 1
                      AND (p.has_expiration = 0 OR p.expiration_date IS NULL OR p.expiration_date >= NOW())
                      AND a.status = 'active'
                      AND (a.has_expiration = 0 OR a.expiration_date IS NULL OR a.expiration_date >= NOW())
                    ORDER BY a.id ASC";

            $stmt = $pdo->query($sql);
            $ads = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $feedAds = [];
            $moduleAds = [];

            foreach ($ads as $ad) {
                $stmtRes = $pdo->prepare("SELECT resource_type, content_url, raw_content, alt_text, sort_order FROM ad_resources WHERE ad_id = ? ORDER BY sort_order ASC, id ASC");
                $stmtRes->execute([$ad['id']]);
                $resources = $stmtRes->fetchAll(\PDO::FETCH_ASSOC);

                $media = [];
                foreach ($resources as $res) {
                    $media[] = [
                        'type' => $res['resource_type'],
                        'url' => $res['content_url'],
                        'raw' => $res['raw_content'],
                        'alt' => $res['alt_text'] ?? $ad['title']
                    ];
                }

                $formattedAd = [
                    'id' => $ad['uuid'],
                    'uuid' => $ad['uuid'],
                    'provider_type' => $ad['provider_type'],
                    'network_id' => $ad['network_id'],
                    'sponsor' => !empty($ad['sponsor_label']) ? $ad['sponsor_label'] : $ad['provider_name'],
                    'title' => $ad['title'],
                    'description' => $ad['description'],
                    'url' => $ad['target_url'],
                    'format' => $ad['format'],
                    'media' => $media
                ];

                if ($ad['format'] === 'feed') {
                    $formattedAd['type'] = 'feed';
                    $feedAds[] = $formattedAd;
                } else {
                    $formattedAd['type'] = 'module';
                    $moduleKey = str_replace('module_', '', $ad['format']);
                    if (!isset($moduleAds[$moduleKey])) {
                        $moduleAds[$moduleKey] = [];
                    }
                    $moduleAds[$moduleKey][] = $formattedAd;
                }
            }

            return [
                'success' => true,
                'feed_promos' => $feedAds,
                'module_promos' => $moduleAds
            ];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getPublicActiveAds error: " . $e->getMessage());
            return ['success' => false, 'feed_promos' => [], 'module_promos' => []];
        }
    }

    public function recordAdMetric(string $adUuid, string $eventType, ?string $userUuid = null, ?string $ipAddress = null, ?string $userAgent = null): array {
        $pdo = $this->getPdo();
        try {
            $stmtFind = $pdo->prepare("SELECT id, provider_id FROM advertisements WHERE uuid = ?");
            $stmtFind->execute([$adUuid]);
            $ad = $stmtFind->fetch(\PDO::FETCH_ASSOC);

            if (!$ad) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $validEvents = ['impression', 'click', 'video_view', 'conversion'];
            if (!in_array($eventType, $validEvents, true)) {
                $eventType = 'impression';
            }

            $stmt = $pdo->prepare("INSERT INTO ad_metrics (ad_id, provider_id, event_type, user_uuid, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $ad['id'],
                $ad['provider_id'],
                $eventType,
                $userUuid,
                $ipAddress,
                $userAgent
            ]);

            return ['success' => true];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::recordAdMetric error: " . $e->getMessage());
            return ['success' => false];
        }
    }
}
