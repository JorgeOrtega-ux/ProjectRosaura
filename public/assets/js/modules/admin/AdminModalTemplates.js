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
                        <h2 class="component-modal-title">${__('lbl_adjust_coins_title')}</h2>
                        <p class="component-modal-desc">${__('lbl_adjust_coins_desc', { username })} <b>${username}</b>.</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-adjust-coins-form" data-user-uuid="${userUuid}">
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_coins_amount')}</label>
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
                        <label class="component-input-label component-input-label--static">${__('lbl_reason')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownAdjustCoinsReason">
                                <span class="material-symbols-rounded">category</span>
                                <span class="component-dropdown-text" data-ref="adjust-coins-reason-text" data-value="${__('lbl_coin_reason_comp')}">${__('lbl_coin_reason_comp')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownAdjustCoinsReason">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_comp')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">build</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_comp')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_bonus')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">featured_seasonal_and_gifts</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_bonus')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_refund')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">currency_exchange</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_refund')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_promo')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">celebration</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_promo')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_adjust')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">tune</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_adjust')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_penalty')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_penalty')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectCoinsReason" data-val="${__('lbl_coin_reason_other')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">more_horiz</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_coin_reason_other')}</span></div>
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
                        <h2 class="component-modal-title">${__('lbl_disable_2fa_title')}</h2>
                        <p class="component-modal-desc">${__('lbl_disable_2fa_desc')} <b>${username}</b>. ${__('lbl_action_audited')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="admin-disable-2fa-form" data-user-uuid="${userUuid}">
                    <div class="component-input-group">
                        <textarea class="component-input-field" name="reason" placeholder=" " rows="3" required></textarea>
                        <label class="component-input-label">${__('lbl_audit_reason')}</label>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="${data.actionTarget || 'submitDisable2FA'}">${__('btn_disable_2fa')}</button>
                </div>
            `;
        }
    },
    confirmUserAdminActionModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const title = data.title || __('title_confirm_action');
            const desc = data.desc || '';
            const confirmText = data.confirmText || __('btn_confirm');
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

                <div class="component-modal-body disabled" data-ref="admin-confirm-user-admin-action-body" data-user-uuid="${userUuid}" data-action-type="${data.actionType || ''}"></div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 ${confirmClass}" data-action="${actionTarget}">${confirmText}</button>
                </div>
            `;
        }
    },
    createProviderModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_create_provider_title')}</h2>
                        <p class="component-modal-desc" data-ref="provider-step-desc">${__('step_provider_details_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="create-provider-form">
                    <!-- ETAPA 1: Identificación y Tipo de Proveedor -->
                    <div class="step-modal-step active" data-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCreateProviderType">
                                <span class="material-symbols-rounded" data-ref="create-provider-type-icon">hub</span>
                                <span class="component-dropdown-text" data-ref="create-provider-type-text" data-value="network">${__('admin_ad_type_network')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownCreateProviderType">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectProviderType" data-type="network" data-label="${__('admin_ad_type_network')}" data-icon="hub">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">hub</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_network')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectProviderType" data-type="direct" data-label="${__('admin_ad_type_direct')}" data-icon="corporate_fare">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">corporate_fare</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_direct')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-input-group">
                                <input type="text" class="component-input-field" data-ref="input-provider-name" placeholder=" " value="Google AdSense" required>
                                <label class="component-input-label" data-ref="label-provider-name">${__('lbl_network_name')}</label>
                            </div>
                            <div class="component-input-group" data-ref="group-network-id">
                                <input type="text" class="component-input-field" data-ref="input-network-id" placeholder=" " value="">
                                <label class="component-input-label">${__('lbl_network_id')}</label>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Vigencia y Expiración -->
                    <div class="step-modal-step disabled" data-step="2">
                        <!-- Primer Trigger: Elegir si tiene vencimiento -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCreateProviderExp">
                                <span class="material-symbols-rounded" data-ref="create-provider-exp-icon">all_inclusive</span>
                                <span class="component-dropdown-text" data-ref="create-provider-exp-text" data-value="0">${__('lbl_no_expiration')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownCreateProviderExp">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectExpirationType" data-expiration="0" data-label="${__('lbl_no_expiration')}" data-icon="all_inclusive">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">all_inclusive</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_no_expiration')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectExpirationType" data-expiration="1" data-label="${__('lbl_with_expiration')}" data-icon="event">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">event</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_with_expiration')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Segundo Trigger: Activa moduleCalendar / calendarModal -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full disabled" data-ref="create-calendar-picker-group">
                            <div class="component-dropdown-trigger" data-action="openProviderCalendarPicker" data-ref="create-provider-expiration-trigger" data-value="">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="create-provider-expiration-text">${__('lbl_select_expiration_date')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="providerPrevStep" data-ref="btn-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="providerNextStep" data-ref="btn-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitCreateProvider" data-ref="btn-modal-finish">${__('btn_create_provider')}</button>
                </div>
            `;
        }
    },
    editProviderModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const provider = data.provider || {};
            const isNetwork = provider.provider_type === 'network';
            const hasExp = parseInt(provider.has_expiration, 10) === 1;
            const expDate = provider.expiration_date || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_edit_provider_title')}</h2>
                        <p class="component-modal-desc" data-ref="edit-provider-step-desc">${__('step_provider_details_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="edit-provider-form" data-uuid="${provider.uuid || ''}" data-type="${provider.provider_type || 'direct'}">
                    <!-- ETAPA 1: Identificación y Tipo de Proveedor -->
                    <div class="step-modal-step active" data-edit-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditProviderType">
                                <span class="material-symbols-rounded" data-ref="edit-provider-type-icon">${isNetwork ? 'hub' : 'corporate_fare'}</span>
                                <span class="component-dropdown-text" data-ref="edit-provider-type-text" data-value="${provider.provider_type || 'direct'}">${isNetwork ? __('admin_ad_type_network') : __('admin_ad_type_direct')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownEditProviderType">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${isNetwork ? 'active' : ''}" data-action="selectEditProviderType" data-type="network" data-label="${__('admin_ad_type_network')}" data-icon="hub">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">hub</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_network')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${!isNetwork ? 'active' : ''}" data-action="selectEditProviderType" data-type="direct" data-label="${__('admin_ad_type_direct')}" data-icon="corporate_fare">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">corporate_fare</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_direct')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped">
                            <div class="component-input-group">
                                <input type="text" class="component-input-field" data-ref="edit-provider-name" placeholder=" " value="${provider.name || ''}" required>
                                <label class="component-input-label" data-ref="edit-label-provider-name">${isNetwork ? __('lbl_network_name') : __('lbl_advertiser_name')}</label>
                            </div>
                            <div class="component-input-group ${isNetwork ? '' : 'disabled'}" data-ref="edit-group-network-id">
                                <input type="text" class="component-input-field" data-ref="edit-network-id" placeholder=" " value="${provider.network_id || ''}">
                                <label class="component-input-label">${__('lbl_network_id')}</label>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Vigencia y Expiración -->
                    <div class="step-modal-step disabled" data-edit-step="2">
                        <!-- Primer Trigger: Elegir si tiene vencimiento -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditProviderExp">
                                <span class="material-symbols-rounded" data-ref="edit-provider-exp-icon">${hasExp ? 'event' : 'all_inclusive'}</span>
                                <span class="component-dropdown-text" data-ref="edit-provider-exp-text" data-value="${hasExp ? '1' : '0'}">${hasExp ? __('lbl_with_expiration') : __('lbl_no_expiration')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownEditProviderExp">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${!hasExp ? 'active' : ''}" data-action="selectEditExpirationType" data-expiration="0" data-label="${__('lbl_no_expiration')}" data-icon="all_inclusive">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">all_inclusive</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_no_expiration')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${hasExp ? 'active' : ''}" data-action="selectEditExpirationType" data-expiration="1" data-label="${__('lbl_with_expiration')}" data-icon="event">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">event</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_with_expiration')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Segundo Trigger: Activa moduleCalendar / calendarModal -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full ${hasExp ? '' : 'disabled'}" data-ref="edit-calendar-picker-group">
                            <div class="component-dropdown-trigger" data-action="openProviderCalendarPicker" data-ref="edit-provider-expiration-trigger" data-value="${expDate}">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="edit-provider-expiration-text">${expDate ? expDate.split(' ')[0] : __('lbl_select_expiration_date')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-edit-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="editProviderPrevStep" data-ref="btn-edit-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="editProviderNextStep" data-ref="btn-edit-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitEditProvider" data-ref="btn-edit-modal-finish">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    },
    manageProviderAdsModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const provider = data.provider || {};
            const isNetwork = provider.provider_type === 'network';
            const ads = data.ads || [];

            const adsHtml = ads.length > 0 ? ads.map(ad => {
                const isActive = ad.status === 'active';
                const resources = ad.resources || [];
                const resCount = resources.length;
                const formatLabel = __('admin_ad_format_' + ad.format);
                const subText = isNetwork ? __('lbl_network_slot') : `${resCount} ${__('lbl_resources_count')}`;

                return `
                    <div class="component-group-item" data-ad-uuid="${ad.uuid}">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">${ad.format === 'feed' ? 'view_carousel' : (isNetwork ? 'hub' : 'widgets')}</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">${ad.title || ad.name}</h2>
                                <p class="component-card__description">${formatLabel} &bull; ${subText}</p>
                            </div>
                        </div>
                        <div class="component-card__actions">
                            <button class="component-button component-button--icon component-button--h34 ${isActive ? 'component-button--success' : ''}" data-action="toggleAdStatus" data-ad-uuid="${ad.uuid}" data-tooltip="${__('btn_toggle_status')}">
                                <span class="material-symbols-rounded">${isActive ? 'check_circle' : 'cancel'}</span>
                            </button>
                            <button class="component-button component-button--icon component-button--h34 component-button--danger" data-action="deleteAd" data-ad-uuid="${ad.uuid}" data-tooltip="${__('btn_delete')}">
                                <span class="material-symbols-rounded">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('') : `
                <div class="component-empty-state component-empty-state--compact">
                    <span class="material-symbols-rounded component-empty-state-icon">${isNetwork ? 'hub' : 'ad_units'}</span>
                    <p class="component-empty-state-text">${__('admin_no_ads_in_provider')}</p>
                </div>
            `;

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_manage_ads_title')}</h2>
                        <p class="component-modal-desc">${__('modal_manage_ads_desc')} <b>${provider.name || ''}</b>.</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="manage-ads-body" data-provider-uuid="${provider.uuid || ''}" data-provider-type="${provider.provider_type || 'direct'}">
                    <div class="component-actions-bar">
                        <button class="component-button component-button--h34 component-button--dark" data-action="${isNetwork ? 'openCreateNetworkSlotModal' : 'openCreateAdModal'}" data-provider-uuid="${provider.uuid || ''}">
                            <span class="material-symbols-rounded">add</span>
                            <span>${isNetwork ? __('btn_new_network_slot') : __('btn_new_ad')}</span>
                        </button>
                    </div>

                    <div class="component-card--grouped" data-ref="ads-list-container">
                        ${adsHtml}
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_close')}</button>
                </div>
            `;
        }
    },
    createNetworkSlotModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const providerUuid = data.providerUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_create_network_slot_title')}</h2>
                        <p class="component-modal-desc" data-ref="slot-step-desc">${__('step_network_slot_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="create-network-slot-form" data-provider-uuid="${providerUuid}">
                    <!-- ETAPA 1: Formato y Ubicación (Dropdown Trigger) -->
                    <div class="step-modal-step active" data-slot-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCreateSlotFormat">
                                <span class="material-symbols-rounded" data-ref="create-slot-format-icon">grid_view</span>
                                <span class="component-dropdown-text" data-ref="create-slot-format-text" data-value="feed">${__('admin_ad_format_feed')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownCreateSlotFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectSlotFormat" data-format="feed" data-label="${__('admin_ad_format_feed')}" data-icon="grid_view">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_view</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_feed')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectSlotFormat" data-format="modules" data-label="${__('admin_ad_format_modules')}" data-icon="palette">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_modules')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Nombre del Bloque -->
                    <div class="step-modal-step disabled" data-slot-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-name" type="text" placeholder=" " value="" required>
                            <label class="component-input-label">${__('lbl_slot_name')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 3: ID del Bloque / Slot ID -->
                    <div class="step-modal-step disabled" data-slot-step="3">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-id" type="text" placeholder=" " value="">
                            <label class="component-input-label">${__('lbl_slot_id')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 4: Código de Script -->
                    <div class="step-modal-step disabled" data-slot-step="4">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="slot-code" placeholder=" " rows="4"></textarea>
                            <label class="component-input-label">${__('lbl_slot_code')}</label>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-slot-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="slotPrevStep" data-ref="btn-slot-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="slotNextStep" data-ref="btn-slot-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitCreateNetworkSlot" data-ref="btn-slot-modal-finish">${__('btn_save_slot')}</button>
                </div>
            `;
        }
    },
    createAdModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const providerUuid = data.providerUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_create_ad_title')}</h2>
                        <p class="component-modal-desc" data-ref="ad-step-desc">${__('step_ad_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="create-ad-form" data-provider-uuid="${providerUuid}">
                    <!-- ETAPA 1: Formato y Ubicación (Dropdown Trigger) -->
                    <div class="step-modal-step active" data-ad-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCreateAdFormat">
                                <span class="material-symbols-rounded" data-ref="create-ad-format-icon">view_carousel</span>
                                <span class="component-dropdown-text" data-ref="create-ad-format-text" data-value="feed">${__('admin_ad_format_feed')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownCreateAdFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectAdFormat" data-format="feed" data-label="${__('admin_ad_format_feed')}" data-icon="view_carousel">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">view_carousel</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_feed')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectAdFormat" data-format="module_colors" data-label="${__('admin_ad_format_module_colors')}" data-icon="palette">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_colors')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectAdFormat" data-format="module_templates" data-label="${__('admin_ad_format_module_templates')}" data-icon="dashboard_customize">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">dashboard_customize</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_templates')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectAdFormat" data-format="module_info" data-label="${__('admin_ad_format_module_info')}" data-icon="info">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">info</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_info')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectAdFormat" data-format="banner" data-label="${__('admin_ad_format_banner')}" data-icon="ad_units">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">ad_units</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_banner')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Título y Nombre del Anuncio -->
                    <div class="step-modal-step disabled" data-ad-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="ad-name" type="text" placeholder=" " required>
                            <label class="component-input-label">${__('lbl_ad_title')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 3: Descripción del Anuncio -->
                    <div class="step-modal-step disabled" data-ad-step="3">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="ad-description" placeholder=" " rows="4"></textarea>
                            <label class="component-input-label">${__('lbl_ad_description')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 4: Enlace de Destino y Patrocinador -->
                    <div class="step-modal-step disabled" data-ad-step="4">
                        <div class="component-card--grouped">
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="ad-target-url" type="text" placeholder=" " value="/upgrade" required>
                                <label class="component-input-label">${__('lbl_ad_target_url')}</label>
                            </div>
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="ad-sponsor-label" type="text" placeholder=" ">
                                <label class="component-input-label">${__('lbl_ad_sponsor_label')}</label>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 5: Creativos Multimedia (Multi-Recurso URLs) -->
                    <div class="step-modal-step disabled" data-ad-step="5">
                        <div class="component-card--grouped" data-ref="resources-builder-container">
                            <div class="component-resource-row" data-index="0">
                                <div class="component-input-group">
                                    <input class="component-input-field" data-ref="res-url-0" type="text" placeholder=" " value="/assets/img/showcase/creative_tools.jpg" required>
                                    <label class="component-input-label">${__('lbl_resource_url')}</label>
                                </div>
                            </div>
                        </div>

                        <div class="component-actions-bar">
                            <button class="component-button component-button--h34" data-action="addResourceRow" type="button">
                                <span class="material-symbols-rounded">add</span>
                                <span>${__('btn_add_resource')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-ad-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="adPrevStep" data-ref="btn-ad-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="adNextStep" data-ref="btn-ad-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitCreateAd" data-ref="btn-ad-modal-finish">${__('btn_save_ad')}</button>
                </div>
            `;
        }
    },
    confirmDeleteProviderModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const providerName = data.providerName || __('unknown_provider');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_delete_provider_title')}</h2>
                        <p class="component-modal-desc">${__('modal_delete_provider_desc')} <b>${providerName}</b>. ${__('modal_delete_provider_warning')}</p>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete')}</button>
                </div>
            `;
        }
    },
    editAdModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const ad = data.ad || {};
            const resources = data.resources || ad.resources || [];
            const adFormat = ad.format || 'feed';

            let formatIcon = 'view_carousel';
            let formatLabel = __('admin_ad_format_feed');
            if (adFormat === 'module_colors') {
                formatIcon = 'palette';
                formatLabel = __('admin_ad_format_module_colors');
            } else if (adFormat === 'module_templates') {
                formatIcon = 'dashboard_customize';
                formatLabel = __('admin_ad_format_module_templates');
            } else if (adFormat === 'module_info') {
                formatIcon = 'info';
                formatLabel = __('admin_ad_format_module_info');
            } else if (adFormat === 'banner') {
                formatIcon = 'ad_units';
                formatLabel = __('admin_ad_format_banner');
            }

            const resourcesHtml = resources.length > 0 ? resources.map((res, idx) => `
                <div class="component-resource-row" data-index="${idx}">
                    <div class="component-input-group">
                        <input class="component-input-field" data-ref="res-url-${idx}" type="text" placeholder=" " value="${res.content_url || ''}" required>
                        <label class="component-input-label">${__('lbl_resource_url')}</label>
                    </div>
                    ${idx > 0 ? `
                    <button class="component-button component-button--icon component-button--h34 component-button--danger" data-action="removeResourceRow" data-index="${idx}" type="button">
                        <span class="material-symbols-rounded">delete</span>
                    </button>` : ''}
                </div>
            `).join('') : `
                <div class="component-resource-row" data-index="0">
                    <div class="component-input-group">
                        <input class="component-input-field" data-ref="res-url-0" type="text" placeholder=" " value="/assets/img/showcase/creative_tools.jpg" required>
                        <label class="component-input-label">${__('lbl_resource_url')}</label>
                    </div>
                </div>
            `;

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_edit_ad_title')}</h2>
                        <p class="component-modal-desc" data-ref="ad-step-desc">${__('step_ad_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="edit-ad-form" data-ad-uuid="${ad.uuid || ''}">
                    <!-- ETAPA 1: Formato y Ubicación (Dropdown Trigger) -->
                    <div class="step-modal-step active" data-ad-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditAdFormat">
                                <span class="material-symbols-rounded" data-ref="create-ad-format-icon">${formatIcon}</span>
                                <span class="component-dropdown-text" data-ref="create-ad-format-text" data-value="${adFormat}">${formatLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownEditAdFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${adFormat === 'feed' ? 'active' : ''}" data-action="selectAdFormat" data-format="feed" data-label="${__('admin_ad_format_feed')}" data-icon="view_carousel">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">view_carousel</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_feed')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${adFormat === 'module_colors' ? 'active' : ''}" data-action="selectAdFormat" data-format="module_colors" data-label="${__('admin_ad_format_module_colors')}" data-icon="palette">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_colors')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${adFormat === 'module_templates' ? 'active' : ''}" data-action="selectAdFormat" data-format="module_templates" data-label="${__('admin_ad_format_module_templates')}" data-icon="dashboard_customize">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">dashboard_customize</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_templates')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${adFormat === 'module_info' ? 'active' : ''}" data-action="selectAdFormat" data-format="module_info" data-label="${__('admin_ad_format_module_info')}" data-icon="info">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">info</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_info')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${adFormat === 'banner' ? 'active' : ''}" data-action="selectAdFormat" data-format="banner" data-label="${__('admin_ad_format_banner')}" data-icon="ad_units">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">ad_units</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_banner')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Título y Nombre del Anuncio -->
                    <div class="step-modal-step disabled" data-ad-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="ad-name" type="text" placeholder=" " value="${ad.name || ad.title || ''}" required>
                            <label class="component-input-label">${__('lbl_ad_title')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 3: Descripción del Anuncio -->
                    <div class="step-modal-step disabled" data-ad-step="3">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="ad-description" placeholder=" " rows="4">${ad.description || ''}</textarea>
                            <label class="component-input-label">${__('lbl_ad_description')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 4: Enlace de Destino y Patrocinador -->
                    <div class="step-modal-step disabled" data-ad-step="4">
                        <div class="component-card--grouped">
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="ad-target-url" type="text" placeholder=" " value="${ad.target_url || '/upgrade'}" required>
                                <label class="component-input-label">${__('lbl_ad_target_url')}</label>
                            </div>
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="ad-sponsor-label" type="text" placeholder=" " value="${ad.sponsor_label || ''}">
                                <label class="component-input-label">${__('lbl_ad_sponsor_label')}</label>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 5: Creativos Multimedia (Multi-Recurso URLs) -->
                    <div class="step-modal-step disabled" data-ad-step="5">
                        <div class="component-card--grouped" data-ref="resources-builder-container">
                            ${resourcesHtml}
                        </div>

                        <div class="component-actions-bar">
                            <button class="component-button component-button--h34" data-action="addResourceRow" type="button">
                                <span class="material-symbols-rounded">add</span>
                                <span>${__('btn_add_resource')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-ad-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="adPrevStep" data-ref="btn-ad-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="adNextStep" data-ref="btn-ad-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitEditAd" data-ref="btn-ad-modal-finish">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    },
    editNetworkSlotModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const ad = data.ad || {};
            const resources = data.resources || ad.resources || [];
            const scriptRes = resources.find(r => r.resource_type === 'script') || resources[0] || {};
            const slotFormat = ad.format || 'feed';

            let formatIcon = 'grid_view';
            let formatLabel = __('admin_ad_format_feed');
            if (slotFormat === 'modules') {
                formatIcon = 'palette';
                formatLabel = __('admin_ad_format_modules');
            }

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_edit_network_slot_title')}</h2>
                        <p class="component-modal-desc" data-ref="slot-step-desc">${__('step_network_slot_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="edit-network-slot-form" data-ad-uuid="${ad.uuid || ''}">
                    <!-- ETAPA 1: Formato y Ubicación (Dropdown Trigger) -->
                    <div class="step-modal-step active" data-slot-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditSlotFormat">
                                <span class="material-symbols-rounded" data-ref="create-slot-format-icon">${formatIcon}</span>
                                <span class="component-dropdown-text" data-ref="create-slot-format-text" data-value="${slotFormat}">${formatLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownEditSlotFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${slotFormat === 'feed' ? 'active' : ''}" data-action="selectSlotFormat" data-format="feed" data-label="${__('admin_ad_format_feed')}" data-icon="grid_view">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_view</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_feed')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${slotFormat === 'modules' ? 'active' : ''}" data-action="selectSlotFormat" data-format="modules" data-label="${__('admin_ad_format_modules')}" data-icon="palette">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_modules')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ETAPA 2: Nombre del Bloque -->
                    <div class="step-modal-step disabled" data-slot-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-name" type="text" placeholder=" " value="${ad.name || ad.title || ''}" required>
                            <label class="component-input-label">${__('lbl_slot_name')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 3: ID del Bloque / Slot ID -->
                    <div class="step-modal-step disabled" data-slot-step="3">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-id" type="text" placeholder=" " value="${scriptRes.content_url || ''}">
                            <label class="component-input-label">${__('lbl_slot_id')}</label>
                        </div>
                    </div>

                    <!-- ETAPA 4: Código de Script -->
                    <div class="step-modal-step disabled" data-slot-step="4">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="slot-code" placeholder=" " rows="4">${scriptRes.raw_content || ''}</textarea>
                            <label class="component-input-label">${__('lbl_slot_code')}</label>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-slot-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="slotPrevStep" data-ref="btn-slot-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--h40 component-button--dark" data-action="slotNextStep" data-ref="btn-slot-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--h40 component-button--dark disabled" data-action="submitEditNetworkSlot" data-ref="btn-slot-modal-finish">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    },
    confirmDeleteAdModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const adName = data.adName || __('unknown_ad');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_delete_ad_title')}</h2>
                        <p class="component-modal-desc">${__('modal_delete_ad_desc')} <b>${adName}</b>. ${__('modal_delete_ad_warning')}</p>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete')}</button>
                </div>
            `;
        }
    }
};

