<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$builderData = $adminService->getStorePackageBuilderData($_GET['uuid'] ?? null);

if (!empty($builderData['error'])) {
    echo "<div class='view-content'><p>".htmlspecialchars($builderData['error'])."</p></div>";
    return;
}

extract($builderData);

$pkgData = [
    'uuid' => '',
    'name' => '',
    'amount' => 1000,
    'price_usd' => 2.99,
    'description' => '',
    'bonus_text' => '',
    'icon' => 'monetization_on',
    'stripe_price_id' => '',
    'is_active' => 1
];

if ($isEdit && !empty($package)) {
    $pkgData = array_merge($pkgData, $package);
}

?>
<div class="view-content" data-ref="admin-store-package-wrapper" data-package-uuid="<?php echo htmlspecialchars($pkgData['uuid']); ?>" data-package-active="<?php echo (int)($pkgData['is_active']); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo $isEdit ? 'Editar Paquete' : 'Crear Paquete'; ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--dark component-button--h40" data-action="savePackage">
                <?php echo __('btn_save') ?: 'Guardar'; ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <!-- Detalles Accordion -->
                <div class="component-card--grouped component-accordion active">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">diamond</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Detalles del Paquete</h2>
                                <p class="component-card__description">Configura los datos básicos, precios, cantidades e identificadores de este paquete.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <!-- Nombre -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="pkg-name-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Nombre o Clave de Traducción</h2>
                                            <span class="component-display-value" data-ref="display-pkg-name"><?php echo htmlspecialchars($pkgData['name']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-name">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="pkg-name-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Nombre o Clave de Traducción</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-pkg-name" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($pkgData['name']); ?>" data-original-value="<?php echo htmlspecialchars($pkgData['name']); ?>" placeholder="Ej. store_coins_1000_name">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-name">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="pkg-name">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
                            
                            <!-- Cantidad (Amount) -->
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Monedas Obtenidas</h2>
                                        <p class="component-card__description">Define la cantidad de monedas que otorga el paquete.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgAmount" data-step="-500" data-min="1"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgAmount" data-step="-100" data-min="1"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_pkgAmount" data-value="<?php echo (int)$pkgData['amount']; ?>"><?php echo number_format((int)$pkgData['amount']); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgAmount" data-step="100" data-max="9999999"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgAmount" data-step="500" data-max="9999999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">
                            
                            <!-- Precio (Price USD) -->
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Precio (USD)</h2>
                                        <p class="component-card__description">El costo del paquete de monedas en USD.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-inline-control component-inline-control--fixed">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgPrice" data-step="-5" data-min="0" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgPrice" data-step="-1" data-min="0" data-decimal="true"><span class="material-symbols-rounded">chevron_left</span></button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="val_pkgPrice" data-value="<?php echo (float)$pkgData['price_usd']; ?>"><?php echo number_format((float)$pkgData['price_usd'], 2); ?></div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgPrice" data-step="1" data-max="9999" data-decimal="true"><span class="material-symbols-rounded">chevron_right</span></button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="pkgPrice" data-step="5" data-max="9999" data-decimal="true"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">

                            <!-- Descripción -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="pkg-desc-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Descripción</h2>
                                            <span class="component-display-value" data-ref="display-pkg-desc"><?php echo htmlspecialchars($pkgData['description']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-desc">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="pkg-desc-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Descripción</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-pkg-desc" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($pkgData['description']); ?>" data-original-value="<?php echo htmlspecialchars($pkgData['description']); ?>" placeholder="Ej. store_coins_1000_desc">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-desc">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="pkg-desc">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Texto de Bonus -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="pkg-bonus-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Texto de Bonus</h2>
                                            <span class="component-display-value" data-ref="display-pkg-bonus"><?php echo htmlspecialchars($pkgData['bonus_text']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-bonus">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="pkg-bonus-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Texto de Bonus</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-pkg-bonus" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($pkgData['bonus_text']); ?>" data-original-value="<?php echo htmlspecialchars($pkgData['bonus_text']); ?>" placeholder="Ej. +25% Gratis">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-bonus">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="pkg-bonus">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Stripe Price ID -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="pkg-stripe-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID</h2>
                                            <span class="component-display-value" data-ref="display-pkg-stripe"><?php echo htmlspecialchars($pkgData['stripe_price_id']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-stripe">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="pkg-stripe-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Stripe Price ID</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-pkg-stripe" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($pkgData['stripe_price_id']); ?>" data-original-value="<?php echo htmlspecialchars($pkgData['stripe_price_id']); ?>" placeholder="Ej. price_1...">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-stripe">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="pkg-stripe">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="component-divider">

                            <!-- Ícono -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="pkg-icon-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Ícono (Material Symbols)</h2>
                                            <span class="component-display-value" data-ref="display-pkg-icon"><?php echo htmlspecialchars($pkgData['icon']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-icon">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="pkg-icon-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Ícono (Material Symbols)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-pkg-icon" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($pkgData['icon']); ?>" data-original-value="<?php echo htmlspecialchars($pkgData['icon']); ?>" placeholder="Ej. monetization_on, diamond">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="pkg-icon">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="pkg-icon">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>


            </div>
        </div>
    </div>
</div>
