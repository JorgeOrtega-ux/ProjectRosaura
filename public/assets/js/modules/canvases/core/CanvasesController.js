// public/assets/js/modules/canvases/CanvasesController.js

import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';

/**
 * Función helper local para obtener todas las paletas en formato Array.
 * Lee desde la variable global inyectada por PHP.
 */
function getAllPalettes() {
    if (!window.APP_PALETTES) return [];
    return Object.values(window.APP_PALETTES);
}

class CanvasesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.cardInteractions = null;
        
        this.formState = {
            name: '',
            description: '',
            size: '64',
            privacy: 'private',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10,
            scope_type: 'personal',
            scope_country: null,
            scope_state: null,
            scope_city: null
        };

        this.countriesLoaded = false;
        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        this.bindEvents();
        this.setupDefaultValues();
        this.renderPalettes();
        this.checkAdminPermissions();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
    }

    checkAdminPermissions() {
        let hasPerm = false;
        if (window.APP_CONFIG && window.APP_CONFIG.permissions) {
            const p = window.APP_CONFIG.permissions;
            hasPerm = p.includes('manage_canvases') || 
                      p.includes('access_admin_panel') || 
                      p.includes('canvases.manage_official') || 
                      p.includes('canvases.create_official');
        }

        const scopeSection = document.querySelector('[data-ref="scope-section"]');
        const scopeDivider = document.querySelector('[data-ref="scope-divider-main"]');

        if (scopeSection) {
            if (hasPerm) {
                scopeSection.classList.remove('disabled');
                if (scopeDivider) scopeDivider.classList.remove('disabled');
                
                this.handleScopeTypeChange('personal');
            } else {
                scopeSection.classList.add('disabled');
                if (scopeDivider) scopeDivider.classList.add('disabled');
            }
        }
    }

    setupDefaultValues() {
        const timestampName = `Canvas_${Date.now()}`;
        this.formState.name = timestampName;

        const displayEl = document.querySelector('[data-ref="display-canvasname"]');
        const inputEl = document.querySelector('[data-ref="input-canvasname"]');

        if (displayEl) displayEl.textContent = timestampName;
        if (inputEl) {
            inputEl.value = timestampName;
            inputEl.setAttribute('data-original-value', timestampName);
        }
    }

    renderPalettes() {
        const container = document.querySelector('[data-ref="palette-selector-container"]');
        if (!container) return;

        const palettes = getAllPalettes();
        container.innerHTML = '';

        let activePaletteName = window.__ ? window.__('lbl_loading') : '...';
        
        // Verificamos si el usuario tiene permiso para paletas premium
        const canUseCustomPalettes = window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true;

        palettes.forEach(palette => {
            const isDefault = palette.id === 'default';
            // Si no tiene el feature y no es la paleta por defecto, se bloquea la interacción
            const isLocked = !canUseCustomPalettes && !isDefault;
            
            const isActive = this.formState.palette_id === palette.id;
            if (isActive) activePaletteName = palette.name;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''} ${isLocked ? 'disabled-interactive' : ''}`;
            btn.setAttribute('data-action', isLocked ? '' : 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', palette.name);
            
            if (isLocked) {
                btn.style.opacity = '0.6';
                btn.title = "Mejora tu plan para usar esta paleta.";
            }

            let colorsHtml = '';
            const totalColors = palette.colors.length;
            const colorsToShow = Math.min(totalColors, 4);

            for (let i = 0; i < colorsToShow; i++) {
                colorsHtml += `<span style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${palette.colors[i]}; border:1px solid rgba(0,0,0,0.1); margin-right: -6px; position:relative; z-index:${10 - i};"></span>`;
            }

            if (totalColors > 4) {
                const remaining = totalColors - 4;
                colorsHtml += `<span style="display:inline-flex; align-items:center; justify-content:center; padding: 0 4px; min-width:16px; height:16px; border-radius:10px; background-color:var(--surface-hover); border:1px solid var(--border-color); font-size:10px; font-weight:600; color:var(--text-primary); margin-left: 4px; position:relative; z-index:0; box-sizing: border-box;">+${remaining}</span>`;
            }
            
            // Si está bloqueada, añadimos un ícono de candado junto al nombre
            const lockHtml = isLocked ? `<span class="material-symbols-rounded" style="font-size: 14px; margin-left: 6px; color: #ff8c00;">lock</span>` : '';

            btn.innerHTML = `
                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                <div class="component-menu-link-text" style="display:flex; align-items:center;">
                    <span>${palette.name}</span>
                    ${lockHtml}
                </div>
                <div class="component-menu-link-icon" style="width: auto; display: flex; align-items: center; margin-left: auto;">
                    ${colorsHtml}
                </div>
            `;
            container.appendChild(btn);
        });

        const triggerWrapper = container.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-palette"]');
            if (textRef) textRef.textContent = activePaletteName;
        }
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }

        if (action === 'toggleDropdown') {
            this.toggleDropdown(actionBtn);
        } else if (action === 'selectValue') {
            this.selectDropdownValue(actionBtn);
        } else if (action === 'adjustLimit') {
            this.adjustParticipantLimit(actionBtn);
        } else if (action === 'adjustCooldownBatch') {
            this.adjustCooldownBatch(actionBtn);
        } else if (action === 'adjustCooldownSeconds') {
            this.adjustCooldownSeconds(actionBtn);
        } else if (action === 'saveCanvasName') {
            this.saveCanvasName(actionBtn);
        } else if (action === 'selectPalette') {
            this.selectPalette(actionBtn);
        } else if (action === 'createCanvas') {
            e.preventDefault();
            this.submitCanvas(actionBtn);
        }
    }

    handleScopeTypeChange(type) {
        this.formState.scope_type = type;
        
        const refsToHide = [
            'scope-divider-country', 'scope-section-country',
            'scope-divider-state', 'scope-section-state',
            'scope-divider-city', 'scope-section-city',
            'scope-divider-org', 'scope-section-org'
        ];
        
        refsToHide.forEach(ref => {
            const el = document.querySelector(`[data-ref="${ref}"]`);
            if (el) el.classList.add('disabled');
        });

        if (type === 'organization') {
            document.querySelector('[data-ref="scope-divider-org"]')?.classList.remove('disabled');
            document.querySelector('[data-ref="scope-section-org"]')?.classList.remove('disabled');
        } else if (['country', 'state', 'municipality'].includes(type)) {
            document.querySelector('[data-ref="scope-divider-country"]')?.classList.remove('disabled');
            document.querySelector('[data-ref="scope-section-country"]')?.classList.remove('disabled');
            
            this.loadCountries();

            if (['state', 'municipality'].includes(type)) {
                document.querySelector('[data-ref="scope-divider-state"]')?.classList.remove('disabled');
                document.querySelector('[data-ref="scope-section-state"]')?.classList.remove('disabled');
            }
            if (type === 'municipality') {
                document.querySelector('[data-ref="scope-divider-city"]')?.classList.remove('disabled');
                document.querySelector('[data-ref="scope-section-city"]')?.classList.remove('disabled');
            }
        }
    }

    async loadCountries() {
        if (this.countriesLoaded) return;
        
        const listContainer = document.querySelector('[data-ref="list-scope-country"]');
        if (!listContainer) return;
        
        try {
            listContainer.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('lbl_loading')}</span></div></div>`;
            
            const result = await this.api.post(ApiRoutes.Locations.GetCountries, {}, this.abortController.signal);
            if (result && result.success) {
                listContainer.innerHTML = ''; 
                result.data.forEach(country => {
                    const html = `
                        <div class="component-menu-link" data-action="selectValue" data-type="scope_country" data-value="${country.id}" data-label="${country.name}" data-icon="flag">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">flag</span></div>
                            <div class="component-menu-link-text"><span>${country.name}</span></div>
                        </div>
                    `;
                    listContainer.insertAdjacentHTML('beforeend', html);
                });
                this.countriesLoaded = true;
            } else {
                listContainer.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('err_default')}</span></div></div>`;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {} 
        }
    }

    async handleCountryChange(countryId) {
        this.formState.scope_country = countryId;
        this.formState.scope_state = null;
        this.formState.scope_city = null;
        
        const stateText = document.querySelector('[data-ref="text-scope-state"]');
        if (stateText) stateText.textContent = window.__('canvas_scope_state_placeholder');
        
        const cityText = document.querySelector('[data-ref="text-scope-city"]');
        if (cityText) cityText.textContent = window.__('canvas_scope_city_placeholder');
        
        const listState = document.querySelector('[data-ref="list-scope-state"]');
        const listCity = document.querySelector('[data-ref="list-scope-city"]');
        
        if (listCity) listCity.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('lbl_loading')}</span></div></div>`;

        if (!countryId || !listState) return;

        try {
            listState.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('lbl_loading')}</span></div></div>`;
            
            const result = await this.api.post(ApiRoutes.Locations.GetStates, { id: countryId }, this.abortController.signal);
            if (result && result.success) {
                listState.innerHTML = '';
                result.data.forEach(state => {
                    const html = `
                        <div class="component-menu-link" data-action="selectValue" data-type="scope_state" data-value="${state.id}" data-label="${state.name}" data-icon="map">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">map</span></div>
                            <div class="component-menu-link-text"><span>${state.name}</span></div>
                        </div>
                    `;
                    listState.insertAdjacentHTML('beforeend', html);
                });
            } else {
                listState.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('err_default')}</span></div></div>`;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {}
        }
    }

    async handleStateChange(stateId) {
        this.formState.scope_state = stateId;
        this.formState.scope_city = null;
        
        const cityText = document.querySelector('[data-ref="text-scope-city"]');
        if (cityText) cityText.textContent = window.__('canvas_scope_city_placeholder');
        
        const listCity = document.querySelector('[data-ref="list-scope-city"]');
        if (!stateId || !listCity) return;

        try {
            listCity.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('lbl_loading')}</span></div></div>`;
            
            const result = await this.api.post(ApiRoutes.Locations.GetCities, { id: stateId }, this.abortController.signal);
            if (result && result.success) {
                listCity.innerHTML = '';
                result.data.forEach(city => {
                    const html = `
                        <div class="component-menu-link" data-action="selectValue" data-type="scope_city" data-value="${city.id}" data-label="${city.name}" data-icon="location_city">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">location_city</span></div>
                            <div class="component-menu-link-text"><span>${city.name}</span></div>
                        </div>
                    `;
                    listCity.insertAdjacentHTML('beforeend', html);
                });
            } else {
                listCity.innerHTML = `<div class="component-menu-link disabled"><div class="component-menu-link-text"><span>${window.__('err_default')}</span></div></div>`;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {}
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
                this.formState.name = newName;
            } else {
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
        }
    }

    toggleDropdown(triggerBtn) {
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) {
                el.classList.remove('active');
                el.classList.add('disabled');
            }
        });

        if (targetDropdown) {
            if (targetDropdown.classList.contains('disabled')) {
                targetDropdown.classList.remove('disabled');
                targetDropdown.classList.add('active');
            } else {
                targetDropdown.classList.remove('active');
                targetDropdown.classList.add('disabled');
            }
        }
    }

    selectDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        this.formState[type] = value;

        if (type === 'scope_type') {
            this.handleScopeTypeChange(value);
        } else if (type === 'scope_country') {
            this.handleCountryChange(value);
        } else if (type === 'scope_state') {
            this.handleStateChange(value);
        }

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) {
                const isDirectText = type.startsWith('scope_') && type !== 'scope_type';
                triggerText.textContent = isDirectText ? label : window.__(label);
            }

            if (icon) {
                const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded:first-child');
                if (triggerIcon) triggerIcon.textContent = icon;
            }

            const module = dropdownWrapper.querySelector('.component-module--dropdown');
            if (module) {
                module.classList.remove('active');
                module.classList.add('disabled');
            }
        }
    }

    selectPalette(btn) {
        this.formState.palette_id = btn.getAttribute('data-palette-id');
        const paletteName = btn.getAttribute('data-palette-name');

        const menu = btn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        const dropdownWrapper = btn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('[data-ref="text-palette"]');
            if (triggerText) triggerText.textContent = paletteName;

            const dropdownModule = dropdownWrapper.querySelector('.component-module--dropdown');
            if(dropdownModule) {
                dropdownModule.classList.remove('active');
                dropdownModule.classList.add('disabled');
            }
        }
    }

    adjustParticipantLimit(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min'), 10) || 10;
        
        // Lee el máximo primero desde la variable global de límites para prevenir overrides maliciosos en DOM, o como fallback del HTML
        const fallbackMax = (window.APP_LIMITS && window.APP_LIMITS.max_members_per_canvas !== -1) ? window.APP_LIMITS.max_members_per_canvas : 50000;
        const max = parseInt(btn.getAttribute('data-max'), 10) || fallbackMax;
        
        const centerElement = document.querySelector('[data-ref="val_limit"]');
        if (!centerElement) return;

        let currentVal = parseInt(centerElement.getAttribute('data-val'), 10) || min;
        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        this.formState.limit = newVal;
        centerElement.setAttribute('data-val', newVal);
        centerElement.textContent = newVal;
    }

    adjustCooldownBatch(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 1, 10);
        const max = parseInt(btn.getAttribute('data-max') || 100, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_batch"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_pixels_batch = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    adjustCooldownSeconds(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min') || 0, 10);
        const max = parseInt(btn.getAttribute('data-max') || 3600, 10);
        const valRef = document.querySelector('[data-ref="val_cooldown_seconds"]');
        
        if (valRef) {
            let currentVal = parseInt(valRef.getAttribute('data-val'), 10) || min;
            let newVal = currentVal + step;
            if (newVal < min) newVal = min;
            if (newVal > max) newVal = max;
            this.formState.cooldown_seconds = newVal;
            valRef.textContent = newVal;
            valRef.setAttribute('data-val', newVal);
        }
    }

    async submitCanvas(btn) {
        const inputName = document.querySelector('[data-ref="input-canvasname"]');
        if (inputName) {
            this.formState.name = inputName.value.trim();
        }

        const inputDesc = document.querySelector('[data-ref="input-canvas-desc"]');
        this.formState.description = inputDesc ? inputDesc.value.trim() : '';
        
        const inputBatch = document.querySelector('[data-ref="val_cooldown_batch"]');
        if (inputBatch) {
            this.formState.cooldown_pixels_batch = parseInt(inputBatch.getAttribute('data-val'), 10) || 5;
        }

        const inputSec = document.querySelector('[data-ref="val_cooldown_seconds"]');
        if (inputSec) {
            this.formState.cooldown_seconds = parseInt(inputSec.getAttribute('data-val'), 10) || 10;
        }

        const scopeSection = document.querySelector('[data-ref="scope-section"]');
        if (scopeSection && !scopeSection.classList.contains('disabled')) {
            const scopeType = this.formState.scope_type;

            if (scopeType === 'organization') {
                const orgEl = document.querySelector('[data-ref="input-scope-organization"]');
                this.formState.scope_ref_1 = orgEl ? orgEl.value.trim() : null;
                this.formState.scope_ref_2 = null;
                this.formState.scope_ref_3 = null;
            } else if (scopeType !== 'personal' && scopeType !== 'global') {
                this.formState.scope_ref_1 = this.formState.scope_country || null;
                this.formState.scope_ref_2 = this.formState.scope_state || null;
                this.formState.scope_ref_3 = this.formState.scope_city || null;
            } else {
                this.formState.scope_ref_1 = null;
                this.formState.scope_ref_2 = null;
                this.formState.scope_ref_3 = null;
            }
        } else {
            this.formState.scope_type = 'personal';
            this.formState.scope_ref_1 = null;
            this.formState.scope_ref_2 = null;
            this.formState.scope_ref_3 = null;
        }

        setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(window.__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { CanvasesController };