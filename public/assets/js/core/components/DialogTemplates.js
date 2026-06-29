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
                    <input type="text" data-ref="modal_2fa_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off">
                    <label class="component-input-label">${__('lbl_6_digit_code')}</label>
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
                    <input type="password" data-ref="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label class="component-input-label">${__('lbl_current_password')}</label>
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
                    <input type="password" data-ref="modal_delete_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label class="component-input-label">${__('lbl_password')}</label>
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
                    ${data.inputs.map((input, idx) => `
                        <div class="component-input-group">
                            <input type="${input.type || 'text'}" data-ref="modal_dynamic_input_${idx}" class="component-input-field ${input.type === 'password' ? 'component-input-field--with-icon' : ''}" placeholder=" " ${input.required ? 'required' : ''}>
                            <label class="component-input-label">${input.placeholderKey ? __(input.placeholderKey) : ''}</label>
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

    promptChangeRole: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_change_role')}</h2>
                <p class="component-modal-desc">${__('desc_change_role')}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <select data-ref="modal_change_role" class="component-input-field">
                        <option value="viewer">${__('role_viewer')}</option>
                        <option value="editor">${__('role_editor')}</option>
                        <option value="admin">${__('role_admin')}</option>
                    </select>
                    <label class="component-input-label">${__('lbl_select_role')}</label>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${__('btn_save')}</button>
            </div>
        `
    },

    confirmRemoveMembers: {
        build: (data) => DialogTemplates.confirmAction.build({
            titleKey: 'title_remove_member',
            descHtml: __('desc_remove_member').replace(':count', data.count || 1),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_remove'
        })
    },

    confirmCreateCanvas: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_create_canvas',
            descKey: 'desc_confirm_create_canvas',
            confirmClass: 'component-button--dark',
            confirmKey: 'btn_create_canvas'
        })
    },

    confirmDeleteCanvas: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_delete_canvas',
            descKey: 'desc_confirm_delete_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_delete_canvas'
        })
    },

    confirmLeaveCanvas: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_leave_canvas',
            descKey: 'desc_confirm_leave_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_leave_canvas'
        })
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
                                        <input type="checkbox" data-ref="modal_input_${field.name}" ${field.default ? 'checked' : ''}>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        `;
                    } else {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-input-group">
                                    <input type="${field.type || 'text'}" data-ref="modal_input_${field.name}" class="component-input-field" placeholder=" " value="${field.default || ''}">
                                    <label class="component-input-label">${__(field.labelKey)}</label>
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

    verifyPasswordDeleteCanvases: {
        build: (data) => DialogTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_canvases',
            descHtml: __('desc_verify_delete_canvases') ? __('desc_verify_delete_canvases').replace(':count', data.count || 0) : `Se eliminarán ${data.count || 0} lienzos permanentemente. Introduce tu contraseña para confirmar.`,
            confirmKey: 'btn_delete_canvas'
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
    },

    // ==========================================
    // DIÁLOGOS DE CANVASES (LIVE SHARE)
    // ==========================================
    joinLiveShare: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">sensors</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">Unirse a sesión en vivo</h3>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-form-box component-form-box--full" style="max-width: 100%;">
                    <div class="component-input-group">
                        <input type="text" data-ref="live-join-code-modal" class="component-input-field" placeholder="Ej. SHR-123" />
                        <label class="component-input-label">Código de sesión</label>
                    </div>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitJoinLive">Unirse</button>
            </div>
        `
    },

    startLiveShare: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">podcast</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">Transmitir Plantilla en Vivo</h3>
                    <p class="component-modal-desc">Comparte tu plantilla con otros usuarios.</p>
                </div>
            </div>
            <div class="component-modal-body" data-ref="live-share-modal-body">
                <div class="live-share-owner-content">
                    <div class="component-alert-success ${data.isActive ? 'active' : ''}" style="margin-bottom: 12px; display: ${data.isActive ? 'block' : 'none'};" data-ref="live-share-active-alert">
                        Transmisión activa
                    </div>
                    
                    <div class="live-share-code-display" data-ref="live-share-code">${data.code || '...'}</div>
                    
                    <div class="live-share-inputs-grid" style="margin-top: 12px;">
                        <div class="live-share-input-group">
                            <label class="live-share-label">Posición X</label>
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" data-ref="live-input-x" value="${data.x || 0}" class="component-input-field component-input-field--simple">
                            </div>
                        </div>
                        <div class="live-share-input-group">
                            <label class="live-share-label">Posición Y</label>
                            <div class="component-input-group component-input-group--h34">
                                <input type="number" data-ref="live-input-y" value="${data.y || 0}" class="component-input-field component-input-field--simple">
                            </div>
                        </div>
                    </div>
                    
                    <div class="live-share-input-group" style="margin-top: 12px;">
                        <label class="live-share-label live-share-label--flex">Opacidad <span data-ref="live-opacity-val">${Math.round((data.opacity || 1) * 100)}%</span></label>
                        <input type="range" data-ref="live-input-opacity" min="0" max="1" step="0.05" value="${data.opacity || 1}" class="live-share-range">
                    </div>
                </div>
            </div>
            <div class="component-modal-actions" style="margin-top: 8px;">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cerrar</button>
                <button class="component-button component-button--danger component-button--h45 component-button--full" data-action="stopLive" style="display: ${data.isActive ? 'flex' : 'none'};">Detener</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="startLive" style="display: ${data.isActive ? 'none' : 'flex'};">Iniciar</button>
            </div>
        `
    }
};