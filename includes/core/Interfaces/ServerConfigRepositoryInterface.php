<?php
// includes/core/Interfaces/ServerConfigRepositoryInterface.php

namespace App\Core\Interfaces;

interface ServerConfigRepositoryInterface {
    /**
     * Obtiene la configuración global del servidor.
     * @return array
     */
    public function getConfig(): array;

    /**
     * Actualiza múltiples valores de la configuración del servidor.
     * @param array $data
     * @return bool
     */
    public function updateConfig(array $data): bool;
}
?>