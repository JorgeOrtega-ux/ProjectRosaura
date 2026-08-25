<?php

use App\Core\System\SubscriptionPlanConstants;
$userTier = (int) ($userTier ?? $_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? 0);
$hasLiveSync = SubscriptionPlanConstants::hasFeature($userTier, 'live_templates');
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">palette</span>
                <span class="component-menu-header-title"><?php echo __('dt_select_color'); ?></span>
            </div>
        </div>

        <div class="component-menu-section-parent disabled" data-ref="custom-colors-section">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">palette</span>
                    <span class="component-menu-header-title"><?php echo __('dt_custom_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-section-body">
                <div class="component-items-grid" data-ref="custom-colors-tools-container">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit component-dropdown-wrapper--grid-item" data-ref="custom-color-dropdown-wrapper">
                        <button type="button" class="component-color-btn component-color-btn--rainbow" data-action="toggleModule" data-target="moduleCustomColorPicker" data-tooltip="<?php echo __('dt_add_custom_color'); ?>" data-position="right-start">
                            <div class="component-color-btn--rainbow-inner">
                                <span class="material-symbols-rounded">add</span>
                            </div>
                        </button>
                        
                        <div class="component-module component-module--dropdown disabled" data-module="moduleCustomColorPicker" data-ref="custom-color-picker-module">
                            <div class="component-menu component-menu--w220 component-menu--h-auto component-menu--padding-md">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="material-symbols-rounded">colorize</span>
                                        <span class="component-menu-header-title"><?php echo __('dt_custom_color_picker'); ?></span>
                                    </div>
                                </div>
                                <div class="component-color-picker" data-ref="customColorPicker" data-h="0" data-s="100" data-v="100">
                                    <div class="component-color-picker__sv-area" data-action="dragCustomSV">
                                        <div class="component-color-picker__sv-bg"></div>
                                        <div class="component-color-picker__sv-thumb" data-ref="customSvThumb"></div>
                                    </div>
                                    <div class="component-color-picker__hue-area" data-action="dragCustomHue">
                                        <div class="component-color-picker__hue-thumb" data-ref="customHueThumb"></div>
                                    </div>
                                    <div class="component-input-group component-input-group--h34 component-input-group--color">
                                        <div class="component-color-swatch component-color-swatch--sm" data-ref="customHexInputPreview"></div>
                                        <input type="text" id="custom-hex-input" name="custom-hex-input" class="component-input-field component-input-field--mono" data-ref="customHexInput" value="#FF0000" maxlength="7" placeholder="#000000">
                                    </div>
                                    <button type="button" class="component-button component-button--primary component-button--full component-button--h34" data-action="applyCustomColor">
                                        <span class="material-symbols-rounded">check</span>
                                        <?php echo __('btn_select'); ?>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="component-color-btn component-color-btn--eyedropper" data-action="toggleEyedropper" data-tooltip="<?php echo __('dt_eyedropper'); ?>">
                        <span class="material-symbols-rounded">colorize</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-menu-section-parent disabled" data-ref="recent-colors-section">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">history</span>
                    <span class="component-menu-header-title"><?php echo __('dt_recent_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-section-body">
                <div class="component-items-grid" data-ref="recent-colors-container"></div>
            </div>
        </div>

        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">color_lens</span>
                    <span class="component-menu-header-title"><?php echo __('dt_default_colors'); ?></span>
                </div>
            </div>
            
            <div class="component-menu-section-body">
               <div class="component-items-grid" data-ref="color-palette-grid">
                    <div class="component-loader-center component-loader-center--compact">
                        <div class="component-empty-state-content">
                            <span class="material-symbols-rounded icon-spin-slow">palette</span><br>
                            <?php echo __('dt_loading'); ?>
                        </div>
                    </div>
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border" data-ref="module-promo-bottom-colors"></div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-templates">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">photo_library</span>
                <span class="component-menu-header-title"><?php echo __('dt_templates'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--bordered">
            <div class="component-menu-section-header">
                <div class="component-template-upload-section">
                    <input type="file" id="template-file-input" name="template-file-input" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
                    <button class="component-button component-button--primary component-button--full component-button--h40" data-action="triggerTemplateUpload">
                        <span class="material-symbols-rounded">cloud_upload</span>
                        <?php echo __('dt_upload_library'); ?>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">collections_bookmark</span>
                    <span class="component-menu-header-title"><?php echo __('dt_my_library'); ?> (<span data-ref="template-count">0</span>)</span>
                </div>
            </div>
            <div class="component-menu-section-body">
                <div class="component-items-grid component-items-grid--5" data-ref="user-templates-grid">
                </div>
                <div class="component-empty-state disabled" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border" data-ref="module-promo-bottom-templates"></div>
    </div>

    <?php
    $presetStickers = [
        // 1. RPG & Fantasía
        ['id' => 'sticker_sword', 'name' => 'Espada de Héroe', 'category' => 'rpg', 'file' => 'sword.svg'],
        ['id' => 'sticker_shield', 'name' => 'Escudo Real', 'category' => 'rpg', 'file' => 'shield.svg'],
        ['id' => 'sticker_axe', 'name' => 'Hacha de Batalla', 'category' => 'rpg', 'file' => 'axe.svg'],
        ['id' => 'sticker_potion_red', 'name' => 'Poción de Vida', 'category' => 'rpg', 'file' => 'potion_red.svg'],
        ['id' => 'sticker_potion_blue', 'name' => 'Poción de Maná', 'category' => 'rpg', 'file' => 'potion_blue.svg'],
        ['id' => 'sticker_chest', 'name' => 'Cofre del Tesoro', 'category' => 'rpg', 'file' => 'chest.svg'],

        // 2. Objetos & Tesoros
        ['id' => 'sticker_coin', 'name' => 'Moneda de Oro', 'category' => 'treasures', 'file' => 'coin.svg'],
        ['id' => 'sticker_gem', 'name' => 'Gema Brillante', 'category' => 'treasures', 'file' => 'gem.svg'],
        ['id' => 'sticker_crown', 'name' => 'Corona Imperial', 'category' => 'treasures', 'file' => 'crown.svg'],
        ['id' => 'sticker_key', 'name' => 'Llave Antigua', 'category' => 'treasures', 'file' => 'key.svg'],
        ['id' => 'sticker_star', 'name' => 'Estrella Dorada', 'category' => 'treasures', 'file' => 'star.svg'],
        ['id' => 'sticker_trophy', 'name' => 'Trofeo de Campeón', 'category' => 'treasures', 'file' => 'trophy.svg'],

        // 3. Símbolos & Emociones
        ['id' => 'sticker_heart', 'name' => 'Corazón', 'category' => 'symbols', 'file' => 'heart.svg'],
        ['id' => 'sticker_heart_broken', 'name' => 'Corazón Roto', 'category' => 'symbols', 'file' => 'heart_broken.svg'],
        ['id' => 'sticker_skull', 'name' => 'Calavera', 'category' => 'symbols', 'file' => 'skull.svg'],
        ['id' => 'sticker_smiley', 'name' => 'Carita Feliz', 'category' => 'symbols', 'file' => 'smiley.svg'],
        ['id' => 'sticker_fire', 'name' => 'Llama de Fuego', 'category' => 'symbols', 'file' => 'fire.svg'],
        ['id' => 'sticker_lightning', 'name' => 'Rayo Eléctrico', 'category' => 'symbols', 'file' => 'lightning.svg'],

        // 4. Naturaleza & Escenarios
        ['id' => 'sticker_tree', 'name' => 'Árbol Pino', 'category' => 'nature', 'file' => 'tree.svg'],
        ['id' => 'sticker_flower', 'name' => 'Flor Rosa', 'category' => 'nature', 'file' => 'flower.svg'],
        ['id' => 'sticker_mushroom', 'name' => 'Hongo Rojo', 'category' => 'nature', 'file' => 'mushroom.svg'],
        ['id' => 'sticker_house', 'name' => 'Casita', 'category' => 'nature', 'file' => 'house.svg'],
        ['id' => 'sticker_sun', 'name' => 'Sol Radiante', 'category' => 'nature', 'file' => 'sun.svg'],
        ['id' => 'sticker_moon', 'name' => 'Luna Creciente', 'category' => 'nature', 'file' => 'moon.svg'],

        // 5. Arcade & Gaming
        ['id' => 'sticker_ghost', 'name' => 'Fantasma Arcade', 'category' => 'arcade', 'file' => 'ghost.svg'],
        ['id' => 'sticker_alien', 'name' => 'Invasor Espacial', 'category' => 'arcade', 'file' => 'alien.svg'],
        ['id' => 'sticker_gamepad', 'name' => 'Control Retro', 'category' => 'arcade', 'file' => 'gamepad.svg'],
        ['id' => 'sticker_bomb', 'name' => 'Bomba', 'category' => 'arcade', 'file' => 'bomb.svg'],
        ['id' => 'sticker_apple', 'name' => 'Manzana Pixel', 'category' => 'arcade', 'file' => 'apple.svg'],
        ['id' => 'sticker_cat', 'name' => 'Gatito Pixel', 'category' => 'arcade', 'file' => 'cat.svg']
    ];
    ?>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-stickers">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">category</span>
                <span class="component-menu-header-title"><?php echo __('dt_stickers'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">interests</span>
                    <span class="component-menu-header-title">Colección de Figuras (<span data-ref="stickers-count"><?php echo count($presetStickers); ?></span>)</span>
                </div>
            </div>
            <div class="component-menu-section-body">
                <div class="component-items-grid component-items-grid--5 active" data-ref="stickers-grid">
                    <?php foreach ($presetStickers as $stk): ?>
                    <div class="component-library-card" 
                         data-action="addStickerToCanvas" 
                         data-sticker-id="<?php echo htmlspecialchars($stk['id']); ?>" 
                         data-sticker-category="<?php echo htmlspecialchars($stk['category']); ?>"
                         data-tooltip="<?php echo htmlspecialchars($stk['name']); ?>" 
                         data-position="top">
                        <img class="component-library-card__image image-loaded" 
                             src="<?php echo ($basePath ?? '') . '/assets/img/stickers/' . htmlspecialchars($stk['file']); ?>" 
                             alt="<?php echo htmlspecialchars($stk['name']); ?>"
                             loading="lazy" />
                    </div>
                    <?php endforeach; ?>
                </div>
                <div class="component-empty-state disabled" data-ref="stickers-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">error</span>
                    <p class="component-empty-state-text"><?php echo __('dt_generic_message'); ?></p>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border" data-ref="module-promo-bottom-stickers"></div>
    </div>

    <?php
    $shapeCategories = [
        'basic' => [
            'title' => 'Formas básicas',
            'icon' => 'category',
            'shapes' => [
                ['id' => 'square', 'name' => 'Cuadrado', 'file' => 'square.svg'],
                ['id' => 'rounded_rectangle', 'name' => 'Rectángulo redondeado', 'file' => 'rounded_rectangle.svg'],
                ['id' => 'circle', 'name' => 'Círculo', 'file' => 'circle.svg'],
                ['id' => 'triangle_up', 'name' => 'Triángulo', 'file' => 'triangle_up.svg'],
                ['id' => 'triangle_down', 'name' => 'Triángulo invertido', 'file' => 'triangle_down.svg'],
                ['id' => 'diamond', 'name' => 'Rombo', 'file' => 'diamond.svg'],
                ['id' => 'cross', 'name' => 'Cruz', 'file' => 'cross.svg'],
                ['id' => 'barrel', 'name' => 'Placa convexa', 'file' => 'barrel.svg'],
                ['id' => 'ticket', 'name' => 'Boleto', 'file' => 'ticket.svg'],
                ['id' => 'parallelogram_right', 'name' => 'Paralelogramo derecho', 'file' => 'parallelogram_right.svg'],
                ['id' => 'parallelogram_left', 'name' => 'Paralelogramo izquierdo', 'file' => 'parallelogram_left.svg'],
                ['id' => 'trapezoid_up', 'name' => 'Trapecio', 'file' => 'trapezoid_up.svg'],
                ['id' => 'trapezoid_down', 'name' => 'Trapecio invertido', 'file' => 'trapezoid_down.svg'],
                ['id' => 'shield_u', 'name' => 'Escudo en U', 'file' => 'shield_u.svg'],
                ['id' => 'arch', 'name' => 'Arco', 'file' => 'arch.svg'],
                ['id' => 'triangle_right_angle', 'name' => 'Triángulo rectángulo', 'file' => 'triangle_right_angle.svg'],
                ['id' => 'semi_circle', 'name' => 'Semicírculo', 'file' => 'semi_circle.svg'],
                ['id' => 'quarter_circle', 'name' => 'Cuarto de círculo', 'file' => 'quarter_circle.svg'],
                ['id' => 'quadrant_ring', 'name' => 'Franja curva', 'file' => 'quadrant_ring.svg'],
                ['id' => 'semi_ring', 'name' => 'Arco de semianillo', 'file' => 'semi_ring.svg']
            ]
        ],
        'polygons' => [
            'title' => 'Polígonos',
            'icon' => 'hexagon',
            'shapes' => [
                ['id' => 'pentagon', 'name' => 'Pentágono', 'file' => 'pentagon.svg'],
                ['id' => 'hexagon_pointy', 'name' => 'Hexágono en punta', 'file' => 'hexagon_pointy.svg'],
                ['id' => 'hexagon_flat', 'name' => 'Hexágono plano', 'file' => 'hexagon_flat.svg'],
                ['id' => 'octagon', 'name' => 'Octógono', 'file' => 'octagon.svg'],
                ['id' => 'chamfer_square', 'name' => 'Cuadrado biselado', 'file' => 'chamfer_square.svg'],
                ['id' => 'heptagon', 'name' => 'Heptágono', 'file' => 'heptagon.svg'],
                ['id' => 'decagon', 'name' => 'Decágono', 'file' => 'decagon.svg']
            ]
        ],
        'stars' => [
            'title' => 'Estrellas',
            'icon' => 'star',
            'shapes' => [
                ['id' => 'star_4_sparkle', 'name' => 'Destello de 4 puntas', 'file' => 'star_4_sparkle.svg'],
                ['id' => 'star_5', 'name' => 'Estrella de 5 puntas', 'file' => 'star_5.svg'],
                ['id' => 'star_6', 'name' => 'Estrella de 6 puntas', 'file' => 'star_6.svg'],
                ['id' => 'star_8', 'name' => 'Estrella de 8 puntas', 'file' => 'star_8.svg'],
                ['id' => 'burst_10', 'name' => 'Sello de 10 puntas', 'file' => 'burst_10.svg'],
                ['id' => 'burst_12', 'name' => 'Sello de 12 puntas', 'file' => 'burst_12.svg'],
                ['id' => 'burst_16', 'name' => 'Medalla de 16 puntas', 'file' => 'burst_16.svg'],
                ['id' => 'burst_20', 'name' => 'Insignia de 20 puntas', 'file' => 'burst_20.svg'],
                ['id' => 'burst_24', 'name' => 'Insignia de 24 puntas', 'file' => 'burst_24.svg'],
                ['id' => 'star_7', 'name' => 'Estrella de 7 puntas', 'file' => 'star_7.svg'],
                ['id' => 'sparkle_8', 'name' => 'Destello solar de 8 rayos', 'file' => 'sparkle_8.svg'],
                ['id' => 'sparkle_12', 'name' => 'Destello solar de 12 rayos', 'file' => 'sparkle_12.svg'],
                ['id' => 'sunburst_16', 'name' => 'Destello solar de 16 rayos', 'file' => 'sunburst_16.svg'],
                ['id' => 'seal_scallop_32', 'name' => 'Rosetón de 32 puntas', 'file' => 'seal_scallop_32.svg']
            ]
        ],
        'arrows' => [
            'title' => 'Flechas',
            'icon' => 'arrow_forward',
            'shapes' => [
                ['id' => 'arrow_right', 'name' => 'Flecha derecha', 'file' => 'arrow_right.svg'],
                ['id' => 'arrow_left', 'name' => 'Flecha izquierda', 'file' => 'arrow_left.svg'],
                ['id' => 'arrow_up', 'name' => 'Flecha arriba', 'file' => 'arrow_up.svg'],
                ['id' => 'arrow_down', 'name' => 'Flecha abajo', 'file' => 'arrow_down.svg'],
                ['id' => 'arrow_double_horizontal', 'name' => 'Flecha horizontal doble', 'file' => 'arrow_double_horizontal.svg'],
                ['id' => 'arrow_double_vertical', 'name' => 'Flecha vertical doble', 'file' => 'arrow_double_vertical.svg'],
                ['id' => 'arrow_ribbon', 'name' => 'Pentaflecha', 'file' => 'arrow_ribbon.svg'],
                ['id' => 'chevron_right', 'name' => 'Galón derecho', 'file' => 'chevron_right.svg'],
                ['id' => 'arrow_pointed_left', 'name' => 'Flecha afilada izquierda', 'file' => 'arrow_pointed_left.svg'],
                ['id' => 'arrow_pointed_double', 'name' => 'Flecha afilada doble', 'file' => 'arrow_pointed_double.svg']
            ]
        ],
        'flowchart' => [
            'title' => 'Diagramas de flujo',
            'icon' => 'schema',
            'shapes' => [
                ['id' => 'flow_preparation', 'name' => 'Hexágono de preparación', 'file' => 'flow_preparation.svg'],
                ['id' => 'flow_terminator', 'name' => 'Píldora / Terminal', 'file' => 'flow_terminator.svg'],
                ['id' => 'flow_process', 'name' => 'Proceso', 'file' => 'flow_process.svg'],
                ['id' => 'flow_decision', 'name' => 'Decisión', 'file' => 'flow_decision.svg'],
                ['id' => 'flow_document', 'name' => 'Documento ondulado', 'file' => 'flow_document.svg'],
                ['id' => 'flow_data', 'name' => 'Datos / Entrada', 'file' => 'flow_data.svg'],
                ['id' => 'flow_manual', 'name' => 'Operación manual', 'file' => 'flow_manual.svg'],
                ['id' => 'flow_delay', 'name' => 'Retardo / Bala', 'file' => 'flow_delay.svg'],
                ['id' => 'flow_merge', 'name' => 'Fusión / Almacén', 'file' => 'flow_merge.svg'],
                ['id' => 'flow_offpage', 'name' => 'Conector fuera de página', 'file' => 'flow_offpage.svg'],
                ['id' => 'flow_shield', 'name' => 'Conector de página', 'file' => 'flow_shield.svg']
            ]
        ],
        'callouts' => [
            'title' => 'Globos de diálogo',
            'icon' => 'chat_bubble',
            'shapes' => [
                ['id' => 'callout_rectangular', 'name' => 'Bocadillo rectangular', 'file' => 'callout_rectangular.svg'],
                ['id' => 'callout_oval', 'name' => 'Bocadillo ovalado', 'file' => 'callout_oval.svg'],
                ['id' => 'callout_cloud', 'name' => 'Nube de pensamiento', 'file' => 'callout_cloud.svg'],
                ['id' => 'callout_rounded_rect', 'name' => 'Bocadillo redondeado', 'file' => 'callout_rounded_rect.svg'],
                ['id' => 'callout_curved_tail', 'name' => 'Burbuja cómic', 'file' => 'callout_curved_tail.svg']
            ]
        ],
        'clouds' => [
            'title' => 'Nubes',
            'icon' => 'cloud',
            'shapes' => [
                ['id' => 'cloud_puffy_full', 'name' => 'Nube esponjosa', 'file' => 'cloud_puffy_full.svg'],
                ['id' => 'cloud_flat_base_multi', 'name' => 'Nube de 4 cúpulas', 'file' => 'cloud_flat_base_multi.svg'],
                ['id' => 'cloud_flat_base_triple', 'name' => 'Nube de 3 cúpulas', 'file' => 'cloud_flat_base_triple.svg'],
                ['id' => 'cloud_fluffy_soft', 'name' => 'Nube suave', 'file' => 'cloud_fluffy_soft.svg'],
                ['id' => 'cloud_round_dome', 'name' => 'Nube de domo central', 'file' => 'cloud_round_dome.svg']
            ]
        ],
        'hearts' => [
            'title' => 'Corazones',
            'icon' => 'favorite',
            'shapes' => [
                ['id' => 'heart_classic', 'name' => 'Corazón clásico', 'file' => 'heart_classic.svg'],
                ['id' => 'heart_wide', 'name' => 'Corazón ancho', 'file' => 'heart_wide.svg'],
                ['id' => 'heart_playful', 'name' => 'Corazón asimétrico', 'file' => 'heart_playful.svg'],
                ['id' => 'heart_rounded', 'name' => 'Corazón regordete', 'file' => 'heart_rounded.svg'],
                ['id' => 'heart_narrow', 'name' => 'Corazón alargado', 'file' => 'heart_narrow.svg']
            ]
        ],
        'banners' => [
            'title' => 'Banners',
            'icon' => 'flag',
            'shapes' => [
                ['id' => 'banner_horizontal_ribbon', 'name' => 'Cinta horizontal', 'file' => 'banner_horizontal_ribbon.svg'],
                ['id' => 'banner_vertical_point', 'name' => 'Estandarte en punta', 'file' => 'banner_vertical_point.svg'],
                ['id' => 'banner_vertical_notch', 'name' => 'Estandarte con muesca', 'file' => 'banner_vertical_notch.svg'],
                ['id' => 'banner_rounded_point', 'name' => 'Estandarte redondeado', 'file' => 'banner_rounded_point.svg'],
                ['id' => 'banner_rounded_notch', 'name' => 'Estandarte redondeado con muesca', 'file' => 'banner_rounded_notch.svg']
            ]
        ],
        'tears' => [
            'title' => 'Lágrimas',
            'icon' => 'water_drop',
            'shapes' => [
                ['id' => 'tear_straight', 'name' => 'Gota clásica', 'file' => 'tear_straight.svg'],
                ['id' => 'tear_narrow', 'name' => 'Gota alargada', 'file' => 'tear_narrow.svg'],
                ['id' => 'tear_wide', 'name' => 'Gota ancha', 'file' => 'tear_wide.svg'],
                ['id' => 'tear_tilted', 'name' => 'Gota diagonal', 'file' => 'tear_tilted.svg'],
                ['id' => 'tear_curved_flame', 'name' => 'Gota de flama', 'file' => 'tear_curved_flame.svg']
            ]
        ],
        'gears' => [
            'title' => 'Engranajes',
            'icon' => 'settings',
            'shapes' => [
                ['id' => 'gear_16_teeth_large_hole', 'name' => 'Engranaje 16 dientes grande', 'file' => 'gear_16_teeth_large_hole.svg'],
                ['id' => 'gear_12_teeth_large_hole', 'name' => 'Engranaje 12 dientes grande', 'file' => 'gear_12_teeth_large_hole.svg'],
                ['id' => 'gear_12_teeth_pointed', 'name' => 'Rueda 12 dientes cónicos', 'file' => 'gear_12_teeth_pointed.svg'],
                ['id' => 'gear_16_teeth_pointed', 'name' => 'Engranaje 16 dientes cónicos', 'file' => 'gear_16_teeth_pointed.svg'],
                ['id' => 'gear_12_teeth_small_hole', 'name' => 'Engranaje 12 dientes eje fino', 'file' => 'gear_12_teeth_small_hole.svg'],
                ['id' => 'gear_14_teeth_pointed', 'name' => 'Engranaje 14 dientes cónicos', 'file' => 'gear_14_teeth_pointed.svg']
            ]
        ],
        'nature' => [
            'title' => 'Flores y naturaleza',
            'icon' => 'local_florist',
            'shapes' => [
                ['id' => 'flower_8_petals_sharp', 'name' => 'Margarita 8 pétalos', 'file' => 'flower_8_petals_sharp.svg'],
                ['id' => 'flower_6_petals_drop', 'name' => 'Flor 6 pétalos de gota', 'file' => 'flower_6_petals_drop.svg'],
                ['id' => 'flower_8_petals_round', 'name' => 'Flor 8 pétalos suaves', 'file' => 'flower_8_petals_round.svg'],
                ['id' => 'flower_6_petals_center_hole', 'name' => 'Flor 6 pétalos con centro', 'file' => 'flower_6_petals_center_hole.svg'],
                ['id' => 'clover_4_leaves', 'name' => 'Trébol de 4 hojas', 'file' => 'clover_4_leaves.svg'],
                ['id' => 'flower_4_petals_cross', 'name' => 'Flor 4 pétalos en cruz', 'file' => 'flower_4_petals_cross.svg'],
                ['id' => 'leaf_curved', 'name' => 'Hoja curva', 'file' => 'leaf_curved.svg'],
                ['id' => 'wave_multi_ribbon', 'name' => 'Cinta de 3 ondas', 'file' => 'wave_multi_ribbon.svg'],
                ['id' => 'wave_s_curve', 'name' => 'Cinta curva en S', 'file' => 'wave_s_curve.svg']
            ]
        ]
    ];
    ?>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-shapes">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">shapes</span>
                <span class="component-menu-header-title"><?php echo __('dt_geometric_shapes'); ?></span>
            </div>
        </div>
        
        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <?php foreach ($shapeCategories as $catKey => $catData): 
                $previewShapes = array_slice($catData['shapes'], 0, 6);
                $totalCount = count($catData['shapes']);
            ?>
            <div class="component-menu-section-parent component-menu-section-parent--bordered">
                <div class="component-menu-section-header">
                    <div class="component-menu-link component-menu-link--bordered" data-action="openShapeCategoryMenu" data-category="<?php echo $catKey; ?>" role="button" tabindex="0">
                        <div class="component-menu-link-icon">
                            <span class="material-symbols-rounded"><?php echo htmlspecialchars($catData['icon']); ?></span>
                        </div>
                        <div class="component-menu-link-text">
                            <span><?php echo htmlspecialchars($catData['title']); ?> (<?php echo $totalCount; ?>)</span>
                        </div>
                        <div class="component-menu-link-icon">
                            <span class="material-symbols-rounded">chevron_right</span>
                        </div>
                    </div>
                </div>
                <div class="component-menu-section-body">
                    <div class="component-items-grid component-items-grid--3 active" data-ref="shapes-preview-grid-<?php echo $catKey; ?>">
                        <?php foreach ($previewShapes as $shp): 
                            $svgFile = ($basePath ?? '') . '/assets/img/shapes/' . $shp['file'];
                        ?>
                        <div class="component-library-card component-shape-card" 
                             data-action="selectGeometricShape" 
                             data-shape-id="<?php echo htmlspecialchars($shp['id']); ?>" 
                             data-svg="<?php echo $svgFile; ?>"
                             data-tooltip="<?php echo htmlspecialchars($shp['name']); ?>" 
                             data-position="top">
                            <img class="component-library-card__image image-loaded" 
                                 src="<?php echo $svgFile; ?>" 
                                 alt="<?php echo htmlspecialchars($shp['name']); ?>" 
                                 loading="lazy" />
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border" data-ref="module-promo-bottom-shapes"></div>
    </div>

    <?php foreach ($shapeCategories as $catKey => $catData): ?>
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-shapes-<?php echo $catKey; ?>">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToShapesMainMenu" data-tooltip="<?php echo __('btn_back'); ?>">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <span class="material-symbols-rounded"><?php echo htmlspecialchars($catData['icon']); ?></span>
                <span class="component-menu-header-title"><?php echo htmlspecialchars($catData['title']); ?> (<?php echo count($catData['shapes']); ?>)</span>
            </div>
        </div>

        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-body">
                <div class="component-items-grid component-items-grid--3 active" data-ref="shapes-grid-<?php echo $catKey; ?>">
                    <?php foreach ($catData['shapes'] as $shp): 
                        $svgFile = ($basePath ?? '') . '/assets/img/shapes/' . $shp['file'];
                    ?>
                    <div class="component-library-card component-shape-card" 
                         data-action="selectGeometricShape" 
                         data-shape-id="<?php echo htmlspecialchars($shp['id']); ?>" 
                         data-svg="<?php echo $svgFile; ?>"
                         data-tooltip="<?php echo htmlspecialchars($shp['name']); ?>" 
                         data-position="top">
                        <img class="component-library-card__image image-loaded" 
                             src="<?php echo $svgFile; ?>" 
                             alt="<?php echo htmlspecialchars($shp['name']); ?>" 
                             loading="lazy" />
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border"></div>
    </div>
    <?php endforeach; ?>

</div>