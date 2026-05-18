<?php
namespace App\Core\Interfaces;

interface TelemetryRepositoryInterface {
    /**
     * Obtiene estadísticas de latencia de la API en un rango de fechas.
     */
    public function getApiLatencyStats(string $startDate, string $endDate): array;

    /**
     * Obtiene el flujo de vistas de páginas.
     */
    public function getPageviewsStats(string $startDate, string $endDate): array;

    /**
     * Obtiene estadísticas de interacciones dentro de un lienzo específico mediante su UUID.
     */
    public function getCanvasActivityStats(string $canvasUuid, string $startDate, string $endDate): array;

    /**
     * Obtiene estadísticas de eventos de autenticación y seguridad.
     */
    public function getAuthEventsStats(string $startDate, string $endDate): array;
}
?>