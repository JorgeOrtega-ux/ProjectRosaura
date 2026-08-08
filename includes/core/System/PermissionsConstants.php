<?php

namespace App\Core\System;

class PermissionsConstants {
    public const ACCESS_ADMIN_PANEL = 'access_admin_panel';
    public const VIEW_USERS = 'view_users';
    public const EDIT_USERS = 'edit_users';
    public const DELETE_USERS = 'delete_users';
    public const MODERATE_USERS = 'moderate_users';
    public const VIEW_KARDEX = 'view_kardex';
    public const MANAGE_KARDEX = 'manage_kardex';
    public const VIEW_ROLES = 'view_roles';
    public const MANAGE_ROLES_STRUCTURE = 'manage_roles_structure';
    public const ASSIGN_ROLES = 'assign_roles';
    public const MANAGE_SERVER_CONFIG = 'manage_server_config';
    public const PERFORM_SYSTEM_MAINTENANCE = 'perform_system_maintenance';
    public const CREATE_BACKUPS = 'create_backups';
    public const RESTORE_BACKUPS = 'restore_backups';
    public const DELETE_BACKUPS = 'delete_backups';
    public const DOWNLOAD_BACKUPS = 'download_backups';
    public const VIEW_LOGS = 'view_logs';
    public const DELETE_LOGS = 'delete_logs';
    public const CREATE_CANVAS = 'create_canvas';
    public const MANAGE_CANVASES = 'manage_canvases';
    public const JOIN_CANVAS = 'join_canvas';
    
    // Antiguos / Compatibilidad con lienzos (localizados en CanvasPermissionsConstants)
    public const MANAGE_SETTINGS = 'manage_settings';
    public const MANAGE_MEMBERS = 'manage_members';
    public const MODERATE_CHAT = 'moderate_chat';
    public const PLACE_PIXELS = 'place_pixels';
    public const INJECT_TEMPLATE = 'inject_template';
}
