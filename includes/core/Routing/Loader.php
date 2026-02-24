<?php
// includes/core/Routing/Loader.php

namespace App\Core\Routing;

class Loader {
    private $viewsPath;

    public function __construct() {
        // SE AGREGÓ UN ../ EXTRA A LA RUTA
        $this->viewsPath = __DIR__ . '/../../../includes/views/';
    }

    public function load($viewName) {
        $file = $this->viewsPath . $viewName;
        
        if (file_exists($file)) {
            require $file;
        } else {
            http_response_code(404);
            echo "<div class='view-content' style='padding: 24px; text-align: center;'><h1 style='color: #d32f2f;'>404 - Vista no encontrada</h1><p style='color: #666;'>No se localizó el archivo: " . htmlspecialchars($viewName) . "</p></div>";
        }
    }
}
?>