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

        <div class="component-menu-section-parent disabled" data-ref="shading-ramps-section">
            <div class="component-menu-section-header">
                <div class="component-menu-header-box">
                    <span class="material-symbols-rounded">gradient</span>
                    <span class="component-menu-header-title"><?php echo __('lbl_shading_ramp', 'Rampa de Sombreado'); ?></span>
                </div>
                <div class="component-menu-header-actions">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button type="button" class="component-button component-button--icon component-button--h24" data-action="toggleModule" data-target="moduleRampPresetDropdown" data-tooltip="<?php echo __('lbl_shading_preset', 'Preset de Iluminación'); ?>" data-position="left">
                            <span class="material-symbols-rounded" data-ref="ramp-preset-icon">wb_sunny</span>
                        </button>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleRampPresetDropdown" data-ref="ramp-preset-dropdown">
                            <div class="component-menu component-menu--w180 component-menu--h-auto component-menu--padding-xs">
                                <ul class="component-menu-list">
                                    <li>
                                        <button type="button" class="component-menu-link active" data-action="setRampPreset" data-preset="warm_cool">
                                            <span class="material-symbols-rounded">wb_sunny</span>
                                            <span><?php echo __('lbl_hue_preset_warm_cool', 'Cálido / Frío'); ?></span>
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" class="component-menu-link" data-action="setRampPreset" data-preset="night_cyber">
                                            <span class="material-symbols-rounded">bedtime</span>
                                            <span><?php echo __('lbl_hue_preset_night', 'Nocturno'); ?></span>
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" class="component-menu-link" data-action="setRampPreset" data-preset="organic">
                                            <span class="material-symbols-rounded">forest</span>
                                            <span><?php echo __('lbl_hue_preset_organic', 'Orgánico'); ?></span>
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" class="component-menu-link" data-action="setRampPreset" data-preset="neutral">
                                            <span class="material-symbols-rounded">contrast</span>
                                            <span><?php echo __('lbl_hue_preset_neutral', 'Monocromático'); ?></span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="component-menu-section-body">
                <div class="component-items-grid" data-ref="color-ramp-swatches-container"></div>
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
    $stickerCategories = [
        'rpg' => [
            'title' => 'RPG y Fantasía',
            'icon' => 'swords',
            'stickers' => [
                ['id' => 'sticker_sword_hero', 'name' => 'Espada de Héroe', 'file' => 'sword_hero.svg'],
                ['id' => 'sticker_shield_royal', 'name' => 'Escudo Real', 'file' => 'shield_royal.svg'],
                ['id' => 'sticker_battle_axe', 'name' => 'Hacha de Batalla', 'file' => 'battle_axe.svg'],
                ['id' => 'sticker_potion_health', 'name' => 'Poción de Vida', 'file' => 'potion_health.svg'],
                ['id' => 'sticker_potion_mana', 'name' => 'Poción de Maná', 'file' => 'potion_mana.svg'],
                ['id' => 'sticker_treasure_chest', 'name' => 'Cofre del Tesoro', 'file' => 'treasure_chest.svg'],
                ['id' => 'sticker_magic_wand', 'name' => 'Varita Mágica', 'file' => 'magic_wand.svg'],
                ['id' => 'sticker_knight_helmet', 'name' => 'Yelmo de Caballero', 'file' => 'knight_helmet.svg'],
                ['id' => 'sticker_elven_bow', 'name' => 'Arco Élfico', 'file' => 'elven_bow.svg'],
                ['id' => 'sticker_spell_scroll', 'name' => 'Pergamino Sagrado', 'file' => 'spell_scroll.svg'],
            ]
        ],
        'treasures' => [
            'title' => 'Tesoros y Riquezas',
            'icon' => 'diamond',
            'stickers' => [
                ['id' => 'sticker_gold_coin', 'name' => 'Moneda de Oro', 'file' => 'gold_coin.svg'],
                ['id' => 'sticker_ruby_gem', 'name' => 'Gema Rubí', 'file' => 'ruby_gem.svg'],
                ['id' => 'sticker_golden_crown', 'name' => 'Corona Real', 'file' => 'golden_crown.svg'],
                ['id' => 'sticker_ancient_key', 'name' => 'Llave Antigua', 'file' => 'ancient_key.svg'],
                ['id' => 'sticker_champion_trophy', 'name' => 'Trofeo de Campeón', 'file' => 'champion_trophy.svg'],
                ['id' => 'sticker_gold_ingot', 'name' => 'Lingote de Oro', 'file' => 'gold_ingot.svg'],
                ['id' => 'sticker_holy_grail', 'name' => 'Cáliz Sagrado', 'file' => 'holy_grail.svg'],
                ['id' => 'sticker_diamond_ring', 'name' => 'Anillo de Diamante', 'file' => 'diamond_ring.svg'],
                ['id' => 'sticker_gem_sack', 'name' => 'Bolsa de Gemas', 'file' => 'gem_sack.svg'],
                ['id' => 'sticker_emerald_crystal', 'name' => 'Esmeralda Mística', 'file' => 'emerald_crystal.svg'],
            ]
        ],
        'characters' => [
            'title' => 'Personajes y Héroes',
            'icon' => 'face',
            'stickers' => [
                ['id' => 'sticker_hero_knight', 'name' => 'Caballero Valiente', 'file' => 'hero_knight.svg'],
                ['id' => 'sticker_wise_wizard', 'name' => 'Mago Arcano', 'file' => 'wise_wizard.svg'],
                ['id' => 'sticker_shadow_rogue', 'name' => 'Pícaro Sombrío', 'file' => 'shadow_rogue.svg'],
                ['id' => 'sticker_royal_princess', 'name' => 'Princesa Real', 'file' => 'royal_princess.svg'],
                ['id' => 'sticker_king_monarch', 'name' => 'Rey Soberano', 'file' => 'king_monarch.svg'],
                ['id' => 'sticker_undead_skeleton', 'name' => 'Esqueleto Guerrero', 'file' => 'undead_skeleton.svg'],
                ['id' => 'sticker_goblin_scout', 'name' => 'Duende Pícaro', 'file' => 'goblin_scout.svg'],
                ['id' => 'sticker_baby_dragon', 'name' => 'Dragón Bebé', 'file' => 'baby_dragon.svg'],
                ['id' => 'sticker_stone_golem', 'name' => 'Gólem de Piedra', 'file' => 'stone_golem.svg'],
                ['id' => 'sticker_cute_witch', 'name' => 'Brujita Mágica', 'file' => 'cute_witch.svg'],
            ]
        ],
        'creatures' => [
            'title' => 'Animales y Criaturas',
            'icon' => 'pets',
            'stickers' => [
                ['id' => 'sticker_tabby_cat', 'name' => 'Gatito Naranja', 'file' => 'tabby_cat.svg'],
                ['id' => 'sticker_happy_dog', 'name' => 'Perrito Feliz', 'file' => 'happy_dog.svg'],
                ['id' => 'sticker_red_fox', 'name' => 'Zorro Rojo', 'file' => 'red_fox.svg'],
                ['id' => 'sticker_night_owl', 'name' => 'Búho Nocturno', 'file' => 'night_owl.svg'],
                ['id' => 'sticker_tree_frog', 'name' => 'Ranita Verde', 'file' => 'tree_frog.svg'],
                ['id' => 'sticker_white_bunny', 'name' => 'Conejito Blanco', 'file' => 'white_bunny.svg'],
                ['id' => 'sticker_yellow_chick', 'name' => 'Pollito Pío', 'file' => 'yellow_chick.svg'],
                ['id' => 'sticker_pink_axolotl', 'name' => 'Ajolote Rosado', 'file' => 'pink_axolotl.svg'],
                ['id' => 'sticker_cute_penguin', 'name' => 'Pingüino Alegre', 'file' => 'cute_penguin.svg'],
                ['id' => 'sticker_panda_bear', 'name' => 'Panda Glotón', 'file' => 'panda_bear.svg'],
            ]
        ],
        'food' => [
            'title' => 'Comida y Bebidas',
            'icon' => 'restaurant',
            'stickers' => [
                ['id' => 'sticker_pizza_slice', 'name' => 'Rebanada de Pizza', 'file' => 'pizza_slice.svg'],
                ['id' => 'sticker_cheeseburger', 'name' => 'Hamburguesa Clásica', 'file' => 'cheeseburger.svg'],
                ['id' => 'sticker_glazed_donut', 'name' => 'Dona Glaseada', 'file' => 'glazed_donut.svg'],
                ['id' => 'sticker_strawberry_cake', 'name' => 'Pastel de Fresa', 'file' => 'strawberry_cake.svg'],
                ['id' => 'sticker_ice_cream', 'name' => 'Helado Tricolor', 'file' => 'ice_cream.svg'],
                ['id' => 'sticker_coffee_cup', 'name' => 'Taza de Café', 'file' => 'coffee_cup.svg'],
                ['id' => 'sticker_ramen_bowl', 'name' => 'Tazón de Ramen', 'file' => 'ramen_bowl.svg'],
                ['id' => 'sticker_salmon_sushi', 'name' => 'Sushi de Salmón', 'file' => 'salmon_sushi.svg'],
                ['id' => 'sticker_red_apple', 'name' => 'Manzana Roja', 'file' => 'red_apple.svg'],
                ['id' => 'sticker_soda_bottle', 'name' => 'Botella de Refresco', 'file' => 'soda_bottle.svg'],
            ]
        ],
        'nature' => [
            'title' => 'Naturaleza y Plantas',
            'icon' => 'local_florist',
            'stickers' => [
                ['id' => 'sticker_oak_tree', 'name' => 'Árbol de Roble', 'file' => 'oak_tree.svg'],
                ['id' => 'sticker_pine_tree', 'name' => 'Pino Nevado', 'file' => 'pine_tree.svg'],
                ['id' => 'sticker_palm_tree', 'name' => 'Palmera Tropical', 'file' => 'palm_tree.svg'],
                ['id' => 'sticker_sunflower', 'name' => 'Flor Girasol', 'file' => 'sunflower.svg'],
                ['id' => 'sticker_red_mushroom', 'name' => 'Hongo Rojo Mágico', 'file' => 'red_mushroom.svg'],
                ['id' => 'sticker_desert_cactus', 'name' => 'Cactus del Desierto', 'file' => 'desert_cactus.svg'],
                ['id' => 'sticker_four_leaf_clover', 'name' => 'Trébol de la Suerte', 'file' => 'four_leaf_clover.svg'],
                ['id' => 'sticker_berry_bush', 'name' => 'Arbusto de Bayas', 'file' => 'berry_bush.svg'],
                ['id' => 'sticker_lotus_flower', 'name' => 'Flor de Loto', 'file' => 'lotus_flower.svg'],
                ['id' => 'sticker_maple_leaf', 'name' => 'Hoja de Arce', 'file' => 'maple_leaf.svg'],
            ]
        ],
        'space' => [
            'title' => 'Espacio y Ciencia Ficción',
            'icon' => 'rocket_launch',
            'stickers' => [
                ['id' => 'sticker_space_rocket', 'name' => 'Cohete Espacial', 'file' => 'space_rocket.svg'],
                ['id' => 'sticker_saturn_planet', 'name' => 'Planeta Anillado', 'file' => 'saturn_planet.svg'],
                ['id' => 'sticker_alien_ufo', 'name' => 'OVNI Alienígena', 'file' => 'alien_ufo.svg'],
                ['id' => 'sticker_astronaut_helmet', 'name' => 'Casco Astronauta', 'file' => 'astronaut_helmet.svg'],
                ['id' => 'sticker_orbit_satellite', 'name' => 'Satélite Orbital', 'file' => 'orbit_satellite.svg'],
                ['id' => 'sticker_crystal_asteroid', 'name' => 'Asteroide Cristal', 'file' => 'crystal_asteroid.svg'],
                ['id' => 'sticker_space_telescope', 'name' => 'Telescopio Espacial', 'file' => 'space_telescope.svg'],
                ['id' => 'sticker_cosmic_portal', 'name' => 'Portal Cósmico', 'file' => 'cosmic_portal.svg'],
                ['id' => 'sticker_android_robot', 'name' => 'Robot Androide', 'file' => 'android_robot.svg'],
                ['id' => 'sticker_laser_gun', 'name' => 'Pistola Láser', 'file' => 'laser_gun.svg'],
            ]
        ],
        'arcade' => [
            'title' => 'Arcade y Videojuegos',
            'icon' => 'sports_esports',
            'stickers' => [
                ['id' => 'sticker_retro_gamepad', 'name' => 'Control Retro', 'file' => 'retro_gamepad.svg'],
                ['id' => 'sticker_game_cartridge', 'name' => 'Cartucho Clásico', 'file' => 'game_cartridge.svg'],
                ['id' => 'sticker_arcade_cabinet', 'name' => 'Máquina Arcade', 'file' => 'arcade_cabinet.svg'],
                ['id' => 'sticker_arcade_ghost', 'name' => 'Fantasma Pixel', 'file' => 'arcade_ghost.svg'],
                ['id' => 'sticker_8bit_heart', 'name' => 'Corazón 8-Bit', 'file' => '8bit_heart.svg'],
                ['id' => 'sticker_arcade_coin', 'name' => 'Moneda Arcade', 'file' => 'arcade_coin.svg'],
                ['id' => 'sticker_power_star', 'name' => 'Estrella de Poder', 'file' => 'power_star.svg'],
                ['id' => 'sticker_fuse_bomb', 'name' => 'Bomba Explosiva', 'file' => 'fuse_bomb.svg'],
                ['id' => 'sticker_pixel_sword', 'name' => 'Espada Pixelada', 'file' => 'pixel_sword.svg'],
                ['id' => 'sticker_victory_cup', 'name' => 'Copa de Victoria', 'file' => 'victory_cup.svg'],
            ]
        ],
        'emotes' => [
            'title' => 'Emotes y Símbolos',
            'icon' => 'mood',
            'stickers' => [
                ['id' => 'sticker_heart_love', 'name' => 'Corazón Brillante', 'file' => 'heart_love.svg'],
                ['id' => 'sticker_broken_heart', 'name' => 'Corazón Roto', 'file' => 'broken_heart.svg'],
                ['id' => 'sticker_pirate_skull', 'name' => 'Calavera Pirata', 'file' => 'pirate_skull.svg'],
                ['id' => 'sticker_smiley_face', 'name' => 'Carita Feliz', 'file' => 'smiley_face.svg'],
                ['id' => 'sticker_wink_face', 'name' => 'Carita Guiño', 'file' => 'wink_face.svg'],
                ['id' => 'sticker_cool_glasses', 'name' => 'Carita con Lentes', 'file' => 'cool_glasses.svg'],
                ['id' => 'sticker_fire_flame', 'name' => 'Llama Ardiente', 'file' => 'fire_flame.svg'],
                ['id' => 'sticker_thunder_bolt', 'name' => 'Rayo Trueno', 'file' => 'thunder_bolt.svg'],
                ['id' => 'sticker_shooting_star', 'name' => 'Estrella Fugaz', 'file' => 'shooting_star.svg'],
                ['id' => 'sticker_peace_sign', 'name' => 'Símbolo de Paz', 'file' => 'peace_sign.svg'],
            ]
        ],
        'weather' => [
            'title' => 'Clima y Cielo',
            'icon' => 'wb_sunny',
            'stickers' => [
                ['id' => 'sticker_radiant_sun', 'name' => 'Sol Radiante', 'file' => 'radiant_sun.svg'],
                ['id' => 'sticker_full_moon', 'name' => 'Luna Llena', 'file' => 'full_moon.svg'],
                ['id' => 'sticker_crescent_moon', 'name' => 'Luna Creciente', 'file' => 'crescent_moon.svg'],
                ['id' => 'sticker_rain_cloud', 'name' => 'Nube Lluviosa', 'file' => 'rain_cloud.svg'],
                ['id' => 'sticker_storm_lightning', 'name' => 'Tormenta Eléctrica', 'file' => 'storm_lightning.svg'],
                ['id' => 'sticker_magic_rainbow', 'name' => 'Arcoíris Mágico', 'file' => 'magic_rainbow.svg'],
                ['id' => 'sticker_snow_crystal', 'name' => 'Copo de Nieve', 'file' => 'snow_crystal.svg'],
                ['id' => 'sticker_wind_gust', 'name' => 'Remolino de Viento', 'file' => 'wind_gust.svg'],
                ['id' => 'sticker_night_sparkle', 'name' => 'Destello Nocturno', 'file' => 'night_sparkle.svg'],
                ['id' => 'sticker_fiery_comet', 'name' => 'Cometa de Fuego', 'file' => 'fiery_comet.svg'],
            ]
        ],
        'vehicles' => [
            'title' => 'Vehículos y Viajes',
            'icon' => 'directions_car',
            'stickers' => [
                ['id' => 'sticker_sports_car', 'name' => 'Auto Deportivo', 'file' => 'sports_car.svg'],
                ['id' => 'sticker_steam_train', 'name' => 'Tren Clásico', 'file' => 'steam_train.svg'],
                ['id' => 'sticker_sail_boat', 'name' => 'Barco Velero', 'file' => 'sail_boat.svg'],
                ['id' => 'sticker_jet_plane', 'name' => 'Avión Comercial', 'file' => 'jet_plane.svg'],
                ['id' => 'sticker_hot_air_balloon', 'name' => 'Globo Aerostático', 'file' => 'hot_air_balloon.svg'],
                ['id' => 'sticker_city_bicycle', 'name' => 'Bicicleta Urbana', 'file' => 'city_bicycle.svg'],
                ['id' => 'sticker_lunar_lander', 'name' => 'Módulo Lunar', 'file' => 'lunar_lander.svg'],
                ['id' => 'sticker_yellow_submarine', 'name' => 'Submarino Amarillo', 'file' => 'yellow_submarine.svg'],
                ['id' => 'sticker_wooden_wagon', 'name' => 'Carreta de Madera', 'file' => 'wooden_wagon.svg'],
                ['id' => 'sticker_skate_board', 'name' => 'Patineta Skater', 'file' => 'skate_board.svg'],
            ]
        ],
        'decor' => [
            'title' => 'Objetos y Decoración',
            'icon' => 'auto_awesome',
            'stickers' => [
                ['id' => 'sticker_lit_candle', 'name' => 'Vela Encendida', 'file' => 'lit_candle.svg'],
                ['id' => 'sticker_iron_lantern', 'name' => 'Farol de Hierro', 'file' => 'iron_lantern.svg'],
                ['id' => 'sticker_hour_glass', 'name' => 'Reloj de Arena', 'file' => 'hour_glass.svg'],
                ['id' => 'sticker_spell_book', 'name' => 'Libro de Conjuros', 'file' => 'spell_book.svg'],
                ['id' => 'sticker_potion_flask', 'name' => 'Frasco Alquimia', 'file' => 'potion_flask.svg'],
                ['id' => 'sticker_magic_mirror', 'name' => 'Espejo Mágico', 'file' => 'magic_mirror.svg'],
                ['id' => 'sticker_oil_lamp', 'name' => 'Lámpara de Aceite', 'file' => 'oil_lamp.svg'],
                ['id' => 'sticker_art_painting', 'name' => 'Cuadro de Arte', 'file' => 'art_painting.svg'],
                ['id' => 'sticker_crystal_ball', 'name' => 'Esfera de Cristal', 'file' => 'crystal_ball.svg'],
                ['id' => 'sticker_sea_anchor', 'name' => 'Ancla Marina', 'file' => 'sea_anchor.svg'],
            ]
        ],
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
            <?php foreach ($stickerCategories as $catKey => $catData): 
                $previewStickers = array_slice($catData['stickers'], 0, 6);
                $totalCount = count($catData['stickers']);
            ?>
            <div class="component-menu-section-parent component-menu-section-parent--bordered">
                <div class="component-menu-section-header">
                    <div class="component-menu-link component-menu-link--bordered" data-action="openStickerCategoryMenu" data-category="<?php echo $catKey; ?>" role="button" tabindex="0">
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
                    <div class="component-items-grid component-items-grid--3 active" data-ref="stickers-preview-grid-<?php echo $catKey; ?>">
                        <?php foreach ($previewStickers as $stk): 
                            $svgFile = ($basePath ?? '') . '/assets/img/stickers/' . $stk['file'];
                        ?>
                        <div class="component-library-card" 
                             data-action="addStickerToCanvas" 
                             data-sticker-id="<?php echo htmlspecialchars($stk['id']); ?>" 
                             data-sticker-category="<?php echo $catKey; ?>"
                             data-tooltip="<?php echo htmlspecialchars($stk['name']); ?>" 
                             data-position="top">
                            <img class="component-library-card__image image-loaded" 
                                 src="<?php echo $svgFile; ?>" 
                                 alt="<?php echo htmlspecialchars($stk['name']); ?>" 
                                 loading="lazy" />
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border" data-ref="module-promo-bottom-stickers"></div>
    </div>

    <?php foreach ($stickerCategories as $catKey => $catData): ?>
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-stickers-<?php echo $catKey; ?>">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToStickersMainMenu" data-tooltip="<?php echo __('btn_back'); ?>">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <span class="material-symbols-rounded"><?php echo htmlspecialchars($catData['icon']); ?></span>
                <span class="component-menu-header-title"><?php echo htmlspecialchars($catData['title']); ?> (<?php echo count($catData['stickers']); ?>)</span>
            </div>
        </div>

        <div class="component-menu-section-parent component-menu-section-parent--scrollable">
            <div class="component-menu-section-body">
                <div class="component-items-grid component-items-grid--3 active" data-ref="stickers-grid-<?php echo $catKey; ?>">
                    <?php foreach ($catData['stickers'] as $stk): 
                        $svgFile = ($basePath ?? '') . '/assets/img/stickers/' . $stk['file'];
                    ?>
                    <div class="component-library-card" 
                         data-action="addStickerToCanvas" 
                         data-sticker-id="<?php echo htmlspecialchars($stk['id']); ?>" 
                         data-sticker-category="<?php echo $catKey; ?>"
                         data-tooltip="<?php echo htmlspecialchars($stk['name']); ?>" 
                         data-position="top">
                        <img class="component-library-card__image image-loaded" 
                             src="<?php echo $svgFile; ?>" 
                             alt="<?php echo htmlspecialchars($stk['name']); ?>" 
                             loading="lazy" />
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom component-menu-bottom--no-border"></div>
    </div>
    <?php endforeach; ?>

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