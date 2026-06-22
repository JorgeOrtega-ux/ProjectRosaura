// public/assets/js/modules/canvases/CanvasesController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

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
        
        this.formState = {
            name: '',
            description: '',
            size: '64',
            privacy: 'private',
            palette_id: 'default',
            limit: 10,
            cooldown_pixels_batch: 5,
            cooldown_seconds: 10
        };

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        this.setupDefaultValues();
        this.renderPalettes();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
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

        let activePaletteName = 'Paleta';

        palettes.forEach(palette => {
            const isActive = this.formState.palette_id === palette.id;
            if (isActive) activePaletteName = palette.name;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', palette.name);

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

            btn.innerHTML = `
                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                <div class="component-menu-link-text"><span>${palette.name}</span></div>
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
        } else if (action === 'openCanvasNewTab') {
            this.openCanvasNewTab(actionBtn);
        } else if (action === 'copyCanvasLink') {
            this.copyCanvasLink(actionBtn);
        } else if (action === 'deleteCanvas') {
            this.deleteCanvas(actionBtn);
        } else if (action === 'leaveCanvas') {
            this.leaveCanvas(actionBtn);
        } else if (action === 'viewCanvasSnapshots') {
            this.viewCanvasSnapshots(actionBtn);
        }
    }

    viewCanvasSnapshots(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            this.closeDropdowns();
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/s/${uuid}`);
            } else {
                window.location.href = `${this.basePath}/design/s/${uuid}`;
            }
        }
    }

    openCanvasNewTab(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            window.open(`${this.basePath}/design/${uuid}`, '_blank');
        }
    }

    async copyCanvasLink(btn) {
        const uuid = btn.getAttribute('data-uuid');
        if (uuid) {
            const url = `${window.location.origin}${this.basePath}/design/${uuid}`;
            try {
                await navigator.clipboard.writeText(url);
                showMessage(window.__ ? __('msg_link_copied') || 'Enlace copiado al portapapeles' : 'Enlace copiado al portapapeles', 'success');
                this.closeDropdowns();
            } catch (err) {
                showMessage(window.__ ? __('msg_copy_error') || 'Error al copiar el enlace' : 'Error al copiar el enlace', 'error');
            }
        }
    }

   async deleteCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.dialogSystem) {
            const confirm = await window.dialogSystem.show('confirmDeleteCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
        } else if (!confirm('¿Estás seguro de que deseas eliminar este lienzo permanentemente?')) {
            return;
        }

        const res = await this.api.post(ApiRoutes.Canvases.Delete, { uuid: uuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(window.__ ? __('msg_canvas_deleted') || 'Lienzo eliminado exitosamente' : 'Lienzo eliminado exitosamente', 'success');
            const card = document.querySelector(`.component-snapshot-card[data-card-id="${id}"]`);
            if (card) card.remove();
        } else {
            showMessage(res.message || 'Error al eliminar el lienzo', 'error');
        }
    }

    async leaveCanvas(btn) {
        const id = btn.getAttribute('data-id');
        const uuid = btn.getAttribute('data-uuid');
        if (!uuid) return;

        this.closeDropdowns();

        if (window.dialogSystem) {
            const confirm = await window.dialogSystem.show('confirmLeaveCanvas', { uuid: uuid });
            if (!confirm.confirmed) return;
        } else if (!confirm('¿Estás seguro de que deseas salir de este lienzo? Perderás el acceso.')) {
            return;
        }

        const res = await this.api.post(ApiRoutes.Canvases.Leave, { uuid: uuid }, this.abortController.signal);
        
        if (res.aborted) return;

        if (res.success) {
            showMessage(window.__ ? __('msg_canvas_left') || 'Has abandonado el lienzo exitosamente' : 'Has abandonado el lienzo exitosamente', 'success');
            const card = document.querySelector(`.component-snapshot-card[data-card-id="${id}"]`);
            if (card) card.remove();
        } else {
            showMessage(res.message || 'Error al salir del lienzo', 'error');
        }
    }

    closeDropdowns() {
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            el.classList.remove('active');
            el.classList.add('disabled');
        });
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

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = __(label);

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
        const max = parseInt(btn.getAttribute('data-max'), 10) || 50000;
        
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

        setButtonLoading(btn);

        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { CanvasesController };