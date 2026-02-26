<?php http_response_code(403); ?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card" style="text-align: center; padding: 40px 24px; max-width: 500px; margin: 40px auto;">
            <div class="component-card__icon-container component-card__icon-container--bordered" style="width: 64px; height: 64px; margin: 0 auto 16px auto;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: #d32f2f;">shield_lock</span>
            </div>
            
            <h1 class="component-page-title" style="color: #d32f2f; margin-bottom: 12px;"><?php echo __('require_2fa_title'); ?></h1>
            <p class="component-page-description" style="margin-bottom: 32px; font-size: 16px; line-height: 1.5;"><?php echo __('require_2fa_desc'); ?></p>
            
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center;">
                <button class="component-button component-button--dark component-button--h45" style="width: 100%; max-width: 250px;" data-nav="/ProjectRosaura/settings/2fa">
                    <?php echo __('btn_configure_2fa'); ?>
                </button>
                <button class="component-button component-button--h45" style="width: 100%; max-width: 250px;" data-nav="/ProjectRosaura/">
                    <?php echo __('btn_back_home'); ?>
                </button>
            </div>
        </div>
    </div>
</div>