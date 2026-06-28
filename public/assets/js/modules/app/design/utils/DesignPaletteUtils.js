// public/assets/js/modules/app/DesignPaletteUtils.js

export function getPaletteById(paletteId) {
    if (!window.APP_PALETTES) {
        return { colors: ['#000000'] }; 
    }
    return window.APP_PALETTES[paletteId] || window.APP_PALETTES['default'];
}