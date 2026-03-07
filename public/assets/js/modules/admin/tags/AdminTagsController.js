// public/assets/js/modules/admin/tags/AdminTagsController.js

import { ApiService } from '../../../core/api/ApiServices.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export class AdminTagsController {
    constructor() {
        this.api = new ApiService();
        this.tags = [];
        this.selectedTagId = null;
        this.eventsBound = false; 
    }

    async init() {
        this.bindEvents();
        await this.loadTags();
        console.log("AdminTagsController inicializado con soporte de Modelos y Género.");
    }

    bindEvents() {
        if (this.eventsBound) return; 

        document.addEventListener('click', (e) => {
            const addTagBtn = e.target.closest('[data-action="openAddTagModal"]');
            const closeTagBtn = e.target.closest('[data-action="closeTagModal"]');
            const submitTagBtn = e.target.closest('[data-action="submitTagForm"]');
            
            const searchBtn = e.target.closest('[data-action="searchTag"]');
            const toggleFiltersBtn = e.target.closest('[data-action="toggleTagFilters"]');
            const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
            const selectTarget = e.target.closest('[data-action="selectTag"]');
            const deselectBtn = e.target.closest('[data-action="deselectTag"]');
            const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
            const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
            
            const editTagBtn = e.target.closest('[data-action="editSelectedTag"]');
            const deleteTagBtn = e.target.closest('[data-action="deleteSelectedTag"]');
            
            const isOverlay = e.target.classList.contains('component-dialog-overlay');
            const isWrapper = e.target.classList.contains('component-dialog-wrapper');

            if (addTagBtn) { e.preventDefault(); this.openModal(); }
            if (closeTagBtn) { e.preventDefault(); this.closeModal(); }
            if (submitTagBtn) { e.preventDefault(); this.submitForm(); }
            if ((isOverlay || isWrapper) && e.target.closest('#tagModalOverlay')) this.closeModal();

            if (searchBtn) this.toggleSearchToolbar();
            if (toggleFiltersBtn) this.toggleFiltersModule();
            if (viewBtn) this.toggleViewMode(viewBtn);

            if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
            if (backToMainFiltersBtn) { e.preventDefault(); e.stopPropagation(); this.backToMainFilters(); }

            if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
                this.handleTagSelection(selectTarget);
            }

            if (deselectBtn) this.deselectTag();
            
            if (editTagBtn) {
                e.preventDefault();
                const tag = this.tags.find(t => t.id == this.selectedTagId);
                if (tag) this.openModal(tag);
            }

            if (deleteTagBtn) {
                e.preventDefault();
                this.deleteTag(this.selectedTagId);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.getAttribute('data-ref') === 'tag-search-input') {
                this.applyAllFilters();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('filter-checkbox')) {
                this.applyAllFilters();
            }
            
            // Lógica para mostrar/ocultar género en el modal
            if (e.target && e.target.id === 'tagType') {
                this.handleTypeChange(e.target.value);
            }
        });

        this.bindStaticModalDragEvents();

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/tags')) {
                const searchInput = document.querySelector('[data-ref="tag-search-input"]');
                if (searchInput) searchInput.value = '';
                
                document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
                
                this.backToMainFilters();
                this.loadTags();
            }
        });

        this.eventsBound = true; 
    }

    handleTypeChange(type) {
        const genderGroup = document.getElementById('tagGenderGroup');
        const genderSelect = document.getElementById('tagGender');
        if (genderGroup && genderSelect) {
            if (type === 'modelo') {
                genderGroup.style.display = 'block';
                genderSelect.setAttribute('required', 'required');
            } else {
                genderGroup.style.display = 'none';
                genderSelect.removeAttribute('required');
            }
        }
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
                this.renderTags();
                this.deselectTag(); 
                this.applyAllFilters();
            } else {
                window.dialogSystem.show('error', { title: 'Error', message: res.message || 'Error al obtener las etiquetas.' });
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            window.dialogSystem.show('error', { title: 'Error', message: 'Ocurrió un error inesperado al cargar la lista.' });
        }
    }

    getGenderLabel(gender) {
        const labels = {
            'female': 'Femenino',
            'male': 'Masculino',
            'trans': 'Trans',
            'other': 'Otro'
        };
        return labels[gender] || '-';
    }

    getGenderIcon(gender) {
        const icons = {
            'female': 'female',
            'male': 'male',
            'trans': 'transgender',
            'other': 'person'
        };
        return icons[gender] || 'remove';
    }

    renderTags() {
        const cardsBody = document.getElementById('tagsCardsBody');
        const tableBody = document.getElementById('tagsTableBody');
        const systemEmptyCards = document.getElementById('tagsSystemEmptyCards');
        const systemEmptyTable = document.getElementById('tagsSystemEmptyTable');
        const table = document.getElementById('tagsTable');

        if (!cardsBody || !tableBody) return;
        
        cardsBody.innerHTML = '';
        tableBody.innerHTML = '';
        
        if (this.tags.length === 0) {
            if (systemEmptyCards) systemEmptyCards.style.display = 'flex';
            if (systemEmptyTable) systemEmptyTable.style.display = 'table-cell';
            if (table) table.style.display = 'none';
            return;
        }

        if (systemEmptyCards) systemEmptyCards.style.display = 'none';
        if (systemEmptyTable) systemEmptyTable.style.display = 'none';
        if (table) table.style.display = 'table';

        this.tags.forEach(tag => {
            const typeLabel = tag.type === 'modelo' ? 'Modelo' : 'Categoría';
            const typeIcon = tag.type === 'modelo' ? 'star' : 'category';
            const genderLabel = tag.type === 'modelo' ? this.getGenderLabel(tag.gender) : 'N/A';
            const genderIcon = tag.type === 'modelo' ? this.getGenderIcon(tag.gender) : 'horizontal_rule';

            // --- Generar Tarjeta ---
            const card = document.createElement('div');
            card.className = 'component-item-card tag-card-item';
            card.setAttribute('data-action', 'selectTag');
            card.setAttribute('data-tag-id', tag.id);
            card.setAttribute('data-type', tag.type);
            card.setAttribute('data-gender', tag.gender || '');
            
            card.innerHTML = `
                <div class="component-badge-list">
                    <div class="component-badge">
                        <span class="material-symbols-rounded">label</span>
                        <span class="search-target font-medium">${this.escapeHtml(tag.name)}</span>
                    </div>
                    <div class="component-badge">
                        <span class="material-symbols-rounded">${typeIcon}</span>
                        <span class="search-target">${typeLabel}</span>
                    </div>
                    ${tag.type === 'modelo' ? `
                    <div class="component-badge" style="background: var(--surface-hover);">
                        <span class="material-symbols-rounded">${genderIcon}</span>
                        <span class="search-target">${genderLabel}</span>
                    </div>` : ''}
                </div>
            `;
            cardsBody.appendChild(card);

            // --- Generar Fila de Tabla ---
            const tr = document.createElement('tr');
            tr.className = 'tag-card-item';
            tr.setAttribute('data-action', 'selectTag');
            tr.setAttribute('data-tag-id', tag.id);
            tr.setAttribute('data-type', tag.type);
            tr.setAttribute('data-gender', tag.gender || '');
            
            tr.innerHTML = `
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">label</span>
                        <span class="search-target font-medium">${this.escapeHtml(tag.name)}</span>
                    </div>
                </td>
                <td>
                    <div class="component-badge component-badge--sm">
                        <span class="material-symbols-rounded">${typeIcon}</span>
                        <span class="search-target">${typeLabel}</span>
                    </div>
                </td>
                <td>
                    ${tag.type === 'modelo' ? `
                    <div class="component-badge component-badge--sm" style="background: var(--surface-hover);">
                        <span class="material-symbols-rounded">${genderIcon}</span>
                        <span class="search-target">${genderLabel}</span>
                    </div>` : '<span style="color:var(--text-tertiary); margin-left:10px;">-</span>'}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    openFilterSubMenu(btn) {
        const targetId = btn.getAttribute('data-target');
        const targetMenu = document.querySelector(`[data-ref="${targetId}"]`);
        const mainFilters = document.querySelector('[data-ref="menuMainFilters"]');
        
        if (targetMenu && mainFilters) {
            mainFilters.classList.add('disabled');
            mainFilters.classList.remove('active');
            
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }
    }

    backToMainFilters() {
        const mainFilters = document.querySelector('[data-ref="menuMainFilters"]');
        const subMenus = document.querySelectorAll('[data-module="moduleTagFilters"] .component-menu:not([data-ref="menuMainFilters"])');
        
        if (mainFilters) {
            subMenus.forEach(menu => {
                menu.classList.add('disabled');
                menu.classList.remove('active');
            });
            
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
        }
    }

    toggleFiltersModule() {
        if (window.appInstance) {
            window.appInstance.toggleModule('moduleTagFilters');
            const filtersModule = document.querySelector('[data-module="moduleTagFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); 
            }
        }
    }

    handleTagSelection(target) {
        const tagId = target.getAttribute('data-tag-id');
        
        if (this.selectedTagId === tagId) {
            this.deselectTag();
            return;
        }

        this.selectedTagId = tagId;

        document.querySelectorAll('[data-action="selectTag"]').forEach(el => {
            el.classList.remove('selected');
        });

        document.querySelectorAll(`[data-action="selectTag"][data-tag-id="${tagId}"]`).forEach(el => {
            el.classList.add('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');

        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }

        if (secondaryToolbar && secondaryToolbar.classList.contains('active')) {
            secondaryToolbar.classList.remove('active');
        }
        
        const filtersModule = document.querySelector('[data-module="moduleTagFilters"]');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }
    }

    deselectTag() {
        this.selectedTagId = null;

        document.querySelectorAll('[data-action="selectTag"]').forEach(el => {
            el.classList.remove('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');

        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');
        const searchInput = document.querySelector('[data-ref="tag-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleTagFilters"]');
        
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }

        if (secondaryToolbar) {
            secondaryToolbar.classList.toggle('active');
            
            if (secondaryToolbar.classList.contains('active')) {
                if (searchInput) setTimeout(() => searchInput.focus(), 50);
            } else {
                if (searchInput) {
                    searchInput.value = '';
                    this.applyAllFilters();
                }
            }
        }
    }

    toggleViewMode(btn) {
        const wrapper = document.querySelector('[data-ref="manage-tags-wrapper"]');
        const header = document.querySelector('[data-ref="manage-tags-header"]');
        const viewCards = document.querySelector('[data-ref="view-cards"]');
        const viewTable = document.querySelector('[data-ref="view-table"]');
        const dynamicTitle = document.querySelector('[data-ref="toolbar-dynamic-title"]');
        const iconElement = btn.querySelector('.material-symbols-rounded');

        if (!wrapper || !header || !viewCards || !viewTable) return;

        if (viewCards.classList.contains('active')) {
            viewCards.classList.replace('active', 'disabled');
            viewTable.classList.replace('disabled', 'active');
            
            header.classList.add('disabled');
            wrapper.classList.add('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.remove('disabled');
            
            if (iconElement) iconElement.textContent = 'grid_view';
        } else {
            viewTable.classList.replace('active', 'disabled');
            viewCards.classList.replace('disabled', 'active');
            
            header.classList.remove('disabled');
            wrapper.classList.remove('component-wrapper--full');
            if (dynamicTitle) dynamicTitle.classList.add('disabled');
            
            if (iconElement) iconElement.textContent = 'table_rows';
        }
    }

    applyAllFilters() {
        if (this.tags.length === 0) return; 

        const queryInput = document.querySelector('[data-ref="tag-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const typeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="type"]'));
        const checkedTypes = typeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const genderCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="gender"]'));
        const checkedGenders = genderCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasTypeFilter = checkedTypes.length < typeCheckboxes.length;
            const hasGenderFilter = checkedGenders.length < genderCheckboxes.length;
            if (hasTypeFilter || hasGenderFilter) {
                filtersBtn.classList.add('has-active-filter');
            } else {
                filtersBtn.classList.remove('has-active-filter');
            }
        }

        const processContainer = (containerRef, emptyRef) => {
            const container = document.querySelector(`[data-ref="${containerRef}"]`);
            if (!container) return;

            let visibleCount = 0;
            let lastVisibleItem = null;
            const items = container.querySelectorAll('.tag-card-item');
            
            items.forEach(item => {
                item.classList.remove('last-visible-row');
                const itemType = item.getAttribute('data-type');
                const itemGender = item.getAttribute('data-gender');
                
                const textContent = Array.from(item.querySelectorAll('.search-target'))
                    .map(el => el.textContent.toLowerCase())
                    .join(' ');
                
                const matchesSearch = textContent.includes(query);
                const matchesType = checkedTypes.includes(itemType);
                
                let matchesGender = true;
                if (itemType === 'modelo') {
                    matchesGender = checkedGenders.includes(itemGender);
                }

                if (matchesSearch && matchesType && matchesGender) {
                    item.classList.remove('disabled');
                    visibleCount++;
                    lastVisibleItem = item;
                } else {
                    item.classList.add('disabled');
                }
            });

            if (lastVisibleItem) {
                lastVisibleItem.classList.add('last-visible-row');
            }

            const emptyElement = document.querySelector(`[data-ref="${emptyRef}"]`);
            if (emptyElement) {
                if (visibleCount === 0 && items.length > 0) {
                    emptyElement.classList.remove('disabled');
                } else {
                    emptyElement.classList.add('disabled');
                }
            }
        };

        processContainer('view-cards', 'empty-search-cards');
        processContainer('view-table', 'empty-search-table');
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
            if (tag.type === 'modelo') {
                document.getElementById('tagGender').value = tag.gender;
            }
        } else {
            document.getElementById('tagModalTitle').innerText = 'Nueva Etiqueta';
        }

        this.handleTypeChange(document.getElementById('tagType').value);

        if (wrapper) wrapper.removeAttribute('style'); 
        
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    }

    closeModal() {
        const modal = document.getElementById('tagModalOverlay');
        if (modal) {
            modal.classList.remove('active');
            
            setTimeout(() => {
                const form = document.getElementById('tagForm');
                if (form) form.reset();
                this.handleTypeChange('category'); // Reset visual
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
        const gender = document.getElementById('tagGender').value;

        const action = id ? ApiRoutes.Admin.UpdateTag : ApiRoutes.Admin.CreateTag;
        
        const payload = { name, type };
        if (id) payload.id = id;
        if (type === 'modelo') payload.gender = gender;

        try {
            const res = await this.api.post(action, payload);
            if (res.success) {
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
        if (!id) return;
        const result = await window.dialogSystem.show('confirm', {
            title: 'Eliminar etiqueta',
            message: '¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción afectará a los videos vinculados.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });

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