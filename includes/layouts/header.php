<?php 
// includes/layouts/header.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$userPic = $_SESSION['user_pic'] ?? '';
?>
<script>
    window.AppRouteTitles = {
        '/': "<?php echo __('route_home'); ?>",
        '/explore': "<?php echo __('route_explore'); ?>",
        '/login': "<?php echo __('route_login'); ?>",
        '/register': "<?php echo __('route_register'); ?>",
        '/settings': "<?php echo __('route_settings'); ?>",
        '/settings/your-profile': "<?php echo __('route_profile'); ?>",
        '/settings/security': "<?php echo __('route_security'); ?>",
        '/settings/accessibility': "<?php echo __('route_accessibility'); ?>",
        '/settings/guest': "<?php echo __('route_guest'); ?>",
        '/settings/change-password': "<?php echo __('route_change_password'); ?>",
        '/settings/2fa': "<?php echo __('route_2fa'); ?>"
    };
    window.AppName = "ProjectRosaura";
</script>

<div class="header">
    <div class="header-left">
        <div class="component-actions">
            <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleSurface">
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
            
            <button class="component-button component-button--icon component-button--h40 mobile-search-btn" data-action="toggleMobileSearch">
                <span class="material-symbols-rounded">search</span>
            </button>

            <?php if (!$isLoggedIn): ?>
                <button class="component-button component-button--dark component-button--h40" data-nav="/ProjectRosaura/login">
                    <?php echo __('btn_login'); ?>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleMainOptions">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
            <?php else: ?>
                <button class="component-button component-button--profile role-<?php echo htmlspecialchars($userRole); ?>" data-action="toggleModuleMainOptions">
                    <img src="/ProjectRosaura/<?php echo htmlspecialchars($userPic); ?>" alt="<?php echo __('alt_profile'); ?>">
                </button>
            <?php endif; ?>

        </div>
    </div>

    <?php include __DIR__ . '/../modules/moduleMainOptions.php'; ?>

</div>