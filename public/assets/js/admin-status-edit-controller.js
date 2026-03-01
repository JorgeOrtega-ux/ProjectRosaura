// public/assets/js/admin-status-edit-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminStatusEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.initialState = null; 
        this.activeTab = 'view-status-config'; // Tab inicial
        
        this.state = {
            status: 'active',
            deletedBy: 'admin',
            deletedReasonAdmin: 'Violación de políticas',
            customDeletedReasonAdmin: '',
            deletedReasonUser: '',

            isSuspended: '0', 
            suspensionReason: '', 
            customSuspensionReason: '',
            suspendedType: 'temporary',
            suspensionDuration: '7',
            endDate: '',

            notifyUser: true 
        };

        this.maps = {
            status: { 'active': 'Activa', 'deleted': 'Eliminada' },
            deletedBy: { 'user': 'Por el usuario', 'admin': 'Administrativa' },
            isSuspended: { '0': 'Cuenta sin restricciones', '1': 'Cuenta con suspensión' },
            suspendedType: { 'temporary': 'Suspensión temporal', 'permanent': 'Suspensión permanente' },
            suspensionDuration: { '1': '1 día', '3': '3 días', '7': '7 días', '14': '14 días', '30': '30 días', 'custom': 'Establecer tiempo manual' }
        };

        this.reasonDurations = {
            'Incumplimiento de los Términos y Condiciones': 7,
            'Información falsa o suplantación de identidad': 30,
            'Actividades ilegales': 30,
            'Uso indebido o fraudulento del servicio': 14,
            'Conducta abusiva o inapropiada': 3,
            'Publicación de contenido prohibido': 7,
            'Violación de propiedad intelectual': 14,
            'Envío de spam o uso de automatización no autorizada': 7,
            'Intentos de vulnerar la seguridad de la plataforma': 30,
            'Uso de la cuenta para fines comerciales no autorizados': 14,
            'Otro': 1 
        };

        this.predefinedSuspensionReasons = Object.keys(this.reasonDurations);
        this.predefinedDeletedReasons = ['Spam', 'Fraude o estafa', 'Violación de políticas', 'Otro'];
    }

    init() {
        this.bindEvents();
        if (window.location.pathname.includes('/admin/edit-status')) {
            this.handleLoad();
        }
    }

    handleLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        this.targetUserId = urlParams.get('id');
        if (this.targetUserId) {
            this.switchTab('view-status-config'); // Asegurar estado inicial en Configuración
            this.loadUserData();
        } else {
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/edit-status')) this.handleLoad();
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/edit-status')) return;

            // Manejo de las pestañas
            const btnSwitchTab = e.target.closest('[data-action="switchTab"]');
            if (btnSwitchTab) {
                const target = btnSwitchTab.getAttribute('data-target');
                this.switchTab(target);
            }

            const btnToggleModule = e.target.closest('[data-action="adminToggleModule"]');
            if (btnToggleModule && !btnToggleModule.classList.contains('disabled-interaction')) {
                const target = btnToggleModule.getAttribute('data-target');
                
                if (target === 'adminModuleCalendar') {
                    if (window.calendarSystem) {
                        window.calendarSystem.setup(
                            this.state.endDate,
                            (isoString, displayString) => {
                                this.state.endDate = isoString;
                                const textEl = document.getElementById('admin-endDate-text');
                                if (textEl) textEl.textContent = displayString;
                                this.checkForChanges(); 
                            },
                            () => {
                                this.state.endDate = '';
                                const textEl = document.getElementById('admin-endDate-text');
                                if (textEl) textEl.textContent = 'Seleccionar fecha y hora...';
                                this.checkForChanges(); 
                            }
                        );
                    }
                }

                if (window.appInstance) window.appInstance.toggleModule(target);
            }

            const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
            if (btnSetDropdown) {
                const key = btnSetDropdown.getAttribute('data-key');
                const val = btnSetDropdown.getAttribute('data-value');
                this.state[key] = val;
                
                if (key === 'suspensionReason') {
                    const recommended = this.reasonDurations[val] || 1;
                    this.state.suspensionDuration = recommended.toString();
                    this.calculateEndDateFromDuration(recommended);
                }
                
                if (key === 'suspensionDuration') {
                    if (val !== 'custom') {
                        this.calculateEndDateFromDuration(parseInt(val));
                    }
                }
                
                if (key === 'isSuspended' && val === '0') {
                    this.state.suspensionReason = '';
                }

                const module = btnSetDropdown.closest('.component-module');
                if (module && window.appInstance) window.appInstance.closeModule(module);
                
                this.syncVisuals();
                this.renderUI();
                this.checkForChanges(); 
            }

            const btnSubmitUpdate = e.target.closest('[data-action="submitStatusUpdate"]');
            if (btnSubmitUpdate) this.submitStatusUpdate(btnSubmitUpdate);

            const btnSubmitNote = e.target.closest('[data-action="submitAdminNote"]');
            if (btnSubmitNote) this.submitAdminNote(btnSubmitNote);

            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'admin_status_confirm_password') {
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
            if (!window.location.pathname.includes('/admin/edit-status')) return;
            if (e.target.id === 'inp_deleted_reason_user') this.state.deletedReasonUser = e.target.value;
            if (e.target.id === 'inp_custom_deleted_reason_admin') this.state.customDeletedReasonAdmin = e.target.value;
            if (e.target.id === 'inp_custom_suspension_reason') this.state.customSuspensionReason = e.target.value;

            if (['inp_deleted_reason_user', 'inp_custom_deleted_reason_admin', 'inp_custom_suspension_reason'].includes(e.target.id)) {
                this.checkForChanges(); 
            }
        });

        document.addEventListener('change', (e) => {
            if (!window.location.pathname.includes('/admin/edit-status')) return;
            if (e.target.id === 'chk_notify_user') {
                this.state.notifyUser = e.target.checked;
                this.checkForChanges(); 
            }
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }

    switchTab(targetId) {
        this.activeTab = targetId;
        
        // Estilos visuales de los botones del Toolbar
        const tabBtnConfig = document.getElementById('tab-btn-config');
        const tabBtnKardex = document.getElementById('tab-btn-kardex');
        
        if (tabBtnConfig && tabBtnKardex) {
            tabBtnConfig.classList.toggle('active', targetId === 'view-status-config');
            tabBtnKardex.classList.toggle('active', targetId === 'view-status-kardex');
            
            // Ajustes visuales para el botón inactivo (estilo "fantasma")
            if (targetId === 'view-status-config') {
                tabBtnKardex.style.background = 'transparent';
                tabBtnKardex.style.borderColor = 'transparent';
                tabBtnConfig.style.background = '';
                tabBtnConfig.style.borderColor = '';
            } else {
                tabBtnConfig.style.background = 'transparent';
                tabBtnConfig.style.borderColor = 'transparent';
                tabBtnKardex.style.background = '';
                tabBtnKardex.style.borderColor = '';
            }
        }
        
        // Mostrar / Ocultar Vistas
        const viewConfig = document.getElementById('view-status-config');
        const viewKardex = document.getElementById('view-status-kardex');
        if (viewConfig) viewConfig.classList.toggle('disabled', targetId !== 'view-status-config');
        if (viewKardex) viewKardex.classList.toggle('disabled', targetId !== 'view-status-kardex');
        
        // Header Dinámico y Lógica específica de la pestaña
        const title = document.getElementById('page-main-title');
        const desc = document.getElementById('page-main-desc');
        const toolbarActions = document.getElementById('toolbar-actions-config');
        
        if (targetId === 'view-status-config') {
            if (title) title.textContent = 'Gestionar Estado';
            if (desc) desc.textContent = 'Administra el ciclo de vida y bloqueos independientes de la cuenta.';
            if (toolbarActions) toolbarActions.classList.remove('disabled');
        } else {
            if (title) title.textContent = (window.__ && window.__('admin_kardex_title')) || 'Kardex de Moderación';
            if (desc) desc.textContent = (window.__ && window.__('admin_kardex_desc')) || 'Historial inmutable de cambios de estado y notas administrativas.';
            if (toolbarActions) toolbarActions.classList.add('disabled');
            this.loadKardex();
        }
    }

    calculateEndDateFromDuration(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        this.state.endDate = localISOTime;
        this.updateCalendarText();
    }

    async loadUserData() {
        const loader = document.getElementById('admin-status-loader');
        const form = document.getElementById('admin-status-form');
        
        const passInput = document.getElementById('admin_status_confirm_password');
        if (passInput) passInput.value = '';

        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const u = res.user;

            const triggerStatus = document.querySelector('[data-action="adminToggleModule"][data-target="adminModuleStatus"]');
            const descStatus = document.getElementById('admin-status-desc');
            const triggerSuspended = document.querySelector('[data-action="adminToggleModule"][data-target="adminModuleSuspended"]');
            const descSuspended = document.getElementById('admin-isSuspended-desc');

            if (u.role === 'founder') {
                if (triggerStatus) triggerStatus.classList.add('disabled-interaction');
                if (descStatus) descStatus.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. Su estado no puede ser modificado por seguridad.</span>';
                if (triggerSuspended) triggerSuspended.classList.add('disabled-interaction');
                if (descSuspended) descSuspended.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. No puede ser suspendida por seguridad.</span>';
            } else {
                if (triggerStatus) triggerStatus.classList.remove('disabled-interaction');
                if (descStatus) descStatus.textContent = 'Determina si la cuenta está en uso o eliminada permanentemente.';
                if (triggerSuspended) triggerSuspended.classList.remove('disabled-interaction');
                if (descSuspended) descSuspended.textContent = 'Aplica una suspensión para bloquear el acceso sin borrar el historial.';
            }

            this.state.status = u.user_status === 'deleted' ? 'deleted' : 'active';
            
            if (u.deleted_by) this.state.deletedBy = u.deleted_by;
            if (u.deleted_reason) {
                if (u.deleted_by === 'user') {
                    this.state.deletedReasonUser = u.deleted_reason;
                } else {
                    if (this.predefinedDeletedReasons.includes(u.deleted_reason)) {
                        this.state.deletedReasonAdmin = u.deleted_reason;
                    } else {
                        this.state.deletedReasonAdmin = 'Otro';
                        this.state.customDeletedReasonAdmin = u.deleted_reason;
                    }
                }
            }

            this.state.isSuspended = (u.is_suspended == 1) ? '1' : '0';
            
            if (u.suspension_reason) {
                if (this.predefinedSuspensionReasons.includes(u.suspension_reason)) {
                    this.state.suspensionReason = u.suspension_reason;
                } else {
                    this.state.suspensionReason = 'Otro';
                    this.state.customSuspensionReason = u.suspension_reason;
                }
            } else {
                this.state.suspensionReason = '';
            }

            if (u.suspension_type) this.state.suspendedType = u.suspension_type;
            
            if (u.is_suspended == 1 && u.suspension_type === 'temporary' && u.suspension_end_date) {
                this.state.suspensionDuration = 'custom';
                const d = new Date(u.suspension_end_date.replace(' ', 'T') + 'Z');
                const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                this.state.endDate = localD.toISOString().slice(0, 16);
            } else {
                this.state.endDate = '';
            }

            this.state.notifyUser = true; 

            const inpUserReason = document.getElementById('inp_deleted_reason_user');
            const inpAdminCustom = document.getElementById('inp_custom_deleted_reason_admin');
            const inpSuspCustom = document.getElementById('inp_custom_suspension_reason');
            const chkNotify = document.getElementById('chk_notify_user');

            if (inpUserReason) inpUserReason.value = this.state.deletedReasonUser;
            if (inpAdminCustom) inpAdminCustom.value = this.state.customDeletedReasonAdmin;
            if (inpSuspCustom) inpSuspCustom.value = this.state.customSuspensionReason;
            if (chkNotify) chkNotify.checked = this.state.notifyUser;
            
            this.updateCalendarText();
            this.syncVisuals();
            this.renderUI();

            this.initialState = JSON.parse(JSON.stringify(this.state)); 
            this.checkForChanges(); 

            if (loader) loader.classList.add('disabled');
            if (form) form.classList.remove('disabled');
        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    updateCalendarText() {
        const textEl = document.getElementById('admin-endDate-text');
        if (!textEl) return;
        
        if (!this.state.endDate) {
            textEl.textContent = 'Seleccionar fecha y hora...';
            return;
        }
        
        const d = new Date(this.state.endDate);
        const monthsStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        textEl.textContent = `${d.getDate()} de ${monthsStr[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
    }

    syncVisuals() {
        const syncLabel = (key) => {
            const val = this.state[key];
            const el = document.getElementById(`admin-${key}-text`);
            if (el) {
                if (key === 'suspensionReason' && !val) {
                    el.textContent = 'Seleccionar razón de suspensión...';
                } else {
                    el.textContent = this.maps[key] ? this.maps[key][val] : val;
                }
            }
            document.querySelectorAll(`[data-action="adminSetDropdown"][data-key="${key}"]`).forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === val);
            });
        };

        Object.keys(this.state).forEach(key => {
            if (!['deletedReasonUser', 'customDeletedReasonAdmin', 'customSuspensionReason', 'endDate', 'notifyUser'].includes(key)) {
                syncLabel(key);
            }
        });
    }

    renderUI() {
        const s = this.state;
        
        const secDelDecision = document.getElementById('section-deleted-decision');
        const secDelReasonAdmin = document.getElementById('section-deleted-admin-reason');
        const secDelCustomAdmin = document.getElementById('section-deleted-admin-custom-reason');
        const secDelReasonUser = document.getElementById('section-deleted-user-reason');
        
        const secSuspReason = document.getElementById('section-suspended-reason');
        const secSuspCustom = document.getElementById('section-suspended-custom-reason');
        const secSuspType = document.getElementById('section-suspended-type');
        const secSuspDuration = document.getElementById('section-suspended-duration');
        const secSuspDate = document.getElementById('section-suspended-date');

        const secNotifyUser = document.getElementById('section-notify-user');
        const warningBox = document.getElementById('admin-status-warning');

        [secDelDecision, secDelReasonAdmin, secDelCustomAdmin, secDelReasonUser, 
         secSuspReason, secSuspCustom, secSuspType, secSuspDuration, secSuspDate, 
         secNotifyUser, warningBox].forEach(el => {
            if (el) el.classList.add('disabled');
        });

        if (s.status === 'deleted') {
            if (secDelDecision) secDelDecision.classList.remove('disabled');
            if (s.deletedBy === 'admin') {
                if (secDelReasonAdmin) secDelReasonAdmin.classList.remove('disabled');
                if (s.deletedReasonAdmin === 'Otro' && secDelCustomAdmin) secDelCustomAdmin.classList.remove('disabled');
            } else {
                if (secDelReasonUser) secDelReasonUser.classList.remove('disabled');
            }
        }

        if (s.isSuspended === '1') {
            if (secSuspReason) secSuspReason.classList.remove('disabled');
            
            if (s.suspensionReason !== '') {
                if (s.suspensionReason === 'Otro' && secSuspCustom) secSuspCustom.classList.remove('disabled');
                if (secSuspType) secSuspType.classList.remove('disabled');
                
                if (s.suspendedType === 'temporary') {
                    if (secSuspDuration) secSuspDuration.classList.remove('disabled');
                    if (s.suspensionDuration === 'custom' && secSuspDate) secSuspDate.classList.remove('disabled');
                }
            }
        }

        if (s.status === 'deleted' || s.isSuspended === '1') {
            if (secNotifyUser) secNotifyUser.classList.remove('disabled');
            if (warningBox) warningBox.classList.remove('disabled');
        }
    }

    checkForChanges() {
        if (!this.initialState) return;

        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }

        const passArea = document.getElementById('admin-status-password-area');
        const btnSave = document.getElementById('admin-btn-save-status');

        if (hasChanges) {
            if (passArea) passArea.classList.remove('disabled');
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (passArea) passArea.classList.add('disabled');
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    formatDateForDB(dateStr) {
        if (!dateStr) return null;
        return dateStr.replace('T', ' ') + ':00'; 
    }

    async submitStatusUpdate(btn) {
        if (this.state.isSuspended === '1') {
            if (!this.state.suspensionReason) {
                this.showMessage('Debes seleccionar una razón para proceder con la suspensión.', 'error');
                return;
            }
            if (this.state.suspensionReason === 'Otro' && !this.state.customSuspensionReason.trim()) {
                this.showMessage('Debes especificar el motivo detallado de la suspensión.', 'error');
                return;
            }
            if (this.state.suspendedType === 'temporary' && !this.state.endDate) {
                this.showMessage('Debes seleccionar una fecha de finalización para la suspensión temporal.', 'error');
                return;
            }
        }

        if (this.state.status === 'deleted' && this.state.deletedBy === 'admin' && this.state.deletedReasonAdmin === 'Otro' && !this.state.customDeletedReasonAdmin.trim()) {
            this.showMessage('Debes especificar el motivo de eliminación administrativa.', 'error');
            return;
        }

        const passInput = document.getElementById('admin_status_confirm_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            this.showMessage('Debes ingresar tu contraseña de administrador para guardar los cambios.', 'error');
            return;
        }

        this.setButtonLoading(btn);

        const payload = {
            target_user_id: this.targetUserId,
            status: this.state.status,
            deleted_by: this.state.deletedBy,
            deleted_reason_admin: this.state.deletedReasonAdmin === 'Otro' ? this.state.customDeletedReasonAdmin : this.state.deletedReasonAdmin,
            deleted_reason_user: this.state.deletedReasonUser,
            
            is_suspended: this.state.isSuspended,
            suspension_type: this.state.isSuspended === '1' ? this.state.suspendedType : null,
            suspension_reason: this.state.isSuspended === '1' ? (this.state.suspensionReason === 'Otro' ? this.state.customSuspensionReason : this.state.suspensionReason) : null,
            end_date: (this.state.isSuspended === '1' && this.state.suspendedType === 'temporary') ? this.formatDateForDB(this.state.endDate) : null,
            
            admin_notes: null, // Ya no se envía por aquí, se maneja individualmente en el Kardex
            notify_user: this.state.notifyUser,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateStatus, payload);

        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            this.loadUserData(); 
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    // ==========================================
    // MÉTODOS DEL KARDEX (HISTORIAL DE NOTAS)
    // ==========================================

    async loadKardex() {
        const container = document.getElementById('kardex-list-container');
        if (!container) return;
        container.innerHTML = '<div class="component-spinner" style="margin: 0 auto;"></div>';
        
        const res = await this.api.post(ApiRoutes.Admin.GetModerationKardex, { target_user_id: this.targetUserId });
        
        if (res.success) {
            this.renderKardex(res.logs);
        } else {
            container.innerHTML = `<div class="component-alert-error active" style="text-align:left;">${res.message}</div>`;
        }
    }

    renderKardex(logs) {
        const container = document.getElementById('kardex-list-container');
        if (!container) return;
        container.innerHTML = '';
        
        const emptyMsg = (window.__ && window.__('admin_kardex_empty')) || 'No hay registros ni notas en el historial de este usuario.';

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">history</span>
                    <p class="component-empty-state-text">${emptyMsg}</p>
                </div>
            `;
            return;
        }

        logs.forEach(log => {
            const div = document.createElement('div');
            div.className = 'component-card--grouped';
            
            const adminPic = log.admin_profile_picture ? `/ProjectRosaura/${log.admin_profile_picture.replace(/^\//, '')}` : '/ProjectRosaura/public/assets/images/default-avatar.png';
            const adminName = log.admin_username || 'Sistema';
            const dateStr = new Date(log.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
            
            let actionColor = 'var(--text-primary)';
            let actionIcon = 'info';
            let actionText = 'Actualizado';
            
            switch(log.action_type) {
                case 'suspended': actionColor = 'var(--color-error)'; actionIcon = 'block'; actionText = 'Suspendido'; break;
                case 'unsuspended': actionColor = 'var(--color-success)'; actionIcon = 'lock_open'; actionText = 'Suspensión Levantada'; break;
                case 'deleted': actionColor = 'var(--color-error)'; actionIcon = 'person_off'; actionText = 'Eliminado'; break;
                case 'restored': actionColor = 'var(--color-success)'; actionIcon = 'settings_backup_restore'; actionText = 'Restaurado'; break;
                case 'note_updated': actionColor = 'var(--text-secondary)'; actionIcon = 'sticky_note_2'; actionText = 'Nota Agregada'; break;
            }

            let extraInfo = '';
            if (log.reason) extraInfo += `<p style="font-size: 14px; color: var(--text-primary); margin: 0 0 8px 0; line-height: 1.4;"><b>Motivo:</b> ${log.reason}</p>`;
            if (log.end_date) extraInfo += `<p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 8px 0;">Expira: ${new Date(log.end_date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>`;
            if (log.admin_notes) extraInfo += `<div style="background: var(--bg-app); padding: 12px; border-radius: 8px; border: 1px solid var(--border-lighter); font-size: 14px; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.5; margin-top: 8px;">${log.admin_notes}</div>`;

            div.innerHTML = `
                <div class="component-group-item component-group-item--stacked" style="padding: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; border-bottom: 1px solid var(--border-lighter); padding-bottom: 12px; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="component-button--profile component-avatar--static-sm role-${log.admin_role || 'user'}" style="width: 36px; height: 36px;">
                                <img src="${adminPic}" alt="Admin">
                            </div>
                            <div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${adminName}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">${dateStr}</div>
                            </div>
                        </div>
                        <div class="component-badge component-badge--sm" style="color: ${actionColor}; border-color: ${actionColor}40; background-color: ${actionColor}10;">
                            <span class="material-symbols-rounded" style="color: inherit;">${actionIcon}</span>
                            <span>${actionText}</span>
                        </div>
                    </div>
                    
                    <div class="component-card__text">
                        ${extraInfo}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async submitAdminNote(btn) {
        const textarea = document.getElementById('inp_new_admin_note');
        if (!textarea) return;
        const note = textarea.value.trim();
        
        if (!note) {
            this.showMessage('La nota no puede estar vacía.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        
        const res = await this.api.post(ApiRoutes.Admin.AddAdminNote, {
            target_user_id: this.targetUserId,
            note: note
        });
        
        this.restoreButton(btn);
        
        if (res.success) {
            this.showMessage(res.message, 'success');
            textarea.value = '';
            this.loadKardex();
        } else {
            this.showMessage(res.message, 'error');
        }
    }
}