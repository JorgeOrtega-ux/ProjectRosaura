// public/assets/js/modules/admin/users/AdminUserEditController.js
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
        if (window.location.pathname.includes('/admin/edit-user')) {
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
        if (e.detail.url.includes('/admin/edit-user')) {
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
        if (!window.location.pathname.includes('/admin/edit-user')) return;

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
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/edit-user')) return;
        if (e.target && e.target.getAttribute('data-ref') === 'admin-input-avatar-file') this.handleFileSelection(e);

        if (e.target.matches('[data-action="adminTogglePreference"]')) {
            const key = e.target.getAttribute('data-key');
            const value = e.target.checked ? 1 : 0;
            this.savePreference(key, value);
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
        const isConfirmed = await window.dialogSystem.show('confirmDeleteAvatar');
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