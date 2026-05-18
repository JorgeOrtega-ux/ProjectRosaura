<?php
namespace App\Api\Services;

use App\Config\RedisCache;

class TelemetryServices {
    private RedisCache $redis;

    public function __construct(RedisCache $redis) {
        $this->redis = $redis;
    }

    public function logApiLatency(array $data): void {
        $this->pushToQueue('telemetry_api_latency', $data);
    }

    public function logAuthEvent(array $data): void {
        $this->pushToQueue('telemetry_auth', $data);
    }

    public function processFrontendPayload(array $payload, ?string $userUuid, ?string $ipAddress): void {
        if (!isset($payload['type']) || !isset($payload['data'])) {
            return;
        }

        $type = $payload['type'];
        $data = $payload['data'];
        
        // Inyectar contexto de servidor en los datos del cliente
        $data['user_uuid'] = $userUuid;
        
        if ($type === 'pageview') {
            $this->pushToQueue('telemetry_pageviews', $data);
        } elseif ($type === 'canvas_interaction') {
            $this->pushToQueue('telemetry_canvas', $data);
        }
    }

    private function pushToQueue(string $queueName, array $data): void {
        try {
            // Asegurar un timestamp si el cliente/middleware no lo generó
            if (!isset($data['created_at'])) {
                $data['created_at'] = date('Y-m-d H:i:s');
            }
            
            $jsonPayload = json_encode($data);
            if ($jsonPayload) {
                // CORRECCIÓN AQUÍ: Usamos getClient() nativo de tu clase RedisCache
                $client = $this->redis->getClient();
                if ($client) {
                    $client->rPush($queueName, [$jsonPayload]);
                }
            }
        } catch (\Exception $e) {
            // Falla silenciosa: No queremos que un error en telemetría rompa la app
            error_log("Telemetry Redis Push Error: " . $e->getMessage());
        }
    }
}
?>