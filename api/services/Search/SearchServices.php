<?php

namespace App\Api\Services\Search;

use App\Config\Search\TypesenseManager;
use App\Core\System\Logger;

class SearchServices {
    private TypesenseManager $typesenseManager;

    public function __construct(TypesenseManager $typesenseManager) {
        $this->typesenseManager = $typesenseManager;
    }

    public function searchCanvases(string $query, ?int $currentUserId): array {
        try {
            $client = $this->typesenseManager->getClient();
            
            if (!$client) {
                return [];
            }
            
            if ($currentUserId) {
                $filter = "(privacy:=public || owner_id:={$currentUserId}) && scope_type:=personal";
            } else {
                $filter = "privacy:=public && scope_type:=personal";
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

            if (!empty($result['hits'])) {
                foreach ($result['hits'] as $hit) {
                    $doc = $hit['document'];
                    
                    $canvases[] = [
                        'id'           => (int)$doc['id'], 
                        'uuid'         => $doc['uuid'],
                        'name'         => $doc['name'],
                        'owner_id'     => $doc['owner_id'] ?? null,
                        'privacy'      => $doc['privacy'],
                        'scope_type'   => $doc['scope_type'],
                        'is_favorite'  => false, 
                        'thumbnail_url' => $this->getThumbnailUrl((int)$doc['id'])
                    ];
                }
            }

            return $canvases;

        } catch (\Throwable $e) {
            Logger::error("Error de Typesense: " . $e->getMessage(), ['exception' => $e]);
            throw new \Exception("Typesense falló: " . $e->getMessage());
        }
    }
    
    private function getThumbnailUrl(int $id): ?string {
        return \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $id . ".png");
    }
}
?>