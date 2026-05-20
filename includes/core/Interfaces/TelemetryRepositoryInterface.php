<?php
// includes/core/Interfaces/TelemetryRepositoryInterface.php

namespace App\Core\Interfaces;

interface TelemetryRepositoryInterface {
    public function getApiLatencyStats(string $startDate, string $endDate): array;

    public function getPageviewsStats(string $startDate, string $endDate): array;

    public function getAuthEventsStats(string $startDate, string $endDate): array;

    // ==========================================
    // NUEVOS MÉTODOS PARA DASHBOARD METRICS
    // ==========================================
    public function getPageviewsOverTime(string $startDate, string $endDate): array;

    public function getAuthEventsOverTime(string $startDate, string $endDate, string $eventType = 'login_success'): array;
}
?>