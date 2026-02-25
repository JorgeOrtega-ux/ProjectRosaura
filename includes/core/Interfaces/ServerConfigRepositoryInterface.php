<?php
// includes/core/Interfaces/ServerConfigRepositoryInterface.php

namespace App\Core\Interfaces;

interface ServerConfigRepositoryInterface {
    /**
     * Obtiene la configuración global del servidor.
     * @return array
     */
    public function getConfig(): array;
}
?>