// public/assets/js/core/components/DialogTemplates.js

export const DialogTemplates = {
    activate2FADialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_activate_2fa')}</h2>
                <p class="component-modal-desc">${__('desc_activate_2fa')}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" id="modal_2fa_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off">
                    <label for="modal_2fa_code" class="component-input-label">${__('lbl_6_digit_code')}</label>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${__('btn_activate')}</button>
            </div>
        `
    },

    confirmDeleteAvatar: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_delete_avatar')}</h2>
                <p class="component-modal-desc">${__('desc_delete_avatar')}</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${__('btn_delete')}</button>
            </div>
        `
    },
    
    loadingEmailCode: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-content--centered">
                <div class="component-card__icon-container">
                    <div class="component-spinner component-spinner--centered"></div>
                </div>
                <h2 class="component-modal-title">${__('title_sending_code')}</h2>
                <p class="component-modal-desc">${__('desc_sending_code')}</p>
            </div>
        `
    },
    
    verifyEmailCode: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_verify_email')}</h2>
                <p class="component-modal-desc">${__('desc_verify_email').replace(':email', `<b>${data.email}</b>`)}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" data-ref="modal_email_code" class="component-input-field" placeholder=" " maxlength="14">
                    <label class="component-input-label">${__('lbl_verification_code')}</label>
                </div>
                
                <div class="component-link-container component-link-container--start">
                    <span class="component-link-text">${__('txt_not_received_code')}</span>
                    <span class="component-link disabled-interactive component-text-notice--muted" data-action="dialogResendCode">${__('btn_resend_code')} (60)</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${__('btn_verify')}</button>
            </div>
        `
    },
    
    confirmRevokeAllDevices: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_revoke_devices')}</h2>
                <p class="component-modal-desc">${__('desc_revoke_devices')}</p>
            </div>
            <div class="component-modal-body">
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-modal-action="revoke_all">${__('btn_revoke_all')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="revoke_other">${__('btn_revoke_other')}</button>
                <button class="component-button component-button--h45 component-button--full hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
            </div>
        `
    },

    roleForm: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_role')}</h2>
                <p class="component-modal-desc">${__('desc_role_form')}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" data-ref="roleNameInput" class="component-input-field" placeholder=" " value="${data.nameValue || ''}" maxlength="50" autocomplete="off">
                    <label class="component-input-label">${__('lbl_role_name')}</label>
                </div>
                
                <div class="component-role-color-row">
                    <p class="component-input-label" style="position: static; flex: 1;">${__('lbl_role_color')}</p>
                    <input type="color" data-ref="roleColorInput" value="${data.colorValue || '#808080'}" class="component-role-color-preview">
                    <span class="component-role-color-text" data-ref="roleColorDisplay">${data.colorValue || '#808080'}</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_save')}</button>
            </div>
        `
    },

    editRolePermissions: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_role_permissions').replace(':role', data.roleName)}</h2>
                <p class="component-modal-desc">${__('desc_role_permissions')}</p>
            </div>
            <div class="component-modal-body component-modal-body--scrollable">
                <div class="component-permissions-list">
                    ${data.permissionsListHtml}
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${__('btn_save_permissions')}</button>
            </div>
        `
    },

    verifyPasswordDialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">lock</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_verify_identity')}</h2>
                    <p class="component-modal-desc">${data.descHtml || (data.descKey ? __(data.descKey) : __('desc_verify_identity'))}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="password" id="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="modal_verify_password" class="component-input-label">${__('lbl_current_password')}</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_continue')}</button>
            </div>
        `
    },

    confirmDeleteAccountDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">warning</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${__('title_verify_identity')}</h2>
                    <p class="component-modal-desc">${__('desc_verify_identity_delete')}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="password" id="modal_delete_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="modal_delete_password" class="component-input-label">${__('lbl_password')}</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-modal-action="confirm">${__('btn_delete_account')}</button>
            </div>
        `
    },

    warning: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">${data.dangerBtn ? 'warning' : 'info'}</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_warning')}</h2>
                    <p class="component-modal-desc">${data.descHtml || (data.descKey ? __(data.descKey) : __('desc_warning'))}</p>
                </div>
            </div>
            
            ${data.inputs && data.inputs.length > 0 ? `
                <div class="component-modal-body">
                    ${data.inputs.map(input => `
                        <div class="component-input-group">
                            <input type="${input.type || 'text'}" id="${input.id}" class="component-input-field ${input.type === 'password' ? 'component-input-field--with-icon' : ''}" placeholder=" " ${input.required ? 'required' : ''}>
                            <label for="${input.id}" class="component-input-label">${input.placeholderKey ? __(input.placeholderKey) : ''}</label>
                            ${input.type === 'password' ? `<span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${data.cancelKey ? __(data.cancelKey) : __('btn_cancel')}</button>
                <button class="component-button component-button--h45 ${data.dangerBtn ? 'component-button--danger' : 'component-button--dark'} component-button--full" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
            </div>
        `
    },

    confirmAction: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_confirm_action')}</h2>
                <p class="component-modal-desc">${data.descHtml || (data.descKey ? __(data.descKey) : __('desc_confirm_action'))}</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 ${data.confirmClass || 'component-button--danger'} component-button--full" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
            </div>
        `
    },

    dynamicFormDialog: {
        build: (data) => {
            let fieldsHtml = '';
            
            if (data.fields && data.fields.length > 0) {
                fieldsHtml = '<div class="component-card--grouped component-card--flush">';
                
                data.fields.forEach((field, index) => {
                    if (field.type === 'switch') {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">${__(field.labelKey)}</h2>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" id="modal_input_${field.name}" ${field.default ? 'checked' : ''}>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        `;
                    } else {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-input-group">
                                    <input type="${field.type || 'text'}" id="modal_input_${field.name}" class="component-input-field" placeholder=" " value="${field.default || ''}">
                                    <label for="modal_input_${field.name}" class="component-input-label">${__(field.labelKey)}</label>
                                </div>
                            </div>
                        `;
                    }
                    
                    if (index < data.fields.length - 1) {
                        fieldsHtml += '<hr class="component-divider">';
                    }
                });
                
                fieldsHtml += '</div>';
            }

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_form')}</h2>
                    <p class="component-modal-desc">${data.descKey ? __(data.descKey) : ''}</p>
                </div>
                <div class="component-modal-body">
                    ${fieldsHtml}
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : __('btn_accept')}</button>
                </div>
            `;
        }
    },

    // -------------------------------------------------------------------------
    // VISTAS CENTRALIZADAS ESPECÍFICAS (Lógica puramente abstraída y traducida)
    // -------------------------------------------------------------------------

    confirmDeleteRole: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">${__('admin_role_delete_title')}</h2>
                <p class="component-dialog-desc">${__('admin_role_delete_desc').replace('%s', data.roleName || '')}</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-dialog-action="confirm">${__('btn_confirm_delete')}</button>
            </div>
        `
    },

    verifyPasswordDeleteUsers: {
        build: (data) => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_users',
            descHtml: __('desc_verify_delete_users').replace(':count', data.count || 0),
            confirmKey: 'btn_destroy_users'
        })
    },

    verifyPasswordUpdateRole: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_roles_desc',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordUpdateStatus: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_status_desc',
            confirmKey: 'tooltip_save_status'
        })
    },

    verifyPasswordSaveConfig: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_config',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordSaveAutomation: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_automation',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordRestoreBackup: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'title_confirm_restore',
            descKey: 'msg_confirm_restore_password',
            confirmKey: 'btn_confirm_restore'
        })
    }
};