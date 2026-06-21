// public/assets/js/modules/canvases/CanvasResetController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class CanvasResetController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        this.isInitialized = false;
        
        this.form = null;
        this.toggleActive = null;
        this.optionsContainer = null;
        this.inputDateTime = null;
        this.checkSnapshot = null;
        
        // Elementos del Dropdown Personalizado
        this.inputTimer = null;
        this.textTimer = null;
        this.iconTimer = null;

        this.btnSave = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleToggleChangeBound = this.handleToggleChange.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        
        this.form = document.getElementById('form-canvas-resets');
        if (!this.form) return;

        this.isInitialized = true;
        this.abortController = new AbortController();
        
        this.toggleActive = document.getElementById('reset_is_active');
        this.optionsContainer = document.getElementById('reset_options_container');
        this.inputDateTime = document.getElementById('next_reset_at');
        this.checkSnapshot = document.getElementById('take_snapshot');
        
        this.inputTimer = document.getElementById('timer_action');
        this.textTimer = document.querySelector('[data-ref="text-timer"]');
        this.iconTimer = document.querySelector('[data-ref="icon-timer"]');

        this.btnSave = document.getElementById('btn_save_resets');

        this.bindEvents();
        this.loadCurrentSettings();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        
        if (this.toggleActive) {
            this.toggleActive.removeEventListener('change', this.handleToggleChangeBound);
        }
        this.isInitialized = false;
    }

    bindEvents() {
        // Usamos delegación de eventos global para atrapar clics en el dropdown y en guardar
        document.addEventListener('click', this.handleGlobalClickBound);
        this.toggleActive.addEventListener('change', this.handleToggleChangeBound);
    }

    handleGlobalClick(e) {
        // Manejar click en el botón de guardar de la barra superior
        const btnSaveTarget = e.target.closest('#btn_save_resets');
        if (btnSaveTarget) {
            e.preventDefault();
            this.saveSettings();
            return;
        }

        // Manejar selección dentro del Dropdown de Timer Action
        const dropdownItem = e.target.closest('[data-action="selectTimerAction"]');
        if (dropdownItem) {
            e.preventDefault();
            this.selectTimerValue(dropdownItem);
            
            // Cerrar el dropdown manualmente si no lo maneja tu Core global
            const module = dropdownItem.closest('.component-module--dropdown');
            if (module) module.classList.add('disabled');
        }
    }

    selectTimerValue(element) {
        const value = element.getAttribute('data-value');
        const label = element.getAttribute('data-label');
        const icon = element.getAttribute('data-icon');

        // Actualizar UI
        if (this.textTimer) this.textTimer.textContent = label;
        if (this.iconTimer) this.iconTimer.textContent = icon;
        if (this.inputTimer) this.inputTimer.value = value;

        // Actualizar clases activas en la lista
        const parentList = element.closest('.component-menu-list');
        if (parentList) {
            parentList.querySelectorAll('.component-menu-link').forEach(item => {
                item.classList.remove('active');
            });
        }
        element.classList.add('active');
    }

    handleToggleChange() {
        const isActive = this.toggleActive.checked;
        if (isActive) {
            this.optionsContainer.style.opacity = '1';
            this.optionsContainer.style.pointerEvents = 'auto';
            this.inputDateTime.required = true;
        } else {
            this.optionsContainer.style.opacity = '0.4';
            this.optionsContainer.style.pointerEvents = 'none';
            this.inputDateTime.required = false;
        }
    }

    utcStringToLocalInputFormat(utcString) {
        if (!utcString) return '';
        const dateObj = new Date(utcString.replace(' ', 'T') + 'Z');
        if (isNaN(dateObj.getTime())) return '';

        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }

    localInputFormatToUtcString(localString) {
        if (!localString) return null;
        const dateObj = new Date(localString);
        if (isNaN(dateObj.getTime())) return null;

        const yyyy = dateObj.getUTCFullYear();
        const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getUTCDate()).padStart(2, '0');
        const hh = String(dateObj.getUTCHours()).padStart(2, '0');
        const min = String(dateObj.getUTCMinutes()).padStart(2, '0');
        const ss = '00';

        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    async loadCurrentSettings() {
        const canvasId = this.form.getAttribute('data-canvas-id');
        if (!canvasId) return;

        try {
            const url = `/api/canvases/${canvasId}/reset-settings`;
            const result = await this.api.get(url, this.abortController.signal);

            if (result.aborted) return;

            if (result.success && result.data) {
                const data = result.data;
                
                this.toggleActive.checked = data.is_active;
                this.handleToggleChange();

                if (data.next_reset_at) {
                    this.inputDateTime.value = this.utcStringToLocalInputFormat(data.next_reset_at);
                }

                this.checkSnapshot.checked = data.take_snapshot;
                
                if (data.timer_action) {
                    // Buscar el elemento en el dropdown que coincide con el valor para simular el click
                    const item = document.querySelector(`[data-action="selectTimerAction"][data-value="${data.timer_action}"]`);
                    if (item) {
                        this.selectTimerValue(item);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading reset settings:", error);
            showMessage("No se pudo cargar la configuración actual.", "error");
        }
    }

    async saveSettings() {
        const canvasId = this.form.getAttribute('data-canvas-id');
        const isActive = this.toggleActive.checked;
        const localTimeStr = this.inputDateTime.value;

        if (isActive && !localTimeStr) {
            showMessage("Debes seleccionar una fecha y hora para el reinicio.", "warning");
            this.inputDateTime.focus();
            return;
        }

        const utcNextReset = this.localInputFormatToUtcString(localTimeStr);

        const payload = {
            id: canvasId,
            is_active: isActive,
            next_reset_at: utcNextReset,
            take_snapshot: this.checkSnapshot.checked,
            timer_action: this.inputTimer.value // Tomamos el valor del input oculto
        };

        setButtonLoading(this.btnSave);

        try {
            const url = `/api/canvases/${canvasId}/reset-settings`;
            const result = await this.api.put(url, payload, this.abortController.signal);

            if (result.aborted) return;
            
            restoreButton(this.btnSave);

            if (result.success) {
                showMessage(result.message || "Configuración de reinicios guardada.", "success");
            } else {
                showMessage(result.message || "Ocurrió un error al guardar.", "error");
            }
        } catch (error) {
            restoreButton(this.btnSave);
            console.error("Error saving reset settings:", error);
        }
    }
}

export { CanvasResetController };