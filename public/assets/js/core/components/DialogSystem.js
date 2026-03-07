// public/assets/js/core/components/DialogSystem.js
import { DialogTemplates } from './DialogTemplates.js';

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
            
            // Creamos un wrapper para contener la caja y el botón 'X' en modo Row
            const wrapper = document.createElement('div');
            wrapper.className = 'component-dialog-wrapper';
            
            const box = document.createElement('div');
            box.className = 'component-dialog-box';
            
            // Aplicar clase personalizada al contenedor del diálogo si existe
            if (data.dialogClass) {
                box.classList.add(data.dialogClass);
            }

            box.innerHTML = this.templates[templateName].build(data);
            
            // Botón 'X' externo (Se ocultará en móvil mediante CSS)
            const closeBtn = document.createElement('button');
            closeBtn.className = 'component-dialog-close-btn';
            closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
            closeBtn.addEventListener('click', () => closeDialog(false));
            
            wrapper.appendChild(box);
            wrapper.appendChild(closeBtn);
            overlay.appendChild(wrapper);
            container.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add('active');
                
                // Disparar evento onRender si existe (útil para inyectar JS en la plantilla)
                if (data.onRender && typeof data.onRender === 'function') {
                    data.onRender(box);
                }
            });

            const closeDialog = (result) => {
                let formData = {};
                
                if (result !== false) {
                    const inputs = box.querySelectorAll('input');
                    inputs.forEach(inp => {
                        if (inp.id) formData[inp.id] = inp.value;
                    });
                }

                wrapper.removeAttribute('style'); 
                overlay.classList.remove('active');
                
                setTimeout(() => {
                    overlay.remove();
                    this.activeCloseFn = null;
                    
                    if (container.childNodes.length === 0 && container.parentNode) {
                        container.remove();
                    }
                    
                    resolve({ confirmed: result !== false, action: result, data: formData });
                }, 300); 
            };

            this.activeCloseFn = closeDialog;

            const actionBtns = box.querySelectorAll('[data-dialog-action]');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-dialog-action');
                    if (action === 'cancel') {
                        closeDialog(false);
                    } else if (action === 'confirm') {
                        closeDialog(true);
                    } else {
                        closeDialog(action);
                    }
                });
            });
            
            overlay.addEventListener('click', (e) => {
                // Cerramos si clickean el fondo (overlay) o el contenedor de filas (wrapper)
                if (e.target === overlay || e.target === wrapper) closeDialog(false);
            });

            const pill = box.querySelector('.pill-container');
            if (pill) {
                // Ahora arrastramos el wrapper completo en lugar del box
                this.bindDragEvents(pill, wrapper, overlay, () => closeDialog(false));
            }
        });
    }

    closeCurrent(result = false) {
        if (this.activeCloseFn) {
            this.activeCloseFn(result);
        }
    }

    bindDragEvents(pill, wrapper, overlay, closeCallback) {
        let startY = 0;
        let currentDiff = 0;
        let isDragging = false;

        pill.addEventListener('pointerdown', (e) => {
            if (window.innerWidth > 768) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return; 

            isDragging = true;
            startY = e.clientY;
            
            overlay.classList.add('is-dragging');
            wrapper.setPointerCapture(e.pointerId);
        });

        wrapper.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            currentDiff = e.clientY - startY;
            
            if (currentDiff > 0) {
                wrapper.style.transform = `translateY(${currentDiff}px)`;
            }
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            overlay.classList.remove('is-dragging');
            
            if (wrapper.hasPointerCapture(e.pointerId)) {
                wrapper.releasePointerCapture(e.pointerId);
            }

            if (currentDiff > wrapper.offsetHeight * 0.35) {
                closeCallback();
            } else {
                wrapper.removeAttribute('style'); 
            }
            
            currentDiff = 0;
        };

        wrapper.addEventListener('pointerup', endDrag);
        wrapper.addEventListener('pointercancel', endDrag);
    }
}