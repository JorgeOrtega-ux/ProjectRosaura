import { DialogTemplates } from './DialogTemplates.js';

export class DialogSystem {
    constructor() {
        this.templates = DialogTemplates;

        this.activeResolveFn = null;
        this.activeWrapper = null;
        this.activeOverlay = null;
        this.activeBox = null;

        this.dragState = { startY: 0, currentDiff: 0, isDragging: false };

        this.handleClickBound = this.handleClick.bind(this);
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        
        this.initialized = false;

        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

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
        
        const container = document.querySelector('.modal-container[data-type="modal"]');
        if (container) container.remove();
        this.initialized = false;
    }

    _getContainer() {
        let container = document.querySelector('.modal-container[data-type="modal"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'modal-container';
            container.setAttribute('data-type', 'modal');
            document.body.appendChild(container);
        }
        return container;
    }

    show(templateName, data = {}) {
        
        if (!this.initialized) {
            this.init();
        }

        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                
                resolve({ confirmed: false, data: {} });
                return;
            }

            if (this.activeResolveFn) this.closeCurrent(false);

            const container = this._getContainer();

            this.activeOverlay = document.createElement('div');
            this.activeOverlay.className = 'component-modal-overlay';
            
            this.activeWrapper = document.createElement('div');
            this.activeWrapper.className = 'component-modal-wrapper';
            
            this.activeBox = document.createElement('div');
            this.activeBox.className = 'component-modal-box';
            if (this.templates[templateName].noPadding) {
                this.activeBox.classList.add('component-modal-box--no-padding');
            }
            this.activeBox.innerHTML = this.templates[templateName].build(data);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'component-modal-close-btn';
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

        const closeBtn = e.target.closest('.component-modal-close-btn');
        if (closeBtn) {
            this.closeCurrent(false);
            return;
        }

        const actionBtn = e.target.closest('[data-modal-action], [data-action="confirm"], [data-action="cancel"], #btn_confirm_custom_backup');
        
        if (actionBtn) {
            let action = actionBtn.getAttribute('data-modal-action') || actionBtn.getAttribute('data-action');

            if (!action && actionBtn.id === 'btn_confirm_custom_backup') {
                action = 'confirm';
            }

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
                return; 
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
                const processedRadioNames = new Set();
                inputs.forEach(inp => { 
                    if (inp.type === 'radio') {
                        const radioName = inp.name;
                        if (radioName && !processedRadioNames.has(radioName)) {
                            processedRadioNames.add(radioName);
                            const checked = this.activeBox.querySelector(`input[name="${radioName}"]:checked`);
                            formData[radioName] = checked ? checked.value : '';
                        }
                        return;
                    }
                    const key = inp.id || inp.name || inp.getAttribute('data-ref'); 
                    if (key) {
                        if (inp.type === 'checkbox') {
                            formData[key] = inp.checked;
                        } else {
                            formData[key] = inp.value;
                        }
                    } 
                });
            }
        } catch (error) {
            
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

        resolveToCall({ confirmed: result !== false, action: result, data: formData });

        setTimeout(() => {
            if (overlayToRemove && overlayToRemove.parentNode) {
                overlayToRemove.remove();
            }
            
            const container = document.querySelector('.modal-container[data-type="modal"]');
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