<?php
// api/controllers/MetricsController.php

namespace App\Api\Controllers;

use App\Core\Container;
use App\Core\Interfaces\VideoRepositoryInterface;
use Predis\Client;

class MetricsController {
    private $videoRepo;
    private $redis;

    public function __construct() {
        // Ahora Container::getInstance() funcionará correctamente
        $container = Container::getInstance();
        
        $this->videoRepo = $container->get(VideoRepositoryInterface::class);
        
        // Obtenemos el cliente Redis directamente del contenedor (conexión compartida)
        $this->redis = $container->get(Client::class);
    }

    /**
     * POST /api/v1/metrics/retention
     * Recibe los datos cacheados del reproductor y los inyecta en Redis
     */
    public function ingestRetention() {
        // Leemos el payload JSON
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['videoId']) || !isset($input['data']) || !is_array($input['data'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid payload.']);
            return;
        }

        $videoId = (int) $input['videoId'];
        $chunksData = $input['data'];

        // Verificamos que el video exista (Opcional por rendimiento, pero seguro)
        $video = $this->videoRepo->findById($videoId);
        if (!$video) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Video not found.']);
            return;
        }

        $redisKey = "video_heatmap:{$videoId}";

        foreach ($chunksData as $chunkIndex => $viewsCount) {
            $chunkIndex = (int) $chunkIndex;
            $viewsCount = (int) $viewsCount;

            // Validación de seguridad (Anti-Spam Backend)
            // Aseguramos que el chunk esté entre 0 y 99 (100 segmentos del 1%)
            // Y que un usuario no envíe más de 10 vistas del mismo chunk en un solo envío
            if ($chunkIndex >= 0 && $chunkIndex <= 99 && $viewsCount > 0 && $viewsCount <= 10) {
                // Incrementamos usando HINCRBY (comando estándar de Redis/Predis)
                $this->redis->hincrby($redisKey, (string)$chunkIndex, $viewsCount);
            }
        }

        echo json_encode(['success' => true]);
    }

    /**
     * GET /api/v1/videos/{id}/heatmap
     * Extrae el array JSON consolidado desde MySQL para pintar la gráfica
     */
    public function getHeatmap() {
        if (!isset($_GET['videoId'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing videoId.']);
            return;
        }

        $videoId = (int) $_GET['videoId'];
        
        $heatmapData = $this->videoRepo->getRetentionData($videoId);

        // Si no hay datos aún, devolvemos un array vacío de 100 posiciones
        if (!$heatmapData) {
            $heatmapData = array_fill(0, 100, 0);
        } else {
            // Aseguramos que sea un array secuencial de 0 a 99
            $normalizedData = [];
            for ($i = 0; $i < 100; $i++) {
                $normalizedData[$i] = isset($heatmapData[(string)$i]) ? (int)$heatmapData[(string)$i] : 0;
            }
            $heatmapData = $normalizedData;
        }

        echo json_encode([
            'success' => true,
            'data' => $heatmapData
        ]);
    }
}
?>