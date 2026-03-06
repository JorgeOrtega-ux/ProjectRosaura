// public/assets/js/modules/admin/tags/AdminTagsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { DialogSystem } from '../../../core/components/DialogSystem.js';

export class AdminTagsController {
    constructor() {
        this.api = new ApiService();
        this.tags = [];
        this.eventsBound = false; // <-- BANDERA DE BLINDAJE
    }

    async init() {
        this.bindEvents();
        await this.loadTags();
        console.log("AdminTagsController inicializado.");
    }

    bindEvents() {
        if (this.eventsBound) return; // <-- EVITA DUPLICAR EVENTOS EN SPA

        // DELEGACIÓN DE EVENTOS
        document.addEventListener('click', (e) => {
            const addTagBtn = e.target.closest('[data-action="openAddTagModal"]');
            const closeTagBtn = e.target.closest('[data-action="closeTagModal"]');
            const submitTagBtn = e.target.closest('[data-action="submitTagForm"]');
            const editBtn = e.target.closest('[data-action="edit"]');
            const deleteBtn = e.target.closest('[data-action="delete"]');

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
        });

        // Evento que recarga la info si el router inyecta de nuevo la vista
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/tags')) {
                this.loadTags();
            }
        });

        this.eventsBound = true; // <-- SELLA LOS EVENTOS
    }

    async loadTags() {
        try {
            const res = await this.api.post(ApiRoutes.Admin.GetTags, {});
            if (res.success) {
                this.tags = res.tags;
                this.renderTable();
            } else {
                window.dialogSystem.show('error', 'Error', res.message || 'Error al obtener las etiquetas.');
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            window.dialogSystem.show('error', 'Error', 'Ocurrió un error inesperado al cargar la lista.');
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
        
        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('tagModalOverlay');
        if (modal) {
            modal.style.display = 'none';
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
                window.dialogSystem.show('success', 'Éxito', res.message || 'La etiqueta se ha guardado correctamente.');
                this.closeModal();
                await this.loadTags();
            } else {
                window.dialogSystem.show('error', 'Error', res.message || 'No se pudo guardar la etiqueta.');
            }
        } catch (error) {
            window.dialogSystem.show('error', 'Error', 'Ocurrió un error inesperado al procesar la solicitud.');
        }
    }

    async deleteTag(id) {
        window.dialogSystem.show('warning', 'Eliminar etiqueta', '¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción afectará a los videos vinculados.', [
            { text: 'Cancelar', style: 'light' },
            { 
                text: 'Eliminar', 
                style: 'dark', 
                callback: async () => {
                    try {
                        const res = await this.api.post(ApiRoutes.Admin.DeleteTag, { id });
                        if (res.success) {
                            window.dialogSystem.show('success', 'Eliminado', res.message || 'La etiqueta ha sido eliminada.');
                            await this.loadTags();
                        } else {
                            window.dialogSystem.show('error', 'Error', res.message || 'No se pudo eliminar la etiqueta.');
                        }
                    } catch (error) {
                        window.dialogSystem.show('error', 'Error', 'Ocurrió un error interno al intentar eliminar.');
                    }
                }
            }
        ]);
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