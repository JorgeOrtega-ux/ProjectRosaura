export const DialogTemplates = {
    welcomePremiumModal: {
        build: (data) => {
            const tierName = data.tier == 1 ? 'Premium' : (data.tier == 2 ? 'Pro' : 'Max');
            let endDate = '';
            if (data.current_period_end) {
                const dt = new Date(data.current_period_end * 1000);
                endDate = dt.toLocaleDateString();
            } else {
                endDate = 'N/A';
            }
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-content--centered">
                    <div class="component-card__icon-container component-text-accent">
                        <span class="material-symbols-rounded component-icon--64">stars</span>
                    </div>
                    <h2 class="component-modal-title">${window.__('welcome_to')} ${tierName}!</h2>
                    <p class="component-modal-desc component-text-secondary">
                        ${window.__('subscription_activated')}
                    </p>
                </div>
                <div class="component-modal-body">
                    <div class="component-card--grouped">
                        <div class="component-group-item">
                            <span class="component-text-secondary">${window.__('current_level')}</span>
                            <strong class="component-text-accent">${tierName}</strong>
                        </div>
                        <div class="component-group-item">
                            <span class="component-text-secondary">${window.__('next_renewal')}</span>
                            <strong>${endDate}</strong>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="window.location.reload()">
                        ${window.__('start_exploring')}
                    </button>
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
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');"></div>
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');">
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
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-2').classList.remove('active'); document.getElementById('welcome-step-1').classList.add('active');"></div>
                                <div class="step-modal-dot active"></div>
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-2').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="document.getElementById('welcome-step-2').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');">
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
                            
                            <div class="component-card-grid">
                                <div class="component-card--selectable"
                                     onclick="if(window.spaRouter){window.spaRouter.navigate('/upgrade');}else{window.location.href='/upgrade';} if(window.dialogSystem){window.dialogSystem.closeCurrent();}">
                                    <h4 class="component-card__title">${window.__('premium_plan_pro')}</h4>
                                    <div class="component-card__price">$${window.APP_PRICES && window.APP_PRICES[2] ? window.APP_PRICES[2].monthly : '8.99'}<span class="component-text-secondary">${window.__('premium_period_month')}</span></div>
                                </div>
                                <div class="component-card--selectable"
                                     onclick="if(window.spaRouter){window.spaRouter.navigate('/upgrade');}else{window.location.href='/upgrade';} if(window.dialogSystem){window.dialogSystem.closeCurrent();}">
                                    <h4 class="component-card__title">${window.__('premium_plan_ultra')}</h4>
                                    <div class="component-card__price">$${window.APP_PRICES && window.APP_PRICES[3] ? window.APP_PRICES[3].monthly : '19.99'}<span class="component-text-secondary">${window.__('premium_period_month')}</span></div>
                                </div>
                            </div>
                            
                            <p class="component-modal-desc component-text-secondary">
                                ${window.__('premium_monthly_disclaimer')}
                            </p>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-3').classList.remove('active'); document.getElementById('welcome-step-1').classList.add('active');"></div>
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-3').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');"></div>
                                <div class="step-modal-dot active"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="finish">
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
                    <p class="component-input-label">${__('lbl_role_color')}</p>
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
        build: (data = {}) => {
            console.log("[DialogTemplates Debug] verifyPasswordDialog build called. APP_USER:", window.APP_USER, "data:", data);
            const isGoogleUser = typeof window.APP_USER !== 'undefined' && Boolean(window.APP_USER && window.APP_USER.is_google);
            console.log("[DialogTemplates Debug] isGoogleUser resolved to:", isGoogleUser);
            const getTrans = (key, fallback) => {
                if (typeof window.__ === 'function') {
                    const val = window.__(key);
                    if (val && val !== key) return val;
                }
                return fallback;
            };

            const title = data.title || (data.titleKey ? getTrans(data.titleKey, 'Verificar Identidad') : getTrans('title_verify_identity', 'Verificar Identidad'));
            const desc = data.descHtml || data.message || (data.descKey ? getTrans(data.descKey, 'Confirma tu acción para continuar.') : getTrans('desc_verify_identity', 'Confirma tu contraseña para continuar.'));
            const cancelBtnText = getTrans('btn_cancel', 'Cancelar');
            const confirmBtnText = data.confirmKey ? getTrans(data.confirmKey, 'Continuar') : getTrans('btn_continue', 'Continuar');
            const passwordLblText = getTrans('lbl_current_password', 'Contraseña actual');

            if (isGoogleUser) {
                const userEmail = (window.APP_USER && window.APP_USER.email) ? window.APP_USER.email : '';
                return `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">verified_user</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${title}</h2>
                            <p class="component-modal-desc">${desc}</p>
                        </div>
                    </div>
                    <div class="component-modal-body">
                        <input type="hidden" data-ref="modal_verify_password" value="GOOGLE_OAUTH_CONFIRMED">
                        <div class="component-badge component-badge--glass" style="width: 100%; justify-content: center; padding: 12px; font-size: 14px; gap: 8px;">
                            <span class="material-symbols-rounded" style="color: #4285F4;">g_mobiledata</span>
                            <span>${userEmail ? `Sesión activa con Google (${userEmail})` : 'Sesión activa verificada con Google'}</span>
                        </div>
                    </div>
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${cancelBtnText}</button>
                        <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${confirmBtnText}</button>
                    </div>
                `;
            }

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
                    <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${cancelBtnText}</button>
                    <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${confirmBtnText}</button>
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

    verifyPasswordDeleteCanvas: {
        build: () => DialogTemplates.verifyPasswordDialog.build({
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

    confirmResetNow: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_reset_now',
            descKey: 'desc_confirm_reset_now',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_reset_now'
        })
    },

    confirmResizeNow: {
        build: (data) => DialogTemplates.confirmAction.build({
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
            descHtml: __('desc_verify_delete_canvases').replace(':count', data.count || 0),
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
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitJoinLive">${__('btn_join')}</button>
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
                                <div class="component-inline-control__center" data-ref="live-input-x" data-val="${data.x || 0}">${data.x || 0}</div>
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
                                <div class="component-inline-control__center" data-ref="live-input-y" data-val="${data.y || 0}">${data.y || 0}</div>
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
                            <div class="component-inline-control__center" data-ref="live-input-opacity" data-val="${data.opacity !== undefined ? data.opacity : 1}">${Math.round((data.opacity !== undefined ? data.opacity : 1) * 100)}%</div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="0.05" data-max="1"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustLiveOpacity" data-step="0.10" data-max="1"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_close')}</button>
                <button class="component-button component-button--danger component-button--h45 component-button--full ${data.isActive ? 'active' : 'disabled'}" data-action="stopLive">${__('btn_stop_live')}</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full ${data.isActive ? 'disabled' : 'active'}" data-action="startLive">${__('btn_start_live')}</button>
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
                    <p class="component-modal-desc">${window.__('please_accept_rules')}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">${window.__('accept_community_rules')}</h2>
                                <p class="component-card__description">${window.__('acknowledge_private_canvas_rules')}</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="modal_join_terms">
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-modal-action="confirm">${window.__('join_canvas')}</button>
            </div>
        `
    },

    confirmDeleteMessage: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_action',
            descHtml: __('confirm_delete_message'),
            confirmClass: 'component-button--danger'
        })
    },

    reportMessageDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('report_title')}</h2>
                <p class="component-modal-desc">${__('report_desc')}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-radio-group">
                    <label class="component-radio-option">
                        <input type="radio" name="report_reason" value="spam" data-ref="report_reason" onchange="document.getElementById('report_other_textarea').classList.add('disabled')">
                        <span>${__('report_spam')}</span>
                    </label>
                    <label class="component-radio-option">
                        <input type="radio" name="report_reason" value="offensive" data-ref="report_reason" onchange="document.getElementById('report_other_textarea').classList.add('disabled')">
                        <span>${__('report_offensive')}</span>
                    </label>
                    <label class="component-radio-option">
                        <input type="radio" name="report_reason" value="harassment" data-ref="report_reason" onchange="document.getElementById('report_other_textarea').classList.add('disabled')">
                        <span>${__('report_harassment')}</span>
                    </label>
                    <label class="component-radio-option">
                        <input type="radio" name="report_reason" value="other" data-ref="report_reason" onchange="document.getElementById('report_other_textarea').classList.remove('disabled')">
                        <span>${__('report_other')}</span>
                    </label>
                </div>
                <div class="component-input-group">
                    <textarea id="report_other_textarea" data-ref="report_other_text" class="component-input-field disabled" placeholder="${__('report_other_placeholder')}" rows="3"></textarea>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-modal-action="confirm">${__('btn_report')}</button>
            </div>
        `
    }
,
    downgradeCanvasModal: {
        build: (data = {}) => DialogTemplates.verifyPasswordDialog.build({
            titleKey: data.titleKey || 'downgrade_basic_title',
            descKey: data.descKey || 'downgrade_basic_message',
            confirmKey: 'btn_confirm'
        })
    },

    confirmPlazmarTemplate: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_action',
            descHtml: __('confirm_plazmar_template'),
            confirmClass: 'component-button--warning'
        })
    },

    confirmUnlinkGoogleModal: {
        build: (data = {}) => {
            const googleName = data.googleName || '';
            const userEmail = data.userEmail || '';
            const appName = window.APP_NAME || 'Rosaura';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">¿De verdad quieres desvincular la cuenta de Google “${googleName}”?</h2>
                    <p class="component-modal-desc">
                        La próxima vez que inicies sesión en ${appName}, tendrás que usar tu dirección de correo electrónico ${userEmail} y tu contraseña.
                    </p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h45" data-modal-action="cancel">${window.__('btn_cancel', [], 'Cancelar')}</button>
                    <button type="button" class="component-button component-button--h45 component-button--dark" data-modal-action="confirm">${window.__('btn_disconnect', [], 'Desconectar')}</button>
                </div>
            `;
        }
    }
};