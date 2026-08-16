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
    'admin.get_user_coin_transactions' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_user_coin_transactions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_get_user_coin_transactions',
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
    'admin.store_package.save' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'save_store_package',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_save_pkg', 'max' => 15, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_package.toggle_visibility' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_store_package_visibility',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_toggle_pkg', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_package.set_popular' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'set_store_package_popular',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_pop_pkg', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_package.delete' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_store_package',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_del_pkg', 'max' => 10, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_perk.save' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'save_store_perk',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_save_perk', 'max' => 15, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_perk.toggle_visibility' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_store_perk_visibility',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_toggle_perk', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_perk.toggle_usable' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_store_perk_usable',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_usable_perk', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'admin.store_perk.delete' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_store_perk',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'adm_del_perk', 'max' => 10, 'time' => 1, 'identifier' => 'user_id'],
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
    'admin.adjust_coins' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'adjust_coins',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_adjust_coins',
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
            [
                'type' => 'Turnstile',
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
            [
                'type' => 'Turnstile',
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
    'stripe.create_coin_checkout' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'create_coin_checkout',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_coin_checkout',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'store.buy_perk' => [
        'controller' => 'App\\Api\\Controllers\\Store\\StoreController',
        'action' => 'buy_perk',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'store_buy_perk',
                'max' => 50,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'store.get_balance' => [
        'controller' => 'App\\Api\\Controllers\\Store\\StoreController',
        'action' => 'get_balance',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'store_get_balance',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'store.get_my_perks' => [
        'controller' => 'App\\Api\\Controllers\\Store\\StoreController',
        'action' => 'get_my_perks',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'store_get_perks',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'store.activate_perk' => [
        'controller' => 'App\\Api\\Controllers\\Store\\StoreController',
        'action' => 'activate_perk',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'store_activate_perk',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'store.get_transaction_history' => [
        'controller' => 'App\\Api\\Controllers\\Store\\StoreController',
        'action' => 'get_transaction_history',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'store_tx_history',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'internal.user.consume_perk' => [
        'controller' => 'App\\Api\\Controllers\\Internal\\InternalUserController',
        'action' => 'consume_perk',
        'middleware' => [],
    ],
    'admin.get_monetization_config' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_monetization_config',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_monetization_read',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.update_monetization_config' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'update_monetization_config',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_monetization_update',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.reset_monetization_config' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'reset_monetization_config',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_monetization_reset',
                'max' => 10,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.get_campaign_details' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'get_campaign_details',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_campaign_read',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.save_campaign' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'save_campaign',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_campaign_write',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.toggle_campaign_active' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'toggle_campaign_active',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_campaign_toggle',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'admin.delete_campaign' => [
        'controller' => 'App\\Api\\Controllers\\Admin\\AdminController',
        'action' => 'delete_campaign',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'admin_campaign_delete',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
];
