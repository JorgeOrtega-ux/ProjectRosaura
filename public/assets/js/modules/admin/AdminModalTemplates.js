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
            const currentLevel = (data.currentLevel || 'l1').toLowerCase();

            const isL2 = currentLevel === 'l2';
            const defaultTargetLevel = isL2 ? 'l3' : 'l2';
            const defaultTargetText = isL2 ? __('lbl_dept_l3') : __('lbl_dept_l2');

            const levelsListHtml = isL2 ? `
                <div class="component-menu-link active" data-action="selectEscalateLevel" data-val="l3">
                    <div class="component-menu-link-text"><span>${__('lbl_dept_l3')}</span></div>
                </div>
            ` : `
                <div class="component-menu-link active" data-action="selectEscalateLevel" data-val="l2">
                    <div class="component-menu-link-text"><span>${__('lbl_dept_l2')}</span></div>
                </div>
                <div class="component-menu-link" data-action="selectEscalateLevel" data-val="l3">
                    <div class="component-menu-link-text"><span>${__('lbl_dept_l3')}</span></div>
                </div>
            `;

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
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_escalate_to_level')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEscalateLevel">
                                <span class="material-symbols-rounded">arrow_upward</span>
                                <span class="component-dropdown-text" data-ref="escalate-level-text" data-value="${defaultTargetLevel}">${defaultTargetText}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownEscalateLevel">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        ${levelsListHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-input-group">
                        <input class="component-input-field" data-ref="escalate-reason-input" type="text" placeholder=" " maxlength="255" autocomplete="off" required>
                        <label class="component-input-label">${__('lbl_escalation_reason')}</label>
                    </div>

                    <div class="component-input-group">
                        <textarea class="component-input-field" data-ref="escalate-note-input" placeholder=" " rows="3" maxlength="1500"></textarea>
                        <label class="component-input-label">${__('lbl_internal_note_next_agent')}</label>
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
                    <div class="component-input-group">
                        <textarea class="component-input-field" data-ref="close-chat-summary-input" placeholder=" " rows="3" maxlength="2000"></textarea>
                        <label class="component-input-label">${__('lbl_resolution_summary')}</label>
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
                        <p class="component-empty-state-text">${__('lbl_no_agents_to_reassign')}</p>
                    </div>
                `;
            } else {
                onlineAgents.forEach((agent, index) => {
                    const activeClass = index === 0 ? 'active' : '';
                    const agentId = agent.agent_id || agent.id || '';
                    const levelStr = (agent.level || agent.department_level || 'l1').toUpperCase();
                    agentsHtml += `
                        <div class="component-menu-link ${activeClass}" data-action="selectReassignAgent" data-val="${agentId}">
                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">support_agent</span></div>
                            <div class="component-menu-link-text">
                                <span>${agent.username} (${levelStr})</span>
                            </div>
                        </div>
                    `;
                });
            }

            const firstAgent = onlineAgents[0];
            const firstAgentLevel = firstAgent ? (firstAgent.level || firstAgent.department_level || 'l1').toUpperCase() : '';
            const defaultText = firstAgent ? `${firstAgent.username} (${firstAgentLevel})` : __('lbl_select_agent');
            const defaultValue = firstAgent ? (firstAgent.agent_id || firstAgent.id || '') : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">swap_horiz</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_reassign_chat_title')}</h2>
                        <p class="component-modal-desc">${__('modal_reassign_chat_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-reassign-form" data-session-uuid="${sessionUuid}">
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_select_agent')}</label>
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

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark ${onlineAgents.length === 0 ? 'disabled-interaction' : ''}" data-action="submitReassignChat">${__('btn_confirm_reassign')}</button>
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
                    <div class="component-input-group">
                        <input class="component-input-field" data-ref="canned-shortcut-input" type="text" placeholder=" " value="${item.shortcut || ''}" maxlength="50" autocomplete="off" required>
                        <label class="component-input-label">${__('lbl_canned_shortcut')}</label>
                    </div>

                    <div class="component-input-group">
                        <input class="component-input-field" data-ref="canned-title-input" type="text" placeholder=" " value="${item.title || ''}" maxlength="100" autocomplete="off" required>
                        <label class="component-input-label">${__('lbl_canned_title')}</label>
                    </div>

                    <div class="component-input-group">
                        <textarea class="component-input-field" data-ref="canned-content-input" placeholder=" " rows="4" maxlength="3000" required>${item.content || ''}</textarea>
                        <label class="component-input-label">${__('lbl_canned_content')}</label>
                    </div>

                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_min_level_allowed')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCannedLevel">
                                <span class="material-symbols-rounded">admin_panel_settings</span>
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

                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_language')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCannedLang">
                                <span class="material-symbols-rounded">translate</span>
                                <span class="component-dropdown-text" data-ref="canned-lang-text" data-value="${item.language || 'es-419'}">${
                                    item.language === 'en-GB' ? 'English (United Kingdom)' :
                                    item.language === 'en-US' ? 'English (United States)' :
                                    item.language === 'en' ? 'English (United States)' :
                                    item.language === 'fr-FR' ? 'Français (France)' :
                                    item.language === 'de-DE' ? 'Deutsch (Deutschland)' :
                                    item.language === 'it-IT' ? 'Italiano (Italia)' :
                                    item.language === 'es-MX' ? 'Español (México)' :
                                    item.language === 'es-ES' ? 'Español (España)' :
                                    item.language === 'pt-BR' ? 'Português (Brasil)' :
                                    item.language === 'pt-PT' ? 'Português (Portugal)' :
                                    'Español (Latinoamérica)'
                                }</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownCannedLang">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link ${(!item.language || item.language === 'es-419') ? 'active' : ''}" data-action="selectCannedLang" data-val="es-419">
                                            <div class="component-menu-link-text"><span>Español (Latinoamérica)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'es-MX' ? 'active' : ''}" data-action="selectCannedLang" data-val="es-MX">
                                            <div class="component-menu-link-text"><span>Español (México)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'es-ES' ? 'active' : ''}" data-action="selectCannedLang" data-val="es-ES">
                                            <div class="component-menu-link-text"><span>Español (España)</span></div>
                                        </div>
                                        <div class="component-menu-link ${(item.language === 'en-US' || item.language === 'en') ? 'active' : ''}" data-action="selectCannedLang" data-val="en-US">
                                            <div class="component-menu-link-text"><span>English (United States)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'en-GB' ? 'active' : ''}" data-action="selectCannedLang" data-val="en-GB">
                                            <div class="component-menu-link-text"><span>English (United Kingdom)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'fr-FR' ? 'active' : ''}" data-action="selectCannedLang" data-val="fr-FR">
                                            <div class="component-menu-link-text"><span>Français (France)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'de-DE' ? 'active' : ''}" data-action="selectCannedLang" data-val="de-DE">
                                            <div class="component-menu-link-text"><span>Deutsch (Deutschland)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'it-IT' ? 'active' : ''}" data-action="selectCannedLang" data-val="it-IT">
                                            <div class="component-menu-link-text"><span>Italiano (Italia)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'pt-BR' ? 'active' : ''}" data-action="selectCannedLang" data-val="pt-BR">
                                            <div class="component-menu-link-text"><span>Português (Brasil)</span></div>
                                        </div>
                                        <div class="component-menu-link ${item.language === 'pt-PT' ? 'active' : ''}" data-action="selectCannedLang" data-val="pt-PT">
                                            <div class="component-menu-link-text"><span>Português (Portugal)</span></div>
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

