<?php 
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\System\SubscriptionPlanConstants;

$canvasService = new CanvasViewService();
$editData = $canvasService->getWorkspaceEditData($_GET['uuid'] ?? null);

if (empty($editData['canvasId'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($editData);
?>
<div class="view-content" data-ref="canvas-edit-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_edit_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40" data-action="updateCanvas">
                <span class="material-symbols-rounded">save</span>
                <span><?php echo __('btn_save_changes'); ?></span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped component-accordion active">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">info</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_accordion_general_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_accordion_general_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <!-- 1. Título del Lienzo -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="canvasname-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('canvas_name_title'); ?></h2>
                                            <span class="component-display-value" data-ref="display-canvasname"><?php echo $cName; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname"><?php echo __('btn_edit'); ?></button>
                                    </div>
                                </div>

                                <div class="disabled component-state-box" data-state="canvasname-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('canvas_name_title'); ?></h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-canvasname" class="component-input-field component-input-field--simple" value="<?php echo $cName; ?>" data-original-value="<?php echo $cName; ?>" placeholder="<?php echo __('ph_canvas_name'); ?>">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveCanvasName"><?php echo __('btn_save'); ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- 2. Etiquetas del Lienzo -->
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_tags_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_tags_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper" data-dropdown-type="multiple" data-max="8">
                                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownTags">
                                            <span class="material-symbols-rounded">label</span>
                                            <span class="component-dropdown-text" data-ref="text-tags">
                                                <?php echo count($cTags) > 0 ? count($cTags) . ' seleccionadas' : __('ph_select_tags'); ?>
                                            </span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownTags">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <?php 
                                                    $allowedTags = ['art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 'community', 'nature', 'scifi', 'fantasy', 'music', 'sports', 'popculture'];
                                                    foreach ($allowedTags as $tag): 
                                                        $isActive = in_array($tag, $cTags);
                                                    ?>
                                                    <div class="component-menu-link <?php echo $isActive ? 'active' : ''; ?>" data-action="toggleTag" data-value="<?php echo $tag; ?>" data-label="<?php echo __('tag_' . $tag); ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded" data-ref="icon-check"><?php echo $isActive ? 'check_box' : 'check_box_outline_blank'; ?></span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('tag_' . $tag); ?></span></div>
                                                    </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Lienzo Oficial -->
                            <?php if ($canCreateOfficial): ?>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_is_official_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_is_official_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="val_is_official" <?php echo ($cOfficial ?? false) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <?php endif; ?>

                        </div>
                    </div>
                </div>


                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">settings</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_accordion_config_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_accordion_config_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked disabled-interaction" data-tooltip="<?php echo __('canvas_size_locked_tooltip'); ?>" data-position="top">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">
                                    <?php echo __('canvas_size_title'); ?> 
                                    <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> No disponible</span>
                                </h2>
                                <p class="component-card__description"><?php echo __('canvas_size_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger">
                                    <span class="material-symbols-rounded">crop_square</span>
                                    <span class="component-dropdown-text" data-ref="text-size"><?php echo $cSize; ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_privacy_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_privacy_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownPrivacy">
                                    <span class="material-symbols-rounded" data-ref="icon-privacy"><?php echo $cPrivacy === 'public' ? 'public' : 'lock'; ?></span>
                                    <span class="component-dropdown-text" data-ref="text-privacy"><?php echo $cPrivacy === 'public' ? __('canvas_privacy_public') : __('canvas_privacy_private'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownPrivacy">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link <?php echo $cPrivacy === 'public' ? 'active' : ''; ?>" data-action="selectValue" data-type="privacy" data-value="public" data-label="canvas_privacy_public" data-icon="public">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_public'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link <?php echo $cPrivacy === 'private' ? 'active' : ''; ?>" data-action="selectValue" data-type="privacy" data-value="private" data-label="canvas_privacy_private" data-icon="lock">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_private'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_approval_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_approval_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownApproval">
                                    <span class="material-symbols-rounded" data-ref="icon-approval"><?php echo $cApproval ? 'front_hand' : 'no_accounts'; ?></span>
                                    <span class="component-dropdown-text" data-ref="text-approval"><?php echo $cApproval ? __('canvas_approval_true') : __('canvas_approval_false'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownApproval">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link <?php echo $cApproval == 0 ? 'active' : ''; ?>" data-action="selectValue" data-type="requires_approval" data-value="false" data-label="canvas_approval_false" data-icon="no_accounts">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">no_accounts</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_approval_false'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link <?php echo $cApproval == 1 ? 'active' : ''; ?>" data-action="selectValue" data-type="requires_approval" data-value="true" data-label="canvas_approval_true" data-icon="front_hand">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">front_hand</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_approval_true'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                        <?php 
                        $maxPixelsPerBatch = $planLimits['max_pixels_per_batch'] ?? 5; 
                        $cBatchVal = min($cBatch, $maxPixelsPerBatch);
                        ?>
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_cooldown_batch_title'); ?></h2>
                                <p class="component-card__description">
                                    <?php echo __('canvas_cooldown_batch_desc'); ?> 
                                    <span style="opacity: 0.7; font-size: 0.9em; display: block; margin-top: 4px;">
                                        (Máximo de <?php echo $maxPixelsPerBatch; ?> píxeles por tu plan <?php echo htmlspecialchars($planLimits['name'] ?? 'Free'); ?>)
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="-5" data-min="1">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="-1" data-min="1">
                                        <span class="material-symbols-rounded">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_cooldown_batch" data-value="<?php echo $cBatchVal; ?>"><?php echo $cBatchVal; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="1" data-max="<?php echo $maxPixelsPerBatch; ?>">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="5" data-max="<?php echo $maxPixelsPerBatch; ?>">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_cooldown_seconds_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_cooldown_seconds_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownSeconds" data-step="-10" data-min="0">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownSeconds" data-step="-1" data-min="0">
                                        <span class="material-symbols-rounded">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_cooldown_seconds" data-value="<?php echo $cCooldown; ?>"><?php echo $cCooldown; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownSeconds" data-step="1" data-max="3600">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownSeconds" data-step="10" data-max="3600">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_limit_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_limit_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="-50" data-min="10">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="-10" data-min="10">
                                        <span class="material-symbols-rounded">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_limit" data-value="<?php echo $cLimit; ?>"><?php echo $cLimit; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="10" data-max="<?php echo $maxMembers; ?>">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLimit" data-step="50" data-max="<?php echo $maxMembers; ?>">
                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                        </div>
                    </div>
                </div>


                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">extension</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_accordion_features_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_accordion_features_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_palette_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_palette_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownPalette">
                                    <span class="material-symbols-rounded" data-ref="icon-palette">palette</span>
                                    <span class="component-dropdown-text" data-ref="text-palette" data-current-palette="<?php echo htmlspecialchars($cPalette); ?>"><?php echo ucfirst($cPalette); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownPalette">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="palette-selector-container">
                                        </div>
                                        <?php if (SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')): ?>
                                            <div class="component-menu-footer">
                                                <button type="button" class="component-button component-button--h40 component-button--full" data-action="navigateCustomPalette">
                                                    <span class="material-symbols-rounded">add_circle</span>
                                                    <span><?php echo __('btn_create_custom_palette'); ?></span>
                                                </button>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_allow_purchases'); ?></h2>
                                <p class="component-card__description"><?php echo __('desc_allow_purchases'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="val_allow_purchases" <?php echo $cAllowPurchases ? 'checked' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--wrap <?php echo !$hasLiveChat ? 'disabled-interaction' : ''; ?>" <?php if(!$hasLiveChat) echo 'data-tooltip="' . htmlspecialchars(__('lbl_requires_pro') ?: 'Esta función requiere un plan Pro o superior.') . '" data-position="top"'; ?>>
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">
                                    <?php echo __('lbl_allow_live_chat'); ?>
                                    <?php if(!$hasLiveChat): 
                                        $lowestChatTier = SubscriptionPlanConstants::getLowestTierNameForFeature('allow_live_chat');
                                    ?><span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> <?php echo htmlspecialchars($lowestChatTier); ?></span><?php endif; ?>
                                </h2>
                                <p class="component-card__description"><?php echo __('desc_allow_live_chat'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="val_allow_chat" <?php echo ($cAllowChat && $hasLiveChat) ? 'checked' : ''; ?> <?php echo !$hasLiveChat ? 'disabled' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <?php $hasCustomColors = SubscriptionPlanConstants::hasFeature($tier, 'custom_colors'); ?>
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--wrap <?php echo !$hasCustomColors ? 'disabled-interaction' : ''; ?>" <?php if(!$hasCustomColors) echo 'data-tooltip="' . htmlspecialchars(__('lbl_requires_pro') ?: 'Esta función requiere un plan Pro o superior.') . '" data-position="top"'; ?>>
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">
                                    <?php echo __('lbl_allow_custom_colors'); ?>
                                    <?php if(!$hasCustomColors): 
                                        $lowestColorTier = SubscriptionPlanConstants::getLowestTierNameForFeature('custom_colors');
                                    ?><span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> <?php echo htmlspecialchars($lowestColorTier ?: 'Pro'); ?></span><?php endif; ?>
                                </h2>
                                <p class="component-card__description"><?php echo __('desc_allow_custom_colors'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="val_allow_custom_colors" <?php echo ($cAllowCustomColors && $hasCustomColors) ? 'checked' : ''; ?> <?php echo !$hasCustomColors ? 'disabled' : ''; ?>>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                        </div>
                    </div>
                </div>

                </div>

            </div>
        </div>
    </div>
</div>