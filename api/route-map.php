<?php
// api/route-map.php

return [
    // --- RUTAS APP FRONTEND ---
    'app.get_feed'             => ['controller' => 'App\Api\Controllers\FeedController', 'action' => 'get_feed'],
    'app.get_playlist_details' => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'getDetails'],
    'app.get_playlist_queue'   => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'getQueue'],
    'app.get_video_details'    => ['controller' => 'App\Api\Controllers\VideoController', 'action' => 'getVideoDetails'],
    
    // ---> AÑADIDO: RUTA DE RECOMENDACIONES (Corrige el error 404) <---
    'app.get_recommendations'  => ['controller' => 'App\Api\Controllers\FeedController', 'action' => 'getRecommendations'],
    
    // --- RUTA DE BÚSQUEDA (MEILISEARCH) ---
    'search.get'               => ['controller' => 'ProjectRosaura\Controllers\SearchController', 'action' => 'search'],
    
    // --- RUTAS DE INTERACCIÓN DE VIDEOS ---
    'video.register_view'      => ['controller' => 'App\Api\Controllers\VideoController', 'action' => 'registerView'],
    'video.toggle_like'        => ['controller' => 'App\Api\Controllers\VideoController', 'action' => 'toggleLike'],

    // --- SISTEMA DE "GUARDAR EN PLAYLIST" Y FEED ---
    'playlist.get_for_video'   => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'getPlaylistsForVideo'],
    'playlist.toggle_video'    => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'toggleVideo'],
    'playlist.create'          => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'createPlaylist'],
    'playlist.get_all'         => ['controller' => 'App\Api\Controllers\PlaylistController', 'action' => 'getAllPlaylists'],

    // --- RUTAS DE MEDIOS PROTEGIDOS (FIRMADO) ---
    'media.get_token'          => ['controller' => 'App\Api\Controllers\MediaController', 'action' => 'getStreamUrl'],
    'media.stream'             => ['controller' => 'App\Api\Controllers\MediaController', 'action' => 'stream'],

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

    // --- RUTAS DE COMENTARIOS ---
    'comments.get'    => ['controller' => 'App\Api\Controllers\CommentController', 'action' => 'index'],
    'comments.create' => ['controller' => 'App\Api\Controllers\CommentController', 'action' => 'store'],
    'comments.react'  => ['controller' => 'App\Api\Controllers\CommentController', 'action' => 'react'],

    // --- NUEVAS RUTAS DE MÉTRICAS / HEATMAP ---
    'metrics.retention.ingest' => ['controller' => 'App\Api\Controllers\MetricsController', 'action' => 'ingestRetention'],
    'metrics.retention.get'    => ['controller' => 'App\Api\Controllers\MetricsController', 'action' => 'getHeatmap'],

    // ---> AÑADIDO: RUTA DE TELEMETRÍA PARA EL WORKER <---
    'telemetry.ping'           => ['controller' => 'App\Api\Controllers\TelemetryController', 'action' => 'ping'],

    // --- RUTAS DE HISTORIAL ---
    'history.get_watch'   => ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'get_watch_history'],
    'history.get_search'  => ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'get_search_history'],
    'history.clear_watch' => ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'clear_watch_history'],
    'history.clear_search'=> ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'clear_search_history'],
    'history.remove_watch_item' => ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'remove_watch_item'],
    'history.remove_search_item'=> ['controller' => 'App\Api\Controllers\HistoryController', 'action' => 'remove_search_item'],

    // --- NUEVAS RUTAS DE RANKING DIARIO ---
    'rankings.get_all'     => ['controller' => 'App\Api\Controllers\RankingController', 'action' => 'getAllRankings'],
    'rankings.get_channel' => ['controller' => 'App\Api\Controllers\RankingController', 'action' => 'getChannelRanking'],
];
?>