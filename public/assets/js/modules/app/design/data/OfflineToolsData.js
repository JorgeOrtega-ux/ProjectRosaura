export const OfflineToolsConfig = {
    brush: {
        id: 'brush',
        nameKey: 'tooltip_brush',
        icon: 'brush',
        shortcut: 'B',
        action: 'toggleOfflineBrush',
        ref: 'btn-offline-brush',
        subtoolbar: {
            id: 'brush',
            action: 'setBrushShape',
            dataAttr: 'data-brush-shape',
            default: 'square',
            options: [
                { id: 'square', icon: 'square', nameKey: 'tooltip_brush_square' },
                { id: 'circle', icon: 'circle', nameKey: 'tooltip_brush_circle' },
                { id: 'slash',  icon: 'edit',   nameKey: 'tooltip_brush_slash' }
            ]
        },
        sizes: {
            id: 'brush',
            action: 'setBrushSize',
            default: 1,
            tiers: {
                small:  [1, 2, 3, 4, 6],
                medium: [1, 2, 4, 8, 12, 16],
                large:  [1, 2, 4, 8, 16, 32]
            }
        }
    },
    mirror: {
        id: 'mirror',
        nameKey: 'tooltip_mirror_mode',
        icon: 'flip',
        shortcut: 'X',
        action: 'toggleOfflineMirror',
        ref: 'btn-offline-mirror'
    },
    moveArea: {
        id: 'moveArea',
        nameKey: 'tooltip_move_area',
        icon: 'crop_free',
        shortcut: 'M',
        action: 'toggleOfflineMoveArea',
        ref: 'btn-offline-move-area'
    },
    bucket: {
        id: 'bucket',
        nameKey: 'tooltip_bucket',
        icon: 'format_color_fill',
        shortcut: 'G',
        action: 'toggleOfflineBucket',
        ref: 'btn-offline-bucket'
    },
    spray: {
        id: 'spray',
        nameKey: 'tooltip_spray',
        icon: 'grain',
        shortcut: 'A',
        action: 'toggleOfflineSpray',
        ref: 'btn-offline-spray',
        subtoolbar: {
            id: 'spray',
            action: 'setSpraySize',
            dataAttr: 'data-size',
            default: 5,
            isSizes: true,
            tiers: {
                small:  [2, 4, 6, 10, 15],
                medium: [2, 5, 10, 20, 35],
                large:  [5, 15, 30, 60, 100]
            }
        }
    },
    eraser: {
        id: 'eraser',
        nameKey: 'tooltip_eraser',
        icon: 'cleaning_services',
        shortcut: 'E',
        action: 'toggleOfflineEraser',
        ref: 'btn-offline-eraser',
        subtoolbar: {
            id: 'eraser',
            action: 'setOfflineEraserMode',
            dataAttr: 'data-eraser-mode',
            default: 'box',
            options: [
                { id: 'box',   icon: 'highlight_alt', ref: 'btn-eraser-mode-box',   nameKey: 'tooltip_eraser_box' },
                { id: 'brush', icon: 'draw',          ref: 'btn-eraser-mode-brush', nameKey: 'tooltip_eraser_brush' }
            ]
        },
        sizes: {
            id: 'eraser',
            action: 'setBrushEraserSize',
            default: 1,
            showIfMode: 'brush',
            tiers: {
                small:  [1, 2, 4, 8, 16],
                medium: [1, 5, 10, 25, 50],
                large:  [1, 10, 25, 50, 100, 200]
            }
        }
    },
    dither: {
        id: 'dither',
        nameKey: 'tooltip_dither',
        icon: 'texture',
        shortcut: 'D',
        action: 'toggleOfflineDither',
        ref: 'btn-offline-dither',
        subtoolbar: {
            id: 'dither',
            action: 'setDitherPattern',
            dataAttr: 'data-dither-pattern',
            default: 'checker_50',
            options: [
                { id: 'checker_50', icon: 'grid_view', nameKey: 'tooltip_dither_checker' },
                { id: 'dots_25',    icon: 'blur_on',   nameKey: 'tooltip_dither_dots25' },
                { id: 'dots_75',    icon: 'gradient',  nameKey: 'tooltip_dither_dots75' },
                { id: 'diag_lines', icon: 'line_axis', nameKey: 'tooltip_dither_diag' },
                { id: 'h_lines',    icon: 'reorder',    nameKey: 'tooltip_dither_hlines' }
            ]
        },
        sizes: {
            id: 'dither',
            action: 'setDitherSize',
            default: 1,
            tiers: {
                small:  [1, 2, 3, 5, 10],
                medium: [1, 3, 5, 10, 20],
                large:  [1, 5, 10, 20, 50]
            }
        }
    },
    shading: {
        id: 'shading',
        nameKey: 'tooltip_shading',
        icon: 'exposure',
        shortcut: 'S',
        action: 'toggleOfflineShading',
        ref: 'btn-offline-shading',
        subtoolbar: {
            id: 'shading',
            action: 'setShadingMode',
            dataAttr: 'data-shading-mode',
            default: 'shadow',
            options: [
                { id: 'shadow',    icon: 'brightness_low',  nameKey: 'tooltip_shading_shadow' },
                { id: 'highlight', icon: 'brightness_high', nameKey: 'tooltip_shading_highlight' }
            ]
        },
        sizes: {
            id: 'shading',
            action: 'setShadingSize',
            default: 1,
            tiers: {
                small:  [1, 2, 3, 5],
                medium: [1, 2, 4, 8, 12],
                large:  [1, 2, 5, 10, 20]
            }
        }
    },
    shapes: {
        id: 'shapes',
        nameKey: 'tooltip_shapes',
        icon: 'shapes',
        shortcut: 'V',
        action: 'toggleMenuInModule',
        moduleTarget: 'moduleDesignTools',
        menuTarget: 'menu-shapes',
        ref: 'btn-offline-shapes'
    },
    text: {
        id: 'text',
        nameKey: 'tooltip_text_tool',
        icon: 'title',
        shortcut: 'Y',
        action: 'toggleMenuInModule',
        moduleTarget: 'moduleDesignTools',
        menuTarget: 'menu-text',
        ref: 'btn-offline-text'
    },
    stickers: {
        id: 'stickers',
        nameKey: 'tooltip_stickers',
        icon: 'category',
        shortcut: 'F',
        action: 'toggleMenuInModule',
        moduleTarget: 'moduleDesignTools',
        menuTarget: 'menu-stickers',
        ref: 'btn-offline-stickers'
    },
    tilegrid: {
        id: 'tilegrid',
        nameKey: 'tooltip_tile_grid',
        icon: 'grid_on',
        shortcut: 'Z',
        action: 'toggleTileGrid',
        ref: 'btn-tile-grid',
        subtoolbar: {
            id: 'tilegrid',
            action: 'setTileGridLevel',
            dataAttr: 'data-grid-size',
            default: 0,
            isLevels: true,
            tiers: {
                small:  [0, 4, 8, 16],
                medium: [0, 8, 16, 32, 64],
                large:  [0, 16, 32, 64, 128, 256]
            }
        }
    }
};

export function getCanvasTier(width = 64, height = 64) {
    const maxDim = Math.max(parseInt(width, 10) || 64, parseInt(height, 10) || 64);
    if (maxDim <= 128) return 'small';
    if (maxDim <= 512) return 'medium';
    return 'large';
}

export function getToolSizes(toolId, tier = 'medium') {
    const tool = OfflineToolsConfig[toolId];
    if (tool && tool.sizes && tool.sizes.tiers) {
        return tool.sizes.tiers[tier] || tool.sizes.tiers['medium'] || [];
    }
    return [];
}

export function getSprayRadii(tier = 'medium') {
    const spray = OfflineToolsConfig.spray;
    if (spray && spray.subtoolbar && spray.subtoolbar.tiers) {
        return spray.subtoolbar.tiers[tier] || spray.subtoolbar.tiers['medium'] || [];
    }
    return [2, 5, 10, 20, 35];
}

export function getTileGridLevels(tier = 'medium') {
    const tilegrid = OfflineToolsConfig.tilegrid;
    if (tilegrid && tilegrid.subtoolbar && tilegrid.subtoolbar.tiers) {
        return tilegrid.subtoolbar.tiers[tier] || tilegrid.subtoolbar.tiers['medium'] || [];
    }
    return [0, 8, 16, 32, 64];
}
