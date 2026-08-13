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
    }
};
