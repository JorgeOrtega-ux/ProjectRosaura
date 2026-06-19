/**
 * Palettes.js
 * Archivo central (Fuente de la verdad) de las paletas de colores de la aplicación.
 */

export const APP_PALETTES = {
    default: {
        id: 'default',
        name: 'Clásica',
        colors: [
            // Grises / Blanco y Negro
            '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
            // Colores primarios y secundarios puros
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
            // Tonos oscuros
            '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
        ]
    },
    neon: {
        id: 'neon',
        name: 'Neón Cyberpunk',
        colors: [
            // Base oscuros
            '#000000', '#111111', '#222222', '#FFFFFF',
            // Tonos Neón intensos
            '#FF0055', '#FF0099', '#CC00FF', '#7700FF',
            '#0000FF', '#0088FF', '#00FFFF', '#00FF99',
            '#00FF00', '#88FF00', '#FFFF00', '#FF8800'
        ]
    },
    pastel: {
        id: 'pastel',
        name: 'Suave Pastel',
        colors: [
            // Base grises suaves
            '#4A4A4A', '#878787', '#C4C4C4', '#FFFFFF',
            // Tonos Pastel
            '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9',
            '#BAE1FF', '#D6BAFF', '#FFB3E6', '#E2F0CB',
            '#B5EAD7', '#C7CEEA', '#F1CBFF', '#FFDAC1'
        ]
    }
};

/**
 * Función helper para obtener una paleta por su ID. 
 * Si el ID no existe (o es nulo), retorna la paleta 'default' por seguridad.
 * @param {string} paletteId 
 * @returns {object} Objeto de la paleta
 */
export function getPaletteById(paletteId) {
    return APP_PALETTES[paletteId] || APP_PALETTES['default'];
}

/**
 * Función helper para obtener todas las paletas en formato Array.
 * Ideal para iterar (.map / .forEach) al construir el selector en la UI de Create/Edit.
 * @returns {Array} Array de objetos de paletas
 */
export function getAllPalettes() {
    return Object.values(APP_PALETTES);
}