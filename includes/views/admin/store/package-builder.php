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
    'amount' => 0,
    'price_usd' => 0.00,
    'description' => '',
    'bonus_text' => '',
    'icon' => 'monetization_on',
    'icon_color' => '',
    'border_color' => '',
    'badge_color' => '',
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
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">diamond</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Detalles del Paquete</h2>
                                <p class="component-card__description">Configura los datos básicos e identificadores de este paquete.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <!-- State Box Name -->
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
                            
                            <!-- Amount & Price (Simple grouped inputs without statebox for brevity, matching some other parts) -->
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Precios y Cantidad</h2>
                                        <p class="component-card__description">Define la cantidad de monedas y el precio en USD.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start mt-15">
                                    <div class="component-form-row col-2">
                                        <div class="component-input-group">
                                            <label class="component-label">Monedas Obtenidas</label>
                                            <input type="number" data-ref="input-pkg-amount" class="component-input-field" value="<?php echo (int)$pkgData['amount']; ?>" min="1">
                                        </div>
                                        <div class="component-input-group">
                                            <label class="component-label">Precio (USD)</label>
                                            <input type="number" step="0.01" data-ref="input-pkg-price" class="component-input-field" value="<?php echo (float)$pkgData['price_usd']; ?>" min="0">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <hr class="component-divider">

                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Textos Descriptivos</h2>
                                        <p class="component-card__description">Descripciones opcionales y texto para mostrar etiquetas extra (como '+25%').</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start mt-15">
                                    <div class="component-form-row col-2">
                                        <div class="component-input-group">
                                            <label class="component-label">Descripción</label>
                                            <input type="text" data-ref="input-pkg-description" class="component-input-field" value="<?php echo htmlspecialchars($pkgData['description']); ?>" placeholder="Ej. store_coins_1000_desc">
                                        </div>
                                        <div class="component-input-group">
                                            <label class="component-label">Texto de Bonus</label>
                                            <input type="text" data-ref="input-pkg-bonus" class="component-input-field" value="<?php echo htmlspecialchars($pkgData['bonus_text']); ?>" placeholder="Ej. +25% Gratis">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">
                            
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Integración con Pasarela de Pago</h2>
                                        <p class="component-card__description">ID de Stripe asociado al paquete.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start mt-15">
                                    <div class="component-input-group">
                                        <label class="component-label">Stripe Price ID</label>
                                        <input type="text" data-ref="input-pkg-stripe" class="component-input-field" value="<?php echo htmlspecialchars($pkgData['stripe_price_id']); ?>" placeholder="price_1...">
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Estilo y Diseño Accordion -->
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Estilo y Diseño</h2>
                                <p class="component-card__description">Modifica el aspecto visual del paquete en la tienda.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__actions component-card__actions--start mt-15">
                                    <div class="component-form-row col-3">
                                        <div class="component-input-group">
                                            <label class="component-label">Ícono (Material Symbols)</label>
                                            <input type="text" data-ref="input-pkg-icon" class="component-input-field" value="<?php echo htmlspecialchars($pkgData['icon']); ?>" placeholder="Ej. monetization_on">
                                        </div>
                                        <div class="component-input-group">
                                            <label class="component-label">Color del Ícono (Hex)</label>
                                            <div class="component-input-field-wrap">
                                                <div class="component-color-swatch component-color-swatch--sm" style="background-color: <?php echo htmlspecialchars($pkgData['icon_color']); ?>" data-ref="swatch-pkg-icon"></div>
                                                <input type="text" data-ref="input-pkg-icon-color" class="component-input-field component-input-field--mono" value="<?php echo htmlspecialchars($pkgData['icon_color']); ?>" placeholder="#000000">
                                            </div>
                                        </div>
                                        <div class="component-input-group">
                                            <label class="component-label">Color del Borde (Hex)</label>
                                            <div class="component-input-field-wrap">
                                                <div class="component-color-swatch component-color-swatch--sm" style="background-color: <?php echo htmlspecialchars($pkgData['border_color']); ?>" data-ref="swatch-pkg-border"></div>
                                                <input type="text" data-ref="input-pkg-border-color" class="component-input-field component-input-field--mono" value="<?php echo htmlspecialchars($pkgData['border_color']); ?>" placeholder="#000000">
                                            </div>
                                        </div>
                                        <div class="component-input-group">
                                            <label class="component-label">Color del Badge (Bonus) (Hex)</label>
                                            <div class="component-input-field-wrap">
                                                <div class="component-color-swatch component-color-swatch--sm" style="background-color: <?php echo htmlspecialchars($pkgData['badge_color']); ?>" data-ref="swatch-pkg-badge"></div>
                                                <input type="text" data-ref="input-pkg-badge-color" class="component-input-field component-input-field--mono" value="<?php echo htmlspecialchars($pkgData['badge_color']); ?>" placeholder="#000000">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Visibilidad Accordion -->
                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">visibility</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Visibilidad</h2>
                                <p class="component-card__description">Controla si el paquete se mostrará en la tienda.</p>
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
                                        <h2 class="component-card__title">Paquete Activo</h2>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <div class="component-toggle <?php echo $pkgData['is_active'] ? 'active' : ''; ?>" data-ref="toggle-active">
                                        <div class="component-toggle__knob"></div>
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
