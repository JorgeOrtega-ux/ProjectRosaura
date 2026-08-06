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
    'name' => '',
    'price_coins' => 1000,
    'description' => '',
    'icon' => 'shield',
    'is_single_use' => 1,
    'is_active' => 1
];

if ($isEdit && !empty($perk)) {
    $perkData = array_merge($perkData, $perk);
}
?>
<div class="view-content" data-ref="admin-store-perk-wrapper" data-perk-uuid="<?php echo htmlspecialchars($perkData['uuid']); ?>" data-perk-active="<?php echo (int)($perkData['is_active']); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo $isEdit ? 'Editar Ventaja' : 'Crear Ventaja'; ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--dark component-button--h40" data-action="savePerk">
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
                                <span class="material-symbols-rounded">auto_awesome</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Detalles de la Ventaja</h2>
                                <p class="component-card__description">Configura el ID de backend, precio, claves de traducción e íconos.</p>
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
                                            <h2 class="component-card__title">Identificador de Backend (Perk ID)</h2>
                                            <span class="component-display-value" data-ref="display-perk-id"><?php echo htmlspecialchars($perkData['perk_id']) ?: 'Sin configurar'; ?></span>
                                            <?php if ($isEdit): ?>
                                                <p class="component-card__description" style="color: var(--color-danger); margin-top: 4px; font-size: 11px;">
                                                    <span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle;">warning</span>
                                                    ¡Modificar esto romperá el enlace con las ventajas programadas en el servidor WebSocket!
                                                </p>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-id">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="perk-id-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Identificador de Backend (Perk ID)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-perk-id" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($perkData['perk_id']); ?>" data-original-value="<?php echo htmlspecialchars($perkData['perk_id']); ?>" placeholder="Ej. proteccion_pixeles_1">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-id">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="perk-id">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">

                            <!-- Nombre -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="perk-name-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Nombre o Clave de Traducción</h2>
                                            <span class="component-display-value" data-ref="display-perk-name"><?php echo htmlspecialchars($perkData['name']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-name">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="perk-name-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Nombre o Clave de Traducción</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-perk-name" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($perkData['name']); ?>" data-original-value="<?php echo htmlspecialchars($perkData['name']); ?>" placeholder="Ej. store_content_proteccion_pixeles_1_name">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-name">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="perk-name">Guardar</button>
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
                                        <h2 class="component-card__title">Precio (Monedas)</h2>
                                        <p class="component-card__description">El costo en monedas para comprar esta ventaja.</p>
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
                            
                            <!-- Descripción -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="perk-desc-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Descripción o Clave de Traducción</h2>
                                            <span class="component-display-value" data-ref="display-perk-desc"><?php echo htmlspecialchars($perkData['description']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-desc">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="perk-desc-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Descripción o Clave de Traducción</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-perk-desc" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($perkData['description']); ?>" data-original-value="<?php echo htmlspecialchars($perkData['description']); ?>" placeholder="Ej. store_content_proteccion_pixeles_1_desc">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-desc">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="perk-desc">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr class="component-divider">

                            <!-- Ícono -->
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="perk-icon-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Ícono (Material Symbols)</h2>
                                            <span class="component-display-value" data-ref="display-perk-icon"><?php echo htmlspecialchars($perkData['icon']) ?: 'Sin configurar'; ?></span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-icon">Editar</button>
                                    </div>
                                </div>
                                <div class="disabled component-state-box" data-state="perk-icon-edit">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Ícono (Material Symbols)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-perk-icon" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($perkData['icon']); ?>" data-original-value="<?php echo htmlspecialchars($perkData['icon']); ?>" placeholder="Ej. shield, rocket_launch, bomb">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="perk-icon">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="applyInlineSetting" data-field="perk-icon">Guardar</button>
                                                </div>
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
                                <p class="component-card__description">Controla la visibilidad de la ventaja en la tienda.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">

                            <!-- Activa (Visibilidad) -->
                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Ventaja Activa</h2>
                                        <p class="component-card__description">Determina si los usuarios pueden comprar esta ventaja en la tienda.</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="toggle-active" <?php echo $perkData['is_active'] ? 'checked' : ''; ?>>
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
