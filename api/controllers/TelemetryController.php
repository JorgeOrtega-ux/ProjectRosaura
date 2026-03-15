<?php
// api/controllers/TelemetryController.php

namespace App\Api\Controllers;

use App\Config\RedisCache;
use App\Core\System\SessionManager;

class TelemetryController {
    private $redis;
    private $session;

    // Se inyecta SessionManager en el constructor
    public function __construct(RedisCache $redis, SessionManager $session) {
        $this->redis = $redis;
        $this->session = $session;
    }

    public function ping($input) {
        // CORRECCIÓN: Uso correcto del SessionManager instanciado
        $userId = $this->session->get('user_id'); 
        
        if (!$userId) {
            return ['success' => false, 'message' => 'No autorizado'];
        }

        $videoUuid = $input['video_uuid'] ?? null;
        $watchTime = isset($input['watch_time']) ? (float)$input['watch_time'] : 0;
        $percentage = isset($input['percentage']) ? (float)$input['percentage'] : 0;

        if (!$videoUuid || $watchTime <= 0) {
            return ['success' => false, 'message' => 'Datos inválidos'];
        }

        $payload = json_encode([
            'user_id' => $userId,
            'video_uuid' => $videoUuid,
            'watch_time' => $watchTime,
            'percentage' => $percentage,
            'timestamp' => time()
        ]);

        // Empujar directo a la cola de procesamiento del Worker en Python
        $this->redis->rPush('telemetry:watch_queue', $payload);

        return ['success' => true, 'message' => 'Ping registrado'];
    }
}
?>