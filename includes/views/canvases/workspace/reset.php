<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$resetData = $canvasService->getWorkspaceResetData($_GET['uuid'] ?? null);

if (empty($resetData['canvasId'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($resetData);
$isResetActive = $resetSettings['is_active'];
?>

<div class="view-content" data-ref="canvas-resets-wrapper" data-canvas-id="<?php echo $canvasId; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <div>
                <h1 class="component-top-title"><?php echo __('canvas_resets_title'); ?></h1>
            </div>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--primary component-button--h40" data-action="saveSettings">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('canvas_resets_title'); ?></h1>
                <p class="component-page-description"><?php echo __('canvas_resets_desc'); ?></p>
            </div>

            <!-- ACCORDION 1: INSTANT RESET -->
            <div class="component-card--grouped component-accordion active">
                <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">delete_forever</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_reset_now_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_reset_now_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">



                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_reset_captura_title'); ?></h2>
                                    <p class="component-card__description"><?= __('take_photo_before_reset') ?></p>
                                    <?php if (!$canTakeSnapshot): ?>
                                        <p class="component-card__description"><b><?php echo __('captura_limit_reached', ['current' => $currentSnapshots, 'max' => $maxSnapshots]); ?></b> <?php echo __('captura_upgrade_plan'); ?></p>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="take_snapshot_now" <?php echo $canTakeSnapshot ? 'checked' : 'disabled'; ?>>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_reset_now_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('canvas_reset_now_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <button type="button" class="component-button component-button--danger component-button--h40" data-action="resetNow">
                                    <span class="material-symbols-rounded">delete_forever</span>
                                    <?php echo __('btn_reset_now'); ?>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ACCORDION 2: PROGRAMMED RESET -->
            <div class="component-card--grouped component-accordion">
                <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">schedule</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('canvas_reset_active_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('canvas_reset_active_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                    </div>
                </div>
                <div class="component-accordion-body">
                    <div class="component-accordion-content">

                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('canvas_reset_active_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('canvas_reset_active_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="reset_is_active" data-action="toggleActive" <?php echo $isResetActive ? 'checked' : ''; ?>>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div data-ref="reset_options_container" class="<?php echo $isResetActive ? '' : 'disabled-interaction'; ?>">
                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_reset_date_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_reset_date_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="openCalendarModal" data-target="moduleCalendarDate">
                                            <span class="material-symbols-rounded">calendar_month</span>
                                            <span class="component-dropdown-text" data-ref="reset-date-text"><?php echo htmlspecialchars($resetDateDisplay); ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        
                                        <input type="hidden" data-ref="next_reset_at" value="<?php echo htmlspecialchars($resetDateLocal); ?>">
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('canvas_reset_captura_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('canvas_reset_captura_desc'); ?></p>
                                        <?php if (!$canTakeSnapshot): ?>
                                            <p class="component-card__description"><b><?php echo __('captura_limit_reached', ['current' => $currentSnapshots, 'max' => $maxSnapshots]); ?></b> <?php echo __('captura_upgrade_plan'); ?></p>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="take_snapshot" <?php echo $resetSettings['take_snapshot'] && $canTakeSnapshot ? 'checked' : ''; ?> <?php echo !$canTakeSnapshot ? 'disabled' : ''; ?>>
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
