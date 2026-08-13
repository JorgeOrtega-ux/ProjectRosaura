export const WsConfig = {
    port: window.APP_CONFIG?.wsPort || 8765,
    getBaseUrl: () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        return `${protocol}//${host}:${window.APP_CONFIG?.wsPort || 8765}`;
    }
};

export const ApiRoutes = {
    Auth: {
        Login: 'auth.login',
        LoginVerify2FA: 'auth.login.verify_2fa',
        CancelAccountDeletion: 'auth.cancel_account_deletion',
        RegisterStep1: 'auth.register.step1',
        RegisterStep2: 'auth.register.step2',
        RegisterVerify: 'auth.register.verify',
        RegisterResendCode: 'auth.register.resend_code',

        SwitchAccount: 'auth.switch_account',
        LogoutAll: 'auth.logout_all',
        Logout: 'auth.logout',

        ForgotPassword: 'auth.forgot_password',
        ResetPassword: 'auth.reset_password',
        Google: 'auth.google'
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
        SetFlag: 'settings.set_flag',
        VerifyCurrentPassword: 'settings.verify_current_password',
        UpdatePassword: 'settings.update_password',
        DeleteAccount: 'settings.delete_account',
        Generate2FA: 'settings.2fa_generate',
        Enable2FA: 'settings.2fa_enable',
        Disable2FA: 'settings.2fa_disable',
        RegenerateRecoveryCodes: 'settings.2fa_regenerate_recovery',
        GetDevices: 'settings.get_devices',
        RevokeDevice: 'settings.revoke_device',
        RevokeAllDevices: 'settings.revoke_all_devices',
        LinkGoogle: 'settings.link_google',
        UnlinkGoogle: 'settings.unlink_google'
    },
    Admin: {
        GetDashboardMetrics: 'admin.get_dashboard_metrics',
        GetUser: 'admin.get_user',
        UpdateAvatar: 'admin.update_avatar',
        DeleteAvatar: 'admin.delete_avatar',
        UpdateUsername: 'admin.update_username',
        UpdateEmail: 'admin.update_email',
        UpdatePreference: 'admin.update_preference',
        UpdateRole: 'admin.update_role',
        GetUserRoles: 'admin.get_user_roles',

        UpdateSuspension: 'admin.update_suspension',
        DeleteUsers: 'admin.delete_users',

        GetModerationKardex: 'admin.get_moderation_kardex',
        AddAdminNote: 'admin.add_admin_note',

        GetRoles: 'admin.get_roles',
        CreateRole: 'admin.create_role',
        EditRole: 'admin.edit_role',
        DeleteRole: 'admin.delete_role',
        GetPermissions: 'admin.get_permissions',
        GetRolePermissions: 'admin.get_role_permissions',
        UpdateRolePermissions: 'admin.update_role_permissions',

        GetServerConfig: 'admin.get_server_config',
        UpdateServerConfig: 'admin.update_server_config',

        MaintenanceFlushSessions: 'admin.maintenance_flush_sessions',
        MaintenanceClearCache: 'admin.maintenance_clear_cache',
        MaintenanceResetRateLimits: 'admin.maintenance_reset_rate_limits',
        TogglePanicMode: 'admin.toggle_panic_mode',

        CreateBackup: 'admin.create_backup',
        RestoreBackup: 'admin.restore_backup',
        GetMessages: 'admin.get_messages',
        UpdateMessageVisibility: 'admin.update_message_visibility',
        GetMessageReports: 'admin.get_message_reports',
        UpdateReportStatus: 'admin.update_report_status',

        DeleteTier: 'admin.subscriptions.delete',
        ToggleVisibilityTier: 'admin.subscriptions.toggle_visibility',
        SetPopularTier: 'admin.subscriptions.set_popular',
        SaveTier: 'admin.subscriptions.save',

        DeleteStorePackage: 'admin.store_package.delete',
        ToggleStorePackage: 'admin.store_package.toggle_visibility',
        SetStorePackagePopular: 'admin.store_package.set_popular',
        SaveStorePackage: 'admin.store_package.save',

        DeleteStorePerk: 'admin.store_perk.delete',
        ToggleStorePerk: 'admin.store_perk.toggle_visibility',
        SaveStorePerk: 'admin.store_perk.save',
        GetTranslations: 'admin.get_translations',
        GetBackupSchema: 'admin.get_backup_schema',
        CreateCustomBackup: 'admin.create_custom_backup',
        BackupStatus: 'admin.backup_status',
        ReadLogs: 'admin.read_logs',
        CheckWorkerStatus: 'admin.backups.check_worker_status'
    },
    Canvases: {
        GetHomeFeed: 'canvases.get_home_feed',
        GetPublic: 'canvases.get_public',
        GetMine: 'canvases.get_mine',
        Get: 'canvases.get',
        GetChunks: 'canvases.get_chunks',
        Create: 'canvases.create',
        Update: 'canvases.update',
        ToggleChat: 'canvases.toggle_chat',
        Delete: 'canvases.delete',
        Downgrade: 'canvases.downgrade',
        Leave: 'canvases.leave',
        UpdateChatRestriction: 'canvases.update_chat_restriction',

        Resize: 'canvases.resize',
        GetResizeSettings: 'canvases.get_resize_settings',
        UpdateResizeSettings: 'canvases.update_resize_settings',

        ToggleFavorite: 'canvases.toggle_favorite',

        RequestAccess: 'canvases.request_access',
        ApproveRequest: 'canvases.approve_request',
        RejectRequest: 'canvases.reject_request',
        GetPendingRequests: 'canvases.get_pending_requests',
        GetMemberRoleData: 'canvases.get_member_role_data',

        GetResetSettings: 'canvases.get_reset_settings',
        UpdateResetSettings: 'canvases.update_reset_settings',
        ResetNow: 'canvases.reset_now',
        CreateSnapshot: 'canvases.create_snapshot',
        SnapshotStatus: 'canvases.snapshot_status',

        GetSnapshotsGallery: 'canvases.get_snapshots_gallery',
        ToggleSnapshotLike: 'canvases.toggle_snapshot_like',
        ToggleSnapshotPrivacy: 'canvases.toggle_snapshot_privacy',
        DeleteSnapshot: 'canvases.delete_snapshot',

        UploadTemplate: 'canvases.upload_template',
        GetTemplates: 'canvases.get_templates',
        DeleteTemplate: 'canvases.delete_template',
        InjectTemplate: 'canvases.inject_template',
        GetTemplateTokens: 'canvases.template_tokens',

        CreateLiveShare: 'canvases.create_live_share',
        StopLiveShare: 'canvases.stop_live_share',
        JoinLiveShare: 'canvases.join_live_share',

        GetCustomPalettes: 'canvases.get_custom_palettes',
        CreateCustomPalette: 'canvases.create_custom_palette',
        DeleteCustomPalette: 'canvases.delete_custom_palette',
        GetRecentColors: 'canvases.get_recent_colors',
        AddRecentColor: 'canvases.add_recent_color',

        JoinViaInvite: 'canvases.join_via_invite',
        RevokeInvite: 'canvases.revoke_invite',
        GenerateInvite: 'canvases.generate_invite',
        AssignMemberRole: 'canvases.assign_member_role',
        RemoveMember: 'canvases.remove_member',
        UpdateRolePermissions: 'canvases.update_role_permissions',
        DeleteRole: 'canvases.delete_role'
    },
    Search: {
        Query: 'search.query'
    },

    Stripe: {
        CreateCheckout: 'stripe.create_checkout',
        PreviewUpgrade: 'stripe.preview_upgrade',
        CreateCoinCheckout: 'stripe.create_coin_checkout',
        UpdateSubscription: 'stripe.update_subscription',
        GetPaymentHistory: 'stripe.get_payment_history',
        DownloadReceipt: 'stripe.download_receipt',
        GetSubscriptionStatus: 'stripe.get_subscription_status',
        CreateSetupSession: 'stripe.create_setup_session',
        GetPaymentMethods: 'stripe.get_payment_methods',
        DeletePaymentMethod: 'stripe.delete_payment_method',
        ToggleAutoRenewal: 'stripe.toggle_auto_renewal'
    },
    Store: {
        GetBalance: 'store.get_balance',
        BuyPerk: 'store.buy_perk',
        GetMyPerks: 'store.get_my_perks',
        ActivatePerk: 'store.activate_perk',
        GetTransactionHistory: 'store.get_transaction_history'
    },
    Chat: {
        History: 'chat.history',
        Send: 'chat.send',
        Delete: 'chat.delete',
        Report: 'chat.report',
        MediaGallery: 'chat.media_gallery'
    },
    Telemetry: {
        Collect: 'telemetry.collect'
    }
};