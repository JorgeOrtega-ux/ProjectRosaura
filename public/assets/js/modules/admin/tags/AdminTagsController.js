// public/assets/js/modules/admin/tags/AdminTagsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import {DialogSystem} from '../../../core/components/DialogSystem.js';

export default class AdminTagsController {
    constructor() {
        // La API se instancia como propiedad de la clase, no suelta en el módulo
        this.api = new ApiService();
        this.tags = [];
    }

    async init() {
        // En una SPA, mapear el DOM debe hacerse AQUÍ, no en el constructor.
        // Esto garantiza que el router ya haya inyectado la vista.
        this.tbody = document.getElementById('tagsTableBody');
        this.emptyState = document.getElementById('tagsEmptyState');
        this.modal = document.getElementById('tagModalOverlay');
        this.form = document.getElementById('tagForm');
        this.table = document.getElementById('tagsTable');

        this.bindEvents();
        await this.loadTags();
    }

    bindEvents() {
        // Usamos .onclick para elementos estáticos de la vista.
        // Esto previene que los eventos se acumulen si init() se ejecuta más de una vez.
        const addTagBtn = document.querySelector('[data-action="openAddTagModal"]');
        if (addTagBtn) {
            addTagBtn.onclick = () => this.openModal();
        }

        document.querySelectorAll('[data-action="closeTagModal"]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                this.closeModal();
            };
        });

        const submitBtn = document.querySelector('[data-action="submitTagForm"]');
        if (submitBtn) {
            submitBtn.onclick = (e) => {
                e.preventDefault();
                this.submitForm();
            };
        }
    }

    async loadTags() {
        try {
            // Se cambia el hardcode por el estándar de ApiRoutes
            const res = await this.api.post(ApiRoutes.Admin.GetTags, {});
            if (res.success) {
                this.tags = res.tags;
                this.renderTable();
            } else {
                DialogSystem.show('error', 'Error', res.message || 'Error al obtener las etiquetas.');
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            DialogSystem.show('error', 'Error', 'Ocurrió un error inesperado al cargar la lista.');
        }
    }

    renderTable() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';
        
        if (this.tags.length === 0) {
            if (this.emptyState) this.emptyState.style.display = 'block';
            if (this.table) this.table.style.display = 'none';
            return;
        }

        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.table) this.table.style.display = 'table';

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
            this.tbody.appendChild(tr);
        });

        // Estos botones son dinámicos (se recrean en cada render), aquí sí usamos addEventListener
        this.tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const tag = this.tags.find(t => t.id == id);
                if (tag) this.openModal(tag);
            });
        });

        this.tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.deleteTag(id);
            });
        });
    }

    openModal(tag = null) {
        if (!this.form || !this.modal) return;

        this.form.reset();
        document.getElementById('tagId').value = tag ? tag.id : '';
        
        if (tag) {
            document.getElementById('tagModalTitle').innerText = 'Editar Etiqueta';
            document.getElementById('tagName').value = tag.name;
            document.getElementById('tagType').value = tag.type;
        } else {
            document.getElementById('tagModalTitle').innerText = 'Nueva Etiqueta';
        }
        
        this.modal.style.display = 'flex';
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    async submitForm() {
        if (!this.form || !this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const id = document.getElementById('tagId').value;
        const name = document.getElementById('tagName').value;
        const type = document.getElementById('tagType').value;

        // Validamos si es actualización o creación usando las rutas estandarizadas
        const action = id ? ApiRoutes.Admin.UpdateTag : ApiRoutes.Admin.CreateTag;
        const payload = id ? { id, name, type } : { name, type };

        try {
            const res = await this.api.post(action, payload);
            if (res.success) {
                DialogSystem.show('success', 'Éxito', res.message || 'La etiqueta se ha guardado correctamente.');
                this.closeModal();
                await this.loadTags();
            } else {
                DialogSystem.show('error', 'Error', res.message || 'No se pudo guardar la etiqueta.');
            }
        } catch (error) {
            DialogSystem.show('error', 'Error', 'Ocurrió un error inesperado al procesar la solicitud.');
        }
    }

    async deleteTag(id) {
        DialogSystem.show('warning', 'Eliminar etiqueta', '¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción afectará a los videos vinculados.', [
            { text: 'Cancelar', style: 'light' },
            { 
                text: 'Eliminar', 
                style: 'dark', 
                callback: async () => {
                    try {
                        const res = await this.api.post(ApiRoutes.Admin.DeleteTag, { id });
                        if (res.success) {
                            DialogSystem.show('success', 'Eliminado', res.message || 'La etiqueta ha sido eliminada.');
                            await this.loadTags();
                        } else {
                            DialogSystem.show('error', 'Error', res.message || 'No se pudo eliminar la etiqueta.');
                        }
                    } catch (error) {
                        DialogSystem.show('error', 'Error', 'Ocurrió un error interno al intentar eliminar.');
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