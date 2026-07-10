<?php
namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Api\Services\TelemetryServices;
use App\Core\System\SessionManager;
use App\Core\Helpers\Utils;

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
        if (strpos($endpoint, '/api/telemetry/collect') !== false) {
            return true;
        }
        $allowTelemetry = $this->session->get('allow_telemetry');
        if ($allowTelemetry === false) {
            return true; 
        }

        $userUuid = $this->session->get('user_uuid');
        $ipAddress = Utils::getIpAddress();
        $startTime = $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true);
        $latencyMs = round((microtime(true) - $startTime) * 1000, 2);
        
        $data = [
            'endpoint' => $endpoint,
            'method' => $method,
            'status_code' => 200,
            'latency_ms' => $latencyMs,
            'user_uuid' => $userUuid,
            'ip_address' => $ipAddress,
            'created_at' => date('Y-m-d H:i:s')
        ];
        $this->telemetryServices->logApiLatency($data);

        return true; 
    }
}
?>