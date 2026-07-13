<?php

use App\Core\System\SubscriptionPlanConstants;
$userTier = (int) ($_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? SubscriptionPlanConstants::TIER_BASIC);
$hasLiveSync = SubscriptionPlanConstants::hasFeature($userTier, 'live_templates');
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-live">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">stream</span>
                <span class="component-menu-header-title"><?php echo __('dt_stream_template'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--chat">
            <div class="component-menu-center">
                <div class="component-menu-section-parent component-menu-section-parent--bordered">
                    <div class="component-menu-top">
                        <div class="component-menu-header-box">
                            <span class="material-symbols-rounded">swap_horiz</span>
                            <span class="component-menu-header-title"><?php echo __('dt_pos_x'); ?></span>
                        </div>
                    </div>
                    <div class="component-menu-bottom">
                        <div class="component-inline-control component-inline-control--full">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_x" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_x" data-step="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" data-ref="val_live_x" data-val="0">0</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_x" data-step="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_x" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="component-menu-section-parent component-menu-section-parent--bordered">
                    <div class="component-menu-top">
                        <div class="component-menu-header-box">
                            <span class="material-symbols-rounded">swap_vert</span>
                            <span class="component-menu-header-title"><?php echo __('dt_pos_y'); ?></span>
                        </div>
                    </div>
                    <div class="component-menu-bottom">
                        <div class="component-inline-control component-inline-control--full">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_y" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_y" data-step="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" data-ref="val_live_y" data-val="0">0</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_y" data-step="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_y" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="component-menu-section-parent component-menu-section-parent--bordered">
                    <div class="component-menu-top">
                        <div class="component-menu-header-box">
                            <span class="material-symbols-rounded">opacity</span>
                            <span class="component-menu-header-title"><?php echo __('dt_opacity'); ?></span>
                        </div>
                    </div>
                    <div class="component-menu-bottom">
                        <div class="component-inline-control component-inline-control--full">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_opacity" data-step="-0.5" data-min="0.1" data-max="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_opacity" data-step="-0.1" data-min="0.1" data-max="1"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" data-ref="val_live_opacity" data-val="0.5">50%</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_opacity" data-step="0.1" data-min="0.1" data-max="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveTemplate" data-field="live_opacity" data-step="0.5" data-min="0.1" data-max="1"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="component-menu-section-parent">
                    <div class="component-menu-top">
                        <div data-ref="live-share-active-alert" class="component-alert component-alert--info disabled">
                            <div class="component-alert-icon"><span class="material-symbols-rounded">info</span></div>
                            <div class="component-alert-text"><?php echo __('dt_code'); ?>: <strong data-ref="live-share-code">...</strong></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="component-menu-bottom">
                <div class="component-form-group">
                    <button class="component-button component-button--full component-button--dark component-button--h40" data-action="startLive">
                        <span class="material-symbols-rounded">play_arrow</span> <?php echo __('dt_start'); ?>
                    </button>
                    <button class="component-button component-button--full component-button--danger component-button--h40 disabled" data-action="stopLive">
                        <span class="material-symbols-rounded">stop</span> <?php echo __('dt_stop'); ?>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">palette</span>
                <span class="component-menu-header-title"><?php echo __('dt_select_color'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
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

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-advantages">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">stars</span>
                <span class="component-menu-header-title"><?php echo __('dt_active_advantages'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">inventory_2</span>
                    <span class="component-menu-header-title"><?php echo __('dt_my_advantages'); ?></span>
                </div>
            </div>

            <div class="component-menu-bottom">
                <div class="component-items-list" data-ref="user-advantages-list">
                    <div class="component-loader-center component-loader-center--compact">
                        <div class="component-empty-state-content">
                            <span class="material-symbols-rounded icon-spin-slow">stars</span><br>
                            <?php echo __('dt_loading'); ?>
                        </div>
                    </div>
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_no_advantages'); ?></p>
                </div>
            </div>
        </div>
    </div>

</div>