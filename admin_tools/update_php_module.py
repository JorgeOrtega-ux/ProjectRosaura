# -*- coding: utf-8 -*-
"""
update_php_module.py
Actualiza moduleDesignTools.php para implementar el menú de stickers categorizado
idéntico al módulo de figuras geométricas (12 categorías x 10 stickers = 120 stickers).
"""

import os
import re

_script_dir = os.path.dirname(os.path.abspath(__file__))
_base_dir = os.path.dirname(_script_dir)
PHP_FILE = os.path.join(_base_dir, "includes", "modules", "moduleDesignTools.php")

# Importar categorías de generate_assets
import sys
sys.path.insert(0, _script_dir)
from generate_assets import STICKERS_CATEGORIES

# Construir array PHP para $stickerCategories
php_code_categories = "    $stickerCategories = [\n"
for cat in STICKERS_CATEGORIES:
    php_code_categories += f"        '{cat['id']}' => [\n"
    php_code_categories += f"            'title' => '{cat['title']}',\n"
    php_code_categories += f"            'icon' => '{cat['icon']}',\n"
    php_code_categories += "            'stickers' => [\n"
    for stk in cat['stickers']:
        php_code_categories += f"                ['id' => '{stk['id']}', 'name' => '{stk['name']}', 'file' => '{stk['file']}'],\n"
    php_code_categories += "            ]\n"
    php_code_categories += "        ],\n"
php_code_categories += "    ];\n"

# Construir menú principal de stickers
php_main_menu = """    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-stickers">
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
"""

stickers_block = f"    <?php\n{php_code_categories}    ?>\n\n{php_main_menu}"

with open(PHP_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Reemplazar la sección de stickers antigua
pattern = re.compile(r'<\?php\s+\$presetStickers = \[.*?\s+<\?php\s+\$shapeCategories', re.DOTALL)
replacement = f"{stickers_block}\n    <?php\n    $shapeCategories"

if pattern.search(content):
    new_content = pattern.sub(replacement, content, count=1)
    with open(PHP_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("¡moduleDesignTools.php actualizado exitosamente con las 12 categorías de stickers!")
else:
    print("Error: No se encontró el bloque presetStickers en moduleDesignTools.php")
