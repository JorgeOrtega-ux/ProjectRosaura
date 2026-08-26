<?php

use App\Core\System\RateLimitConstants as RL;

return [
    'auth.register.step1' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'register_step1',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'register_attempts',
                'max' => 5,
                'time' => 60,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'auth.register.step2' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'register_step2',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'register_step2_attempts',
                'max' => 5,
                'time' => 60,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'auth.register.verify' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'register_verify',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'register_verify_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'auth.register.resend_code' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'register_resend_code',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'resend_code_attempts',
                'max' => 3,
                'time' => 30,
                'identifier' => 'ip',
            ],
            [
                'type' => 'Turnstile',
            ],
        ],
    ],
    'auth.google' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'google_login',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'auth_google_login',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip',
            ],
            [
                'type' => 'Turnstile',
            ],
        ],
    ],
    'auth.login' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'login',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'login_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'auth.login.verify_2fa' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'login_verify_2fa',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'login_2fa_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip',
            ],
        ],
    ],
    'auth.cancel_account_deletion' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'cancel_account_deletion',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'cancel_deletion_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip',
            ],
        ],
    ],
    'auth.switch_account' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'switch_account',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'switch_account_attempts',
                'max' => 20,
                'time' => 5,
                'identifier' => 'ip',
            ],
        ],
    ],
    'auth.logout' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'logout',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'logout_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'auth.logout_all' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'logout_all',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'logout_all_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip',
            ],
        ],
    ],
    'auth.forgot_password' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'forgot_password',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'forgot_password_attempts',
                'max' => 3,
                'time' => 30,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'auth.reset_password' => [
        'controller' => 'App\\Api\\Controllers\\Auth\\AuthController',
        'action' => 'reset_password',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'reset_password_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'ip_and_email',
            ],
        ],
    ],
    'settings.update_avatar' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_avatar',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'update_avatar_attempts',
                'max' => 5,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.delete_avatar' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'delete_avatar',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'delete_avatar_attempts',
                'max' => 5,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.update_username' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_username',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'update_username_attempts',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.request_email_code' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'request_email_code',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'request_email_code_attempts',
                'max' => 3,
                'time' => 30,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.resend_email_code' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'resend_email_code',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'resend_email_code_attempts',
                'max' => 3,
                'time' => 30,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.verify_email_code' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'verify_email_code',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'verify_email_code_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.update_email' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_email',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'update_email_attempts',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.update_preferences' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_preferences',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'update_prefs_attempts',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.set_flag' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'set_flag',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'set_set_flag',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.verify_current_password' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'verify_current_password',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'verify_current_password_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.update_password' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_password',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'update_password_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.delete_account' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'delete_account',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'delete_account_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.2fa_generate' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'generate_2fa',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'generate_2fa_attempts',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.2fa_enable' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'enable_2fa',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'enable_2fa_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.2fa_disable' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'disable_2fa',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'disable_2fa_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.2fa_regenerate_recovery' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'regenerate_recovery_codes',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'regen_codes_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.get_devices' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'get_devices',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'get_devices_attempts',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.revoke_device' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'revoke_device',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'revoke_device_attempts',
                'max' => 15,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.revoke_all_devices' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'revoke_all_devices',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'revoke_all_devices_attempts',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.link_google' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'link_google',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'settings_link_google',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.unlink_google' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'unlink_google',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'settings_unlink_google',
                'max' => 5,
                'time' => 15,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'settings.update_identifier' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_identifier',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'settings_upd_identifier', 'max' => 10, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'settings.update_banner' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_banner',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'settings_upd_banner', 'max' => 10, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'settings.delete_banner' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'delete_banner',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'settings_del_banner', 'max' => 10, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'settings.update_bio' => [
        'controller' => 'App\\Api\\Controllers\\Settings\\SettingsController',
        'action' => 'update_bio',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'settings_upd_bio', 'max' => 20, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'publications.publish' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'publish',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_publish', 'max' => 10, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'publications.get_feed' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'get_feed',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_feed', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'publications.get_user_publications' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'get_user_publications',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_user_posts', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'publications.get_detail' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'get_detail',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_detail', 'max' => 180, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'publications.toggle_like' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'toggle_like',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_like', 'max' => 60, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'publications.get_comments' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'get_comments',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_get_comments', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'publications.add_comment' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'add_comment',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_add_comment', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'publications.delete_comment' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'delete_comment',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_del_comment', 'max' => 30, 'time' => 1, 'identifier' => 'user_id'],
        ],
    ],
    'publications.delete' => [
        'controller' => 'App\\Api\\Controllers\\Publications\\PublicationsController',
        'action' => 'delete',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'pub_del', 'max' => 20, 'time' => 5, 'identifier' => 'user_id'],
        ],
    ],
    'user.get_profile_data' => [
        'controller' => 'App\\Api\\Controllers\\User\\UserController',
        'action' => 'get_profile_data',
        'middleware' => [
            ['type' => 'Telemetry'],
            ['type' => 'RateLimit', 'key' => 'user_get_profile', 'max' => 120, 'time' => 1, 'identifier' => 'ip'],
        ],
    ],
    'telemetry.collect' => [
        'controller' => 'App\\Api\\Controllers\\Telemetry\\TelemetryController',
        'action' => 'collect',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'telemetry_collect',
                'max' => 120,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
];
