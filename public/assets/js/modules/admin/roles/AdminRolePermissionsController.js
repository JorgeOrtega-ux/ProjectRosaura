// public/assets/js/modules/admin/roles/AdminRolePermissionsController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { setButtonLoading, restoreButton, showMessage } from '../../../core/utils/uiUtils.js';

const _t = (key, fallback) => typeof window.__ === 'function' ? window.__(key) : fallback;

class AdminRolePermissionsController {
    constructor() {
        this.api = new ApiService();
        this.abortController = null;
        
        this.basePath = window.AppBasePath || '';
        this.isInitialized = false;
        this.roleId = null;
        this.translations = {}; // Diccionario en memoria
        
        this.targetRoleWeight = 0;
        this.currentUserWeight = 0;

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.abortController = new AbortController();

        console.log("[DEBUG ROLES] Iniciando AdminRolePermissionsController");
        
        // Cargar el diccionario de traducciones inyectado en el DOM
        this.loadTranslationsFromDOM();

        // Leer el ID y los pesos desde el atributo HTML
        const viewContent = document.querySelector('.view-content');
        const attrId = viewContent ? viewContent.dataset.roleId : null;
        
        this.targetRoleWeight = parseInt(viewContent ? viewContent.dataset.roleWeight : 0, 10) || 0;
        this.currentUserWeight = parseInt(viewContent ? viewContent.dataset.currentUserWeight : 0, 10) || 0;
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        // Asignación segura del roleId
        this.roleId = parseInt(attrId, 10) || parseInt(urlId, 10);

        this.bindEvents();

        if (!this.roleId || isNaN(this.roleId)) {
            console.error("[DEBUG ROLES] Falla crítica: El ID es nulo o inválido. Ejecutando expulsión (goBack)...");
            this.goBack();
            return;
        }
        
        // Aplicar traducciones a los permisos listados
        this.renderTranslations();
        
        // BLINDAJE FRONTEND: Bloquear permisos según jerarquía (Tiering)
        // Nota: Esta lógica aprovecha dinámicamente el `data-is-critical` devuelto por la BD
        // por lo que se adaptó perfectamente a tu nuevo esquema granular de permisos.
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
                console.error("[DEBUG ROLES] Error parseando diccionario de permisos", e);
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
            
            // Si la clave existe en el diccionario JSON (ej. "delete_backups", "manage_roles_structure")
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
            // Evaluamos si el permiso inyectado por PHP está marcado como destructivo/crítico
            const isCritical = parseInt(cb.dataset.isCritical || 0, 10) === 1;

            if (isCritical) {
                // Regla 1: Un rol no puede recibir permisos críticos si pesa menos de 80
                // Regla 2: Un admin no puede otorgar permisos críticos si no es nivel 100
                const isRoleTooLow = this.targetRoleWeight < 80;
                const isAdminTooLow = this.currentUserWeight < 100;

                if (isRoleTooLow || isAdminTooLow) {
                    cb.disabled = true;
                    cb.checked = false; // Forzamos desmarcado por seguridad en UI
                    cb.classList.add('permission-locked');
                    
                    const block = cb.closest('.component-card__content');
                    if (block) {
                        block.style.opacity = '0.5';
                        block.setAttribute('title', _t('admin_role_perm_blocked_tier', 'Permiso bloqueado: Requiere jerarquía superior.'));
                    }
                    blockedCount++;
                }
            }
        });

        if (blockedCount > 0) {
            console.warn(`[SECURITY] Se han bloqueado ${blockedCount} permisos críticos en la UI debido a restricciones de Tiering.`);
        }

        // Techo de cristal absoluto: Si el admin pesa menos que el rol, bloqueamos TODO el formulario
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
            window.spaRouter.navigate(`${this.basePath}/admin/manage-roles`);
        } else {
            window.location.href = `${this.basePath}/admin/manage-roles`;
        }
    }

    async savePermissions(btn) {
        // Obtenemos solo los habilitados
        const checkboxes = document.querySelectorAll('input[data-ref="permCheckbox"]:checked:not(:disabled)');
        const permissionsArray = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        if (btn) setButtonLoading(btn);

        // Uso estricto del ApiService con AbortController (Evita promesas huérfanas)
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
            console.error("[DEBUG ROLES] Error del servidor al guardar permisos:", res.message_key);
            showMessage(_t('msg_error_prefix', 'Error: ') + res.message_key, 'error');
        }
    }
}

export { AdminRolePermissionsController };