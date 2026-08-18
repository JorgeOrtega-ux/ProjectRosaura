import { ADVERTISEMENT_FORMATS } from '../../core/constants/AdvertisementConstants.js';

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
                    <button class="component-button component-button--primary component-button--h40" data-action="submitMultipleRolesUpdate">${__('btn_save_changes')}</button>
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
                    <button class="component-button component-button--primary component-button--h40" data-action="${data.actionTarget || 'submitDisable2FA'}">${__('btn_disable_2fa')}</button>
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
            const confirmClass = data.confirmClass || 'component-button--primary';
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
    providerModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const provider = data.provider || null;
            const isEdit = !!provider;
            const providerType = provider ? (provider.provider_type || 'direct') : 'network';
            const isNetwork = providerType === 'network';
            const hasExp = provider ? (parseInt(provider.has_expiration, 10) === 1) : false;
            const expDate = provider ? (provider.expiration_date || '') : '';
            const providerName = provider ? (provider.name || '') : (isEdit ? '' : 'Google AdSense');
            const networkId = provider ? (provider.network_id || '') : '';
            const uuid = provider ? (provider.uuid || '') : '';

            const title = isEdit ? __('modal_edit_provider_title') : __('modal_create_provider_title');
            const finishText = isEdit ? __('btn_save_changes') : __('btn_create_provider');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc" data-ref="provider-step-desc">${__('step_provider_details_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="provider-form" data-uuid="${uuid}" data-type="${providerType}" data-mode="${isEdit ? 'edit' : 'create'}">
                    <div class="step-modal-step active" data-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownProviderType">
                                <span class="material-symbols-rounded" data-ref="provider-type-icon">${isNetwork ? 'hub' : 'corporate_fare'}</span>
                                <span class="component-dropdown-text" data-ref="provider-type-text" data-value="${providerType}">${isNetwork ? __('admin_ad_type_network') : __('admin_ad_type_direct')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownProviderType">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${isNetwork ? 'active' : ''}" data-action="selectProviderType" data-type="network" data-label="${__('admin_ad_type_network')}" data-icon="hub">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">hub</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_network')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${!isNetwork ? 'active' : ''}" data-action="selectProviderType" data-type="direct" data-label="${__('admin_ad_type_direct')}" data-icon="corporate_fare">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">corporate_fare</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_type_direct')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="provider-name" type="text" placeholder=" " value="${providerName}" required>
                            <label class="component-input-label" data-ref="provider-name-label">${isNetwork ? __('lbl_network_name') : __('lbl_advertiser_name')}</label>
                        </div>
                        <div class="component-input-group ${isNetwork ? '' : 'disabled'}" data-ref="provider-network-id-group">
                            <input class="component-input-field" data-ref="provider-network-id" type="text" placeholder=" " value="${networkId}">
                            <label class="component-input-label">${__('lbl_network_id')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-step="2">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownProviderExp">
                                <span class="material-symbols-rounded" data-ref="provider-exp-icon">${hasExp ? 'event' : 'all_inclusive'}</span>
                                <span class="component-dropdown-text" data-ref="provider-exp-text" data-value="${hasExp ? '1' : '0'}">${hasExp ? __('lbl_with_expiration') : __('lbl_no_expiration')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownProviderExp">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${!hasExp ? 'active' : ''}" data-action="selectExpirationType" data-expiration="0" data-label="${__('lbl_no_expiration')}" data-icon="all_inclusive">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">all_inclusive</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_no_expiration')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${hasExp ? 'active' : ''}" data-action="selectExpirationType" data-expiration="1" data-label="${__('lbl_with_expiration')}" data-icon="event">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">event</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_with_expiration')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full ${hasExp ? '' : 'disabled'}" data-ref="provider-calendar-picker-group">
                            <div class="component-dropdown-trigger" data-action="openProviderDateStep" data-ref="provider-expiration-trigger" data-value="${expDate}">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="provider-expiration-text">${expDate ? expDate.split(' ')[0] : __('lbl_select_expiration_date')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-step="3">
                        <div class="component-calendar" data-ref="provider-inline-calendar">
                            <div class="component-calendar-header">
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                                <div class="component-calendar-title" data-ref="calendar-title">${__('calendar_month_year')}</div>
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                            <div class="component-calendar-weekdays">
                                <span>${__('cal_su')}</span>
                                <span>${__('cal_mo')}</span>
                                <span>${__('cal_tu')}</span>
                                <span>${__('cal_we')}</span>
                                <span>${__('cal_th')}</span>
                                <span>${__('cal_fr')}</span>
                                <span>${__('cal_sa')}</span>
                            </div>
                            <div class="component-calendar-days" data-ref="calendar-days"></div>
                        </div>

                        <div class="calendar-modal-controls">
                            <div>
                                <div class="calendar-control-label">${__('lbl_hours')}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${expDate ? String(parseInt((expDate.split('T')[1] || '00:00').split(':')[0]) || 0) : '0'}">${expDate ? (expDate.split('T')[1] || '00:00').split(':')[0].padStart(2,'0') : '00'}</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="1">
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="calendar-control-label">${__('lbl_minutes')}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${expDate ? String(parseInt((expDate.split('T')[1] || '00:00').split(':')[1]) || 0) : '0'}">${expDate ? (expDate.split('T')[1] || '00:00').split(':')[1].padStart(2,'0') : '00'}</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="1">
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="providerPrevStep" data-ref="btn-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="providerNextStep" data-ref="btn-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--primary component-button--h40 disabled" data-action="submitProvider" data-ref="btn-modal-finish">${finishText}</button>
                </div>
            `;
        }
    },
    createProviderModal: {
        build: (data = {}) => AdminModalTemplates.providerModal.build(data)
    },
    editProviderModal: {
        build: (data = {}) => AdminModalTemplates.providerModal.build(data)
    },
    adModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const ad = data.ad || null;
            const isEdit = !!ad;
            const providerUuid = data.providerUuid || (ad ? ad.provider_uuid : '') || '';
            const adUuid = ad ? (ad.uuid || '') : '';
            const adFormat = ad ? (ad.format || 'feed') : 'feed';
            const resources = data.resources || (ad ? ad.resources : []) || [];
            const settings = ad && ad.settings ? (typeof ad.settings === 'string' ? JSON.parse(ad.settings) : ad.settings) : (data.settings || {});
            const geoMode = settings.geo_mode || 'all';
            const geoCountries = Array.isArray(settings.geo_countries) ? settings.geo_countries : [];
            const blockDatacenters = !!settings.block_datacenters;

            const title = isEdit ? __('modal_edit_ad_title') : __('modal_create_ad_title');
            const finishText = isEdit ? __('btn_save_changes') : __('btn_save_ad');

            const formatsList = (typeof window.ADVERTISEMENT_FORMATS === 'object' && Array.isArray(window.ADVERTISEMENT_FORMATS)) 
                ? window.ADVERTISEMENT_FORMATS 
                : ADVERTISEMENT_FORMATS;

            const currentFmtDef = formatsList.find(f => f.id === adFormat) || formatsList[0] || { id: 'feed', icon: 'view_carousel', labelKey: 'admin_ad_format_feed', defaultLabel: 'Feed: Home, Búsqueda y Capturas' };
            const formatIcon = currentFmtDef.icon || 'view_carousel';
            const formatLabel = __(currentFmtDef.labelKey) || currentFmtDef.label || currentFmtDef.defaultLabel;

            let geoModeIcon = 'public';
            let geoModeLabel = __('geo_mode_all');
            if (geoMode === 'allow') {
                geoModeIcon = 'travel_explore';
                geoModeLabel = __('geo_mode_allow');
            } else if (geoMode === 'block') {
                geoModeIcon = 'block';
                geoModeLabel = __('geo_mode_block');
            }

            const countryCatalog = window.COUNTRY_CATALOG || {};
            const selectedCount = geoCountries.length;
            const selectedCountriesText = selectedCount > 0 ? `${selectedCount} ${__('lbl_targeting_allowed')}` : __('lbl_select_countries');

            const countriesListHtml = Object.entries(countryCatalog).map(([code, name]) => {
                const isChecked = geoCountries.includes(code) ? 'checked' : '';
                return `
                    <label class="component-menu-link component-menu-link--bordered nav-item country-item" data-code="${code}" data-name="${name.toLowerCase()}">
                        <div class="component-menu-link-icon">
                            <input type="checkbox" class="geo-country-checkbox" value="${code}" ${isChecked}>
                        </div>
                        <div class="component-menu-link-text">
                            <span><b>${code}</b> - ${name}</span>
                        </div>
                    </label>
                `;
            }).join('');

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
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc" data-ref="ad-step-desc">${__('step_ad_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="ad-form" data-provider-uuid="${providerUuid}" data-ad-uuid="${adUuid}" data-mode="${isEdit ? 'edit' : 'create'}">
                    <div class="step-modal-step active" data-ad-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownAdFormat">
                                <span class="material-symbols-rounded" data-ref="ad-format-icon">${formatIcon}</span>
                                <span class="component-dropdown-text" data-ref="ad-format-text" data-value="${adFormat}">${formatLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownAdFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        ${formatsList.map(fmt => {
                                            const isActive = (adFormat === fmt.id) ? 'active' : '';
                                            const itemLabel = __(fmt.labelKey) || fmt.label || fmt.defaultLabel;
                                            const itemIcon = fmt.icon || 'view_carousel';
                                            return `
                                                <div class="component-menu-link ${isActive}" data-action="selectAdFormat" data-format="${fmt.id}" data-label="${itemLabel}" data-icon="${itemIcon}">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${itemIcon}</span></div>
                                                    <div class="component-menu-link-text"><span>${itemLabel}</span></div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-ad-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="ad-name" type="text" placeholder=" " value="${ad ? (ad.name || ad.title || '') : ''}" required>
                            <label class="component-input-label">${__('lbl_ad_title')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-ad-step="3">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="ad-description" placeholder=" " rows="4">${ad ? (ad.description || '') : ''}</textarea>
                            <label class="component-input-label">${__('lbl_ad_description')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-ad-step="4">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="ad-target-url" type="text" placeholder=" " value="${ad ? (ad.target_url || '/upgrade') : '/upgrade'}" required>
                            <label class="component-input-label">${__('lbl_ad_target_url')}</label>
                        </div>
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="ad-sponsor-label" type="text" placeholder=" " value="${ad ? (ad.sponsor_label || '') : ''}">
                            <label class="component-input-label">${__('lbl_ad_sponsor_label')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-ad-step="5">
                        <div data-ref="resources-builder-container">
                            ${resourcesHtml}
                        </div>

                        <div class="component-actions-bar">
                            <button class="component-button component-button--h34" data-action="addResourceRow" type="button">
                                <span class="material-symbols-rounded">add</span>
                                <span>${__('btn_add_resource')}</span>
                            </button>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-ad-step="6">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownAdGeoMode">
                                <span class="material-symbols-rounded" data-ref="geo-mode-icon">${geoModeIcon}</span>
                                <span class="component-dropdown-text" data-ref="geo-mode-text" data-value="${geoMode}">${geoModeLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownAdGeoMode">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${geoMode === 'all' ? 'active' : ''}" data-action="selectGeoMode" data-mode="all" data-label="${__('geo_mode_all')}" data-icon="public">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_all')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${geoMode === 'allow' ? 'active' : ''}" data-action="selectGeoMode" data-mode="allow" data-label="${__('geo_mode_allow')}" data-icon="travel_explore">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">travel_explore</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_allow')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${geoMode === 'block' ? 'active' : ''}" data-action="selectGeoMode" data-mode="block" data-label="${__('geo_mode_block')}" data-icon="block">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_block')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-targeting-countries ${geoMode === 'all' ? 'disabled' : ''}" data-ref="geo-countries-container">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownTargetCountries">
                                    <div class="component-dropdown-trigger-title">
                                        <span class="material-symbols-rounded">flag</span>
                                        <span class="component-dropdown-text" data-ref="target-countries-text">${selectedCountriesText}</span>
                                    </div>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="dropdownTargetCountries">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-header">
                                            <div class="component-search">
                                                <div class="component-search-icon"><span class="material-symbols-rounded">search</span></div>
                                                <div class="component-search-input">
                                                    <input type="text" class="search-input" data-ref="search-country-input" data-action="filterCountryList" placeholder="${__('lbl_search_country')}">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="component-menu-list component-menu-list--max-h200 component-menu-list--scrollable" data-ref="countries-checkbox-list">
                                            ${countriesListHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label class="component-menu-link component-menu-link--bordered nav-item">
                            <div class="component-menu-link-icon">
                                <input type="checkbox" data-ref="block-datacenters-checkbox" ${blockDatacenters ? 'checked' : ''}>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${__('lbl_block_datacenters')}</span>
                                <p class="component-menu-link-subtext">${__('lbl_block_datacenters_desc')}</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-ad-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="adPrevStep" data-ref="btn-ad-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="adNextStep" data-ref="btn-ad-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--primary component-button--h40 disabled" data-action="submitAd" data-ref="btn-ad-modal-finish">${finishText}</button>
                </div>
            `;
        }
    },
    createAdModal: {
        build: (data = {}) => AdminModalTemplates.adModal.build(data)
    },
    editAdModal: {
        build: (data = {}) => AdminModalTemplates.adModal.build(data)
    },
    networkSlotModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const ad = data.ad || null;
            const isEdit = !!ad;
            const providerUuid = data.providerUuid || (ad ? ad.provider_uuid : '') || '';
            const adUuid = ad ? (ad.uuid || '') : '';
            const slotFormat = ad ? (ad.format || 'feed') : 'feed';
            const resources = data.resources || (ad ? ad.resources : []) || [];
            const scriptRes = resources.find(r => r.resource_type === 'script') || resources[0] || {};
            const settings = ad && ad.settings ? (typeof ad.settings === 'string' ? JSON.parse(ad.settings) : ad.settings) : (data.settings || {});
            const geoMode = settings.geo_mode || 'all';
            const geoCountries = Array.isArray(settings.geo_countries) ? settings.geo_countries : [];
            const blockDatacenters = !!settings.block_datacenters;

            const title = isEdit ? __('modal_edit_network_slot_title') : __('modal_create_network_slot_title');
            const finishText = isEdit ? __('btn_save_changes') : __('btn_save_slot');

            let formatIcon = 'view_carousel';
            let formatLabel = __('admin_ad_format_feed');
            if (slotFormat === 'module_colors') {
                formatIcon = 'palette';
                formatLabel = __('admin_ad_format_module_colors');
            } else if (slotFormat === 'module_templates') {
                formatIcon = 'dashboard_customize';
                formatLabel = __('admin_ad_format_module_templates');
            } else if (slotFormat === 'modules') {
                formatIcon = 'palette';
                formatLabel = __('admin_ad_format_modules');
            }

            let geoModeIcon = 'public';
            let geoModeLabel = __('geo_mode_all');
            if (geoMode === 'allow') {
                geoModeIcon = 'travel_explore';
                geoModeLabel = __('geo_mode_allow');
            } else if (geoMode === 'block') {
                geoModeIcon = 'block';
                geoModeLabel = __('geo_mode_block');
            }

            const countryCatalog = window.COUNTRY_CATALOG || {};
            const selectedCount = geoCountries.length;
            const selectedCountriesText = selectedCount > 0 ? `${selectedCount} ${__('lbl_targeting_allowed')}` : __('lbl_select_countries');

            const countriesListHtml = Object.entries(countryCatalog).map(([code, name]) => {
                const isChecked = geoCountries.includes(code) ? 'checked' : '';
                return `
                    <label class="component-menu-link component-menu-link--bordered nav-item country-item" data-code="${code}" data-name="${name.toLowerCase()}">
                        <div class="component-menu-link-icon">
                            <input type="checkbox" class="geo-country-checkbox" value="${code}" ${isChecked}>
                        </div>
                        <div class="component-menu-link-text">
                            <span><b>${code}</b> - ${name}</span>
                        </div>
                    </label>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${title}</h2>
                        <p class="component-modal-desc" data-ref="slot-step-desc">${__('step_network_slot_format_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="network-slot-form" data-provider-uuid="${providerUuid}" data-ad-uuid="${adUuid}" data-mode="${isEdit ? 'edit' : 'create'}">
                    <div class="step-modal-step active" data-slot-step="1">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownSlotFormat">
                                <span class="material-symbols-rounded" data-ref="slot-format-icon">${formatIcon}</span>
                                <span class="component-dropdown-text" data-ref="slot-format-text" data-value="${slotFormat}">${formatLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownSlotFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${slotFormat === 'feed' ? 'active' : ''}" data-action="selectSlotFormat" data-format="feed" data-label="${__('admin_ad_format_feed')}" data-icon="view_carousel">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">view_carousel</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_feed')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${slotFormat === 'module_colors' ? 'active' : ''}" data-action="selectSlotFormat" data-format="module_colors" data-label="${__('admin_ad_format_module_colors')}" data-icon="palette">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">palette</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_colors')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${slotFormat === 'module_templates' ? 'active' : ''}" data-action="selectSlotFormat" data-format="module_templates" data-label="${__('admin_ad_format_module_templates')}" data-icon="dashboard_customize">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">dashboard_customize</span></div>
                                            <div class="component-menu-link-text"><span>${__('admin_ad_format_module_templates')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-slot-step="2">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-name" type="text" placeholder=" " value="${ad ? (ad.name || ad.title || '') : ''}" required>
                            <label class="component-input-label">${__('lbl_slot_name')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-slot-step="3">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="slot-id" type="text" placeholder=" " value="${scriptRes.content_url || ''}">
                            <label class="component-input-label">${__('lbl_slot_id')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-slot-step="4">
                        <div class="component-input-group">
                            <textarea class="component-input-field" data-ref="slot-code" placeholder=" " rows="4">${scriptRes.raw_content || ''}</textarea>
                            <label class="component-input-label">${__('lbl_slot_code')}</label>
                        </div>
                    </div>

                    <div class="step-modal-step disabled" data-slot-step="5">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownSlotGeoMode">
                                <span class="material-symbols-rounded" data-ref="slot-geo-mode-icon">${geoModeIcon}</span>
                                <span class="component-dropdown-text" data-ref="slot-geo-mode-text" data-value="${geoMode}">${geoModeLabel}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownSlotGeoMode">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${geoMode === 'all' ? 'active' : ''}" data-action="selectSlotGeoMode" data-mode="all" data-label="${__('geo_mode_all')}" data-icon="public">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_all')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${geoMode === 'allow' ? 'active' : ''}" data-action="selectSlotGeoMode" data-mode="allow" data-label="${__('geo_mode_allow')}" data-icon="travel_explore">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">travel_explore</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_allow')}</span></div>
                                        </div>
                                        <div class="component-menu-link ${geoMode === 'block' ? 'active' : ''}" data-action="selectSlotGeoMode" data-mode="block" data-label="${__('geo_mode_block')}" data-icon="block">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                            <div class="component-menu-link-text"><span>${__('geo_mode_block')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-targeting-countries ${geoMode === 'all' ? 'disabled' : ''}" data-ref="slot-geo-countries-container">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownSlotTargetCountries">
                                    <div class="component-dropdown-trigger-title">
                                        <span class="material-symbols-rounded">flag</span>
                                        <span class="component-dropdown-text" data-ref="slot-target-countries-text">${selectedCountriesText}</span>
                                    </div>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="dropdownSlotTargetCountries">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-header">
                                            <div class="component-search">
                                                <div class="component-search-icon"><span class="material-symbols-rounded">search</span></div>
                                                <div class="component-search-input">
                                                    <input type="text" class="search-input" data-ref="search-slot-country-input" data-action="filterCountryList" placeholder="${__('lbl_search_country')}">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="component-menu-list component-menu-list--max-h200 component-menu-list--scrollable" data-ref="slot-countries-checkbox-list">
                                            ${countriesListHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <label class="component-menu-link component-menu-link--bordered nav-item">
                            <div class="component-menu-link-icon">
                                <input type="checkbox" data-ref="slot-block-datacenters-checkbox" ${blockDatacenters ? 'checked' : ''}>
                            </div>
                            <div class="component-menu-link-text">
                                <span>${__('lbl_block_datacenters')}</span>
                                <p class="component-menu-link-subtext">${__('lbl_block_datacenters_desc')}</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel" data-ref="btn-slot-modal-cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 disabled" data-action="slotPrevStep" data-ref="btn-slot-modal-prev">${__('btn_prev')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="slotNextStep" data-ref="btn-slot-modal-next">${__('btn_next')}</button>
                    <button class="component-button component-button--primary component-button--h40 disabled" data-action="submitNetworkSlot" data-ref="btn-slot-modal-finish">${finishText}</button>
                </div>
            `;
        }
    },
    createNetworkSlotModal: {
        build: (data = {}) => AdminModalTemplates.networkSlotModal.build(data)
    },
    editNetworkSlotModal: {
        build: (data = {}) => AdminModalTemplates.networkSlotModal.build(data)
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
    },
    downloadMetricsPeriodModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const targetName = data.targetName || '';
            const isGlobal = !!data.isGlobal;
            const targetUuid = data.targetUuid || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('modal_download_metrics_title')}</h2>
                        <p class="component-modal-desc">${__('modal_download_metrics_desc')} <b>${targetName}</b>.</p>
                    </div>
                </div>

                <div class="component-modal-body" data-ref="download-metrics-form" data-target-uuid="${targetUuid}" data-target-name="${targetName}" data-is-global="${isGlobal ? '1' : '0'}">
                    <div class="component-input-group">
                        <label class="component-input-label component-input-label--static">${__('lbl_metrics_period')}</label>
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                            <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownMetricsPeriod">
                                <span class="material-symbols-rounded" data-ref="period-icon">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="period-text" data-value="30">${__('metrics_period_30')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="dropdownMetricsPeriod">
                                <div class="component-menu component-menu--w-full component-menu--h-auto">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--max-h250">
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="7" data-label="${__('metrics_period_7')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">date_range</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_7')}</span></div>
                                        </div>
                                        <div class="component-menu-link active" data-action="selectMetricsPeriod" data-value="30" data-label="${__('metrics_period_30')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">calendar_month</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_30')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="60" data-label="${__('metrics_period_60')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">calendar_today</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_60')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="90" data-label="${__('metrics_period_90')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">event_repeat</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_90')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="180" data-label="${__('metrics_period_180')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">history</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_180')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="365" data-label="${__('metrics_period_365')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">calendar_add_on</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_365')}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectMetricsPeriod" data-value="all" data-label="${__('metrics_period_all')}">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">all_inclusive</span></div>
                                            <div class="component-menu-link-text"><span>${__('metrics_period_all')}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="confirmDownloadMetrics" data-ref="btn-confirm-download-pdf">
                        <span class="material-symbols-rounded">download</span>
                        <span>${__('btn_download_pdf')}</span>
                    </button>
                </div>
            `;
        }
    }
};

