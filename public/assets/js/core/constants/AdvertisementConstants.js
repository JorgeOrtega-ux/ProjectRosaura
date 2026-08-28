/**
 * Constantes y Catálogo Centralizado de Publicidad de Spriteboard
 */

export const AdvertisementFormats = Object.freeze({
    FEED: 'feed',
    MODULE_COLORS: 'module_colors',
    MODULE_TEMPLATES: 'module_templates'
});

export const AdvertisementEvents = Object.freeze({
    IMPRESSION: 'impression',
    CLICK: 'click',
    VIDEO_VIEW: 'video_view',
    CONVERSION: 'conversion'
});

export const AdvertisementStatuses = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PAUSED: 'paused',
    EXPIRED: 'expired'
});

export const AdvertisementGeoModes = Object.freeze({
    ALL: 'all',
    ALLOW: 'allow',
    BLOCK: 'block'
});

export const AdvertisementProviderTypes = Object.freeze({
    DIRECT: 'direct',
    NETWORK: 'network'
});

export const ADVERTISEMENT_FORMATS = Object.freeze([
    {
        id: AdvertisementFormats.FEED,
        labelKey: 'admin_ad_format_feed',
        descKey: 'admin_ad_format_feed_desc',
        defaultLabel: 'Feed: Home, Búsqueda y Capturas',
        icon: 'view_carousel',
        zone: 'feed'
    },
    {
        id: AdvertisementFormats.MODULE_COLORS,
        labelKey: 'admin_ad_format_module_colors',
        descKey: 'admin_ad_format_module_colors_desc',
        defaultLabel: 'Módulo: Paleta de Colores',
        icon: 'palette',
        zone: 'module_colors'
    },
    {
        id: AdvertisementFormats.MODULE_TEMPLATES,
        labelKey: 'admin_ad_format_module_templates',
        descKey: 'admin_ad_format_module_templates_desc',
        defaultLabel: 'Módulo: Plantillas',
        icon: 'dashboard_customize',
        zone: 'module_templates'
    }
]);

export function getFormatDefinition(formatId) {
    return ADVERTISEMENT_FORMATS.find(f => f.id === formatId) || ADVERTISEMENT_FORMATS[0];
}

export function getFormatIcon(formatId) {
    const def = getFormatDefinition(formatId);
    return def ? def.icon : 'view_carousel';
}

export function getFormatLabel(formatId, translateFn = null) {
    const def = getFormatDefinition(formatId);
    if (!def) return formatId;
    if (typeof translateFn === 'function') {
        return translateFn(def.labelKey) || def.defaultLabel;
    }
    if (typeof window.__ === 'function') {
        return window.__(def.labelKey) || def.defaultLabel;
    }
    return def.defaultLabel;
}
