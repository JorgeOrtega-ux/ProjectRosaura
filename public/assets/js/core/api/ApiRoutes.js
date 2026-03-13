// public/assets/js/core/api/ApiRoutes.js

export const ApiRoutes = {
    App: {
        GetFeed: 'app.get_feed',
        GetPlaylistDetails: 'app.get_playlist_details',
        GetPlaylistQueue: 'app.get_playlist_queue' 
    },
    Search: {
        Get: 'search.get' // <-- RUTA DE BÚSQUEDA AÑADIDA
    },
    Video: {
        RegisterView: 'video.register_view',
        ToggleLike: 'video.toggle_like'
    },
    Media: {
        GetMediaToken: 'media.get_token' 
    },
    Channel: {
        ToggleSubscription: 'channel.toggle_subscription',
        UploadBanner: 'channel.upload_banner',
        UpdateProfile: 'channel.update_profile'
    },
    Auth: {
        Login: 'auth.login',
        LoginVerify2FA: 'auth.login.verify_2fa',
        RegisterStep1: 'auth.register.step1',
        RegisterStep2: 'auth.register.step2',
        RegisterVerify: 'auth.register.verify',
        RegisterResendCode: 'auth.register.resend_code',
        Logout: 'auth.logout',
        ForgotPassword: 'auth.forgot_password',
        ResetPassword: 'auth.reset_password'
    },
    Settings: {
        UpdateAvatar: 'settings.update_avatar',
        DeleteAvatar: 'settings.delete_avatar',
        UpdateUsername: 'settings.update_username',
        RequestEmailCode: 'settings.request_email_code',
        ResendEmailCode: 'settings.resend_email_code',
        VerifyEmailCode: 'settings.verify_email_code',
        UpdateEmail: 'settings.update_email',
        UpdatePreferences: 'settings.update_preferences',
        VerifyCurrentPassword: 'settings.verify_current_password',
        UpdatePassword: 'settings.update_password',
        DeleteAccount: 'settings.delete_account',
        Generate2FA: 'settings.2fa_generate',
        Enable2FA: 'settings.2fa_enable',
        Disable2FA: 'settings.2fa_disable',
        RegenerateRecoveryCodes: 'settings.2fa_regenerate_recovery',
        GetDevices: 'settings.get_devices',
        RevokeDevice: 'settings.revoke_device',
        RevokeAllDevices: 'settings.revoke_all_devices'
    },
    Admin: {
        GetUser: 'admin.get_user',
        UpdateAvatar: 'admin.update_avatar',
        DeleteAvatar: 'admin.delete_avatar',
        UpdateUsername: 'admin.update_username',
        UpdateEmail: 'admin.update_email',
        UpdatePreference: 'admin.update_preference',
        UpdateRole: 'admin.update_role',
        UpdateStatus: 'admin.update_status',
        GetModerationKardex: 'admin.get_moderation_kardex',
        AddAdminNote: 'admin.add_admin_note',
        GetServerConfig: 'admin.get_server_config',
        UpdateServerConfig: 'admin.update_server_config',
        CreateBackup: 'admin.create_backup',
        RestoreBackup: 'admin.restore_backup',
        DeleteBackup: 'admin.delete_backup',
        ReadLogs: 'admin.read_logs',
        DeleteLogs: 'admin.delete_logs',
        GetTags: 'admin.get_tags',
        CreateTag: 'admin.create_tag',
        UpdateTag: 'admin.update_tag',
        DeleteTag: 'admin.delete_tag'
    },
    Studio: {
        UploadVideo: 'studio.upload_video',
        UploadThumbnail: 'studio.upload_thumbnail',
        UpdateTitle: 'studio.update_title',
        GetActiveUploads: 'studio.get_active_uploads',
        GetAllVideos: 'studio.get_all_videos',
        GetVideo: 'studio.get_video',
        PublishVideo: 'studio.publish_video',
        CancelUpload: 'studio.cancel_upload',
        DeleteVideo: 'studio.delete_video',
        GetModels: 'studio.get_models',
        GetCategories: 'studio.get_categories',
        GetPlaylists: 'studio.get_playlists',
        CreatePlaylist: 'studio.create_playlist',
        UpdatePlaylist: 'studio.update_playlist',
        DeletePlaylist: 'studio.delete_playlist',
        GetPlaylistVideos: 'studio.get_playlist_videos',
        SyncPlaylistVideos: 'studio.sync_playlist_videos'
    },
    Comments: {
        Get: 'comments.get',
        Create: 'comments.create',
        React: 'comments.react'
    },
    Metrics: {
        IngestRetention: 'metrics.retention.ingest',
        GetRetention: 'metrics.retention.get'
    }
};