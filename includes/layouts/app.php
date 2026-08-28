<?php


use \App\Core\System\SubscriptionPlanConstants;


$isLoggedIn = $isLoggedIn ?? false;
$currentView = $currentView ?? 'system/message.php';
$isAuthRoute = $isAuthRoute ?? false;


global $serverConfig; 

$isDegraded = defined('SYSTEM_DEGRADED') && SYSTEM_DEGRADED === true;

$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$isPrivileged = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPermissions);

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

    '/upgrade' => __('route_premium'), 
    '/premium' => __('route_premium'), 
    '/login' => __('route_login'),
    '/register' => __('route_register'),
    '/settings' => __('route_settings'),
    '/settings/your-account' => __('route_profile'),
    '/settings/security' => __('route_security'),
    '/settings/accessibility' => __('route_accessibility'),
    '/settings/guest' => __('route_guest'),
    '/account-suspended' => __('route_suspended'),
    '/account-deleted' => __('route_deleted'),
    '/admin' => __('route_admin_dashboard'),
    '/admin/dashboard' => __('route_admin_dashboard'),
    '/admin/users' => __('route_admin_users'),
    '/admin/user-profile' => __('route_admin_edit_user'),
    '/admin/edit-role' => __('route_admin_edit_role'),
    '/admin/user-moderation' => __('route_admin_edit_status'),
    '/admin/backups' => __('route_admin_backups'),
    '/admin/backup-schedule' => __('route_admin_backups_automation'),
    '/admin/system-settings' => __('route_admin_server'),
    '/admin/protocols' => __('route_admin_protocols'),
    '/admin/logs' => __('route_admin_logs'),
    '/admin/logs/viewer' => __('route_admin_logs_viewer')
];

$initialTitle = APP_NAME;
if (isset($routeTitles[$currentPath])) {
    $initialTitle = $routeTitles[$currentPath] . ' - ' . APP_NAME;
}


$palettesJson = '{}';
$palettesPath = dirname(__DIR__, 2) . '/public/assets/data/palettes.json';
if (file_exists($palettesPath)) {
    $palettesJson = file_get_contents($palettesPath);
}

// Pre-carga del estado inicial de los chunks para la carga instantánea del lienzo
$isDesignRoute = (strpos($currentPath, '/design') === 0);
$preloadedChunksJson = '{}';
$initialCanvasDataJson = 'null';

if ($isDesignRoute) {
    try {
        // Extraemos el UUID de la ruta, ej: /design/d115ed48-7b08-4815-8856-8886eb5e707a
        $parts = explode('/', trim($currentPath, '/'));
        $canvasUuid = $parts[1] ?? null;

        // Comprobamos si es un UUID válido (36 caracteres)
        if ($canvasUuid && strlen($canvasUuid) === 36) {
            $activeAccountId = $_SESSION['active_account'] ?? 0;
            $layoutCacheKey = "canvas:layout_preload:{$canvasUuid}:u:{$activeAccountId}";
            $redis = null;
            try {
                if (class_exists(\App\Config\Database\RedisCache::class)) {
                    $redis = (new \App\Config\Database\RedisCache())->getClient();
                    if ($redis) {
                        $cachedPreload = $redis->get($layoutCacheKey);
                        if ($cachedPreload) {
                            $decodedPreload = json_decode($cachedPreload, true);
                            if (is_array($decodedPreload)) {
                                $parsedInitial = json_decode($decodedPreload['initialCanvasDataJson'] ?? 'null', true);
                                $isCachedOffline = ($parsedInitial && isset($parsedInitial['data']['mode']) && ($parsedInitial['data']['mode'] === 'offline' || empty($parsedInitial['data']['is_online_active'])));
                                if (!$isCachedOffline) {
                                    $initialCanvasDataJson = $decodedPreload['initialCanvasDataJson'] ?? 'null';
                                    $preloadedChunksJson = $decodedPreload['preloadedChunksJson'] ?? '{}';
                                } else {
                                    try { $redis->del($layoutCacheKey); } catch (\Throwable $t) {}
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}

            if ($initialCanvasDataJson === 'null') {
                global $container;
                if ($container) {
                    $canvasRepo = $container->get(\App\Core\Interfaces\CanvasRepositoryInterface::class);
                    $canvasService = $container->get(\App\Api\Services\Canvas\CanvasCoreService::class);
                } else {
                    $canvasRepo = new \App\Core\Repositories\CanvasRepository();
                    $canvasService = new \App\Api\Services\Canvas\CanvasCoreService();
                }

                $canvasObjFromDb = $canvasRepo->getCanvasByUuid($canvasUuid);
                if ($canvasObjFromDb) {
                    $canvasId = (int)$canvasObjFromDb['id'];
                    $canvasRes = $canvasService->getCanvas($activeAccountId ? (int)$activeAccountId : null, $canvasId);

                    if ($canvasRes && $canvasRes['success']) {
                        $initialCanvasDataJson = json_encode($canvasRes);
                        $canvasObj = $canvasRes['data'];
                        $boardW = (int)$canvasObj['width'];
                        $boardH = (int)$canvasObj['height'];
                        $isCanvasOnline = (($canvasObj['mode'] ?? 'offline') === 'online' || !empty($canvasObj['is_online_active']));

                        // Calculamos el centro geométrico del lienzo
                        $centerX = (int)($boardW / 2);
                        $centerY = (int)($boardH / 2);
                        $chunkSize = 512;
                        $cx = (int)($centerX / $chunkSize);
                        $cy = (int)($centerY / $chunkSize);

                        // Chunks centrales iniciales (colchón de 3x3 chunks en el centro para cubrir la pantalla al entrar)
                        $initialChunks = [];
                        for ($x = max(0, $cx - 1); $x <= min(ceil($boardW / $chunkSize) - 1, $cx + 1); $x++) {
                            for ($y = max(0, $cy - 1); $y <= min(ceil($boardH / $chunkSize) - 1, $cy + 1); $y++) {
                                $initialChunks[] = "{$x},{$y}";
                            }
                        }

                        if (!empty($initialChunks) && $isCanvasOnline) {
                            $chunksResult = $canvasService->getCanvasChunks($canvasId, $initialChunks);
                            if ($chunksResult && !empty($chunksResult['chunks'])) {
                                $preloadedChunksJson = json_encode($chunksResult['chunks']);
                            }
                        }

                        if ($redis && $isCanvasOnline) {
                            try {
                                $redis->setex($layoutCacheKey, \App\Core\System\CacheConstants::TTL_THIRTY_DAYS, json_encode([
                                    'initialCanvasDataJson' => $initialCanvasDataJson,
                                    'preloadedChunksJson' => $preloadedChunksJson
                                ]));
                            } catch (\Throwable $e) {}
                        }
                    }
                }
            }
        }
    } catch (\Throwable $e) {
        // Silencioso para garantizar que no rompa la aplicación entera
    }
}


$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$subscriptionTier = 0;
$isGoogleUser = false;
$userEmail = '';

if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $subscriptionTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
    $userEmail = $linkedAccounts[$activeAccountId]['user_email'] ?? '';
    if (!empty($linkedAccounts[$activeAccountId]['google_id'])) {
        $isGoogleUser = true;
    } else {
        try {
            global $container;
            if ($container) {
                $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
                $userDb = $userRepo->findById((int)$activeAccountId);
                if ($userDb && !empty($userDb['google_id'])) {
                    $isGoogleUser = true;
                    $_SESSION['accounts'][$activeAccountId]['google_id'] = $userDb['google_id'];
                }
            }
        } catch (\Throwable $e) {}
    }
}

$planLimits = SubscriptionPlanConstants::getTierLimits($subscriptionTier);


$customPalettesJson = '[]';
if ($activeAccountId && SubscriptionPlanConstants::hasFeature($subscriptionTier, 'custom_palettes')) {
    try {
        global $container;
        if ($container) {
            $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
            $customPalettes = $userRepo->getCustomPalettes($activeAccountId);
            $customPalettesJson = json_encode($customPalettes);
        }
    } catch (\Exception $e) { }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php
    $appPath = parse_url(APP_URL, PHP_URL_PATH) ?? '';
    $appPath = rtrim($appPath, '/');
    ?>
    <base href="<?php echo $appPath; ?>/">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken ?? '', ENT_QUOTES, 'UTF-8'); ?>">
     <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="stylesheet" type="text/css" href="<?php echo $appPath; ?>/assets/css/base/icons.css?v=<?php echo file_exists(ROOT_PATH . '/public/assets/css/base/icons.css') ? filemtime(ROOT_PATH . '/public/assets/css/base/icons.css') : '1.0'; ?>">
    <script>
        (function() {
            function applyIcon(el) {
                if (el.childNodes.length > 0) {
                    let text = el.textContent.trim();
                    if (text && /^[a-z0-9_]+$/.test(text) && !el.classList.contains('msr-' + text)) {
                        el.classList.add('msr-' + text);
                    }
                }
            }
            document.addEventListener('DOMContentLoaded', () => {
                document.querySelectorAll('.material-symbols-rounded').forEach(applyIcon);
            });
            const iconObserver = new MutationObserver(mutations => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.matches && node.matches('.material-symbols-rounded')) {
                                applyIcon(node);
                            }
                            if (node.querySelectorAll) {
                                node.querySelectorAll('.material-symbols-rounded').forEach(applyIcon);
                            }
                        }
                    });
                    if (m.type === 'characterData' && m.target.parentNode && m.target.parentNode.matches && m.target.parentNode.matches('.material-symbols-rounded')) {
                        m.target.parentNode.className.split(' ').forEach(cls => {
                            if (cls.startsWith('msr-')) m.target.parentNode.classList.remove(cls);
                        });
                        applyIcon(m.target.parentNode);
                    }
                });
            });
            iconObserver.observe(document.documentElement, { 
                childList: true, 
                subtree: true, 
                characterData: true 
            });
        })();
    </script>
    
    <link rel="stylesheet" type="text/css" href="<?php echo $appPath; ?>/assets/css/base/styles.css?v=<?php echo filemtime(dirname(__DIR__, 2) . '/public/assets/css/base/styles.css'); ?>">
    <link rel="stylesheet" type="text/css" href="<?php echo $appPath; ?>/assets/css/components/components.css?v=<?php echo filemtime(dirname(__DIR__, 2) . '/public/assets/css/components/components.css'); ?>">
    <link rel="stylesheet" type="text/css" href="<?php echo $appPath; ?>/assets/css/base/root.css?v=<?php echo filemtime(dirname(__DIR__, 2) . '/public/assets/css/base/root.css'); ?>">
    <title><?php echo htmlspecialchars($initialTitle); ?></title>
    
    <?php if (!empty(\App\Core\Helpers\EnvLoader::get('TURNSTILE_SITE_KEY', ''))): ?>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <?php endif; ?>
    <?php if (!empty(\App\Core\Helpers\EnvLoader::get('GOOGLE_CLIENT_ID', ''))): ?>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
    <?php endif; ?>

    <script>
        window.__INITIAL_CANVAS_DATA__ = <?php echo $initialCanvasDataJson; ?>;
        window.__PRELOADED_CHUNKS__ = <?php echo $preloadedChunksJson; ?>;
        window.AppBasePath = "<?php echo $appPath; ?>";
        window.AppName = "<?php echo APP_NAME; ?>";
        window.AppRouteTitles = <?php echo json_encode($routeTitles); ?>;
        window.AppSystemDegraded = <?php echo $isDegraded ? 'true' : 'false'; ?>;
        window.AppUserPrefs = <?php echo (!$isDegraded && $isLoggedIn && isset($_SESSION['accounts'][$activeAccountId]['user_prefs'])) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_prefs']) : 'null'; ?>;
        window.AppUserFlags = <?php echo (!$isDegraded && $isLoggedIn && isset($_SESSION['accounts'][$activeAccountId]['user_flags'])) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_flags']) : '[]'; ?>;
        window.AppServerConfig = <?php echo isset($serverConfig) && !empty($serverConfig) ? json_encode($serverConfig) : '{}'; ?>;
        window.AppTurnstileSiteKey = "<?php echo \App\Core\Helpers\EnvLoader::get('TURNSTILE_SITE_KEY', ''); ?>";
        window.GOOGLE_CLIENT_ID = "<?php echo \App\Core\Helpers\EnvLoader::get('GOOGLE_CLIENT_ID', ''); ?>";
        window.AppTranslations = <?php echo json_encode(\App\Core\System\Translator::getAll()); ?>;
        window.APP_SANCTION_REASONS = <?php echo json_encode(\App\Core\Helpers\Utils::getSanctionReasons()); ?>;
        window.APP_PALETTES = <?php echo $palettesJson; ?>;
        window.APP_CUSTOM_PALETTES = <?php echo $customPalettesJson; ?>;
        window.activeUserId = <?php echo isset($_SESSION['active_account']) ? json_encode((string)$_SESSION['active_account']) : 'null'; ?>;
        window.activeUsername = <?php echo isset($_SESSION['accounts'][$activeAccountId]['user_name']) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_name']) : 'null'; ?>;
        window.activeUserAvatar = <?php echo isset($_SESSION['accounts'][$activeAccountId]['user_pic']) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_pic']) : 'null'; ?>;

        window.APP_USER = {
            id: <?php echo isset($_SESSION['active_account']) ? json_encode((string)$_SESSION['active_account']) : 'null'; ?>,
            name: <?php echo isset($_SESSION['accounts'][$activeAccountId]['user_name']) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_name']) : 'null'; ?>,
            username: <?php echo isset($_SESSION['accounts'][$activeAccountId]['user_name']) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_name']) : 'null'; ?>,
            avatar: <?php echo isset($_SESSION['accounts'][$activeAccountId]['user_pic']) ? json_encode($_SESSION['accounts'][$activeAccountId]['user_pic']) : 'null'; ?>,
            sub_bg: <?php echo json_encode($activeSubBg ?? ''); ?>,
            subscription_tier: <?php echo $subscriptionTier; ?>,
            permissions: <?php echo json_encode($userPermissions ?? []); ?>,
            is_google: <?php echo $isGoogleUser ? 'true' : 'false'; ?>,
            email: <?php echo json_encode($userEmail); ?>
        };
        window.APP_LIMITS = <?php echo json_encode($planLimits); ?>;
        window.APP_PRICES = <?php echo json_encode(\App\Core\System\SubscriptionPlanConstants::getTierPrices()); ?>;
        window.APP_TIERS = <?php echo json_encode(\App\Core\System\SubscriptionPlanConstants::getAllTiers()); ?>;
        window.APP_CONFIG = {
            wsPort: <?php echo (int)\App\Core\Helpers\EnvLoader::get('WS_PORT', 8765); ?>,
            permissions: <?php echo json_encode($userPermissions ?? []); ?>
        };

        // --- DEBUG: session diagnostics (remove after fix is confirmed) ---
        window.APP_SESSION_DEBUG = {
            had_session_on_load:   <?php echo json_encode($_sessionDebugHadSession ?? false); ?>,
            had_remember_cookie:   <?php echo json_encode($_sessionDebugHasCookie ?? false); ?>,
            autologin_triggered:   <?php echo json_encode($_sessionDebugAutoTriggered ?? false); ?>,
            autologin_success:     <?php echo json_encode($_sessionDebugAutoSuccess ?? false); ?>,
            is_logged_in_final:    <?php echo json_encode($isLoggedIn ?? false); ?>,
            gc_maxlifetime_secs:   <?php echo json_encode($_sessionDebugGcTtl ?? 0); ?>,
            cookie_lifetime_secs:  <?php echo json_encode($_sessionDebugCookieTtl ?? 0); ?>,
            ttl_mismatch:          <?php echo json_encode(($_sessionDebugGcTtl ?? 0) < ($_sessionDebugCookieTtl ?? 0)); ?>,
            request_type:          "full_page_load"
        };
        // ------------------------------------------------------------------

        window.AI_CONFIG = {
            enabled: <?php echo (\App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === 'false' || \App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === false || \App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === '0') ? 'false' : 'true'; ?>,
            provider: "<?php echo (\App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === 'false' || \App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === false || \App\Core\Helpers\EnvLoader::get('AI_ENABLED', 'true') === '0') ? 'null' : 'api'; ?>"
        };

        
        function __(key, params = {}) { 
            let text = (window.AppTranslations && window.AppTranslations[key] !== undefined) ? window.AppTranslations[key] : key; 
            for (const [pKey, pValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`{${pKey}}`, 'g'), pValue);
                text = text.replace(new RegExp(`:${pKey}\\b`, 'g'), pValue);
            }
            return text;
        }
        window.__ = __;

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
                    <?php include __DIR__ . '/../modules/moduleCanvasInfo.php'; ?>
                    <div class="general-content-scrolleable" data-ref="app-router-outlet">
                        <?php $loader->load($currentView); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="<?php echo $appPath; ?>/assets/js/core/utils/ui-engine.js?v=<?php echo file_exists(ROOT_PATH . '/public/assets/js/core/utils/ui-engine.js') ? filemtime(ROOT_PATH . '/public/assets/js/core/utils/ui-engine.js') : '1.0'; ?>"></script>
    <script type="module" src="<?php echo $appPath; ?>/assets/js/AppInit.js?v=<?php echo file_exists(ROOT_PATH . '/public/assets/js/AppInit.js') ? filemtime(ROOT_PATH . '/public/assets/js/AppInit.js') : '1.0'; ?>"></script>
</body>
</html>