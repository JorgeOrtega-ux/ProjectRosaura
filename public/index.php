<?php
// public/index.php

// 1. Cargar el núcleo (Sesiones, Seguridad, Dependencias, Configuración Inicial)
require_once __DIR__ . '/../includes/core/bootstrap.php';

// 2. Procesar el Enrutamiento (Middlewares, Permisos, Manejo de SPA)
require_once __DIR__ . '/../includes/core/route_handler.php';

// 3. Renderizar el Layout HTML Principal
require_once __DIR__ . '/../includes/layouts/app.php';
?>