<?php

use App\Core\System\SubscriptionPlanConstants;
$userTier = (int) ($userTier ?? $_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? 0);
$hasLiveSync = SubscriptionPlanConstants::hasFeature($userTier, 'live_templates');
$hasNoAds = SubscriptionPlanConstants::hasFeature($userTier, 'no_ads');
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">palette</span>
                <span class="component-menu-header-title"><?php echo __('dt_select_color'); ?></span>
            </div>
        </div>

        <!-- Section 3: Colores por Defecto -->
        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">color_lens</span>
                    <span class="component-menu-header-title"><?php echo __('dt_default_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-section-body">
               <div class="component-items-grid" data-ref="color-palette-grid">
                    <div class="component-loader-center component-loader-center--compact">
                        <div class="component-empty-state-content">
                            <span class="material-symbols-rounded icon-spin-slow">palette</span><br>
                            <?php echo __('dt_loading'); ?>
                        </div>
                    </div>
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>

        <?php if (!$hasNoAds): ?>
        <div class="component-menu-footer component-menu-footer--ad" data-ref="palette-ad-footer">
            <div class="component-drawer-ad-card" data-ad-card="palette"></div>
        </div>
        <?php endif; ?>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-templates">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">photo_library</span>
                <span class="component-menu-header-title"><?php echo __('dt_templates'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--bordered">
            <div class="component-menu-section-header">
                <div class="component-template-upload-section">
                    <input type="file" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
                    <button class="component-button component-button--full component-button--h40" data-action="triggerTemplateUpload">
                        <span class="material-symbols-rounded">cloud_upload</span>
                        <?php echo __('dt_upload_library'); ?>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">collections_bookmark</span>
                    <span class="component-menu-header-title"><?php echo __('dt_my_library'); ?> (<span data-ref="template-count">0</span>)</span>
                </div>
            </div>
            <div class="component-menu-section-body">
                <div class="component-items-grid component-items-grid--5" data-ref="user-templates-grid">
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>

        <?php if (!$hasNoAds): ?>
        <div class="component-menu-footer component-menu-footer--ad" data-ref="templates-ad-footer">
            <div class="component-drawer-ad-card" data-ad-card="templates"></div>
        </div>
        <?php endif; ?>
    </div>

</div>