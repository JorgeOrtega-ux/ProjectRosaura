<?php

namespace App\Core\System;

class AdvertisementConstants {

    // --- Formatos de Anuncios y Ubicaciones ---
    public const FORMAT_FEED             = 'feed';
    public const FORMAT_MODULE_COLORS    = 'module_colors';
    public const FORMAT_MODULE_TEMPLATES = 'module_templates';

    // Lista estricta de formatos activos en la plataforma
    public const VALID_FORMATS = [
        self::FORMAT_FEED,
        self::FORMAT_MODULE_COLORS,
        self::FORMAT_MODULE_TEMPLATES
    ];

    // --- Tipos de Proveedor ---
    public const PROVIDER_TYPE_DIRECT  = 'direct';
    public const PROVIDER_TYPE_NETWORK = 'network';

    public const VALID_PROVIDER_TYPES = [
        self::PROVIDER_TYPE_DIRECT,
        self::PROVIDER_TYPE_NETWORK
    ];

    // --- Estados de Anuncio ---
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_PAUSED   = 'paused';
    public const STATUS_EXPIRED  = 'expired';

    public const VALID_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
        self::STATUS_PAUSED,
        self::STATUS_EXPIRED
    ];

    // --- Tipos de Eventos de Métricas ---
    public const EVENT_IMPRESSION = 'impression';
    public const EVENT_CLICK      = 'click';
    public const EVENT_VIDEO_VIEW = 'video_view';
    public const EVENT_CONVERSION = 'conversion';

    public const VALID_EVENTS = [
        self::EVENT_IMPRESSION,
        self::EVENT_CLICK,
        self::EVENT_VIDEO_VIEW,
        self::EVENT_CONVERSION
    ];

    // --- Modos de Segmentación Geográfica (Geo-Targeting) ---
    public const GEO_MODE_ALL   = 'all';
    public const GEO_MODE_ALLOW = 'allow';
    public const GEO_MODE_BLOCK = 'block';

    // --- Periodos de Reporte y Auditoría ---
    public const PERIOD_7   = '7';
    public const PERIOD_30  = '30';
    public const PERIOD_60  = '60';
    public const PERIOD_90  = '90';
    public const PERIOD_180 = '180';
    public const PERIOD_365 = '365';
    public const PERIOD_ALL = 'all';

    // --- Catálogo Descriptivo Centralizado de Formatos ---
    public const FORMAT_DEFINITIONS = [
        self::FORMAT_FEED => [
            'id'            => self::FORMAT_FEED,
            'label_key'     => 'admin_ad_format_feed',
            'desc_key'      => 'admin_ad_format_feed_desc',
            'default_label' => 'Feed: Home, Búsqueda y Capturas',
            'icon'          => 'view_carousel',
            'zone'          => 'feed',
            'target_views'  => ['/', '/home', '/search', '/design/s/:uuid']
        ],
        self::FORMAT_MODULE_COLORS => [
            'id'            => self::FORMAT_MODULE_COLORS,
            'label_key'     => 'admin_ad_format_module_colors',
            'desc_key'      => 'admin_ad_format_module_colors_desc',
            'default_label' => 'Módulo: Paleta de Colores',
            'icon'          => 'palette',
            'zone'          => 'module_colors',
            'target_views'  => ['/design/:id [menu-colors]']
        ],
        self::FORMAT_MODULE_TEMPLATES => [
            'id'            => self::FORMAT_MODULE_TEMPLATES,
            'label_key'     => 'admin_ad_format_module_templates',
            'desc_key'      => 'admin_ad_format_module_templates_desc',
            'default_label' => 'Módulo: Plantillas',
            'icon'          => 'dashboard_customize',
            'zone'          => 'module_templates',
            'target_views'  => ['/design/:id [menu-templates]']
        ]
    ];

    /**
     * Valida si un formato dado es un formato soportado y activo.
     */
    public static function isValidFormat(?string $format): bool {
        if ($format === null) return false;
        return in_array($format, self::VALID_FORMATS, true);
    }

    /**
     * Retorna la lista de formatos válidos.
     */
    public static function getValidFormats(): array {
        return self::VALID_FORMATS;
    }

    /**
     * Obtiene la definición completa de un formato.
     */
    public static function getFormatDefinition(string $format): ?array {
        return self::FORMAT_DEFINITIONS[$format] ?? null;
    }

    /**
     * Obtiene el icono de Material Symbols asociado a un formato.
     */
    public static function getFormatIcon(string $format): string {
        return self::FORMAT_DEFINITIONS[$format]['icon'] ?? 'view_carousel';
    }

    /**
     * Obtiene la clave de traducción de la etiqueta de un formato.
     */
    public static function getFormatLabelKey(string $format): string {
        return self::FORMAT_DEFINITIONS[$format]['label_key'] ?? 'admin_ad_format_feed';
    }

    /**
     * Obtiene la clave de traducción de la descripción de un formato.
     */
    public static function getFormatDescKey(string $format): string {
        return self::FORMAT_DEFINITIONS[$format]['desc_key'] ?? 'admin_ad_format_feed_desc';
    }

    /**
     * Obtiene un mapa asociativo [formato => etiqueta] para reportes o desplegables.
     */
    public static function getFormatLabels(): array {
        $labels = [];
        foreach (self::FORMAT_DEFINITIONS as $fmt => $def) {
            $labels[$fmt] = (function_exists('__') ? __($def['label_key']) : null) ?: $def['default_label'];
        }
        return $labels;
    }

    /**
     * Retorna el catálogo estructurado de formatos listo para serializar a JSON.
     */
    public static function getFormatsCatalog(): array {
        $catalog = [];
        foreach (self::FORMAT_DEFINITIONS as $fmt => $def) {
            $catalog[] = [
                'id'            => $def['id'],
                'labelKey'      => $def['label_key'],
                'descKey'       => $def['desc_key'],
                'label'         => (function_exists('__') ? __($def['label_key']) : null) ?: $def['default_label'],
                'icon'          => $def['icon'],
                'zone'          => $def['zone']
            ];
        }
        return $catalog;
    }
}
