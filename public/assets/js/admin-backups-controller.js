// public/assets/js/admin-backups-controller.js

import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminBackupsController {
    constructor() {
        this.selectedBackupId = null; 
        this.api = new ApiService();
        this.init();
    }

    init() {
        this.bindEvents();
        console.log("AdminBackupsController inicializado.");
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/backups')) return;

            const searchBtn = e.target.closest('[data-action="searchBackup"]');
            const toggleFiltersBtn = e.target.closest('[data-action="toggleBackupFilters"]');
            const viewBtn = e.target.closest('[data-action="toggleViewMode"]');
            const selectTarget = e.target.closest('[data-action="selectBackup"]');
            const deselectBtn = e.target.closest('[data-action="deselectBackup"]');
            const openSubMenuBtn = e.target.closest('[data-action="openFilterSubMenu"]');
            const backToMainFiltersBtn = e.target.closest('[data-action="backToMainFilters"]');
            
            const createBtn = e.target.closest('[data-action="createBackup"]');
            const restoreBtn = e.target.closest('[data-action="restoreSelectedBackup"]');
            const deleteBtn = e.target.closest('[data-action="deleteSelectedBackup"]');
            
            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            
            if (searchBtn) this.toggleSearchToolbar();
            if (toggleFiltersBtn) this.toggleFiltersModule();
            if (viewBtn) this.toggleViewMode(viewBtn);

            if (openSubMenuBtn) this.openFilterSubMenu(openSubMenuBtn);
            if (backToMainFiltersBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.backToMainFilters();
            }

            if (selectTarget && !e.target.closest('button') && !e.target.closest('.component-dropdown-wrapper')) {
                this.handleBackupSelection(selectTarget);
            }

            if (deselectBtn) this.deselectBackup();
            
            if (createBtn) this.createBackup();
            if (restoreBtn) this.restoreSelectedBackup();
            if (deleteBtn) this.deleteSelectedBackup();

            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'backup_action_password') {
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        togglePassBtn.textContent = 'visibility';
                    } else {
                        inputField.type = 'password';
                        togglePassBtn.textContent = 'visibility_off';
                    }
                }
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.getAttribute('data-ref') === 'backup-search-input') {
                this.applyAllFilters();
            }
        });

        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/backups')) return;
            if (e.target && e.target.classList.contains('filter-checkbox')) {
                this.applyAllFilters();
            }
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/backups')) {
                const searchInput = document.querySelector('[data-ref="backup-search-input"]');
                if (searchInput) searchInput.value = '';
                
                document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = true);
                
                this.backToMainFilters();
                this.applyAllFilters();
                this.deselectBackup(); 
            }
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
        const subMenus = document.querySelectorAll('[data-module="moduleBackupFilters"] .component-menu:not([data-ref="menuMainFilters"])');
        
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
            window.appInstance.toggleModule('moduleBackupFilters');
            const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
            if (filtersModule && !filtersModule.classList.contains('disabled')) {
                this.backToMainFilters(); 
            }
        }
    }

    handleBackupSelection(target) {
        const backupId = target.getAttribute('data-backup-id');
        
        if (this.selectedBackupId === backupId) {
            this.deselectBackup();
            return;
        }

        this.selectedBackupId = backupId;

        document.querySelectorAll('[data-action="selectBackup"]').forEach(el => {
            el.classList.remove('selected');
        });

        document.querySelectorAll(`[data-action="selectBackup"][data-backup-id="${backupId}"]`).forEach(el => {
            el.classList.add('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');
        
        const passInput = document.getElementById('backup_action_password');
        if (passInput) passInput.value = '';

        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }

        if (secondaryToolbar && secondaryToolbar.classList.contains('active')) {
            secondaryToolbar.classList.remove('active');
        }
        
        const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
        if (filtersModule && !filtersModule.classList.contains('disabled')) {
            if (window.appInstance) window.appInstance.closeModule(filtersModule);
        }
    }

    deselectBackup() {
        this.selectedBackupId = null;

        document.querySelectorAll('[data-action="selectBackup"]').forEach(el => {
            el.classList.remove('selected');
        });

        const defaultMode = document.querySelector('[data-ref="toolbar-default-mode"]');
        const selectionMode = document.querySelector('[data-ref="toolbar-selection-mode"]');
        
        const passInput = document.getElementById('backup_action_password');
        if (passInput) passInput.value = '';

        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    toggleSearchToolbar() {
        const secondaryToolbar = document.querySelector('[data-ref="secondary-toolbar"]');
        const searchInput = document.querySelector('[data-ref="backup-search-input"]');
        const filtersModule = document.querySelector('[data-module="moduleBackupFilters"]');
        
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
        const wrapper = document.querySelector('[data-ref="manage-backups-wrapper"]');
        const header = document.querySelector('[data-ref="manage-backups-header"]');
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
        const queryInput = document.querySelector('[data-ref="backup-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const typeCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="type"]'));
        const statusCheckboxes = Array.from(document.querySelectorAll('.filter-checkbox[data-filter-type="status"]'));
        
        const checkedTypes = typeCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
        const checkedStatuses = statusCheckboxes.filter(cb => cb.checked).map(cb => cb.value);

        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const filtersBtn = document.querySelector('[data-ref="btn-toggle-filters"]');
        if (filtersBtn) {
            const hasTypeFilter = checkedTypes.length < typeCheckboxes.length;
            const hasStatusFilter = checkedStatuses.length < statusCheckboxes.length;
            if (hasTypeFilter || hasStatusFilter) {
                filtersBtn.classList.add('has-active-filter');
            } else {
                filtersBtn.classList.remove('has-active-filter');
            }
        }

        const processContainer = (containerRef, emptyRef) => {
            const container = document.querySelector(`[data-ref="${containerRef}"]`);
            if (!container) return;

            let visibleCount = 0;
            const items = container.querySelectorAll('.backup-card-item');
            
            items.forEach(item => {
                const itemType = item.getAttribute('data-type');
                const itemStatus = item.getAttribute('data-status');
                
                const textContent = Array.from(item.querySelectorAll('.search-target'))
                    .map(el => el.textContent.toLowerCase())
                    .join(' ');
                
                const matchesSearch = textContent.includes(query);
                const matchesType = checkedTypes.includes(itemType);
                const matchesStatus = checkedStatuses.includes(itemStatus);

                if (matchesSearch && matchesType && matchesStatus) {
                    item.classList.remove('disabled');
                    visibleCount++;
                } else {
                    item.classList.add('disabled');
                }
            });

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

    async createBackup() {
        if (window.appInstance) window.appInstance.showToast('Creando copia de seguridad, por favor espera...', 'info');
        
        const res = await this.api.post(ApiRoutes.Admin.CreateBackup);
        
        if (res.success) {
            if (window.appInstance) window.appInstance.showToast(res.message, 'success');
            if (window.spaRouter) window.spaRouter.loadRoute('/ProjectRosaura/admin/backups');
            else window.location.reload();
        } else {
            if (window.appInstance) window.appInstance.showToast(res.message, 'error');
        }
    }

    async restoreSelectedBackup() {
        if (!this.selectedBackupId) return;
        
        const passInput = document.getElementById('backup_action_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            if (window.appInstance) window.appInstance.showToast('Ingresa tu contraseña para autorizar la restauración.', 'error');
            return;
        }
        
        if (confirm('¿Estás totalmente seguro de restaurar esta copia? Los datos actuales de la base de datos se sobreescribirán.')) {
            if (window.appInstance) window.appInstance.showToast('Restaurando base de datos...', 'info');
            
            const res = await this.api.post(ApiRoutes.Admin.RestoreBackup, { backup_id: this.selectedBackupId, password: password });
            
            if (res.success) {
                if (window.appInstance) window.appInstance.showToast(res.message, 'success');
                if (passInput) passInput.value = '';
                this.deselectBackup();
            } else {
                if (window.appInstance) window.appInstance.showToast(res.message, 'error');
            }
        }
    }

    async deleteSelectedBackup() {
        if (!this.selectedBackupId) return;
        
        const passInput = document.getElementById('backup_action_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            if (window.appInstance) window.appInstance.showToast('Ingresa tu contraseña para autorizar la eliminación.', 'error');
            return;
        }
        
        if (confirm('¿Estás seguro de que deseas eliminar esta copia de seguridad de forma permanente?')) {
            const res = await this.api.post(ApiRoutes.Admin.DeleteBackup, { backup_id: this.selectedBackupId, password: password });
            
            if (res.success) {
                if (window.appInstance) window.appInstance.showToast(res.message, 'success');
                if (passInput) passInput.value = '';
                this.deselectBackup();
                if (window.spaRouter) window.spaRouter.loadRoute('/ProjectRosaura/admin/backups');
                else window.location.reload();
            } else {
                if (window.appInstance) window.appInstance.showToast(res.message, 'error');
            }
        }
    }
}