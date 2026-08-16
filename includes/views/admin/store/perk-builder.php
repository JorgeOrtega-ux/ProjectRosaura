<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$builderData = $adminService->getStorePerkBuilderData($_GET['uuid'] ?? null);

if (!empty($builderData['error'])) {
    echo "<div class='view-content'><p>".htmlspecialchars($builderData['error'])."</p></div>";
    return;
}

extract($builderData);

$perkData = [
    'uuid' => '',
    'perk_id' => '',
    'price_coins' => 1000,
    'is_single_use' => 1,
    'is_active' => 1,
    'is_usable' => 1
];

if ($isEdit && !empty($perk)) {
    $perkData = array_merge($perkData, $perk);
}
?>
<div class="view-content" data-ref="admin-store-perk-wrapper" data-perk-uuid="<?php echo htmlspecialchars($perkData['uuid']); ?>" data-perk-active="<?php echo (int)($perkData['is_active']); ?>" data-perk-usable="<?php echo isset($perkData['is_usable']) ? (int)($perkData['is_usable']) : 1; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo $isEdit ? __('admin_store_edit_perk') : __('admin_store_create_perk'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40" data-action="savePerk" data-tooltip="<?php echo __('btn_save'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
                <span><?php echo __('btn_save'); ?></span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <!-- Detalles Accordion -->
                <div class="component-card--grouped component-accordion active">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">auto_awesome</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('lbl_perk_details'); ?></h2>
                                <p class="component-card__description"><?php echo __('desc_perk_details'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <!-- Perk ID (Backend Key) -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="perk-id-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('lbl_perk_backend_id'); ?></h2>
                                            <span class="component-display-value" data-ref="display-perk-id"><?php echo !empty($perkData['perk_id']) ? htmlspecialchars($perkData['perk_id']) : __('lbl_not_configured'); ?></span>
                                            <?php if ($isEdit): ?>
                                                <p class="component-card__description">
                                                    <span class="material-symbols-rounded">warning</span>
                                                    <?php echo __('warning_modify_perk_id'); ?>
                                                </p>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-id"><?php echo __('btn_edit'); ?></button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="perk-id-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('lbl_perk_backend_id'); ?></h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-perk-id" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($perkData['perk_id']); ?>" data-original-value="<?php echo htmlspecialchars($perkData['perk_id']); ?>" placeholder="e.g. pixel_missile_1">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-id"><?php echo __('btn_cancel'); ?></button>
                                                    <button type="button" class="component-button component-button--h34" data-action="applyInlineSetting" data-field="perk-id"><?php echo __('btn_save'); ?></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
                            
                            <!-- Precio en Monedas (price_coins) -->
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_perk_price'); ?></h2>
                                        <p class="component-card__description"><?php echo __('desc_perk_price'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="perkPrice" data-step="-500" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="perkPrice" data-step="-100" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_perkPrice" data-value="<?php echo (int)$perkData['price_coins']; ?>"><?php echo number_format((int)$perkData['price_coins']); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="perkPrice" data-step="100" data-max="999999"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="perkPrice" data-step="500" data-max="999999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Permitir Compra -->
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_allow_purchase'); ?></h2>
                                        <p class="component-card__description"><?php echo __('desc_allow_purchase_perk'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="toggle-perk-active" <?php echo !empty($perkData['is_active']) ? 'checked' : ''; ?>>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Permitir Uso -->
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('lbl_allow_usage'); ?></h2>
                                        <p class="component-card__description"><?php echo __('desc_allow_usage_perk'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="toggle-perk-usable" <?php echo (!isset($perkData['is_usable']) || !empty($perkData['is_usable'])) ? 'checked' : ''; ?>>
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
