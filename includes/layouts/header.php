<?php 
// includes/layouts/header.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isDegraded = defined('SYSTEM_DEGRADED') && SYSTEM_DEGRADED === true;
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];

// Extracción de la suscripción para mostrar badge en UI
$subscriptionTier = 0;
if ($activeAccountId !== null && isset($linkedAccounts[$activeAccountId])) {
    $subscriptionTier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
    $linkedAccounts[$activeAccountId]['user_role_color'] = $_SESSION['user_role_color'] ?? ($linkedAccounts[$activeAccountId]['user_role_color'] ?? '');
    $linkedAccounts[$activeAccountId]['user_pic'] = $_SESSION['user_pic'] ?? ($linkedAccounts[$activeAccountId]['user_pic'] ?? '');
    $_SESSION['accounts'] = $linkedAccounts;
}

$isLoggedIn = $activeAccountId !== null && !empty($linkedAccounts) && !$isDegraded;
$userPermissions = $_SESSION['user_permissions'] ?? [];
$userRoleColorRaw = $_SESSION['user_role_color'] ?? '{"type":"solid","colors":[{"hex":"var(--text-muted)"}]}';

$rawUserPic = $_SESSION['user_pic'] ?? '';
$userPic = \App\Core\Helpers\Utils::getValidImage($rawUserPic, 'avatar');

global $serverConfig;
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;
$isPrivileged = in_array('access_admin_panel', $userPermissions);

// Permisos de Lienzos
$canCreateCanvas = in_array('create_canvas', $userPermissions);
$canManageCanvases = in_array('manage_canvases', $userPermissions);
$canJoinCanvas = in_array('join_canvas', $userPermissions);
$hasCanvasAccess = $canCreateCanvas || $canManageCanvases || $canJoinCanvas;

$activeRoleBg = 'var(--text-muted)';
if ($isLoggedIn) {
    $colorData = json_decode($userRoleColorRaw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($colorData)) {
        $firstColorObj = $colorData['colors'][0] ?? null;
        $activeRoleBg = is_string($firstColorObj) ? htmlspecialchars($firstColorObj) : htmlspecialchars($firstColorObj['hex'] ?? 'var(--text-muted)');

        if (($colorData['type'] ?? 'solid') === 'gradient' && count($colorData['colors']) > 1) {
            $angle = (int)($colorData['angle'] ?? 0);
            $stopsArray = [];
            $prevStop = 0;
            $colorsCount = count($colorData['colors']);
            foreach ($colorData['colors'] as $i => $colorObj) {
                $hex = is_string($colorObj) ? $colorObj : ($colorObj['hex'] ?? '#000000');
                $percentage = is_array($colorObj) && isset($colorObj['percentage']) ? (int)$colorObj['percentage'] : floor(100 / $colorsCount);
                $endStop = $prevStop + $percentage;
                if ($i === $colorsCount - 1) $endStop = 100;
                $stopsArray[] = "{$hex} {$prevStop}% {$endStop}%";
                $prevStop = $endStop;
            }
            $activeRoleBg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
        }
    } else {
        $activeRoleBg = htmlspecialchars($userRoleColorRaw);
    }
}
?>

<style>
    .sk-hydrate {
        position: relative;
        background-color: var(--sk-bg-dark); 
        transition: background-color 0.3s ease;
    }
    .sk-hydrate::after {
        content: "";
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        background-image: linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0));
        animation: sk-shimmer 2s infinite;
        z-index: 1;
        pointer-events: none;
    }
    @keyframes sk-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    .sk-hydrate img {
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 2;
        position: relative;
    }
    .sk-hydrate.is-loaded { background-color: transparent; }
    .sk-hydrate.is-loaded::after { display: none; }
    .sk-hydrate.is-loaded img { opacity: 1; }

    /* Estilos para el badge premium en el header */
    .premium-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        background: var(--action-primary);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 4px;
        border-radius: 4px;
        line-height: 1;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        z-index: 10;
        border: 2px solid var(--bg-surface);
    }
    .premium-badge.advanced {
        background: linear-gradient(45deg, #FFD700, #FFA500);
        color: #000;
    }
</style>

<div class="header">
    <div class="header-left">
        <div class="component-actions">
            <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleSurface" data-tooltip="<?php echo __('tooltip_main_menu'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">menu</span>
            </button>
        </div>
    </div>

    <div class="header-center">
        <div class="component-search">
            <div class="component-search-icon">
                <span class="material-symbols-rounded">search</span>
            </div>
            <div class="component-search-input">
                <input type="text" placeholder="<?php echo __('search_placeholder'); ?>">
            </div>
        </div>
    </div>

    <div class="header-right">
        <div class="component-actions">
            <button class="component-button component-button--icon component-button--h40 mobile-search-btn" data-action="toggleMobileSearch" data-tooltip="<?php echo __('tooltip_search'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">search</span>
            </button>

            <?php if ($isMaintenanceActive && $isPrivileged): ?>
                <button class="component-button component-button--icon component-button--h40" data-tooltip="<?php echo __('tooltip_maintenance'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded" style="color: var(--status-warning);">warning</span>
                </button>
            <?php endif; ?>

            <?php if ($isLoggedIn && $hasCanvasAccess): ?>
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleCanvases" data-tooltip="Lienzos" data-position="bottom">
                    <span class="material-symbols-rounded">palette</span>
                </button>
            <?php endif; ?>

            <?php if (!$isLoggedIn): ?>
                <button class="component-button component-button--dark component-button--h40" data-nav="<?php echo APP_URL; ?>/login">
                    <?php echo __('btn_login'); ?>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModule" data-target="moduleMainOptions" data-tooltip="<?php echo __('tooltip_options'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
            <?php else: ?>
                <button class="component-button component-button--profile role-dynamic sk-hydrate" 
                        style="position: relative; --active-role-bg: <?php echo $activeRoleBg; ?>;"
                        data-action="toggleModule" 
                        data-target="moduleMainOptions" 
                        data-tooltip="<?php echo __('tooltip_options_account'); ?>" 
                        data-position="bottom">
                    <img src="<?php echo APP_URL; ?>/<?php echo htmlspecialchars($userPic); ?>" 
                         alt="<?php echo __('alt_profile'); ?>"
                         onload="this.parentElement.classList.add('is-loaded')">
                         
                    <?php if ($subscriptionTier === 1): ?>
                        <span class="premium-badge">PRO</span>
                    <?php elseif ($subscriptionTier === 2): ?>
                        <span class="premium-badge advanced">ADV</span>
                    <?php endif; ?>
                </button>
            <?php endif; ?>
        </div>
    </div>

    <?php include __DIR__ . '/../modules/moduleMainOptions.php'; ?>
    <?php if ($isLoggedIn && $hasCanvasAccess) { include __DIR__ . '/../modules/moduleCanvases.php'; } ?>
</div>