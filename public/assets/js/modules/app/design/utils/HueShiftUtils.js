/**
 * HueShiftUtils.js
 * Generador de rampas de sombreado e iluminación con desplazamiento de matiz (Hue-Shifting)
 * para Project Rosaura Pixel Art Studio.
 */

import { hexToHsv, hsvToHex } from '../../../../core/utils/uiUtils.js';

export const HUE_SHIFT_PRESETS = {
    warm_cool: {
        id: 'warm_cool',
        nameKey: 'lbl_hue_preset_warm_cool',
        defaultName: 'Cálido / Frío',
        icon: 'wb_sunny',
        lightHueTarget: 55,   // Amarillo / Oro
        shadowHueTarget: 250, // Azul / Violeta
        stepH: 8,
        stepS: 6,
        stepV: 18
    },
    night_cyber: {
        id: 'night_cyber',
        nameKey: 'lbl_hue_preset_night',
        defaultName: 'Nocturno / Frío',
        icon: 'bedtime',
        lightHueTarget: 180,  // Cian
        shadowHueTarget: 265, // Azul Marino
        stepH: 10,
        stepS: 8,
        stepV: 20
    },
    organic: {
        id: 'organic',
        nameKey: 'lbl_hue_preset_organic',
        defaultName: 'Orgánico',
        icon: 'forest',
        lightHueTarget: 50,   // Luz Solar Cálida
        shadowHueTarget: 140, // Verde Sombra / Tierra
        stepH: 7,
        stepS: 7,
        stepV: 17
    },
    neutral: {
        id: 'neutral',
        nameKey: 'lbl_hue_preset_neutral',
        defaultName: 'Monocromático',
        icon: 'contrast',
        lightHueTarget: null,
        shadowHueTarget: null,
        stepH: 0,
        stepS: 4,
        stepV: 18
    }
};

/**
 * Calcula la distancia y dirección angular más corta entre dos tonos de matiz (0-360)
 */
function getShortestHueDelta(currentHue, targetHue) {
    let diff = (targetHue - currentHue + 360) % 360;
    if (diff > 180) diff -= 360;
    return diff;
}

/**
 * Genera una rampa de 5 tonos alrededor del color base
 * [-2: Sombra Profunda, -1: Sombra, 0: Base, 1: Luz, 2: Brillo Máximo]
 */
export function generateColorRamp(baseHex, presetKey = 'warm_cool') {
    if (!baseHex || typeof baseHex !== 'string') {
        baseHex = '#FF0000';
    }
    baseHex = baseHex.trim().toUpperCase();
    if (!baseHex.startsWith('#')) baseHex = '#' + baseHex;

    const preset = HUE_SHIFT_PRESETS[presetKey] || HUE_SHIFT_PRESETS.warm_cool;
    const baseHsv = hexToHsv(baseHex);

    const steps = [
        { index: -2, role: 'deep_shadow', nameKey: 'lbl_deep_shadow', defaultLabel: 'Sombra Profunda' },
        { index: -1, role: 'shadow',      nameKey: 'lbl_shadow',      defaultLabel: 'Sombra' },
        { index:  0, role: 'base',        nameKey: 'lbl_base_color',  defaultLabel: 'Color Base' },
        { index:  1, role: 'light',       nameKey: 'lbl_light',       defaultLabel: 'Luz' },
        { index:  2, role: 'highlight',   nameKey: 'lbl_highlight',   defaultLabel: 'Brillo' }
    ];

    return steps.map(step => {
        if (step.index === 0) {
            return {
                ...step,
                hex: baseHex,
                hsv: baseHsv,
                isBase: true
            };
        }

        const isLight = step.index > 0;
        const multiplier = Math.abs(step.index);

        let h = baseHsv.h;
        let s = baseHsv.s;
        let v = baseHsv.v;

        if (preset.lightHueTarget !== null && isLight) {
            const deltaH = getShortestHueDelta(baseHsv.h, preset.lightHueTarget);
            const shift = Math.sign(deltaH) * Math.min(Math.abs(deltaH), preset.stepH * multiplier);
            h = (baseHsv.h + shift + 360) % 360;
            // Luces: reducir saturación ligeramente para iluminar y aumentar brillo
            s = Math.max(5, Math.min(100, baseHsv.s - (preset.stepS * multiplier)));
            v = Math.min(100, baseHsv.v + (preset.stepV * multiplier));
        } else if (preset.shadowHueTarget !== null && !isLight) {
            const deltaH = getShortestHueDelta(baseHsv.h, preset.shadowHueTarget);
            const shift = Math.sign(deltaH) * Math.min(Math.abs(deltaH), preset.stepH * multiplier);
            h = (baseHsv.h + shift + 360) % 360;
            // Sombras: aumentar saturación (sombras ricas en color) y reducir brillo
            s = Math.min(100, Math.max(10, baseHsv.s + (preset.stepS * multiplier * 0.75)));
            v = Math.max(5, baseHsv.v - (preset.stepV * multiplier));
        } else {
            // Preset Neutro / Monocromático
            if (isLight) {
                s = Math.max(0, baseHsv.s - (preset.stepS * multiplier));
                v = Math.min(100, baseHsv.v + (preset.stepV * multiplier));
            } else {
                s = Math.min(100, baseHsv.s + (preset.stepS * multiplier * 0.5));
                v = Math.max(5, baseHsv.v - (preset.stepV * multiplier));
            }
        }

        const hex = hsvToHex(Math.round(h), Math.round(s), Math.round(v));
        return {
            ...step,
            hex,
            hsv: { h: Math.round(h), s: Math.round(s), v: Math.round(v) },
            isBase: false
        };
    });
}
