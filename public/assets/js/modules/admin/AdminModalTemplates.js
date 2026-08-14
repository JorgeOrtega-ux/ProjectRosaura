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
                <div class="component-modal-header">
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
                <div class="component-modal-header">
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
                <div class="component-modal-header">
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
                <div class="component-modal-header">
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
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="dropdownAdjustCoinsReason">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_comp', [], 'Compensación por incidencia')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_bonus', [], 'Bonificación / Cortesía')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_bonus', [], 'Bonificación / Cortesía')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_refund', [], 'Reembolso de compra')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_refund', [], 'Reembolso de compra')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_promo', [], 'Premio / Evento especial')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_promo', [], 'Premio / Evento especial')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_adjust', [], 'Corrección de saldo')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_adjust', [], 'Corrección de saldo')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_penalty', [], 'Deducción por infracción')}">
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_penalty', [], 'Deducción por infracción')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_other', [], 'Otro motivo administrativo')}">
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
    viewIssueModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const category = data.category || 'general';
            const subject = data.subject || __('lbl_no_subject', [], 'Sin asunto');
            const description = data.description || __('lbl_no_description', [], 'Sin descripción');
            const time = data.time || '';
            const priority = data.priority || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_view_issue', [], 'Detalles del Problema')}</h2>
                        <p class="component-modal-desc">${__('lbl_view_issue_desc', [], 'Información inicial registrada al abrir la sesión de soporte.')}</p>
                    </div>
                </div>

                <div class="component-modal-body">
                    <div class="component-badge-group component-mb-2">
                        <span class="component-badge component-badge--sm">${category}</span>
                        ${priority ? `<span class="component-badge component-badge--sm">${priority}</span>` : ''}
                        ${time ? `<span class="component-badge component-badge--sm">${time}</span>` : ''}
                    </div>
                    <h3 class="component-card__title component-mb-1">${subject}</h3>
                    <p class="component-card__description">${description}</p>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40 component-button--dark" data-modal-action="cancel">${__('btn_close', [], 'Cerrar')}</button>
                </div>
            `;
        }
    },
    confirmSupportActionModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const title = data.title || __('title_confirm_action', [], 'Confirmar Acción');
            const desc = data.desc || '';
            const confirmText = data.confirmText || __('btn_confirm', [], 'Confirmar');
            const confirmClass = data.confirmClass || 'component-button--dark';
            const actionTarget = data.actionTarget || 'submitConfirmSupportAction';
            const userUuid = data.userUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc">${desc}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-confirm-support-action-body" data-user-uuid="${userUuid}" data-action-type="${data.actionType || ''}" style="display:none;"></div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [], 'Cancelar')}</button>
                    <button class="component-button component-button--h40 ${confirmClass}" data-action="${actionTarget}">${confirmText}</button>
                </div>
            `;
        }
    },
    supportSuspendUserModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const userUuid = data.userUuid || '';
            const username = data.username || 'User';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_suspend_user_title', [], 'Suspender Cuenta de Usuario')}</h2>
                        <p class="component-modal-desc">${__('lbl_suspend_user_desc', [], 'Aplica una restricción a')} <b>${username}</b>. ${__('lbl_action_audited', [], 'Quedará registrada en auditoría.')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-suspend-user-form" data-user-uuid="${userUuid}">
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_suspension_type', [], 'Tipo de Suspensión')}</label>
                        <div class="component-input-wrapper">
                            <select class="component-input component-select" name="suspension_type" data-ref="suspension-type-select">
                                <option value="permanent">${__('lbl_suspension_perm', [], 'Permanente')}</option>
                                <option value="temporary">${__('lbl_suspension_temp', [], 'Temporal (1 día)')}</option>
                                <option value="temporary_3d">${__('lbl_suspension_temp_3d', [], 'Temporal (3 días)')}</option>
                                <option value="temporary_7d">${__('lbl_suspension_temp_7d', [], 'Temporal (7 días)')}</option>
                                <option value="temporary_30d">${__('lbl_suspension_temp_30d', [], 'Temporal (30 días)')}</option>
                            </select>
                        </div>
                    </div>

                    <div class="component-input-group">
                        <textarea class="component-input-field" name="reason" placeholder=" " rows="3" required></textarea>
                        <label class="component-input-label">${__('lbl_suspension_reason', [], 'Motivo de la Suspensión')}</label>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [], 'Cancelar')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-action="submitSuspendUserModal">${__('btn_suspend_user', [], 'Suspender Cuenta')}</button>
                </div>
            `;
        }
    }
};
