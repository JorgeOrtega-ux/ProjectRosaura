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
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">shield_person</span>
                    </div>
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

                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--dropdown-full component-module--spaced disabled" data-module="dropdownRolesList">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact component-menu-list--max-h250">
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
    escalateChatModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const sessionUuid = data.sessionUuid || '';
            const currentLevel = data.currentLevel || 'l1';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">forward</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_escalate_chat_title')}</h2>
                        <p class="component-modal-desc">${__('modal_escalate_chat_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-escalate-form" data-session-uuid="${sessionUuid}">
                    <div class="component-group-item component-group-item--stacked component-mb-3">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_escalate_to_level')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEscalateLevel">
                                    <span class="material-symbols-rounded">arrow_upward</span>
                                    <span class="component-dropdown-text" data-ref="escalate-level-text" data-value="l2">${__('lbl_dept_l2')}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownEscalateLevel">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link active" data-action="selectEscalateLevel" data-val="l2">
                                                <div class="component-menu-link-text"><span>${__('lbl_dept_l2')}</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectEscalateLevel" data-val="l3">
                                                <div class="component-menu-link-text"><span>${__('lbl_dept_l3')}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked component-mb-3">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_escalation_reason')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-input-group component-input-group--h34">
                                <input class="component-input-field component-input-field--simple" data-ref="escalate-reason-input" type="text" placeholder="${__('placeholder_escalation_reason')}" maxlength="255" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_internal_note_next_agent')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <textarea class="component-input-field" data-ref="escalate-note-input" placeholder="${__('placeholder_internal_escalation_note')}" rows="3" maxlength="1500"></textarea>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="submitEscalateChat">${__('btn_confirm_escalate')}</button>
                </div>
            `;
        }
    },
    closeChatModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const sessionUuid = data.sessionUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">check_circle</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_close_chat_title')}</h2>
                        <p class="component-modal-desc">${__('modal_close_chat_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-close-chat-form" data-session-uuid="${sessionUuid}">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_resolution_summary')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <textarea class="component-input-field" data-ref="close-chat-summary-input" placeholder="${__('placeholder_resolution_summary')}" rows="3" maxlength="2000"></textarea>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="submitCloseChat">${__('btn_confirm_resolve')}</button>
                </div>
            `;
        }
    },
    reassignChatModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const sessionUuid = data.sessionUuid || '';
            const onlineAgents = data.onlineAgents || [];

            let agentsHtml = '';
            if (onlineAgents.length === 0) {
                agentsHtml = `
                    <div class="component-empty-state component-p-2">
                        <p class="component-empty-state-text">${__('admin_no_agents_to_reassign') || 'No hay otros agentes en línea disponibles.'}</p>
                    </div>
                `;
            } else {
                onlineAgents.forEach((agent, index) => {
                    const activeClass = index === 0 ? 'active' : '';
                    agentsHtml += `
                        <div class="component-menu-link ${activeClass}" data-action="selectReassignAgent" data-val="${agent.id}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">support_agent</span></div>
                            <div class="component-menu-link-text">
                                <span>${agent.username || 'Agent'} (${agent.department_level ? agent.department_level.toUpperCase() : 'L1'})</span>
                            </div>
                        </div>
                    `;
                });
            }

            const firstAgent = onlineAgents[0];
            const defaultText = firstAgent ? `${firstAgent.username} (${(firstAgent.department_level || 'L1').toUpperCase()})` : (__('lbl_select_agent') || 'Seleccionar agente');
            const defaultValue = firstAgent ? firstAgent.id : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">swap_horiz</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_reassign_chat_title') || 'Reasignar Conversación'}</h2>
                        <p class="component-modal-desc">${__('modal_reassign_chat_desc') || 'Transfiere esta conversación activa a otro agente de soporte en línea.'}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-reassign-form" data-session-uuid="${sessionUuid}">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_select_agent') || 'Agente de Destino'}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownReassignAgent">
                                    <span class="material-symbols-rounded">support_agent</span>
                                    <span class="component-dropdown-text" data-ref="reassign-agent-text" data-value="${defaultValue}">${defaultText}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownReassignAgent">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            ${agentsHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark ${onlineAgents.length === 0 ? 'disabled-interaction' : ''}" data-action="submitReassignChat">${__('btn_confirm_reassign') || 'Confirmar Transferencia'}</button>
                </div>
            `;
        }
    },
    cannedResponseModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const item = data.item || {};

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">quickreply</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${item.uuid ? __('modal_edit_canned_title') : __('modal_create_canned_title')}</h2>
                        <p class="component-modal-desc">${__('modal_canned_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-canned-form" data-uuid="${item.uuid || ''}">
                    <div class="component-group-item component-group-item--stacked component-mb-3">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_canned_shortcut')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-input-group component-input-group--h34">
                                <input class="component-input-field component-input-field--simple" data-ref="canned-shortcut-input" type="text" placeholder="${__('placeholder_canned_shortcut')}" value="${item.shortcut || ''}" maxlength="50" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked component-mb-3">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_canned_title')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-input-group component-input-group--h34">
                                <input class="component-input-field component-input-field--simple" data-ref="canned-title-input" type="text" placeholder="${__('placeholder_canned_title')}" value="${item.title || ''}" maxlength="100" autocomplete="off">
                            </div>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked component-mb-3">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_canned_content')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <textarea class="component-input-field" data-ref="canned-content-input" placeholder="${__('placeholder_canned_content')}" rows="4" maxlength="3000">${item.content || ''}</textarea>
                        </div>
                    </div>

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <span class="component-stat-card__title">${__('lbl_min_level_allowed')}</span>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--stretch">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCannedLevel">
                                    <span class="component-dropdown-text" data-ref="canned-level-text" data-value="${item.min_level || 'l1'}">${item.min_level === 'l3' ? __('lbl_dept_l3') : (item.min_level === 'l2' ? __('lbl_dept_l2') : __('lbl_dept_l1'))}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownCannedLevel">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link ${(!item.min_level || item.min_level === 'l1') ? 'active' : ''}" data-action="selectCannedLevel" data-val="l1">
                                                <div class="component-menu-link-text"><span>${__('lbl_dept_l1')}</span></div>
                                            </div>
                                            <div class="component-menu-link ${item.min_level === 'l2' ? 'active' : ''}" data-action="selectCannedLevel" data-val="l2">
                                                <div class="component-menu-link-text"><span>${__('lbl_dept_l2')}</span></div>
                                            </div>
                                            <div class="component-menu-link ${item.min_level === 'l3' ? 'active' : ''}" data-action="selectCannedLevel" data-val="l3">
                                                <div class="component-menu-link-text"><span>${__('lbl_dept_l3')}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="submitCannedForm">${__('btn_save')}</button>
                </div>
            `;
        }
    }
};

