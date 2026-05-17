// public/assets/js/modules/admin/roles/AdminRolesController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

const _t = (key, fallback) => {
    if (typeof window.__ === 'function') {
        const trans = window.__(key);
        if (trans && trans !== key) return trans;
    }
    return fallback;
};

class AdminRolesController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false; 
        
        this.selectedRoleId = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleGlobalInputBound = this.handleGlobalInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();
        
        this.bindEvents();
    }

    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();

        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('input', this.handleGlobalInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        
        this.selectedRoleId = null;
        this.isInitialized = false;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        document.addEventListener('input', this.handleGlobalInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/roles')) {
            const searchInput = document.querySelector('[data-ref="role-search-input"]');
            if (searchInput) searchInput.value = '';
            
            const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
            if (searchToolbar) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
            this.applyAllFilters();
            this.deselectAll();
        }
    }

    handleGlobalClick(e) {
        const selectTarget = e.target.closest('[data-action="selectRoleRow"]');
        const searchBtn = e.target.closest('[data-action="searchRole"]');
        const addBtn = e.target.closest('[data-action="addRole"]');
        const editBtn = e.target.closest('[data-action="editRole"]');
        const permsBtn = e.target.closest('[data-action="editPermissions"]');
        const deleteBtn = e.target.closest('[data-action="deleteRole"]');
        
        if (selectTarget) this.handleRowSelection(selectTarget);
        if (searchBtn) this.toggleSearchToolbar();
        if (addBtn) this.navigateToAddRole();
        if (editBtn) this.navigateToEditRole();
        if (permsBtn) this.navigateToEditPermissions();
        if (deleteBtn) this.openDeleteRoleDialog();

        // Lógica de cierre para el toolbar flotante (click-outside)
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        if (searchToolbar && !searchToolbar.classList.contains('disabled')) {
            if (!e.target.closest('[data-ref="search-toolbar"]') && !searchBtn) {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    handleGlobalInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'role-search-input') {
            this.applyAllFilters();
        }
    }

    toggleSearchToolbar() {
        const searchToolbar = document.querySelector('[data-ref="search-toolbar"]');
        const searchInput = document.querySelector('[data-ref="role-search-input"]');
        
        if (searchToolbar) {
            if (searchToolbar.classList.contains('disabled')) {
                searchToolbar.classList.remove('disabled');
                searchToolbar.classList.add('active');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 50);
                }
            } else {
                searchToolbar.classList.remove('active');
                searchToolbar.classList.add('disabled');
            }
        }
    }

    applyAllFilters() {
        const queryInput = document.querySelector('[data-ref="role-search-input"]');
        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        
        const searchBtn = document.querySelector('[data-ref="btn-toggle-search"]');
        if (searchBtn) {
            if (query.length > 0) searchBtn.classList.add('has-active-filter');
            else searchBtn.classList.remove('has-active-filter');
        }

        const container = document.querySelector(`[data-ref="roles-table-body"]`);
        if (!container) return;

        let visibleCount = 0;
        let lastVisibleItem = null;
        const items = container.querySelectorAll('[data-action="selectRoleRow"]');
        
        items.forEach(item => {
            item.classList.remove('last-visible-row');
            
            const textContent = Array.from(item.querySelectorAll('.search-target'))
                .map(el => el.textContent.toLowerCase())
                .join(' ');
            
            const matchesSearch = textContent.includes(query);

            if (matchesSearch) {
                item.classList.remove('disabled');
                visibleCount++;
                lastVisibleItem = item;
            } else {
                item.classList.add('disabled');
            }
        });

        if (lastVisibleItem) lastVisibleItem.classList.add('last-visible-row');

        const emptyElement = document.querySelector(`[data-ref="empty-search-table"]`);
        if (emptyElement) {
            if (visibleCount === 0 && items.length > 0) emptyElement.classList.remove('disabled');
            else emptyElement.classList.add('disabled');
        }
    }

    navigateToAddRole() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/roles/create`);
        } else {
            window.location.href = `${this.basePath}/admin/roles/create`;
        }
    }

    navigateToEditRole() {
        if (!this.selectedRoleId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/roles/edit?id=${this.selectedRoleId}`);
        } else {
            window.location.href = `${this.basePath}/admin/roles/edit?id=${this.selectedRoleId}`;
        }
    }

    navigateToEditPermissions() {
        if (!this.selectedRoleId) return;
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/roles/permissions?id=${this.selectedRoleId}`);
        } else {
            window.location.href = `${this.basePath}/admin/roles/permissions?id=${this.selectedRoleId}`;
        }
    }

    handleRowSelection(target) {
        const roleId = parseInt(target.getAttribute('data-role-id'), 10);
        
        if (this.selectedRoleId === roleId) {
            this.deselectAll();
            return;
        }
        
        this.selectedRoleId = roleId;
        
        // Uso de classList para estado visual
        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(row => {
            if(row.getAttribute('data-role-id') == roleId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="role-selection-actions"]');

        if (defaultMode && selectionMode) {
            defaultMode.classList.replace('active', 'disabled');
            selectionMode.classList.replace('disabled', 'active');
        }

        // VALIDACIONES DE SEGURIDAD PARA LA INTERFAZ
        const isSystem = parseInt(target.getAttribute('data-is-system') || 0, 10) === 1;
        const roleWeight = parseInt(target.getAttribute('data-role-weight') || 0, 10);
        
        const view = document.querySelector('[data-ref="manageRolesView"]');
        const currentUserWeight = parseInt(view ? view.getAttribute('data-current-user-weight') : 0, 10);

        const deleteBtn = document.querySelector('[data-action="deleteRole"]');
        const editBtn = document.querySelector('[data-action="editRole"]');
        const permsBtn = document.querySelector('[data-action="editPermissions"]');

        // Reset visual base
        if (deleteBtn) { deleteBtn.style.opacity = '1'; deleteBtn.style.pointerEvents = 'auto'; deleteBtn.removeAttribute('title'); }
        if (editBtn) { editBtn.style.opacity = '1'; editBtn.style.pointerEvents = 'auto'; editBtn.removeAttribute('title'); }
        if (permsBtn) { permsBtn.style.opacity = '1'; permsBtn.style.pointerEvents = 'auto'; permsBtn.removeAttribute('title'); }

        // Aplicación del Techo de Cristal
        if (currentUserWeight < 100 && roleWeight >= currentUserWeight) {
            if (deleteBtn) {
                deleteBtn.style.opacity = '0.3'; deleteBtn.style.pointerEvents = 'none';
                deleteBtn.setAttribute('title', _t('admin_role_err_glass_ceiling', 'Jerarquía insuficiente para modificar o eliminar este rol'));
            }
            if (editBtn) {
                editBtn.style.opacity = '0.3'; editBtn.style.pointerEvents = 'none';
                editBtn.setAttribute('title', _t('admin_role_err_glass_ceiling', 'Jerarquía insuficiente para modificar este rol'));
            }
            if (permsBtn) {
                permsBtn.style.opacity = '0.3'; permsBtn.style.pointerEvents = 'none';
                permsBtn.setAttribute('title', _t('admin_role_err_glass_ceiling', 'Jerarquía insuficiente para modificar este rol'));
            }
            return; // Termina la evaluación aquí si el techo bloqueó todo
        }

        // Aplicación de Inmutabilidad para roles de sistema
        if (isSystem) {
            if (deleteBtn) {
                deleteBtn.style.opacity = '0.3';
                deleteBtn.style.pointerEvents = 'none';
                deleteBtn.setAttribute('title', _t('admin_role_err_base_delete', 'Los roles base del sistema no pueden ser eliminados'));
            }
            // En esta nueva versión los roles de sistema SÍ pueden editarse (para cambiar color), 
            // pero el Backend denegará el cambio de nombre. Dejamos el botón activo pero advertimos.
            if (editBtn) {
                editBtn.setAttribute('title', _t('admin_role_warn_base_edit', 'Edición limitada (solo aspecto visual)'));
            }
        }
    }

    deselectAll() {
        this.selectedRoleId = null;
        document.querySelectorAll('[data-action="selectRoleRow"]').forEach(row => row.classList.remove('selected'));
        
        const defaultMode = document.querySelector('[data-ref="header-default-actions"]');
        const selectionMode = document.querySelector('[data-ref="role-selection-actions"]');

        if (defaultMode && selectionMode) {
            selectionMode.classList.replace('active', 'disabled');
            defaultMode.classList.replace('disabled', 'active');
        }
    }

    async openDeleteRoleDialog() {
        if (!this.selectedRoleId || !window.dialogSystem) return;
        const roleId = parseInt(this.selectedRoleId, 10);
        
        const selectedRow = document.querySelector(`[data-action="selectRoleRow"][data-role-id="${roleId}"]`);
        
        // Bloqueo doble (Frontend y Backend) para sistema
        if (selectedRow && parseInt(selectedRow.getAttribute('data-is-system'), 10) === 1) {
            showMessage(_t('admin_role_err_base_delete', 'Los roles del sistema son inmutables.'), 'error');
            return; 
        }

        const roleName = selectedRow ? selectedRow.getAttribute('data-role-name') : _t('admin_role_fallback_name', 'Este rol');

        if (!window.dialogSystem.templates['confirmDeleteRole']) {
            window.dialogSystem.templates['confirmDeleteRole'] = {
                build: (data) => `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-dialog-header">
                        <h2 class="component-dialog-title">${_t('admin_role_delete_title', 'Eliminar Rol')}</h2>
                        <p class="component-dialog-desc">${_t('admin_role_delete_desc', '¿Estás seguro de que deseas eliminar permanentemente el rol <strong>%s</strong>? Esta acción no se puede deshacer.').replace('%s', this.escapeHTML(data.roleName))}</p>
                    </div>
                    <div class="component-dialog-actions">
                        <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">${_t('btn_cancel', 'Cancelar')}</button>
                        <button class="component-button component-button--h45 component-button--danger component-button--full" data-dialog-action="confirm">${_t('btn_confirm_delete', 'Sí, eliminar')}</button>
                    </div>
                `
            };
        }

        const response = await window.dialogSystem.show('confirmDeleteRole', { roleName: roleName });

        if (response.confirmed) {
            await this.executeApiAction(ApiRoutes.Admin.DeleteRole, { id: roleId });
        }
    }

    async executeApiAction(apiRoute, payload) {
        const res = await this.api.post(apiRoute, payload, this.abortController.signal);
        
        if (res.aborted) return;
        
        if (res.success) {
            showMessage(_t('msg_action_success', 'Acción completada exitosamente'), 'success');
            if (window.spaRouter) {
                window.spaRouter.navigate(window.location.pathname + window.location.search);
            } else {
                window.location.reload();
            }
        } else {
            showMessage(_t('msg_error_prefix', 'Error: ') + res.message_key, 'error');
        }
    }

    escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    }
}

export { AdminRolesController };