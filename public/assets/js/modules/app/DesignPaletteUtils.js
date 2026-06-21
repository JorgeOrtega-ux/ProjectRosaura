// public/assets/js/modules/app/DesignPaletteUtils.js

/**
 * Función helper local para obtener una paleta por su ID. 
 * Lee desde la variable global inyectada por PHP (window.APP_PALETTES).
 * Si el ID no existe (o es nulo), retorna la paleta 'default' por seguridad.
 * @param {string} paletteId 
 * @returns {object} Objeto de la paleta
 */
export function getPaletteById(paletteId) {
    if (!window.APP_PALETTES) {
        console.error("Error Crítico: window.APP_PALETTES no está definido. Asegúrate de inyectar palettes.json desde PHP en el layout.");
        return { colors: ['#000000'] }; // Fallback de emergencia extrema
    }
    return window.APP_PALETTES[paletteId] || window.APP_PALETTES['default'];
}