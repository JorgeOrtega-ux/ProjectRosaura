<?php

use App\Core\System\RateLimitConstants as RL;

return [
    'admin.get_messages' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_messages',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_get_messages',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_message_visibility' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_message_visibility',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_upd_msg',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_message_reports' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_message_reports',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_get_msg_rep',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_report_status' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_report_status',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_upd_rep_st',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_dashboard_metrics' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_dashboard_metrics',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_dashboard_metrics',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_user' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_user',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_user',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_user_roles' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_user_roles',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_user_roles',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_user_purchases' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_user_purchases',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_user_purchases',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_avatar' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_avatar',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_avatar',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.delete_avatar' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_avatar',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_delete_avatar',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_username' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_username',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_username',
                'max' => 15,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_email' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_email',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_email',
                'max' => 15,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_preference' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_preference',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_preference',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_role' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_role',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.delete_users' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_users',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_delete_user',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_suspension' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_suspension',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_status',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_moderation_kardex' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_moderation_kardex',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_mod_kardex',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_roles' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_roles',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_roles',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.create_role' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'create_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_create_role',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.edit_role' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'edit_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_edit_role',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.delete_role' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_delete_role',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.subscriptions.save' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'save_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_save_sub',
                'max' => 15,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.subscriptions.save_color' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'save_subscription_color',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_save_sub_color',
                'max' => 15,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.subscriptions.toggle_visibility' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_subscription_visibility',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_toggle_sub',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.subscriptions.set_popular' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'set_subscription_popular',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_pop_sub',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.subscriptions.delete' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'adm_del_sub',
                'max' => 10,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_permissions' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_permissions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_permissions',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_role_permissions' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_role_permissions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_role_permissions',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_role_permissions' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_role_permissions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_role_permissions',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_server_config' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_server_config',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_server_config',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_server_config' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_server_config',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_update_server_config',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.create_backup' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'create_backup',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_create_backup',
                'max' => 1,
                'time' => 10,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.backup_status' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'backup_status',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_backup_status',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.restore_backup' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'restore_backup',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_restore_backup',
                'max' => 1,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_backup_schema' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_backup_schema',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_backup_schema',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.create_custom_backup' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'create_custom_backup',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_create_custom_backup',
                'max' => 1,
                'time' => 10,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.read_logs' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'read_logs',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_read_logs',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.check_worker_status' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'check_worker_status',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_check_worker',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_translations' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_admin_translations',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_translations',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.send_password_reset' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'send_password_reset',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_send_reset',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.unlock_rate_limit' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'unlock_rate_limit',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_unlock_rl',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.terminate_sessions' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'terminate_sessions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_term_sessions',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.disable_2fa' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'disable_2fa',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_disable_2fa',
                'max' => 10,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.sync_stripe' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'sync_stripe_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_sync_stripe',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.create_checkout' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'create_checkout',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_checkout',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.preview_upgrade' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'preview_upgrade',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_preview',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.update_subscription' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'update_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_update_sub',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.get_payment_history' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'get_payment_history',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_history',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.download_receipt' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'download_receipt',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_dl_receipt',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.get_subscription_status' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'get_subscription_status',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_status',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.create_setup_session' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'create_setup_session',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_setup',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.get_payment_methods' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'get_payment_methods',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_methods',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.cancel_or_reactivate_subscription' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'cancel_or_reactivate_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_cancel_reactivate_subscription',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.cancel_subscription' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'cancel_or_reactivate_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_cancel_reactivate_subscription',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.toggle_auto_renewal' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'cancel_or_reactivate_subscription',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_cancel_reactivate_subscription',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'stripe.delete_payment_method' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'delete_payment_method',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_delete_pm',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.advertisements.list' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_ad_providers',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_ads_list', 'max' => 60, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.create_provider' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'create_ad_provider',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_create_provider', 'max' => 20, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.update_provider' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_ad_provider',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_update_provider', 'max' => 20, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.toggle_provider_active' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_ad_provider_active',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_toggle_provider', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.delete_provider' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_ad_provider',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_del_provider', 'max' => 15, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.get_provider' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_ad_provider_details',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_get_provider', 'max' => 60, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.get_ads' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_provider_ads',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_get_ads', 'max' => 60, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.create_ad' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'create_advertisement',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_create_ad', 'max' => 20, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.update_ad' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_advertisement',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_update_ad', 'max' => 20, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.toggle_ad_status' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_advertisement_status',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_toggle_ad', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.delete_ad' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_advertisement',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_del_ad', 'max' => 15, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'advertisements.get_active_feed' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_public_active_ads',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'ad_pub_feed', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'advertisements.track_event' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'record_ad_event',
        'middleware' => [
            ['type' => 'RateLimit', 'key' => 'ad_track_evt', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'admin.advertisements.download_ad_metrics' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'download_ad_metrics',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_dl_ad_metrics', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.download_general_metrics' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'download_general_metrics',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_dl_gen_metrics', 'max' => 20, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.upload_media' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'upload_ad_media',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_upload_ad_media', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.advertisements.list_media_library' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'list_ad_media_library',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_list_ad_media', 'max' => 60, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
];

