<?php
use App\Api\Services\Settings\SettingsViewService;

$settingsService = new SettingsViewService();
$securityData = $settingsService->getSecurityOverviewData();

$lastUpdateText = $securityData['lastUpdateText'];
$is2FAActive = $securityData['is2FAActive'];
$text2FA = $securityData['text2FA'];
$recoveryCodesRemaining = $securityData['recoveryCodesRemaining'] ?? 0;
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('sec_title'); ?></h1>
                <p class="component-page-description"><?php echo __('sec_desc'); ?></p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">lock</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('sec_password_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('sec_last_update'); ?> <?php echo htmlspecialchars($lastUpdateText); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36" data-action="promptChangePassword"><?php echo __('btn_change_password'); ?></button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item" data-ref="2fa_overview_item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">shield</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('sec_2fa_title'); ?></h2>
                            <p class="component-card__description" data-ref="2fa_status_desc"><?php echo $text2FA; ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 <?php echo $is2FAActive ? 'component-button--danger' : ''; ?>" data-ref="2fa_action_btn" data-action="<?php echo $is2FAActive ? 'openDisable2FAModal' : 'openSetup2FAModal'; ?>">
                            <?php echo $is2FAActive ? __('btn_deactivate') : __('btn_configure'); ?>
                        </button>
                    </div>
                </div>

                <hr class="component-divider <?php echo !$is2FAActive ? 'disabled' : ''; ?>" data-ref="2fa_recovery_divider">

                <div class="component-group-item <?php echo !$is2FAActive ? 'disabled' : ''; ?>" data-ref="2fa_recovery_item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">key</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('sec_recovery_codes_title'); ?></h2>
                            <p class="component-card__description" data-ref="2fa_recovery_codes_desc">
                                <?php echo __('sec_recovery_codes_desc_p1'); ?> <strong data-ref="2fa_remaining_count"><?php echo (int)$recoveryCodesRemaining; ?></strong> <?php echo __('sec_recovery_codes_desc_p2'); ?>
                            </p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36" data-action="openRegenerateRecoveryCodesModal">
                            <?php echo __('btn_generate_other_key'); ?>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">devices</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('sec_logout_all_devices_title', []); ?></h2>
                            <p class="component-card__description"><?php echo __('sec_logout_all_devices_desc', []); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 component-button--danger" data-action="logoutAllDevices"><?php echo __('btn_logout_all_devices', []); ?></button>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('sec_delete_account_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('sec_delete_account_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 component-button--danger" data-action="promptDeleteAccount"><?php echo __('btn_delete_account'); ?></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>