import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { setButtonLoading, restoreButton, showMessage } from '../../../core/utils/uiUtils.js';



class AdminRolePermissionsController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        this.roleId = null;
        this.translations = {};
        
        this.targetRoleWeight = 0;
        this.currentUserWeight = 0;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();

        console.log("[DEBUG ROLES] Iniciando AdminRolePermissionsController");
        
        this.loadTranslationsFromDOM();

        const viewContent = document.querySelector('.view-content');
        const attrId = viewContent ? viewContent.dataset.roleId : null;
        
        this.targetRoleWeight = parseInt(viewContent ? viewContent.dataset.roleWeight : 0, 10) || 0;
        this.currentUserWeight = parseInt(viewContent ? viewContent.dataset.currentUserWeight : 0, 10) || 0;
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        this.roleId = parseInt(attrId, 10) || parseInt(urlId, 10);

        this.bindEvents();

        if (!this.roleId || isNaN(this.roleId)) {
            console.error("[DEBUG ROLES] Critical failure: The ID is null or invalid. Executing expulsion (goBack)...");
            this.goBack();
            return;
        }
        
        this.renderTranslations();
        
        this.enforcePermissionTiering();

        console.log("[DEBUG ROLES] Validaciones iniciales superadas. Permaneciendo en la vista.");
    }

    destroy() {
        if (!this.isInitialized) return;
        if (this.abortController) this.abortController.abort();

        document.removeEventListener('click', this.handleGlobalClickBound);
        
        this.isInitialized = false;
        this.roleId = null;
        this.translations = {};
        this.targetRoleWeight = 0;
        this.currentUserWeight = 0;
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const goBackBtn = e.target.closest('[data-action="goBack"]');
        const saveBtn = e.target.closest('[data-action="savePermissions"]');

        if (goBackBtn) this.goBack();
        if (saveBtn) this.savePermissions(saveBtn);
    }

    loadTranslationsFromDOM() {
        const viewContent = document.querySelector('.view-content');
        if (viewContent && viewContent.dataset.i18nPermissions) {
            try {
                this.translations = JSON.parse(viewContent.dataset.i18nPermissions);
            } catch (e) {
                console.error("[DEBUG ROLES] Error parsing permissions dictionary", e);
                this.translations = {};
            }
        }
    }

    renderTranslations() {
        const permBlocks = document.querySelectorAll('[data-perm-key]');
        
        permBlocks.forEach(block => {
            const key = block.dataset.permKey;
            const nameEl = block.querySelector('[data-ref="perm-name"]');
            const descEl = block.querySelector('[data-ref="perm-desc"]');
            
            if (this.translations[key]) {
                if (nameEl && this.translations[key].name) {
                    nameEl.textContent = this.translations[key].name;
                }
                if (descEl && this.translations[key].desc) {
                    descEl.textContent = this.translations[key].desc;
                }
            }
        });
    }

    enforcePermissionTiering() {
        const checkboxes = document.querySelectorAll('input[data-ref="permCheckbox"]');
        let blockedCount = 0;

        checkboxes.forEach(cb => {
            const isCritical = parseInt(cb.dataset.isCritical || 0, 10) === 1;

            if (isCritical) {
                const isRoleTooLow = this.targetRoleWeight < 80;
                const isAdminTooLow = this.currentUserWeight < 100;

                if (isRoleTooLow || isAdminTooLow) {
                    cb.disabled = true;
                    cb.checked = false;
                    cb.classList.add('permission-locked');
                    
                    const block = cb.closest('.component-card__content');
                    if (block) {
                        block.style.opacity = '0.5';
                        block.setAttribute('title', window.__('admin_role_perm_blocked_tier'));
                    }
                    blockedCount++;
                }
            }
        });

        if (blockedCount > 0) {
            console.warn(`[SECURITY] Blocked ${blockedCount} critical permissions in UI due to Tiering restrictions.`);
        }

        if (this.currentUserWeight < 100 && this.targetRoleWeight >= this.currentUserWeight) {
            checkboxes.forEach(cb => cb.disabled = true);
            const saveBtn = document.querySelector('[data-action="savePermissions"]');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.style.display = 'none';
            }
            showMessage(_t('admin_role_glass_ceiling', 'Solo lectura. No tienes privilegios para editar este rol.'), 'warning');
        }
    }

    goBack() {
        if (window.spaRouter) {
            window.spaRouter.navigate(`${this.basePath}/admin/roles`);
        } else {
            window.location.href = `${this.basePath}/admin/roles`;
        }
    }

    async savePermissions(btn) {
        const checkboxes = document.querySelectorAll('input[data-ref="permCheckbox"]:checked:not(:disabled)');
        const permissionsArray = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        if (btn) setButtonLoading(btn);

        const payload = {
            id: this.roleId, 
            permissions: permissionsArray
        };

        console.log("[DEBUG ROLES] Enviando payload de permisos:", payload);

        const res = await this.api.post(ApiRoutes.Admin.UpdateRolePermissions, payload, this.abortController.signal);
        
        if (res.aborted) return;
        
        if (btn) restoreButton(btn);

        if (res.success) {
            showMessage(_t('admin_perms_save_success', 'Permisos actualizados exitosamente'), 'success');
            this.goBack();
        } else {
            console.error("[DEBUG ROLES] Server error saving permissions:", res.message_key);
            showMessage(window.__('err_default') + ': ' + res.message_key, 'error');
        }
    }
}

export { AdminRolePermissionsController };