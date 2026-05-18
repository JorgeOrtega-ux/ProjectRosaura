<?php
namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;

class TelemetryMiddleware implements MiddlewareInterface {
    private TelemetryServices $telemetryServices;
    private SessionManager $session;

    public function __construct(TelemetryServices $telemetryServices, SessionManager $session) {
        $this->telemetryServices = $telemetryServices;
        $this->session = $session;
    }

    public function handle(array $input, array $params = []): bool {
        $endpoint = $_SERVER['REQUEST_URI'] ?? 'unknown';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Evitar loop infinito con el propio recolector de telemetría del frontend
        if (strpos($endpoint, '/api/telemetry/collect') !== false) {
            return true;
        }

        $userUuid = $this->session->get('user_uuid');
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $telemetrySvc = $this->telemetryServices; 

        // Como el framework exige retornar un booleano y no puede envolver el ciclo,
        // registramos una función de cierre para calcular la latencia final del backend.
        register_shutdown_function(function() use ($telemetrySvc, $endpoint, $method, $userUuid, $ipAddress) {
            // REQUEST_TIME_FLOAT es inyectado por PHP al inicio exacto de la petición
            $startTime = $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true);
            $latencyMs = round((microtime(true) - $startTime) * 1000, 2);
            
            $data = [
                'endpoint' => $endpoint,
                'method' => $method,
                'status_code' => http_response_code() ?: 200,
                'latency_ms' => $latencyMs,
                'user_uuid' => $userUuid,
                'ip_address' => $ipAddress,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $telemetrySvc->logApiLatency($data);
        });

        // Retornamos true para cumplir la interfaz y dejar que el Router continúe
        return true; 
    }
}
?>