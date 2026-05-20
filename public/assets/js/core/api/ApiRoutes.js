// public/assets/js/core/api/ApiRoutes.js

export const ApiRoutes = {
    Auth: {
        Login: 'auth.login',
        LoginVerify2FA: 'auth.login.verify_2fa',
        CancelAccountDeletion: 'auth.cancel_account_deletion',
        RegisterStep1: 'auth.register.step1',
        RegisterStep2: 'auth.register.step2',
        RegisterVerify: 'auth.register.verify',
        RegisterResendCode: 'auth.register.resend_code',
        
        // Rutas Multi-Sesión
        SwitchAccount: 'auth.switch_account',
        LogoutAll: 'auth.logout_all',
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
        GetDashboardMetrics: 'admin.get_dashboard_metrics', // NUEVA RUTA
        GetUser: 'admin.get_user',
        UpdateAvatar: 'admin.update_avatar',
        DeleteAvatar: 'admin.delete_avatar',
        UpdateUsername: 'admin.update_username',
        UpdateEmail: 'admin.update_email',
        UpdatePreference: 'admin.update_preference',
        UpdateRole: 'admin.update_role',
        
        // --- GESTIÓN DE ESTADO ---
        UpdateSuspension: 'admin.update_suspension', 
        DeleteUsers: 'admin.delete_users', 
        
        GetModerationKardex: 'admin.get_moderation_kardex',
        AddAdminNote: 'admin.add_admin_note',
        
        // --- RUTAS DE GESTIÓN DE ROLES Y PERMISOS ---
        GetRoles: 'admin.get_roles',
        CreateRole: 'admin.create_role',
        EditRole: 'admin.edit_role',
        DeleteRole: 'admin.delete_role',
        GetPermissions: 'admin.get_permissions',
        GetRolePermissions: 'admin.get_role_permissions',
        UpdateRolePermissions: 'admin.update_role_permissions',
        
        GetServerConfig: 'admin.get_server_config',
        UpdateServerConfig: 'admin.update_server_config',
        
        // --- RUTAS DE MANTENIMIENTO DEL SERVIDOR ---
        MaintenanceFlushSessions: 'admin.maintenance_flush_sessions',
        MaintenanceClearCache: 'admin.maintenance_clear_cache',
        MaintenanceResetRateLimits: 'admin.maintenance_reset_rate_limits',
        TogglePanicMode: 'admin.toggle_panic_mode', // NUEVO PROTOCOLO

        CreateBackup: 'admin.create_backup',
        RestoreBackup: 'admin.restore_backup',
        ReadLogs: 'admin.read_logs'
    }
};