/**
 * StickersData.js
 * Catálogo de 30 figuras y stickers pixel-art SVG unificados en un único Sprite Sheet.
 */

const STICKERS_CATALOG = [
    // 1. RPG & Fantasía
    { id: 'sticker_sword', name: 'Espada de Héroe', category: 'rpg', file: 'sword.svg', col: 0, row: 0 },
    { id: 'sticker_shield', name: 'Escudo Real', category: 'rpg', file: 'shield.svg', col: 1, row: 0 },
    { id: 'sticker_axe', name: 'Hacha de Batalla', category: 'rpg', file: 'axe.svg', col: 2, row: 0 },
    { id: 'sticker_potion_red', name: 'Poción de Vida', category: 'rpg', file: 'potion_red.svg', col: 3, row: 0 },
    { id: 'sticker_potion_blue', name: 'Poción de Maná', category: 'rpg', file: 'potion_blue.svg', col: 4, row: 0 },
    { id: 'sticker_chest', name: 'Cofre del Tesoro', category: 'rpg', file: 'chest.svg', col: 5, row: 0 },

    // 2. Objetos & Tesoros
    { id: 'sticker_coin', name: 'Moneda de Oro', category: 'treasures', file: 'coin.svg', col: 0, row: 1 },
    { id: 'sticker_gem', name: 'Gema Brillante', category: 'treasures', file: 'gem.svg', col: 1, row: 1 },
    { id: 'sticker_crown', name: 'Corona Imperial', category: 'treasures', file: 'crown.svg', col: 2, row: 1 },
    { id: 'sticker_key', name: 'Llave Antigua', category: 'treasures', file: 'key.svg', col: 3, row: 1 },
    { id: 'sticker_star', name: 'Estrella Dorada', category: 'treasures', file: 'star.svg', col: 4, row: 1 },
    { id: 'sticker_trophy', name: 'Trofeo de Campeón', category: 'treasures', file: 'trophy.svg', col: 5, row: 1 },

    // 3. Símbolos & Emociones
    { id: 'sticker_heart', name: 'Corazón', category: 'symbols', file: 'heart.svg', col: 0, row: 2 },
    { id: 'sticker_heart_broken', name: 'Corazón Roto', category: 'symbols', file: 'heart_broken.svg', col: 1, row: 2 },
    { id: 'sticker_skull', name: 'Calavera', category: 'symbols', file: 'skull.svg', col: 2, row: 2 },
    { id: 'sticker_smiley', name: 'Carita Feliz', category: 'symbols', file: 'smiley.svg', col: 3, row: 2 },
    { id: 'sticker_fire', name: 'Llama de Fuego', category: 'symbols', file: 'fire.svg', col: 4, row: 2 },
    { id: 'sticker_lightning', name: 'Rayo Eléctrico', category: 'symbols', file: 'lightning.svg', col: 5, row: 2 },

    // 4. Naturaleza & Escenarios
    { id: 'sticker_tree', name: 'Árbol Pino', category: 'nature', file: 'tree.svg', col: 0, row: 3 },
    { id: 'sticker_flower', name: 'Flor Rosa', category: 'nature', file: 'flower.svg', col: 1, row: 3 },
    { id: 'sticker_mushroom', name: 'Hongo Rojo', category: 'nature', file: 'mushroom.svg', col: 2, row: 3 },
    { id: 'sticker_house', name: 'Casita', category: 'nature', file: 'house.svg', col: 3, row: 3 },
    { id: 'sticker_sun', name: 'Sol Radiante', category: 'nature', file: 'sun.svg', col: 4, row: 3 },
    { id: 'sticker_moon', name: 'Luna Creciente', category: 'nature', file: 'moon.svg', col: 5, row: 3 },

    // 5. Arcade & Gaming
    { id: 'sticker_ghost', name: 'Fantasma Arcade', category: 'arcade', file: 'ghost.svg', col: 0, row: 4 },
    { id: 'sticker_alien', name: 'Invasor Espacial', category: 'arcade', file: 'alien.svg', col: 1, row: 4 },
    { id: 'sticker_gamepad', name: 'Control Retro', category: 'arcade', file: 'gamepad.svg', col: 2, row: 4 },
    { id: 'sticker_bomb', name: 'Bomba', category: 'arcade', file: 'bomb.svg', col: 3, row: 4 },
    { id: 'sticker_apple', name: 'Manzana Pixel', category: 'arcade', file: 'apple.svg', col: 4, row: 4 },
    { id: 'sticker_cat', name: 'Gatito Pixel', category: 'arcade', file: 'cat.svg', col: 5, row: 4 }
];

export function getStickersSpriteUrl() {
    const basePath = window.AppBasePath || '';
    return `${basePath}/assets/img/stickers/stickers_sprite.svg`;
}

export function getStickersList() {
    const basePath = window.AppBasePath || '';
    const spriteUrl = getStickersSpriteUrl();
    return STICKERS_CATALOG.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        width: 16,
        height: 16,
        col: item.col,
        row: item.row,
        sx: item.col * 16,
        sy: item.row * 16,
        sw: 16,
        sh: 16,
        file: item.file,
        spriteUrl: spriteUrl,
        spriteClass: `sticker-sprite--${item.file.replace('.svg', '')}`,
        dataUrl: `${basePath}/assets/img/stickers/${item.file}`
    }));
}

export function getStickerById(id) {
    const list = getStickersList();
    return list.find(s => s.id === id) || null;
}

