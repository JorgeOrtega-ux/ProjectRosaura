<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('billing_title'); ?></h1>
                <p class="component-page-description"><?php echo __('manage_billing_desc'); ?></p>
            </div>

            <div class="component-card--grouped active" data-ref="subscription-storage-area">
                <div class="component-group-item component-group-item--wrap" style="padding: 24px;">
                    <div class="component-card__content">
                        <div class="component-spinner"></div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('loading_subscription') ?: 'Cargando información de suscripción...'; ?></h2>
                            <p class="component-card__description"><?php echo __('please_wait') ?: 'Obteniendo datos de Stripe...'; ?></p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">credit_card</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('payment_methods_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('manage_billing_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--dark component-button--h36" data-action="addNewCard" data-tooltip="<?php echo __('tooltip_add_card'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">add</span>
                            <?php echo __('btn_add'); ?>
                        </button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stacked" data-ref="payment-methods-area">
                    <div class="component-group-item" style="padding: 20px; justify-content: center; align-items: center; gap: 10px;">
                        <div class="component-spinner"></div>
                        <span class="component-text-secondary" style="font-size: 0.85rem;"><?php echo __('loading_payment_methods') ?: 'Cargando métodos de pago...'; ?></span>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Preferencias de Compra</h2>
                            <p class="component-card__description">Elige cómo quieres confirmar tus compras.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <?php 
                            $activeAccountId = $_SESSION['active_account'] ?? null;
                            $account = ($activeAccountId && isset($_SESSION['accounts'][$activeAccountId])) ? $_SESSION['accounts'][$activeAccountId] : [];
                            $userPrefs = $account['user_prefs'] ?? [];
                            $purchasePref = $account['purchase_preference'] ?? ($userPrefs['purchase_preference'] ?? ($_SESSION['purchase_preference'] ?? 'verify'));
                            $prefText = $purchasePref === 'fast' ? 'Pago rápido (Automático)' : 'Pago con verificación';
                        ?>
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="modulePurchasePref">
                                <span class="material-symbols-rounded">security</span>
                                <span class="component-dropdown-text"><?php echo htmlspecialchars($prefText); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="modulePurchasePref">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link <?php echo $purchasePref === 'verify' ? 'active' : ''; ?>" data-action="setPref" data-key="purchase_preference" data-value="verify">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">security</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Pago con verificación</span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link <?php echo $purchasePref === 'fast' ? 'active' : ''; ?>" data-action="setPref" data-key="purchase_preference" data-value="fast">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">bolt</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Pago rápido (Automático)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div> <!-- end component-bottom -->

    </div>
</div>