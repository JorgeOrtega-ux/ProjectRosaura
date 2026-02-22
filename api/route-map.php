<?php
// api/route-map.php

return [
    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register.step1'  => ['file' => 'handler/auth-handler.php', 'action' => 'register_step1'],
    'auth.register.step2'  => ['file' => 'handler/auth-handler.php', 'action' => 'register_step2'],
    'auth.register.verify' => ['file' => 'handler/auth-handler.php', 'action' => 'register_verify'],
    'auth.login'           => ['file' => 'handler/auth-handler.php', 'action' => 'login'],
    'auth.logout'          => ['file' => 'handler/auth-handler.php', 'action' => 'logout']
];
?>