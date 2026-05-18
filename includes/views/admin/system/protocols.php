<?php
// includes/views/admin/system/protocols.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Core\Helpers\Utils;
use App\Core\System\CacheConstants;

// 1. Determinar el estado actual del protocolo de pánico consultando Redis
$isPanicModeActive = false;
try {
    $redis = Utils::getRedisClient();
    $isPanicModeActive = (bool)$redis->exists(CacheConstants::KEY_SYSTEM_PANIC_MODE);
} catch (\Exception $e) {
    // Si Redis falla, asumimos inactivo para no bloquear la UI de lectura
}

// 2. Configurar clases y variables dinámicas según el estado
$panicIconColor = $isPanicModeActive ? 'var(--danger-color, #dc2626)' : 'var(--success-color, #16a34a)';
$panicBorderColor = $isPanicModeActive ? 'var(--danger-color, #dc2626)' : 'var(--border-color)';
$panicStatusIcon = $isPanicModeActive ? 'warning' : 'verified_user';
$panicStatusText = $isPanicModeActive ? __('admin_panic_status_active') : __('admin_panic_status_inactive');
$panicStatusDesc = $isPanicModeActive ? __('admin_panic_desc_active') : __('admin_panic_desc_inactive');

$panicBtnClass = $isPanicModeActive ? 'component-button--secondary' : 'component-button--danger';
$panicBtnText = $isPanicModeActive ? __('admin_btn_panic_deactivate') : __('admin_btn_panic_activate');
$panicDataStatus = $isPanicModeActive ? 'active' : 'inactive';
?>
<div class="view-content system-protocols-view">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_protocols_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button <?php echo $panicBtnClass; ?> component-button--h40" data-action="togglePanicMode" data-status="<?php echo $panicDataStatus; ?>">
                <span class="material-symbols-rounded">emergency</span>
                <span><?php echo $panicBtnText; ?></span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card" style="margin-bottom: 32px; border-color: <?php echo $panicBorderColor; ?>; transition: all 0.3s ease;">
                    <div class="component-card__content">
                        <div class="component-card__icon-container" style="color: <?php echo $panicIconColor; ?>; background: transparent;">
                            <span class="material-symbols-rounded" style="font-size: 2rem;"><?php echo $panicStatusIcon; ?></span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title" style="color: <?php echo $panicIconColor; ?>; font-weight: 600;">
                                <?php echo $panicStatusText; ?>
                            </h2>
                            <p class="component-card__description"><?php echo $panicStatusDesc; ?></p>
                        </div>
                    </div>
                </div>

                <div class="component-header-card" style="margin-bottom: 16px; padding: 0;">
                    <h2 class="component-page-title" style="font-size: 1.1rem;"><?php echo __('admin_maintenance_title_main'); ?></h2>
                    <p class="component-page-description"><?php echo __('admin_maintenance_desc_main'); ?></p>
                </div>

                <div class="component-card--grouped">
                    
                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">logout</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_maintenance_flush_sessions_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_maintenance_flush_sessions_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button type="button" class="component-button component-button--danger component-button--h36" data-action="flushSessions">
                                <?php echo __('btn_flush_sessions'); ?>
                            </button>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">memory</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_maintenance_clear_cache_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_maintenance_clear_cache_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button type="button" class="component-button component-button--secondary component-button--h36" data-action="clearCache">
                                <?php echo __('btn_clear_cache'); ?>
                            </button>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_maintenance_reset_limits_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_maintenance_reset_limits_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button type="button" class="component-button component-button--secondary component-button--h36" data-action="resetRateLimits">
                                <?php echo __('btn_reset_limits'); ?>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>