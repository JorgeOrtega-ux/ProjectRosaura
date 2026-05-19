<?php
namespace App\Core\Interfaces;

interface TelemetryRepositoryInterface {
    public function getApiLatencyStats(string $startDate, string $endDate): array;

    public function getPageviewsStats(string $startDate, string $endDate): array;

    public function getPageInteractionsStats(string $startDate, string $endDate): array;

    public function getAuthEventsStats(string $startDate, string $endDate): array;
}
?>