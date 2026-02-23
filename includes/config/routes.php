<?php
// includes/config/routes.php

return [
    '/' => ['view' => 'app/home.php'],
    '/explore' => ['view' => 'app/explore.php'],
    '/login' => ['view' => 'auth/login.php'],
    '/register' => ['view' => 'auth/register.php'],
    '/register/aditional-data' => ['view' => 'auth/register.php'],
    '/register/verification-account' => ['view' => 'auth/register.php'],
    '/forgot-password' => ['view' => 'auth/forgot-password.php'],
    '/reset-password' => ['view' => 'auth/reset-password.php'],
    
    // --- RUTAS DE CONFIGURACIÓN ---
    '/settings' => ['view' => 'settings/index.php'],
    '/settings/your-profile' => ['view' => 'settings/your-profile.php'],
    '/settings/security' => ['view' => 'settings/security.php'],
    '/settings/accessibility' => ['view' => 'settings/accessibility.php'],
    '/settings/guest' => ['view' => 'settings/guest.php']
];
?>