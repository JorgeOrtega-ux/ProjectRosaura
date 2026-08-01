/**
 * PerksRegistry - Centralized perk configuration and helpers.
 * Single source of truth for all perk metadata in the frontend.
 * 
 * Usage:
 *   import { PerksRegistry } from './PerksRegistry.js';
 *   // or attach to controller: this.perksRegistry = PerksRegistry;
 * 
 * All perk data is loaded from /assets/data/perks.json.

 */

let _perksConfig = null;
let _loadPromise = null;

const PERK_DISPLAY_ORDER = [
    'pixel_misil_1',
    'bomba_pixel_1',
    'bomba_atomica_1',
    'bomba_racimo_1',
    'lluvia_meteoritos_1',
    'canon_orbital_1',
    'agujero_negro_1',
    'proteccion_pixeles_1',
    'minas_1'
];

const PerksRegistry = {

    /**
     * Load perks config from JSON. Returns cached data if already loaded.
     * @returns {Promise<Object>}
     */
    async load() {
        if (_perksConfig) return _perksConfig;
        if (_loadPromise) return _loadPromise;

        _loadPromise = fetch('/assets/data/perks.json')
            .then(r => r.json())
            .then(data => {
                _perksConfig = data;
                _loadPromise = null;
                return data;
            })
            .catch(err => {
                _loadPromise = null;
                return {};
            });

        return _loadPromise;
    },

    /**
     * Get raw config (sync, must call load() first).
     * @returns {Object}
     */
    getConfig() {
        return _perksConfig || {};
    },

    /**
     * Set config directly (useful if already fetched elsewhere).
     * @param {Object} config
     */
    setConfig(config) {
        _perksConfig = config;
    },

    /**
     * Get the display order for perk badges.
     * @returns {string[]}
     */
    getDisplayOrder() {
        return PERK_DISPLAY_ORDER;
    },

    /**
     * Get config for a specific perk.
     * @param {string} perkId
     * @returns {Object|null}
     */
    get(perkId) {
        return (_perksConfig || {})[perkId] || null;
    },

    // ──────────────────────────────────────
    // Type checks
    // ──────────────────────────────────────

    /**
     * @param {string} perkId
     * @returns {boolean}
     */
    isBomb(perkId) {
        const perk = this.get(perkId);
        return perk ? perk.type === 'bomb' : false;
    },

    /**
     * @param {string} perkId
     * @returns {boolean}
     */
    isBuff(perkId) {
        const perk = this.get(perkId);
        return perk ? perk.category === 'buff' : false;
    },

    /**
     * Get all bomb perk IDs.
     * @returns {string[]}
     */
    getBombIds() {
        const config = _perksConfig || {};
        return Object.keys(config).filter(id => config[id].type === 'bomb');
    },

    /**
     * Get all buff perk IDs (no_cooldown, protection, eraser).
     * @returns {string[]}
     */
    getBuffIds() {
        const config = _perksConfig || {};
        return Object.keys(config).filter(id => config[id].category === 'buff');
    },

    // ──────────────────────────────────────
    // UI Metadata
    // ──────────────────────────────────────

    /**
     * Get Material Symbols icon name.
     * @param {string} perkId
     * @returns {string}
     */
    getIcon(perkId) {
        const perk = this.get(perkId);
        return perk?.icon || 'stars';
    },

    /**
     * Get translated label (full name).
     * @param {string} perkId
     * @returns {string}
     */
    getLabel(perkId) {
        const perk = this.get(perkId);
        if (!perk?.label_key) return perkId;
        return (typeof window.__ === 'function' ? window.__(perk.label_key) : perk.label_key) || perkId;
    },

    /**
     * Get translated short label.
     * @param {string} perkId
     * @returns {string}
     */
    getShortLabel(perkId) {
        const perk = this.get(perkId);
        if (!perk?.short_label_key) return this.getLabel(perkId);
        return (typeof window.__ === 'function' ? window.__(perk.short_label_key) : perk.short_label_key) || this.getLabel(perkId);
    },

    /**
     * Get bomb target count (how many pixels to select).
     * @param {string} perkId
     * @returns {number}
     */
    getTargetCount(perkId) {
        const perk = this.get(perkId);
        return perk?.targets || 1;
    },

    /**
     * Get explosion radius for canvas dimensions.
     * @param {string} perkId
     * @param {number} boardWidth
     * @param {number} boardHeight
     * @returns {number}
     */
    getExplosionRadius(perkId, boardWidth = 64, boardHeight = 64) {
        const perk = this.get(perkId);
        if (!perk) return 10;
        
        const w = boardWidth || 64;
        const radii = perk.radii || {};
        
        if (radii[String(w)]) {
            return parseInt(radii[String(w)], 10);
        }
        
        const maxDim = Math.min(boardWidth || 64, boardHeight || 64);
        if (perkId === 'canon_orbital_1' || perkId === 'agujero_negro_1') {
            return Math.max(10, Math.floor(maxDim * 0.5));
        } else if (perkId === 'bomba_atomica_1') {
            return Math.max(6, Math.floor(maxDim * 0.38));
        } else if (perkId === 'bomba_racimo_1') {
            return Math.max(4, Math.floor(maxDim * 0.22));
        } else if (perkId === 'bomba_pixel_1') {
            return Math.max(3, Math.floor(maxDim * 0.14));
        } else if (perkId === 'lluvia_meteoritos_1') {
            return Math.max(3, Math.floor(maxDim * 0.12));
        } else {
            return Math.max(2, Math.floor(maxDim * 0.06));
        }
    },

    // ──────────────────────────────────────
    // Warning badges (bomb_warning)
    // ──────────────────────────────────────

    /**
     * Get warning badge details for a bomb perk.
     * @param {string} perkId
     * @returns {{ icon: string, text: string }}
     */
    getWarningDetails(perkId) {
        const perk = this.get(perkId);
        const icon = perk?.warning_icon || 'crisis_alert';
        const labelKey = perk?.warning_label_key || 'msg_nuke_incoming';
        const text = (typeof window.__ === 'function' ? window.__(labelKey) : labelKey) || 'Incoming!';
        return { icon, text };
    },

    // ──────────────────────────────────────
    // Explosion effects
    // ──────────────────────────────────────

    /**
     * Get explosion animation duration in ms.
     * @param {string} perkId
     * @returns {number}
     */
    getExplosionDuration(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.duration || 400;
    },

    /**
     * Get explosion visual style.
     * @param {string} perkId
     * @returns {'nuclear'|'medium'|'missile'}
     */
    getExplosionStyle(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.style || 'missile';
    },

    /**
     * @param {string} perkId
     * @returns {boolean}
     */
    hasScreenShake(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.screen_shake === true;
    },

    /**
     * Get screen shake duration in ms.
     * @param {string} perkId
     * @returns {number}
     */
    getShakeDuration(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.shake_duration || 0;
    },

    /**
     * @param {string} perkId
     * @returns {boolean}
     */
    hasScreenFlash(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.screen_flash === true;
    },

    /**
     * Get screen flash duration in ms.
     * @param {string} perkId
     * @returns {number}
     */
    getFlashDuration(perkId) {
        const perk = this.get(perkId);
        return perk?.explosion?.flash_duration || 0;
    },

    // ──────────────────────────────────────
    // Button label for bombing mode
    // ──────────────────────────────────────

    /**
     * Get the action button text for a bomb in bombing mode.
     * @param {string} perkId
     * @returns {string}
     */
    getBombButtonLabel(perkId) {
        const perk = this.get(perkId);
        const key = perk?.button_label_key || 'btn_launch';
        return (typeof window.__ === 'function' ? window.__(key) : key) || 'Launch';
    }
};

// Make available globally for non-module scripts
window.PerksRegistry = PerksRegistry;

export { PerksRegistry };
export default PerksRegistry;
