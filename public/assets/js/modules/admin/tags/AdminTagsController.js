// public/assets/js/modules/admin/tags/AdminTagsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminTagsController {
    constructor() {
        this.api = new ApiService();
        this.tags = [];
        this.eventsBound = false; 
    }

    async init() {
        this.bindEvents();
        await this.loadTags();
        console.log("AdminTagsController inicializado.");
    }

    bindEvents() {
        if (this.eventsBound) return; 

        document.addEventListener('click', (e) => {
            const addTagBtn = e.target.closest('[data-action="openAddTagModal"]');
            const closeTagBtn = e.target.closest('[data-action="closeTagModal"]');
            const submitTagBtn = e.target.closest('[data-action="submitTagForm"]');
            const editBtn = e.target.closest('[data-action="edit"]');
            const deleteBtn = e.target.closest('[data-action="delete"]');
            
            // Detección de clicks fuera del modal (overlay o wrapper) para cerrarlo
            const isOverlay = e.target.classList.contains('component-dialog-overlay');
            const isWrapper = e.target.classList.contains('component-dialog-wrapper');

            if (addTagBtn) {
                e.preventDefault();
                this.openModal();
            }

            if (closeTagBtn) {
                e.preventDefault();
                this.closeModal();
            }

            if (submitTagBtn) {
                e.preventDefault();
                this.submitForm();
            }

            if (editBtn) {
                e.preventDefault();
                const id = editBtn.getAttribute('data-id');
                const tag = this.tags.find(t => t.id == id);
                if (tag) this.openModal(tag);
            }

            if (deleteBtn) {
                e.preventDefault();
                const id = deleteBtn.getAttribute('data-id');
                this.deleteTag(id);
            }

            // Cerrar al clickear el fondo (overlay o wrapper)
            if ((isOverlay || isWrapper) && e.target.closest('#tagModalOverlay')) {
                this.closeModal();
            }
        });

        // Bindeo del arrastre (drag) en móvil, replicando la función de tu DialogSystem
        this.bindStaticModalDragEvents();

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/tags')) {
                this.loadTags();
            }
        });

        this.eventsBound = true; 
    }

    bindStaticModalDragEvents() {
        const overlay = document.getElementById('tagModalOverlay');
        if (!overlay) return;
        
        const wrapper = overlay.querySelector('.component-dialog-wrapper');
        const pill = overlay.querySelector('.pill-container');
        
        if (!wrapper || !pill) return;

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
                this.closeModal();
            } else {
                wrapper.removeAttribute('style'); 
            }
            
            currentDiff = 0;
        };

        wrapper.addEventListener('pointerup', endDrag);
        wrapper.addEventListener('pointercancel', endDrag);
    }

    async loadTags() {
        try {
            const res = await this.api.post(ApiRoutes.Admin.GetTags, {});
            if (res.success) {
                this.tags = res.tags;
                this.renderTable();
            } else {
                window.dialogSystem.show('error', { title: 'Error', message: res.message || 'Error al obtener las etiquetas.' });
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            window.dialogSystem.show('error', { title: 'Error', message: 'Ocurrió un error inesperado al cargar la lista.' });
        }
    }

    renderTable() {
        const tbody = document.getElementById('tagsTableBody');
        const emptyState = document.getElementById('tagsEmptyState');
        const table = document.getElementById('tagsTable');

        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (this.tags.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (table) table.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (table) table.style.display = 'table';

        this.tags.forEach(tag => {
            const tr = document.createElement('tr');
            
            const typeLabel = tag.type === 'actor' 
                ? '<span class="component-badge component-badge--warning">Actor / Actriz</span>' 
                : '<span class="component-badge component-badge--primary">Categoría</span>';

            tr.innerHTML = `
                <td>${this.escapeHtml(tag.name)}</td>
                <td>${typeLabel}</td>
                <td style="display: flex; gap: 8px;">
                    <button class="component-button component-button--icon component-button--light" title="Editar" data-action="edit" data-id="${tag.id}">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--light" style="color: var(--status-danger);" title="Eliminar" data-action="delete" data-id="${tag.id}">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    openModal(tag = null) {
        const modal = document.getElementById('tagModalOverlay');
        const form = document.getElementById('tagForm');
        const wrapper = modal ? modal.querySelector('.component-dialog-wrapper') : null;
        
        if (!form || !modal) return;

        form.reset();
        document.getElementById('tagId').value = tag ? tag.id : '';
        
        if (tag) {
            document.getElementById('tagModalTitle').innerText = 'Editar Etiqueta';
            document.getElementById('tagName').value = tag.name;
            document.getElementById('tagType').value = tag.type;
        } else {
            document.getElementById('tagModalTitle').innerText = 'Nueva Etiqueta';
        }

        if (wrapper) wrapper.removeAttribute('style'); // Resetea cualquier transform de drag anterior
        
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }

    closeModal() {
        const modal = document.getElementById('tagModalOverlay');
        if (modal) {
            modal.classList.remove('active');
            
            // Limpiamos el formulario después de que la animación termine (300ms)
            setTimeout(() => {
                const form = document.getElementById('tagForm');
                if (form) form.reset();
            }, 300);
        }
    }

    async submitForm() {
        const form = document.getElementById('tagForm');
        
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return;
        }

        const id = document.getElementById('tagId').value;
        const name = document.getElementById('tagName').value;
        const type = document.getElementById('tagType').value;

        const action = id ? ApiRoutes.Admin.UpdateTag : ApiRoutes.Admin.CreateTag;
        const payload = id ? { id, name, type } : { name, type };

        try {
            const res = await this.api.post(action, payload);
            if (res.success) {
                // Invocación corregida usando objetos para el Data del DialogSystem
                window.dialogSystem.show('success', { title: 'Éxito', message: res.message || 'La etiqueta se ha guardado correctamente.' });
                this.closeModal();
                await this.loadTags();
            } else {
                window.dialogSystem.show('error', { title: 'Error', message: res.message || 'No se pudo guardar la etiqueta.' });
            }
        } catch (error) {
            window.dialogSystem.show('error', { title: 'Error', message: 'Ocurrió un error inesperado al procesar la solicitud.' });
        }
    }

    async deleteTag(id) {
        // Implementación correcta: DialogSystem.show retorna una Promise con un objeto de resultado
        const result = await window.dialogSystem.show('confirm', {
            title: 'Eliminar etiqueta',
            message: '¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción afectará a los videos vinculados.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });

        // Verificamos si el usuario le dio al botón de confirmar
        if (result.confirmed) {
            try {
                const res = await this.api.post(ApiRoutes.Admin.DeleteTag, { id });
                if (res.success) {
                    window.dialogSystem.show('success', { title: 'Eliminado', message: res.message || 'La etiqueta ha sido eliminada.' });
                    await this.loadTags();
                } else {
                    window.dialogSystem.show('error', { title: 'Error', message: res.message || 'No se pudo eliminar la etiqueta.' });
                }
            } catch (error) {
                window.dialogSystem.show('error', { title: 'Error', message: 'Ocurrió un error interno al intentar eliminar.' });
            }
        }
    }

    escapeHtml(unsafe) {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}