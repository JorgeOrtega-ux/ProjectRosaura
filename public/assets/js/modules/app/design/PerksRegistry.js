/**
 * PerksRegistry - Centralized perk configuration and helpers.
 * Single source of truth for all perk metadata in the frontend.
 * 
 * Usage:
 *   import { PerksRegistry } from './PerksRegistry.js';
 *   // or attach to controller: this.perksRegistry = PerksRegistry;
 * 
 * All perk data is loaded from /assets/data/perks.json.
 * To add a new perk, simply add its entry to perks.json - no other JS files need editing.
 */

let _perksConfig = null;
let _loadPromise = null;

const PERK_DISPLAY_ORDER = [
    'no_cooldown_10s',
    'pixel_protection_25',
    'elite_eraser_25',
    'pixel_misil_1',
    'bomba_pixel_1',
    'bomba_atomica_1',
    'bomba_racimo_1',
    'lluvia_meteoritos_1'
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
                console.error('[PerksRegistry] Failed to load perks.json:', err);
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

    // ──────────────────────────────────────
    // Warning badges (nuclear_warning)
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
        const keys = {
            'pixel_misil_1': 'btn_launch_missile',
            'bomba_pixel_1': 'btn_launch_bomb',
            'bomba_atomica_1': 'btn_launch_nuclear',
            'bomba_racimo_1': 'btn_launch_cluster',
            'lluvia_meteoritos_1': 'btn_launch_meteor'
        };
        const key = keys[perkId] || 'btn_launch';
        return (typeof window.__ === 'function' ? window.__(key) : key) || 'Launch';
    }
};

// Make available globally for non-module scripts
window.PerksRegistry = PerksRegistry;

export { PerksRegistry };
export default PerksRegistry;
