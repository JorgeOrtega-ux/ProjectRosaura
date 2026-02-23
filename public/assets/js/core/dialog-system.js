// public/assets/js/core/dialog-system.js

export class DialogSystem {
    constructor() {
        this.container = document.getElementById('dialog-container');
        
        // Aquí podrás guardar infinitas plantillas en el futuro
        this.templates = {
            confirmDeleteAvatar: {
                build: () => `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-dialog-header">
                        <h2 class="component-dialog-title">Eliminar foto de perfil</h2>
                        <p class="component-dialog-desc">¿Estás seguro de que deseas eliminar tu foto de perfil? Esta acción restaurará el avatar por defecto y no se puede deshacer.</p>
                    </div>
                    <div class="component-dialog-actions">
                        <button class="component-button component-button--h45" data-dialog-action="cancel">Cancelar</button>
                        <button class="component-button component-button--h45 component-button--dark" data-dialog-action="confirm">Eliminar</button>
                    </div>
                `
            }
        };
    }

    /**
     * Muestra un diálogo y devuelve una promesa.
     * @param {string} templateName El nombre de la plantilla a renderizar.
     * @param {object} data Datos opcionales si la plantilla lo requiere en el futuro.
     * @returns {Promise<boolean>} Resolves a true si se confirma, false si se cancela o cierra.
     */
    show(templateName, data = {}) {
        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                console.error(`La plantilla de diálogo '${templateName}' no existe.`);
                resolve(false);
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
                // CORRECCIÓN: Limpiamos el estilo inline para devolverle el control al CSS 
                // y permitir que la animación de salida se ejecute fluidamente.
                box.style.transform = ''; 
                
                overlay.classList.remove('active');
                
                setTimeout(() => {
                    overlay.remove();
                    resolve(result); // Se resuelve la promesa con true/false
                }, 300); // Mismo tiempo que la transición CSS (0.3s)
            };

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

    bindDragEvents(pill, box, overlay, closeCallback) {
        let startY = 0;
        let currentDiff = 0;
        let isDragging = false;

        pill.addEventListener('pointerdown', (e) => {
            // Solo activar en móviles (< 768px)
            if (window.innerWidth > 768) return;
            // Prevenir clic derecho de ratón
            if (e.pointerType === 'mouse' && e.button !== 0) return; 

            isDragging = true;
            startY = e.clientY;
            
            // is-dragging quita el transition temporalmente para que siga el dedo instantáneamente
            overlay.classList.add('is-dragging');
            box.setPointerCapture(e.pointerId);
        });

        box.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            currentDiff = e.clientY - startY;
            
            // Solo arrastrar hacia abajo
            if (currentDiff > 0) {
                box.style.transform = `translateY(${currentDiff}px)`;
            }
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            // Devolvemos las transiciones CSS al contenedor
            overlay.classList.remove('is-dragging');
            
            if (box.hasPointerCapture(e.pointerId)) {
                box.releasePointerCapture(e.pointerId);
            }

            // Si se arrastró más del 35% de la altura, cerrar
            if (currentDiff > box.offsetHeight * 0.35) {
                closeCallback();
            } else {
                // Rebotar al lugar original si no superó el límite
                box.style.transform = '';
            }
            
            currentDiff = 0;
        };

        box.addEventListener('pointerup', endDrag);
        box.addEventListener('pointercancel', endDrag);
    }
}