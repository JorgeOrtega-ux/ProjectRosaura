<?php
// api/route-map.php

return [
    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register.step1'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step1'],
    'auth.register.step2'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step2'],
    'auth.register.verify' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_verify'],
    'auth.login'           => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'login'],
    'auth.logout'          => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'logout'],
    'auth.forgot_password' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'forgot_password'],
    'auth.reset_password'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'reset_password']
];
?>