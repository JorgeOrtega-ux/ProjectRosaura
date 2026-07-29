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
    'stripe.toggle_auto_renewal' => [
        'controller' => 'App\\Api\\Controllers\\Stripe\\StripeController',
        'action' => 'toggle_auto_renewal',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'stripe_toggle_renewal',
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
];
