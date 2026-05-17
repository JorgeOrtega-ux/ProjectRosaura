<?php
// includes/layouts/app.php
global $serverConfig; 

$isDegraded = defined('SYSTEM_DEGRADED') && SYSTEM_DEGRADED === true;

$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$isPrivileged = in_array('access_admin_panel', $userPermissions);

$isMaintenanceRestricted = ($isMaintenanceActive && !$isPrivileged);

$topBarClass = ($isAuthRoute || $isMaintenanceRestricted) ? 'disabled' : '';

$currentPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = parse_url(APP_URL, PHP_URL_PATH) ?? '';
if ($basePath && strpos($currentPath, $basePath) === 0) {
    $currentPath = substr($currentPath, strlen($basePath));
}
$currentPath = rtrim($currentPath, '/');
if (empty($currentPath)) $currentPath = '/';

if (strpos($currentPath, '/admin') === 0) {
    $currentLang = $_SESSION['user_prefs']['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
    \App\Core\System\Translator::loadContext($currentLang, 'admin');
}

$routeTitles = [
    '/' => __('route_home'),
    '/explore' => __('route_explore'),
    '/login' => __('route_login'),
    '/register' => __('route_register'),
    '/settings' => __('route_settings'),
    '/settings/your-profile' => __('route_profile'),
    '/settings/security' => __('route_security'),
    '/settings/accessibility' => __('route_accessibility'),
    '/settings/guest' => __('route_guest'),
    '/settings/change-password' => __('route_change_password'),
    '/settings/2fa' => __('route_2fa'),
    '/settings/devices' => __('route_devices'),
    '/settings/delete-account' => __('route_delete_account'),
    '/account-suspended' => __('route_suspended'),
    '/account-deleted' => __('route_deleted'),
    '/admin' => __('route_admin_dashboard'),
    '/admin/dashboard' => __('route_admin_dashboard'),
    '/admin/manage-users' => __('route_admin_users'),
    '/admin/edit-user' => __('route_admin_edit_user'),
    '/admin/edit-role' => __('route_admin_edit_role'),
    '/admin/edit-status' => __('route_admin_edit_status'),
    '/admin/backups' => __('route_admin_backups'),
    '/admin/backups/automation' => __('route_admin_backups_automation'),
    '/admin/server-config' => __('route_admin_server'),
    '/admin/logs' => __('route_admin_logs'),
    '/admin/logs/viewer' => __('route_admin_logs_viewer')
];

$initialTitle = APP_NAME;
if (isset($routeTitles[$currentPath])) {
    $initialTitle = $routeTitles[$currentPath] . ' - ' . APP_NAME;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="<?php echo APP_URL; ?>/">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/skeleton.css">
    <link rel="stylesheet" type="text/css" href="assets/css/root.css">
    <title><?php echo htmlspecialchars($initialTitle); ?></title>
    
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

    <script>
        window.AppBasePath = "<?php echo APP_URL; ?>";
        window.AppName = "<?php echo APP_NAME; ?>";
        window.AppRouteTitles = <?php echo json_encode($routeTitles); ?>;
        window.AppSystemDegraded = <?php echo $isDegraded ? 'true' : 'false'; ?>;
        window.AppUserPrefs = <?php echo (!$isDegraded && $isLoggedIn && isset($_SESSION['user_prefs'])) ? json_encode($_SESSION['user_prefs']) : 'null'; ?>;
        window.AppServerConfig = <?php echo isset($serverConfig) && !empty($serverConfig) ? json_encode($serverConfig) : '{}'; ?>;
        window.AppTurnstileSiteKey = "<?php echo \App\Core\Helpers\EnvLoader::get('TURNSTILE_SITE_KEY', ''); ?>";
        window.AppTranslations = <?php echo json_encode(\App\Core\System\Translator::getAll()); ?>;
        
        function __(key, params = {}) { 
            let text = (window.AppTranslations && window.AppTranslations[key] !== undefined) ? window.AppTranslations[key] : key; 
            for (const [pKey, pValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`{${pKey}}`, 'g'), pValue);
            }
            return text;
        }

        (function() {
            var theme = 'system';
            if (window.AppUserPrefs && window.AppUserPrefs.theme) theme = window.AppUserPrefs.theme;
            else { var guestTheme = localStorage.getItem('pr_theme'); if (guestTheme) theme = guestTheme; }
            var isDark = false;
            if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            else if (theme === 'dark') isDark = true;
            if (isDark) document.documentElement.classList.add('dark-theme');
            else document.documentElement.classList.add('light-theme');
        })();
    </script>
</head>
<body>
    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                <div class="general-content-top <?php echo $topBarClass; ?>">
                    <?php include __DIR__ . '/header.php'; ?>
                </div>
                <div class="general-content-bottom">
                    <?php include __DIR__ . '/../modules/moduleSurface.php'; ?>
                    <div class="general-content-scrolleable" data-ref="app-router-outlet">
                        <?php $loader->load($currentView); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://unpkg.com/@popperjs/core@2"></script>
    <script type="module" src="assets/js/AppInit.js"></script>
</body>
</html>