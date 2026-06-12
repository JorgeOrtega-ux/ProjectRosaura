<?php
// includes/core/Interfaces/RateLimiterInterface.php

namespace App\Core\Interfaces;

interface RateLimiterInterface {
    /**
     * Registra y evalúa un intento contra el límite permitido.
     * * @param string $key Identificador único de la acción y el usuario/IP.
     * @param int $maxAttempts Número máximo de intentos permitidos.
     * @param int $lockoutMinutes Tiempo en minutos que durará el bloqueo si se excede el límite.
     * @param bool $isCritical Define si la acción es crítica (ej. Auth). Si es true, fallará cerrado en caso de error del servicio.
     * @return array Array asociativo con 'allowed' (bool) y opcionalmente 'message_key' (string).
     */
    public function consume(string $key, int $maxAttempts, int $lockoutMinutes, bool $isCritical = false): array;

    /**
     * Limpia el registro de intentos para una llave específica (útil tras un login exitoso).
     * * @param string $key Identificador único de la acción y el usuario/IP a limpiar.
     * @return void
     */
    public function clear(string $key): void;
}
?>