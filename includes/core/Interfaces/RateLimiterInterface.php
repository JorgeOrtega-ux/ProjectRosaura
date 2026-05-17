<?php
// includes/core/Interfaces/RateLimiterInterface.php

namespace App\Core\Interfaces;

interface RateLimiterInterface {
    /**
     * Evalúa y consume un intento de forma atómica.
     * * @param string $key Identificador único pre-construido para Redis
     * @param int $maxAttempts Número máximo de intentos permitidos
     * @param int $lockoutMinutes Tiempo de expiración (castigo/ventana) en minutos
     * @return array Estructura con 'allowed' (bool) y 'message_key' (string) en caso de fallo
     */
    public function consume(string $key, int $maxAttempts, int $lockoutMinutes): array;

    /**
     * Limpia los registros de límite de tasa para una llave específica.
     * * @param string $key Identificador único pre-construido para Redis
     * @return void
     */
    public function clear(string $key): void;
}
?>