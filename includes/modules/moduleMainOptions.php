<?php 
// includes/modules/moduleMainOptions.php

$isDegraded = defined('SYSTEM_DEGRADED') && SYSTEM_DEGRADED === true;
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$isLoggedIn = $activeAccountId !== null && !empty($linkedAccounts) && !$isDegraded;
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('access_admin_panel', $userPermissions);
$settingsLink = $isLoggedIn ? APP_URL . '/settings/your-profile' : APP_URL . '/settings/guest';

$parseRoleColor = function($roleColorRaw) {
    $defaultBg = 'transparent';
    if (empty($roleColorRaw)) return $defaultBg;
    $colorData = json_decode($roleColorRaw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
        return htmlspecialchars($roleColorRaw);
    }
    $firstColorObj = $colorData['colors'][0] ?? null;
    $bg = is_string($firstColorObj) ? $firstColorObj : ($firstColorObj['hex'] ?? $defaultBg);
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
        $bg = "conic-gradient(from {$angle}deg, " . implode(', ', $stopsArray) . ")";
    }
    return htmlspecialchars($bg);
};
?>

<style>
    .component-module[data-module="moduleMainOptions"] .component-avatar::before {
        top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important;
    }
</style>

<div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-menu="main-options">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list component-menu-list--scrollable">
            <?php if ($isLoggedIn): ?>
                <?php 
                    $activeAcc = $linkedAccounts[$activeAccountId] ?? null;
                    $activeAccPic = \App\Core\Helpers\Utils::getValidImage($activeAcc['user_pic'] ?? '', 'avatar');
                ?>
                <div class="component-menu-link component-menu-link--bordered component-account-item" data-action="showSubMenu" data-menu-target="account-switcher">
                    <div class="component-avatar component-avatar--36 role-dynamic" style="--active-role-bg: <?php echo $parseRoleColor($activeAcc['user_role_color'] ?? ''); ?>;">
                        <img src="<?php echo APP_URL . '/' . htmlspecialchars($activeAccPic); ?>" alt="<?php echo __('alt_avatar'); ?>">
                    </div>
                    <div class="component-account-info">
                        <span class="component-account-name"><?php echo htmlspecialchars($activeAcc['user_name'] ?? __('user_default_name')); ?></span>
                        <span class="component-account-email"><?php echo htmlspecialchars($activeAcc['user_email'] ?? ''); ?></span>
                    </div>
                    <span class="material-symbols-rounded" style="color: var(--text-muted);">navigate_next</span>
                </div>
                <div class="component-menu-divider"></div>
            <?php endif; ?>

            <?php if ($isLoggedIn && $isAdmin): ?>
            <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/admin/dashboard">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('admin_panel_title'); ?></span>
                </div>
            </div>
            <div class="component-menu-divider"></div>
            <?php endif; ?>

            <div class="component-menu-link nav-item" data-nav="<?php echo $settingsLink; ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_settings'); ?></span>
                </div>
            </div>
            
            <?php if ($isLoggedIn): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/purchase-history">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">receipt_long</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_purchase_history'); ?></span>
                </div>
            </div>
            <?php endif; ?>

            <div class="component-menu-link">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">help</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_help'); ?></span>
                </div>
            </div>
            
            <?php if ($isLoggedIn): ?>
            <div class="component-menu-link" data-action="submitLogout">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">logout</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_logout'); ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <?php if ($isLoggedIn): ?>
    <div class="component-menu component-menu--w265 component-menu--h-auto disabled" data-menu="account-switcher">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list">
            <?php foreach($linkedAccounts as $id => $acc): ?>
                <?php 
                $isActive = ($id === $activeAccountId);
                $accPic = \App\Core\Helpers\Utils::getValidImage($acc['user_pic'] ?? '', 'avatar');
                ?>
                <div class="component-menu-link component-menu-link--bordered component-account-item <?php echo $isActive ? 'active' : ''; ?>" <?php if(!$isActive) echo 'data-action="switchAccount" data-id="'.$id.'"'; ?>>
                    <div class="component-avatar component-avatar--36 role-dynamic" style="--active-role-bg: <?php echo $parseRoleColor($acc['user_role_color'] ?? ''); ?>;">
                        <img src="<?php echo APP_URL . '/' . htmlspecialchars($accPic); ?>" alt="<?php echo __('alt_avatar'); ?>">
                    </div>
                    <div class="component-account-info">
                        <span class="component-account-name"><?php echo htmlspecialchars($acc['user_name'] ?? __('user_default_name')); ?></span>
                        <span class="component-account-email"><?php echo htmlspecialchars($acc['user_email'] ?? ''); ?></span>
                    </div>
                    <?php if($isActive): ?>
                        <span class="material-symbols-rounded component-account-check">check_circle</span>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>

            <?php if(count($linkedAccounts) < 3): ?>
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/login">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">add</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_add_account'); ?></span>
                    </div>
                </div>
            <?php endif; ?>
            <div class="component-menu-divider"></div>
            <div class="component-menu-link component-menu-link--bordered" data-action="logoutAll">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">logout</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_logout_all'); ?></span>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>
</div>