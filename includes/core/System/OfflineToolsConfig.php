<?php

namespace App\Core\System;

/**
 * OfflineToolsConfig - Catálogo central de herramientas offline de diseño.
 * Define la estructura, iconos, atajos, subtoolbars y tiers de tamaño adaptativos.
 */
class OfflineToolsConfig {

    public static function getTools(): array {
        return [
            'brush' => [
                'id'          => 'brush',
                'name_key'    => 'tooltip_brush',
                'icon'        => 'brush',
                'shortcut'    => 'B',
                'action'      => 'toggleOfflineBrush',
                'ref'         => 'btn-offline-brush',
                'subtoolbar'  => [
                    'id'          => 'brush',
                    'action'      => 'setBrushShape',
                    'data_attr'   => 'data-brush-shape',
                    'default'     => 'square',
                    'options'     => [
                        ['id' => 'square', 'icon' => 'square', 'name_key' => 'tooltip_brush_square'],
                        ['id' => 'circle', 'icon' => 'circle', 'name_key' => 'tooltip_brush_circle'],
                        ['id' => 'slash',  'icon' => 'edit',   'name_key' => 'tooltip_brush_slash'],
                        ['id' => 'pixel_perfect', 'icon' => 'auto_fix_high', 'name_key' => 'tooltip_pixel_perfect', 'action' => 'togglePixelPerfect', 'ref' => 'btn-brush-pixel-perfect'],
                    ]
                ],
                'sizes'       => [
                    'id'          => 'brush',
                    'action'      => 'setBrushSize',
                    'default'     => 1,
                    'tiers'       => [
                        'small'  => [1, 2, 3, 4, 6],
                        'medium' => [1, 2, 4, 8, 12, 16],
                        'large'  => [1, 2, 4, 8, 16, 32],
                    ]
                ]
            ],
            'quickShapes' => [
                'id'          => 'quickShapes',
                'name_key'    => 'tooltip_quick_shapes',
                'icon'        => 'polyline',
                'shortcut'    => 'U',
                'action'      => 'toggleOfflineQuickShapes',
                'ref'         => 'btn-offline-quick-shapes',
                'subtoolbar'  => [
                    'id'          => 'quickShapes',
                    'action'      => 'setQuickShapeType',
                    'data_attr'   => 'data-shape-type',
                    'default'     => 'line',
                    'options'     => [
                        ['id' => 'line',      'icon' => 'show_chart',             'name_key' => 'tooltip_shape_line'],
                        ['id' => 'rectangle', 'icon' => 'crop_din',               'name_key' => 'tooltip_shape_rectangle'],
                        ['id' => 'circle',    'icon' => 'radio_button_unchecked', 'name_key' => 'tooltip_shape_circle'],
                        ['id' => 'fill',      'icon' => 'format_paint',           'name_key' => 'tooltip_shape_mode_fill', 'action' => 'toggleQuickShapeFill', 'ref' => 'btn-quick-shape-fill'],
                    ]
                ],
                'sizes'       => [
                    'id'          => 'quickShapes',
                    'action'      => 'setQuickShapeStroke',
                    'default'     => 1,
                    'tiers'       => [
                        'small'  => [1, 2, 3, 4],
                        'medium' => [1, 2, 3, 4, 6],
                        'large'  => [1, 2, 4, 6, 8],
                    ]
                ]
            ],
            'mirror' => [
                'id'          => 'mirror',
                'name_key'    => 'tooltip_mirror_mode',
                'icon'        => 'flip',
                'shortcut'    => 'X',
                'action'      => 'toggleOfflineMirror',
                'ref'         => 'btn-offline-mirror',
                'subtoolbar'  => [
                    'id'          => 'mirror',
                    'action'      => 'setOfflineMirrorMode',
                    'data_attr'   => 'data-mirror-axis',
                    'default'     => 'x',
                    'options'     => [
                        ['id' => 'x',    'icon' => 'flip',           'name_key' => 'tooltip_mirror_x'],
                        ['id' => 'y',    'icon' => 'swap_vert',      'name_key' => 'tooltip_mirror_y'],
                        ['id' => 'quad', 'icon' => 'control_camera', 'name_key' => 'tooltip_mirror_quad'],
                    ]
                ]
            ],
            'moveArea' => [
                'id'          => 'moveArea',
                'name_key'    => 'tooltip_move_area',
                'icon'        => 'crop_free',
                'shortcut'    => 'M',
                'action'      => 'toggleOfflineMoveArea',
                'ref'         => 'btn-offline-move-area',
            ],
            'bucket' => [
                'id'          => 'bucket',
                'name_key'    => 'tooltip_bucket',
                'icon'        => 'format_color_fill',
                'shortcut'    => 'G',
                'action'      => 'toggleOfflineBucket',
                'ref'         => 'btn-offline-bucket',
                'subtoolbar'  => [
                    'id'          => 'bucket',
                    'action'      => 'setOfflineBucketMode',
                    'data_attr'   => 'data-bucket-mode',
                    'default'     => 'flood',
                    'options'     => [
                        ['id' => 'flood', 'icon' => 'format_color_fill', 'name_key' => 'tooltip_bucket_flood'],
                        ['id' => 'swap',  'icon' => 'change_circle',     'name_key' => 'tooltip_bucket_swap'],
                    ]
                ]
            ],
            'spray' => [
                'id'          => 'spray',
                'name_key'    => 'tooltip_spray',
                'icon'        => 'grain',
                'shortcut'    => 'A',
                'action'      => 'toggleOfflineSpray',
                'ref'         => 'btn-offline-spray',
                'subtoolbar'  => [
                    'id'          => 'spray',
                    'action'      => 'setSpraySize',
                    'data_attr'   => 'data-size',
                    'default'     => 5,
                    'is_sizes'    => true,
                    'tiers'       => [
                        'small'  => [2, 4, 6, 10, 15],
                        'medium' => [2, 5, 10, 20, 35],
                        'large'  => [5, 15, 30, 60, 100],
                    ]
                ]
            ],
            'eraser' => [
                'id'          => 'eraser',
                'name_key'    => 'tooltip_eraser',
                'icon'        => 'cleaning_services',
                'shortcut'    => 'E',
                'action'      => 'toggleOfflineEraser',
                'ref'         => 'btn-offline-eraser',
                'subtoolbar'  => [
                    'id'          => 'eraser',
                    'action'      => 'setOfflineEraserMode',
                    'data_attr'   => 'data-eraser-mode',
                    'default'     => 'box',
                    'options'     => [
                        ['id' => 'box',   'icon' => 'highlight_alt',   'ref' => 'btn-eraser-mode-box',   'name_key' => 'tooltip_eraser_box'],
                        ['id' => 'brush', 'icon' => 'draw',            'ref' => 'btn-eraser-mode-brush', 'name_key' => 'tooltip_eraser_brush'],
                        ['id' => 'color', 'icon' => 'auto_fix_normal', 'ref' => 'btn-eraser-mode-color', 'name_key' => 'tooltip_eraser_color'],
                    ]
                ],
                'sizes'       => [
                    'id'          => 'eraser',
                    'action'      => 'setBrushEraserSize',
                    'default'     => 1,
                    'show_if'     => 'brush',
                    'tiers'       => [
                        'small'  => [1, 2, 4, 8, 16],
                        'medium' => [1, 5, 10, 25, 50],
                        'large'  => [1, 10, 25, 50, 100, 200],
                    ]
                ]
            ],
            'dither' => [
                'id'          => 'dither',
                'name_key'    => 'tooltip_dither',
                'icon'        => 'texture',
                'shortcut'    => 'D',
                'action'      => 'toggleOfflineDither',
                'ref'         => 'btn-offline-dither',
                'subtoolbar'  => [
                    'id'          => 'dither',
                    'action'      => 'setDitherPattern',
                    'data_attr'   => 'data-dither-pattern',
                    'default'     => 'checker_50',
                    'options'     => [
                        ['id' => 'checker_50', 'icon' => 'grid_view', 'name_key' => 'tooltip_dither_checker'],
                        ['id' => 'dots_25',    'icon' => 'blur_on',   'name_key' => 'tooltip_dither_dots25'],
                        ['id' => 'dots_75',    'icon' => 'gradient',  'name_key' => 'tooltip_dither_dots75'],
                        ['id' => 'diag_lines', 'icon' => 'line_axis', 'name_key' => 'tooltip_dither_diag'],
                        ['id' => 'h_lines',    'icon' => 'reorder',    'name_key' => 'tooltip_dither_hlines'],
                    ]
                ],
                'sizes'       => [
                    'id'          => 'dither',
                    'action'      => 'setDitherSize',
                    'default'     => 1,
                    'tiers'       => [
                        'small'  => [1, 2, 3, 5, 10],
                        'medium' => [1, 3, 5, 10, 20],
                        'large'  => [1, 5, 10, 20, 50],
                    ]
                ]
            ],
            'shading' => [
                'id'          => 'shading',
                'name_key'    => 'tooltip_shading',
                'icon'        => 'exposure',
                'shortcut'    => 'S',
                'action'      => 'toggleOfflineShading',
                'ref'         => 'btn-offline-shading',
                'subtoolbar'  => [
                    'id'          => 'shading',
                    'action'      => 'setShadingMode',
                    'data_attr'   => 'data-shading-mode',
                    'default'     => 'shadow',
                    'options'     => [
                        ['id' => 'shadow',    'icon' => 'brightness_low',  'name_key' => 'tooltip_shading_shadow'],
                        ['id' => 'highlight', 'icon' => 'brightness_high', 'name_key' => 'tooltip_shading_highlight'],
                    ]
                ],
                'sizes'       => [
                    'id'          => 'shading',
                    'action'      => 'setShadingSize',
                    'default'     => 1,
                    'tiers'       => [
                        'small'  => [1, 2, 3, 5],
                        'medium' => [1, 2, 4, 8, 12],
                        'large'  => [1, 2, 5, 10, 20],
                    ]
                ]
            ],
            'shapes' => [
                'id'            => 'shapes',
                'name_key'      => 'tooltip_shapes',
                'icon'          => 'shapes',
                'shortcut'      => 'V',
                'action'        => 'toggleMenuInModule',
                'module_target' => 'moduleDesignTools',
                'menu_target'   => 'menu-shapes',
                'ref'           => 'btn-offline-shapes',
            ],
            'text' => [
                'id'            => 'text',
                'name_key'      => 'tooltip_text_tool',
                'icon'          => 'title',
                'shortcut'      => 'Y',
                'action'        => 'toggleOfflineText',
                'ref'           => 'btn-offline-text',
            ],
            'stickers' => [
                'id'            => 'stickers',
                'name_key'      => 'tooltip_stickers',
                'icon'          => 'category',
                'shortcut'      => 'F',
                'action'        => 'toggleMenuInModule',
                'module_target' => 'moduleDesignTools',
                'menu_target'   => 'menu-stickers',
                'ref'           => 'btn-offline-stickers',
            ],
            'tilegrid' => [
                'id'          => 'tilegrid',
                'name_key'    => 'tooltip_tile_grid',
                'icon'        => 'grid_on',
                'shortcut'    => 'Z',
                'action'      => 'toggleTileGrid',
                'ref'         => 'btn-tile-grid',
                'subtoolbar'  => [
                    'id'          => 'tilegrid',
                    'action'      => 'setTileGridLevel',
                    'data_attr'   => 'data-grid-size',
                    'default'     => 0,
                    'is_levels'   => true,
                    'tiers'       => [
                        'small'  => [0, 4, 8, 16],
                        'medium' => [0, 8, 16, 32, 64],
                        'large'  => [0, 16, 32, 64, 128, 256],
                    ]
                ]
            ]
        ];
    }
}
