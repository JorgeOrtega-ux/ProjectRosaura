// public/assets/js/modules/admin/tags/AdminTagsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import DialogSystem from '../../../core/components/DialogSystem.js';

// Instanciamos el servicio de API
const Api = new ApiService();

export default class AdminTagsController {
    constructor() {
        this.tags = [];
        this.tbody = document.getElementById('tagsTableBody');
        this.emptyState = document.getElementById('tagsEmptyState');
        this.modal = document.getElementById('tagModalOverlay');
        this.form = document.getElementById('tagForm');
    }

    async init() {
        this.bindEvents();
        await this.loadTags();
    }

    bindEvents() {
        document.querySelectorAll('[data-action="openAddTagModal"]').forEach(btn => {
            btn.addEventListener('click', () => this.openModal());
        });

        document.querySelectorAll('[data-action="closeTagModal"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.querySelector('[data-action="submitTagForm"]').addEventListener('click', () => {
            this.submitForm();
        });
    }

    async loadTags() {
        try {
            const res = await Api.post('admin.get_tags', {});
            if (res.success) {
                this.tags = res.tags;
                this.renderTable();
            } else {
                DialogSystem.show('error', 'Error', res.message);
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    }

    renderTable() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';
        
        if (this.tags.length === 0) {
            this.emptyState.style.display = 'block';
            document.getElementById('tagsTable').style.display = 'none';
            return;
        }

        this.emptyState.style.display = 'none';
        document.getElementById('tagsTable').style.display = 'table';

        this.tags.forEach(tag => {
            const tr = document.createElement('tr');
            
            const typeLabel = tag.type === 'actor' 
                ? '<span class="component-badge component-badge--warning">Actor/Actriz</span>' 
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

        // Bindear eventos a los botones generados
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
        this.modal.style.display = 'none';
    }

    async submitForm() {
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const id = document.getElementById('tagId').value;
        const name = document.getElementById('tagName').value;
        const type = document.getElementById('tagType').value;

        const action = id ? 'admin.update_tag' : 'admin.create_tag';
        const payload = id ? { id, name, type } : { name, type };

        try {
            const res = await Api.post(action, payload);
            if (res.success) {
                DialogSystem.show('success', 'Éxito', res.message);
                this.closeModal();
                await this.loadTags();
            } else {
                DialogSystem.show('error', 'Error', res.message);
            }
        } catch (error) {
            DialogSystem.show('error', 'Error', 'Ocurrió un error inesperado al guardar.');
        }
    }

    async deleteTag(id) {
        DialogSystem.show('warning', 'Eliminar etiqueta', '¿Estás seguro de que deseas eliminar esta etiqueta?', [
            { text: 'Cancelar', style: 'light' },
            { 
                text: 'Eliminar', 
                style: 'dark', 
                callback: async () => {
                    try {
                        const res = await Api.post('admin.delete_tag', { id });
                        if (res.success) {
                            DialogSystem.show('success', 'Eliminado', res.message);
                            await this.loadTags();
                        } else {
                            DialogSystem.show('error', 'Error', res.message);
                        }
                    } catch (error) {
                        DialogSystem.show('error', 'Error', 'Error al eliminar la etiqueta.');
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