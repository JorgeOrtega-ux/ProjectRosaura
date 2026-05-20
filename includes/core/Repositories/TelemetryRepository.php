<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\TelemetryRepositoryInterface;
use PDO;

class TelemetryRepository implements TelemetryRepositoryInterface {
    private PDO $db;

    public function __construct(PDO $dbTelemetry) {
        $this->db = $dbTelemetry;
    }

    public function getApiLatencyStats(string $startDate, string $endDate): array {
        $stmt = $this->db->prepare("
            SELECT endpoint, method, AVG(latency_ms) as avg_latency, COUNT(*) as total_requests 
            FROM api_latency 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY endpoint, method 
            ORDER BY avg_latency DESC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPageviewsStats(string $startDate, string $endDate): array {
        $stmt = $this->db->prepare("
            SELECT path, COUNT(*) as visits, AVG(load_time_ms) as avg_load_time 
            FROM pageviews 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY path 
            ORDER BY visits DESC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAuthEventsStats(string $startDate, string $endDate): array {
        $stmt = $this->db->prepare("
            SELECT event_type, COUNT(*) as event_count 
            FROM auth_events 
            WHERE created_at BETWEEN :start AND :end 
            GROUP BY event_type
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- NUEVOS MÉTODOS PARA DASHBOARD METRICS ---
    public function getPageviewsOverTime(string $startDate, string $endDate): array {
        $stmt = $this->db->prepare("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM pageviews 
            WHERE created_at >= :start AND created_at <= :end 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAuthEventsOverTime(string $startDate, string $endDate, string $eventType = 'login_success'): array {
        $stmt = $this->db->prepare("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM auth_events 
            WHERE event_type = :event_type AND created_at >= :start AND created_at <= :end 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ");
        $stmt->execute(['start' => $startDate, 'end' => $endDate, 'event_type' => $eventType]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>