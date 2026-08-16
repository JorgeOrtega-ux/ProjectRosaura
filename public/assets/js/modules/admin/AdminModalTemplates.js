export const AdminModalTemplates = {
    editUserRoleModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const user = data.targetUser || data.user || {};
            const allRoles = data.allRoles || [];
            const assignedRoleIds = (data.assignedRoleIds && data.assignedRoleIds.length > 0) 
                ? data.assignedRoleIds.map(id => parseInt(id, 10)) 
                : (data.currentUserRoleId ? [parseInt(data.currentUserRoleId, 10)] : [1]);
            const currentUserWeight = data.currentUserWeight || 0;
            const isSuperAdmin = !!data.isSuperAdmin;
            const isTargetSuperAdmin = assignedRoleIds.includes(4);
            const targetUserId = data.targetUserId || (user.id ? user.id : '');

            const rolesHtml = allRoles.map(r => {
                const rKey = 'role.' + r.name.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
                const rTrans = __(rKey) || r.name;

                const isHigherHierarchy = !isSuperAdmin && (parseInt(r.weight, 10) >= currentUserWeight);
                const isDisabled = (r.id == 4 && !isSuperAdmin) || isHigherHierarchy || (r.id == 1 && isTargetSuperAdmin);

                const isChecked = assignedRoleIds.includes(parseInt(r.id, 10)) ? 'checked' : '';
                const disabledClass = isDisabled ? 'disabled-interaction' : '';
                const disabledAttr = isDisabled ? 'disabled' : '';

                let badgeHtml = '';
                if (r.id == 1) {
                    badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> ${__('lbl_base')}</span>`;
                } else if (r.id == 4 && !isSuperAdmin) {
                    badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> ${__('lbl_unavailable')}</span>`;
                }

                return `
                    <label class="component-menu-link component-menu-link--bordered nav-item ${disabledClass}">
                        <div class="component-menu-link-icon">
                            <input type="checkbox" name="assigned_roles[]" value="${r.id}" class="admin-role-checkbox" ${isChecked} ${disabledAttr}>
                        </div>
                        <div class="component-menu-link-text">
                            <span>${rTrans}</span>
                            ${badgeHtml}
                        </div>
                    </label>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_manage_user_roles_title')}</h2>
                        <p class="component-modal-desc">${__('modal_manage_user_roles_desc')} <b>${user.username || ''}</b>.</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-roles-form" data-target-user-id="${targetUserId}">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownRolesList">
                            <div class="component-dropdown-trigger-title">
                                <span class="material-symbols-rounded">admin_panel_settings</span>
                                <span class="component-dropdown-text" data-ref="roles-dropdown-text">${__('lbl_select_roles')}</span>
                            </div>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>

                        <div class="component-module component-module--dropdown disabled" data-module="dropdownRolesList">
                            <div class="component-menu component-menu--w-full component-menu--h-auto">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--max-h250">
                                    ${rolesHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="submitMultipleRolesUpdate">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    },
    adjustUserCoinsModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const userUuid = data.userUuid || '';
            const username = data.username || 'User';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_adjust_coins_title', [], 'Ajustar Saldo de Monedas')}</h2>
                        <p class="component-modal-desc">${__('lbl_adjust_coins_desc', { username }, 'Bonificar o ajustar monedas para el usuario')} <b>${username}</b>.</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-adjust-coins-form" data-user-uuid="${userUuid}">
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_coins_amount', [], 'Cantidad de Monedas')}</label>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="adjust_coins_amount" data-step="-50" data-min="-999999"><span class="material-symbols-rounded msr-keyboard_double_arrow_left">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="adjust_coins_amount" data-step="-10" data-min="-999999"><span class="material-symbols-rounded msr-chevron_left">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_adjust_coins_amount" data-value="50">+50</div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="adjust_coins_amount" data-step="10" data-max="999999"><span class="material-symbols-rounded msr-chevron_right">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustConfig" data-field="adjust_coins_amount" data-step="50" data-max="999999"><span class="material-symbols-rounded msr-keyboard_double_arrow_right">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_reason', [], 'Motivo del Ajuste')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownAdjustCoinsReason">
                                <span class="material-symbols-rounded">category</span>
                                <span class="component-dropdown-text" data-ref="adjust-coins-reason-text" data-value="${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}">${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownAdjustCoinsReason">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">build</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_bonus', [], 'Bonificación / Cortesía')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">featured_seasonal_and_gifts</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_bonus', [], 'Bonificación / Cortesía')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_refund', [], 'Reembolso de compra')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">currency_exchange</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_refund', [], 'Reembolso de compra')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_promo', [], 'Premio / Evento especial')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">celebration</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_promo', [], 'Premio / Evento especial')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_adjust', [], 'Corrección de saldo')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">tune</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_adjust', [], 'Corrección de saldo')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_penalty', [], 'Deducción por infracción')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_penalty', [], 'Deducción por infracción')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_other', [], 'Otro motivo administrativo')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">more_horiz</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_other', [], 'Otro motivo administrativo')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="${data.actionTarget || 'submitAdjustCoins'}">${__('btn_apply')}</button>
                </div>
            `;
        }
    },
    disableUser2faModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const userUuid = data.userUuid || '';
            const username = data.username || 'User';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_disable_2fa_title', [], 'Desactivar Autenticación 2FA')}</h2>
                        <p class="component-modal-desc">${__('lbl_disable_2fa_desc', [], 'Esta acción removerá el 2FA de')} <b>${username}</b>. ${__('lbl_action_audited', [], 'Quedará registrada en auditoría.')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-disable-2fa-form" data-user-uuid="${userUuid}">
                    <div class="component-input-group">
                        <textarea class="component-input-field" name="reason" placeholder=" " rows="3" required></textarea>
                        <label class="component-input-label">${__('lbl_audit_reason', [], 'Motivo de Auditoría (Obligatorio)')}</label>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="${data.actionTarget || 'submitDisable2FA'}">${__('btn_disable_2fa', [], 'Desactivar 2FA')}</button>
                </div>
            `;
        }
    },
    confirmUserAdminActionModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const title = data.title || __('title_confirm_action', [], 'Confirmar Acción');
            const desc = data.desc || '';
            const confirmText = data.confirmText || __('btn_confirm', [], 'Confirmar');
            const confirmClass = data.confirmClass || 'component-button--dark';
            const actionTarget = data.actionTarget || 'submitConfirmUserAdminAction';
            const userUuid = data.userUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc">${desc}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-confirm-user-admin-action-body" data-user-uuid="${userUuid}" data-action-type="${data.actionType || ''}" style="display:none;"></div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [], 'Cancelar')}</button>
                    <button class="component-button component-button--h40 ${confirmClass}" data-action="${actionTarget}">${confirmText}</button>
                </div>
            `;
        }
    }
};
