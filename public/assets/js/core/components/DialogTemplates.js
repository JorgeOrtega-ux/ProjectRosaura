export const DialogTemplates = {
    welcomePremiumModal: {
        fullScreen: true,
        build: (data = {}) => DialogTemplates.purchaseSuccessModal.build({ ...data, item_type: 'subscription' })
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
                const tierName = data.tier == 1 ? 'Plus' : (data.tier == 2 ? 'Pro' : (data.tier == 3 ? 'Ultra' : 'Premium'));
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
                            <a href="/support" onclick="if(window.spaRouter){window.spaRouter.navigate('/support');} if(window.dialogSystem){window.dialogSystem.closeCurrent();} return false;">
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
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');"></div>
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h40 component-button--dark" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');">
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
                                <button class="component-button component-button--h40 component-button--dark" onclick="document.getElementById('welcome-step-2').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');">
                                    ${window.__('welcome_modal_btn_next')}
                                </button>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="step-modal-step" id="welcome-step-3">
                            <h2 class="component-modal-title">${window.__('welcome_modal_step3_title')}</h2>
                            <p class="component-modal-desc step-modal-desc" style="margin-bottom: 12px;">
                                ${window.__('welcome_modal_step3_desc')}
                            </p>
                            
                            <div class="welcome-features-list">
                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">cloud</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_storage_title') || 'Almacenamiento y Lienzos Ilimitados'}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_storage_desc') || 'Aumenta tu capacidad de almacenamiento en la nube y crea múltiples proyectos sin restricciones.'}</span>
                                    </div>
                                </div>

                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">palette</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_tools_title') || 'Herramientas y Paletas Exclusivas'}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_tools_desc') || 'Diseña con paletas de colores personalizadas y accede a herramientas avanzadas para tus diseños.'}</span>
                                    </div>
                                </div>

                                <div class="welcome-feature-item">
                                    <div class="welcome-feature-icon">
                                        <span class="material-symbols-rounded component-icon-sm">bolt</span>
                                    </div>
                                    <div class="welcome-feature-text">
                                        <span class="welcome-feature-title">${window.__('welcome_adv_speed_title') || 'Renderizado Prioritario y Funciones Beta'}</span>
                                        <span class="welcome-feature-desc">${window.__('welcome_adv_speed_desc') || 'Exporta tus lienzos a máxima velocidad y prueba las nuevas características antes que los demás.'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-3').classList.remove('active'); document.getElementById('welcome-step-1').classList.add('active');"></div>
                                <div class="step-modal-dot" onclick="document.getElementById('welcome-step-3').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');"></div>
                                <div class="step-modal-dot active"></div>
                            </div>

                            <div class="step-modal-actions" style="gap: 8px;">
                                <button class="component-button component-button--h40 component-button--ghost" onclick="if(window.spaRouter){window.spaRouter.navigate('/upgrade');}else{window.location.href='/upgrade';} if(window.dialogSystem){window.dialogSystem.closeCurrent();}">
                                    ${window.__('btn_more_info') || 'Más información'}
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
                    <span class="component-link disabled-interaction component-text-notice--muted" data-action="dialogResendCode">${__('btn_resend_code')} (60)</span>
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
            <div class="component-modal-body">
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="revoke_all">${__('btn_revoke_all')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="revoke_other">${__('btn_revoke_other')}</button>
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
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
            const desc = data.descHtml || data.message || (data.descKey ? getTrans(data.descKey, 'Confirma tu acción para continuar.') : getTrans('desc_verify_identity', 'Confirma tu contraseña para continuar.'));
            const cancelBtnText = getTrans('btn_cancel', 'Cancelar');
            const confirmBtnText = data.confirmKey ? getTrans(data.confirmKey, 'Continuar') : getTrans('btn_continue', 'Continuar');
            const passwordLblText = getTrans('lbl_current_password', 'Contraseña actual');
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
                <h2 class="component-modal-title">${__('admin_tier_delete_title') || 'Eliminar Suscripción'}</h2>
                <p class="component-modal-desc">${__('admin_tier_delete_desc') || '¿Estás seguro de que deseas eliminar la suscripción'} ${data.tierName || ''}?</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_confirm_delete')}</button>
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
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--dark component-button--h40" data-modal-action="confirm">${window.__('join_canvas')}</button>
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

    deleteMessageDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('admin_msg_delete_title') || 'Eliminar Mensaje'}</h2>
                <p class="component-modal-desc">${__('admin_msg_delete_desc') || 'Selecciona el motivo de moderación para eliminar este mensaje.'}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                    <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason">
                        <span class="material-symbols-rounded" data-ref="report_trigger_icon">delete</span>
                        <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder') || 'Selecciona un motivo...'}</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list component-menu-list--scrollable">
                                <div class="component-menu-link" data-action="selectReportReason" data-value="spam" data-icon="campaign" data-text="${__('report_reason_spam') || 'Spam / Publicidad no deseada'}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">campaign</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_spam') || 'Spam / Publicidad no deseada'}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="offensive" data-icon="warning" data-text="${__('report_reason_offensive') || 'Contenido ofensivo o inapropiado'}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">warning</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_offensive') || 'Contenido ofensivo o inapropiado'}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="harassment" data-icon="front_hand" data-text="${__('report_reason_harassment') || 'Acoso o discriminación'}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">front_hand</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_harassment') || 'Acoso o discriminación'}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="other" data-icon="more_horiz" data-text="${__('report_reason_other') || 'Otro motivo'}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">more_horiz</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_other') || 'Otro motivo'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <input type="hidden" name="report_reason" id="report_reason" data-ref="report_reason" value="">
                <div class="component-input-group disabled" id="report_other_group">
                    <textarea id="report_other_textarea" data-ref="report_other_text" class="component-input-field" placeholder="${__('report_other_placeholder') || 'Escribe el motivo detallado...'}" rows="3"></textarea>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel') || 'Cancelar'}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete') || 'Eliminar'}</button>
            </div>
        `
    },

    reportMessageDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('report_title')}</h2>
                <p class="component-modal-desc">${__('report_desc')}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                    <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason">
                        <span class="material-symbols-rounded" data-ref="report_trigger_icon">report</span>
                        <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder')}</span>
                        <span class="material-symbols-rounded">expand_more</span>
                    </div>
                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                            <div class="pill-container"><div class="drag-handle"></div></div>
                            <div class="component-menu-list component-menu-list--scrollable">
                                <div class="component-menu-link" data-action="selectReportReason" data-value="spam" data-icon="campaign" data-text="${__('report_reason_spam')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">campaign</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_spam')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="offensive" data-icon="warning" data-text="${__('report_reason_offensive')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">warning</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_offensive')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="harassment" data-icon="front_hand" data-text="${__('report_reason_harassment')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">front_hand</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_harassment')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="hate_speech" data-icon="gavel" data-text="${__('report_reason_hate_speech')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_hate_speech')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="violence" data-icon="dangerous" data-text="${__('report_reason_violence')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">dangerous</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_violence')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="misinformation" data-icon="info" data-text="${__('report_reason_misinformation')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">info</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_misinformation')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="privacy" data-icon="privacy_tip" data-text="${__('report_reason_privacy')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">privacy_tip</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_privacy')}</span></div>
                                </div>
                                <div class="component-menu-link" data-action="selectReportReason" data-value="other" data-icon="more_horiz" data-text="${__('report_reason_other')}">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">more_horiz</span></div>
                                    <div class="component-menu-link-text"><span>${__('report_reason_other')}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <input type="hidden" name="report_reason" id="report_reason" data-ref="report_reason" value="">
                <div class="component-input-group disabled" id="report_other_group">
                    <textarea id="report_other_textarea" data-ref="report_other_text" class="component-input-field" placeholder="${__('report_other_placeholder')}" rows="3"></textarea>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_report')}</button>
            </div>
        `
    },

    downgradeCanvasModal: {
        build: (data = {}) => DialogTemplates.verifyPasswordDialog.build({
            titleKey: data.titleKey || 'downgrade_basic_title',
            descKey: data.descKey || 'downgrade_basic_message',
            confirmKey: 'btn_confirm'
        })
    },

    confirmInjectTemplate: {
        build: () => DialogTemplates.confirmAction.build({
            titleKey: 'title_confirm_action',
            descHtml: __('confirm_inject_template'),
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
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${window.__('btn_cancel', [], 'Cancelar')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${window.__('btn_disconnect', [], 'Desconectar')}</button>
                </div>
            `;
        }
    },

    confirmUpgradeModal: {
        build: (data = {}) => {
            const amount = data.amount || '0.00';
            const currency = (data.currency || 'USD').toUpperCase();
            const isUpgrade = data.isUpgrade || false;
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">Confirmar Compra</h2>
                    <p class="component-modal-desc">
                        Estás a punto de confirmar la compra. Aquí tienes el desglose:
                    </p>
                </div>
                <div class="component-modal-body">
                    <div class="component-card--grouped">
                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Total a cobrar hoy</h2>
                                    <p class="component-card__description">${amount} ${currency}</p>
                                </div>
                            </div>
                        </div>
                        ${isUpgrade ? `
                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__icon-container">
                                    <span class="material-symbols-rounded component-text-notice--info">info</span>
                                </div>
                                <div class="component-card__text">
                                    <p class="component-card__description component-text-notice--info">El monto incluye el descuento por el tiempo no utilizado de tu suscripción actual.</p>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        <div style="margin-top: 14px;">
                            <div class="component-input-group">
                                <input type="password" id="confirmPurchasePasswordInput" data-ref="confirmPurchasePasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                                <label class="component-input-label">Contraseña de tu cuenta</label>
                                <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">Cancelar</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">Confirmar Pago</button>
                </div>
            `;
        }
    },

    confirmPasswordModal: {
        build: (data = {}) => {
            const title = data.title || 'Verificación de Seguridad';
            const desc = data.desc || 'Ingresa tu contraseña para autorizar este cambio.';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" id="confirmSecPasswordInput" data-ref="confirmSecPasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                        <label class="component-input-label">Contraseña de tu cuenta</label>
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
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-content--centered">
                    <div class="component-card__icon-container component-text-danger">
                        <span class="material-symbols-rounded component-icon--64">cleaning_services</span>
                    </div>
                    <h2 class="component-modal-title">¿Vaciar zona seleccionada?</h2>
                    <p class="component-modal-desc component-text-secondary">
                        Se borrarán <strong>${count}</strong> píxeles de esta área para todos los usuarios. Esta acción no se puede deshacer.
                    </p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="cancel">Cancelar</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">Vaciar Zona</button>
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
                    <div class="component-badge component-badge--warning" style="margin-bottom: 4px;">
                        <span class="material-symbols-rounded">${item.icon || 'star'}</span>
                        <span>${item.name} (${formattedPrice} ${__('coins')})</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">¿Estás seguro de gastar ${formattedTotal} monedas?</h2>
                    <p class="component-modal-desc">
                        Estás a punto de adquirir los siguientes elementos para tu cuenta:
                    </p>
                </div>
                <div class="component-modal-body">
                    <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin-top: 8px;">
                        ${badgesHtml}
                    </div>
                </div>
                <div class="component-modal-actions" style="margin-top: 16px;">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_confirm')}</button>
                </div>
            `;
        }
    }
};