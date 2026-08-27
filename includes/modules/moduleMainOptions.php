<?php 

$isDegraded = defined('SYSTEM_DEGRADED') && SYSTEM_DEGRADED === true;
$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$isLoggedIn = $activeAccountId !== null && !empty($linkedAccounts) && !$isDegraded;
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdmin = in_array('access_admin_panel', $userPermissions);
$settingsLink = $isLoggedIn ? APP_URL . '/settings/your-account' : APP_URL . '/settings/guest';

$parseSubscriptionColor = function($subColorRaw) {
    $defaultBg = 'transparent';
    if (empty($subColorRaw)) return $defaultBg;
    $colorData = json_decode($subColorRaw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($colorData)) {
        return htmlspecialchars($subColorRaw);
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

<div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
    <div class="component-menu component-menu--w265 component-menu--h-auto active" data-menu="main-options">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-list">
            <?php if ($isLoggedIn): ?>
                <?php 
                    $activeAcc = $linkedAccounts[$activeAccountId] ?? null;
                    $activeAccPic = \App\Core\Helpers\Utils::getValidImage($activeAcc['user_pic'] ?? '', 'avatar');
                ?>
                <div class="component-menu-link component-menu-link--bordered component-account-item" data-action="showSubMenu" data-menu-target="account-switcher">
                    <?php $activeAccColor = $parseSubscriptionColor($activeAcc['subscription_color'] ?? ''); ?>
                    <div class="component-avatar component-avatar--36 subscription-dynamic" 
                         data-sub-bg="<?php echo $activeAccColor; ?>"
                         style="--active-subscription-bg: <?php echo $activeAccColor; ?>;">
                        <img src="<?php echo htmlspecialchars($activeAccPic); ?>" alt="<?php echo __('alt_avatar'); ?>" 
                             class="image-lazy-fade"
                             onload="this.classList.add('image-loaded')"
                             onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                    </div>
                    <div class="component-account-info">
                        <?php 
                        $roleName = $activeAcc['user_role_name'] ?? '';
                        $showRole = false;
                        $translatedRole = '';
                        if (!empty($roleName)) {
                            $roleLower = strtolower(trim($roleName));
                            if ($roleLower !== 'user' && $roleLower !== 'usuario') {
                                $showRole = true;
                                $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', $roleLower);
                                $translatedRole = __($roleKey);
                            }
                        }
                        ?>
                        <span class="component-account-name">
                            <?php echo htmlspecialchars($activeAcc['user_name'] ?? __('user')); ?>
                            <?php if ($showRole): ?> (<?php echo htmlspecialchars($translatedRole); ?>)<?php endif; ?>
                        </span>
                        <span class="component-account-email"><?php echo htmlspecialchars($activeAcc['user_email'] ?? ''); ?></span>
                    </div>
                    <span class="material-symbols-rounded">navigate_next</span>
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

            <?php if ($isLoggedIn): ?>
            <?php 
                $activeIdentifier = $activeAcc['user_identifier'] ?? ($_SESSION['user_identifier'] ?? '');
                $myProfileUrl = !empty($activeIdentifier) ? APP_URL . '/@' . htmlspecialchars($activeIdentifier) : APP_URL . '/settings/your-account';
            ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo $myProfileUrl; ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">account_circle</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_my_profile'); ?></span>
                </div>
            </div>
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

            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/site-policy/terms-conditions">
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
                    <?php $accColor = $parseSubscriptionColor($acc['subscription_color'] ?? ''); ?>
                    <div class="component-avatar component-avatar--36 subscription-dynamic" 
                         data-sub-bg="<?php echo $accColor; ?>"
                         style="--active-subscription-bg: <?php echo $accColor; ?>;">
                        <img src="<?php echo htmlspecialchars($accPic); ?>" alt="<?php echo __('alt_avatar'); ?>" 
                             class="image-lazy-fade"
                             onload="this.classList.add('image-loaded')"
                             onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                    </div>
                    <div class="component-account-info">
                        <?php 
                        $accRoleName = $acc['user_role_name'] ?? '';
                        $accShowRole = false;
                        $accTranslatedRole = '';
                        if (!empty($accRoleName)) {
                            $accRoleLower = strtolower(trim($accRoleName));
                            if ($accRoleLower !== 'user' && $accRoleLower !== 'usuario') {
                                $accShowRole = true;
                                $accRoleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', $accRoleLower);
                                $accTranslatedRole = __($accRoleKey);
                            }
                        }
                        ?>
                        <span class="component-account-name">
                            <?php echo htmlspecialchars($acc['user_name'] ?? __('user')); ?>
                            <?php if ($accShowRole): ?> (<?php echo htmlspecialchars($accTranslatedRole); ?>)<?php endif; ?>
                        </span>
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