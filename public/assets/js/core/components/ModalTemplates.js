export const ModalTemplates = {
    welcomePremiumModal: {
        fullScreen: true,
        build: (data = {}) => ModalTemplates.purchaseSuccessModal.build({ ...data, item_type: 'subscription' })
    },

    purchaseSuccessModal: {
        fullScreen: true,
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const isCoins = data.item_type === 'coins' || (data.coins !== undefined && data.coins > 0);
            
            let badgeIcon = 'stars';
            let badgeText = '';
            
            if (isCoins) {
                badgeIcon = 'toll';
                const coinAmount = data.coins || data.amount || 0;
                let formattedCoins = '0';
                if (typeof window.formatNumber === 'function') {
                    formattedCoins = window.formatNumber(coinAmount);
                } else if (!isNaN(Number(coinAmount))) {
                    formattedCoins = Number(coinAmount).toLocaleString('en-US');
                } else {
                    formattedCoins = coinAmount;
                }
                badgeText = `${formattedCoins} ${__('coins')}`;
            } else {
                let tierName = data.tier_name || '';
                if (!tierName && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
                    if (found && found.name) tierName = found.name;
                }
                badgeIcon = 'stars';
                badgeText = `${__('subscription')} ${tierName}`;
            }

            const thanksTitle = __('thank_you_purchase');
            const momentsDesc = __('in_few_moments_items');
            const supportText = __('need_help_contact');
            const continueText = __('btn_continue');

            return `
                <div class="component-modal-fullscreen-container">
                    <div class="component-modal-fullscreen-center">
                        <div class="component-card__icon-container component-text-accent component-modal-hero-icon-wrapper">
                            <span class="material-symbols-rounded">shopping_cart</span>
                        </div>

                        <h1 class="component-modal-title--hero">${thanksTitle}</h1>
                        <p class="component-modal-desc--hero">${momentsDesc}</p>

                        <div class="component-hero-badge-container">
                            <div class="component-badge">
                                <span class="material-symbols-rounded">${badgeIcon}</span>
                                <span>${badgeText}</span>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-fullscreen-bottom-actions">
                        <button class="component-button component-button--h45 component-button--dark component-button--pill component-button--wide" data-modal-action="confirm">
                            ${continueText}
                        </button>

                        <p class="component-hero-support-text">
                            <a href="/support" data-nav="/support" data-action="close_modal">
                                ${supportText}
                            </a>
                        </p>
                    </div>
                </div>
            `;
        }
    },

    welcomeUserModal: {
        noPadding: true,
        build: () => {
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="step-modal-container">
                    <div class="step-modal-banner">
                        <img src="assets/img/welcome-banner.png" alt="Welcome Banner" onerror="this.style.display='none'">
                    </div>
                    
                    <div class="step-modal-content">
                        <div class="step-modal-step active" id="welcome-step-1">
                            <h2 class="component-modal-title">${window.__('welcome_modal_step1_title')}</h2>
                            <p class="component-modal-desc step-modal-desc">
                                ${window.__('welcome_modal_step1_desc')}
                            </p>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot active"></div>
                                <div class="step-modal-dot" data-step-target="welcome-step-2"></div>
                                <div class="step-modal-dot" data-step-target="welcome-step-3"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h40 component-button--dark" data-step-target="welcome-step-2">
                                    ${window.__('welcome_modal_btn_next')}
                                </button>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="step-modal-step" id="welcome-step-2">
                            <h2 class="component-modal-title">${window.__('welcome_modal_step2_title')}</h2>
                            <p class="component-modal-desc step-modal-desc">
                                ${window.__('welcome_modal_step2_desc')}
                            </p>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot" data-step-target="welcome-step-1"></div>
                                <div class="step-modal-dot active"></div>
                                <div class="step-modal-dot" data-step-target="welcome-step-3"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h40 component-button--dark" data-step-target="welcome-step-3">
                                    ${window.__('welcome_modal_btn_next')}
                                </button>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="step-modal-step" id="welcome-step-3">
                            <h2 class="component-modal-title">${window.__('welcome_modal_step3_title')}</h2>
                            <p class="component-modal-desc step-modal-desc">
                                ${window.__('welcome_modal_step3_desc')}
                            </p>
                            
                            <div class="welcome-features-list">
                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">cloud</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_storage_title')}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_storage_desc') || 'Aumenta tu capacidad de almacenamiento en la nube y crea mÃºltiples proyectos sin restricciones.'}</span>
                                    </div>
                                </div>

                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">palette</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_tools_title')}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_tools_desc')}</span>
                                    </div>
                                </div>

                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">bolt</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_speed_title') || 'Renderizado Prioritario y Funciones Beta'}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_speed_desc')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot" data-step-target="welcome-step-1"></div>
                                <div class="step-modal-dot" data-step-target="welcome-step-2"></div>
                                <div class="step-modal-dot active"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h40 component-button--ghost" data-nav="/upgrade" data-action="close_modal">
                                    ${window.__('btn_more_info')}
                                </button>
                                <button class="component-button component-button--h40 component-button--dark" data-modal-action="finish">
                                    ${window.__('welcome_modal_btn_finish')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_activate')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_delete')}</button>
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
                    <span class="component-link disabled-interaction" data-action="dialogResendCode">${__('btn_resend_code')} (60)</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_verify')}</button>
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
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_revoke_all')}</button>
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
                    <p class="component-input-label">${__('lbl_role_color')}</p>
                    <input type="color" data-ref="roleColorInput" value="${data.colorValue || '#808080'}" class="component-role-color-preview">
                    <span class="component-role-color-text" data-ref="roleColorDisplay">${data.colorValue || '#808080'}</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_save')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_save_permissions')}</button>
            </div>
        `
    },

    verifyPasswordDialog: {
        build: (data = {}) => {
            const getTrans = (key, fallback) => {
                if (typeof window.__ === 'function') {
                    const val = window.__(key);
                    if (val && val !== key) return val;
                }
                return fallback;
            };

            const title = data.title || (data.titleKey ? getTrans(data.titleKey, 'Verificar Identidad') : getTrans('title_verify_identity', 'Verificar Identidad'));
            const desc = data.descHtml || data.message || (data.descKey ? getTrans(data.descKey, 'Confirma tu acciÃ³n para continuar.') : getTrans('desc_verify_identity', 'Confirma tu contraseÃ±a para continuar.'));
            const cancelBtnText = getTrans('btn_cancel', 'Cancelar');
            const confirmBtnText = data.confirmKey ? getTrans(data.confirmKey, 'Continuar') : getTrans('btn_continue', 'Continuar');
            const passwordLblText = getTrans('lbl_current_password', 'ContraseÃ±a actual');
            const confirmClass = data.confirmClass || 'component-button--dark';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc">${desc}</p>
                    </div>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" data-ref="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                        <label class="component-input-label">${passwordLblText}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${cancelBtnText}</button>
                    <button class="component-button component-button--h40 ${confirmClass}" data-modal-action="confirm">${confirmBtnText}</button>
                </div>
            `;
        }
    },

    confirmDeleteAccountDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">warning</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${__('del_acc_modal_title')}</h2>
                    <p class="component-modal-desc">${__('del_acc_warning')}</p>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete_account')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${data.cancelKey ? __(data.cancelKey) : __('btn_cancel')}</button>
                <button class="component-button component-button--h40 ${data.dangerBtn ? 'component-button--danger' : 'component-button--dark'}" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 ${data.confirmClass || 'component-button--danger'}" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
            </div>
        `
    },

    confirmActionModal: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.title || __('title_confirm_action')}</h2>
                <p class="component-modal-desc">${data.message || __('desc_confirm_action')}</p>
            </div>
            <div class="component-modal-body">
                ${data.inputPlaceholder ? `
                <div class="component-input-group">
                    <input type="text" data-ref="confirm_input" class="component-input-field" placeholder=" " autocomplete="off">
                    <label class="component-input-label">${data.inputPlaceholder}</label>
                </div>
                ` : ''}
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 ${data.confirmClass || 'component-button--danger'}" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_save')}</button>
            </div>
        `
    },

    confirmRemoveMembers: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_remove_member',
            descHtml: __('desc_remove_member').replace(':count', data.count || 1),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_remove'
        })
    },

    confirmCreateCanvas: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_create_canvas',
            descKey: 'desc_confirm_create_canvas',
            confirmClass: 'component-button--dark',
            confirmKey: 'btn_create_canvas'
        })
    },

    verifyPasswordDeleteCanvas: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_confirm_delete_canvas',
            descKey: 'desc_confirm_delete_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_delete_canvas'
        })
    },

    confirmLeaveCanvas: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_leave_canvas',
            descKey: 'desc_confirm_leave_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_leave_canvas'
        })
    },

    confirmResetNow: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_reset_now',
            descKey: 'desc_confirm_reset_now',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_reset_now'
        })
    },

    confirmResizeNow: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_resize_now',
            descKey: 'desc_confirm_resize_now',
            descHtml: data?.sizeLabel
                ? __('desc_confirm_resize_now').replace(':size', `<b>${data.sizeLabel}</b>`)
                : __('desc_confirm_resize_now').replace(':size', ''),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_apply_now'
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
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : __('btn_accept')}</button>
                </div>
            `;
        }
    },

    confirmDeleteRole: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('admin_role_delete_title')}</h2>
                <p class="component-modal-desc">${__('admin_role_delete_desc').replace('%s', data.roleName || '')}</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_confirm_delete')}</button>
            </div>
        `
    },
    confirmDeleteTier: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('admin_tier_delete_title')}</h2>
                <p class="component-modal-desc">${__('admin_tier_delete_desc')} ${data.tierName || ''}?</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_confirm_delete')}</button>
            </div>
        `
    },

    verifyPasswordDeleteUsers: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_users',
            descHtml: __('desc_verify_delete_users').replace(':count', data.count || 0),
            confirmKey: 'btn_destroy_users'
        })
    },

    verifyPasswordDeleteCanvases: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_canvases',
            descHtml: __('desc_verify_delete_canvases').replace(':count', data.count || 0),
            confirmKey: 'btn_delete_canvas'
        })
    },

    verifyPasswordUpdateRole: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_roles_desc',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordUpdateStatus: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_status_desc',
            confirmKey: 'tooltip_save_status'
        })
    },

    verifyPasswordSaveConfig: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_config',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordSaveAutomation: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_automation',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordRestoreBackup: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_confirm_restore',
            descKey: 'msg_confirm_restore_password',
            confirmKey: 'btn_confirm_restore'
        })
    },

    joinLiveShare: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">sensors</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">${__('title_join_live_share')}</h3>
                    <p class="component-modal-desc">${__('desc_join_live_share')}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-form-box component-form-box--full">
                    <div class="component-input-group">
                        <input type="text" data-ref="live-join-code-modal" class="component-input-field" placeholder="${__('ph_live_share_code')}" maxlength="9" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(.+)/, '$1-$2').slice(0, 9);">
                        <label class="component-input-label">${__('lbl_live_share_code')}</label>
                    </div>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--dark component-button--h40" data-action="submitJoinLive">${__('btn_join')}</button>
            </div>
        `
    },

    startLiveShare: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">stream</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">${__('title_start_live_share')}</h3>
                    <p class="component-modal-desc">${__('desc_start_live_share')}</p>
                </div>
            </div>
            <div class="component-modal-body" data-ref="live-share-modal-body">
                <div class="live-share-owner-content">
                    <div class="component-alert-success ${data.isActive ? 'active' : 'disabled'}" data-ref="live-share-active-alert">
                        ${__('txt_live_active')}
                    </div>
                    
                    <div class="live-share-code-display" data-ref="live-share-code">${data.code || '...'}</div>
                    
                    <div class="live-share-inputs-grid">
                        <div class="live-share-input-group">
                            <label class="live-share-label">${__('lbl_position_x')}</label>
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="x" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="x" data-step="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="live-input-x" data-value="${data.x || 0}">${data.x || 0}</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="x" data-step="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="x" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                        <div class="live-share-input-group">
                            <label class="live-share-label">${__('lbl_position_y')}</label>
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="y" data-step="-10"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="y" data-step="-1"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="live-input-y" data-value="${data.y || 0}">${data.y || 0}</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="y" data-step="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustLivePosition" data-axis="y" data-step="10"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="live-share-input-group">
                        <label class="live-share-label live-share-label--flex">${__('lbl_opacity')}</label>
                        <div class="component-inline-control component-inline-control--fixed">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="-0.10" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="-0.05" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" data-ref="live-input-opacity" data-value="${data.opacity !== undefined ? data.opacity : 1}">${Math.round((data.opacity !== undefined ? data.opacity : 1) * 100)}%</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="0.05" data-max="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="0.10" data-max="1"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_close')}</button>
                <button class="component-button component-button--danger component-button--h40 ${data.isActive ? 'active' : 'disabled'}" data-action="stopLive">${__('btn_stop_live')}</button>
                <button class="component-button component-button--dark component-button--h40 ${data.isActive ? 'disabled' : 'active'}" data-action="startLive">${__('btn_start_live')}</button>
            </div>
        `
    },

    joinCanvasTerms: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">gavel</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">${window.__('terms_and_conditions')}</h3>
                    <p class="component-modal-desc">${window.__('join_accept_rules_desc')}</p>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--dark component-button--h40" data-modal-action="confirm">${window.__('btn_accept')}</button>
            </div>
        `
    },

    confirmDeleteMessage: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_action',
            descHtml: __('confirm_delete_message'),
            confirmClass: 'component-button--danger'
        })
    },

    deleteMessageDialog: {
        build: () => {
            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.delete_messages : [];
            const reasonsHtml = reasons.map(r => `
                <div class="component-menu-link" data-action="selectReportReason" data-value="${r.key}" data-icon="${r.icon}" data-text="${__('report_reason_' + r.key) || r.key}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                    <div class="component-menu-link-text"><span>${__('report_reason_' + r.key) || r.key}</span></div>
                </div>
            `).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('admin_msg_delete_title')}</h2>
                    <p class="component-modal-desc">${__('admin_msg_delete_desc')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason" data-ref="report_reason" data-value="">
                            <span class="material-symbols-rounded" data-ref="report_trigger_icon">delete</span>
                            <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder') || 'Selecciona un motivo...'}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${reasonsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete')}</button>
                </div>
            `;
        }
    },

    reportMessageDialog: {
        build: () => {
            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.report_messages : [];
            const reasonsHtml = reasons.map(r => `
                <div class="component-menu-link" data-action="selectReportReason" data-value="${r.key}" data-icon="${r.icon}" data-text="${__('report_reason_' + r.key)}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                    <div class="component-menu-link-text"><span>${__('report_reason_' + r.key)}</span></div>
                </div>
            `).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('report_title')}</h2>
                    <p class="component-modal-desc">${__('report_desc')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason" data-ref="report_reason" data-value="">
                            <span class="material-symbols-rounded" data-ref="report_trigger_icon">report</span>
                            <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder')}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${reasonsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_report')}</button>
                </div>
            `;
        }
    },

    downgradeCanvasModal: {
        build: (data = {}) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: data.titleKey || 'downgrade_basic_title',
            descKey: data.descKey || 'downgrade_basic_message',
            confirmKey: 'btn_confirm'
        })
    },

    confirmInjectTemplate: {
        build: (data = {}) => {
            const cost = data.cost || 0;
            const balance = data.balance || 0;
            const remaining = Math.max(0, balance - cost);
            const msgConfirm = __('confirm_inject_template');
            const tokenInfo = `(${__('lbl_cost')}: ${cost.toLocaleString()} tokens Â· ${__('lbl_remaining_balance')}: ${remaining.toLocaleString()} tokens)`;
            const desc = `${msgConfirm} ${tokenInfo}`;
            
            return ModalTemplates.confirmAction.build({
                titleKey: 'title_confirm_action',
                descHtml: desc,
                confirmClass: 'component-button--warning'
            });
        }
    },

    confirmUnlinkGoogleModal: {
        build: (data = {}) => {
            const googleName = data.googleName || '';
            const userEmail = data.userEmail || '';
            const appName = window.APP_NAME || 'Rosaura';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">Â¿De verdad quieres desvincular la cuenta de Google â€œ${googleName}â€?</h2>
                    <p class="component-modal-desc">
                        La prÃ³xima vez que inicies sesiÃ³n en ${appName}, tendrÃ¡s que usar tu direcciÃ³n de correo electrÃ³nico ${userEmail} y tu contraseÃ±a.
                    </p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${window.__('btn_cancel', [])}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${window.__('btn_disconnect', [])}</button>
                </div>
            `;
        }
    },

    confirmUpgradeModal: {
        build: (data = {}) => {
            const amount = data.amount || '0.00';
            const currency = (data.currency || 'USD').toUpperCase();
            const isUpgrade = data.isUpgrade || false;
            const priceText = `${amount} ${currency}`;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_purchase', []);
            const totalStr = __('desc_confirm_purchase', [], 'Total a cobrar hoy:');
            const prorationStr = isUpgrade ? ` (${__('desc_confirm_purchase_proration', [])})` : '';
            const passwordLabel = __('lbl_account_password', []);
            const btnCancel = __('btn_cancel', []);
            const btnConfirm = __('btn_confirm', []);

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${totalStr} <strong>${priceText}</strong>${prorationStr}.</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" id="confirmPurchasePasswordInput" data-ref="confirmPurchasePasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                        <label class="component-input-label">${passwordLabel}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    confirmPasswordModal: {
        build: (data = {}) => {
            const title = data.title || 'VerificaciÃ³n de Seguridad';
            const desc = data.desc || 'Ingresa tu contraseÃ±a para autorizar este cambio.';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" id="confirmSecPasswordInput" data-ref="confirmSecPasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                        <label class="component-input-label">ContraseÃ±a de tu cuenta</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">Cancelar</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">Confirmar</button>
                </div>
            `;
        }
    },

    confirmClearAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_clear_area', [], 'Â¿Vaciar zona seleccionada?');
            const descRaw = __('desc_confirm_clear_area', []);
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel', []);
            const btnConfirm = __('btn_clear_area', [], 'Vaciar Zona');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    confirmProtectAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_protect_area', [], 'Proteger zona');
            const descRaw = __('desc_confirm_protect_area', []);
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel', []);
            const btnProtect = __('btn_protect_area', [], 'Proteger Zona');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--success" data-modal-action="protect">${btnProtect}</button>
                </div>
            `;
        }
    },

    confirmDeleteTemplateModal: {
        build: (data = {}) => {
            const templateId = data.templateId || '';
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_delete_template', [], '¿Eliminar plantilla?');
            const descStr = __('desc_confirm_delete_template', [], 'Esta acción eliminará de forma permanente tu plantilla de la biblioteca del servidor. No se puede deshacer.');
            const btnCancel = __('btn_cancel', []);
            const btnConfirm = __('btn_delete_confirm', [], 'Eliminar permanentemente');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-action="confirmDeleteTemplate" data-id="${templateId}">
                        <span>${btnConfirm}</span>
                    </button>
                </div>
            `;
        }
    },

    confirmUnprotectAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_unprotect_area', []);
            const descRaw = __('desc_confirm_unprotect_area', []);
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel', []);
            const btnRemove = __('btn_remove_protection', []);

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-modal-action="unprotect">${btnRemove}</button>
                </div>
            `;
        }
    },

    confirmBulkPerkPurchaseModal: {
        build: (data = {}) => {
            const items = data.items || [];
            const totalCoins = data.totalCoins || 0;
            const formattedTotal = (typeof window.formatNumber === 'function') ? window.formatNumber(totalCoins) : totalCoins;
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

            const badgesHtml = items.map(item => {
                const formattedPrice = (typeof window.formatNumber === 'function') ? window.formatNumber(item.price) : item.price;
                return `
                    <div class="component-badge component-badge--warning">
                        <span class="material-symbols-rounded">${item.icon || 'star'}</span>
                        <span>${item.name} (${formattedPrice} ${__('coins')})</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">Â¿EstÃ¡s seguro de gastar ${formattedTotal} monedas?</h2>
                    <p class="component-modal-desc">
                        EstÃ¡s a punto de adquirir los siguientes elementos para tu cuenta:
                    </p>
                </div>
                <div class="component-modal-body">
                    <div>
                        ${badgesHtml}
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_confirm')}</button>
                </div>
            `;
        }
    },

    manageSanctionModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const username = data.username || '';
            const sanctionScope = data.sanctionScope || 'chat_mute';
            const suspensionType = data.suspensionType || 'temporary';
            const suspensionReason = data.suspensionReason || '';
            const endDate = data.endDate ? data.endDate.replace(' ', 'T').substring(0, 16) : '';
            let sanctionHours = '00';
            let sanctionMinutes = '00';
            if (endDate) {
                const parts = endDate.split('T');
                if (parts[1]) {
                    const timeParts = parts[1].split(':');
                    sanctionHours = (timeParts[0] || '00').padStart(2, '0');
                    sanctionMinutes = (timeParts[1] || '00').padStart(2, '0');
                }
            }

            const scopes = [
                { key: 'chat_mute', label: __('sanction_scope_chat_mute') || 'Silenciar Chat', icon: 'speaker_notes_off' },
                { key: 'canvas_ban', label: __('sanction_scope_canvas_ban'), icon: 'block' }
            ];

            const types = [
                { key: 'temporary', label: __('suspension_temp'), icon: 'timer' },
                { key: 'permanent', label: __('suspension_perm'), icon: 'all_inclusive' }
            ];

            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.suspensions : [];

            const activeScope = scopes.find(s => s.key === sanctionScope) || scopes[0];
            const activeType = types.find(t => t.key === suspensionType) || types[0];
            
            const activeReason = reasons.find(r => r.key === suspensionReason);
            const activeReasonKey = activeReason ? activeReason.key : '';
            const activeReasonLabel = activeReason ? (__(activeReason.key) || activeReason.key) : (__('lbl_select_suspension_reason'));
            const activeReasonIcon = activeReason ? activeReason.icon : 'gavel';

            const scopeOptionsHtml = scopes.map(s => `
                <div class="component-menu-link ${s.key === activeScope.key ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="sanction_scope" data-value="${s.key}" data-icon="${s.icon}" data-text="${s.label}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${s.icon}</span></div>
                    <div class="component-menu-link-text"><span>${s.label}</span></div>
                </div>
            `).join('');

            const typeOptionsHtml = types.map(t => `
                <div class="component-menu-link ${t.key === activeType.key ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="suspension_type" data-value="${t.key}" data-icon="${t.icon}" data-text="${t.label}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${t.icon}</span></div>
                    <div class="component-menu-link-text"><span>${t.label}</span></div>
                </div>
            `).join('');

            const reasonOptionsHtml = reasons.map(r => {
                const label = __(r.key) || r.key;
                return `
                    <div class="component-menu-link ${r.key === activeReasonKey ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="suspension_reason" data-value="${r.key}" data-icon="${r.icon}" data-text="${label}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                        <div class="component-menu-link-text"><span>${label}</span></div>
                    </div>
                `;
            }).join('');

            const endDateDisplay = endDate ? endDate.replace('T', ' ') : (__('lbl_select_expiration_date'));

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('canvases_sanctions_title') || 'Gestionar SanciÃ³n'}: ${username}</h2>
                    <p class="component-modal-desc">${__('desc_chat_restriction')}</p>
                </div>
                <div class="component-modal-body">
                    <!-- Alcance de la SanciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSanctionScope" data-ref="sanction_scope" data-value="${activeScope.key}">
                            <span class="material-symbols-rounded" data-ref="sanction_scope_trigger_icon">${activeScope.icon}</span>
                            <span class="component-dropdown-text" data-ref="sanction_scope_trigger_text">${activeScope.label}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSanctionScope">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${scopeOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- DuraciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionType" data-ref="suspension_type" data-value="${activeType.key}">
                            <span class="material-symbols-rounded" data-ref="suspension_type_trigger_icon">${activeType.icon}</span>
                            <span class="component-dropdown-text" data-ref="suspension_type_trigger_text">${activeType.label}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSuspensionType">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${typeOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Motivo -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionReason" data-ref="suspension_reason" data-value="${activeReasonKey}">
                            <span class="material-symbols-rounded" data-ref="suspension_reason_trigger_icon">${activeReasonIcon}</span>
                            <span class="component-dropdown-text" data-ref="suspension_reason_trigger_text">${activeReasonLabel}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSuspensionReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${reasonOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fecha de ExpiraciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full modal-end-date-group">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="openSanctionCalendarModal" data-ref="end_date" data-value="${endDate}">
                            <span class="material-symbols-rounded">calendar_month</span>
                            <span class="component-dropdown-text" data-ref="sanction-endDate-text">${endDateDisplay}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('lbl_save_changes')}</button>
                </div>
            `;
        },
        getData: (container) => {
            const scopeTrigger = container.querySelector('[data-ref="sanction_scope"]');
            const typeTrigger = container.querySelector('[data-ref="suspension_type"]');
            const reasonTrigger = container.querySelector('[data-ref="suspension_reason"]');
            const endDateTrigger = container.querySelector('[data-ref="end_date"]');

            return {
                sanction_scope: scopeTrigger ? scopeTrigger.getAttribute('data-value') : 'chat_mute',
                suspension_type: typeTrigger ? typeTrigger.getAttribute('data-value') : 'temporary',
                suspension_reason: reasonTrigger ? reasonTrigger.getAttribute('data-value') : 'reason_terms',
                end_date: endDateTrigger ? endDateTrigger.getAttribute('data-value') : null
            };
        }
    },

    confirmStartBroadcast: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_start_broadcast', [])}</h2>
                    <p class="component-modal-desc">${__('desc_start_broadcast', [])}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [])}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_start_broadcast', [])}</button>
                </div>
            `;
        }
    },

    confirmStopBroadcast: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_stop_broadcast', [], 'Â¿Finalizar transmisiÃ³n?')}</h2>
                    <p class="component-modal-desc">${__('desc_stop_broadcast', [])}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [])}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_stop_broadcast', [], 'Finalizar')}</button>
                </div>
            `;
        }
    },

    confirmLeaveLiveShare: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_leave_broadcast', [], 'Â¿Abandonar transmisiÃ³n?')}</h2>
                    <p class="component-modal-desc">${__('desc_leave_broadcast', [])}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [])}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_leave_broadcast', [], 'Abandonar')}</button>
                </div>
            `;
        }
    },

    upgradeSubscriptionModal: {
        noPadding: true,
        customClass: 'component-modal-box--columns',
        build: (data = {}) => {
            const tiers = (window.APP_TIERS && Array.isArray(window.APP_TIERS))
                ? window.APP_TIERS.filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false)
                : [
                    { tier_level: 1, name: 'Pro', price_monthly: 12.99, desc: 'Para particulares', max_canvases: 10, max_snapshots_per_canvas: 50, max_members_per_canvas: 20, max_storage_mb: 200, feat_advanced_roles: 1, feat_chat_restriction: 1, feat_custom_palettes: 1, feat_unlimited_exports: 0, feat_inject_templates: 1, feat_live_share: 1 },
                    { tier_level: 2, name: 'Negocios', price_monthly: 24.99, desc: 'Para particulares y equipos', max_canvases: -1, max_snapshots_per_canvas: -1, max_members_per_canvas: -1, max_storage_mb: 1024, feat_advanced_roles: 1, feat_chat_restriction: 1, feat_custom_palettes: 1, feat_unlimited_exports: 1, feat_inject_templates: 1, feat_live_share: 1 }
                  ];

            let cardsHtml = '';
            tiers.forEach((tier, index) => {
                const isActiveClass = index === 0 ? 'active' : '';
                const badgeHtml = '';
                const priceText = tier.price_monthly ? `$${parseFloat(tier.price_monthly).toFixed(2)}` : '$12.99';
                
                const nameKey = tier.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
                const translationKey = `plan_desc_${nameKey}`;
                
                const planDesc = __(translationKey, [], '');
                const planDescHtml = planDesc ? `<span class="component-card-desc">${planDesc}</span>` : '';
                
                cardsHtml += `
                    <div class="component-card--selectable-row ${isActiveClass}" data-tier="${tier.tier_level}">
                        <div class="component-card-left-section">
                            <div class="component-radio-circle"></div>
                            <div class="component-card-info">
                                <span class="component-card-title">${tier.name} ${badgeHtml}</span>
                                ${planDescHtml}
                            </div>
                        </div>
                        <div class="component-card-price">
                            <span class="component-card-price-amount">${priceText}</span>
                            <span class="component-card-price-period">/mes</span>
                        </div>
                    </div>
                `;
            });

            const comparisonRows = [
                {
                    label: __('plan_limit_canvases', [], 'Proyectos simultÃ¡neos'),
                    getValue: (t) => parseInt(t.max_canvases, 10) === -1 ? __('upgrade_val_unlimited', [], 'Ilimitados') : t.max_canvases
                },
                {
                    label: __('plan_limit_capturas', [], 'Capturas por lienzo'),
                    getValue: (t) => parseInt(t.max_snapshots_per_canvas, 10) === -1 ? __('upgrade_val_unlimited', [], 'Ilimitados') : t.max_snapshots_per_canvas
                },
                {
                    label: __('plan_limit_members', [], 'Miembros por lienzo'),
                    getValue: (t) => parseInt(t.max_members_per_canvas, 10) === -1 ? __('upgrade_val_unlimited', [], 'Ilimitados') : t.max_members_per_canvas
                },
                {
                    label: __('lbl_storage', [], 'Almacenamiento en la nube'),
                    getValue: (t) => {
                        const mb = parseInt(t.max_storage_mb || 0, 10);
                        return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
                    }
                },
                {
                    label: __('plan_feat_advanced_roles_short', [], 'Roles Avanzados'),
                    getValue: (t) => t.feat_advanced_roles ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                },
                {
                    label: __('plan_feat_chat_restriction_short', [], 'Chat en vivo'),
                    getValue: (t) => t.feat_chat_restriction ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                },
                {
                    label: __('plan_feat_custom_palettes_short', [], 'Paletas Pro'),
                    getValue: (t) => t.feat_custom_palettes ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                },
                {
                    label: __('plan_feat_inject_templates_short', [], 'Inyectar Plantillas'),
                    getValue: (t) => t.feat_inject_templates ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                },
                {
                    label: __('plan_feat_live_share_short', [], 'TransmisiÃ³n en vivo'),
                    getValue: (t) => t.feat_live_share ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                },
                {
                    label: __('plan_feat_unlimited_exports_short', [], 'ExportaciÃ³n libre'),
                    getValue: (t) => t.feat_unlimited_exports ? '<span class="material-symbols-rounded check-icon">check</span>' : '<span class="material-symbols-rounded cross-icon">close</span>'
                }
            ];

            let tableHeaders = '<th>Beneficios prÃ©mium</th>';
            tiers.forEach((t, idx) => {
                const isHighlight = idx === 0 ? 'highlight-col' : '';
                tableHeaders += `<th class="col-tier-${t.tier_level} ${isHighlight}">${t.name}</th>`;
            });

            let tableRowsHtml = '';
            comparisonRows.forEach(row => {
                tableRowsHtml += `<tr><td>${row.label}</td>`;
                tiers.forEach((t, idx) => {
                    const isHighlight = idx === 0 ? 'highlight-col' : '';
                    tableRowsHtml += `<td class="col-tier-${t.tier_level} ${isHighlight}">${row.getValue(t)}</td>`;
                });
                tableRowsHtml += `</tr>`;
            });

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-left">
                    <h2 class="component-modal-title component-modal-title--lg">Actualiza para obtener mÃ¡s acceso</h2>
                    <p class="component-modal-desc component-modal-desc--lg">Elige tu plan. Puedes cancelar tu suscripciÃ³n cuando quieras.</p>
                    
                    <div class="component-modal-list">
                        ${cardsHtml}
                    </div>
                    
                    <button class="component-button component-button--dark component-button--rounded-pill component-button--hover-text component-button--h40 component-modal-submit-btn" data-action="confirmModalUpgrade" data-selected-tier="${tiers[0]?.tier_level || 1}">
                        <span class="btn-default-text">Continuar con la compra</span>
                        <span class="btn-hover-text">Confirmar pago</span>
                    </button>
                    
                    <p class="component-modal-disclaimer">
                        Te enviaremos un recordatorio antes de cada renovaciÃ³n. Puedes cancelar tu suscripciÃ³n cuando quieras en pocos clics.
                    </p>
                </div>
                
                <div class="component-modal-right">
                    <table class="component-table">
                        <thead>
                            <tr>
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
    },

    calendarModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const title = data.title || __('calendar_modal_title') || 'Programar fecha y hora';
            const dateDisplay = data.dateDisplay || __('lbl_select_date') || 'Seleccionar fecha';
            const hours = data.hours || '00';
            const minutes = data.minutes || '00';
            const isoDate = data.isoDate || '';
            const btnCancel = __('btn_cancel') || 'Cancelar';
            const btnConfirm = __('btn_accept') || 'Aceptar';

            const description = data.desc || data.description || '';
            const descHtml = description ? `<p class="component-modal-desc">${description}</p>` : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    ${descHtml}
                </div>
                <div class="component-modal-body">
                    <!-- Date Selector Trigger inside Modal -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="modalCalendarDateOnly" data-ref="modal_selected_iso_date" data-value="${isoDate}">
                            <span class="material-symbols-rounded">calendar_month</span>
                            <span class="component-dropdown-text" data-ref="modal-calendar-date-text">${dateDisplay}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="modalCalendarDateOnly">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-calendar">
                                    <div class="component-calendar-header">
                                        <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                        <div class="component-calendar-title" data-ref="calendar-title">${__('calendar_month_year') || 'Mes AÃ±o'}</div>
                                        <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </button>
                                    </div>
                                    <div class="component-calendar-weekdays">
                                        <span>${__('cal_su') || 'Do'}</span>
                                        <span>${__('cal_mo') || 'Lu'}</span>
                                        <span>${__('cal_tu') || 'Ma'}</span>
                                        <span>${__('cal_we') || 'Mi'}</span>
                                        <span>${__('cal_th') || 'Ju'}</span>
                                        <span>${__('cal_fr') || 'Vi'}</span>
                                        <span>${__('cal_sa') || 'Sa'}</span>
                                    </div>
                                    <div class="component-calendar-days" data-ref="calendar-days"></div>
                                    <div class="component-calendar-actions">
                                        <button type="button" class="component-button component-button--h30" data-action="calendarClear">${__('btn_clear') || 'Limpiar'}</button>
                                        <div>
                                            <button type="button" class="component-button component-button--h30" data-action="calendarCancel">${btnCancel}</button>
                                            <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm">${btnConfirm}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Hours and Minutes Inline Controls -->
                    <div class="calendar-modal-controls">
                        <div>
                            <div class="calendar-control-label">${__('lbl_hours')}</div>
                            <div class="component-inline-control component-inline-control--full">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                        <span class="material-symbols-rounded msr-keyboard_double_arrow_left">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                        <span class="material-symbols-rounded msr-chevron_left">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${parseInt(hours) || 0}">${hours}</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="1">
                                        <span class="material-symbols-rounded msr-chevron_right">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="5">
                                        <span class="material-symbols-rounded msr-keyboard_double_arrow_right">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div class="calendar-control-label">${__('lbl_minutes')}</div>
                            <div class="component-inline-control component-inline-control--full">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                        <span class="material-symbols-rounded msr-keyboard_double_arrow_left">keyboard_double_arrow_left</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                        <span class="material-symbols-rounded msr-chevron_left">chevron_left</span>
                                    </button>
                                </div>
                                <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${parseInt(minutes) || 0}">${minutes}</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="1">
                                        <span class="material-symbols-rounded msr-chevron_right">chevron_right</span>
                                    </button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="5">
                                        <span class="material-symbols-rounded msr-keyboard_double_arrow_right">keyboard_double_arrow_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    }
};
