<?php
// api/services/SearchServices.php

namespace App\Api\Services;

use App\Config\TypesenseManager;
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
            
            // FILTROS CORREGIDOS: Typesense es estricto con los paréntesis.
            if ($currentUserId) {
                // Si está logueado: Ve los públicos + LOS SUYOS
                $filter = "(privacy:=public || owner_id:={$currentUserId}) && scope_type:=personal";
            } else {
                // Si es visitante: Solo ve los públicos (sin paréntesis innecesarios)
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
                        'snapshot_url' => $this->getSnapshotUrl((int)$doc['id'])
                    ];
                }
            }

            return $canvases;

        } catch (\Throwable $e) {
            // Ya sabemos que funciona, lo devolvemos a los logs internos
            Logger::error("Error de Typesense: " . $e->getMessage(), ['exception' => $e]);
            
            // Como ya expusimos la verdad en BaseController, lanzamos el error
            // para que no falle silenciosamente si vuelve a ocurrir
            throw new \Exception("Typesense falló: " . $e->getMessage());
        }
    }
    
    private function getSnapshotUrl(int $id): ?string {
        $snapshotPath = "/assets/img/snapshots/canvas_" . $id . ".png";
        $physicalPath = dirname(__DIR__, 3) . '/public' . $snapshotPath;
        if (file_exists($physicalPath)) {
            $timestamp = filemtime($physicalPath);
            return $snapshotPath . "?v=" . $timestamp;
        }
        return null;
    }
}
?>