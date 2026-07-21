<?php 
use \App\Core\System\SubscriptionPlanConstants;
use \App\Core\Helpers\Utils;

$activeAccountId = $_SESSION['active_account'] ?? null;
$linkedAccounts = $_SESSION['accounts'] ?? [];
$tier = 0;
if ($activeAccountId && isset($linkedAccounts[$activeAccountId])) {
    $tier = (int)($linkedAccounts[$activeAccountId]['subscription_tier'] ?? 0);
}
$planLimits = SubscriptionPlanConstants::getTierLimits($tier);
$maxMembers = $planLimits['max_members_per_canvas'] === -1 ? 50000 : $planLimits['max_members_per_canvas'];
$hasLiveChat = $planLimits['allow_live_chat'] ?? false;

$userPerms = $_SESSION['user_permissions'] ?? [];
$canCreateOfficial = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPerms) || in_array(\App\Core\System\PermissionsConstants::CANVASES_CREATE_OFFICIAL, $userPerms);
$canvasSizesList = Utils::getCanvasSizes();
$defaultSizeKey = '64x64';
if (!isset($canvasSizesList[$defaultSizeKey])) {
    $defaultSizeData = reset($canvasSizesList);
    $defaultSizeKey = key($canvasSizesList);
} else {
    $defaultSizeData = $canvasSizesList[$defaultSizeKey];
}
?>
<div class="view-content" data-ref="canvas-create-wrapper" data-user-tier="<?php echo $tier; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_create_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40" data-action="createCanvas" data-ref="btn-create-canvas">
                <span class="material-symbols-rounded">add_box</span>
                <span><?php echo __('btn_create_experience'); ?></span>
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
                                            <span class="component-display-value" data-ref="display-canvasname"><?php echo __('lbl_loading'); ?></span>
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
                                                    <input type="text" data-ref="input-canvasname" class="component-input-field component-input-field--simple" value="" data-original-value="" placeholder="<?php echo __('ph_canvas_name'); ?>">
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
                                            <span class="component-dropdown-text" data-ref="text-tags"><?php echo __('ph_select_tags'); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownTags">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-header">
                                                    <div class="component-search component-search--full component-search--h36">
                                                        <div class="component-search-icon">
                                                            <span class="material-symbols-rounded">search</span>
                                                        </div>
                                                        <div class="component-search-input">
                                                            <input type="text" data-ref="tags-search" placeholder="<?php echo __('search_tags'); ?>">
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <?php 
                                                    $allowedTags = ['art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 'community', 'nature', 'scifi', 'fantasy', 'music', 'sports', 'popculture', 'abstract', 'experimental'];
                                                    foreach ($allowedTags as $tag): ?>
                                                    <div class="component-menu-link" data-action="toggleTag" data-value="<?php echo $tag; ?>" data-label="<?php echo __('tag_' . $tag); ?>">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded" data-ref="icon-check">check_box_outline_blank</span></div>
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
                                        <input type="checkbox" data-ref="val_is_official">
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <?php endif; ?>

                        </div>
                    </div>
                </div>


                <div class="component-card--grouped component-accordion ">
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
                            <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_size_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_size_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownSize">
                                    <span class="material-symbols-rounded"><?php echo htmlspecialchars($defaultSizeData['icon']); ?></span>
                                    <span class="component-dropdown-text" data-ref="text-size"><?php echo htmlspecialchars($defaultSizeData['label']); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownSize">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <?php foreach ($canvasSizesList as $val => $data): 
                                                $requiredTier = $data['tier'] ?? 0;
                                                $isAllowed = ($tier >= $requiredTier);
                                                $disabledClass = $isAllowed ? '' : 'disabled-interaction';
                                                $action = $isAllowed ? 'selectValue' : '';
                                                $tierName = SubscriptionPlanConstants::getTierLimits($requiredTier)['name'] ?? 'Pro';
                                                $lockIcon = $isAllowed ? '' : '<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ' . htmlspecialchars($tierName) . '</span>';
                                                $activeClass = ($val === $defaultSizeKey && $isAllowed) ? 'active' : '';
                                            ?>
                                            <div class="component-menu-link <?php echo $activeClass; ?> <?php echo $disabledClass; ?>" data-action="<?php echo $action; ?>" data-type="size" data-value="<?php echo htmlspecialchars($val); ?>" data-tier="<?php echo $requiredTier; ?>" data-label="<?php echo htmlspecialchars($data['label']); ?>" data-icon="<?php echo htmlspecialchars($data['icon']); ?>" <?php if(!$isAllowed) echo 'title="' . __('tooltip_upgrade_required') . '"'; ?>>
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                                <div class="component-menu-link-text">
                                                    <span><?php echo htmlspecialchars($data['label']); ?></span>
                                                </div>
                                                <?php echo $lockIcon; ?>
                                            </div>
                                            <?php endforeach; ?>
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
                                <h2 class="component-card__title"><?php echo __('canvas_privacy_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_privacy_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownPrivacy">
                                    <span class="material-symbols-rounded">lock</span>
                                    <span class="component-dropdown-text" data-ref="text-privacy"><?php echo __('canvas_privacy_private'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownPrivacy">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="selectValue" data-type="privacy" data-value="public" data-label="canvas_privacy_public" data-icon="public">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_privacy_public'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link active" data-action="selectValue" data-type="privacy" data-value="private" data-label="canvas_privacy_private" data-icon="lock">
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
                                    <span class="material-symbols-rounded" data-ref="icon-approval">no_accounts</span>
                                    <span class="component-dropdown-text" data-ref="text-approval"><?php echo __('canvas_approval_false'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownApproval">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link active" data-action="selectValue" data-type="requires_approval" data-value="false" data-label="canvas_approval_false" data-icon="no_accounts">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">no_accounts</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('canvas_approval_false'); ?></span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectValue" data-type="requires_approval" data-value="true" data-label="canvas_approval_true" data-icon="front_hand">
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
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_cooldown_batch_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_cooldown_batch_desc'); ?></p>
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
                                <div class="component-inline-control__center" data-ref="val_cooldown_batch" data-val="5">5</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="1" data-max="100">
                                        <span class="material-symbols-rounded">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCooldownBatch" data-step="5" data-max="100">
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
                                <div class="component-inline-control__center" data-ref="val_cooldown_seconds" data-val="10">10</div>
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
                                <div class="component-inline-control__center" data-ref="val_limit" data-val="10">10</div>
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


                <div class="component-card--grouped component-accordion ">
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
                                    <span class="component-dropdown-text" data-ref="text-palette"><?php echo __('lbl_loading'); ?></span>
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
                                <input type="checkbox" data-ref="val_allow_purchases" checked="">
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--wrap <?php echo !$hasLiveChat ? 'disabled-interaction' : ''; ?>" <?php if(!$hasLiveChat) echo 'data-tooltip="' . htmlspecialchars(__('lbl_requires_ultra') ?: __('lbl_requires_premium_advanced')) . '" data-position="top"'; ?>>
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">
                                    <?php echo __('lbl_allow_live_chat'); ?>
                                    <?php if(!$hasLiveChat): ?><span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> Ultra</span><?php endif; ?>
                                </h2>
                                <p class="component-card__description"><?php echo __('desc_allow_live_chat'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="val_allow_chat" <?php echo !$hasLiveChat ? 'disabled' : ''; ?>>
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