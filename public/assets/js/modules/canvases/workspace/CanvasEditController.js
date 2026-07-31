import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton, getDynamicTierName } from '../../../core/utils/uiUtils.js';

function getAllPalettes() {
    let palettes = [];
    if (window.APP_PALETTES) {
        palettes = Object.values(window.APP_PALETTES);
    }
    if (window.APP_CUSTOM_PALETTES && Array.isArray(window.APP_CUSTOM_PALETTES)) {
        window.APP_CUSTOM_PALETTES.forEach(cp => {
            palettes.push({
                id: cp.palette_key,
                name_key: cp.name,
                colors: cp.colors.map(c => ({ hex: c }))
            });
        });
    }
    return palettes;
}

class CanvasEditController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.container = null;
        this.canvasId = null;
        this.basePath = window.AppBasePath || '';

        this.state = {
            name: '',
            privacy: 'private',
            palette_id: 'default',
            max_members: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10,
            allow_purchases: 1,
            is_official: 0
        };

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="canvas-edit-wrapper"]');
        if (!this.container) return;

        this.canvasId = this.container.getAttribute('data-canvas-id');

        this.abortController = new AbortController();
        
        if (!this.canvasId) {
            showMessage(window.__('err_invalid_canvas_id'), 'error');
            return;
        }
        
        this.bindEvents();
        this.hydrateStateFromDOM();

        if (this.canvasId.startsWith('sandbox_')) {
            this.loadSandboxData();
            const cloudBlocks = this.container.querySelectorAll('[data-compatible="cloud"]');
            cloudBlocks.forEach(el => {
                el.classList.add('disabled');
            });
        }
    }

    loadSandboxData() {
        const realUuid = this.canvasId.replace('sandbox_', '');
        let localList = [];
        try {
            const listJson = localStorage.getItem('rosaura_sandboxes_list');
            if (listJson) localList = JSON.parse(listJson);
        } catch (e) {}

        const match = localList.find(s => s.uuid === realUuid);
        if (match) {
            this.state.name = match.name || 'Sandbox';
            this.state.palette_id = match.palette || 'default';
            this.state.cooldown_pixels_batch = match.cooldownBatch || 100;

            // Update DOM display values
            const nameInput = this.container.querySelector('[data-ref="input-canvasname"]');
            if (nameInput) {
                nameInput.value = this.state.name;
                nameInput.setAttribute('data-original-value', this.state.name);
            }
            const nameDisplay = this.container.querySelector('[data-ref="display-canvasname"]');
            if (nameDisplay) nameDisplay.textContent = this.state.name;

            const batchVal = this.container.querySelector('[data-ref="val_cooldown_batch"]');
            if (batchVal) {
                batchVal.textContent = this.state.cooldown_pixels_batch;
                batchVal.setAttribute('data-val', this.state.cooldown_pixels_batch);
            }

            const textPalette = this.container.querySelector('[data-ref="text-palette"]');
            if (textPalette) {
                textPalette.setAttribute('data-current-palette', this.state.palette_id);
            }
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    hydrateStateFromDOM() {
        const nameInput = this.container.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) this.state.name = nameInput.value.trim();

        const limitVal = this.container.querySelector('[data-ref="val_limit"]');
        if (limitVal) this.state.max_members = parseInt(limitVal.getAttribute('data-val'), 10) || 10;

        const batchVal = this.container.querySelector('[data-ref="val_cooldown_batch"]');
        if (batchVal) this.state.cooldown_pixels_batch = parseInt(batchVal.getAttribute('data-val'), 10) || 5;

        const secVal = this.container.querySelector('[data-ref="val_cooldown_seconds"]');
        if (secVal) this.state.cooldown_seconds = parseInt(secVal.getAttribute('data-val'), 10) || 10;

        const activePrivacy = this.container.querySelector('[data-type="privacy"].active');
        if (activePrivacy) this.state.privacy = activePrivacy.getAttribute('data-value');

        const textPalette = this.container.querySelector('[data-ref="text-palette"]');
        if (textPalette) {
            this.state.palette_id = textPalette.getAttribute('data-current-palette') || 'default';
        }

        const allowPurchasesInput = this.container.querySelector('[data-ref="val_allow_purchases"]');
        if (allowPurchasesInput) {
            this.state.allow_purchases = allowPurchasesInput.checked ? 1 : 0;
        }

        const officialToggle = this.container.querySelector('[data-ref="val_is_official"]');
        if (officialToggle) {
            this.state.is_official = officialToggle.checked ? 1 : 0;
        }

        this.renderPalettes();
    }

    handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        
        if (typeof this[action] === 'function') {
            this[action](btn, e);
        }
    }

    saveCanvasName(btn) {
        const container = btn.closest('.component-group-item--stateful');
        if (!container) return;

        const inputEl = container.querySelector('[data-ref="input-canvasname"]');
        const displayEl = container.querySelector('[data-ref="display-canvasname"]');

        if (inputEl && displayEl) {
            const newName = inputEl.value.trim();
            if (newName !== '') {
                displayEl.textContent = newName;
                inputEl.setAttribute('data-original-value', newName);
                this.state.name = newName;
            } else {
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
        }
    }

    renderPalettes() {
        const container = this.container.querySelector('[data-ref="palette-selector-container"]');
        if (!container) return;

        const palettes = getAllPalettes();
        container.innerHTML = '';

        let activePaletteName = window.__('lbl_palette');
        
        const userTier = window.APP_USER?.subscription_tier ?? 0;
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        palettes.forEach(palette => {
            const isDefault = palette.id === 'default';
            let fallbackTier = 0;
            if (!isDefault && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                const paid = [...window.APP_TIERS].filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false).sort((a,b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
                if (paid.length > 0) fallbackTier = parseInt(paid[0].tier_level, 10);
            }
            const reqTier = palette.tier !== undefined ? palette.tier : (isDefault ? 0 : fallbackTier);
            const isLocked = isDefault ? false : (palette.id.startsWith('custom_') || palette.is_custom ? !canUseCustomPalettes : (userTier < reqTier));

            const translatedName = window.__ ? window.__(palette.name_key) : palette.id;

            const isActive = this.state.palette_id === palette.id;
            if (isActive) activePaletteName = translatedName;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''} ${isLocked ? 'disabled-interaction' : ''}`;
            btn.setAttribute('data-action', isLocked ? '' : 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', translatedName);
            
            if (isLocked) {
                btn.classList.add('disabled-interaction');
                btn.title = window.__('tooltip_upgrade_palette');
            }

            const tierName = getDynamicTierName(reqTier);
            const lockHtml = isLocked ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${tierName}</span>` : '';

            btn.innerHTML = `
                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                <div class="component-menu-link-text">
                    <span>${translatedName}</span>
                </div>
                ${lockHtml}
            `;
            container.appendChild(btn);
        });

        const triggerWrapper = container.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-palette"]');
            if (textRef) {
                textRef.textContent = activePaletteName;
                textRef.setAttribute('data-current-palette', this.state.palette_id);
            }
        }
    }

    selectPalette(btn) {
        this.state.palette_id = btn.getAttribute('data-palette-id');
        const paletteName = btn.getAttribute('data-palette-name');

        const menu = btn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('[data-ref="text-palette"]');
            if (triggerText) {
                triggerText.textContent = paletteName;
                triggerText.setAttribute('data-current-palette', this.state.palette_id);
            }

            const dropdownModule = dropdownWrapper.querySelector('.component-module--dropdown');
            if(dropdownModule) {
                dropdownModule.classList.remove('active');
                dropdownModule.classList.add('disabled');
            }
        }
    }

    async loadCanvasData() {
        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasId }, this.abortController.signal);
            if (response.aborted) return;
            if (response && response.success) {
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    toggleDropdown(btn) {
        const targetId = btn.getAttribute('data-target');
        const dropdown = this.container.querySelector(`[data-module="${targetId}"]`);
        
        if (dropdown) {
            const isActive = dropdown.classList.contains('active');
            
            this.container.querySelectorAll('.component-module--dropdown').forEach(d => {
                d.classList.remove('active');
                d.classList.add('disabled');
            });
            
            if (!isActive) {
                dropdown.classList.remove('disabled');
                dropdown.classList.add('active');
            }
        }
    }

    toggleTag(btn) {
        if (!this.state.tags) this.state.tags = [];
        const val = btn.getAttribute('data-value');
        const isSelected = this.state.tags.includes(val);
        
        if (isSelected) {
            this.state.tags = this.state.tags.filter(t => t !== val);
            btn.classList.remove('active');
            const icon = btn.querySelector('[data-ref="icon-check"]');
            if (icon) icon.textContent = 'check_box_outline_blank';
        } else {
            if (this.state.tags.length >= 8) {
                showMessage(window.__('msg_max_tags'), 'warning');
                return;
            }
            this.state.tags.push(val);
            btn.classList.add('active');
            const icon = btn.querySelector('[data-ref="icon-check"]');
            if (icon) icon.textContent = 'check_box';
        }

        const triggerWrapper = btn.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-tags"]');
            if (textRef) {
                if (this.state.tags.length > 0) {
                    textRef.textContent = `${this.state.tags.length} seleccionadas`;
                } else {
                    textRef.textContent = window.__('ph_select_tags');
                }
            }
        }
    }


    selectValue(btn) {
        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');
        const label = btn.getAttribute('data-label');
        const icon = btn.getAttribute('data-icon');

        if (type === 'privacy') {
            this.state.privacy = value;
            
            const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
            if (dropdownWrapper) {
                const textRef = dropdownWrapper.querySelector('[data-ref="text-privacy"]');
                const iconRef = dropdownWrapper.querySelector('[data-ref="icon-privacy"]');
                
                if(textRef) textRef.textContent = window.__(label);
                if(iconRef) iconRef.textContent = icon;
                
                const menu = btn.closest('.component-menu-list');
                if (menu) {
                    menu.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
                    btn.classList.add('active');
                }

                const dropdownModule = dropdownWrapper.querySelector('.component-module--dropdown');
                if(dropdownModule) {
                    dropdownModule.classList.remove('active');
                    dropdownModule.classList.add('disabled');
                }
            }
        }
    }

    adjustLimit(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 10, 10);
        const max = parseInt(btn.getAttribute('data-max') || 50000, 10);
        const valRef = this.container.querySelector('[data-ref="val_limit"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10);
            let newVal = currentVal + step;
            
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            
            this.state.max_members = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    adjustCooldownBatch(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 1, 10);
        const max = parseInt(btn.getAttribute('data-max') || 100, 10);
        const valRef = this.container.querySelector('[data-ref="val_cooldown_batch"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            
            this.state.cooldown_pixels_batch = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    adjustCooldownSeconds(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 0, 10);
        const max = parseInt(btn.getAttribute('data-max') || 3600, 10);
        const valRef = this.container.querySelector('[data-ref="val_cooldown_seconds"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            
            this.state.cooldown_seconds = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    navigateCustomPalette() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/canvases/palettes/create`);
        } else {
            window.location.href = `${this.basePath}/canvases/palettes/create`;
        }
    }

    async updateCanvas(btn) {
        const nameInput = this.container.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) {
            this.state.name = nameInput.value.trim();
        }

        const inputBatch = this.container.querySelector('[data-ref="val_cooldown_batch"]');
        if (inputBatch) {
            this.state.cooldown_pixels_batch = parseInt(inputBatch.getAttribute('data-val'), 10) || 5;
        }

        const inputSec = this.container.querySelector('[data-ref="val_cooldown_seconds"]');
        if (inputSec) {
            this.state.cooldown_seconds = parseInt(inputSec.getAttribute('data-val'), 10) || 10;
        }

        const allowPurchasesInput = this.container.querySelector('[data-ref="val_allow_purchases"]');
        if (allowPurchasesInput) {
            this.state.allow_purchases = allowPurchasesInput.checked ? 1 : 0;
        }

        const allowChatInput = this.container.querySelector('[data-ref="val_allow_chat"]');
        if (allowChatInput) {
            this.state.allow_chat = allowChatInput.checked ? 1 : 0;
        }

        const inputOfficial = this.container.querySelector('[data-ref="val_is_official"]');
        if (inputOfficial) {
            this.state.is_official = inputOfficial.checked ? 1 : 0;
        }

        if (!this.state.name) {
            showMessage(window.__('err_field_required'), 'warning');
            return;
        }

        if (this.canvasId.startsWith('sandbox_')) {
            setButtonLoading(btn);
            const realUuid = this.canvasId.replace('sandbox_', '');

            // 1. Optional: Sync state if user is logged in and sandbox exists on server
            const activeUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
            let syncSuccess = false;
            if (activeUserId) {
                try {
                    const syncRes = await this.api.post('sandbox.sync_state', {
                        uuid: realUuid,
                        settings: {
                            name: this.state.name,
                            paletteId: this.state.palette_id,
                            cooldownBatch: this.state.cooldown_pixels_batch
                        }
                    });
                    if (syncRes && syncRes.success) {
                        syncSuccess = true;
                    }
                } catch(e) {}
            }

            // 2. Update localStorage list
            let localList = [];
            try {
                const listJson = localStorage.getItem('rosaura_sandboxes_list');
                if (listJson) localList = JSON.parse(listJson);
            } catch (e) {}

            const match = localList.find(s => s.uuid === realUuid);
            if (match) {
                match.name = this.state.name;
                match.palette = this.state.palette_id;
                match.cooldownBatch = this.state.cooldown_pixels_batch;
                if (syncSuccess) {
                    match.syncedAt = Date.now();
                }
                localStorage.setItem('rosaura_sandboxes_list', JSON.stringify(localList));
            }

            // 3. Update IndexedDB Settings
            try {
                const DesignSandboxDbModule = await import('../../app/design/DesignSandboxDb.js');
                const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
                const settings = await DesignSandboxDb.getSettings(realUuid);
                if (settings) {
                    settings.name = this.state.name;
                    settings.paletteId = this.state.palette_id;
                    settings.cooldownBatch = this.state.cooldown_pixels_batch;
                    await DesignSandboxDb.saveSettings(settings, realUuid);
                }
            } catch (e) {
                console.error('[Sandbox Edit] Failed to save settings to IndexedDB:', e);
            }

            restoreButton(btn);
            showMessage('Cambios guardados con éxito', 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(`${this.basePath}/canvases/manage`);
                else window.location.href = `${this.basePath}/canvases/manage`;
            }, 1000);
            return;
        }

        const activeTags = Array.from(this.container.querySelectorAll('[data-action="toggleTag"].active')).map(el => el.getAttribute('data-value'));

        const payload = {
            id: this.canvasId, 
            name: this.state.name,
            privacy: this.state.privacy,
            palette_id: this.state.palette_id,
            max_members: this.state.max_members,
            cooldown_pixels_batch: this.state.cooldown_pixels_batch,
            cooldown_seconds: this.state.cooldown_seconds,
            allow_purchases: this.state.allow_purchases,
            allow_chat: this.state.allow_chat,
            is_official: this.state.is_official,
            tags: activeTags
        };

        setButtonLoading(btn);

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Update, payload, this.abortController.signal);

            if (response.aborted) return;

            if (response && response.success) {
                showMessage(window.__('canvas_update_success'), 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_update_canvas'), 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

export { CanvasEditController };