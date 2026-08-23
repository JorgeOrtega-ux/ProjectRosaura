<?php

namespace App\Api\Services\Admin;

use App\Core\Helpers\Utils;
use App\Core\Helpers\GeoIpHelper;
use App\Core\System\Logger;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\CacheConstants;
use App\Core\System\CacheInvalidator;
use App\Core\System\AdvertisementConstants;
use App\Core\System\DatabaseConstants as DB;

class AdminAdvertisementsService {
    private DatabaseManager $dbManager;
    private $redis = null;
    private ?CacheInvalidator $cacheInvalidator = null;

    public function __construct(DatabaseManager $dbManager, ?RedisCache $redisCache = null) {
        $this->dbManager = $dbManager;
        try {
            $r = $redisCache ?: new RedisCache();
            $this->redis = $r->getClient();
            if ($this->redis) {
                $this->cacheInvalidator = new CacheInvalidator($this->redis);
            }
        } catch (\Throwable $e) {
            $this->redis = null;
            $this->cacheInvalidator = null;
        }
    }

    private function getPdo(): \PDO {
        return $this->dbManager->getConnection(DB::CONN_ADVERTISEMENTS);
    }

    private function getInvalidator(): ?CacheInvalidator {
        if (!$this->cacheInvalidator && $this->redis) {
            $this->cacheInvalidator = new CacheInvalidator($this->redis);
        }
        return $this->cacheInvalidator;
    }

    public function getProvidersList(?string $searchQuery, ?string $typeFilter = null, ?string $statusFilter = null, int $page = 1, int $perPage = 25): array {
        $searchQuery = trim($searchQuery ?? '');
        $limit = max(1, min(100, $perPage));
        if ($page < 1) $page = 1;

        $typeFilterNormalized = (!empty($typeFilter) && $typeFilter !== 'all') ? $typeFilter : 'all';
        $statusFilterNormalized = (!empty($statusFilter) && $statusFilter !== 'all') ? $statusFilter : 'all';

        $cacheKey = CacheConstants::PREFIX_ADS_PROVIDERS_LIST . md5("{$searchQuery}:{$typeFilterNormalized}:{$statusFilterNormalized}:{$page}:{$limit}");
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
        $whereClauses = [];
        $params = [];

        if ($searchQuery !== '') {
            $whereClauses[] = "(p.name LIKE :search OR p.network_id LIKE :search)";
            $params[':search'] = '%' . $searchQuery . '%';
        }

        if ($typeFilterNormalized !== 'all') {
            $whereClauses[] = "p.provider_type = :type";
            $params[':type'] = $typeFilterNormalized;
        }

        if ($statusFilterNormalized !== 'all') {
            $whereClauses[] = "p.is_active = :status";
            $params[':status'] = ($statusFilterNormalized === 'active') ? 1 : 0;
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

        $result = [
            'providers' => $providers,
            'totalProviders' => $totalProviders,
            'page' => $page,
            'totalPages' => $totalPages,
            'searchQuery' => $searchQuery,
            'typeFilter' => $typeFilter,
            'statusFilter' => $statusFilter
        ];

        if ($this->redis) {
            try {
                $this->redis->setex($cacheKey, CacheConstants::TTL_ONE_HOUR, json_encode($result));
            } catch (\Throwable $e) {}
        }

        return $result;
    }

    public function createProvider(array $data): array {
        $pdo = $this->getPdo();

        $name = trim($data['name'] ?? '');
        $providerType = in_array($data['provider_type'] ?? '', AdvertisementConstants::VALID_PROVIDER_TYPES, true) ? $data['provider_type'] : AdvertisementConstants::PROVIDER_TYPE_DIRECT;
        $networkId = $providerType === AdvertisementConstants::PROVIDER_TYPE_NETWORK ? trim($data['network_id'] ?? '') : null;
        $hasExpiration = !empty($data['has_expiration']) ? 1 : 0;
        $expirationDate = $hasExpiration && !empty($data['expiration_date']) ? date('Y-m-d H:i:s', strtotime($data['expiration_date'])) : null;
        $startDate = !empty($data['start_date']) ? date('Y-m-d H:i:s', strtotime($data['start_date'])) : date('Y-m-d H:i:s');
        $isActive = isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1;

        if (empty($name)) {
            return ['success' => false, 'message_key' => 'err_provider_name_required'];
        }

        if ($providerType === AdvertisementConstants::PROVIDER_TYPE_NETWORK && empty($networkId)) {
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

            $this->getInvalidator()?->advertisements();

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
        $providerType = in_array($data['provider_type'] ?? '', AdvertisementConstants::VALID_PROVIDER_TYPES, true) ? $data['provider_type'] : null;
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

            $this->getInvalidator()?->advertisementProvider($uuid);

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

            $this->getInvalidator()?->advertisementProvider($uuid);

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

            $this->getInvalidator()?->advertisements();

            return ['success' => true, 'message_key' => 'msg_provider_deleted_success'];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::deleteProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_delete_provider_failed'];
        }
    }

    public function getProviderDetails(string $uuid): array {
        $cacheKey = CacheConstants::PREFIX_ADS_PROVIDER_DETAILS . $uuid;
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

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

            $result = [
                'success' => true,
                'provider' => $provider,
                'ads' => $ads
            ];

            if ($this->redis) {
                try {
                    $this->redis->setex($cacheKey, CacheConstants::TTL_ONE_HOUR, json_encode($result));
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getProviderDetails error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_provider_fetch_failed'];
        }
    }

    public function getAdsForProvider(string $providerUuid): array {
        $cacheKey = CacheConstants::PREFIX_ADS_PROVIDER_ADS . $providerUuid . ':all';
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

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

            $result = ['success' => true, 'ads' => $ads];

            if ($this->redis) {
                try {
                    $this->redis->setex($cacheKey, CacheConstants::TTL_ONE_HOUR, json_encode($result));
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getAdsForProvider error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_ads_fetch_failed', 'ads' => []];
        }
    }

    public function getProviderAdsPaginated(string $providerUuid, ?string $searchQuery = '', ?string $formatFilter = null, ?string $statusFilter = null, int $page = 1, int $perPage = 25): array {
        $searchQuery = trim($searchQuery ?? '');
        $limit = max(1, min(100, $perPage));
        if ($page < 1) $page = 1;

        $formatFilterNormalized = (!empty($formatFilter) && $formatFilter !== 'all') ? $formatFilter : 'all';
        $statusFilterNormalized = (!empty($statusFilter) && $statusFilter !== 'all') ? $statusFilter : 'all';

        $cacheKey = CacheConstants::PREFIX_ADS_PROVIDER_ADS . "{$providerUuid}:" . md5("{$searchQuery}:{$formatFilterNormalized}:{$statusFilterNormalized}:{$page}:{$limit}");
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
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

            if ($formatFilterNormalized !== 'all') {
                if ($formatFilterNormalized === 'modules') {
                    $whereClauses[] = "a.format LIKE 'module_%'";
                } else {
                    $whereClauses[] = "a.format = :format";
                    $params[':format'] = $formatFilterNormalized;
                }
            }

            if ($statusFilterNormalized !== 'all') {
                $whereClauses[] = "a.status = :status";
                $params[':status'] = $statusFilterNormalized;
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

            $result = [
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

            if ($this->redis) {
                try {
                    $this->redis->setex($cacheKey, CacheConstants::TTL_ONE_HOUR, json_encode($result));
                } catch (\Throwable $e) {}
            }

            return $result;
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
            $format = AdvertisementConstants::isValidFormat($adData['format'] ?? '') ? $adData['format'] : AdvertisementConstants::FORMAT_FEED;
            $status = in_array($adData['status'] ?? '', AdvertisementConstants::VALID_STATUSES, true) ? $adData['status'] : AdvertisementConstants::STATUS_ACTIVE;
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

            $this->getInvalidator()?->advertisement($adUuid, $providerUuid);

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
            $stmtFind = $pdo->prepare("SELECT a.id, a.provider_id, p.uuid AS provider_uuid FROM advertisements a INNER JOIN ad_providers p ON a.provider_id = p.id WHERE a.uuid = ?");
            $stmtFind->execute([$adUuid]);
            $adRow = $stmtFind->fetch(\PDO::FETCH_ASSOC);

            if (!$adRow) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $adId = (int)$adRow['id'];
            $providerUuid = $adRow['provider_uuid'] ?? null;

            $name = trim($adData['name'] ?? '');
            $title = trim($adData['title'] ?? $name);
            $description = trim($adData['description'] ?? '');
            $targetUrl = trim($adData['target_url'] ?? '');
            $sponsorLabel = trim($adData['sponsor_label'] ?? '');
            $format = AdvertisementConstants::isValidFormat($adData['format'] ?? '') ? $adData['format'] : AdvertisementConstants::FORMAT_FEED;
            $status = in_array($adData['status'] ?? '', AdvertisementConstants::VALID_STATUSES, true) ? $adData['status'] : AdvertisementConstants::STATUS_ACTIVE;
            $hasExpiration = !empty($adData['has_expiration']) ? 1 : 0;
            $expirationDate = $hasExpiration && !empty($adData['expiration_date']) ? date('Y-m-d H:i:s', strtotime($adData['expiration_date'])) : null;
            $settings = isset($adData['settings']) ? (is_array($adData['settings']) ? json_encode($adData['settings']) : $adData['settings']) : null;

            if (empty($name)) {
                return ['success' => false, 'message_key' => 'err_ad_name_required'];
            }

            $pdo->beginTransaction();

            $stmtUpdate = $pdo->prepare("UPDATE advertisements SET name = ?, title = ?, description = ?, target_url = ?, sponsor_label = ?, format = ?, status = ?, has_expiration = ?, expiration_date = ?, settings = ? WHERE id = ?");
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
                $settings,
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

            $this->getInvalidator()?->advertisement($adUuid, $providerUuid);

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
            $stmt = $pdo->prepare("SELECT a.status, p.uuid AS provider_uuid FROM advertisements a INNER JOIN ad_providers p ON a.provider_id = p.id WHERE a.uuid = ?");
            $stmt->execute([$adUuid]);
            $ad = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$ad) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $newStatus = ($ad['status'] === 'active') ? 'inactive' : 'active';
            $stmtUpdate = $pdo->prepare("UPDATE advertisements SET status = ? WHERE uuid = ?");
            $stmtUpdate->execute([$newStatus, $adUuid]);

            $this->getInvalidator()?->advertisement($adUuid, $ad['provider_uuid'] ?? null);

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
            $stmtFind = $pdo->prepare("SELECT p.uuid AS provider_uuid FROM advertisements a INNER JOIN ad_providers p ON a.provider_id = p.id WHERE a.uuid = ?");
            $stmtFind->execute([$adUuid]);
            $providerUuid = $stmtFind->fetchColumn() ?: null;

            $stmt = $pdo->prepare("DELETE FROM advertisements WHERE uuid = ?");
            $stmt->execute([$adUuid]);

            if ($stmt->rowCount() === 0) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $this->getInvalidator()?->advertisement($adUuid, $providerUuid);

            return ['success' => true, 'message_key' => 'msg_ad_deleted_success'];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::deleteAd error: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'err_delete_ad_failed'];
        }
    }

    public function getPublicActiveAds(?string $visitorIp = null): array {
        $resolvedIp = $visitorIp ?: Utils::getIpAddress();

        $rawAds = null;
        $rawCacheKey = CacheConstants::PREFIX_ADS_ACTIVE_PUBLIC . ':raw';

        if ($this->redis) {
            try {
                $cached = $this->redis->get($rawCacheKey);
                if ($cached) {
                    $rawAds = json_decode($cached, true);
                }
            } catch (\Throwable $e) {}
        }

        if (!is_array($rawAds)) {
            $pdo = $this->getPdo();
            try {
                $sql = "SELECT a.id, a.uuid, a.name, a.title, a.description, a.target_url, a.sponsor_label, a.format, a.settings,
                               p.name AS provider_name, p.provider_type, p.network_id
                        FROM advertisements a
                        INNER JOIN ad_providers p ON a.provider_id = p.id
                        WHERE p.is_active = 1
                          AND (p.start_date IS NULL OR p.start_date <= NOW())
                          AND (p.has_expiration = 0 OR p.expiration_date IS NULL OR p.expiration_date >= NOW())
                          AND a.status = 'active'
                          AND (a.start_date IS NULL OR a.start_date <= NOW())
                          AND (a.has_expiration = 0 OR a.expiration_date IS NULL OR a.expiration_date >= NOW())
                        ORDER BY a.id ASC";

                $stmt = $pdo->query($sql);
                $dbAds = $stmt->fetchAll(\PDO::FETCH_ASSOC);

                $rawAds = [];
                foreach ($dbAds as $ad) {
                    // Validar que sea un formato soportado
                    if (!AdvertisementConstants::isValidFormat($ad['format'])) {
                        continue;
                    }

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

                    $ad['media'] = $media;
                    $rawAds[] = $ad;
                }

                if ($this->redis) {
                    try {
                        $this->redis->setex($rawCacheKey, CacheConstants::TTL_ONE_HOUR, json_encode($rawAds));
                    } catch (\Throwable $e) {}
                }
            } catch (\Throwable $e) {
                Logger::error("AdminAdvertisementsService::getPublicActiveAds error: " . $e->getMessage());
                return ['success' => false, 'feed_promos' => [], 'module_promos' => []];
            }
        }

        $feedAds = [];
        $moduleAds = [];

        foreach ($rawAds as $ad) {
            // Geo / ASN targeting check
            $settings = !empty($ad['settings']) ? (is_array($ad['settings']) ? $ad['settings'] : json_decode($ad['settings'], true)) : null;
            if (!GeoIpHelper::isTargetingMatch($settings, $resolvedIp)) {
                continue;
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
                'media' => $ad['media'] ?? []
            ];

            if ($ad['format'] === AdvertisementConstants::FORMAT_FEED) {
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
    }

    public function recordAdMetric(string $adUuid, string $eventType, ?string $userUuid = null, ?string $ipAddress = null, ?string $userAgent = null): array {
        if (!in_array($eventType, AdvertisementConstants::VALID_EVENTS, true)) {
            Logger::warning("AdminAdvertisementsService::recordAdMetric invalid event type '{$eventType}' for ad uuid: {$adUuid}");
            return ['success' => false, 'message_key' => 'err_invalid_metric_event'];
        }

        $eventData = [
            'ad_uuid' => $adUuid,
            'event_type' => $eventType,
            'user_uuid' => $userUuid,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent ? substr($userAgent, 0, 255) : null,
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->redis) {
            try {
                $this->redis->rpush('queue:ad_metrics', json_encode($eventData));
                return ['success' => true];
            } catch (\Throwable $e) {
                Logger::error("AdminAdvertisementsService::recordAdMetric redis error: " . $e->getMessage());
            }
        }

        $pdo = $this->getPdo();
        try {
            $stmtFind = $pdo->prepare("SELECT id, provider_id FROM advertisements WHERE uuid = ?");
            $stmtFind->execute([$adUuid]);
            $ad = $stmtFind->fetch(\PDO::FETCH_ASSOC);

            if (!$ad) {
                return ['success' => false, 'message_key' => 'err_ad_not_found'];
            }

            $stmt = $pdo->prepare("INSERT INTO ad_metrics (ad_id, provider_id, event_type, user_uuid, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $ad['id'],
                $ad['provider_id'],
                $eventType,
                $userUuid,
                $ipAddress,
                $userAgent ? substr($userAgent, 0, 255) : null
            ]);

            return ['success' => true];
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::recordAdMetric error: " . $e->getMessage());
            return ['success' => false];
        }
    }

    private function getPeriodSqlCondition(string $period, string $column = 'm.date_only'): array {
        $days = 30;
        $label = 'Últimos 30 días';

        switch ($period) {
            case AdvertisementConstants::PERIOD_7:
                $days = 7;
                $label = 'Últimos 7 días';
                break;
            case AdvertisementConstants::PERIOD_60:
                $days = 60;
                $label = 'Últimos 60 días';
                break;
            case AdvertisementConstants::PERIOD_90:
                $days = 90;
                $label = 'Últimos 90 días (Trimestre)';
                break;
            case AdvertisementConstants::PERIOD_180:
                $days = 180;
                $label = 'Últimos 180 días (Semestre)';
                break;
            case AdvertisementConstants::PERIOD_365:
                $days = 365;
                $label = 'Últimos 365 días (1 año)';
                break;
            case AdvertisementConstants::PERIOD_ALL:
                $days = null;
                $label = 'Todo el Historial Acumulado';
                break;
            case AdvertisementConstants::PERIOD_30:
            default:
                $days = 30;
                $label = 'Últimos 30 días';
                break;
        }

        $where = $days !== null ? "{$column} >= DATE_SUB(CURDATE(), INTERVAL {$days} DAY)" : "1=1";
        return ['where' => $where, 'days' => $days, 'label' => $label];
    }

    public function getAdMetricsReportData(string $adUuid, string $period = '30'): ?array {
        $cacheKey = CacheConstants::PREFIX_ADS_INDIVIDUAL_REPORT . "{$adUuid}:{$period}";
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
        try {
            $stmtAd = $pdo->prepare("SELECT a.*, p.name AS provider_name, p.provider_type, p.network_id 
                                     FROM advertisements a 
                                     INNER JOIN ad_providers p ON a.provider_id = p.id 
                                     WHERE a.uuid = ?");
            $stmtAd->execute([$adUuid]);
            $ad = $stmtAd->fetch(\PDO::FETCH_ASSOC);

            if (!$ad) {
                return null;
            }

            $adId = (int)$ad['id'];
            $periodInfo = $this->getPeriodSqlCondition($period, 'date_only');

            // Fetch resources
            $stmtRes = $pdo->prepare("SELECT * FROM ad_resources WHERE ad_id = ? ORDER BY sort_order ASC, id ASC");
            $stmtRes->execute([$adId]);
            $ad['resources'] = $stmtRes->fetchAll(\PDO::FETCH_ASSOC);

            // Fetch summary metrics for period
            $stmtSummary = $pdo->prepare("SELECT 
                COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS total_impressions,
                COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS total_clicks,
                COUNT(CASE WHEN event_type = 'video_view' THEN 1 END) AS total_video_views,
                COUNT(DISTINCT CASE WHEN user_uuid IS NOT NULL AND user_uuid != '' THEN user_uuid ELSE ip_address END) AS unique_users
                FROM ad_metrics WHERE ad_id = ? AND {$periodInfo['where']}");
            $stmtSummary->execute([$adId]);
            $summary = $stmtSummary->fetch(\PDO::FETCH_ASSOC) ?: [];

            $totImp = (int)($summary['total_impressions'] ?? 0);
            $totClk = (int)($summary['total_clicks'] ?? 0);
            $summary['ctr'] = ($totImp > 0) ? round(($totClk / $totImp) * 100, 2) : 0;

            // Fetch daily breakdown for period
            $stmtDaily = $pdo->prepare("SELECT 
                date_only, 
                COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS impressions, 
                COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS clicks 
                FROM ad_metrics 
                WHERE ad_id = ? AND {$periodInfo['where']}
                GROUP BY date_only 
                ORDER BY date_only DESC");
            $stmtDaily->execute([$adId]);
            $dailyBreakdown = $stmtDaily->fetchAll(\PDO::FETCH_ASSOC);

            $result = [
                'ad' => $ad,
                'summary' => $summary,
                'daily_breakdown' => $dailyBreakdown,
                'period_label' => $periodInfo['label']
            ];

            if ($this->redis) {
                try {
                    $this->redis->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result));
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getAdMetricsReportData error: " . $e->getMessage());
            return null;
        }
    }

    public function getGlobalMetricsReportData(string $period = '30'): array {
        $cacheKey = CacheConstants::PREFIX_ADS_GLOBAL_REPORT . $period;
        if ($this->redis) {
            try {
                $cached = $this->redis->get($cacheKey);
                if ($cached) {
                    $decoded = json_decode($cached, true);
                    if (is_array($decoded)) {
                        return $decoded;
                    }
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->getPdo();
        try {
            $periodInfo = $this->getPeriodSqlCondition($period, 'm.date_only');
            $periodWhereDirect = $this->getPeriodSqlCondition($period, 'date_only')['where'];

            // 1. Global totals
            $stmtProvidersCount = $pdo->query("SELECT COUNT(id) FROM ad_providers");
            $totalProviders = (int)$stmtProvidersCount->fetchColumn();

            $stmtAdsCount = $pdo->query("SELECT COUNT(id) FROM advertisements");
            $totalAds = (int)$stmtAdsCount->fetchColumn();

            $stmtMetricsCount = $pdo->query("SELECT 
                COUNT(CASE WHEN event_type = 'impression' THEN 1 END) AS total_impressions,
                COUNT(CASE WHEN event_type = 'click' THEN 1 END) AS total_clicks
                FROM ad_metrics WHERE {$periodWhereDirect}");
            $metricsRow = $stmtMetricsCount->fetch(\PDO::FETCH_ASSOC) ?: [];

            $totImp = (int)($metricsRow['total_impressions'] ?? 0);
            $totClk = (int)($metricsRow['total_clicks'] ?? 0);
            $avgCtr = ($totImp > 0) ? round(($totClk / $totImp) * 100, 2) : 0;

            $globalSummary = [
                'total_providers' => $totalProviders,
                'total_ads' => $totalAds,
                'total_impressions' => $totImp,
                'total_clicks' => $totClk,
                'average_ctr' => $avgCtr
            ];

            // 2. Providers breakdown
            $sqlProviders = "SELECT p.id, p.uuid, p.name, p.provider_type,
                                    (SELECT COUNT(a.id) FROM advertisements a WHERE a.provider_id = p.id) AS total_ads,
                                    (SELECT COUNT(m.id) FROM ad_metrics m WHERE m.provider_id = p.id AND m.event_type = 'impression' AND {$periodInfo['where']}) AS total_impressions,
                                    (SELECT COUNT(m.id) FROM ad_metrics m WHERE m.provider_id = p.id AND m.event_type = 'click' AND {$periodInfo['where']}) AS total_clicks
                             FROM ad_providers p
                             ORDER BY total_impressions DESC, total_ads DESC";
            $providersBreakdown = $pdo->query($sqlProviders)->fetchAll(\PDO::FETCH_ASSOC);

            // 3. Formats breakdown usando el catálogo centralizado
            $formatLabels = AdvertisementConstants::getFormatLabels();

            $formatsBreakdown = [];
            foreach ($formatLabels as $fmtKey => $fmtLabel) {
                $stmtFmt = $pdo->prepare("SELECT 
                    COUNT(DISTINCT a.id) AS total_ads,
                    (SELECT COUNT(m.id) FROM ad_metrics m INNER JOIN advertisements a2 ON m.ad_id = a2.id WHERE a2.format = :fmt1 AND m.event_type = 'impression' AND {$periodInfo['where']}) AS total_impressions,
                    (SELECT COUNT(m.id) FROM ad_metrics m INNER JOIN advertisements a3 ON m.ad_id = a3.id WHERE a3.format = :fmt2 AND m.event_type = 'click' AND {$periodInfo['where']}) AS total_clicks
                    FROM advertisements a WHERE a.format = :fmt3");
                $stmtFmt->execute([':fmt1' => $fmtKey, ':fmt2' => $fmtKey, ':fmt3' => $fmtKey]);
                $fmtRow = $stmtFmt->fetch(\PDO::FETCH_ASSOC) ?: [];

                $formatsBreakdown[$fmtKey] = [
                    'label' => $fmtLabel,
                    'total_ads' => (int)($fmtRow['total_ads'] ?? 0),
                    'total_impressions' => (int)($fmtRow['total_impressions'] ?? 0),
                    'total_clicks' => (int)($fmtRow['total_clicks'] ?? 0)
                ];
            }

            // 4. Top Ads Ranking
            $sqlTop = "SELECT a.id, a.uuid, a.name, a.title, a.format, a.sponsor_label, p.name AS provider_name,
                              (SELECT COUNT(m.id) FROM ad_metrics m WHERE m.ad_id = a.id AND m.event_type = 'impression' AND {$periodInfo['where']}) AS impressions,
                              (SELECT COUNT(m.id) FROM ad_metrics m WHERE m.ad_id = a.id AND m.event_type = 'click' AND {$periodInfo['where']}) AS clicks
                       FROM advertisements a
                       INNER JOIN ad_providers p ON a.provider_id = p.id
                       ORDER BY clicks DESC, impressions DESC
                       LIMIT 10";
            $topAds = $pdo->query($sqlTop)->fetchAll(\PDO::FETCH_ASSOC);

            $result = [
                'global_summary' => $globalSummary,
                'providers_breakdown' => $providersBreakdown,
                'formats_breakdown' => $formatsBreakdown,
                'top_ads' => $topAds,
                'period_label' => $periodInfo['label']
            ];

            if ($this->redis) {
                try {
                    $this->redis->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result));
                } catch (\Throwable $e) {}
            }

            return $result;
        } catch (\Throwable $e) {
            Logger::error("AdminAdvertisementsService::getGlobalMetricsReportData error: " . $e->getMessage());
            return [
                'global_summary' => [],
                'providers_breakdown' => [],
                'formats_breakdown' => [],
                'top_ads' => [],
                'period_label' => 'Últimos 30 días'
            ];
        }
    }

    public function downloadAdMetricsPdf(string $adUuid, string $period = '30'): void {
        $reportData = $this->getAdMetricsReportData($adUuid, $period);
        if (!$reportData || empty($reportData['ad'])) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message_key' => 'err_ad_not_found']);
            exit;
        }

        $pdfService = new AdMetricsPdfService();
        $pdfBytes = $pdfService->generateIndividualAdReport(
            $reportData['ad'],
            $reportData['summary'],
            $reportData['daily_breakdown'],
            $reportData['period_label'] ?? 'Últimos 30 días'
        );

        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $reportData['ad']['name'] ?? 'Anuncio');
        $filename = "Reporte_Metricas_{$cleanName}_" . date('Ymd_His') . ".pdf";

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($pdfBytes));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        echo $pdfBytes;
        exit;
    }

    public function downloadGeneralMetricsPdf(string $period = '30'): void {
        $globalData = $this->getGlobalMetricsReportData($period);
        if (empty($globalData['global_summary'])) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message_key' => 'admin_ad_metrics_empty']);
            exit;
        }

        $pdfService = new AdMetricsPdfService();
        $pdfBytes = $pdfService->generateGlobalAdsReport(
            $globalData['global_summary'],
            $globalData['providers_breakdown'],
            $globalData['formats_breakdown'],
            $globalData['top_ads'],
            $globalData['period_label'] ?? 'Últimos 30 días'
        );

        $filename = "Reporte_Metricas_Globales_Publicidad_" . date('Ymd_His') . ".pdf";

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($pdfBytes));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        echo $pdfBytes;
        exit;
    }
}
