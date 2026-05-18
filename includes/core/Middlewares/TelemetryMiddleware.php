<?php
namespace Core\Middlewares;

use Core\Interfaces\MiddlewareInterface;
use Services\TelemetryServices;
use Core\System\SessionManager;

class TelemetryMiddleware implements MiddlewareInterface {
    private TelemetryServices $telemetryServices;
    private SessionManager $session;

    public function __construct(TelemetryServices $telemetryServices, SessionManager $session) {
        $this->telemetryServices = $telemetryServices;
        $this->session = $session;
    }

    public function handle($request, callable $next) {
        $startTime = microtime(true);
        
        // Ejecutar la petición real
        $response = $next($request);
        
        $endTime = microtime(true);
        $latencyMs = round(($endTime - $startTime) * 1000, 2);
        
        $endpoint = $_SERVER['REQUEST_URI'] ?? 'unknown';
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        // Evitar registrar las peticiones que el propio sistema de telemetría hace
        if (strpos($endpoint, '/api/telemetry/collect') !== false) {
            return $response;
        }

        $data = [
            'endpoint' => $endpoint,
            'method' => $method,
            'status_code' => http_response_code() ?: 200,
            'latency_ms' => $latencyMs,
            'user_uuid' => $this->session->get('user_uuid'),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->telemetryServices->logApiLatency($data);

        return $response;
    }
}