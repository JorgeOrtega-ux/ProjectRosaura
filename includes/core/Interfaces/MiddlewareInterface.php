<?php
// includes/core/Interfaces/MiddlewareInterface.php

namespace App\Core\Interfaces;

interface MiddlewareInterface {
    /**
     * Procesa la petición antes de que llegue al controlador.
     *
     * @param array $input  Los datos de la petición (POST, JSON, etc.)
     * @param array $params Parámetros de configuración definidos en el route-map
     * @return bool         True si la petición puede continuar, False si debe detenerse.
     */
    public function handle(array $input, array $params = []): bool;
}
?>