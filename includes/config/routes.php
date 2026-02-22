<?php
// includes/config/routes.php

return [
    '/' => ['view' => 'app/home.php'],
    '/explore' => ['view' => 'app/explore.php'],
    '/login' => ['view' => 'auth/login.php'],
    '/register' => ['view' => 'auth/register.php'],
    '/register/aditional-data' => ['view' => 'auth/register.php'],
    '/register/verification-account' => ['view' => 'auth/register.php']
];
?>