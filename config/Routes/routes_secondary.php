<?php

use App\Core\System\RateLimitConstants as RL;

return [
    'chat.history' => [
        'controller' => 'App\\Api\\Controllers\\Chat\\ChatController',
        'action' => 'history',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'chat_history',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'chat.send' => [
        'controller' => 'App\\Api\\Controllers\\Chat\\ChatController',
        'action' => 'send',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'chat_send',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'chat.delete' => [
        'controller' => 'App\\Api\\Controllers\\Chat\\ChatController',
        'action' => 'delete',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'chat_delete',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'chat.report' => [
        'controller' => 'App\\Api\\Controllers\\Chat\\ChatController',
        'action' => 'report',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'chat_report',
                'max' => 10,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'chat.attachment' => [
        'controller' => 'App\\Api\\Controllers\\Chat\\ChatController',
        'action' => 'attachment',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'chat_attachment',
                'max' => 60,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_ws_ticket' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get_ws_ticket',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_ws_ticket',
                'max' => 10,
                'time' => 5,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_custom_palettes' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'get_custom_palettes',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_c_palettes',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.create_custom_palette' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'create_custom_palette',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_create_c_palette',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.delete_custom_palette' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'delete_custom_palette',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_del_c_palette',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_home_feed' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get_home_feed',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_home',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_public' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get_public',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_public',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_mine' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get_mine',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_mine',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],

    'canvases.get_chunks' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'get_chunks',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_chunks',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.create' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'create',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_create',
                'max' => 5,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.update' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'update',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_update',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.delete' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'delete',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_delete',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.downgrade' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasCoreController',
        'action' => 'downgrade',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_downgrade',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.leave' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'leave',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_leave',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.resize' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'resize',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_resize',
                'max' => 3,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_resize_settings' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'get_resize_settings',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_resize',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.update_resize_settings' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'update_resize_settings',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_upd_resize',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.toggle_favorite' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'toggle_favorite',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_toggle_fav',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'search.query' => [
        'controller' => 'App\\Api\\Controllers\\Search\\SearchController',
        'action' => 'search',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'search_query',
                'max' => 20,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.assign_member_role' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'assign_member_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_assign_role',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_roles' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'get_roles',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_roles',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_permissions' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'get_permissions',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_perms',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.create_role' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'create_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_create_role',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.update_role' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'update_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_update_role',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.delete_role' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'delete_role',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_delete_role',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.remove_member' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'remove_member',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_remove_member',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.generate_invite' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'generate_invite',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_gen_invite',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.list_invites' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'list_invites',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_list_invites',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.revoke_invite' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'revoke_invite',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_revoke_invite',
                'max' => 20,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.join_via_invite' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'join_via_invite',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_join_invite',
                'max' => 20,
                'time' => 5,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_reset_settings' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'get_reset_settings',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_reset',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.update_reset_settings' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'update_reset_settings',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_upd_reset',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.reset_now' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'reset_now',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_reset_now',
                'max' => 2,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.create_snapshot' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'create_snapshot',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_create_snap',
                'max' => 3,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.snapshot_status' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasSettingsController',
        'action' => 'snapshot_status',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ]
        ],
    ],
    'canvases.request_access' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'request_access',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_req_access',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.approve_request' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'approve_request',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_approve',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.reject_request' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'reject_request',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_reject',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_pending_requests' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'get_pending_requests',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_reqs',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_snapshots_gallery' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasMediaController',
        'action' => 'get_snapshots_gallery',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_snapshots',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.get_snapshot_detail' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasMediaController',
        'action' => 'get_snapshot_detail',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_snap_detail',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
    'canvases.toggle_snapshot_like' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasMediaController',
        'action' => 'toggle_snapshot_like',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_toggle_snap_like',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.toggle_snapshot_privacy' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasMediaController',
        'action' => 'toggle_snapshot_privacy',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_toggle_snap_privacy',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.delete_snapshot' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasMediaController',
        'action' => 'delete_snapshot',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_delete_snapshot',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.upload_template' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'upload_template',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_upload_tpl',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.get_templates' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'list_templates',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_get_tpl',
                'max' => 30,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.delete_template' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'delete_template',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_del_tpl',
                'max' => 20,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.inject_template' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'inject_template',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_inject_template',
                'max' => 3,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.template_tokens' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAssetController',
        'action' => 'get_template_tokens',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_tpl_tokens',
                'max' => 60,
                'time' => 1,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.update_chat_restriction' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasChatRestrictionController',
        'action' => 'updateRestriction',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_update_chat_res',
                'max' => 10,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.create_live_share' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'create_live_share',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_create_live',
                'max' => 5,
                'time' => 5,
                'identifier' => 'user_id',
            ],
        ],
    ],
    'canvases.join_live_share' => [
        'controller' => 'App\\Api\\Controllers\\Canvas\\CanvasAccessController',
        'action' => 'join_live_share',
        'middleware' => [
            [
                'type' => 'Telemetry',
            ],
            [
                'type' => 'RateLimit',
                'key' => 'canvas_join_live',
                'max' => 30,
                'time' => 1,
                'identifier' => 'ip',
            ],
        ],
    ],
];
