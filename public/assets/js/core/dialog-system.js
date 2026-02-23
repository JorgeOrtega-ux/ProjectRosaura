// public/assets/js/core/dialog-system.js
import { DialogTemplates } from './dialog-templates.js';

export class DialogSystem {
    constructor() {
        this.container = document.getElementById('dialog-container');
        this.templates = DialogTemplates;
        this.activeCloseFn = null;
    }

    /**
     * Muestra un diálogo y devuelve una promesa con estado y datos extraídos.
     * @param {string} templateName El nombre de la plantilla a renderizar.
     * @param {object} data Datos opcionales si la plantilla lo requiere en el futuro.
     * @returns {Promise<{confirmed: boolean, data: object}>}
     */
    show(templateName, data = {}) {
        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                console.error(`La plantilla de diálogo '${templateName}' no existe.`);
                resolve({ confirmed: false, data: {} });
                return;
            }

            // Crear Overlay
            const overlay = document.createElement('div');
            overlay.className = 'component-dialog-overlay';
            
            // Crear Caja Blanca
            const box = document.createElement('div');
            box.className = 'component-dialog-box';
            box.innerHTML = this.templates[templateName].build(data);
            
            overlay.appendChild(box);
            this.container.appendChild(overlay);

            // Trigger para la animación CSS inicial (Entrada)
            requestAnimationFrame(() => overlay.classList.add('active'));

            // Funcionalidad de cierre centralizada
            const closeDialog = (result) => {
                let formData = {};
                
                // Si el usuario confirmó, extraemos los valores de los inputs con IDs que haya en el diálogo
                if (result === true) {
                    const inputs = box.querySelectorAll('input');
                    inputs.forEach(inp => {
                        if (inp.id) formData[inp.id] = inp.value;
                    });
                }

                // Devolver el control a CSS
                box.style.transform = ''; 
                overlay.classList.remove('active');
                
                setTimeout(() => {
                    overlay.remove();
                    this.activeCloseFn = null;
                    resolve({ confirmed: result === true, data: formData });
                }, 300); // Mismo tiempo que la transición CSS (0.3s)
            };

            this.activeCloseFn = closeDialog;

            // Bind Botones
            const btnConfirm = box.querySelector('[data-dialog-action="confirm"]');
            const btnCancel = box.querySelector('[data-dialog-action="cancel"]');
            
            if(btnConfirm) btnConfirm.addEventListener('click', () => closeDialog(true));
            if(btnCancel) btnCancel.addEventListener('click', () => closeDialog(false));
            
            // Cerrar al dar click fuera (en el área oscura semitransparente)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDialog(false);
            });

            // Bind Drag & Drop para móviles
            const pill = box.querySelector('.pill-container');
            if (pill) {
                this.bindDragEvents(pill, box, overlay, () => closeDialog(false));
            }
        });
    }

    /**
     * Cierra forzosamente el diálogo actual abierto sin interacción del usuario
     */
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
                box.style.transform = '';
            }
            
            currentDiff = 0;
        };

        box.addEventListener('pointerup', endDrag);
        box.addEventListener('pointercancel', endDrag);
    }
}