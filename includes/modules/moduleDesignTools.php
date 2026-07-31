<?php

use App\Core\System\SubscriptionPlanConstants;
$userTier = (int) ($_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? 0);
$hasLiveSync = SubscriptionPlanConstants::hasFeature($userTier, 'live_templates');
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

        <!-- Section 1: Color Personalizado y Trigger de Picker -->
        <div class="component-menu-section-parent" data-ref="active-color-section">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">brush</span>
                    <span class="component-menu-header-title"><?php echo __('dt_color_picker') ?: 'Selector de Color'; ?></span>
                </div>
            </div>
            
            <div class="component-menu-bottom">
               <div class="component-items-grid">
                    <!-- Botón selector de color arcoíris -->
                    <div class="component-dropdown-wrapper picker-wrapper-disabled" data-ref="recent-picker-dropdown-wrapper">
                        <button type="button" class="component-color-btn component-color-btn--rainbow" data-action="toggleRecentColorPicker" data-tooltip="<?php echo __('dt_color_picker') ?: 'Selector de Color'; ?>">
                            <div class="component-color-btn--rainbow-inner">
                                <span class="material-symbols-rounded">add</span>
                            </div>
                        </button>
                        
                        <!-- Módulo Dropdown del Color Picker -->
                        <div class="component-module--dropdown-picker disabled" data-ref="recent-color-picker-dropdown">
                            <div class="component-color-picker" data-ref="recent-color-picker">
                                <div class="component-color-picker__sv-area" data-action="dragRecentSV">
                                    <div class="component-color-picker__sv-bg"></div>
                                    <div class="component-color-picker__sv-thumb" data-ref="recentSvThumb"></div>
                                </div>
                                <div class="component-color-picker__hue-area" data-action="dragRecentHue">
                                    <div class="component-color-picker__hue-thumb" data-ref="recentHueThumb"></div>
                                </div>
                                <div class="component-color-picker__controls">
                                    <div class="component-input-group component-input-group--h34 component-input-group--color">
                                        <div class="component-color-swatch component-color-swatch--sm" data-ref="recentHexPreview"></div>
                                        <input type="text" class="component-input-field component-input-field--mono" data-ref="recentHexInput" value="#FFFFFF">
                                    </div>
                                    <button type="button" class="component-button component-button--h34 component-button--icon" data-action="saveRecentColorBtn">
                                        <span class="material-symbols-rounded">check</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
               </div>
            </div>
        </div>

        <!-- Section 2: Colores Recientes -->
        <div class="component-menu-section-parent disabled" data-ref="recent-colors-section">
            <hr class="component-divider">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">history</span>
                    <span class="component-menu-header-title"><?php echo __('dt_recent_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-bottom">
               <div class="component-items-grid" data-ref="recent-colors-grid">
                    <!-- Will be populated via JS -->
               </div>
            </div>
        </div>

        <!-- Section 3: Colores por Defecto -->
        <div class="component-menu-section-parent">
            <hr class="component-divider">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">color_lens</span>
                    <span class="component-menu-header-title"><?php echo __('dt_default_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-bottom">
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
            <div class="component-menu-top">
                <div class="component-template-upload-section">
                    <input type="file" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
                    <button class="component-button component-button--full component-button--dark component-button--h40" data-action="triggerTemplateUpload">
                        <span class="material-symbols-rounded">cloud_upload</span>
                        <?php echo __('dt_upload_library'); ?>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">collections_bookmark</span>
                    <span class="component-menu-header-title"><?php echo __('dt_my_library'); ?> (<span data-ref="template-count">0</span>)</span>
                </div>
            </div>
            <div class="component-menu-bottom">
                <div class="component-items-grid component-items-grid--5" data-ref="user-templates-grid">
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>
    </div>



</div>