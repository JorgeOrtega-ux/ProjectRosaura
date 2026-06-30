<?php 
// includes/views/canvases/create.php 
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

$userPerms = $_SESSION['user_permissions'] ?? [];
$canCreateOfficial = in_array('access_admin_panel', $userPerms) || in_array('canvases.create_official', $userPerms);

// Cargar la lista oficial de tamaños desde el SSOT
$canvasSizesList = Utils::getCanvasSizes();
$defaultSizeKey = '64x64';
$defaultSizeData = $canvasSizesList[$defaultSizeKey] ?? reset($canvasSizesList);
$defaultSizeKey = $defaultSizeData ? key($canvasSizesList) : '64x64';
?>
<div class="view-content" data-ref="canvas-create-wrapper">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('canvas_create_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--icon component-button--h40" data-action="createCanvas" data-ref="btn-create-canvas" data-tooltip="<?php echo __('btn_create_canvas'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">add_box</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped">

                    <div class="component-group-item component-group-item--stacked" data-ref="scope-section">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_scope_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_scope_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger <?php echo !$canCreateOfficial ? 'disabled-interactive' : ''; ?>" <?php echo $canCreateOfficial ? 'data-action="toggleDropdown" data-target="dropdownScopeType"' : ''; ?>>
                                    <span class="material-symbols-rounded"><?php echo $canCreateOfficial ? 'admin_panel_settings' : 'person'; ?></span>
                                    <span class="component-dropdown-text" data-ref="text-scope-type"><?php echo __('canvas_scope_type_personal'); ?></span>
                                    <?php if ($canCreateOfficial): ?>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    <?php endif; ?>
                                </div>
                                
                                <?php if ($canCreateOfficial): ?>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownScopeType">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <div class="component-menu-link active" data-action="selectValue" data-type="scope_type" data-value="personal" data-label="canvas_scope_type_personal" data-icon="person">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_personal'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="selectValue" data-type="scope_type" data-value="global" data-label="canvas_scope_type_global" data-icon="public">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_global'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="selectValue" data-type="scope_type" data-value="country" data-label="canvas_scope_type_country" data-icon="flag">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">flag</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_country'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="selectValue" data-type="scope_type" data-value="state" data-label="canvas_scope_type_state" data-icon="map">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">map</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_state'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="selectValue" data-type="scope_type" data-value="municipality" data-label="canvas_scope_type_municipality" data-icon="location_city">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">location_city</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_municipality'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="selectValue" data-type="scope_type" data-value="organization" data-label="canvas_scope_type_organization" data-icon="domain">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">domain</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('canvas_scope_type_organization'); ?></span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <?php else: ?>
                                    <input type="hidden" name="scope_type" value="personal">
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider" data-ref="scope-divider-main">

                    <div class="component-group-item component-group-item--stacked disabled" data-ref="scope-section-country">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_scope_country_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_scope_country_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownScopeCountry">
                                    <span class="material-symbols-rounded" data-ref="icon-scope-country">flag</span>
                                    <span class="component-dropdown-text" data-ref="text-scope-country"><?php echo __('canvas_scope_country_placeholder'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownScopeCountry">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="list-scope-country">
                                            <div class="component-menu-link disabled">
                                                <div class="component-menu-link-text"><span><?php echo __('lbl_loading'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider disabled" data-ref="scope-divider-state">
                    <div class="component-group-item component-group-item--stacked disabled" data-ref="scope-section-state">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_scope_state_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_scope_state_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownScopeState">
                                    <span class="material-symbols-rounded" data-ref="icon-scope-state">map</span>
                                    <span class="component-dropdown-text" data-ref="text-scope-state"><?php echo __('canvas_scope_state_placeholder'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownScopeState">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="list-scope-state">
                                            <div class="component-menu-link disabled">
                                                <div class="component-menu-link-text"><span><?php echo __('lbl_loading'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider disabled" data-ref="scope-divider-city">
                    <div class="component-group-item component-group-item--stacked disabled" data-ref="scope-section-city">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_scope_city_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_scope_city_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="dropdownScopeCity">
                                    <span class="material-symbols-rounded" data-ref="icon-scope-city">location_city</span>
                                    <span class="component-dropdown-text" data-ref="text-scope-city"><?php echo __('canvas_scope_city_placeholder'); ?></span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownScopeCity">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable" data-ref="list-scope-city">
                                            <div class="component-menu-link disabled">
                                                <div class="component-menu-link-text"><span><?php echo __('lbl_loading'); ?></span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider disabled" data-ref="scope-divider-org">
                    <div class="component-group-item component-group-item--stacked disabled" data-ref="scope-section-org">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_scope_org_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_scope_org_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" data-ref="input-scope-organization" class="component-input-field component-input-field--simple" placeholder="<?php echo __('canvas_scope_org_placeholder'); ?>">
                            </div>
                        </div>
                    </div>
                    
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

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('canvas_desc_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('canvas_desc_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-input-group component-input-group--h34">
                                <input type="text" data-ref="input-canvas-desc" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_canvas_desc'); ?>">
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

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
                                            <?php foreach ($canvasSizesList as $val => $data): ?>
                                            <div class="component-menu-link <?php echo ($val === $defaultSizeKey) ? 'active' : ''; ?>" data-action="selectValue" data-type="size" data-value="<?php echo htmlspecialchars($val); ?>" data-label="<?php echo htmlspecialchars($data['label']); ?>" data-icon="<?php echo htmlspecialchars($data['icon']); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo htmlspecialchars($data['icon']); ?></span></div>
                                                <div class="component-menu-link-text"><span><?php echo htmlspecialchars($data['label']); ?></span></div>
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
    </div>
</div>