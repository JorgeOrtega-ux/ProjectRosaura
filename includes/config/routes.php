<?php
// includes/config/routes.php

return [
    '/' => ['view' => 'app/home.php'],
    '/explore' => ['view' => 'app/explore.php'],
    
    // --- RUTA DEL SISTEMA DE BÚSQUEDA ---
    '/results' => ['view' => 'app/search.php'],

    // --- RUTAS DEL REPRODUCTOR DE VIDEO Y SHORTS ---
    '/watch/{video_uuid}' => ['view' => 'app/watch.php'], 
    '/shorts/{video_uuid}' => ['view' => 'app/watch.php'], // NUEVA RUTA: Carga la vista del reproductor para los shorts

    // --- NUEVA RUTA DE VISTA DE PLAYLIST ---
    '/playlist' => ['view' => 'app/playlist.php'], // Modificado: Ahora acepta ?list=...
    '/rankings' => ['view' => 'app/rankings.php'], // Modificado: Ahora acepta ?list=...
    '/playlist/{uuid}' => ['view' => 'app/playlist.php'], // Mantenemos compatibilidad hacia atrás
    
    // --- NUEVA RUTA: FEED DE PLAYLISTS ---
    '/feed/playlists' => ['view' => 'app/feed-playlists.php', 'auth' => true],
    
    // --- RUTA DINÁMICA DE CANALES ---
    '/@{identifier}' => ['view' => 'app/channel.php'], 
    '/@{identifier}/{tab}' => ['view' => 'app/channel.php'],

    // --- NUEVA RUTA PARA EDITAR PERFIL DE CANAL ---
    '/channel/{uuid}/editing/profile' => ['view' => 'app/channel-edit-profile.php', 'auth' => true],
    
    // --- RUTAS DE AUTENTICACIÓN (Solo invitados) ---
    '/login' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/login/two-factor' => ['view' => 'auth/login.php', 'guest_only' => true],
    '/register' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/aditional-data' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/register/verification-account' => ['view' => 'auth/register.php', 'guest_only' => true],
    '/forgot-password' => ['view' => 'auth/forgot-password.php', 'guest_only' => true],
    '/reset-password' => ['view' => 'auth/reset-password.php', 'guest_only' => true],
    
    // --- RUTAS DE SISTEMA PÚBLICAS (Manejo de estados) ---
    '/account-suspended' => ['view' => 'system/message.php'],
    '/account-deleted' => ['view' => 'system/message.php'],
    '/age-restricted' => ['view' => 'system/message.php'], // NUEVA RUTA PARA RECHAZO DE EDAD
    
    // --- RUTAS DE CONFIGURACIÓN ---
    '/settings' => ['view' => 'settings/index.php'],
    '/settings/guest' => ['view' => 'settings/guest.php', 'guest_only' => true],

    // --- RUTAS PROTEGIDAS (Requieren autenticación) ---
    '/settings/your-profile' => ['view' => 'settings/your-profile.php', 'auth' => true],
    '/settings/security' => ['view' => 'settings/security.php', 'auth' => true],
    '/settings/accessibility' => ['view' => 'settings/accessibility.php', 'auth' => true],
    '/settings/change-password' => ['view' => 'settings/change-password.php', 'auth' => true],
    '/settings/2fa' => ['view' => 'settings/2fa.php', 'auth' => true],
    '/settings/2fa/recovery-codes' => ['view' => 'settings/2fa-recovery-codes.php', 'auth' => true],
    '/settings/2fa/deactivate' => ['view' => 'settings/2fa-deactivate.php', 'auth' => true],
    '/settings/devices' => ['view' => 'settings/devices.php', 'auth' => true],
    '/settings/delete-account' => ['view' => 'settings/delete-account.php', 'auth' => true],

    // --- RUTAS DE STUDIO ---
    '/studio' => ['view' => 'studio/index.php', 'auth' => true],
    '/studio/upload' => ['view' => 'studio/upload-video.php', 'auth' => true],
    '/studio/uploading' => ['view' => 'studio/uploading.php', 'auth' => true],
    '/studio/management-panel/{uuid}' => ['view' => 'studio/management-panel.php', 'auth' => true],
    '/studio/manage-content/{uuid}' => ['view' => 'studio/manage-content.php', 'auth' => true],
    '/studio/manage-content/playlist/{uuid}' => ['view' => 'studio/manage-content-playlist.php', 'auth' => true],
    '/studio/edit/{uuid}/{video_uuid}' => ['view' => 'studio/edit-video.php', 'auth' => true],

    // --- RUTAS DE ADMINISTRADOR ---
    '/admin' => ['view' => 'admin/dashboard.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/dashboard' => ['view' => 'admin/dashboard.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/manage-users' => ['view' => 'admin/manage-users.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/edit-user' => ['view' => 'admin/edit-user.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/edit-role' => ['view' => 'admin/edit-role.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/edit-status' => ['view' => 'admin/edit-status.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/backups' => ['view' => 'admin/backups.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/backups/automation' => ['view' => 'admin/backups-automation.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/server-config' => ['view' => 'admin/server-config.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/logs' => ['view' => 'admin/logs.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/logs/viewer' => ['view' => 'admin/logs-viewer.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => true],
    '/admin/tags' => ['view' => 'admin/tags.php', 'auth' => true, 'roles' => ['founder', 'administrator'], 'requires_2fa' => false],

    // --- RUTAS DE API (Comentarios) ---
    '/api/comments' => ['controller' => 'CommentController', 'action' => 'index', 'api' => true],
    '/api/comments/create' => ['controller' => 'CommentController', 'action' => 'store', 'api' => true, 'auth' => true],
    '/api/comments/react' => ['controller' => 'CommentController', 'action' => 'react', 'api' => true, 'auth' => true],
    '/settings/history' => ['view' => 'settings/history.php', 'auth' => true]
];
?>