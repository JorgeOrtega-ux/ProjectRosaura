<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\TelemetryRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class TelemetryRepository implements TelemetryRepositoryInterface {
    private PDO $db;

    // 1. SOLUCIÓN DE ARQUITECTURA: Inyectar DatabaseManager en lugar de PDO
    public function __construct(DatabaseManager $dbManager) {
        $this->db = $dbManager->getConnection(DB::CONN_TELEMETRY);
    }

    public function getApiLatencyStats(string $startDate, string $endDate): array {
        $tbl = DB::TBL_TELEMETRY_API_LATENCY; // 2. USO DE CONSTANTES
        $stmt = $this->db->prepare("
            SELECT endpoint, method, AVG(latency_ms) as avg_latency, COUNT(*) as total_requests 
            FROM {$tbl} 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY endpoint, method 
            ORDER BY avg_latency DESC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPageviewsStats(string $startDate, string $endDate): array {
        $tbl = DB::TBL_TELEMETRY_PAGEVIEWS;
        $stmt = $this->db->prepare("
            SELECT path, COUNT(*) as visits, AVG(load_time_ms) as avg_load_time 
            FROM {$tbl} 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY path 
            ORDER BY visits DESC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAuthEventsStats(string $startDate, string $endDate): array {
        $tbl = DB::TBL_TELEMETRY_AUTH_EVENTS;
        $stmt = $this->db->prepare("
            SELECT event_type, COUNT(*) as event_count 
            FROM {$tbl} 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY event_type
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPageviewsOverTime(string $startDate, string $endDate): array {
        $tbl = DB::TBL_TELEMETRY_PAGEVIEWS;
        $stmt = $this->db->prepare("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM {$tbl} 
            WHERE created_at >= :start AND created_at <= :end 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAuthEventsOverTime(string $startDate, string $endDate, string $eventType = 'login_success'): array {
        $tbl = DB::TBL_TELEMETRY_AUTH_EVENTS;
        $stmt = $this->db->prepare("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM {$tbl} 
            WHERE event_type = :event_type AND created_at >= :start AND created_at <= :end 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate, 'event_type' => $eventType]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>