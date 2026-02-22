<?php
// api/route-map.php

return [
    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register' => ['file' => 'handler/auth-handler.php', 'action' => 'register'],
    'auth.login'    => ['file' => 'handler/auth-handler.php', 'action' => 'login'],
    'auth.logout'   => ['file' => 'handler/auth-handler.php', 'action' => 'logout']
];
?>