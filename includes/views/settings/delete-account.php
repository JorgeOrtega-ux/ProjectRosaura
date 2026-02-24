<?php
// includes/views/settings/delete-account.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('del_acc_title'); ?></h1>
            <p class="component-page-description"><?php echo __('del_acc_desc'); ?></p>
        </div>
        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded" style="color: #d32f2f;">warning</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title" style="color: #d32f2f;">Acción irreversible</h2>
                        <p class="component-card__description"><?php echo __('del_acc_warning'); ?></p>
                        
                        <div style="margin-top: 16px; padding: 12px; background: #fffaf9; border: 1px solid #d32f2f30; border-radius: 8px;">
                            <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                                <input type="checkbox" id="chk_confirm_delete" style="width: 18px; height: 18px; accent-color: #d32f2f;">
                                <span style="font-size: 14px; font-weight: 500; color: #d32f2f;"><?php echo __('lbl_confirm_delete'); ?></span>
                            </label>
                        </div>

                        <div id="delete_password_area" style="display: none; margin-top: 24px; width: 100%;">
                            <p class="component-card__description" style="margin-bottom: 12px;">Para confirmar, ingresa tu contraseña actual:</p>
                            <div class="component-input-group">
                                <input type="password" id="delete_account_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="delete_account_password" class="component-input-label"><?php echo __('lbl_password'); ?></label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>
                            <div class="component-card__actions component-card__actions--end" style="margin-top: 16px;">
                                <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                                <button class="component-button component-button--h36 component-button--danger" data-action="submitDeleteAccount"><?php echo __('btn_delete_account_final'); ?></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>