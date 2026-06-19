// public/assets/js/modules/canvases/CanvasEditController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

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
        
        // Ejecutamos la acción si existe en el controlador local
        // Nota: Al no existir "toggleEditState" aquí, se ignorará y lo procesará el JS global.
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

        // Simula el clic en el botón de cancelar para que la lógica de tu script
        // global se encargue del cambio de estado visual sin duplicidad.
        const btnCancel = container.querySelector('[data-action="toggleEditState"]');
        if (btnCancel) {
            btnCancel.click();
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