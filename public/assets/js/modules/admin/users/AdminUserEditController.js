import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
class AdminUserEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.selectedFile = null;
        this.isDefaultAvatar = false;
        this.basePath = window.AppBasePath || '';
        this.config = window.AppServerConfig || {};
        this.abortController = null;
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }
    init() {
        this.abortController = new AbortController();
        this.bindEvents();
        if (window.location.pathname.includes('/admin/user-profile')) {
            this.setupInitialState();
        }
    }
    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
    }
    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
    }
    translateKey(key) {
        return typeof window.__ === 'function' ? window.__(key) : key;
    }
    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/user-profile')) {
            this.setupInitialState();
        }
    }
    setupInitialState() {
        const viewContent = document.querySelector('.view-content[data-user-id]');
        if (viewContent) {
            this.targetUserId = viewContent.getAttribute('data-user-id');
        }
        const imgEl = document.querySelector('[data-ref="admin-profile-avatar-img"]');
        if (imgEl && imgEl.getAttribute('data-is-default') === 'true') {
            this.isDefaultAvatar = true;
        } else {
            this.isDefaultAvatar = false;
        }
    }
    handleClick(e) {
        if (!window.location.pathname.includes('/admin/user-profile')) return;
        if (e.target.closest('[data-ref="admin-btn-change-avatar"]') || e.target.closest('[data-ref="admin-profile-avatar-overlay"]')) {
            const input = document.querySelector('[data-ref="admin-input-avatar-file"]');
            if (input) input.click();
        }
        if (e.target.closest('[data-ref="admin-btn-cancel-avatar"]')) this.cancelAvatarPreview();
        const btnSaveAvatar = e.target.closest('[data-ref="admin-btn-save-avatar"]');
        if (btnSaveAvatar) this.saveAvatar(btnSaveAvatar);
        const btnDelAvatar = e.target.closest('[data-ref="admin-btn-delete-avatar"]');
        if (btnDelAvatar) this.deleteAvatar(btnDelAvatar);
        const btnSaveRole = e.target.closest('[data-action="adminSaveRole"]');
        if (btnSaveRole) this.saveRole(btnSaveRole);
        const btnSaveUsername = e.target.closest('[data-action="adminSaveUsername"]');
        if (btnSaveUsername) this.saveUsername(btnSaveUsername);
        const btnSaveEmail = e.target.closest('[data-action="adminSaveEmail"]');
        if (btnSaveEmail) this.saveEmail(btnSaveEmail);
        const btnSetPref = e.target.closest('[data-action="adminSetPref"]');
        if (btnSetPref) this.savePrefFromDropdown(btnSetPref);

        const btnAdjustCoins = e.target.closest('[data-action="adminOpenAdjustCoins"]');
        if (btnAdjustCoins) this.openAdjustCoinsModal(btnAdjustCoins);

        const btnSubmitAdjustCoins = e.target.closest('[data-action="adminSubmitAdjustCoins"]');
        if (btnSubmitAdjustCoins) this.submitAdjustCoins(btnSubmitAdjustCoins);

        const btnResetPass = e.target.closest('[data-action="adminSendPasswordReset"]');
        if (btnResetPass) this.confirmPasswordReset(btnResetPass);

        const btnUnlockRl = e.target.closest('[data-action="adminUnlockRateLimit"]');
        if (btnUnlockRl) this.confirmUnlockRateLimit(btnUnlockRl);

        const btnTermSess = e.target.closest('[data-action="adminTerminateSessions"]');
        if (btnTermSess) this.confirmTerminateSessions(btnTermSess);

        const btnSyncStripe = e.target.closest('[data-action="adminSyncStripe"]');
        if (btnSyncStripe) this.confirmSyncStripe(btnSyncStripe);

        const btnOpenDis2fa = e.target.closest('[data-action="adminOpenDisable2FA"]');
        if (btnOpenDis2fa) this.openDisable2FAModal(btnOpenDis2fa);

        const btnSubmitDis2fa = e.target.closest('[data-action="adminSubmitDisable2FA"]');
        if (btnSubmitDis2fa) this.submitDisable2FA(btnSubmitDis2fa);

        const btnConfirmAction = e.target.closest('[data-action="submitConfirmUserAdminAction"]');
        if (btnConfirmAction) this.submitConfirmUserAdminAction(btnConfirmAction);
    }
    handleChange(e) {
        if (!window.location.pathname.includes('/admin/user-profile')) return;
        if (e.target && e.target.getAttribute('data-ref') === 'admin-input-avatar-file') this.handleFileSelection(e);
        if (e.target.matches('[data-action="adminTogglePreference"]')) {
            const key = e.target.getAttribute('data-key');
            const value = e.target.checked ? 1 : 0;
            this.savePreference(key, value);
        }
    }

    openAdjustCoinsModal(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const userUuid = btn.getAttribute('data-user-uuid') || '';
        if (window.modalSystem) {
            window.modalSystem.show('adjustUserCoinsModal', {
                userUuid: userUuid,
                username: username,
                actionTarget: 'adminSubmitAdjustCoins'
            });
        }
    }

    async submitAdjustCoins(btn) {
        const modalBody = document.querySelector('[data-ref="admin-adjust-coins-form"]');
        if (!modalBody) return;
        const amountInput = modalBody.querySelector('input[name="amount"]');
        const reasonInput = modalBody.querySelector('input[name="reason"]');
        const amount = parseInt(amountInput?.value, 10);
        const reason = reasonInput?.value?.trim() || '';

        if (isNaN(amount) || amount === 0) {
            showMessage(this.translateKey('err_invalid_amount', [], 'Ingresa una cantidad válida distinta de 0.'), 'error');
            return;
        }

        setButtonLoading(btn);
        try {
            const result = await this.api.post(ApiRoutes.Admin.AdjustCoins, {
                target_user_id: this.targetUserId,
                amount: Math.abs(amount),
                action: amount > 0 ? 'add' : 'subtract',
                reason: reason
            }, this.abortController?.signal);

            restoreButton(btn);
            if (result && result.success) {
                showMessage(result.message || this.translateKey('msg_coins_adjusted_success', [], 'Monedas ajustadas correctamente.'), 'success');
                if (window.modalSystem && window.modalSystem.closeCurrent) window.modalSystem.closeCurrent(true);
                const dispCoins = document.querySelector('[data-ref="admin-display-coins"]');
                if (dispCoins && result.coins !== undefined) {
                    dispCoins.innerHTML = `<span class="material-symbols-rounded">toll</span> ${result.coins}`;
                }
            } else {
                showMessage(result?.message || this.translateKey('err_generic', [], 'Error al procesar solicitud.'), 'error');
            }
        } catch (e) {
            restoreButton(btn);
            showMessage(this.translateKey('err_generic', [], 'Error al conectar con el servidor.'), 'error');
        }
    }

    confirmPasswordReset(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const email = btn.getAttribute('data-email') || document.querySelector('[data-ref="admin-display-email"]')?.textContent || '';
        const userUuid = btn.getAttribute('data-user-uuid') || '';

        if (window.modalSystem) {
            window.modalSystem.show('confirmSupportActionModal', {
                title: this.translateKey('lbl_confirm_send_password_reset_title', [], '¿Enviar restablecimiento de contraseña?'),
                desc: this.translateKey('lbl_confirm_send_password_reset_desc', { email: email || username }, 'Se enviará un correo con un enlace seguro para que el usuario restablezca su contraseña.'),
                icon: 'lock_reset',
                username: username,
                email: email,
                userUuid: userUuid,
                actionType: 'resetPassword',
                confirmText: this.translateKey('btn_send_password_reset', [], 'Enviar Enlace'),
                confirmClass: 'component-button--dark',
                actionTarget: 'submitConfirmUserAdminAction'
            });
        }
    }

    confirmUnlockRateLimit(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const email = btn.getAttribute('data-email') || document.querySelector('[data-ref="admin-display-email"]')?.textContent || '';
        const userUuid = btn.getAttribute('data-user-uuid') || '';

        if (window.modalSystem) {
            window.modalSystem.show('confirmSupportActionModal', {
                title: this.translateKey('lbl_confirm_unlock_rate_limit_title', [], '¿Desbloquear intentos de inicio de sesión?'),
                desc: this.translateKey('lbl_confirm_unlock_rate_limit_desc', { username, email: email || username }, 'Se limpiarán los bloqueos por intentos fallidos de contraseña y 2FA en el sistema.'),
                icon: 'lock_open',
                username: username,
                email: email,
                userUuid: userUuid,
                actionType: 'unlockRateLimit',
                confirmText: this.translateKey('btn_unlock_rate_limit', [], 'Desbloquear Login'),
                confirmClass: 'component-button--dark',
                actionTarget: 'submitConfirmUserAdminAction'
            });
        }
    }

    confirmTerminateSessions(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const email = btn.getAttribute('data-email') || document.querySelector('[data-ref="admin-display-email"]')?.textContent || '';
        const userUuid = btn.getAttribute('data-user-uuid') || '';

        if (window.modalSystem) {
            window.modalSystem.show('confirmSupportActionModal', {
                title: this.translateKey('lbl_confirm_terminate_sessions_title', [], '¿Finalizar todas las sesiones?'),
                desc: this.translateKey('lbl_confirm_terminate_sessions_desc', { username }, 'Se revocarán todos los tokens de autenticación y el usuario será desconectado.'),
                icon: 'logout',
                username: username,
                email: email,
                userUuid: userUuid,
                actionType: 'terminateSessions',
                confirmText: this.translateKey('btn_terminate_sessions', [], 'Cerrar Sesiones'),
                confirmClass: 'component-button--danger',
                actionTarget: 'submitConfirmUserAdminAction'
            });
        }
    }

    confirmSyncStripe(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const userUuid = btn.getAttribute('data-user-uuid') || '';

        if (window.modalSystem) {
            window.modalSystem.show('confirmSupportActionModal', {
                title: this.translateKey('lbl_confirm_sync_stripe_title', [], '¿Sincronizar suscripción con Stripe?'),
                desc: this.translateKey('lbl_confirm_sync_stripe_desc', { username }, 'Se verificará el estado en Stripe y se actualizará el plan del usuario.'),
                icon: 'sync',
                username: username,
                userUuid: userUuid,
                actionType: 'syncStripe',
                confirmText: this.translateKey('btn_sync_stripe', [], 'Sincronizar'),
                confirmClass: 'component-button--dark',
                actionTarget: 'submitConfirmUserAdminAction'
            });
        }
    }

    async submitConfirmUserAdminAction(btn) {
        const modalBody = document.querySelector('[data-ref="admin-confirm-support-action-body"]');
        if (!modalBody) return;
        const actionType = modalBody.getAttribute('data-action-type');
        if (window.modalSystem && window.modalSystem.closeCurrent) window.modalSystem.closeCurrent(true);

        try {
            let endpoint = null;
            if (actionType === 'resetPassword') endpoint = ApiRoutes.Admin.SendPasswordReset;
            else if (actionType === 'unlockRateLimit') endpoint = ApiRoutes.Admin.UnlockRateLimit;
            else if (actionType === 'terminateSessions') endpoint = ApiRoutes.Admin.TerminateSessions;
            else if (actionType === 'syncStripe') endpoint = ApiRoutes.Admin.SyncStripe;

            if (!endpoint) return;

            const res = await this.api.post(endpoint, {
                target_user_id: this.targetUserId
            }, this.abortController?.signal);

            if (res && res.success) {
                showMessage(res.message || this.translateKey('msg_action_success', [], 'Acción completada con éxito.'), 'success');
            } else {
                showMessage(res?.message || this.translateKey('err_generic', [], 'Error al procesar solicitud.'), 'error');
            }
        } catch (e) {
            showMessage(this.translateKey('err_generic', [], 'Error al conectar con el servidor.'), 'error');
        }
    }

    openDisable2FAModal(btn) {
        const username = btn.getAttribute('data-username') || document.querySelector('[data-ref="admin-display-username"]')?.textContent || 'Usuario';
        const userUuid = btn.getAttribute('data-user-uuid') || '';
        if (window.modalSystem) {
            window.modalSystem.show('disableUser2faModal', {
                userUuid: userUuid,
                username: username,
                actionTarget: 'adminSubmitDisable2FA'
            });
        }
    }

    async submitDisable2FA(btn) {
        const modalBody = document.querySelector('[data-ref="admin-disable-2fa-form"]');
        if (!modalBody) return;
        const reasonInput = modalBody.querySelector('textarea[name="reason"]');
        const reason = reasonInput?.value?.trim() || '';

        if (!reason) {
            showMessage(this.translateKey('err_reason_required', [], 'Ingresa un motivo obligatorio.'), 'error');
            return;
        }

        setButtonLoading(btn);
        try {
            const result = await this.api.post(ApiRoutes.Admin.Disable2FA, {
                target_user_id: this.targetUserId,
                reason: reason
            }, this.abortController?.signal);

            restoreButton(btn);
            if (result && result.success) {
                showMessage(result.message || this.translateKey('msg_2fa_disabled_success', [], '2FA Desactivado con éxito.'), 'success');
                if (window.modalSystem && window.modalSystem.closeCurrent) window.modalSystem.closeCurrent(true);
                const disp2fa = document.querySelector('[data-ref="admin-display-2fa"]');
                if (disp2fa) {
                    disp2fa.innerHTML = `<span class="component-badge component-badge--sm">${this.translateKey('lbl_2fa_disabled', [], '2FA Desactivado')}</span>`;
                }
                const btnDis2fa = document.querySelector('[data-action="adminOpenDisable2FA"]');
                if (btnDis2fa) {
                    btnDis2fa.classList.add('disabled');
                    btnDis2fa.setAttribute('disabled', 'disabled');
                    btnDis2fa.innerHTML = `<span>${this.translateKey('lbl_2fa_not_active', [], 'Sin 2FA')}</span>`;
                }
            } else {
                showMessage(result?.message || this.translateKey('err_generic', [], 'Error al procesar solicitud.'), 'error');
            }
        } catch (e) {
            restoreButton(btn);
            showMessage(this.translateKey('err_generic', [], 'Error al conectar con el servidor.'), 'error');
        }
    }

    async saveRole(btn) {
        const selectEl = document.querySelector('[data-ref="input-admin-role"]');
        const passEl = document.querySelector('[data-ref="input-admin-role-password"]');
        if (!selectEl || !passEl) return;
        const roleId = selectEl.value;
        const password = passEl.value;
        if (!password) {
            showMessage(this.translateKey('validation.missing_fields'), 'error');
            return;
        }
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.UpdateRole, { 
            target_user_id: this.targetUserId, 
            role_id: roleId,
            password: password
        }, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            showMessage(result.message, 'success');
            const dispRole = document.querySelector('[data-ref="admin-display-role"]');
            const avatarContainer = document.querySelector('[data-ref="admin-profile-avatar-container"]');
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            if (selectedOption) {
                const rawName = selectedOption.getAttribute('data-raw-name');
                const rawColor = selectedOption.getAttribute('data-raw-color');
                if (dispRole) {
                    dispRole.textContent = rawName;
                }
                if (avatarContainer && rawColor) {
                    try {
                        let parsedColor = JSON.parse(rawColor);
                        if (parsedColor.type === 'solid') {
                            let hex = typeof parsedColor.colors[0] === 'string' ? parsedColor.colors[0] : parsedColor.colors[0].hex;
                            avatarContainer.style.setProperty('--active-role-bg', hex);
                            dispRole.style.color = hex;
                        } else if (parsedColor.type === 'gradient') {
                            const angle = parsedColor.angle || 0;
                            const stops = parsedColor.colors.map(c => {
                                let h = typeof c === 'string' ? c : c.hex;
                                let stop = c.stop !== undefined ? c.stop : c.percentage;
                                return `${h} ${stop}%`;
                            }).join(', ');
                            avatarContainer.style.setProperty('--active-role-bg', `conic-gradient(from ${angle}deg, ${stops})`);
                            dispRole.style.color = typeof parsedColor.colors[0] === 'string' ? parsedColor.colors[0] : parsedColor.colors[0].hex;
                        }
                    } catch (e) {
                        avatarContainer.style.setProperty('--active-role-bg', rawColor);
                        dispRole.style.color = rawColor;
                    }
                }
            }
            passEl.value = '';
            window.appInstance.toggleEditState('admin-role');
        } else {
            showMessage(result.message, 'error');
        }
    }
    handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;
        const maxSizeMb = this.config.max_avatar_size_mb || 2;
        if (file.size > maxSizeMb * 1024 * 1024) { 
            showMessage(this.translateKey('err_max_image_size_mb').replace(':size', maxSizeMb), 'error'); 
            e.target.value = ''; 
            return; 
        }
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) { 
            showMessage(this.translateKey('err_invalid_image_format'), 'error'); 
            e.target.value = ''; 
            return; 
        }
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgEl = document.querySelector('[data-ref="admin-profile-avatar-img"]');
            if (imgEl) imgEl.src = ev.target.result;
            this.toggleAvatarButtons(true);
        };
        reader.readAsDataURL(file);
    }
    cancelAvatarPreview() {
        const imgEl = document.querySelector('[data-ref="admin-profile-avatar-img"]');
        const fileInput = document.querySelector('[data-ref="admin-input-avatar-file"]');
        if (imgEl) imgEl.src = imgEl.getAttribute('data-original-src');
        if (fileInput) fileInput.value = '';
        this.selectedFile = null;
        this.toggleAvatarButtons(false);
    }
    toggleAvatarButtons(isPreview) {
        const btnChange = document.querySelector('[data-ref="admin-btn-change-avatar"]');
        const btnDelete = document.querySelector('[data-ref="admin-btn-delete-avatar"]');
        const btnCancel = document.querySelector('[data-ref="admin-btn-cancel-avatar"]');
        const btnSave = document.querySelector('[data-ref="admin-btn-save-avatar"]');
        if (!btnChange || !btnDelete || !btnCancel || !btnSave) return;
        if (isPreview) {
            btnChange.classList.add('disabled');
            btnDelete.classList.add('disabled');
            btnCancel.classList.remove('disabled');
            btnSave.classList.remove('disabled');
        } else {
            btnChange.classList.remove('disabled');
            if (this.isDefaultAvatar) {
                btnDelete.classList.add('disabled');
                btnChange.textContent = this.translateKey('btn_upload_photo');
            } else {
                btnDelete.classList.remove('disabled');
                btnChange.textContent = this.translateKey('btn_change_photo');
            }
            btnCancel.classList.add('disabled');
            btnSave.classList.add('disabled');
        }
    }
    async saveAvatar(btn) {
        if (!this.selectedFile) return;
        setButtonLoading(btn);
        const formData = new FormData();
        formData.append('avatar', this.selectedFile);
        formData.append('target_user_id', this.targetUserId);
        const result = await this.api.postForm(ApiRoutes.Admin.UpdateAvatar, formData, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            showMessage(result.message, 'success');
            const imgEl = document.querySelector('[data-ref="admin-profile-avatar-img"]');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            const fileInput = document.querySelector('[data-ref="admin-input-avatar-file"]');
            if (fileInput) fileInput.value = '';
            this.selectedFile = null;
            this.isDefaultAvatar = false; 
            this.toggleAvatarButtons(false);
        } else { showMessage(result.message, 'error'); }
    }
    async deleteAvatar(btn) {
        const isConfirmed = await window.modalSystem.show('confirmDeleteAvatar');
        if (!isConfirmed || !isConfirmed.confirmed) return;
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.DeleteAvatar, { target_user_id: this.targetUserId }, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            showMessage(result.message, 'success');
            const imgEl = document.querySelector('[data-ref="admin-profile-avatar-img"]');
            if (imgEl) { imgEl.src = result.new_avatar; imgEl.setAttribute('data-original-src', result.new_avatar); }
            this.isDefaultAvatar = true; 
            this.toggleAvatarButtons(false);
        } else { showMessage(result.message, 'error'); }
    }
    async saveUsername(btn) {
        const input = document.querySelector('[data-ref="input-admin-username"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('admin-username'); return; }
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.UpdateUsername, { target_user_id: this.targetUserId, username: val }, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            showMessage(result.message, 'success');
            document.querySelector('[data-ref="admin-display-username"]').textContent = result.new_username;
            input.setAttribute('data-original-value', result.new_username);
            window.appInstance.toggleEditState('admin-username');
        } else { showMessage(result.message, 'error'); }
    }
    async saveEmail(btn) {
        const input = document.querySelector('[data-ref="input-admin-email"]');
        if (!input) return;
        const val = input.value.trim();
        const originalVal = input.getAttribute('data-original-value');
        if (val === originalVal) { window.appInstance.toggleEditState('admin-email'); return; }
        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Admin.UpdateEmail, { target_user_id: this.targetUserId, email: val }, this.abortController.signal);
        if (result.aborted) return;
        restoreButton(btn);
        if (result.success) {
            showMessage(result.message, 'success');
            document.querySelector('[data-ref="admin-display-email"]').textContent = result.new_email;
            input.setAttribute('data-original-value', result.new_email);
            window.appInstance.toggleEditState('admin-email');
        } else { showMessage(result.message, 'error'); }
    }
    async savePrefFromDropdown(btn) {
        const key = btn.getAttribute('data-key');
        const value = btn.getAttribute('data-value');
        document.querySelectorAll(`[data-action="adminSetPref"][data-key="${key}"]`).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        if (key === 'language') {
            const langText = document.querySelector('[data-ref="admin-lang-text"]');
            if (langText) langText.textContent = btn.querySelector('.component-menu-link-text span').textContent;
            if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleLanguage"]'));
        } else if (key === 'theme') {
            const themeText = document.querySelector('[data-ref="admin-theme-text"]');
            if (themeText) themeText.textContent = btn.querySelector('.component-menu-link-text span').textContent;
            if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleTheme"]'));
        }
        await this.savePreference(key, value);
    }
    async savePreference(key, value) {
        const result = await this.api.post(ApiRoutes.Admin.UpdatePreference, { target_user_id: this.targetUserId, key: key, value: value }, this.abortController.signal);
        if (result.aborted) return;
        if (result.success) showMessage(result.message, 'success');
        else showMessage(result.message, 'error');
    }
}
export { AdminUserEditController };