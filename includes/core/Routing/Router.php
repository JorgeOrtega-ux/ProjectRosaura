<?php

namespace App\Core\Routing;

use App\Core\System\Logger;
use App\Core\Helpers\Utils;

class Router {
    private $routes;
    private $basePath;

    public function __construct($routes) {
        $this->routes = $routes;
        $this->basePath = defined('APP_URL') ? APP_URL : ''; 
    }

    public function resolve() {
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if (strpos($requestUri, $this->basePath) === 0) {
            $relativePath = substr($requestUri, strlen($this->basePath));
        } else {
            $relativePath = $requestUri;
        }

        if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
            $relativePath = rtrim($relativePath, '/');
        }

        if ($relativePath === '' || $relativePath === false) {
            $relativePath = '/';
        }
        if ($relativePath === '/design') {
            header("Location: " . $this->basePath . "/");
            exit;
        }

        if (preg_match('#^/design/s/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return ['view' => 'canvases/snapshots/snapshots-gallery.php'];
        }

        if (preg_match('#^/snapshot/view/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return ['view' => 'canvases/snapshots/snapshot-viewer.php'];
        }

        if (preg_match('#^/design/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return ['view' => 'app/design.php'];
        }
        if (preg_match('#^/canvases/manage/resets/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/resets/:uuid'] ?? [
                'view' => 'canvases/workspace/reset.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/members/([a-zA-Z0-9\-]+)/role/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            $_GET['user_uuid'] = $matches[2];
            return $this->routes['/canvases/members/:uuid/role/:user_uuid'] ?? [
                'view' => 'canvases/team/change-role.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/chat-restriction/([a-zA-Z0-9\-]+)/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            $_GET['user_uuid'] = $matches[2];
            return $this->routes['/canvases/manage/chat-restriction/:uuid/:user_uuid'] ?? [
                'view' => 'canvases/team/chat-restriction.php',
                'auth' => true,
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/members/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/members/:uuid'] ?? [
                'view' => 'canvases/team/members.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/requests/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/requests/:uuid'] ?? [
                'view' => 'canvases/team/requests.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/edit/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/edit/:uuid'] ?? [
                'view' => 'canvases/workspace/edit.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/resize/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/resize/:uuid'] ?? [
                'view' => 'canvases/workspace/resize.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/invites/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/invites/:uuid'] ?? [
                'view' => 'canvases/team/invites.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/invites/generate/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/invites/generate/:uuid'] ?? [
                'view' => 'canvases/team/invites-generate.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/roles/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/roles/:uuid'] ?? [
                'view' => 'canvases/team/roles.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/manage/role-builder/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/role-builder/:uuid'] ?? [
                'view' => 'canvases/team/role-builder.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/canvases/manage/role-permissions/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/role-permissions/:uuid'] ?? [
                'view' => 'canvases/team/role-permissions.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        if (preg_match('#^/canvases/resize/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            header('Location: ' . $this->basePath . '/canvases/manage/resize/' . $matches[1]);
            exit;
        }

        if (preg_match('#^/admin/messages/visibility/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/messages/visibility/:uuid'] ?? [
                'view' => 'admin/messages/edit-visibility.php',
                'auth' => true,
                'permissions' => ['view_logs'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/messages/reports/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/messages/reports/:uuid'] ?? [
                'view' => 'admin/messages/reports.php',
                'auth' => true,
                'permissions' => ['view_logs'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/user-profile/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/user-profile/:uuid'] ?? [
                'view' => 'admin/users/edit-user.php',
                'auth' => true,
                'permissions' => ['edit_users'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/user-moderation/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/user-moderation/:uuid'] ?? [
                'view' => 'admin/users/edit-status.php',
                'auth' => true,
                'permissions' => ['moderate_users'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/user-activity/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/user-activity/:uuid'] ?? [
                'view' => 'admin/users/user-history.php',
                'auth' => true,
                'permissions' => ['view_kardex'],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/user-roles/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/user-roles/:uuid'] ?? [
                'view' => 'admin/users/edit-user-role.php',
                'auth' => true,
                'permissions' => [\App\Core\System\PermissionsConstants::ASSIGN_ROLES],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/subscription-edit/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/admin/subscription-edit/:uuid'] ?? [
                'view' => 'admin/subscriptions/subscription-builder.php',
                'auth' => true,
                'permissions' => [\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/role-edit/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return $this->routes['/admin/role-edit/:uuid'] ?? [
                'view' => 'admin/roles/role-builder.php',
                'auth' => true,
                'permissions' => [\App\Core\System\PermissionsConstants::MANAGE_ROLES_STRUCTURE],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/role-permissions/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return $this->routes['/admin/role-permissions/:uuid'] ?? [
                'view' => 'admin/roles/role-permissions.php',
                'auth' => true,
                'permissions' => [\App\Core\System\PermissionsConstants::MANAGE_ROLES_STRUCTURE],
                'requires_2fa' => false
            ];
        }

        if (preg_match('#^/admin/backup-restore/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return $this->routes['/admin/backup-restore/:uuid'] ?? [
                'view' => 'admin/backups/backups-restore.php',
                'auth' => true,
                'permissions' => ['restore_backups'],
                'requires_2fa' => false
            ];
        }

        if (!array_key_exists($relativePath, $this->routes)) {
            Logger::warning("Route not found (404)", [
                'uri' => $requestUri, 
                'ip' => Utils::getIpAddress(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
            ]);
            return ['view' => 'system/404.php'];
        }

        return $this->routes[$relativePath];
    }
}
?>