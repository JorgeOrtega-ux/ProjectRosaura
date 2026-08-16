<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">

    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('billing_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40 disabled-interaction" data-action="addNewCard" data-tooltip="<?php echo __('tooltip_add_card'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">add</span>
                <span><?php echo __('btn_add_card'); ?></span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <!-- 1. Acordeón de Suscripción y Almacenamiento -->
                <div class="component-card--grouped component-accordion disabled-interaction" data-ref="subscription-storage-area">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">stars</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('subscription_details_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('subscription_details_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>

                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <!-- Plan Actual -->
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                        <span class="material-symbols-rounded">stars</span>
                                    </div>
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('current_plan'); ?></h2>
                                        <p class="component-card__description" data-ref="sub-plan-desc"><?php echo __('lbl_loading'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <button type="button" class="component-button component-button--h36" data-nav="/upgrade">
                                        <?php echo __('btn_change_plan'); ?>
                                    </button>
                                </div>
                            </div>

                            <!-- Estado de Suscripción / Cancelación -->
                            <div data-ref="sub-renewal-container" class="disabled">
                                <hr class="component-divider">
                                <div class="component-group-item">
                                    <div class="component-card__content">
                                        <div class="component-card__icon-container component-card__icon-container--bordered">
                                            <span class="material-symbols-rounded">event_repeat</span>
                                        </div>
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo __('subscription_status_title'); ?></h2>
                                            <p class="component-card__description" data-ref="sub-renewal-desc"><?php echo __('lbl_loading'); ?></p>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <button type="button" class="component-button component-button--h36" data-action="cancelOrReactivateSubscription" data-ref="sub-renewal-btn">
                                            <?php echo __('btn_cancel_sub'); ?>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Almacenamiento del Plan -->
                            <div class="component-group-item component-group-item--stacked">
                                <div>
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Almacenamiento del Plan</h2>
                                            <p class="component-card__description" data-ref="sub-storage-subtitle">Tu capacidad de almacenamiento · -- MB de -- MB utilizados (Quedan -- MB)</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-progress-track">
                                    <div class="component-progress-fill" data-ref="sub-storage-progress-fill"></div>
                                </div>
                            </div>

                            <hr class="component-divider disabled" data-ref="sub-tokens-divider">

                            <!-- Uso de Tokens de Inyección de Plantillas -->
                            <div class="component-group-item component-group-item--stacked disabled" data-ref="sub-tokens-container">
                                <div>
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Inyección de Plantillas (Tokens de 5 horas)</h2>
                                            <p class="component-card__description" data-ref="sub-tokens-subtitle">Uso de tokens · -- / -- Tokens consumidos</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-progress-track">
                                    <div class="component-progress-fill" data-ref="sub-tokens-progress-fill"></div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- 2. Acordeón Métodos de Pago -->
                <div class="component-card--grouped component-accordion disabled-interaction" data-ref="payment-methods-accordion">
                    <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
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
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>

                    <div class="component-accordion-body">
                        <div class="component-accordion-content" data-ref="payment-methods-area">
                            <div class="component-group-item">
                                <div class="component-spinner"></div>
                                <span><?php echo __('loading_payment_methods'); ?></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Preferencias de Compra -->
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
                                <div class="component-module component-module--dropdown disabled" data-module="modulePurchasePref">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited active" data-ref="menuMainPurchasePref">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
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
        </div> <!-- end component-wrapper -->
    </div> <!-- end component-viewport -->
</div>