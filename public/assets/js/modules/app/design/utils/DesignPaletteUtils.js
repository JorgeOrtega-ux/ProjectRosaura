export function getPaletteById(paletteId) {
    if (!window.APP_PALETTES) {
        return { colors: [{ hex: '#000000', name_key: 'color_black' }] };
    }

    if (paletteId && paletteId.startsWith('custom_') && window.APP_CUSTOM_PALETTES) {
        const customPalette = window.APP_CUSTOM_PALETTES[paletteId];
        if (customPalette) return customPalette;
    }

    return window.APP_PALETTES[paletteId] || window.APP_PALETTES['default'];
}