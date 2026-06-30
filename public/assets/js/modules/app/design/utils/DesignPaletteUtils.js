// public/assets/js/modules/app/DesignPaletteUtils.js

export function getPaletteById(paletteId) {
    if (!window.APP_PALETTES) {
        // CORRECCIÓN: Estructura compatible con hex y name_key
        return { colors: [{ hex: '#000000', name_key: 'color_black' }] }; 
    }
    return window.APP_PALETTES[paletteId] || window.APP_PALETTES['default'];
}