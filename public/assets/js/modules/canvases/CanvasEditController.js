// public/assets/js/modules/canvases/CanvasEditController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';
import { getAllPalettes } from '../../core/constants/Palettes.js';

class CanvasEditController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.container = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        this.canvasId = urlParams.get('id');

        this.state = {
            name: '',
            description: '',
            privacy: 'private',
            palette_id: 'default',
            max_members: 10
        };

        this.handleClickBound = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="canvas-edit-wrapper"]');
        if (!this.container) return;

        this.abortController = new AbortController();
        
        if (!this.canvasId) {
            showMessage(__('err_invalid_canvas_id'), 'error');
            return;
        }
        
        this.bindEvents();
        this.loadCanvasData();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
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

        let activePaletteName = 'Paleta';

        palettes.forEach(palette => {
            const isActive = this.state.palette_id === palette.id;
            if (isActive) activePaletteName = palette.name;

            const btn = document.createElement('div');
            btn.className = `component-menu-link ${isActive ? 'active' : ''}`;
            btn.setAttribute('data-action', 'selectPalette');
            btn.setAttribute('data-palette-id', palette.id);
            btn.setAttribute('data-palette-name', palette.name);

            let colorsHtml = '';
            const totalColors = palette.colors.length;
            const colorsToShow = Math.min(totalColors, 4);

            // Generar los círculos de colores
            for (let i = 0; i < colorsToShow; i++) {
                colorsHtml += `<span style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${palette.colors[i]}; border:1px solid rgba(0,0,0,0.1); margin-right: -6px; position:relative; z-index:${10 - i};"></span>`;
            }

            // Si hay más de 4 colores, mostrar el indicador de "+X"
            if (totalColors > 4) {
                const remaining = totalColors - 4;
                colorsHtml += `<span style="display:inline-flex; align-items:center; justify-content:center; padding: 0 4px; min-width:16px; height:16px; border-radius:10px; background-color:var(--surface-hover); border:1px solid var(--border-color); font-size:10px; font-weight:600; color:var(--text-primary); margin-left: 4px; position:relative; z-index:0; box-sizing: border-box;">+${remaining}</span>`;
            }

            // Estructura: Icono Izquierda -> Texto Centro -> Colores Derecha
            btn.innerHTML = `
                <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                <div class="component-menu-link-text"><span>${palette.name}</span></div>
                <div class="component-menu-link-icon" style="width: auto; display: flex; align-items: center; margin-left: auto;">
                    ${colorsHtml}
                </div>
            `;
            container.appendChild(btn);
        });

        // Actualizar el texto del botón desplegable
        const triggerWrapper = container.closest('.component-dropdown-wrapper');
        if (triggerWrapper) {
            const textRef = triggerWrapper.querySelector('[data-ref="text-palette"]');
            if (textRef) textRef.textContent = activePaletteName;
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
            if (triggerText) triggerText.textContent = paletteName;

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
                const data = response.data;
                
                this.state.name = data.name;
                this.state.description = data.description || '';
                this.state.privacy = data.privacy;
                this.state.palette_id = data.palette_id || 'default';
                this.state.max_members = data.max_members || data.max_participants || 10;

                const displayCanvasName = this.container.querySelector('[data-ref="display-canvasname"]');
                const inputCanvasName = this.container.querySelector('[data-ref="input-canvasname"]');
                if (displayCanvasName) displayCanvasName.textContent = this.state.name;
                if (inputCanvasName) {
                    inputCanvasName.value = this.state.name;
                    inputCanvasName.setAttribute('data-original-value', this.state.name);
                }

                const inputCanvasDesc = this.container.querySelector('[data-ref="input-canvas-desc"]');
                if (inputCanvasDesc) inputCanvasDesc.value = this.state.description;

                const textSize = this.container.querySelector('[data-ref="text-size"]');
                if (textSize) textSize.textContent = `${data.width}x${data.height}`;

                const textPrivacy = this.container.querySelector('[data-ref="text-privacy"]');
                const iconPrivacy = this.container.querySelector('[data-ref="icon-privacy"]');
                
                const privacyMap = {
                    'public': { label: 'canvas_privacy_public', icon: 'public' },
                    'unlisted': { label: 'canvas_privacy_unlisted', icon: 'link' },
                    'private': { label: 'canvas_privacy_private', icon: 'lock' }
                };
                
                if (textPrivacy && privacyMap[this.state.privacy]) {
                    const labelKey = privacyMap[this.state.privacy].label;
                    textPrivacy.textContent = __(labelKey);
                    if(iconPrivacy) iconPrivacy.textContent = privacyMap[this.state.privacy].icon;
                }

                const privacyLinks = this.container.querySelectorAll('[data-type="privacy"]');
                privacyLinks.forEach(link => {
                    if (link.getAttribute('data-value') === this.state.privacy) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });

                const valLimit = this.container.querySelector('[data-ref="val_limit"]');
                if (valLimit) {
                    valLimit.textContent = this.state.max_members;
                    valLimit.setAttribute('data-val', this.state.max_members);
                }

                // Renderizamos la lista de paletas después de cargar datos
                this.renderPalettes();

            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(__('err_load_canvas'), 'error');
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
                
                if(textRef) textRef.textContent = __(label);
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

    async updateCanvas(btn) {
        const nameInput = this.container.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) {
            this.state.name = nameInput.value.trim();
        }

        const descInput = this.container.querySelector('[data-ref="input-canvas-desc"]');
        if (descInput) {
            this.state.description = descInput.value.trim();
        }

        if (!this.state.name) {
            showMessage(__('err_field_required'), 'warning');
            return;
        }

        const payload = {
            id: this.canvasId,
            name: this.state.name,
            description: this.state.description,
            privacy: this.state.privacy,
            palette_id: this.state.palette_id,
            max_members: this.state.max_members
        };

        setButtonLoading(btn);

        try {
            const response = await this.api.post(ApiRoutes.Canvases.Update, payload, this.abortController.signal);

            if (response.aborted) return;

            if (response && response.success) {
                showMessage(__('canvas_update_success'), 'success');
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(__('err_update_canvas'), 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

export { CanvasEditController };