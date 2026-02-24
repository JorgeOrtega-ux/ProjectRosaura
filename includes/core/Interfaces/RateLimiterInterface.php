<?php
// includes/core/Interfaces/RateLimiterInterface.php

namespace App\Core\Interfaces;

interface RateLimiterInterface {
    /**
     * Verifica si una acción está permitida basándose en los límites de tasa.
     * @param string $action
     * @param int $maxAttempts
     * @param int $lockoutMinutes
     * @param string|null $customMsg
     * @return array
     */
    public function check($action, $maxAttempts, $lockoutMinutes, $customMsg = null);

    /**
     * Registra un intento para una acción específica.
     * @param string $action
     * @param int $maxAttempts
     * @param int $lockoutMinutes
     * @return void
     */
    public function record($action, $maxAttempts, $lockoutMinutes);

    /**
     * Limpia los registros de límite de tasa para una acción específica.
     * @param string $action
     * @return void
     */
    public function clear($action);
}
?>