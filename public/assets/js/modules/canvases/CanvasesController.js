// public/assets/js/modules/canvases/CanvasesController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
// 1. IMPORTAR LA FUNCIÓN PARA OBTENER LAS PALETAS
import { getAllPalettes } from '../../core/constants/Palettes.js';

class CanvasesController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        // 2. AGREGAR PALETTE_ID AL ESTADO DEL FORMULARIO
        this.formState = {
            name: '',
            description: '',
            size: '64',
            privacy: 'private',
            palette_id: 'default',
            limit: 10
        };

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        this.setupDefaultValues();
        // 3. RENDERIZAR LAS PALETAS AL INICIAR
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

    // 4. LÓGICA PARA RENDERIZAR LAS PALETAS EN EL DOM
    renderPalettes() {
        const container = document.querySelector('[data-ref="palette-selector-container"]');
        if (!container) return;

        const palettes = getAllPalettes();
        container.innerHTML = ''; // Esto borra el texto "Cargando..." o "lbl_loading"

        palettes.forEach(palette => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `component-button component-button--outline ${this.formState.palette_id === palette.id ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '8px';
            btn.style.padding = '8px 12px';

            const colorsPreview = palette.colors.slice(0, 4).map(c => 
                `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${c}; border:1px solid rgba(0,0,0,0.1);"></span>`
            ).join('');

            btn.innerHTML = `<div style="display:flex; gap:2px;">${colorsPreview}</div> <span>${palette.name}</span>`;
            container.appendChild(btn);
        });
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        // Nota: Ignoramos intencionalmente "toggleEditState" para que el script global lo maneje

        if (action === 'toggleDropdown') {
            this.toggleDropdown(actionBtn);
        } else if (action === 'selectValue') {
            this.selectDropdownValue(actionBtn);
        } else if (action === 'adjustLimit') {
            this.adjustParticipantLimit(actionBtn);
        } else if (action === 'saveCanvasName') {
            this.saveCanvasName(actionBtn);
        // 5. INTERCEPTAR EL CLIC EN EL BOTÓN DE LA PALETA
        } else if (action === 'selectPalette') {
            this.selectPalette(actionBtn);
        } else if (action === 'createCanvas') {
            e.preventDefault();
            this.submitCanvas(actionBtn);
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
                // Si el input está vacío, revertimos a lo que había antes
                inputEl.value = inputEl.getAttribute('data-original-value') || '';
            }
        }

        // Cerramos el estado de edición invocando limpiamente el botón de cancelar,
        // lo cual disparará tu script global de "toggleEditState" de forma natural.
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

    // 6. ACTUALIZAR ESTADO AL SELECCIONAR UNA PALETA
    selectPalette(btn) {
        this.formState.palette_id = btn.getAttribute('data-palette-id');
        const container = btn.closest('[data-ref="palette-selector-container"]');
        if (container) {
            container.querySelectorAll('[data-action="selectPalette"]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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

    async submitCanvas(btn) {
        const inputName = document.querySelector('[data-ref="input-canvasname"]');
        if (inputName) {
            this.formState.name = inputName.value.trim();
        }

        const inputDesc = document.querySelector('[data-ref="input-canvas-desc"]');
        this.formState.description = inputDesc ? inputDesc.value.trim() : '';

        setButtonLoading(btn);

        // Ya enviará 'palette_id' porque forma parte de this.formState
        const res = await this.api.post(ApiRoutes.Canvases.Create, this.formState, this.abortController.signal);
        if (res.aborted) return;

        restoreButton(btn);

        if (res.success) {
            showMessage(__('msg_canvas_created'), 'success');
            if (window.spaRouter) {
                // MODIFICADO AQUÍ PARA QUE REDIRIGA AL ENLACE CORRECTO DE DESIGN
                window.spaRouter.navigate(`${this.basePath}/design/${res.data.uuid}`);
            }
        } else {
            showMessage(res.message, 'error');
        }
    }
}

export { CanvasesController };