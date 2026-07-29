<?php

namespace App\Api\Services\Search;

use App\Config\Search\TypesenseManager;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use Exception;

class SearchServices {
    private TypesenseManager $typesenseManager;
    private DatabaseManager $dbManager;

    public function __construct(TypesenseManager $typesenseManager, DatabaseManager $dbManager) {
        $this->typesenseManager = $typesenseManager;
        $this->dbManager = $dbManager;
    }

    public function searchCanvases(string $query, ?int $currentUserId): array {
        try {
            $client = $this->typesenseManager->getClient();
            
            if (!$client) {
                return [];
            }
            
            if ($currentUserId) {
                $filter = "privacy:=public || owner_id:={$currentUserId}";
            } else {
                $filter = "privacy:=public";
            }

            $searchParameters = [
                'q'                     => $query,
                'query_by'              => 'name',
                'filter_by'             => $filter,
                'typo_tokens_threshold' => 1,
                'num_typos'             => 2,
                'per_page'              => 50
            ];

            $result = $client->collections['canvases']->documents->search($searchParameters);
            $canvases = [];
            $canvasIds = [];

            if (!empty($result['hits'])) {
                foreach ($result['hits'] as $hit) {
                    $doc = $hit['document'];
                    $id = (int)$doc['id'];
                    $canvasIds[] = $id;
                    
                    $canvases[$id] = [
                        'id'           => $id, 
                        'uuid'         => $doc['uuid'],
                        'name'         => $doc['name'],
                        'owner_id'     => $doc['owner_id'] ?? null,
                        'privacy'      => $doc['privacy'],
                        'is_official'  => $doc['is_official'] ?? 0,
                        'is_favorite'  => false,
                        'favorites_count' => 0,
                        'members_count'   => 0,
                        'online_players'  => 0,
                        'is_owner'     => $currentUserId !== null && $currentUserId === (int)($doc['owner_id'] ?? 0),
                        'thumbnail_url' => $this->getThumbnailUrl($doc['uuid'])
                    ];
                }
                
                if (!empty($canvasIds)) {
                    $this->enrichCanvasesWithDbData($canvases, $canvasIds, $currentUserId);
                    $this->enrichCanvasesWithOnlineStatus($canvases, $canvasIds);
                }
            }

            return array_values($canvases);

        } catch (\Throwable $e) {
            Logger::error("Error de Typesense: " . $e->getMessage(), ['exception' => $e]);
            throw new \Exception("Typesense falló: " . $e->getMessage());
        }
    }
    
    private function enrichCanvasesWithDbData(array &$canvases, array $canvasIds, ?int $currentUserId): void {
        try {
            $db = $this->dbManager->getConnection(DB::CONN_CANVASES);
            $inQuery = implode(',', array_fill(0, count($canvasIds), '?'));
            
            $userIdParam = $currentUserId ?? 0;
            
            $sql = "SELECT c.id, c.favorites_count, c.members_count, 
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = ?
                    WHERE c.id IN ($inQuery)";
                    
            $stmt = $db->prepare($sql);
            
            $params = [$userIdParam];
            foreach ($canvasIds as $id) {
                $params[] = $id;
            }
            
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($rows as $row) {
                $id = (int)$row['id'];
                if (isset($canvases[$id])) {
                    $canvases[$id]['favorites_count'] = (int)$row['favorites_count'];
                    $canvases[$id]['members_count'] = (int)$row['members_count'];
                    $canvases[$id]['is_favorite'] = (bool)$row['is_favorite'];
                }
            }
        } catch (\Exception $e) {
            Logger::error("Error enriching search canvases from DB: " . $e->getMessage());
        }
    }
    
    private function enrichCanvasesWithOnlineStatus(array &$canvases, array $canvasIds): void {
        try {
            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                    foreach ($canvasIds as $idx => $cId) {
                        if ($rawCounts[$idx] !== false) {
                            $canvases[$cId]['online_players'] = (int)$rawCounts[$idx];
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Logger::error("Error enriching search canvases from Redis: " . $e->getMessage());
        }
    }
    
    private function getThumbnailUrl(string $uuid): ?string {
        return \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $uuid . ".webp");
    }
}
?>