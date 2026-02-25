// public/assets/js/core/dialog-system.js
import { DialogTemplates } from './dialog-templates.js';

export class DialogSystem {
    constructor() {
        this.templates = DialogTemplates;
        this.activeCloseFn = null;
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
        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                console.error(`La plantilla de diálogo '${templateName}' no existe.`);
                resolve({ confirmed: false, data: {} });
                return;
            }

            const container = this._getContainer();

            const overlay = document.createElement('div');
            overlay.className = 'component-dialog-overlay';
            
            const box = document.createElement('div');
            box.className = 'component-dialog-box';
            box.innerHTML = this.templates[templateName].build(data);
            
            overlay.appendChild(box);
            container.appendChild(overlay);

            requestAnimationFrame(() => overlay.classList.add('active'));

            const closeDialog = (result) => {
                let formData = {};
                
                if (result === true) {
                    const inputs = box.querySelectorAll('input');
                    inputs.forEach(inp => {
                        if (inp.id) formData[inp.id] = inp.value;
                    });
                }

                // Eliminamos completamente el atributo style del DOM
                box.removeAttribute('style'); 
                overlay.classList.remove('active');
                
                setTimeout(() => {
                    overlay.remove();
                    this.activeCloseFn = null;
                    
                    if (container.childNodes.length === 0 && container.parentNode) {
                        container.remove();
                    }
                    
                    resolve({ confirmed: result === true, data: formData });
                }, 300); 
            };

            this.activeCloseFn = closeDialog;

            const btnConfirm = box.querySelector('[data-dialog-action="confirm"]');
            const btnCancel = box.querySelector('[data-dialog-action="cancel"]');
            
            if(btnConfirm) btnConfirm.addEventListener('click', () => closeDialog(true));
            if(btnCancel) btnCancel.addEventListener('click', () => closeDialog(false));
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDialog(false);
            });

            const pill = box.querySelector('.pill-container');
            if (pill) {
                this.bindDragEvents(pill, box, overlay, () => closeDialog(false));
            }
        });
    }

    closeCurrent(result = false) {
        if (this.activeCloseFn) {
            this.activeCloseFn(result);
        }
    }

    bindDragEvents(pill, box, overlay, closeCallback) {
        let startY = 0;
        let currentDiff = 0;
        let isDragging = false;

        pill.addEventListener('pointerdown', (e) => {
            if (window.innerWidth > 768) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return; 

            isDragging = true;
            startY = e.clientY;
            
            overlay.classList.add('is-dragging');
            box.setPointerCapture(e.pointerId);
        });

        box.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            currentDiff = e.clientY - startY;
            
            if (currentDiff > 0) {
                box.style.transform = `translateY(${currentDiff}px)`;
            }
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            overlay.classList.remove('is-dragging');
            
            if (box.hasPointerCapture(e.pointerId)) {
                box.releasePointerCapture(e.pointerId);
            }

            if (currentDiff > box.offsetHeight * 0.35) {
                closeCallback();
            } else {
                box.removeAttribute('style'); // Remover style
            }
            
            currentDiff = 0;
        };

        box.addEventListener('pointerup', endDrag);
        box.addEventListener('pointercancel', endDrag);
    }
}