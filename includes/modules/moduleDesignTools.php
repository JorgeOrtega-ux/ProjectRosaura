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
                    <input type="file" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
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

        <div class="component-stickers-category-bar" data-ref="stickers-categories">
            <button class="component-sticker-cat-pill active" data-action="filterStickerCategory" data-category="all"><?php echo __('lbl_all'); ?> (<?php echo count($presetStickers); ?>)</button>
            <button class="component-sticker-cat-pill" data-action="filterStickerCategory" data-category="rpg">RPG</button>
            <button class="component-sticker-cat-pill" data-action="filterStickerCategory" data-category="treasures">Tesoros</button>
            <button class="component-sticker-cat-pill" data-action="filterStickerCategory" data-category="symbols">Símbolos</button>
            <button class="component-sticker-cat-pill" data-action="filterStickerCategory" data-category="nature">Naturaleza</button>
            <button class="component-sticker-cat-pill" data-action="filterStickerCategory" data-category="arcade">Arcade</button>
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
                    <?php foreach ($presetStickers as $stk): 
                        $svgPath = ($basePath ?? '') . '/assets/img/stickers/' . $stk['file'];
                    ?>
                    <div class="component-library-card" 
                         data-action="addStickerToCanvas" 
                         data-sticker-id="<?php echo htmlspecialchars($stk['id']); ?>" 
                         data-sticker-category="<?php echo htmlspecialchars($stk['category']); ?>"
                         data-tooltip="<?php echo htmlspecialchars($stk['name']); ?>" 
                         data-position="top">
                        <img src="<?php echo $svgPath; ?>" 
                             alt="<?php echo htmlspecialchars($stk['name']); ?>" 
                             class="component-library-card__image image-loaded" 
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

</div>