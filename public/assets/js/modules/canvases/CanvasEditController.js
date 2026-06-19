// public/assets/js/modules/canvases/CanvasEditController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class CanvasEditController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.container = null;
        
        // Extraer el ID del lienzo de la URL (?id=...)
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
            showMessage(window.__ ? window.__('err_invalid_canvas_id') : 'ID de lienzo inválido.', 'error');
            return;
        }
        
        this.bindEvents();
        this.loadCanvasData();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.container) {
            this.container.removeEventListener('click', this.handleClickBound);
        }
    }

    bindEvents() {
        this.container.addEventListener('click', this.handleClickBound);
    }

    handleClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        
        // Ejecutar la acción solo si existe en este controlador
        // (Ignorará 'toggleEditState' y 'saveCanvasName' para que lo maneje tu otro script)
        if (typeof this[action] === 'function') {
            this[action](btn, e);
        }
    }

    async loadCanvasData() {
        try {
            const response = await this.api.post(ApiRoutes.Canvases.Get, { id: this.canvasId }, this.abortController.signal);
            
            if (response.aborted) return;

            if (response && response.success) {
                const data = response.data;
                
                // Actualizar estado interno
                this.state.name = data.name;
                this.state.description = data.description || '';
                this.state.privacy = data.privacy;
                this.state.max_members = data.max_members || data.max_participants || 10;

                // Actualizar UI - Nombre
                const displayCanvasName = this.container.querySelector('[data-ref="display-canvasname"]');
                const inputCanvasName = this.container.querySelector('[data-ref="input-canvasname"]');
                if (displayCanvasName) displayCanvasName.textContent = this.state.name;
                if (inputCanvasName) {
                    inputCanvasName.value = this.state.name;
                    inputCanvasName.setAttribute('data-original-value', this.state.name);
                }

                // Actualizar UI - Descripción
                const inputCanvasDesc = this.container.querySelector('[data-ref="input-canvas-desc"]');
                if (inputCanvasDesc) inputCanvasDesc.value = this.state.description;

                // Actualizar UI - Tamaño (Visual bloqueado)
                const textSize = this.container.querySelector('[data-ref="text-size"]');
                if (textSize) textSize.textContent = `${data.width}x${data.height}`;

                // Actualizar UI - Privacidad
                const textPrivacy = this.container.querySelector('[data-ref="text-privacy"]');
                const iconPrivacy = this.container.querySelector('[data-ref="icon-privacy"]');
                
                const privacyMap = {
                    'public': { label: 'canvas_privacy_public', icon: 'public' },
                    'unlisted': { label: 'canvas_privacy_unlisted', icon: 'link' },
                    'private': { label: 'canvas_privacy_private', icon: 'lock' }
                };
                
                if (textPrivacy && privacyMap[this.state.privacy]) {
                    const labelKey = privacyMap[this.state.privacy].label;
                    textPrivacy.textContent = window.__ ? window.__(labelKey) : this.state.privacy;
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

                // Actualizar UI - Límite de miembros
                const valLimit = this.container.querySelector('[data-ref="val_limit"]');
                if (valLimit) {
                    valLimit.textContent = this.state.max_members;
                    valLimit.setAttribute('data-val', this.state.max_members);
                }

            } else {
                showMessage(response.message || 'Error al cargar los datos del lienzo.', 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Error loading canvas:", error);
            showMessage('Error al cargar los datos del lienzo.', 'error');
        }
    }

    toggleDropdown(btn) {
        const targetId = btn.getAttribute('data-target');
        const dropdown = this.container.querySelector(`[data-module="${targetId}"]`);
        
        if (dropdown) {
            const isActive = dropdown.classList.contains('active');
            
            // Cerrar otros dropdowns activos
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
                
                if(textRef) textRef.textContent = window.__ ? window.__(label) : label;
                if(iconRef) iconRef.textContent = icon;
                
                // Actualizar clase active en el menú
                const menu = btn.closest('.component-menu-list');
                if (menu) {
                    menu.querySelectorAll('.component-menu-link').forEach(l => l.classList.remove('active'));
                    btn.classList.add('active');
                }

                // Cerrar el dropdown
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
        // Obtener el nombre actual del input justo antes de guardar 
        // (esencial ya que la lógica de edición en tiempo real está en otro archivo)
        const nameInput = this.container.querySelector('[data-ref="input-canvasname"]');
        if (nameInput) {
            this.state.name = nameInput.value.trim();
        }

        // Obtener la descripción actual del input justo antes de guardar
        const descInput = this.container.querySelector('[data-ref="input-canvas-desc"]');
        if (descInput) {
            this.state.description = descInput.value.trim();
        }

        if (!this.state.name) {
            showMessage(window.__ ? window.__('err_field_required') : 'El nombre es obligatorio', 'warning');
            return;
        }

        // Payload final: EXCLUYE explícitamente width y height
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
                showMessage(window.__ ? window.__('canvas_update_success') : 'Lienzo actualizado con éxito.', 'success');
            } else {
                showMessage(response.message || 'Error al actualizar el lienzo.', 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error("Error updating canvas:", error);
            showMessage('Error al procesar la actualización del lienzo.', 'error');
        } finally {
            restoreButton(btn);
        }
    }
}

export { CanvasEditController };