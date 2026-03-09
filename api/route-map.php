<?php
// api/route-map.php

return [
    // --- RUTAS APP FRONTEND ---
    'app.get_feed'         => ['controller' => 'App\Api\Controllers\FeedController', 'action' => 'get_feed'],

    // --- RUTA CANALES (Suscripciones, Banner y Perfil) ---
    'channel.toggle_subscription' => ['controller' => 'App\Api\Controllers\ChannelController', 'action' => 'toggle_subscription'],
    'channel.upload_banner'       => ['controller' => 'App\Api\Controllers\ChannelController', 'action' => 'upload_banner'],
    'channel.update_profile'      => ['controller' => 'App\Api\Controllers\ChannelController', 'action' => 'update_profile'],

    // --- RUTAS DE AUTENTICACIÓN ---
    'auth.register.step1'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step1'],
    'auth.register.step2'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_step2'],
    'auth.register.verify' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_verify'],
    'auth.register.resend_code' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'register_resend_code'],
    'auth.login'           => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'login'],
    'auth.login.verify_2fa'=> ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'login_verify_2fa'],
    'auth.logout'          => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'logout'],
    'auth.forgot_password' => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'forgot_password'],
    'auth.reset_password'  => ['controller' => 'App\Api\Controllers\AuthController', 'action' => 'reset_password'],

    // --- RUTAS DE CONFIGURACIÓN / PERFIL ---
    'settings.update_avatar'      => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_avatar'],
    'settings.delete_avatar'      => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_avatar'],
    'settings.update_username'    => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_username'],
    'settings.request_email_code' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'request_email_code'],
    'settings.resend_email_code'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'resend_email_code'],
    'settings.verify_email_code'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_email_code'],
    'settings.update_email'       => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_email'],
    
    // --- RUTAS PREFERENCIAS ---
    'settings.update_preferences' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_preferences'],
    
    // --- RUTAS SEGURIDAD ---
    'settings.verify_current_password' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'verify_current_password'],
    'settings.update_password'         => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'update_password'],
    'settings.delete_account'          => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'delete_account'],
    
    // --- NUEVAS RUTAS 2FA ---
    'settings.2fa_generate' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'generate_2fa'],
    'settings.2fa_enable'   => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'enable_2fa'],
    'settings.2fa_disable'  => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'disable_2fa'],
    'settings.2fa_regenerate_recovery' => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'regenerate_recovery_codes'],

    // --- RUTAS DISPOSITIVOS ---
    'settings.get_devices'       => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'get_devices'],
    'settings.revoke_device'     => ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_device'],
    'settings.revoke_all_devices'=> ['controller' => 'App\Api\Controllers\SettingsController', 'action' => 'revoke_all_devices'],

    // --- RUTAS ADMINISTRADOR ---
    'admin.get_user'              => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_user'],
    'admin.update_avatar'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_avatar'],
    'admin.delete_avatar'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_avatar'],
    'admin.update_username'       => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_username'],
    'admin.update_email'          => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_email'],
    'admin.update_preference'     => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_preference'],
    'admin.update_role'           => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_role'],
    'admin.update_status'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_status'],
    'admin.get_moderation_kardex' => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_moderation_kardex'],
    'admin.add_admin_note'        => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'add_admin_note'],
    
    // --- RUTAS DE CONFIGURACIÓN DEL SERVIDOR ---
    'admin.get_server_config'     => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_server_config'],
    'admin.update_server_config'  => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_server_config'],

    // --- RUTAS DE COPIAS DE SEGURIDAD ---
    'admin.create_backup'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'create_backup'],
    'admin.backup_status'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'backup_status'],
    'admin.restore_backup'        => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'restore_backup'],
    'admin.delete_backup'         => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_backup'],

    // --- RUTAS DE LOGS ---
    'admin.read_logs'             => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'read_logs'],
    'admin.delete_logs'           => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_logs'],
    
    // --- RUTAS DE ETIQUETAS/TAGS (ADMIN) ---
    'admin.get_tags'              => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'get_tags'],
    'admin.create_tag'            => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'create_tag'],
    'admin.update_tag'            => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'update_tag'],
    'admin.delete_tag'            => ['controller' => 'App\Api\Controllers\AdminController', 'action' => 'delete_tag'],
    
    // --- RUTAS DEL STUDIO (VIDEOS) ---
    'studio.upload_video'         => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'upload_video'],
    'studio.upload_thumbnail'     => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'upload_thumbnail'],
    'studio.update_title'         => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'update_title'],
    'studio.get_active_uploads'   => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_active_uploads'],
    'studio.get_all_videos'       => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_all_videos'],
    'studio.get_video'            => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_video'],
    'studio.publish_video'        => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'publish_video'],
    'studio.cancel_upload'        => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'cancel_upload'],
    'studio.delete_video'         => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'delete_video'],
    'studio.create_playlist'      => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'create_playlist'],
    'studio.get_playlists'        => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_playlists'],
    'studio.update_playlist'      => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'update_playlist'],
    'studio.delete_playlist'      => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'delete_playlist'],
    
    // --- NUEVAS RUTAS DE PLAYLISTS / VIDEOS ---
    'studio.get_playlist_videos'  => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_playlist_videos'],
    'studio.sync_playlist_videos' => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'sync_playlist_videos'],
    
    // --- RUTAS DE TAGS PARA EL STUDIO ---
    'studio.get_models'           => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_models'],
    'studio.get_categories'       => ['controller' => 'App\Api\Controllers\StudioController', 'action' => 'get_categories'],
];
?>