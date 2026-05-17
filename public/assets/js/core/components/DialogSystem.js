// public/assets/js/core/components/DialogSystem.js
import { DialogTemplates } from './DialogTemplates.js';

export class DialogSystem {
    constructor() {
        this.templates = DialogTemplates;
        
        // Estado del modal actual (Inerte)
        this.activeResolveFn = null;
        this.activeWrapper = null;
        this.activeOverlay = null;
        this.activeBox = null;
        
        // Estado del drag
        this.dragState = { startY: 0, currentDiff: 0, isDragging: false };

        // Bindings
        this.handleClickBound = this.handleClick.bind(this);
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        
        this.initialized = false;

        // FIX ARQUITECTÓNICO: Auto-inicialización obligatoria al instanciar.
        // Esto garantiza que los eventos siempre se deleguen, incluso si el AppInit olvida llamar a init()
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        // Delegación pura en el DOM
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('pointerdown', this.handlePointerDownBound);
        document.addEventListener('pointermove', this.handlePointerMoveBound);
        document.addEventListener('pointerup', this.handlePointerUpBound);
        document.addEventListener('pointercancel', this.handlePointerUpBound);
    }

    destroy() {
        this.closeCurrent(false);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('pointerdown', this.handlePointerDownBound);
        document.removeEventListener('pointermove', this.handlePointerMoveBound);
        document.removeEventListener('pointerup', this.handlePointerUpBound);
        document.removeEventListener('pointercancel', this.handlePointerUpBound);
        
        const container = document.getElementById('dialog-container');
        if (container) container.remove();
        this.initialized = false;
    }

    _getContainer() {
        let container = document.getElementById('dialog-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dialog-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(templateName, data = {}) {
        // Defensa en profundidad: Si alguien llamó a destroy(), lo volvemos a revivir al mostrar
        if (!this.initialized) {
            this.init();
        }

        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                console.error(`La plantilla de diálogo '${templateName}' no existe.`);
                resolve({ confirmed: false, data: {} });
                return;
            }

            // Si hay un modal abierto, ciérralo antes de abrir otro
            if (this.activeResolveFn) this.closeCurrent(false);

            const container = this._getContainer();

            this.activeOverlay = document.createElement('div');
            this.activeOverlay.className = 'component-dialog-overlay';
            
            this.activeWrapper = document.createElement('div');
            this.activeWrapper.className = 'component-dialog-wrapper';
            
            this.activeBox = document.createElement('div');
            this.activeBox.className = 'component-dialog-box';
            this.activeBox.innerHTML = this.templates[templateName].build(data);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'component-dialog-close-btn';
            closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
            
            this.activeWrapper.appendChild(this.activeBox);
            this.activeWrapper.appendChild(closeBtn);
            this.activeOverlay.appendChild(this.activeWrapper);
            container.appendChild(this.activeOverlay);

            requestAnimationFrame(() => this.activeOverlay.classList.add('active'));

            this.activeResolveFn = resolve;
        });
    }

    handleClick(e) {
        if (!this.activeResolveFn) return; 

        // 1. Botón de cerrar explícito
        const closeBtn = e.target.closest('.component-dialog-close-btn');
        if (closeBtn) {
            this.closeCurrent(false);
            return;
        }

        // 2. Búsqueda de botones de acción
        const actionBtn = e.target.closest('[data-dialog-action], [data-action="confirm"], [data-action="cancel"], #btn_confirm_custom_backup');
        
        if (actionBtn) {
            let action = actionBtn.getAttribute('data-dialog-action') || actionBtn.getAttribute('data-action');
            
            // Fallback para IDs específicos
            if (!action && actionBtn.id === 'btn_confirm_custom_backup') {
                action = 'confirm';
            }

            // Lógica para alternar visibilidad de contraseña dentro del diálogo
            if (action === 'togglePassword') {
                const inputGroup = actionBtn.closest('.component-input-group');
                if (inputGroup) {
                    const inputField = inputGroup.querySelector('input');
                    if (inputField) {
                        if (inputField.type === 'password') {
                            inputField.type = 'text';
                            actionBtn.textContent = 'visibility';
                        } else {
                            inputField.type = 'password';
                            actionBtn.textContent = 'visibility_off';
                        }
                    }
                }
                return; // Evitamos cerrar el diálogo
            }

            if (action === 'cancel') {
                this.closeCurrent(false);
            } else if (action === 'confirm') {
                this.closeCurrent(true);
            } else {
                this.closeCurrent(action || true);
            }
            return;
        }

        // 3. Clic en el fondo oscuro
        if (e.target === this.activeOverlay || e.target === this.activeWrapper) {
            this.closeCurrent(false);
        }
    }

    closeCurrent(result = false) {
        if (!this.activeResolveFn) return;

        let formData = {};
        
        try {
            if (result !== false && this.activeBox) {
                const inputs = this.activeBox.querySelectorAll('input, select, textarea');
                inputs.forEach(inp => { 
                    const key = inp.id || inp.name;
                    if (key) {
                        if (inp.type === 'checkbox' || inp.type === 'radio') {
                            formData[key] = inp.checked;
                        } else {
                            formData[key] = inp.value;
                        }
                    } 
                });
            }
        } catch (error) {
            console.error("Error al recolectar datos del diálogo:", error);
        }

        const overlayToRemove = this.activeOverlay;
        const wrapperToRemove = this.activeWrapper;
        const resolveToCall = this.activeResolveFn;

        if (wrapperToRemove) wrapperToRemove.removeAttribute('style'); 
        if (overlayToRemove) overlayToRemove.classList.remove('active');
        
        this.activeResolveFn = null;
        this.activeOverlay = null;
        this.activeWrapper = null;
        this.activeBox = null;

        // Resolvemos la promesa INMEDIATAMENTE para evitar la condición de carrera
        resolveToCall({ confirmed: result !== false, action: result, data: formData });

        setTimeout(() => {
            if (overlayToRemove && overlayToRemove.parentNode) {
                overlayToRemove.remove();
            }
            
            const container = document.getElementById('dialog-container');
            if (container && container.childNodes.length === 0 && container.parentNode) {
                container.remove();
            }
        }, 300); 
    }

    handlePointerDown(e) {
        if (!this.activeResolveFn) return; 
        if (window.innerWidth > 768) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 

        const dragHandle = e.target.closest('.pill-container');
        if (!dragHandle || !this.activeBox.contains(dragHandle)) return;

        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        
        if (this.activeOverlay) this.activeOverlay.classList.add('is-dragging');
        if (this.activeWrapper) this.activeWrapper.setPointerCapture(e.pointerId);
    }

    handlePointerMove(e) {
        if (!this.dragState.isDragging || !this.activeWrapper) return;
        this.dragState.currentDiff = e.clientY - this.dragState.startY;
        
        if (this.dragState.currentDiff > 0) {
            this.activeWrapper.style.transform = `translateY(${this.dragState.currentDiff}px)`;
        }
    }

    handlePointerUp(e) {
        if (!this.dragState.isDragging || !this.activeWrapper) return;
        this.dragState.isDragging = false;
        
        if (this.activeOverlay) this.activeOverlay.classList.remove('is-dragging');
        
        if (this.activeWrapper.hasPointerCapture(e.pointerId)) {
            this.activeWrapper.releasePointerCapture(e.pointerId);
        }

        if (this.dragState.currentDiff > this.activeWrapper.offsetHeight * 0.35) {
            this.closeCurrent(false);
        } else {
            this.activeWrapper.removeAttribute('style'); 
        }
        
        this.dragState.currentDiff = 0;
    }
}