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
                    <div class="component-card__icon-container" style="color: var(--accent-primary);">
                        <span class="material-symbols-rounded" style="font-size: 64px;">stars</span>
                    </div>
                    <h2 class="component-modal-title" style="font-size: 24px; font-weight: 600;">${window.__('welcome_to')} ${tierName}!</h2>
                    <p class="component-modal-desc" style="color: var(--text-secondary); line-height: 1.6;">
                        ${window.__('subscription_activated')}
                    </p>
                </div>
                <div class="component-modal-body">
                    <div style="background: var(--bg-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: var(--text-secondary);">${window.__('current_level') || 'Current Tier'}</span>
                            <strong style="color: var(--accent-primary);">${tierName}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-secondary);">${window.__('next_renewal') || 'Next Renewal'}</span>
                            <strong>${endDate}</strong>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="window.location.reload()">
                        ${window.__('start_exploring') || 'Start Exploring!'}
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
                        <img src="assets/images/welcome-banner.png" alt="Welcome Banner" onerror="this.style.display='none'">
                    </div>
                    
                    <div class="step-modal-content">
                        <!-- Step 1 -->
                        <div class="step-modal-step active" id="welcome-step-1">
                            <h2 class="component-modal-title">¡Te damos la bienvenida!</h2>
                            <p class="component-modal-desc step-modal-desc">
                                Descubre todas las herramientas que hemos preparado para ayudarte a gestionar tus proyectos y flujos de trabajo de forma rápida y sencilla.
                            </p>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot active"></div>
                                <div class="step-modal-dot"></div>
                                <div class="step-modal-dot"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="document.getElementById('welcome-step-1').classList.remove('active'); document.getElementById('welcome-step-2').classList.add('active');">
                                    Siguiente
                                </button>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="step-modal-step" id="welcome-step-2">
                            <h2 class="component-modal-title">Colaboración en tiempo real</h2>
                            <p class="component-modal-desc step-modal-desc">
                                Invita a tu equipo y trabajen juntos en vivo. Comparte ideas, diseña y toma decisiones importantes en el mismo lienzo sin interrupciones.
                            </p>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot"></div>
                                <div class="step-modal-dot active"></div>
                                <div class="step-modal-dot"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" onclick="document.getElementById('welcome-step-2').classList.remove('active'); document.getElementById('welcome-step-3').classList.add('active');">
                                    Siguiente
                                </button>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="step-modal-step" id="welcome-step-3">
                            <h2 class="component-modal-title">Potencia tu cuenta</h2>
                            <p class="component-modal-desc step-modal-desc" style="margin-bottom: 12px; flex: none;">
                                Sube de nivel y desbloquea funciones exclusivas para ti o tu equipo.
                            </p>
                            
                            <div style="display: flex; gap: 12px; margin-bottom: 24px; flex: 1; align-items: stretch;">
                                <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: border-color 0.2s ease; display: flex; flex-direction: column; justify-content: center;"
                                     onmouseover="this.style.borderColor='var(--text-primary)'"
                                     onmouseout="this.style.borderColor='var(--border-color)'"
                                     onclick="if(window.spaRouter){window.spaRouter.navigate('/premium');}else{window.location.href='/premium';} if(window.dialogSystem){window.dialogSystem.closeCurrent();}">
                                    <h4 style="margin: 0 0 8px 0; font-size: 15px; color: var(--text-primary);">Plan Pro</h4>
                                    <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);">$9.99<span style="font-size: 12px; color: var(--text-secondary); font-weight: normal;">/mes</span></div>
                                </div>
                                <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; text-align: center; cursor: pointer; transition: border-color 0.2s ease; display: flex; flex-direction: column; justify-content: center;"
                                     onmouseover="this.style.borderColor='var(--text-primary)'"
                                     onmouseout="this.style.borderColor='var(--border-color)'"
                                     onclick="if(window.spaRouter){window.spaRouter.navigate('/premium');}else{window.location.href='/premium';} if(window.dialogSystem){window.dialogSystem.closeCurrent();}">
                                    <h4 style="margin: 0 0 8px 0; font-size: 15px; color: var(--text-primary);">Plan Advanced</h4>
                                    <div style="font-size: 18px; font-weight: bold; color: var(--text-primary);">$19.99<span style="font-size: 12px; color: var(--text-secondary); font-weight: normal;">/mes</span></div>
                                </div>
                            </div>
                            
                            <div class="step-modal-dots">
                                <div class="step-modal-dot"></div>
                                <div class="step-modal-dot"></div>
                                <div class="step-modal-dot active"></div>
                            </div>

                            <div class="step-modal-actions">
                                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="finish">
                                    Terminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    modalStoreTerms: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${window.__('purchase_conditions')}</h2>
                <p class="component-modal-desc">
                    ${window.__('usd_warning')} ${window.__('no_refunds_digital_goods')}
                </p>
            </div>
            <div class="component-modal-body">
                <label class="component-checkbox" style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 24px;">
                    <input type="checkbox" id="checkAcceptStoreTerms" style="margin-top: 4px;">
                    <span style="font-size: 14px; color: var(--text-primary);">${window.__('accept_usd_no_refunds')}</span>
                </label>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${window.__('cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${window.__('confirm_and_continue')}</button>
            </div>
        `
    },

    modalContentStoreTerms: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${window.__('terms_of_use')}</h2>
                <p class="component-modal-desc">
                    ${window.__('items_only_selected_canvases')} ${window.__('perks_may_be_disabled_by_admin')}
                </p>
            </div>
            <div class="component-modal-body">
                <label class="component-checkbox" style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 24px;">
                    <input type="checkbox" id="checkAcceptContentTerms" style="margin-top: 4px;">
                    <span style="font-size: 14px; color: var(--text-primary);">${window.__('understand_perks_disabled')}</span>
                </label>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${window.__('cancel')}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${window.__('confirm_and_continue')}</button>
            </div>
        `
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
            descHtml: __('desc_verify_delete_canvases') ? __('desc_verify_delete_canvases').replace(':count', data.count || 0) : (window.__('default_delete_canvases_desc') ? window.__('default_delete_canvases_desc').replace(':count', data.count || 0) : `Permanently deleting ${data.count || 0} canvases. Enter your password to confirm.`),
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
                <div class="component-form-box component-form-box--full" style="max-width: 100%;">
                    <div class="component-input-group">
                        <input type="text" data-ref="live-join-code-modal" class="component-input-field" placeholder="${__('ph_live_share_code')}" maxlength="9" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(.+)/, '$1-$2').slice(0, 9);" style="text-transform: uppercase;">
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
                    <div class="component-alert-success ${data.isActive ? 'active' : ''}" style="margin-bottom: 12px; display: ${data.isActive ? 'block' : 'none'};" data-ref="live-share-active-alert">
                        ${__('txt_live_active')}
                    </div>
                    
                    <div class="live-share-code-display" data-ref="live-share-code">${data.code || '...'}</div>
                    
                    <div class="live-share-inputs-grid" style="margin-top: 12px;">
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
                    
                    <div class="live-share-input-group" style="margin-top: 12px;">
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
            <div class="component-modal-actions" style="margin-top: 8px;">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${__('btn_close')}</button>
                <button class="component-button component-button--danger component-button--h45 component-button--full" data-action="stopLive" style="display: ${data.isActive ? 'flex' : 'none'};">${__('btn_stop_live')}</button>
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="startLive" style="display: ${data.isActive ? 'none' : 'flex'};">${__('btn_start_live')}</button>
            </div>
        `
    },

    joinCanvasTerms: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <span class="material-symbols-rounded">gavel</span>
                <div class="component-modal-header-text">
                    <h3 class="component-modal-title">${window.__('terms_and_conditions') || 'Terms and Conditions'}</h3>
                    <p class="component-modal-desc">${window.__('please_accept_rules') || 'Please accept the community rules before joining.'}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">${window.__('accept_community_rules') || 'Accept Community Rules'}</h2>
                                <p class="component-card__description">${window.__('acknowledge_private_canvas_rules') || 'I acknowledge that the platform has no control over what happens inside this private canvas and I commit to not breaking the rules.'}</p>
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
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-modal-action="confirm">${window.__('join_canvas') || 'Join Canvas'}</button>
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
                <div class="component-radio-group" style="display: flex; flex-direction: column; gap: 8px;">
                    <label class="component-radio-option" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
                        <input type="radio" name="report_reason" value="spam" data-ref="report_reason" style="accent-color: var(--accent-primary, #3b82f6); width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('report_other_textarea').style.display='none'">
                        <span style="font-size: 14px;">${__('report_spam')}</span>
                    </label>
                    <label class="component-radio-option" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
                        <input type="radio" name="report_reason" value="offensive" data-ref="report_reason" style="accent-color: var(--accent-primary, #3b82f6); width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('report_other_textarea').style.display='none'">
                        <span style="font-size: 14px;">${__('report_offensive')}</span>
                    </label>
                    <label class="component-radio-option" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
                        <input type="radio" name="report_reason" value="harassment" data-ref="report_reason" style="accent-color: var(--accent-primary, #3b82f6); width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('report_other_textarea').style.display='none'">
                        <span style="font-size: 14px;">${__('report_harassment')}</span>
                    </label>
                    <label class="component-radio-option" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
                        <input type="radio" name="report_reason" value="other" data-ref="report_reason" style="accent-color: var(--accent-primary, #3b82f6); width: 18px; height: 18px; cursor: pointer;" onchange="document.getElementById('report_other_textarea').style.display='block'">
                        <span style="font-size: 14px;">${__('report_other')}</span>
                    </label>
                </div>
                <div class="component-input-group" style="margin-top: 12px;">
                    <textarea id="report_other_textarea" data-ref="report_other_text" class="component-input-field" placeholder="${__('report_other_placeholder')}" rows="3" style="display: none; resize: vertical; min-height: 60px;"></textarea>
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
        build: () => DialogTemplates.confirmActionModal.build({
            title: window.__('downgrade_basic_title'),
            message: window.__('downgrade_basic_msg'),
            inputPlaceholder: window.__('word_confirm'),
            expectedInput: window.__('word_confirm'),
            confirmClass: 'component-button--danger'
        })
    }
};