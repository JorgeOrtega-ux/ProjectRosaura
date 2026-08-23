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
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('sub_plan_storage'); ?></h2>
                                        <p class="component-card__description" data-ref="sub-storage-subtitle">Tu capacidad de almacenamiento · -- MB de -- MB utilizados (Quedan -- MB)</p>
                                    </div>
                                </div>

                                <div class="component-progress-track">
                                    <div class="component-progress-fill" data-ref="sub-storage-progress-fill"></div>
                                </div>
                            </div>

                            <hr class="component-divider disabled" data-ref="sub-tokens-divider">

                            <!-- Uso de Tokens de Inyección de Plantillas -->
                            <div class="component-group-item component-group-item--stacked disabled" data-ref="sub-tokens-container">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('sub_template_tokens_title'); ?></h2>
                                        <p class="component-card__description" data-ref="sub-tokens-subtitle">Uso de tokens · -- / -- Tokens consumidos</p>
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


            </div> <!-- end component-bottom -->
        </div> <!-- end component-wrapper -->
    </div> <!-- end component-viewport -->
</div>