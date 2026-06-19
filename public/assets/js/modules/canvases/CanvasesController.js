// public/assets/js/modules/canvases/CanvasesController.js

export class CanvasesController {
    constructor() {
        this.name = "CanvasesController";
        this.container = null;
        
        // Estado centralizado para el payload de creación
        this.formState = {
            name: '',
            description: '',
            size: '64', // Valor por defecto
            privacy: 'public',
            limit: 10 // Mínimo inicial
        };

        this.handleAction = this.handleAction.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    async init() {
        console.log(`${this.name} initialized`);
        this.container = document.querySelector('[data-ref="canvas-create-wrapper"]');
        
        if (this.container) {
            this.container.addEventListener('click', this.handleAction);
            document.addEventListener('click', this.handleClickOutside);
            
            // Inyectamos el nombre por defecto con timestamp
            this.setupDefaultValues();
        }
    }

    destroy() {
        console.log(`${this.name} destroyed`);
        if (this.container) {
            this.container.removeEventListener('click', this.handleAction);
        }
        document.removeEventListener('click', this.handleClickOutside);
    }

    setupDefaultValues() {
        const timestampName = `Canvas_${Date.now()}`;
        this.formState.name = timestampName;

        const displayEl = this.container.querySelector('[data-ref="display-canvasname"]');
        const inputEl = this.container.querySelector('[data-ref="input-canvasname"]');

        if (displayEl) displayEl.textContent = timestampName;
        if (inputEl) {
            inputEl.value = timestampName;
            inputEl.setAttribute('data-original-value', timestampName);
        }
    }

    handleAction(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        switch (action) {
            case 'toggleDropdown':
                this.toggleDropdown(actionBtn);
                break;
            case 'selectValue':
                this.selectDropdownValue(actionBtn);
                break;
            case 'adjustLimit':
                this.adjustParticipantLimit(actionBtn);
                break;
            case 'createCanvas':
                this.submitCanvas();
                break;
        }
    }

    toggleDropdown(triggerBtn) {
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        // Cerrar otros dropdowns
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) el.classList.add('disabled');
        });

        if (targetDropdown) {
            targetDropdown.classList.toggle('disabled');
        }
    }

    selectDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        this.formState[type] = value;

        // Actualizar visualmente la opción activa
        const menu = optionBtn.closest('.component-menu-list');
        menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
        optionBtn.classList.add('active');

        // Actualizar el trigger
        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
        
        if (triggerText) triggerText.textContent = label;

        if (icon) {
            const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded:first-child');
            if (triggerIcon) triggerIcon.textContent = icon;
        }

        // Cerrar módulo
        const module = dropdownWrapper.querySelector('.component-module--dropdown');
        if (module) module.classList.add('disabled');
    }

    adjustParticipantLimit(btn) {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const min = parseInt(btn.getAttribute('data-min'), 10) || 10;
        const max = parseInt(btn.getAttribute('data-max'), 10) || 50000;
        
        const centerElement = this.container.querySelector('[data-ref="val_limit"]');
        let currentVal = parseInt(centerElement.getAttribute('data-val'), 10) || min;

        let newVal = currentVal + step;
        
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        this.formState.limit = newVal;
        centerElement.setAttribute('data-val', newVal);
        centerElement.textContent = newVal;
    }

    submitCanvas() {
        // Recuperar el valor final de los inputs antes de enviar
        const inputName = this.container.querySelector('[data-ref="input-canvasname"]');
        const inputDesc = this.container.querySelector('[data-ref="input-canvas-desc"]');

        this.formState.name = inputName ? inputName.value.trim() : this.formState.name;
        this.formState.description = inputDesc ? inputDesc.value.trim() : '';

        console.log("Creando lienzo con el payload:", this.formState);
        // ApiServices.post('/canvases', this.formState).then(...)
    }

    handleClickOutside(e) {
        if (!e.target.closest('.component-dropdown-wrapper')) {
            document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
                el.classList.add('disabled');
            });
        }
    }
}