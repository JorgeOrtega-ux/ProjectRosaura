<?php
// includes/views/settings/2fa.php
if (session_status() === PHP_SESSION_NONE) session_start();
$is2FAActive = !empty($_SESSION['user_2fa']);
$text2FA = $is2FAActive ? __('2fa_status_active') : __('2fa_status_inactive');
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('2fa_title'); ?></h1>
            <p class="component-page-description"><?php echo __('2fa_desc'); ?></p>
        </div>

        <?php if (!$is2FAActive): ?>
            
            <div id="2fa-setup-container" class="component-setup-container active">
                
                <div class="component-card--grouped component-accordion active">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">qr_code_scanner</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('2fa_step1_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('2fa_step1_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <div class="component-2fa-setup">
                                <div class="component-2fa-qr-col">
                                    <div id="2fa-qr-container">
                                        <div class="component-spinner"></div>
                                    </div>
                                </div>
                                
                                <div class="component-2fa-secret-col">
                                    <h3><?php echo __('2fa_cant_scan'); ?></h3>
                                    <p><?php echo __('2fa_enter_key'); ?></p>
                                    <div id="2fa-secret-text" class="component-2fa-secret-box"><?php echo __('loading_text'); ?></div>
                                </div>
                                
                                <div class="component-2fa-instructions-col">
                                    <h3><?php echo __('2fa_steps_title'); ?></h3>
                                    <ol>
                                        <li><?php echo __('2fa_step_download'); ?></li>
                                        <li><?php echo __('2fa_step_scan'); ?></li>
                                        <li><?php echo __('2fa_step_enter'); ?></li>
                                    </ol>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">verified_user</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('2fa_step2_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('2fa_step2_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="text" id="2fa_app_code" class="component-input-field" placeholder=" " maxlength="6">
                                    <label for="2fa_app_code" class="component-input-label"><?php echo __('lbl_app_code'); ?></label>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                                <button class="component-button component-button--h36 component-button--dark" data-action="submitActivate2FA"><?php echo __('btn_activate'); ?></button>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>

            <div class="component-card--grouped disabled" id="2fa-recovery-container">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">shield</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('2fa_activated_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('2fa_new_codes_desc'); ?></p>
                            <div id="2fa-recovery-codes-list">
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button class="component-button component-button--h36" data-action="copyRecoveryCodes"><?php echo __('btn_copy_codes'); ?></button>
                        <button class="component-button component-button--h36 component-button--dark" data-action="finish2FA"><?php echo __('btn_finish'); ?></button>
                    </div>
                </div>
            </div>

        <?php else: ?>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">key</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('2fa_recovery_title_card'); ?></h2>
                            <p class="component-card__description"><?php echo __('2fa_recovery_desc_card'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/2fa/recovery-codes"><?php echo __('btn_generate_codes'); ?></button>
                    </div>
                </div>
                
                <hr class="component-divider">

                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">verified_user</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('2fa_deactivate_title_card'); ?></h2>
                            <p class="component-card__description"><?php echo __('2fa_deactivate_desc_card'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 component-button--danger" data-nav="/ProjectRosaura/settings/2fa/deactivate"><?php echo __('btn_deactivate'); ?></button>
                    </div>
                </div>
            </div>

        <?php endif; ?>

    </div>
</div>