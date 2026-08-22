/**
 * StickersData.js
 * Catálogo de 30 figuras y stickers pixel-art SVG almacenados físicamente en el servidor.
 */

const STICKERS_CATALOG = [
    // 1. RPG & Fantasía
    { id: 'sticker_sword', name: 'Espada de Héroe', category: 'rpg', file: 'sword.svg', width: 16, height: 16 },
    { id: 'sticker_shield', name: 'Escudo Real', category: 'rpg', file: 'shield.svg', width: 16, height: 16 },
    { id: 'sticker_axe', name: 'Hacha de Batalla', category: 'rpg', file: 'axe.svg', width: 16, height: 16 },
    { id: 'sticker_potion_red', name: 'Poción de Vida', category: 'rpg', file: 'potion_red.svg', width: 16, height: 16 },
    { id: 'sticker_potion_blue', name: 'Poción de Maná', category: 'rpg', file: 'potion_blue.svg', width: 16, height: 16 },
    { id: 'sticker_chest', name: 'Cofre del Tesoro', category: 'rpg', file: 'chest.svg', width: 16, height: 16 },

    // 2. Objetos & Tesoros
    { id: 'sticker_coin', name: 'Moneda de Oro', category: 'treasures', file: 'coin.svg', width: 16, height: 16 },
    { id: 'sticker_gem', name: 'Gema Brillante', category: 'treasures', file: 'gem.svg', width: 16, height: 16 },
    { id: 'sticker_crown', name: 'Corona Imperial', category: 'treasures', file: 'crown.svg', width: 16, height: 16 },
    { id: 'sticker_key', name: 'Llave Antigua', category: 'treasures', file: 'key.svg', width: 16, height: 16 },
    { id: 'sticker_star', name: 'Estrella Dorada', category: 'treasures', file: 'star.svg', width: 16, height: 16 },
    { id: 'sticker_trophy', name: 'Trofeo de Campeón', category: 'treasures', file: 'trophy.svg', width: 16, height: 16 },

    // 3. Símbolos & Emociones
    { id: 'sticker_heart', name: 'Corazón', category: 'symbols', file: 'heart.svg', width: 16, height: 16 },
    { id: 'sticker_heart_broken', name: 'Corazón Roto', category: 'symbols', file: 'heart_broken.svg', width: 16, height: 16 },
    { id: 'sticker_skull', name: 'Calavera', category: 'symbols', file: 'skull.svg', width: 16, height: 16 },
    { id: 'sticker_smiley', name: 'Carita Feliz', category: 'symbols', file: 'smiley.svg', width: 16, height: 16 },
    { id: 'sticker_fire', name: 'Llama de Fuego', category: 'symbols', file: 'fire.svg', width: 16, height: 16 },
    { id: 'sticker_lightning', name: 'Rayo Eléctrico', category: 'symbols', file: 'lightning.svg', width: 16, height: 16 },

    // 4. Naturaleza & Escenarios
    { id: 'sticker_tree', name: 'Árbol Pino', category: 'nature', file: 'tree.svg', width: 16, height: 16 },
    { id: 'sticker_flower', name: 'Flor Rosa', category: 'nature', file: 'flower.svg', width: 16, height: 16 },
    { id: 'sticker_mushroom', name: 'Hongo Rojo', category: 'nature', file: 'mushroom.svg', width: 16, height: 16 },
    { id: 'sticker_house', name: 'Casita', category: 'nature', file: 'house.svg', width: 16, height: 16 },
    { id: 'sticker_sun', name: 'Sol Radiante', category: 'nature', file: 'sun.svg', width: 16, height: 16 },
    { id: 'sticker_moon', name: 'Luna Creciente', category: 'nature', file: 'moon.svg', width: 16, height: 16 },

    // 5. Arcade & Gaming
    { id: 'sticker_ghost', name: 'Fantasma Arcade', category: 'arcade', file: 'ghost.svg', width: 16, height: 16 },
    { id: 'sticker_alien', name: 'Invasor Espacial', category: 'arcade', file: 'alien.svg', width: 16, height: 16 },
    { id: 'sticker_gamepad', name: 'Control Retro', category: 'arcade', file: 'gamepad.svg', width: 16, height: 16 },
    { id: 'sticker_bomb', name: 'Bomba', category: 'arcade', file: 'bomb.svg', width: 16, height: 16 },
    { id: 'sticker_apple', name: 'Manzana Pixel', category: 'arcade', file: 'apple.svg', width: 16, height: 16 },
    { id: 'sticker_cat', name: 'Gatito Pixel', category: 'arcade', file: 'cat.svg', width: 16, height: 16 }
];

export function getStickersList() {
    const basePath = window.AppBasePath || '';
    return STICKERS_CATALOG.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        width: item.width || 16,
        height: item.height || 16,
        file: item.file,
        dataUrl: `${basePath}/assets/img/stickers/${item.file}`
    }));
}

export function getStickerById(id) {
    const list = getStickersList();
    return list.find(s => s.id === id) || null;
}
