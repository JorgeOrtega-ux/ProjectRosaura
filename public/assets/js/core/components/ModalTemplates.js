import { escapeHTML, getDynamicTierName, getLockDetails, hexToHsv, parseUtcToLocalDate, formatLocalDateTimeToInput, getUserTimezoneString, getScheduledTimeDetails } from '../utils/uiUtils.js';

const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

export function renderVerificationInput(data = {}) {
    const isGoogleUser = (window.APP_USER && window.APP_USER.is_google === true);
    const inputRef = data.inputRef || 'modal_verify_password';
    const inputId = data.inputId || '';
    const labelText = data.label || __('lbl_current_password');
    const autocomplete = data.autocomplete || '';

    if (isGoogleUser) {
        return `
            <div class="verification-method-container" data-ref="verification-method-container">
                <div class="component-verify-container google-verify-container" data-ref="google-verify-box">
                    <div class="component-badge component-badge--sm component-badge--interactive component-badge--full google-verify-badge verify-toggle-badge" 
                         data-action="triggerGoogleVerify" 
                         data-ref="credential" 
                         data-value="" 
                         data-input-ref="${inputRef}">
                        <svg class="google-verify-icon" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.13C3.26 21.3 7.31 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.24c-.25-.75-.38-1.55-.38-2.36s.13-1.61.38-2.36V6.39H1.29C.47 8.03 0 9.96 0 12s.47 3.97 1.29 5.61l3.99-3.37z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.39l3.99 3.37c.95-2.85 3.6-4.96 6.72-4.96z"/>
                        </svg>
                        <span class="google-verify-text">${__('btn_verify_google_session')}</span>
                    </div>
                    <input type="hidden" data-ref="google_token" name="google_token" data-value="" value="">
                    <div class="component-badge component-badge--sm component-badge--interactive component-badge--full verify-toggle-badge" data-action="toggleVerifyMethod" data-mode="password">
                        <span class="material-symbols-rounded">key</span>
                        <span>${__('link_verify_with_password')}</span>
                    </div>
                </div>
                <div class="component-verify-container password-verify-container disabled" data-ref="password-verify-box">
                    <div class="component-input-group">
                        <input type="password" ${inputId ? `id="${inputId}"` : ''} data-ref="${inputRef}" class="component-input-field component-input-field--with-icon" placeholder=" " ${autocomplete ? `autocomplete="${autocomplete}"` : ''}>
                        <label class="component-input-label">${labelText}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
                    <div class="component-badge component-badge--sm component-badge--interactive component-badge--full verify-toggle-badge" data-action="toggleVerifyMethod" data-mode="google">
                        <svg class="google-verify-icon" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.13C3.26 21.3 7.31 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.24c-.25-.75-.38-1.55-.38-2.36s.13-1.61.38-2.36V6.39H1.29C.47 8.03 0 9.96 0 12s.47 3.97 1.29 5.61l3.99-3.37z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.39l3.99 3.37c.95-2.85 3.6-4.96 6.72-4.96z"/>
                        </svg>
                        <span>${__('link_verify_with_google')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="component-input-group">
            <input type="password" ${inputId ? `id="${inputId}"` : ''} data-ref="${inputRef}" class="component-input-field component-input-field--with-icon" placeholder=" " ${autocomplete ? `autocomplete="${autocomplete}"` : ''}>
            <label class="component-input-label">${labelText}</label>
            <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
        </div>
    `;
}

export const ModalTemplates = {
    activateChatConfirmationModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

            const hasLiveChat = data.hasLiveChat;
            const lowestChatTier = data.lowestChatTier || 'Pro';
            const isOwner = data.isOwner;
            
            if (!isOwner) {
                return `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-modal-header">
                        <h3 class="component-modal-title">${__('chat_deactivated_title')}</h3>
                        <p class="component-modal-desc">${__('chat_non_owner_deactivated_desc')}</p>
                    </div>
                    <div class="component-modal-actions">
                        <button class="component-button component-button--primary component-button--h40" data-modal-action="cancel">${__('btn_accept')}</button>
                    </div>
                `;
            }
            
            if (!hasLiveChat) {
                return `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-modal-header">
                        <h3 class="component-modal-title">${__('chat_activation_pro_required')}</h3>
                        <p class="component-modal-desc">${__('chat_pro_required_desc')}</p>
                    </div>
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="openUpgradeModal">
                            <span class="material-symbols-rounded">stars</span>
                            <span>${__('btn_upgrade')}</span>
                        </button>
                    </div>
                `;
            }
            
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('chat_activate_title')}</h3>
                    <p class="component-modal-desc">${__('chat_activate_desc')}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_activate_live_chat_confirm')}</button>
                </div>
            `;
        }
    },

    upgradePlansModal: {
        customBoxClass: 'component-modal-box--upgrade',
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            
            const allTiers = (window.APP_TIERS && Array.isArray(window.APP_TIERS))
                ? [...window.APP_TIERS].filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false).sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10))
                : [];

            let reqTier = parseInt(data.initialTier ?? data.selectedTier ?? data.tier ?? 0, 10);
            if (!allTiers.some(t => parseInt(t.tier_level, 10) === reqTier)) {
                const pop = allTiers.find(t => t.is_popular == 1 || t.is_popular === true);
                reqTier = pop ? parseInt(pop.tier_level, 10) : (allTiers[0] ? parseInt(allTiers[0].tier_level, 10) : 1);
            }

            const currentTier = parseInt(window.appUserTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
            const isYearly = window.isYearlyPremium === true || data.billingPeriod === 'yearly';

            const selectedTierObj = allTiers.find(t => parseInt(t.tier_level, 10) === reqTier) || allTiers[0] || {};
            const initialTierName = selectedTierObj.name || `Pro`;

            const compareRows = [
                {
                    label: __('plan_limit_canvases') || 'Lienzos Personales',
                    desc: __('plan_limit_canvases_desc') || 'Proyectos simultáneos',
                    icon: 'dashboard',
                    getValue: (t) => t.max_canvases == -1 ? (__('plan_limit_unlimited') || 'Ilimitado') : `${t.max_canvases}`
                },
                {
                    label: __('plan_limit_capturas') || 'Capturas de Lienzo',
                    desc: __('plan_limit_capturas_desc') || 'Historial de versiones y capturas',
                    icon: 'history',
                    getValue: (t) => t.max_snapshots_per_canvas == -1 ? (__('plan_limit_unlimited') || 'Ilimitado') : `${t.max_snapshots_per_canvas}`
                },
                {
                    label: __('plan_limit_members') || 'Miembros por lienzo',
                    desc: __('plan_limit_members_desc') || 'Invitados simultáneos en un mismo lienzo',
                    icon: 'group',
                    getValue: (t) => t.max_members_per_canvas == -1 ? (__('plan_limit_unlimited') || 'Ilimitado') : Number(t.max_members_per_canvas).toLocaleString()
                },
                {
                    label: __('lbl_storage') || 'Almacenamiento en la nube',
                    desc: __('plan_storage_desc') || 'Capacidad total de almacenamiento',
                    icon: 'cloud',
                    getValue: (t) => {
                        const mb = parseInt(t.max_storage_mb || 0, 10);
                        return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
                    }
                },
                {
                    label: 'Límite de subida por archivo',
                    desc: 'Tamaño máximo por imagen o recurso cargado',
                    icon: 'upload_file',
                    getValue: (t) => `${parseInt(t.max_upload_mb || 10, 10)} MB`
                },
                {
                    label: __('plan_feat_custom_palettes_title') || 'Paletas Personalizadas',
                    desc: __('plan_feat_custom_palettes_desc') || 'Crea y almacena paletas exclusivas',
                    icon: 'palette',
                    getValue: (t) => {
                        if (!t.feat_custom_palettes) return false;
                        const max = parseInt(t.max_custom_palettes || 0, 10);
                        return max > 0 ? `${max}` : true;
                    }
                },
                {
                    label: __('plan_feat_inject_templates_title') || 'Inyección de Plantillas',
                    desc: __('plan_feat_inject_templates_desc') || 'Inyecta imágenes y plantillas en el lienzo',
                    icon: 'brush',
                    getValue: (t) => !!(parseInt(t.feat_inject_templates, 10) || t.feat_inject_templates === true)
                },
                {
                    label: __('plan_feat_live_share_title') || 'Transmisión y Live Share',
                    desc: __('plan_feat_live_share_desc') || 'Transmite tu lienzo y sincroniza con otros',
                    icon: 'stream',
                    getValue: (t) => !!(parseInt(t.feat_live_share, 10) || t.feat_live_share === true)
                },
                {
                    label: __('plan_feat_export_timelapse_title') || 'Videos Timelapse',
                    desc: __('plan_feat_export_timelapse_desc') || 'Exporta videos timelapse en alta resolución',
                    icon: 'movie',
                    getValue: (t) => !!(parseInt(t.feat_export_timelapse, 10) || t.feat_export_timelapse === true)
                },
                {
                    label: __('plan_feat_advanced_roles_title') || 'Roles Avanzados',
                    desc: __('plan_feat_advanced_roles_desc') || 'Permisos personalizados en lienzos',
                    icon: 'admin_panel_settings',
                    getValue: (t) => !!(parseInt(t.feat_advanced_roles, 10) || t.feat_advanced_roles === true)
                },
                {
                    label: __('plan_feat_chat_restriction_title') || 'Chat en Tiempo Real',
                    desc: __('plan_feat_chat_restriction_desc') || 'Uso de chat y herramientas de moderación',
                    icon: 'speaker_notes',
                    getValue: (t) => !!(parseInt(t.feat_chat_restriction, 10) || t.feat_chat_restriction === true)
                },
                {
                    label: __('plan_feat_no_ads_title') || 'Experiencia Sin Anuncios',
                    desc: __('plan_feat_no_ads_desc') || 'Navegación fluida y sin publicidad',
                    icon: 'block',
                    getValue: (t) => !!(parseInt(t.feat_no_ads, 10) || t.feat_no_ads === true)
                }
            ];

            const planCardsHtml = allTiers.map(t => {
                const tierLvl = parseInt(t.tier_level, 10);
                const isSelected = tierLvl === reqTier;
                const isPopular = !!(t.is_popular == 1 || t.is_popular === true);
                const mPrice = Number(t.price_monthly || 0).toFixed(2);
                const yPrice = Number(t.price_yearly || 0).toFixed(2);
                const curPrice = isYearly ? yPrice : mPrice;
                const curPeriod = isYearly ? (__('upgrade_period_yearly_full') || 'al año') : (__('upgrade_period_monthly_full') || 'al mes');

                let badgeText = '';
                if (isPopular) {
                    badgeText = __('upgrade_card_popular_badge') || 'Recomendado';
                } else if (t.max_template_tokens > 0) {
                    badgeText = `${t.max_template_tokens} Tokens`;
                } else if (parseInt(t.feat_export_timelapse, 10) || t.feat_export_timelapse === true) {
                    badgeText = 'Timelapse HD';
                }

                const badgeHtml = badgeText ? `<span class="component-badge component-badge--sm upgrade-plan-card-badge">${escapeHTML(badgeText)}</span>` : '';
                
                const storageMb = parseInt(t.max_storage_mb || 0, 10);
                const storageStr = storageMb >= 1024 ? `${(storageMb / 1024).toFixed(0)} GB` : `${storageMb} MB`;
                const canvasesStr = t.max_canvases == -1 ? (__('plan_limit_unlimited') || 'Lienzos ilimitados') : `${t.max_canvases} lienzos`;
                const subtitle = `${canvasesStr} • ${storageStr} de almacenamiento`;

                return `
                    <div class="upgrade-plan-card ${isSelected ? 'active' : ''}" data-action="select-modal-tier" data-tier="${tierLvl}" role="radio" aria-selected="${isSelected ? 'true' : 'false'}">
                        <div class="upgrade-plan-radio">
                            <span class="upgrade-plan-radio-dot" style="opacity: ${isSelected ? '1' : '0'}; transform: ${isSelected ? 'scale(1)' : 'scale(0.5)'};"></span>
                        </div>
                        <div class="upgrade-plan-info">
                            <div class="upgrade-plan-header-row">
                                <span class="upgrade-plan-name">${escapeHTML(t.name || `Tier ${tierLvl}`)}</span>
                                ${badgeHtml}
                            </div>
                            <div class="upgrade-plan-subtitle-row">
                                <span class="upgrade-plan-desc">${escapeHTML(subtitle)}</span>
                                <span class="upgrade-plan-price-wrap">
                                    <span class="upgrade-plan-price-currency">USD $</span><span class="upgrade-plan-price-val" data-ref="plan-card-price" data-monthly="${mPrice}" data-yearly="${yPrice}">${curPrice}</span>
                                    <span class="upgrade-plan-price-period" data-ref="plan-card-period">${curPeriod}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            const tableColHeadersHtml = allTiers.map(t => {
                const tierLvl = parseInt(t.tier_level, 10);
                const isColActive = tierLvl === reqTier;
                return `
                    <th class="upgrade-table-col-header ${isColActive ? 'upgrade-col-active' : ''}" data-tier="${tierLvl}">
                        <span class="upgrade-table-header-name">${escapeHTML(t.name || `Tier ${tierLvl}`)}</span>
                    </th>
                `;
            }).join('');

            const tableRowsHtml = compareRows.map(row => {
                const cellColsHtml = allTiers.map(t => {
                    const tierLvl = parseInt(t.tier_level, 10);
                    const isColActive = tierLvl === reqTier;
                    const val = row.getValue(t);

                    let renderedVal = '';
                    if (val === true) {
                        renderedVal = `<span class="material-symbols-rounded upgrade-check-icon">check</span>`;
                    } else if (val === false) {
                        renderedVal = `<span class="upgrade-dash">—</span>`;
                    } else {
                        renderedVal = `<span class="upgrade-val-text">${escapeHTML(String(val))}</span>`;
                    }

                    return `
                        <td class="upgrade-table-cell ${isColActive ? 'upgrade-col-active' : ''}" data-tier="${tierLvl}">
                            ${renderedVal}
                        </td>
                    `;
                }).join('');

                return `
                    <tr class="upgrade-table-row">
                        <td class="upgrade-table-feature-cell">
                            <div class="upgrade-table-feature-wrap">
                                <span class="upgrade-feature-label">${escapeHTML(row.label)}</span>
                                ${row.desc ? `<span class="material-symbols-rounded upgrade-info-icon" title="${escapeHTML(row.desc)}">info</span>` : ''}
                            </div>
                        </td>
                        ${cellColsHtml}
                    </tr>
                `;
            }).join('');

            const ctaBtnText = currentTier === reqTier 
                ? (__('plan_btn_current') || 'Tu Plan Actual')
                : `${__('upgrade_modal_title_prefix') || 'Sube de categoría a'} ${initialTierName}`;

            return `
                <div class="upgrade-modal-container" data-ref="upgrade-modal-container">
                    <!-- LEFT COLUMN -->
                    <div class="upgrade-modal-left">
                        <div class="upgrade-modal-left-header">
                            <h2 class="upgrade-modal-title">
                                ${__('upgrade_modal_title_prefix') || 'Sube de categoría a'} 
                                <span class="upgrade-modal-tier-highlight" data-ref="upgrade-selected-tier-name" data-tier="${reqTier}">${escapeHTML(initialTierName)}</span>
                            </h2>
                            <p class="upgrade-modal-desc">${__('upgrade_modal_subtitle') || 'Elige tu plan.'}</p>

                            <div class="upgrade-modal-billing-switch">
                                <div class="component-toggle-pill upgrade-modal-toggle-pill" data-ref="modal-billing-toggle-pill" data-cycle="${isYearly ? 'yearly' : 'monthly'}">
                                    <div class="component-toggle-pill-glider"></div>
                                    <button type="button" class="component-button component-button--rounded-pill ${!isYearly ? 'active' : ''}" data-action="setModalBillingCycle" data-value="monthly">
                                        ${__('upgrade_billing_monthly') || 'Mensual'}
                                    </button>
                                    <button type="button" class="component-button component-button--rounded-pill ${isYearly ? 'active' : ''}" data-action="setModalBillingCycle" data-value="yearly">
                                        ${__('upgrade_billing_yearly') || 'Anual'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="upgrade-modal-plans-list" role="radiogroup">
                            ${planCardsHtml}
                        </div>

                        <div class="upgrade-modal-left-footer">
                            <button type="button" class="component-button component-button--primary upgrade-modal-cta-btn ${currentTier === reqTier ? 'disabled-interaction' : ''}" data-action="upgradeModalSubscribe">
                                <span class="material-symbols-rounded">crown</span>
                                <span data-ref="cta-text">${escapeHTML(ctaBtnText)}</span>
                            </button>
                            <p class="upgrade-modal-disclaimer">${__('upgrade_modal_terms_note') || 'Cancela cuando quieras. Aplican términos.'}</p>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN -->
                    <div class="upgrade-modal-right">
                        <div class="upgrade-modal-compare-wrap">
                            <table class="upgrade-modal-compare-table">
                                <thead>
                                    <tr class="upgrade-table-header-row">
                                        <th class="upgrade-table-feature-header">
                                            <span>${__('upgrade_premium_benefits') || 'Beneficios prémium'}</span>
                                        </th>
                                        ${tableColHeadersHtml}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRowsHtml}
                                </tbody>
                            </table>
                            <div class="upgrade-modal-compare-footer">
                                <button type="button" class="upgrade-modal-compare-link" data-action="goToUpgradePage">
                                    <span>${__('upgrade_modal_view_more_info') || 'Ver información adicional'}</span>
                                    <span class="material-symbols-rounded">open_in_new</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    changePasswordModal: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                
                <!-- STEP 1: Current Password -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="step-1-current-password">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('cp_title')}</h2>
                        <p class="component-modal-desc">${__('cp_step1_desc')}</p>
                    </div>
                    
                    <div class="component-modal-body">
                        ${renderVerificationInput({ inputRef: 'cp_current_password', label: __('lbl_current_password'), autocomplete: 'off' })}
                    </div>
                    
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitVerifyCurrentPassword">${__('btn_verify')}</button>
                    </div>
                </div>

                <!-- STEP 2: New Password -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="step-2-new-password">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('cp_title')}</h2>
                        <p class="component-modal-desc">${__('cp_step2_desc')}</p>
                    </div>
                    
                    <div class="component-modal-body">
                        <div class="component-input-group">
                            <input type="password" data-ref="cp_new_password" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="off">
                            <label class="component-input-label">${__('lbl_new_password')}</label>
                            <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                        </div>
                        
                        <div class="component-input-group">
                            <input type="password" data-ref="cp_confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="off">
                            <label class="component-input-label">${__('lbl_confirm_password')}</label>
                            <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                        </div>
                    </div>
                    
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitUpdatePassword">${__('btn_save_password')}</button>
                    </div>
                </div>
            `;
        }
    },

    welcomePremiumModal: {
        customBoxClass: 'component-modal-box--split',
        build: (data = {}) => ModalTemplates.purchaseSuccessModal.build({ ...data, item_type: 'subscription' })
    },

    joinCanvasModal: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('lbl_join_canvas')}</h3>
                    <p class="component-modal-desc">${__('desc_invite_code')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-form-box component-form-box--full">
                        <div class="component-input-group">
                            <input class="component-input-field" data-ref="canvas-join-code-modal" type="text" placeholder="${__('ph_invite_code')}" maxlength="9" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(.+)/, '$1-$2').slice(0, 9);" required autocomplete="off">
                            <label class="component-input-label">${__('lbl_invite_code')}</label>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_accept')}</button>
                </div>
            `;
        }
    },

    purchaseSuccessModal: {
        customBoxClass: 'component-modal-box--split',
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            
            let tierName = data.tier_name || data.subscription_name || data.name || data.item_name || '';
            if (!tierName && data.tier !== undefined && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
                if (found && found.name) tierName = found.name;
            }
            if (!tierName) {
                tierName = __('subscription') || 'Plan Premium';
            }

            const title = data.title || __('thank_you_purchase') || '¡Gracias por tu compra!';
            const desc = data.desc || __('email_subscription_p2') || 'Puedes empezar a disfrutar de tus nuevos beneficios de inmediato.';
            const continueText = data.confirmText || __('btn_continue') || 'Continuar';

            let periodLabel = '';
            if (data.billing_period === 'yearly' || data.billing_period === 'year' || data.billing_period === 'anual') {
                periodLabel = __('period_yearly') || 'año';
                if (periodLabel === 'period_yearly') periodLabel = 'año';
            } else if (data.billing_period === 'monthly' || data.billing_period === 'month' || data.billing_period === 'mensual') {
                periodLabel = __('period_monthly') || 'mes';
                if (periodLabel === 'period_monthly') periodLabel = 'mes';
            } else if (data.billing_period) {
                periodLabel = data.billing_period;
            }

            let billingText = '';
            if (data.amount) {
                billingText = data.amount;
                if (periodLabel) {
                    billingText += ` / ${periodLabel}`;
                }
            } else if (periodLabel) {
                billingText = `${__('lbl_billing') || 'Facturación'} ${periodLabel}`;
            }

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- Left Column: Content & Actions -->
                <div class="component-modal-split-left">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">
                            ${escapeHTML(title)}
                        </h2>
                        <p class="component-modal-desc">
                            ${escapeHTML(desc)}
                        </p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-purchase-plan-summary">
                            <div class="component-purchase-plan-meta">
                                <div class="component-purchase-plan-icon">
                                    <span class="material-symbols-rounded">stars</span>
                                </div>
                                <div class="component-purchase-plan-details">
                                    <span class="component-purchase-plan-title">${escapeHTML(tierName)}</span>
                                    ${billingText ? `<span class="component-purchase-plan-sub">${escapeHTML(billingText)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">
                            <span>${escapeHTML(continueText)}</span>
                        </button>
                    </div>
                </div>

                <!-- Right Column: Banner Gradient & Vector Artwork -->
                <div class="component-modal-split-right">
                    <div class="component-modal-split-art-stage">
                        <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="100" cy="100" r="88" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2" stroke-dasharray="6 6"/>
                            <circle cx="100" cy="100" r="68" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.5"/>
                            <circle cx="100" cy="100" r="48" fill="rgba(255, 255, 255, 0.12)"/>
                            
                            <!-- Sparkles / Stars -->
                            <path d="M42 55 L45 42 L48 55 L61 58 L48 61 L45 74 L42 61 L29 58 Z" fill="rgba(255, 255, 255, 0.75)"/>
                            <path d="M152 145 L155 136 L158 145 L167 148 L158 151 L155 160 L152 151 L143 148 Z" fill="rgba(255, 255, 255, 0.6)"/>
                            <circle cx="158" cy="52" r="3" fill="#ffffff" fill-opacity="0.85"/>
                            <circle cx="48" cy="142" r="2.5" fill="#ffffff" fill-opacity="0.8"/>
                            
                            <!-- Premium Star / Diamond Emblem -->
                            <path d="M100 48 L113 78 L145 82 L121 104 L128 136 L100 120 L72 136 L79 104 L55 82 L87 78 Z" fill="rgba(255, 255, 255, 0.25)" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
                            <path d="M100 64 L108 84 L128 86 L113 100 L117 120 L100 110 L83 120 L87 100 L72 86 L92 84 Z" fill="#ffffff"/>
                        </svg>
                    </div>
                </div>
            `;
        }
    },

    welcomeUserModal: {
        noPadding: true,
        build: () => {
            const modalId = 'welcome-user';

            // Define los pasos del modal de bienvenida
            const steps = [
                {
                    id: 'welcome-step-1',
                    title: window.__('welcome_modal_step1_title'),
                    description: window.__('welcome_modal_step1_desc'),
                    icons: ['rocket_launch']
                },
                {
                    id: 'welcome-step-2',
                    title: window.__('welcome_modal_step2_title'),
                    description: window.__('welcome_modal_step2_desc'),
                    icons: ['palette']
                },
                {
                    id: 'welcome-step-3',
                    title: window.__('welcome_modal_step3_title'),
                    description: window.__('welcome_modal_step3_desc'),
                    icons: ['bolt']
                }
            ];

            let stepsHtml = '';
            steps.forEach((step, idx) => {
                const isActive = idx === 0 ? 'active' : '';

                let tilesHtml = '';
                const stepIcons = step.icons || [];
                stepIcons.forEach(icon => {
                    tilesHtml += `
                        <div class="onboarding-tour-icon-tile">
                            <span class="material-symbols-rounded msr-${icon}">${icon}</span>
                        </div>
                    `;
                });

                let dotsHtml = `
                    <div class="step-modal-dots">
                        <div class="step-modal-dot ${idx === 0 ? 'active' : ''}" data-step-target="welcome-step-1"></div>
                        <div class="step-modal-dot ${idx === 1 ? 'active' : ''}" data-step-target="welcome-step-2"></div>
                        <div class="step-modal-dot ${idx === 2 ? 'active' : ''}" data-step-target="welcome-step-3"></div>
                    </div>
                `;

                let actionsHtml = '';
                if (idx === 0) {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            <button class="component-button component-button--primary component-button--h40" data-step-target="welcome-step-2">
                                ${window.__('welcome_modal_btn_next')}
                            </button>
                        </div>
                    `;
                } else if (idx === 1) {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            <button class="component-button component-button--primary component-button--h40" data-step-target="welcome-step-3">
                                ${window.__('welcome_modal_btn_next')}
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            <button class="component-button component-button--primary component-button--h40" data-modal-action="finish">
                                ${window.__('welcome_modal_btn_finish')}
                            </button>
                        </div>
                    `;
                }

                let featuresHtml = '';
                if (step.features && step.features.length > 0) {
                    featuresHtml = `<div class="welcome-features-list">`;
                    step.features.forEach(feat => {
                        featuresHtml += `
                            <div class="welcome-feature-item">
                                <div class="welcome-feature-icon">
                                    <span class="material-symbols-rounded component-icon-sm msr-${feat.icon}">${feat.icon}</span>
                                </div>
                                <div class="welcome-feature-text">
                                    <span class="welcome-feature-title">${feat.title}</span>
                                    <span class="welcome-feature-desc">${feat.description}</span>
                                </div>
                            </div>
                        `;
                    });
                    featuresHtml += `</div>`;
                }

                stepsHtml += `
                    <div class="step-modal-step onboarding-tour-step ${isActive}" data-ref="${step.id}">
                        <div class="onboarding-tour-banner">
                            ${tilesHtml}
                        </div>
                        <div class="onboarding-tour-body">
                            <h2 class="component-modal-title">${step.title}</h2>
                            <p class="component-modal-desc step-modal-desc">
                                ${step.description}
                            </p>
                            ${featuresHtml}
                            ${dotsHtml}
                            ${actionsHtml}
                        </div>
                    </div>
                `;
            });

            return `
                <div class="onboarding-tour-modal-wrapper">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="onboarding-tour-container step-modal-content">
                        ${stepsHtml}
                    </div>
                </div>
            `;
        }
    },

    onboardingTourModal: {
        noPadding: true,
        build: (data = {}) => {
            const steps = data.steps || [];
            const modalId = data.modalId || 'onboarding-tour';
            
            let stepsHtml = '';
            steps.forEach((step, idx) => {
                const isActive = idx === 0 ? 'active' : '';
                const stepNum = idx + 1;

                let tilesHtml = '';
                const stepIcons = step.icons || ['info'];
                stepIcons.forEach(icon => {
                    tilesHtml += `
                        <div class="onboarding-tour-icon-tile">
                            <span class="material-symbols-rounded msr-${icon}">${icon}</span>
                        </div>
                    `;
                });

                let dotsHtml = '';
                if (steps.length > 1) {
                    dotsHtml = `<div class="step-modal-dots">`;
                    steps.forEach((_, dotIdx) => {
                        const isDotActive = dotIdx === idx ? 'active' : '';
                        dotsHtml += `<div class="step-modal-dot ${isDotActive}" data-step-target="${modalId}-step-${dotIdx + 1}"></div>`;
                    });
                    dotsHtml += `</div>`;
                }

                let actionsHtml = '';
                const backBtn = idx > 0 ? `
                    <button class="component-button component-button--h40 component-button--ghost" data-step-target="${modalId}-step-${idx}">
                        ${window.__('btn_back')}
                    </button>
                ` : '';

                if (idx < steps.length - 1) {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            ${backBtn}
                            <button class="component-button component-button--primary component-button--h40" data-step-target="${modalId}-step-${stepNum + 1}">
                                ${window.__('onboarding_btn_next')}
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            ${backBtn}
                            <button class="component-button component-button--primary component-button--h40" data-modal-action="finish">
                                ${window.__('onboarding_btn_finish')}
                            </button>
                        </div>
                    `;
                }

                let featuresHtml = '';
                if (step.features && step.features.length > 0) {
                    featuresHtml = `<div class="welcome-features-list">`;
                    step.features.forEach(feat => {
                        featuresHtml += `
                            <div class="welcome-feature-item">
                                <div class="welcome-feature-icon">
                                    <span class="material-symbols-rounded component-icon-sm">${feat.icon || 'star'}</span>
                                </div>
                                <div class="welcome-feature-text">
                                    <span class="welcome-feature-title">${feat.title}</span>
                                    <span class="welcome-feature-desc">${feat.description}</span>
                                </div>
                            </div>
                        `;
                    });
                    featuresHtml += `</div>`;
                }

                stepsHtml += `
                    <div class="step-modal-step onboarding-tour-step ${isActive}" data-ref="${modalId}-step-${stepNum}">
                        <div class="onboarding-tour-banner">
                            ${tilesHtml}
                        </div>
                        <div class="onboarding-tour-body">
                            <h2 class="component-modal-title">${step.title}</h2>
                            <p class="component-modal-desc step-modal-desc">
                                ${step.description}
                            </p>
                            ${featuresHtml}
                            ${dotsHtml}
                            ${actionsHtml}
                        </div>
                    </div>
                `;
            });

            return `
                <div class="onboarding-tour-modal-wrapper">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="onboarding-tour-container step-modal-content">
                        ${stepsHtml}
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
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_activate')}</button>
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
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete')}</button>
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
        build: (data = {}) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('title_verify_email')}</h2>
                <p class="component-modal-desc">${__('desc_verify_email').replace(':email', `<b>${data.email || ''}</b>`)}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" data-ref="modal_email_code" class="component-input-field" placeholder=" " maxlength="14">
                    <label class="component-input-label">${__('lbl_verification_code')}</label>
                </div>
                
                <div class="component-link-container component-link-container--start">
                    <span class="component-link-text">${__('txt_not_received_code')}</span>
                    <span class="component-link disabled-interaction" data-action="dialogResendCode">${__('btn_resend_code')} (60)</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_verify')}</button>
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
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_revoke_all')}</button>
            </div>
        `
    },

    confirmDeleteAccountDialog: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${__('del_acc_modal_title')}</h2>
                <p class="component-modal-desc">${__('del_acc_warning')}</p>
            </div>
            <div class="component-modal-body">
                ${renderVerificationInput({ inputRef: 'modal_delete_password', label: __('lbl_password') })}
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete_account')}</button>
            </div>
        `
    },

    warning: {
        build: (data = {}) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.titleKey ? __(data.titleKey) : __('title_warning')}</h2>
                <p class="component-modal-desc">${data.descHtml || (data.descKey ? __(data.descKey) : __('desc_warning'))}</p>
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
                <button class="component-button component-button--h40 ${data.dangerBtn ? 'component-button--danger' : 'component-button--primary'}" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
            </div>
        `
    },

    confirmAction: {
        build: (data = {}) => `
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
        build: (data = {}) => `
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

    verifyPasswordDialog: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
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
            const confirmClass = data.confirmClass || 'component-button--primary';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    ${renderVerificationInput({ inputRef: 'modal_verify_password', label: passwordLblText, autocomplete: 'current-password' })}
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${cancelBtnText}</button>
                    <button class="component-button component-button--h40 ${confirmClass}" data-modal-action="confirm">${confirmBtnText}</button>
                </div>
            `;
        }
    },

    confirmRemoveMembers: {
        build: (data = {}) => ModalTemplates.confirmAction.build({
            titleKey: 'title_remove_member',
            descHtml: __('desc_remove_member').replace(':count', data.count || 1),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_remove'
        })
    },

    confirmLeaveCanvas: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_leave_canvas',
            descKey: 'desc_confirm_leave_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_leave_canvas'
        })
    },

    offlineResizeModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const currentSize = data.currentSize || '64x64';
            const userTier = parseInt(data.userTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
            const isOffline = data.isOfflineMode !== false;
            const hasActiveSchedule = !isOffline && !!data.resizeActive && !!data.nextResizeAt;

            const sizesList = {
                "32x32": { label: "32x32", icon: "crop_square", tier: 0 },
                "64x64": { label: "64x64", icon: "crop_square", tier: 0 },
                "128x64": { label: "128x64", icon: "aspect_ratio", tier: 0 },
                "128x128": { label: "128x128", icon: "aspect_ratio", tier: 1 },
                "256x128": { label: "256x128", icon: "aspect_ratio", tier: 1 },
                "256x256": { label: "256x256", icon: "grid_4x4", tier: 1 },
                "512x256": { label: "512x256", icon: "aspect_ratio", tier: 1 },
                "512x512": { label: "512x512", icon: "grid_on", tier: 1 },
                "1024x512": { label: "1024x512", icon: "aspect_ratio", tier: 2 },
                "1024x1024": { label: "1024x1024", icon: "grid_on", tier: 2 },
                "2048x1024": { label: "2048x1024", icon: "aspect_ratio", tier: 2 },
                "2048x2048": { label: "2048x2048", icon: "grid_on", tier: 2 },
                "4096x2048": { label: "4096x2048", icon: "aspect_ratio", tier: 3 },
                "4096x4096": { label: "4096x4096", icon: "grid_on", tier: 3 }
            };

            const currentMeta = sizesList[currentSize] || { label: currentSize, icon: "aspect_ratio", tier: 0 };
            const activeTargetSize = data.resizeTargetSize || currentSize;

            let instantSizesHtml = '';
            for (const [val, meta] of Object.entries(sizesList)) {
                const reqTier = meta.tier ?? 0;
                const isAllowed = userTier >= reqTier;
                const disabledClass = isAllowed ? '' : 'disabled-interaction';
                const tierName = getDynamicTierName(reqTier);
                const lockBadge = !isAllowed
                    ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${escapeHTML(tierName)}</span>`
                    : '';

                const isInstantActive = (val === currentSize && isAllowed);
                instantSizesHtml += `
                    <div class="component-menu-link ${isInstantActive ? 'active' : ''} ${disabledClass}"
                         data-action="${isAllowed ? 'selectOfflineResizeSize' : ''}"
                         data-type="offline_resize_size"
                         data-value="${escapeHTML(val)}"
                         data-label="${escapeHTML(meta.label)}"
                         data-icon="${escapeHTML(meta.icon)}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">${escapeHTML(meta.icon)}</span></div>
                        <div class="component-menu-link-text">
                            <span>${escapeHTML(meta.label)}</span>
                        </div>
                        ${lockBadge}
                    </div>
                `;
            }
            const defaultDateObj = new Date(Date.now() + 86400000);
            defaultDateObj.setHours(23, 59, 0, 0);
            const initialDateObj = data.nextResizeAt ? (parseUtcToLocalDate(data.nextResizeAt) || defaultDateObj) : defaultDateObj;
            const defaultResizeIso = formatLocalDateTimeToInput(initialDateObj);
            const initialSchedDetails = getScheduledTimeDetails(initialDateObj);
            const defaultResizeDisplay = initialSchedDetails.formattedDateShort;

            const pad = n => String(n).padStart(2, '0');
            const hh = pad(initialDateObj.getHours());
            const mm = pad(initialDateObj.getMinutes());

            const scheduledOptionClass = isOffline ? 'disabled-interaction' : '';
            const scheduledBadge = isOffline
                ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${__('lbl_offline_not_available')}</span></span>`
                : '';

            const activeSchedDetails = hasActiveSchedule ? getScheduledTimeDetails(data.nextResizeAt) : null;

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                ${hasActiveSchedule ? `
                <!-- STEP ACTIVE: Vista de Expansión Programada Activa -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="offline-resize-step-active">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('canvas_resize_active_title') || 'Expansión programada activa'}</h2>
                        <p class="component-modal-desc">${__('lbl_scheduled_expansion_active_desc') || 'Hay una expansión programada pendiente para este lienzo.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full disabled-interaction">
                                <span class="material-symbols-rounded">aspect_ratio</span>
                                <span class="component-dropdown-text">${escapeHTML(activeTargetSize)} px</span>
                                <span class="component-badge component-badge--sm">${__('lbl_target_size') || 'Tamaño objetivo'}</span>
                            </div>
                        </div>

                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full disabled-interaction">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text">${escapeHTML(activeSchedDetails.formattedDate)}</span>
                                <span class="component-badge component-badge--sm">${escapeHTML(activeSchedDetails.timezoneString)}</span>
                            </div>
                        </div>

                        <div class="component-alert component-alert--info active">
                            <div class="component-alert-icon">
                                <span class="material-symbols-rounded">timer</span>
                            </div>
                            <div class="component-alert-text">
                                <div style="font-weight: 600;" data-ref="active-schedule-countdown">${escapeHTML(activeSchedDetails.relativeTimeStr)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--danger component-button--h40" data-action="cancelScheduledResize" data-id="${escapeHTML(data.canvasId || '')}">
                            <span>${__('btn_cancel_schedule') || 'Cancelar programación'}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="rescheduleOfflineResize">
                            <span>${__('btn_reschedule') || 'Reprogramar'}</span>
                        </button>
                    </div>
                </div>
                ` : ''}

                <!-- STEP 1: Tipo de Expansión & Fecha si es programada -->
                <div class="component-card--grouped component-card--flush ${hasActiveSchedule ? 'disabled' : 'active'} component-modal-step" data-ref="offline-resize-step-1" data-selected-type="${hasActiveSchedule ? 'scheduled' : 'instant'}">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('canvas_resize_title') || 'Expandir Lienzo'}</h2>
                        <p class="component-modal-desc">${__('canvas_resize_desc') || 'Aumenta el espacio disponible para dibujar píxeles.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResizeType" data-ref="offline-resize-type-trigger" data-value="${hasActiveSchedule ? 'scheduled' : 'instant'}">
                                <span class="material-symbols-rounded" data-ref="offline-resize-type-icon">${hasActiveSchedule ? 'schedule' : 'flash_on'}</span>
                                <span class="component-dropdown-text" data-ref="offline-resize-type-label">${hasActiveSchedule ? (__('canvas_resize_active_title') || 'Programada') : (__('canvas_resize_now_title') || 'Inmediata')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResizeType">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${hasActiveSchedule ? '' : 'active'}" data-action="selectResizeTypeOption" data-value="instant" data-label="${__('canvas_resize_now_title') || 'Inmediata'}" data-icon="flash_on">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                            <div class="component-menu-link-text"><span>${__('canvas_resize_now_title') || 'Inmediata'}</span></div>
                                        </div>
                                        <div class="component-menu-link ${hasActiveSchedule ? 'active' : ''} ${scheduledOptionClass}" data-action="${isOffline ? '' : 'selectResizeTypeOption'}" data-value="scheduled" data-label="${__('canvas_resize_active_title') || 'Programada'}" data-icon="schedule">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span>${__('canvas_resize_active_title') || 'Programada'}</span></div>
                                            ${scheduledBadge}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Trigger para abrir la etapa del calendario -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full ${hasActiveSchedule ? '' : 'disabled'}" data-ref="offline-resize-scheduled-date-container">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResizeDateStep" data-ref="offline-resize-datetime-trigger" data-value="${defaultResizeIso}">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="offline-resize-datetime-text">${defaultResizeDisplay}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>

                            <!-- Resumen informativo de fecha, zona horaria y tiempo restante -->
                            <div class="component-alert component-alert--info active" data-ref="offline-resize-schedule-info" style="margin-top: 8px;">
                                <div class="component-alert-icon">
                                    <span class="material-symbols-rounded" data-ref="offline-resize-info-icon">schedule</span>
                                </div>
                                <div class="component-alert-text">
                                    <div style="font-weight: 600;" data-ref="offline-resize-info-date">${initialSchedDetails.formattedDate}</div>
                                    <div class="component-text-muted" style="font-size: 0.72rem; margin-top: 2px;" data-ref="offline-resize-info-time">
                                        <span data-ref="offline-resize-info-relative">${initialSchedDetails.relativeTimeStr}</span> · <span data-ref="offline-resize-info-tz">${initialSchedDetails.timezoneString} (${__('lbl_timezone_local') || 'Hora local'})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        ${hasActiveSchedule ? `
                        <button class="component-button component-button--h40" data-action="backToActiveResizeStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        ` : `
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        `}
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResizeNextStep">
                            <span>${__('btn_continue')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP CALENDAR: Etapa de Selección de Fecha -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-resize-step-calendar">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('calendar_modal_title') || 'Seleccionar fecha'}</h2>
                        <p class="component-modal-desc">${__('lbl_scheduled_datetime') || 'Fecha y hora exacta en la que se aplicará el ajuste.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-calendar">
                            <div class="component-calendar-header">
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                                <div class="component-calendar-title" data-ref="calendar-title">${__('calendar_month_year') || 'Mes Año'}</div>
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                            <div class="component-calendar-weekdays">
                                <span>${__('cal_su') || 'Do'}</span><span>${__('cal_mo') || 'Lu'}</span><span>${__('cal_tu') || 'Ma'}</span><span>${__('cal_we') || 'Mi'}</span><span>${__('cal_th') || 'Ju'}</span><span>${__('cal_fr') || 'Vi'}</span><span>${__('cal_sa') || 'Sá'}</span>
                            </div>
                            <div class="component-calendar-days" data-ref="calendar-days"></div>
                        </div>

                        <!-- Trigger compacto para ajustar hora -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full" style="margin-top: 12px;">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResizeTimeStep" data-ref="offline-resize-time-trigger">
                                <span class="material-symbols-rounded">schedule</span>
                                <span class="component-dropdown-text"><span class="component-text-muted" style="margin-right: 4px;">${__('lbl_configured_time') || 'Hora'}:</span> <strong data-ref="offline-resize-time-text">${hh}:${mm}</strong></span>
                                <span class="component-badge component-badge--sm">${activeSchedDetails ? activeSchedDetails.timezoneString : getUserTimezoneString()}</span>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResizePrevDateStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResizeConfirmDate">
                            <span>${__('btn_accept')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP TIME: Etapa de Ajuste de Hora y Minutos -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-resize-step-time">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('lbl_time_picker_title') || 'Ajustar hora'}</h2>
                        <p class="component-modal-desc">${__('lbl_time_picker_desc') || 'Define la hora y minutos exactos para la ejecución.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="calendar-modal-controls">
                            <div class="calendar-control-column">
                                <div class="calendar-control-label">${__('lbl_hours') || 'Horas'}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${hh}">${hh}</div>
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
                            <div class="calendar-control-column">
                                <div class="calendar-control-label">${__('lbl_minutes') || 'Minutos'}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${mm}">${mm}</div>
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

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResizePrevTimeStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResizeConfirmTime">
                            <span>${__('btn_accept')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2: Selección del nuevo tamaño -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-resize-step-2">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('canvas_resize_instant_size_title') || 'Nuevo tamaño'}</h2>
                        <p class="component-modal-desc">${__('canvas_resize_instant_size_desc') || 'Selecciona el tamaño deseado para el lienzo.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="dropdownOfflineResizeSizes" data-ref="offline-resize-trigger" data-value="${escapeHTML(currentSize)}">
                                <span class="material-symbols-rounded" data-ref="offline-resize-icon">${escapeHTML(currentMeta.icon)}</span>
                                <span class="component-dropdown-text" data-ref="offline-resize-label">${escapeHTML(currentMeta.label)}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>

                            <div class="component-module component-module--dropdown disabled" data-module="dropdownOfflineResizeSizes">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        ${instantSizesHtml}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-alert-error" data-ref="offline-resize-shrink-warning">
                            ${__('canvas_resize_warning_desc') || 'Al reducir el tamaño se podrían recortar trazos fuera del límite.'}
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResizePrevStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitOfflineResizeUnified">
                            <span>${__('btn_confirm')}</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    offlineResetModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const isOffline = data.isOfflineMode !== false;
            const canTakeSnapshot = data.canTakeSnapshot !== false;
            const hasActiveSchedule = !isOffline && !!data.resetActive && !!data.nextResetAt;

            const defaultDateObj = new Date(Date.now() + 86400000);
            defaultDateObj.setHours(23, 59, 0, 0);
            const initialDateObj = data.nextResetAt ? (parseUtcToLocalDate(data.nextResetAt) || defaultDateObj) : defaultDateObj;
            const defaultResetIso = formatLocalDateTimeToInput(initialDateObj);
            const initialSchedDetails = getScheduledTimeDetails(initialDateObj);
            const defaultResetDisplay = initialSchedDetails.formattedDateShort;

            const pad = n => String(n).padStart(2, '0');
            const hh = pad(initialDateObj.getHours());
            const mm = pad(initialDateObj.getMinutes());

            const scheduledOptionClass = isOffline ? 'disabled-interaction' : '';
            const scheduledBadge = isOffline
                ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${__('lbl_offline_not_available')}</span></span>`
                : '';

            const activeSchedDetails = hasActiveSchedule ? getScheduledTimeDetails(data.nextResetAt) : null;

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                ${hasActiveSchedule ? `
                <!-- STEP ACTIVE: Vista de Reinicio Programado Activo -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="offline-reset-step-active">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('canvas_reset_active_title') || 'Reinicio programado activo'}</h2>
                        <p class="component-modal-desc">${__('lbl_scheduled_reset_active_desc') || 'Hay un reinicio programado pendiente para este lienzo.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full disabled-interaction">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text">${escapeHTML(activeSchedDetails.formattedDate)}</span>
                                <span class="component-badge component-badge--sm">${escapeHTML(activeSchedDetails.timezoneString)}</span>
                            </div>
                        </div>

                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full disabled-interaction">
                                <span class="material-symbols-rounded">photo_camera</span>
                                <span class="component-dropdown-text">${__('canvas_reset_captura_title') || 'Captura previa'}</span>
                                <span class="component-badge component-badge--sm">${data.takeSnapshot !== false ? (__('lbl_enabled') || 'Activada') : (__('lbl_disabled') || 'Desactivada')}</span>
                            </div>
                        </div>

                        <div class="component-alert component-alert--info active">
                            <div class="component-alert-icon">
                                <span class="material-symbols-rounded">timer</span>
                            </div>
                            <div class="component-alert-text">
                                <div style="font-weight: 600;" data-ref="active-schedule-countdown">${escapeHTML(activeSchedDetails.relativeTimeStr)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--danger component-button--h40" data-action="cancelScheduledReset" data-id="${escapeHTML(data.canvasId || '')}">
                            <span>${__('btn_cancel_schedule') || 'Cancelar programación'}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="rescheduleOfflineReset">
                            <span>${__('btn_reschedule') || 'Reprogramar'}</span>
                        </button>
                    </div>
                </div>
                ` : ''}

                <!-- STEP 1: Tipo de Reinicio & Fecha si es programada -->
                <div class="component-card--grouped component-card--flush ${hasActiveSchedule ? 'disabled' : 'active'} component-modal-step" data-ref="offline-reset-step-1" data-selected-type="${hasActiveSchedule ? 'scheduled' : 'instant'}">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('canvas_resets_title') || 'Reiniciar Lienzo'}</h2>
                        <p class="component-modal-desc">${__('canvas_resets_desc') || 'Limpia los trazos del lienzo o programa un reinicio.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResetType" data-ref="offline-reset-type-trigger" data-value="${hasActiveSchedule ? 'scheduled' : 'instant'}">
                                <span class="material-symbols-rounded" data-ref="offline-reset-type-icon">${hasActiveSchedule ? 'schedule' : 'flash_on'}</span>
                                <span class="component-dropdown-text" data-ref="offline-reset-type-label">${hasActiveSchedule ? (__('canvas_reset_active_title') || 'Programado') : (__('canvas_reset_now_title') || 'Inmediato')}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResetType">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link ${hasActiveSchedule ? '' : 'active'}" data-action="selectResetTypeOption" data-value="instant" data-label="${__('canvas_reset_now_title') || 'Inmediato'}" data-icon="flash_on">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                            <div class="component-menu-link-text"><span>${__('canvas_reset_now_title') || 'Inmediato'}</span></div>
                                        </div>
                                        <div class="component-menu-link ${hasActiveSchedule ? 'active' : ''} ${scheduledOptionClass}" data-action="${isOffline ? '' : 'selectResetTypeOption'}" data-value="scheduled" data-label="${__('canvas_reset_active_title') || 'Programado'}" data-icon="schedule">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                            <div class="component-menu-link-text"><span>${__('canvas_reset_active_title') || 'Programado'}</span></div>
                                            ${scheduledBadge}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Trigger para abrir la etapa del calendario -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full ${hasActiveSchedule ? '' : 'disabled'}" data-ref="offline-reset-scheduled-date-container">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResetDateStep" data-ref="offline-reset-datetime-trigger" data-value="${defaultResetIso}">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span class="component-dropdown-text" data-ref="offline-reset-datetime-text">${defaultResetDisplay}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>

                            <!-- Resumen informativo de fecha, zona horaria y tiempo restante -->
                            <div class="component-alert component-alert--info active" data-ref="offline-reset-schedule-info" style="margin-top: 8px;">
                                <div class="component-alert-icon">
                                    <span class="material-symbols-rounded" data-ref="offline-reset-info-icon">schedule</span>
                                </div>
                                <div class="component-alert-text">
                                    <div style="font-weight: 600;" data-ref="offline-reset-info-date">${initialSchedDetails.formattedDate}</div>
                                    <div class="component-text-muted" style="font-size: 0.72rem; margin-top: 2px;" data-ref="offline-reset-info-time">
                                        <span data-ref="offline-reset-info-relative">${initialSchedDetails.relativeTimeStr}</span> · <span data-ref="offline-reset-info-tz">${initialSchedDetails.timezoneString} (${__('lbl_timezone_local') || 'Hora local'})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        ${hasActiveSchedule ? `
                        <button class="component-button component-button--h40" data-action="backToActiveResetStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        ` : `
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        `}
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResetNextStep">
                            <span>${__('btn_continue')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP CALENDAR: Etapa de Selección de Fecha -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-reset-step-calendar">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('calendar_modal_title') || 'Seleccionar fecha'}</h2>
                        <p class="component-modal-desc">${__('lbl_scheduled_datetime') || 'Fecha y hora exacta en la que se ejecutará el reinicio.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-calendar">
                            <div class="component-calendar-header">
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                                <div class="component-calendar-title" data-ref="calendar-title">${__('calendar_month_year') || 'Mes Año'}</div>
                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                            <div class="component-calendar-weekdays">
                                <span>${__('cal_su') || 'Do'}</span><span>${__('cal_mo') || 'Lu'}</span><span>${__('cal_tu') || 'Ma'}</span><span>${__('cal_we') || 'Mi'}</span><span>${__('cal_th') || 'Ju'}</span><span>${__('cal_fr') || 'Vi'}</span><span>${__('cal_sa') || 'Sá'}</span>
                            </div>
                            <div class="component-calendar-days" data-ref="calendar-days"></div>
                        </div>

                        <!-- Trigger compacto para ajustar hora -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full" style="margin-top: 12px;">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResetTimeStep" data-ref="offline-reset-time-trigger">
                                <span class="material-symbols-rounded">schedule</span>
                                <span class="component-dropdown-text"><span class="component-text-muted" style="margin-right: 4px;">${__('lbl_configured_time') || 'Hora'}:</span> <strong data-ref="offline-reset-time-text">${hh}:${mm}</strong></span>
                                <span class="component-badge component-badge--sm">${activeSchedDetails ? activeSchedDetails.timezoneString : getUserTimezoneString()}</span>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResetPrevDateStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResetConfirmDate">
                            <span>${__('btn_accept')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP TIME: Etapa de Ajuste de Hora y Minutos -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-reset-step-time">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('lbl_time_picker_title') || 'Ajustar hora'}</h2>
                        <p class="component-modal-desc">${__('lbl_time_picker_desc') || 'Define la hora y minutos exactos para la ejecución.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="calendar-modal-controls">
                            <div class="calendar-control-column">
                                <div class="calendar-control-label">${__('lbl_hours') || 'Horas'}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${hh}">${hh}</div>
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
                            <div class="calendar-control-column">
                                <div class="calendar-control-label">${__('lbl_minutes') || 'Minutos'}</div>
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${mm}">${mm}</div>
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

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResetPrevTimeStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResetConfirmTime">
                            <span>${__('btn_accept')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2: Confirmación y opciones -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-reset-step-2">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('title_confirm_reset_now') || 'Confirmar reinicio'}</h2>
                        <p class="component-modal-desc">${__('desc_confirm_reset_now') || 'Esta acción borrará todos los píxeles actuales del lienzo.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">${__('canvas_reset_captura_title') || 'Crear captura previa'}</h2>
                                    <p class="component-card__description">${__('take_photo_before_reset') || 'Guarda una copia del estado actual antes de reiniciar.'}</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="offline_reset_snapshot" ${canTakeSnapshot ? 'checked' : 'disabled'}>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResetPrevStep">
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--danger component-button--h40" data-action="submitOfflineResetUnified">
                            <span>${__('btn_reset_now') || 'Reiniciar ahora'}</span>
                        </button>
                    </div>
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
                <h2 class="component-modal-title">${__('admin_tier_delete_title')}</h2>
                <p class="component-modal-desc">${__('admin_tier_delete_desc')} ${data.tierName || ''}?</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_confirm_delete')}</button>
            </div>
        `
    },

    verifyPasswordDeleteUsers: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_users',
            descHtml: __('desc_verify_delete_users').replace(':count', data.count || 0),
            confirmKey: 'btn_destroy_users'
        })
    },

    verifyPasswordDeleteCanvases: {
        build: (data = {}) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_canvases',
            descHtml: __('desc_verify_delete_canvases').replace(':count', data.count || 1),
            confirmKey: 'btn_delete_canvas'
        })
    },

    verifyPasswordDeleteCanvas: {
        build: (data = {}) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_canvases',
            descHtml: __('desc_verify_delete_canvases').replace(':count', 1),
            confirmKey: 'btn_delete_canvas'
        })
    },

    confirmPermanentDeleteCanvases: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_canvases').replace(':count', data.count || 1),
            confirmKey: 'btn_perm_delete_canvas',
            confirmClass: 'component-button--danger'
        })
    },

    confirmPermanentDeleteTemplates: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_templates').replace(':count', data.count || 1),
            confirmKey: 'btn_perm_delete_canvas',
            confirmClass: 'component-button--danger'
        })
    },

    confirmPermanentDeleteTrash: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_mixed').replace(':count', data.count || 1),
            confirmKey: 'btn_perm_delete_canvas',
            confirmClass: 'component-button--danger'
        })
    },

    verifyPasswordPermanentDeleteCanvases: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_canvases').replace(':count', data.count || 0),
            confirmKey: 'btn_perm_delete_canvas'
        })
    },

    verifyPasswordPermanentDeleteTemplates: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_templates').replace(':count', data.count || 0),
            confirmKey: 'btn_perm_delete_canvas'
        })
    },

    verifyPasswordPermanentDeleteTrash: {
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_perm_delete_canvases',
            descHtml: __('desc_verify_perm_delete_mixed').replace(':count', data.count || 0),
            confirmKey: 'btn_perm_delete_canvas'
        })
    },

    verifyPasswordUpdateRole: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_roles_desc',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordUpdateStatus: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_status_desc',
            confirmKey: 'tooltip_save_status'
        })
    },

    verifyPasswordSaveConfig: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_config',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordSaveAutomation: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_automation',
            confirmKey: 'btn_verify_execute'
        })
    },

    verifyPasswordRestoreBackup: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'admin_verify_identity_title',
            descKey: 'admin_verify_identity_desc_restore',
            confirmKey: 'btn_confirm_restore',
            confirmClass: 'component-button--danger'
        })
    },

    joinLiveShare: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h3 class="component-modal-title">${__('title_join_live_share')}</h3>
                <p class="component-modal-desc">${__('desc_join_live_share')}</p>
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
                <button class="component-button component-button--primary component-button--h40" data-action="submitJoinLive">${__('btn_join')}</button>
            </div>
        `
    },

    joinCanvasTerms: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h3 class="component-modal-title">${window.__('terms_and_conditions')}</h3>
                <p class="component-modal-desc">${window.__('join_accept_rules_desc')}</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${window.__('btn_accept')}</button>
            </div>
        `
    },

    confirmDeleteMessage: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_action',
            descHtml: __('confirm_delete_message'),
            confirmClass: 'component-button--danger'
        })
    },

    deleteMessageDialog: {
        build: () => {
            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.delete_messages : [];
            const reasonsHtml = reasons.map(r => `
                <div class="component-menu-link" data-action="selectReportReason" data-value="${r.key}" data-icon="${r.icon}" data-text="${__('report_reason_' + r.key)}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                    <div class="component-menu-link-text"><span>${__('report_reason_' + r.key)}</span></div>
                </div>
            `).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('admin_msg_delete_title')}</h2>
                    <p class="component-modal-desc">${__('admin_msg_delete_desc')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason" data-ref="report_reason" data-value="">
                            <span class="material-symbols-rounded" data-ref="report_trigger_icon">delete</span>
                            <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder')}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    ${reasonsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_delete')}</button>
                </div>
            `;
        }
    },

    reportMessageDialog: {
        build: () => {
            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.report_messages : [];
            const reasonsHtml = reasons.map(r => `
                <div class="component-menu-link" data-action="selectReportReason" data-value="${r.key}" data-icon="${r.icon}" data-text="${__('report_reason_' + r.key)}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                    <div class="component-menu-link-text"><span>${__('report_reason_' + r.key)}</span></div>
                </div>
            `).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('report_title')}</h2>
                    <p class="component-modal-desc">${__('report_desc')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleReportReason" data-ref="report_reason" data-value="">
                            <span class="material-symbols-rounded" data-ref="report_trigger_icon">report</span>
                            <span class="component-dropdown-text" data-ref="report_trigger_text">${__('report_select_reason_placeholder')}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    ${reasonsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_report')}</button>
                </div>
            `;
        }
    },

    downgradeCanvasModal: {
        build: (data = {}) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: data.titleKey || 'downgrade_basic_title',
            descKey: data.descKey || 'downgrade_basic_message',
            confirmKey: 'btn_confirm'
        })
    },

    confirmInjectTemplate: {
        build: (data = {}) => {
            const cost = data.cost || 0;
            const balance = data.balance || 0;
            const remaining = Math.max(0, balance - cost);
            const msgConfirm = __('confirm_inject_template');
            const tokenInfo = `(${__('lbl_cost')}: ${cost.toLocaleString()} tokens Â· ${__('lbl_remaining_balance')}: ${remaining.toLocaleString()} tokens)`;
            const desc = `${msgConfirm} ${tokenInfo}`;
            
            return ModalTemplates.confirmAction.build({
                titleKey: 'title_confirm_action',
                descHtml: desc,
                confirmClass: 'component-button--warning'
            });
        }
    },
    confirmUnlinkGoogleModal: {
        build: (data = {}) => {
            const googleName = data.googleName || '';
            const userEmail = data.userEmail || '';
            const appName = window.APP_NAME || 'Rosaura';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${window.__('title_confirm_unlink_google').replace(':googleName', googleName)}</h2>
                    <p class="component-modal-desc">
                        ${window.__('desc_confirm_unlink_google').replace(':appName', appName).replace(':userEmail', userEmail)}
                    </p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${window.__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${window.__('btn_disconnect')}</button>
                </div>
            `;
        }
    },

    confirmUpgradeModal: {
        build: (data = {}) => {
            const isUpgrade = data.isUpgrade || false;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_purchase', []);
            const disclaimerStr = __('upgrade_disclaimer');
            const passwordLabel = __('lbl_account_password');
            const btnCancel = __('btn_cancel');
            const btnConfirm = __('btn_confirm');

            const passwordFieldHtml = isUpgrade ? `
                <div class="component-modal-body">
                    ${renderVerificationInput({ inputId: 'confirmPurchasePasswordInput', inputRef: 'confirmPurchasePasswordInput', label: passwordLabel, autocomplete: 'current-password' })}
                </div>
            ` : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${disclaimerStr}</p>
                </div>
                ${passwordFieldHtml}
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    confirmPasswordModal: {
        build: (data = {}) => {
            const title = data.title || __('login_2fa_title');
            const desc = data.desc || __('2fa_verify_desc');
            const confirmText = data.confirmText || __('btn_confirm');
            const confirmClass = data.confirmDanger ? 'component-button--danger' : 'component-button--primary';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    ${renderVerificationInput({ inputId: 'confirmSecPasswordInput', inputRef: 'confirmSecPasswordInput', label: __('lbl_account_password'), autocomplete: 'current-password' })}
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button ${confirmClass} component-button--h40" data-modal-action="confirm">${confirmText}</button>
                </div>
            `;
        }
    },

    confirmClearAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_clear_area');
            const descRaw = __('desc_confirm_clear_area');
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel');
            const btnConfirm = __('btn_clear_area');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    confirmProtectAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_protect_area');
            const descRaw = __('desc_confirm_protect_area');
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel');
            const btnProtect = __('btn_protect_area');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--success" data-modal-action="protect">${btnProtect}</button>
                </div>
            `;
        }
    },

    confirmDeleteTemplateModal: {
        build: (data = {}) => {
            const templateId = data.templateId || '';
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_delete_template');
            const descStr = __('desc_confirm_delete_template');
            const btnCancel = __('btn_cancel');
            const btnConfirm = __('btn_delete_confirm');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-action="confirmDeleteTemplate" data-id="${templateId}">
                        <span>${btnConfirm}</span>
                    </button>
                </div>
            `;
        }
    },

    confirmUnprotectAreaModal: {
        build: (data = {}) => {
            const count = data.count || 0;
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            const titleStr = __('title_confirm_unprotect_area');
            const descRaw = __('desc_confirm_unprotect_area');
            const descStr = descRaw.replace(':count', `<strong>${count}</strong>`);
            const btnCancel = __('btn_cancel');
            const btnRemove = __('btn_remove_protection');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${titleStr}</h2>
                    <p class="component-modal-desc">${descStr}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--danger" data-modal-action="unprotect">${btnRemove}</button>
                </div>
            `;
        }
    },

    manageSanctionModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const username = data.username || '';
            const sanctionScope = data.sanctionScope || 'chat_mute';
            const suspensionType = data.suspensionType || 'temporary';
            const suspensionReason = data.suspensionReason || '';
            const endDate = data.endDate ? data.endDate.replace(' ', 'T').substring(0, 16) : '';
            let sanctionHours = '00';
            let sanctionMinutes = '00';
            if (endDate) {
                const parts = endDate.split('T');
                if (parts[1]) {
                    const timeParts = parts[1].split(':');
                    sanctionHours = (timeParts[0] || '00').padStart(2, '0');
                    sanctionMinutes = (timeParts[1] || '00').padStart(2, '0');
                }
            }

            const scopes = [
                { key: 'chat_mute', label: __('sanction_scope_chat_mute'), icon: 'speaker_notes_off' },
                { key: 'canvas_ban', label: __('sanction_scope_canvas_ban'), icon: 'block' }
            ];

            const types = [
                { key: 'temporary', label: __('suspension_temp'), icon: 'timer' },
                { key: 'permanent', label: __('suspension_perm'), icon: 'all_inclusive' }
            ];

            const reasons = window.APP_SANCTION_REASONS ? window.APP_SANCTION_REASONS.suspensions : [];

            const activeScope = scopes.find(s => s.key === sanctionScope) || scopes[0];
            const activeType = types.find(t => t.key === suspensionType) || types[0];
            
            const activeReason = reasons.find(r => r.key === suspensionReason);
            const activeReasonKey = activeReason ? activeReason.key : '';
            const activeReasonLabel = activeReason ? __(activeReason.key) : __('lbl_select_suspension_reason');
            const activeReasonIcon = activeReason ? activeReason.icon : 'gavel';

            const scopeOptionsHtml = scopes.map(s => `
                <div class="component-menu-link ${s.key === activeScope.key ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="sanction_scope" data-value="${s.key}" data-icon="${s.icon}" data-text="${s.label}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${s.icon}</span></div>
                    <div class="component-menu-link-text"><span>${s.label}</span></div>
                </div>
            `).join('');

            const typeOptionsHtml = types.map(t => `
                <div class="component-menu-link ${t.key === activeType.key ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="suspension_type" data-value="${t.key}" data-icon="${t.icon}" data-text="${t.label}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">${t.icon}</span></div>
                    <div class="component-menu-link-text"><span>${t.label}</span></div>
                </div>
            `).join('');

            const reasonOptionsHtml = reasons.map(r => {
                const label = __(r.key) || r.key;
                return `
                    <div class="component-menu-link ${r.key === activeReasonKey ? 'active' : ''}" data-action="selectSanctionDropdownOption" data-target-input="suspension_reason" data-value="${r.key}" data-icon="${r.icon}" data-text="${label}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">${r.icon}</span></div>
                        <div class="component-menu-link-text"><span>${label}</span></div>
                    </div>
                `;
            }).join('');

            const endDateDisplay = endDate ? endDate.split('T')[0] : __('lbl_select_expiration_date');
            const isPermanent = suspensionType === 'permanent';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('canvases_sanctions_title')}: ${username}</h2>
                    <p class="component-modal-desc" data-ref="sanction-step-desc">${__('desc_chat_restriction')}</p>
                </div>
                <div class="component-modal-body">
                    <div class="step-modal-content">

                        <!-- Step 1: Formulario -->
                        <div class="step-modal-step active" data-step="1">

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSanctionScope" data-ref="sanction_scope" data-value="${activeScope.key}">
                                    <span class="material-symbols-rounded" data-ref="sanction_scope_trigger_icon">${activeScope.icon}</span>
                                    <span class="component-dropdown-text" data-ref="sanction_scope_trigger_text">${activeScope.label}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleSanctionScope">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">${scopeOptionsHtml}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionType" data-ref="suspension_type" data-value="${activeType.key}">
                                    <span class="material-symbols-rounded" data-ref="suspension_type_trigger_icon">${activeType.icon}</span>
                                    <span class="component-dropdown-text" data-ref="suspension_type_trigger_text">${activeType.label}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleSuspensionType">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">${typeOptionsHtml}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionReason" data-ref="suspension_reason" data-value="${activeReasonKey}">
                                    <span class="material-symbols-rounded" data-ref="suspension_reason_trigger_icon">${activeReasonIcon}</span>
                                    <span class="component-dropdown-text" data-ref="suspension_reason_trigger_text">${activeReasonLabel}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleSuspensionReason">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">${reasonOptionsHtml}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full modal-end-date-group ${isPermanent ? 'disabled' : ''}">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="sanctionNextStep" data-ref="end_date" data-value="${endDate}">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="sanction-endDate-text">${endDateDisplay}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Calendario inline -->
                        <div class="step-modal-step disabled" data-step="2">
                            <div class="component-calendar">
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

                            <!-- Trigger compacto para ajustar hora -->
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full" style="margin-top: 12px;">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="sanctionTimeStep" data-ref="sanction-time-trigger">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span class="component-dropdown-text"><span class="component-text-muted" style="margin-right: 4px;">${__('lbl_configured_time') || 'Hora'}:</span> <strong data-ref="sanction-time-text">${sanctionHours}:${sanctionMinutes}</strong></span>
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Ajuste de Hora y Minutos -->
                        <div class="step-modal-step disabled" data-step="3">
                            <div class="calendar-modal-controls">
                                <div class="calendar-control-column">
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${parseInt(sanctionHours) || 23}">${sanctionHours}</div>
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
                                <div class="calendar-control-column">
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${parseInt(sanctionMinutes) || 59}">${sanctionMinutes}</div>
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
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 disabled" data-action="sanctionPrevStep" data-ref="btn-sanction-prev">${__('btn_prev')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm" data-ref="btn-sanction-confirm">${__('lbl_save_changes')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40 disabled" data-action="sanctionConfirmDate" data-ref="btn-sanction-accept">${__('btn_accept')}</button>
                </div>
            `;
        },
        getData: (container) => {
            const scopeTrigger = container.querySelector('[data-ref="sanction_scope"]');
            const typeTrigger = container.querySelector('[data-ref="suspension_type"]');
            const reasonTrigger = container.querySelector('[data-ref="suspension_reason"]');
            const endDateTrigger = container.querySelector('[data-ref="end_date"]');

            return {
                sanction_scope: scopeTrigger ? scopeTrigger.getAttribute('data-value') : 'chat_mute',
                suspension_type: typeTrigger ? typeTrigger.getAttribute('data-value') : 'temporary',
                suspension_reason: reasonTrigger ? reasonTrigger.getAttribute('data-value') : 'reason_terms',
                end_date: endDateTrigger ? endDateTrigger.getAttribute('data-value') : null
            };
        }
    },

    confirmStartBroadcast: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_start_broadcast', [])}</h2>
                    <p class="component-modal-desc">${__('desc_start_broadcast', [])}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [])}</button>
                    <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_start_broadcast', [])}</button>
                </div>
            `;
        }
    },

    confirmStopBroadcast: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_stop_broadcast', [], 'Â¿Finalizar transmisiÃ³n?')}</h2>
                    <p class="component-modal-desc">${__('desc_stop_broadcast', [])}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel', [])}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_stop_broadcast', [], 'Finalizar')}</button>
                </div>
            `;
        }
    },

    confirmLeaveLiveShare: {
        build: () => {
            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p, f) => f || k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('title_leave_broadcast')}</h2>
                    <p class="component-modal-desc">${__('desc_leave_broadcast')}</p>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--h40 component-button--danger" data-modal-action="confirm">${__('btn_leave_broadcast')}</button>
                </div>
            `;
        }
    },

    calendarModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const title = data.title || __('calendar_modal_title');
            const dateDisplay = data.dateDisplay || __('lbl_select_date');
            const hours = data.hours || '23';
            const minutes = data.minutes || '59';
            const isoDate = data.isoDate || '';
            const btnCancel = __('btn_cancel');
            const btnConfirm = __('btn_accept');

            const description = data.desc || data.description || '';
            const descHtml = description ? `<p class="component-modal-desc">${description}</p>` : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    ${descHtml}
                </div>
                <div class="component-modal-body">
                    <div class="step-modal-content">

                        <!-- Step 1: Trigger de fecha -->
                        <div class="step-modal-step active" data-step="1">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="calendarModalNextStep" data-ref="modal_selected_iso_date" data-value="${isoDate}">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="modal-calendar-date-text">${dateDisplay}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Calendario -->
                        <div class="step-modal-step disabled" data-step="2">
                            <div class="component-calendar">
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

                            <!-- Trigger compacto para ajustar hora -->
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full" style="margin-top: 12px;">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="calendarModalTimeStep" data-ref="calendar-modal-time-trigger">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span class="component-dropdown-text"><span class="component-text-muted" style="margin-right: 4px;">${__('lbl_configured_time') || 'Hora'}:</span> <strong data-ref="calendar-modal-time-text">${hours}:${minutes}</strong></span>
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Ajuste de Hora y Minutos -->
                        <div class="step-modal-step disabled" data-step="3">
                            <div class="calendar-modal-controls">
                                <div>
                                    <div class="calendar-control-label">${__('lbl_hours')}</div>
                                    <div class="component-inline-control component-inline-control--full">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                                <span class="material-symbols-rounded msr-keyboard_double_arrow_left">keyboard_double_arrow_left</span>
                                            </button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                                <span class="material-symbols-rounded msr-chevron_left">chevron_left</span>
                                            </button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${parseInt(hours) || 23}">${hours}</div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="1">
                                                <span class="material-symbols-rounded msr-chevron_right">chevron_right</span>
                                            </button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="5">
                                                <span class="material-symbols-rounded msr-keyboard_double_arrow_right">keyboard_double_arrow_right</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div class="calendar-control-label">${__('lbl_minutes')}</div>
                                    <div class="component-inline-control component-inline-control--full">
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                                <span class="material-symbols-rounded msr-keyboard_double_arrow_left">keyboard_double_arrow_left</span>
                                            </button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                                <span class="material-symbols-rounded msr-chevron_left">chevron_left</span>
                                            </button>
                                        </div>
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${parseInt(minutes) || 59}">${minutes}</div>
                                        <div class="component-inline-control__group">
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="1">
                                                <span class="material-symbols-rounded msr-chevron_right">chevron_right</span>
                                            </button>
                                            <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="5">
                                                <span class="material-symbols-rounded msr-keyboard_double_arrow_right">keyboard_double_arrow_right</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 disabled" data-action="calendarModalPrevStep" data-ref="btn-calmodal-prev">${__('btn_prev')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40 disabled" data-action="calendarModalConfirmDate" data-ref="btn-calmodal-confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    generateCanvasInviteModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const availableRoles = data.availableRoles || [];
            let defaultRole = data.defaultRole;
            if (!defaultRole && availableRoles.length > 0) {
                for (const r of availableRoles) {
                    if (String(r.name).toLowerCase() === 'viewer') {
                        defaultRole = r;
                        break;
                    }
                }
                if (!defaultRole) {
                    defaultRole = availableRoles[availableRoles.length - 1];
                }
            }

            let defIcon = (defaultRole && defaultRole.is_system) ? 'shield' : 'person';
            let defLabel = defaultRole ? defaultRole.name : __('lbl_select');
            if (defaultRole && defaultRole.is_system) {
                const roleKey = 'role.' + defaultRole.name.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
                const trans = __(roleKey);
                if (trans && trans !== roleKey) defLabel = trans;
            }

            const rolesHtml = availableRoles.map(role => {
                const rawName = role.name;
                const isSystemFlag = role.is_system || 0;
                const icon = isSystemFlag ? 'shield' : 'person';
                let translatedName = rawName;
                if (isSystemFlag) {
                    const roleKey = 'role.' + rawName.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
                    const trans = __(roleKey);
                    if (trans && trans !== roleKey) translatedName = trans;
                }
                const nameLower = rawName.toLowerCase().trim();
                const isHighRole = ['owner', 'propietario', 'superadmin', 'superadministrador'].includes(nameLower) || (role.weight !== undefined && parseInt(role.weight) >= 100);
                const isActive = (defaultRole && defaultRole.id == role.id) ? 'active' : '';
                const isDisabled = isHighRole ? 'disabled-interaction' : '';
                const tooltipAttr = isHighRole ? `data-tooltip="${__('err_cannot_generate_invite_role')}" data-position="right"` : '';

                return `
                    <div class="component-menu-link ${isActive} ${isDisabled}" data-action="selectInviteRoleDropdownOption" data-value="${role.id}" data-text="${translatedName}" data-icon="${icon}" ${tooltipAttr}>
                        <div class="component-menu-link-icon">
                            <span class="material-symbols-rounded">${icon}</span>
                        </div>
                        <div class="component-menu-link-text">
                            <span>${translatedName}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('lbl_generate_new_invite')}</h2>
                    <p class="component-modal-desc">${__('desc_invite_role')}</p>
                </div>

                <div class="component-modal-body">
                    <div class="step-modal-content">

                        <!-- Step 1: Configuración de Invitación -->
                        <div class="step-modal-step active" data-step="1">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleInviteRole" data-ref="invite_role" data-value="${defaultRole ? defaultRole.id : ''}">
                                    <span class="material-symbols-rounded" data-ref="invite_role_trigger_icon">${defIcon}</span>
                                    <span class="component-dropdown-text" data-ref="invite_role_trigger_text">${defLabel}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleInviteRole">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            ${rolesHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-inline-control component-inline-control--full">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustInviteMaxUses" data-step="-5" data-min="0">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustInviteMaxUses" data-step="-1" data-min="0">
                                            <span class="material-symbols-rounded">chevron_left</span>
                                        </button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="invite-max-uses-val" data-value="0">${__('lbl_no_limit')}</div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustInviteMaxUses" data-step="1" data-max="999">
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustInviteMaxUses" data-step="5" data-max="999">
                                            <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="inviteNextStep" data-ref="invite_expires_at" data-value="">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" data-ref="invite-endDate-text">${__('lbl_no_expiration')}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Calendario -->
                        <div class="step-modal-step disabled" data-step="2">
                            <div class="component-calendar">
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

                            <!-- Trigger compacto para ajustar hora -->
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full" style="margin-top: 12px;">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="inviteTimeStep" data-ref="invite-time-trigger">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span class="component-dropdown-text"><span class="component-text-muted" style="margin-right: 4px;">${__('lbl_configured_time') || 'Hora'}:</span> <strong data-ref="invite-time-text">23:59</strong></span>
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Ajuste de Hora y Minutos -->
                        <div class="step-modal-step disabled" data-step="3">
                            <div class="calendar-modal-controls">
                                <div class="calendar-control-column">
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="23">23</div>
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
                                <div class="calendar-control-column">
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="59">59</div>
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
                </div>

                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 disabled" data-action="invitePrevStep" data-ref="btn-invite-prev">${__('btn_prev')}</button>
                    <button type="button" class="component-button component-button--h40 disabled" data-action="inviteClearDate" data-ref="btn-invite-clear">${__('lbl_no_expiration')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm" data-ref="btn-invite-confirm">${__('btn_generate_invite')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40 disabled" data-action="inviteConfirmDate" data-ref="btn-invite-accept">${__('btn_accept')}</button>
                </div>
            `;
        },
        getData: (container) => {
            const roleTrigger = container.querySelector('[data-ref="invite_role"]');
            const maxUsesEl = container.querySelector('[data-ref="invite-max-uses-val"]');
            const expiresTrigger = container.querySelector('[data-ref="invite_expires_at"]');

            const maxUsesVal = maxUsesEl ? maxUsesEl.getAttribute('data-value') : '0';
            const expiresVal = expiresTrigger ? expiresTrigger.getAttribute('data-value') : '';

            return {
                role: roleTrigger ? roleTrigger.getAttribute('data-value') : '',
                max_uses: (maxUsesVal && maxUsesVal !== '0') ? parseInt(maxUsesVal, 10) : null,
                expires_at: expiresVal || null
            };
        }
    },

    manageCanvasMembersModal: {
        medium: false,
        hideCloseBtn: false,
        customBoxClass: 'component-modal-box--members',
        build: (data = {}) => {
            const t = (k, f) => {
                if (typeof window.__ === 'function') {
                    const r = window.__(k);
                    if (r && r !== k) return r;
                }
                return f || k;
            };
            const canvasTitle = data.title || t('canvases_members_title', 'Miembros del Lienzo');
            const canvasUuid = data.canvasUuid || data.uuid || '';
            const canvasId = data.canvasId || data.id || '';
            const currentSize = data.currentSize || '64x64';
            const userTier = parseInt(data.userTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
            const isOffline = data.isOfflineMode !== false && (data.isOffline || false);
            const initialTab = data.initialTab || (data.designNetwork ? 'live' : 'members');
            const isOwner = !!data.isOwner;

            const sizesList = {
                "32x32": { label: "32x32", icon: "crop_square", tier: 0 },
                "64x64": { label: "64x64", icon: "crop_square", tier: 0 },
                "128x64": { label: "128x64", icon: "aspect_ratio", tier: 0 },
                "128x128": { label: "128x128", icon: "aspect_ratio", tier: 1 },
                "256x128": { label: "256x128", icon: "aspect_ratio", tier: 1 },
                "256x256": { label: "256x256", icon: "grid_4x4", tier: 1 },
                "512x256": { label: "512x256", icon: "aspect_ratio", tier: 1 },
                "512x512": { label: "512x512", icon: "grid_on", tier: 1 },
                "1024x512": { label: "1024x512", icon: "aspect_ratio", tier: 2 },
                "1024x1024": { label: "1024x1024", icon: "grid_on", tier: 2 },
                "2048x1024": { label: "2048x1024", icon: "aspect_ratio", tier: 2 },
                "2048x2048": { label: "2048x2048", icon: "grid_on", tier: 2 },
                "4096x2048": { label: "4096x2048", icon: "aspect_ratio", tier: 3 },
                "4096x4096": { label: "4096x4096", icon: "grid_on", tier: 3 }
            };

            const currentMeta = sizesList[currentSize] || { label: currentSize, icon: "aspect_ratio", tier: 0 };

            let instantSizesHtml = '';
            for (const [val, meta] of Object.entries(sizesList)) {
                const reqTier = meta.tier ?? 0;
                const isAllowed = userTier >= reqTier;
                const disabledClass = isAllowed ? '' : 'disabled-interaction';
                const tierName = getDynamicTierName(reqTier);
                const lockBadge = !isAllowed
                    ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${escapeHTML(tierName)}</span>`
                    : '';

                const isInstantActive = (val === currentSize && isAllowed);
                instantSizesHtml += `
                    <div class="component-menu-link ${isInstantActive ? 'active' : ''} ${disabledClass}"
                         data-action="${isAllowed ? 'selectOfflineResizeSize' : ''}"
                         data-value="${escapeHTML(val)}"
                         data-label="${escapeHTML(meta.label)}"
                         data-icon="${escapeHTML(meta.icon)}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">${escapeHTML(meta.icon)}</span></div>
                        <div class="component-menu-link-text">
                            <span>${escapeHTML(meta.label)}</span>
                        </div>
                        ${lockBadge}
                    </div>
                `;
            }

            const defaultDateObj = new Date(Date.now() + 86400000);
            defaultDateObj.setHours(23, 59, 0, 0);
            const defaultIso = formatLocalDateTimeToInput(defaultDateObj);
            const defaultSchedDetails = getScheduledTimeDetails(defaultDateObj);
            const pad = n => String(n).padStart(2, '0');
            const hh = pad(defaultDateObj.getHours());
            const mm = pad(defaultDateObj.getMinutes());

            return `
                <div class="component-modal-settings-container" data-canvas-uuid="${escapeHTML(canvasUuid)}" data-canvas-id="${escapeHTML(canvasId)}" data-is-owner="${isOwner ? '1' : '0'}">
                    <!-- MOBILE DRAG HANDLE -->
                    <div class="pill-container"><div class="drag-handle"></div></div>

                    <!-- UNIFIED TOP HEADER -->
                    <div class="component-modal-settings-header">
                        <div class="component-modal-settings-header-left">
                            <div class="component-modal-header-icon">
                                <span class="material-symbols-rounded">tune</span>
                            </div>
                            <div class="component-modal-header-text">
                                <h2 class="component-modal-title">${escapeHTML(canvasTitle)}</h2>
                                <p class="component-modal-desc">${t('canvases_members_modal_desc', 'Gestiona miembros, solicitudes, enlaces, roles y opciones.')}</p>
                            </div>
                        </div>

                        <div class="component-modal-settings-header-right">
                            <!-- Search Bar for Tables & Lists -->
                            <div class="component-search component-search--w-full component-search--h32 ${(initialTab === 'resize' || initialTab === 'reset' || initialTab === 'edit' || initialTab === 'general' || initialTab === 'danger' || initialTab === 'critical') ? 'disabled' : ''}" data-ref="modal-search-container">
                                <div class="component-search-icon">
                                    <span class="material-symbols-rounded msr-search">search</span>
                                </div>
                                <div class="component-search-input">
                                    <input type="text" data-ref="modal-members-search" placeholder="${t('search_member_placeholder', 'Buscar...')}" autocomplete="off">
                                </div>
                            </div>

                            <!-- Section Title for Edit, Resize, Reset & Critical Options -->
                            <div class="component-modal-settings-header__title ${(initialTab === 'resize' || initialTab === 'reset' || initialTab === 'edit' || initialTab === 'general' || initialTab === 'danger' || initialTab === 'critical') ? '' : 'disabled'}" data-ref="modal-section-title-container">
                                <span class="material-symbols-rounded" data-ref="modal-section-title-icon">${(initialTab === 'danger' || initialTab === 'critical') ? 'warning' : (initialTab === 'reset' ? 'restart_alt' : ((initialTab === 'edit' || initialTab === 'general') ? 'tune' : 'aspect_ratio'))}</span>
                                <span data-ref="modal-section-title-text">${(initialTab === 'danger' || initialTab === 'critical') ? t('tab_danger_zone', 'Opciones Críticas') : (initialTab === 'reset' ? t('canvas_resets_title', 'Reiniciar Lienzo') : ((initialTab === 'edit' || initialTab === 'general') ? t('canvas_edit_title', 'Editar Lienzo') : t('canvas_resize_title', 'Expandir Lienzo')))}</span>
                            </div>

                            <div class="component-modal-settings-header__actions">
                                <!-- Contextual Actions: Members Table Selection -->
                                <div class="component-modal-top-actions disabled" data-ref="modal-member-selection-actions">
                                    <div class="component-badge component-badge--sm" data-ref="modal-selected-count-badge">
                                        <span>0 seleccionados</span>
                                    </div>
                                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalChangeMemberRole" data-tooltip="${t('tooltip_change_role', 'Cambiar rol')}" data-position="bottom">
                                        <span class="material-symbols-rounded msr-manage_accounts">manage_accounts</span>
                                    </button>
                                    <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="modalRemoveMember" data-tooltip="${t('tooltip_remove_member', 'Expulsar')}" data-position="bottom">
                                        <span class="material-symbols-rounded msr-person_remove">person_remove</span>
                                    </button>
                                </div>

                                <!-- Contextual Actions: Requests Tab Selection -->
                                <div class="component-modal-top-actions ${initialTab === 'requests' ? '' : 'disabled'}" data-ref="modal-requests-actions">
                                    <div class="component-modal-top-actions disabled" data-ref="modal-requests-selection-actions">
                                        <div class="component-badge component-badge--sm" data-ref="modal-requests-selected-badge">
                                            <span>0 seleccionados</span>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--success" data-action="modalApproveSelectedRequests" data-tooltip="${t('tooltip_approve_request', 'Aprobar')}" data-position="bottom">
                                            <span class="material-symbols-rounded msr-check">check</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="modalRejectSelectedRequests" data-tooltip="${t('tooltip_reject_request', 'Rechazar')}" data-position="bottom">
                                            <span class="material-symbols-rounded msr-close">close</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Contextual Actions: Live Cursors Dropdown -->
                                <div class="component-dropdown-wrapper ${initialTab === 'live' ? '' : 'disabled'}" data-ref="modal-live-actions">
                                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="moduleModalLiveActions" data-tooltip="${t('lbl_more_options', 'Opciones')}" data-position="bottom">
                                        <span class="material-symbols-rounded">more_vert</span>
                                    </button>
                                    <div class="component-module component-module--dropdown component-module--right disabled" data-module="moduleModalLiveActions">
                                        <div class="component-menu component-menu--w-auto component-menu--h-auto">
                                            <div class="component-menu-list">
                                                <div class="component-menu-link" data-action="modalToggleAllCursors" data-ref="modal-btn-toggle-all-cursors">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded" data-ref="modal-btn-toggle-cursors-icon">visibility</span></div>
                                                    <div class="component-menu-link-text"><span data-ref="modal-btn-toggle-cursors-text">${t('lbl_hide_all_cursors', 'Ocultar Todos')}</span></div>
                                                </div>
                                                ${isOwner ? `
                                                <div class="component-menu-link" data-action="modalSummonEveryone">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">campaign</span></div>
                                                    <div class="component-menu-link-text"><span>${t('lbl_summon_everyone', 'Reunir a todos')}</span></div>
                                                </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Contextual Actions: Invites Tab -->
                                <div class="component-modal-top-actions ${initialTab === 'invites' ? '' : 'disabled'}" data-ref="modal-invites-actions">
                                    <div class="component-modal-top-actions disabled" data-ref="modal-invites-selection-actions">
                                        <div class="component-badge component-badge--sm" data-ref="modal-invites-selected-badge">
                                            <span>0 seleccionados</span>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalCopySelectedInvite" data-tooltip="${t('lbl_copy_code', 'Copiar Código')}" data-position="bottom">
                                            <span class="material-symbols-rounded">content_copy</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="modalRevokeSelectedInvite" data-tooltip="${t('lbl_revoke', 'Revocar')}" data-position="bottom">
                                            <span class="material-symbols-rounded">link_off</span>
                                        </button>
                                    </div>
                                    <button type="button" class="component-button component-button--primary component-button--h32" data-action="modalOpenGenerateInvite">
                                        <span class="material-symbols-rounded">add_link</span>
                                        <span>${t('lbl_generate_invite', 'Generar Invitación')}</span>
                                    </button>
                                </div>

                                <!-- Contextual Actions: Roles Tab -->
                                <div class="component-modal-top-actions ${initialTab === 'roles' ? '' : 'disabled'}" data-ref="modal-roles-actions">
                                    <div class="component-modal-top-actions disabled" data-ref="modal-roles-selection-actions">
                                        <div class="component-badge component-badge--sm" data-ref="modal-roles-selected-badge">
                                            <span>0 seleccionados</span>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalEditSelectedRole" data-tooltip="${t('btn_edit', 'Editar')}" data-position="bottom">
                                            <span class="material-symbols-rounded">edit</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalEditSelectedRolePermissions" data-tooltip="${t('dt_permissions', 'Permisos')}" data-position="bottom">
                                            <span class="material-symbols-rounded">tune</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--danger" data-action="modalDeleteSelectedRole" data-tooltip="${t('btn_delete', 'Eliminar')}" data-position="bottom">
                                            <span class="material-symbols-rounded">delete</span>
                                        </button>
                                    </div>
                                    <button type="button" class="component-button component-button--primary component-button--h32" data-action="modalCreateRole" data-ref="modal-btn-create-role">
                                        <span class="material-symbols-rounded">add</span>
                                        <span>${t('btn_create_role', 'Crear Rol')}</span>
                                    </button>
                                </div>

                                <!-- Contextual Actions: Sanctions Tab -->
                                <div class="component-modal-top-actions ${initialTab === 'sanctions' ? '' : 'disabled'}" data-ref="modal-sanctions-actions">
                                    <div class="component-modal-top-actions disabled" data-ref="modal-sanctions-selection-actions">
                                        <div class="component-badge component-badge--sm" data-ref="modal-sanctions-selected-badge">
                                            <span>0 seleccionados</span>
                                        </div>
                                        <button type="button" class="component-button component-button--icon component-button--h32" data-action="modalEditSelectedSanction" data-tooltip="${t('btn_edit', 'Editar')}" data-position="bottom">
                                            <span class="material-symbols-rounded">gavel</span>
                                        </button>
                                        <button type="button" class="component-button component-button--icon component-button--h32 component-button--success" data-action="modalLiftSelectedSanction" data-tooltip="${t('lbl_unrestricted', 'Sin Restricción')}" data-position="bottom">
                                            <span class="material-symbols-rounded">lock_open</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MAIN BODY -->
                    <div class="component-modal-settings-body">
                        <!-- LEFT: NAV LINKS -->
                        <div class="component-modal-settings-sidebar">
                            <div class="component-modal-settings-tabs" data-ref="canvas-members-modal-tabs">
                                <div class="component-menu-link nav-item ${(initialTab === 'edit' || initialTab === 'general') ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="edit">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">tune</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('canvas_edit_title', 'Editar Lienzo')}</span>
                                    </div>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'members' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="members">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded msr-group">group</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_members', 'Miembros')}</span>
                                    </div>
                                    <span class="component-badge component-badge--sm" data-ref="modal-members-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'requests' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="requests">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded msr-front_hand">front_hand</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_requests', 'Solicitudes')}</span>
                                    </div>
                                    <span class="component-badge component-badge--warning component-badge--sm" data-ref="modal-requests-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'live' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="live">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded msr-sensors">sensors</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_live_presence', 'Colaboradores en vivo')}</span>
                                    </div>
                                    <span class="component-badge component-badge--online component-badge--sm" data-ref="modal-live-nav-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'invites' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="invites">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">link</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_invites', 'Invitaciones')}</span>
                                    </div>
                                    <span class="component-badge component-badge--sm" data-ref="modal-invites-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'roles' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="roles">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">shield_person</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_roles_permissions', 'Roles y permisos')}</span>
                                    </div>
                                    <span class="component-badge component-badge--sm" data-ref="modal-roles-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'sanctions' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="sanctions">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">gavel</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_sanctions_suspensions', 'Sanciones')}</span>
                                    </div>
                                    <span class="component-badge component-badge--danger component-badge--sm" data-ref="modal-sanctions-count-badge">0</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'resize' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="resize">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded msr-aspect_ratio">aspect_ratio</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_resize_expansion', 'Expandir lienzo')}</span>
                                    </div>
                                    <span class="component-badge component-badge--sm" data-ref="modal-resize-current-badge">${escapeHTML(currentSize)}</span>
                                </div>

                                <div class="component-menu-link nav-item ${initialTab === 'reset' ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="reset">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded msr-restart_alt">restart_alt</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_resets_cleaning', 'Reiniciar lienzo')}</span>
                                    </div>
                                    <span class="component-badge component-badge--warning component-badge--sm disabled" data-ref="modal-reset-active-badge">Activo</span>
                                </div>

                                ${isOwner ? `
                                <div class="component-menu-divider"></div>
                                <div class="component-menu-link nav-item ${(initialTab === 'danger' || initialTab === 'critical') ? 'active' : ''}" data-action="switchMembersModalTab" data-tab="danger">
                                    <div class="component-menu-link-icon">
                                        <span class="material-symbols-rounded">warning</span>
                                    </div>
                                    <div class="component-menu-link-text">
                                        <span>${t('tab_danger_zone', 'Opciones críticas')}</span>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- RIGHT: CONTENT AREA + BOTTOM BAR -->
                        <div class="component-modal-settings-main">
                            <div class="component-modal-settings-content-wrapper" data-ref="canvas-members-modal-body">
                                <!-- TAB 0: EDITAR LIENZO -->
                                <div class="component-modal-tab-content ${(initialTab === 'edit' || initialTab === 'general') ? 'active' : 'disabled'}" data-ref="tab-content-edit">
                                    <div class="component-modal-settings-content">
                                        <!-- 1. General Info Accordion -->
                                        <div class="component-card--grouped component-accordion active">
                                            <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                                                <div class="component-card__content">
                                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                                        <span class="material-symbols-rounded">info</span>
                                                    </div>
                                                    <div class="component-card__text">
                                                        <h2 class="component-card__title">${t('canvas_accordion_general_title', 'Información General')}</h2>
                                                        <p class="component-card__description">${t('canvas_accordion_general_desc', 'Información general y datos básicos.')}</p>
                                                    </div>
                                                </div>
                                                <div class="component-card__actions component-card__actions--end">
                                                    <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                                </div>
                                            </div>
                                            <div class="component-accordion-body">
                                                <div class="component-accordion-content">
                                                    <!-- 1.1 Título del Lienzo -->
                                                    <div class="component-group-item component-group-item--stateful">
                                                        <div class="active component-state-box" data-state="canvasname-view">
                                                            <div class="component-card__content">
                                                                <div class="component-card__text">
                                                                    <h2 class="component-card__title">${t('canvas_name_title', 'Título del Lienzo')}</h2>
                                                                    <span class="component-display-value" data-ref="display-canvasname">${escapeHTML(canvasTitle)}</span>
                                                                </div>
                                                            </div>
                                                            <div class="component-card__actions component-card__actions--stretch">
                                                                <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname">${t('btn_edit', 'Editar')}</button>
                                                            </div>
                                                        </div>

                                                        <div class="disabled component-state-box" data-state="canvasname-edit">
                                                            <div class="component-card__content">
                                                                <div class="component-card__text">
                                                                    <h2 class="component-card__title">${t('canvas_name_title', 'Título del Lienzo')}</h2>
                                                                    <div class="component-edit-row">
                                                                        <div class="component-input-group component-input-group--h34">
                                                                            <input type="text" data-ref="input-canvasname" class="component-input-field component-input-field--simple" value="${escapeHTML(canvasTitle)}" data-original-value="${escapeHTML(canvasTitle)}" placeholder="${t('ph_canvas_name', 'Nombre del lienzo')}">
                                                                        </div>
                                                                        <div class="component-card__actions component-card__actions--stretch">
                                                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="canvasname">${t('btn_cancel', 'Cancelar')}</button>
                                                                            <button type="button" class="component-button component-button--h34" data-action="saveCanvasName">${t('btn_save', 'Guardar')}</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 1.2 Etiquetas del Lienzo -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_tags_title', 'Etiquetas')}</h2>
                                                                <p class="component-card__description">${t('canvas_tags_desc', 'Selecciona hasta 8 etiquetas temáticas.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-dropdown-wrapper" data-dropdown-type="multiple" data-max="8">
                                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditTags">
                                                                    <span class="material-symbols-rounded">label</span>
                                                                    <span class="component-dropdown-text" data-ref="text-tags">${t('ph_select_tags', 'Seleccionar etiquetas')}</span>
                                                                    <span class="material-symbols-rounded">expand_more</span>
                                                                </div>
                                                                <div class="component-module component-module--dropdown disabled" data-module="dropdownEditTags">
                                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                                        <div class="component-menu-list" data-ref="modal-edit-tags-list">
                                                                            ${['art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 'community', 'nature', 'scifi', 'fantasy', 'music', 'sports', 'popculture'].map(tag => `
                                                                                <div class="component-menu-link" data-action="toggleEditTag" data-value="${tag}" data-label="${t('tag_' + tag, tag)}">
                                                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded" data-ref="icon-check">check_box_outline_blank</span></div>
                                                                                    <div class="component-menu-link-text"><span>${t('tag_' + tag, tag)}</span></div>
                                                                                </div>
                                                                            `).join('')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 2. Configuración Accordion -->
                                        <div class="component-card--grouped component-accordion">
                                            <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                                                <div class="component-card__content">
                                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                                        <span class="material-symbols-rounded">settings</span>
                                                    </div>
                                                    <div class="component-card__text">
                                                        <h2 class="component-card__title">${t('canvas_accordion_config_title', 'Configuración')}</h2>
                                                        <p class="component-card__description">${t('canvas_accordion_config_desc', 'Ajusta la privacidad, capacidad y límites de interacción.')}</p>
                                                    </div>
                                                </div>
                                                <div class="component-card__actions component-card__actions--end">
                                                    <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                                </div>
                                            </div>
                                            <div class="component-accordion-body">
                                                <div class="component-accordion-content">
                                                    <!-- 2.1 Tamaño del Lienzo (Bloqueado) -->
                                                    <div class="component-group-item component-group-item--stacked disabled-interaction" data-tooltip="${t('canvas_size_locked_tooltip', 'El tamaño no se puede cambiar directamente aquí.')}" data-position="top">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">
                                                                    ${t('canvas_size_title', 'Tamaño del Lienzo')}
                                                                    <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> ${t('lbl_not_available', 'No disponible')}</span>
                                                                </h2>
                                                                <p class="component-card__description">${t('canvas_size_desc', 'Dimensiones del lienzo en píxeles.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-dropdown-wrapper">
                                                                <div class="component-dropdown-trigger">
                                                                    <span class="material-symbols-rounded">crop_square</span>
                                                                    <span class="component-dropdown-text" data-ref="text-size">${escapeHTML(currentSize)}</span>
                                                                    <span class="material-symbols-rounded">expand_more</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 2.2 Privacidad -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_privacy_title', 'Privacidad')}</h2>
                                                                <p class="component-card__description">${t('canvas_privacy_desc', 'Define quién puede ver y participar en el lienzo.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-dropdown-wrapper">
                                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditPrivacy">
                                                                    <span class="material-symbols-rounded" data-ref="icon-privacy">lock</span>
                                                                    <span class="component-dropdown-text" data-ref="text-privacy">${t('canvas_privacy_private', 'Privado')}</span>
                                                                    <span class="material-symbols-rounded">expand_more</span>
                                                                </div>
                                                                <div class="component-module component-module--dropdown disabled" data-module="dropdownEditPrivacy">
                                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                                        <div class="component-menu-list">
                                                                            <div class="component-menu-link" data-action="selectEditValue" data-type="privacy" data-value="public" data-label="canvas_privacy_public" data-icon="public">
                                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                                                                <div class="component-menu-link-text"><span>${t('canvas_privacy_public', 'Público')}</span></div>
                                                                            </div>
                                                                            <div class="component-menu-link active" data-action="selectEditValue" data-type="privacy" data-value="private" data-label="canvas_privacy_private" data-icon="lock">
                                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                                                                <div class="component-menu-link-text"><span>${t('canvas_privacy_private', 'Privado')}</span></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 2.3 Aprobación -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_approval_title', 'Aprobación de Ingreso')}</h2>
                                                                <p class="component-card__description">${t('canvas_approval_desc', 'Requiere aprobación del administrador para nuevos colaboradores.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-dropdown-wrapper">
                                                                <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownEditApproval">
                                                                    <span class="material-symbols-rounded" data-ref="icon-approval">no_accounts</span>
                                                                    <span class="component-dropdown-text" data-ref="text-approval">${t('canvas_approval_false', 'Libre (sin aprobación)')}</span>
                                                                    <span class="material-symbols-rounded">expand_more</span>
                                                                </div>
                                                                <div class="component-module component-module--dropdown disabled" data-module="dropdownEditApproval">
                                                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                                                        <div class="component-menu-list">
                                                                            <div class="component-menu-link active" data-action="selectEditValue" data-type="requires_approval" data-value="false" data-label="canvas_approval_false" data-icon="no_accounts">
                                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">no_accounts</span></div>
                                                                                <div class="component-menu-link-text"><span>${t('canvas_approval_false', 'Libre (sin aprobación)')}</span></div>
                                                                            </div>
                                                                            <div class="component-menu-link" data-action="selectEditValue" data-type="requires_approval" data-value="true" data-label="canvas_approval_true" data-icon="front_hand">
                                                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">front_hand</span></div>
                                                                                <div class="component-menu-link-text"><span>${t('canvas_approval_true', 'Requiere aprobación')}</span></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 2.4 Píxeles por Lote -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_cooldown_batch_title', 'Píxeles por Lote')}</h2>
                                                                <p class="component-card__description">${t('canvas_cooldown_batch_desc', 'Cantidad de píxeles acumulables antes de esperar.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-inline-control component-inline-control--fixed">
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownBatch" data-step="-5">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownBatch" data-step="-1">
                                                                        <span class="material-symbols-rounded">chevron_left</span>
                                                                    </button>
                                                                </div>
                                                                <div class="component-inline-control__center" data-ref="val_cooldown_batch" data-value="5">5</div>
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownBatch" data-step="1">
                                                                        <span class="material-symbols-rounded">chevron_right</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownBatch" data-step="5">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 2.5 Cooldown en Segundos -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_cooldown_seconds_title', 'Tiempo de Espera')}</h2>
                                                                <p class="component-card__description">${t('canvas_cooldown_seconds_desc', 'Tiempo en segundos entre recargas de píxeles.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-inline-control component-inline-control--fixed">
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownSeconds" data-step="-10">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownSeconds" data-step="-1">
                                                                        <span class="material-symbols-rounded">chevron_left</span>
                                                                    </button>
                                                                </div>
                                                                <div class="component-inline-control__center" data-ref="val_cooldown_seconds" data-value="10">10</div>
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownSeconds" data-step="1">
                                                                        <span class="material-symbols-rounded">chevron_right</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditCooldownSeconds" data-step="10">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 2.6 Límite de Miembros -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_limit_title', 'Límite de Miembros')}</h2>
                                                                <p class="component-card__description">${t('canvas_limit_desc', 'Límite máximo de participantes simultáneos.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-inline-control component-inline-control--fixed">
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditLimit" data-step="-50">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditLimit" data-step="-10">
                                                                        <span class="material-symbols-rounded">chevron_left</span>
                                                                    </button>
                                                                </div>
                                                                <div class="component-inline-control__center" data-ref="val_limit" data-value="10">10</div>
                                                                <div class="component-inline-control__group">
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditLimit" data-step="10">
                                                                        <span class="material-symbols-rounded">chevron_right</span>
                                                                    </button>
                                                                    <button type="button" class="component-inline-control__btn" data-action="adjustEditLimit" data-step="50">
                                                                        <span class="material-symbols-rounded">keyboard_double_arrow_right</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- 3. Funciones Accordion -->
                                        <div class="component-card--grouped component-accordion">
                                            <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                                                <div class="component-card__content">
                                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                                        <span class="material-symbols-rounded">extension</span>
                                                    </div>
                                                    <div class="component-card__text">
                                                        <h2 class="component-card__title">${t('canvas_accordion_features_title', 'Características')}</h2>
                                                        <p class="component-card__description">${t('canvas_accordion_features_desc', 'Paletas de colores y funciones avanzadas del lienzo.')}</p>
                                                    </div>
                                                </div>
                                                <div class="component-card__actions component-card__actions--end">
                                                    <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                                </div>
                                            </div>
                                            <div class="component-accordion-body">
                                                <div class="component-accordion-content">
                                                    <!-- 3.1 Paleta de Colores -->
                                                    <div class="component-group-item component-group-item--stacked">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">${t('canvas_palette_title', 'Paleta del Lienzo')}</h2>
                                                                <p class="component-card__description">${t('canvas_palette_desc', 'Paleta de colores disponible para dibujar en este lienzo.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--start">
                                                            <div class="component-dropdown-trigger" data-action="openCanvasEditPaletteModal" data-ref="palette_dropdown_trigger">
                                                                <span class="material-symbols-rounded" data-ref="icon-palette">palette</span>
                                                                <span class="component-dropdown-text" data-ref="text-palette" data-current-palette="default">Default</span>
                                                                <span class="material-symbols-rounded">dashboard_customize</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr class="component-divider">

                                                    <!-- 3.2 Chat en Vivo -->
                                                    <div class="component-group-item" data-ref="group-allow-chat">
                                                        <div class="component-card__content">
                                                            <div class="component-card__text">
                                                                <h2 class="component-card__title">
                                                                    ${t('lbl_allow_live_chat', 'Chat en vivo')}
                                                                </h2>
                                                                <p class="component-card__description">${t('desc_allow_live_chat', 'Permitir a los colaboradores comunicarse por chat.')}</p>
                                                            </div>
                                                        </div>
                                                        <div class="component-card__actions component-card__actions--end">
                                                            <label class="component-toggle-switch">
                                                                <input type="checkbox" data-ref="val_allow_chat">
                                                                <span class="component-toggle-slider"></span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- TAB 1: GESTIONAR MIEMBROS -->
                                <div class="component-modal-tab-content ${initialTab === 'members' ? 'active' : 'disabled'}" data-ref="tab-content-members">
                                    <div class="component-modal-table-container component-members-table-container" data-ref="modal-members-table-container">
                                        <!-- Table or Empty state inserted dynamically -->
                                    </div>
                                </div>

                                <!-- TAB 2: GESTIONAR PETICIONES -->
                                <div class="component-modal-tab-content ${initialTab === 'requests' ? 'active' : 'disabled'}" data-ref="tab-content-requests">
                                    <div class="component-modal-table-container component-requests-table-container" data-ref="modal-requests-table-container">
                                        <!-- Table or Empty state inserted dynamically -->
                                    </div>
                                </div>

                                <!-- TAB 3: GESTIONAR CURSORES (EN VIVO) -->
                                <div class="component-modal-tab-content ${initialTab === 'live' ? 'active' : 'disabled'}" data-ref="tab-content-live">
                                    <div class="component-modal-list-container component-live-members-list" data-ref="modal-live-members-scroll">
                                        <!-- Populated dynamically via controller -->
                                    </div>
                                </div>

                                <!-- TAB 4: INVITACIONES -->
                                <div class="component-modal-tab-content ${initialTab === 'invites' ? 'active' : 'disabled'}" data-ref="tab-content-invites">
                                    <div class="component-modal-table-container component-invites-table-container" data-ref="modal-invites-table-container">
                                        <!-- Populated dynamically via controller -->
                                    </div>
                                </div>

                                <!-- TAB 5: ROLES Y PERMISOS -->
                                <div class="component-modal-tab-content ${initialTab === 'roles' ? 'active' : 'disabled'}" data-ref="tab-content-roles">
                                    <!-- SUBVIEW 1: ROLES TABLE -->
                                    <div class="component-modal-table-container component-roles-table-container" data-ref="modal-roles-table-container">
                                        <!-- Populated dynamically via controller -->
                                    </div>

                                    <!-- SUBVIEW 2: ROLE BUILDER FORM -->
                                    <div class="component-modal-subview disabled" data-ref="modal-role-builder-subview">
                                        <!-- Role builder form inserted dynamically -->
                                    </div>

                                    <!-- SUBVIEW 3: ROLE PERMISSIONS -->
                                    <div class="component-modal-subview disabled" data-ref="modal-role-permissions-subview">
                                        <!-- Role permissions matrix inserted dynamically -->
                                    </div>
                                </div>

                                <!-- TAB 6: SANCIONES Y SUSPENSIONES -->
                                <div class="component-modal-tab-content ${initialTab === 'sanctions' ? 'active' : 'disabled'}" data-ref="tab-content-sanctions">
                                    <div class="component-modal-table-container component-sanctions-table-container" data-ref="modal-sanctions-table-container">
                                        <!-- Populated dynamically via controller -->
                                    </div>
                                </div>

                                <!-- TAB 7: EXPANDIR LIENZO (GROUPED CARDS) -->
                                <div class="component-modal-tab-content ${initialTab === 'resize' ? 'active' : 'disabled'}" data-ref="tab-content-resize">
                                    <div class="component-modal-settings-content">
                                        <!-- Active Schedule Banner -->
                                        <div data-ref="modal-resize-active-schedule-container" class="disabled"></div>

                                        <!-- STEP 1: Tipo de Expansión & Fecha si es programada -->
                                        <div class="component-modal-step active" data-ref="offline-resize-step-1" data-selected-type="instant">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('canvas_resize_title', 'Expandir Lienzo')}</h2>
                                                            <p class="component-card__description">${t('canvas_resize_desc', 'Aumenta el espacio disponible para dibujar píxeles.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResizeType" data-ref="offline-resize-type-trigger" data-value="instant">
                                                                <span class="material-symbols-rounded" data-ref="offline-resize-type-icon">flash_on</span>
                                                                <span class="component-dropdown-text" data-ref="offline-resize-type-label">${t('canvas_resize_now_title', 'Inmediata')}</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>
                                                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResizeType">
                                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                                    <div class="component-menu-list">
                                                                        <div class="component-menu-link active" data-action="selectResizeTypeOption" data-value="instant" data-label="${t('canvas_resize_now_title', 'Inmediata')}" data-icon="flash_on">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_resize_now_title', 'Inmediata')}</span></div>
                                                                        </div>
                                                                        <div class="component-menu-link ${isOffline ? 'disabled-interaction' : ''}" data-action="${isOffline ? '' : 'selectResizeTypeOption'}" data-value="scheduled" data-label="${t('canvas_resize_active_title', 'Programada')}" data-icon="schedule">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_resize_active_title', 'Programada')}</span></div>
                                                                            ${isOffline ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${t('lbl_offline_not_available', 'No disponible')}</span></span>` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Trigger para abrir la etapa del calendario -->
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full component-modal-schedule-box disabled" data-ref="offline-resize-scheduled-date-container">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResizeDateStep" data-ref="offline-resize-datetime-trigger" data-value="${defaultIso}">
                                                                <span class="material-symbols-rounded">calendar_month</span>
                                                                <span class="component-dropdown-text" data-ref="offline-resize-datetime-text">${defaultSchedDetails.formattedDateShort || defaultSchedDetails.formattedDate}</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>

                                                            <!-- Resumen informativo de fecha, zona horaria y tiempo restante -->
                                                            <div class="component-alert component-alert--info component-modal-schedule-box active" data-ref="offline-resize-schedule-info">
                                                                <div class="component-alert-icon">
                                                                    <span class="material-symbols-rounded" data-ref="offline-resize-info-icon">schedule</span>
                                                                </div>
                                                                <div class="component-alert-text">
                                                                    <div class="component-modal-schedule-date" data-ref="offline-resize-info-date">${defaultSchedDetails.formattedDate}</div>
                                                                    <div class="component-text-muted component-modal-schedule-time" data-ref="offline-resize-info-time">
                                                                        <span data-ref="offline-resize-info-relative">${defaultSchedDetails.relativeTimeStr}</span> · <span data-ref="offline-resize-info-tz">${defaultSchedDetails.timezoneString} (${t('lbl_timezone_local', 'Hora local')})</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- STEP CALENDAR: Etapa de Selección de Fecha -->
                                        <div class="component-modal-step disabled" data-ref="offline-resize-step-calendar">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('calendar_modal_title', 'Seleccionar fecha')}</h2>
                                                            <p class="component-card__description">${t('lbl_scheduled_datetime', 'Fecha y hora exacta en la que se aplicará el ajuste.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-calendar">
                                                            <div class="component-calendar-header">
                                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                                    <span class="material-symbols-rounded">chevron_left</span>
                                                                </button>
                                                                <div class="component-calendar-title" data-ref="calendar-title">${t('calendar_month_year', 'Mes Año')}</div>
                                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                                    <span class="material-symbols-rounded">chevron_right</span>
                                                                </button>
                                                            </div>
                                                            <div class="component-calendar-weekdays">
                                                                <span>${t('cal_su', 'Do')}</span><span>${t('cal_mo', 'Lu')}</span><span>${t('cal_tu', 'Ma')}</span><span>${t('cal_we', 'Mi')}</span><span>${t('cal_th', 'Ju')}</span><span>${t('cal_fr', 'Vi')}</span><span>${t('cal_sa', 'Sá')}</span>
                                                            </div>
                                                            <div class="component-calendar-days" data-ref="calendar-days"></div>
                                                        </div>

                                                        <!-- Trigger compacto para ajustar hora -->
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full component-modal-control-gap">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResizeTimeStep" data-ref="offline-resize-time-trigger">
                                                                <span class="material-symbols-rounded">schedule</span>
                                                                <span class="component-dropdown-text"><span class="component-text-muted component-modal-time-label-prefix">${t('lbl_configured_time', 'Hora')}:</span> <strong data-ref="offline-resize-time-text">${hh}:${mm}</strong></span>
                                                                <span class="component-badge component-badge--sm">${defaultSchedDetails.timezoneString}</span>
                                                                <span class="material-symbols-rounded">chevron_right</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- STEP TIME: Etapa de Ajuste de Hora y Minutos -->
                                        <div class="component-modal-step disabled" data-ref="offline-resize-step-time">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('lbl_time_picker_title', 'Ajustar hora')}</h2>
                                                            <p class="component-card__description">${t('lbl_time_picker_desc', 'Define la hora y minutos exactos para la ejecución.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="calendar-modal-controls">
                                                            <div class="calendar-control-column">
                                                                <div class="calendar-control-label">${t('lbl_hours', 'Horas')}</div>
                                                                <div class="component-inline-control component-inline-control--full">
                                                                    <div class="component-inline-control__group">
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                        </button>
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                                                            <span class="material-symbols-rounded">chevron_left</span>
                                                                        </button>
                                                                    </div>
                                                                    <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${hh}">${hh}</div>
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
                                                            <div class="calendar-control-column">
                                                                <div class="calendar-control-label">${t('lbl_minutes', 'Minutos')}</div>
                                                                <div class="component-inline-control component-inline-control--full">
                                                                    <div class="component-inline-control__group">
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                        </button>
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                                                            <span class="material-symbols-rounded">chevron_left</span>
                                                                        </button>
                                                                    </div>
                                                                    <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${mm}">${mm}</div>
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
                                            </div>
                                        </div>

                                        <!-- STEP 2: Selección del nuevo tamaño -->
                                        <div class="component-modal-step disabled" data-ref="offline-resize-step-2">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('canvas_resize_instant_size_title', 'Nuevo tamaño')}</h2>
                                                            <p class="component-card__description">${t('canvas_resize_instant_size_desc', 'Selecciona el tamaño deseado para el lienzo.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResizeSizes" data-ref="offline-resize-trigger" data-value="${escapeHTML(currentSize)}">
                                                                <span class="material-symbols-rounded" data-ref="offline-resize-icon">${escapeHTML(currentMeta.icon)}</span>
                                                                <span class="component-dropdown-text" data-ref="offline-resize-label">${escapeHTML(currentMeta.label)}</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>

                                                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResizeSizes">
                                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                                    <div class="component-menu-list">
                                                                        ${instantSizesHtml}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div class="component-alert-error component-modal-schedule-box disabled" data-ref="offline-resize-shrink-warning">
                                                            ${t('canvas_resize_warning_desc', 'Al reducir el tamaño se podrían recortar trazos fuera del límite.')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- TAB 8: REINICIAR LIENZO (GROUPED CARDS) -->
                                <div class="component-modal-tab-content ${initialTab === 'reset' ? 'active' : 'disabled'}" data-ref="tab-content-reset">
                                    <div class="component-modal-settings-content">
                                        <!-- Active Schedule Banner -->
                                        <div data-ref="modal-reset-active-schedule-container" class="disabled"></div>

                                        <!-- STEP 1: Tipo de Reinicio & Fecha si es programada -->
                                        <div class="component-modal-step active" data-ref="offline-reset-step-1" data-selected-type="instant">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('canvas_resets_title', 'Reiniciar Lienzo')}</h2>
                                                            <p class="component-card__description">${t('canvas_resets_desc', 'Limpia los trazos del lienzo o programa un reinicio.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResetType" data-ref="offline-reset-type-trigger" data-value="instant">
                                                                <span class="material-symbols-rounded" data-ref="offline-reset-type-icon">flash_on</span>
                                                                <span class="component-dropdown-text" data-ref="offline-reset-type-label">${t('canvas_reset_now_title', 'Inmediato')}</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>
                                                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResetType">
                                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                                    <div class="component-menu-list">
                                                                        <div class="component-menu-link active" data-action="selectResetTypeOption" data-value="instant" data-label="${t('canvas_reset_now_title', 'Inmediato')}" data-icon="flash_on">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_reset_now_title', 'Inmediato')}</span></div>
                                                                        </div>
                                                                        <div class="component-menu-link ${isOffline ? 'disabled-interaction' : ''}" data-action="${isOffline ? '' : 'selectResetTypeOption'}" data-value="scheduled" data-label="${t('canvas_reset_active_title', 'Programado')}" data-icon="schedule">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_reset_active_title', 'Programado')}</span></div>
                                                                            ${isOffline ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${t('lbl_offline_not_available', 'No disponible')}</span></span>` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- Trigger para abrir la etapa del calendario -->
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full component-modal-schedule-box disabled" data-ref="offline-reset-scheduled-date-container">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResetDateStep" data-ref="offline-reset-datetime-trigger" data-value="${defaultIso}">
                                                                <span class="material-symbols-rounded">calendar_month</span>
                                                                <span class="component-dropdown-text" data-ref="offline-reset-datetime-text">${defaultSchedDetails.formattedDateShort || defaultSchedDetails.formattedDate}</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>

                                                            <!-- Resumen informativo de fecha, zona horaria y tiempo restante -->
                                                            <div class="component-alert component-alert--info component-modal-schedule-box active" data-ref="offline-reset-schedule-info">
                                                                <div class="component-alert-icon">
                                                                    <span class="material-symbols-rounded" data-ref="offline-reset-info-icon">schedule</span>
                                                                </div>
                                                                <div class="component-alert-text">
                                                                    <div class="component-modal-schedule-date" data-ref="offline-reset-info-date">${defaultSchedDetails.formattedDate}</div>
                                                                    <div class="component-text-muted component-modal-schedule-time" data-ref="offline-reset-info-time">
                                                                        <span data-ref="offline-reset-info-relative">${defaultSchedDetails.relativeTimeStr}</span> · <span data-ref="offline-reset-info-tz">${defaultSchedDetails.timezoneString} (${t('lbl_timezone_local', 'Hora local')})</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- STEP CALENDAR: Etapa de Selección de Fecha -->
                                        <div class="component-modal-step disabled" data-ref="offline-reset-step-calendar">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('calendar_modal_title', 'Seleccionar fecha')}</h2>
                                                            <p class="component-card__description">${t('lbl_scheduled_datetime', 'Fecha y hora exacta en la que se ejecutará el reinicio.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-calendar">
                                                            <div class="component-calendar-header">
                                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarPrevMonth">
                                                                    <span class="material-symbols-rounded">chevron_left</span>
                                                                </button>
                                                                <div class="component-calendar-title" data-ref="calendar-title">${t('calendar_month_year', 'Mes Año')}</div>
                                                                <button type="button" class="component-button component-button--icon component-button--h30" data-action="calendarNextMonth">
                                                                    <span class="material-symbols-rounded">chevron_right</span>
                                                                </button>
                                                            </div>
                                                            <div class="component-calendar-weekdays">
                                                                <span>${t('cal_su', 'Do')}</span><span>${t('cal_mo', 'Lu')}</span><span>${t('cal_tu', 'Ma')}</span><span>${t('cal_we', 'Mi')}</span><span>${t('cal_th', 'Ju')}</span><span>${t('cal_fr', 'Vi')}</span><span>${t('cal_sa', 'Sá')}</span>
                                                            </div>
                                                            <div class="component-calendar-days" data-ref="calendar-days"></div>
                                                        </div>

                                                        <!-- Trigger compacto para ajustar hora -->
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full component-modal-control-gap">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="offlineResetTimeStep" data-ref="offline-reset-time-trigger">
                                                                <span class="material-symbols-rounded">schedule</span>
                                                                <span class="component-dropdown-text"><span class="component-text-muted component-modal-time-label-prefix">${t('lbl_configured_time', 'Hora')}:</span> <strong data-ref="offline-reset-time-text">${hh}:${mm}</strong></span>
                                                                <span class="component-badge component-badge--sm">${defaultSchedDetails.timezoneString}</span>
                                                                <span class="material-symbols-rounded">chevron_right</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- STEP TIME: Etapa de Ajuste de Hora y Minutos -->
                                        <div class="component-modal-step disabled" data-ref="offline-reset-step-time">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('lbl_time_picker_title', 'Ajustar hora')}</h2>
                                                            <p class="component-card__description">${t('lbl_time_picker_desc', 'Define la hora y minutos exactos para la ejecución.')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="calendar-modal-controls">
                                                            <div class="calendar-control-column">
                                                                <div class="calendar-control-label">${t('lbl_hours', 'Horas')}</div>
                                                                <div class="component-inline-control component-inline-control--full">
                                                                    <div class="component-inline-control__group">
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-5">
                                                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                        </button>
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarHours" data-step="-1">
                                                                            <span class="material-symbols-rounded">chevron_left</span>
                                                                        </button>
                                                                    </div>
                                                                    <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${hh}">${hh}</div>
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
                                                            <div class="calendar-control-column">
                                                                <div class="calendar-control-label">${t('lbl_minutes', 'Minutos')}</div>
                                                                <div class="component-inline-control component-inline-control--full">
                                                                    <div class="component-inline-control__group">
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-5">
                                                                            <span class="material-symbols-rounded">keyboard_double_arrow_left</span>
                                                                        </button>
                                                                        <button type="button" class="component-inline-control__btn" data-action="adjustCalendarMinutes" data-step="-1">
                                                                            <span class="material-symbols-rounded">chevron_left</span>
                                                                        </button>
                                                                    </div>
                                                                    <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${mm}">${mm}</div>
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
                                            </div>
                                        </div>

                                        <!-- STEP 2: Selección de Captura Previa -->
                                        <div class="component-modal-step disabled" data-ref="offline-reset-step-2">
                                            <div class="component-card--grouped">
                                                <div class="component-group-item component-group-item--stacked">
                                                    <div class="component-card__content">
                                                        <div class="component-card__text">
                                                            <h2 class="component-card__title">${t('canvas_reset_captura_title', 'Captura previa')}</h2>
                                                            <p class="component-card__description">${t('canvas_reset_captura_desc', '¿Deseas guardar una captura de pantalla antes de reiniciar el lienzo?')}</p>
                                                        </div>
                                                    </div>
                                                    <div class="component-card__actions component-card__actions--start">
                                                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOfflineResetSnapshot" data-ref="offline-reset-snapshot-trigger" data-value="1">
                                                                <span class="material-symbols-rounded" data-ref="offline-reset-snapshot-icon">photo_camera</span>
                                                                <span class="component-dropdown-text" data-ref="offline-reset-snapshot-label">${t('canvas_reset_captura_title', 'Crear captura previa')} (${t('lbl_enabled', 'Activada')})</span>
                                                                <span class="material-symbols-rounded">expand_more</span>
                                                            </div>

                                                            <div class="component-module component-module--dropdown disabled" data-module="moduleOfflineResetSnapshot">
                                                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                                                    <div class="component-menu-list">
                                                                        <div class="component-menu-link active" data-action="toggleResetSnapshotOption" data-value="1" data-label="${t('canvas_reset_captura_title', 'Crear captura previa')} (${t('lbl_enabled', 'Activada')})" data-icon="photo_camera">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">photo_camera</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_reset_captura_title', 'Crear captura previa')} (${t('lbl_enabled', 'Activada')})</span></div>
                                                                        </div>
                                                                        <div class="component-menu-link" data-action="toggleResetSnapshotOption" data-value="0" data-label="${t('canvas_reset_captura_title', 'Captura previa')} (${t('lbl_disabled', 'Desactivada')})" data-icon="photo_camera_off">
                                                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">photo_camera_off</span></div>
                                                                            <div class="component-menu-link-text"><span>${t('canvas_reset_captura_title', 'Captura previa')} (${t('lbl_disabled', 'Desactivada')})</span></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- TAB 9: OPCIONES CRÍTICAS (DANGER ZONE) -->
                                <div class="component-modal-tab-content ${(initialTab === 'danger' || initialTab === 'critical') ? 'active' : 'disabled'}" data-ref="tab-content-danger">
                                    <div class="component-modal-settings-content">
                                        <div class="component-card--grouped">
                                            <div class="component-group-item">
                                                <div class="component-card__content">
                                                    <div class="component-card__icon-container component-card__icon-container--bordered">
                                                        <span class="material-symbols-rounded">delete</span>
                                                    </div>
                                                    <div class="component-card__text">
                                                        <h2 class="component-card__title">${t('canvas_delete_title', 'Eliminar lienzo')}</h2>
                                                        <p class="component-card__description">${t('canvas_delete_desc', 'Enviar este lienzo a la papelera. Podrás restaurarlo o se eliminará de forma permanente tras 30 días junto con todas sus capas y registros.')}</p>
                                                    </div>
                                                </div>
                                                <div class="component-card__actions component-card__actions--end">
                                                    <button type="button" class="component-button component-button--h36 component-button--danger" data-action="modalDeleteCanvas">
                                                        <span class="material-symbols-rounded">delete</span>
                                                        <span>${t('btn_delete_canvas', 'Eliminar lienzo')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- RIGHT BOTTOM: Action / Pagination Bar (Buttons Only) -->
                            <div class="component-modal-settings-bottom ${initialTab === 'members' ? '' : 'disabled'}" data-ref="modal-members-bottom-bar">
                                <div class="component-modal-pagination" data-ref="modal-members-pagination"></div>
                                <div class="component-modal-actions" data-ref="modal-bottom-actions"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    changeCanvasRoleModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const targetUsername = data.targetUsername || '';
            const isOwner = !!data.isOwner;
            const canvasId = data.canvasId || '';
            const canvasUuid = data.canvasUuid || '';
            const targetUserId = data.targetUserId || '';
            const availableRoles = data.availableRoles || [];
            const targetCurrentRoles = data.targetCurrentRoles || [];
            const isRequesterOwner = !!data.isRequesterOwner;
            const userRolesWeight = data.userRolesWeight || 0;

            const rolesHtml = availableRoles.map(role => {
                const rawName = role.name;
                const isSystemFlag = role.is_system || 0;
                let translatedName = rawName;
                if (isSystemFlag) {
                    const roleKey = 'role.' + rawName.toLowerCase().trim().replace(/[\s\W_]+/g, '_');
                    translatedName = __(roleKey) || rawName;
                }

                const isChecked = targetCurrentRoles.includes(parseInt(role.id)) ? 'checked' : '';
                const isHigherHierarchy = !isRequesterOwner && (parseInt(role.weight) >= userRolesWeight);
                const isSuperAdminRole = parseInt(role.id) === 4 || parseInt(role.weight) >= 100;
                const isDisabled = isHigherHierarchy || (isSuperAdminRole && !isRequesterOwner);
                const disabledClass = isDisabled ? 'disabled-interaction' : '';
                const disabledAttr = isDisabled ? 'disabled' : '';

                let badgeHtml = '';
                if (isDisabled) {
                    badgeHtml = `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> ${__('lbl_unavailable')}</span>`;
                }

                return `
                    <label class="component-menu-link component-menu-link--bordered nav-item ${disabledClass}">
                        <div class="component-menu-link-icon">
                            <input type="checkbox" name="new_member_roles[]" value="${role.id}" class="admin-role-checkbox" ${isChecked} ${disabledAttr}>
                        </div>
                        <div class="component-menu-link-text">
                            <span>${translatedName}</span>
                            ${badgeHtml}
                        </div>
                    </label>
                `;
            }).join('');

            const ownerWarningHtml = isOwner ? `
                <div class="component-alert component-alert--warning">
                    <span class="material-symbols-rounded">info</span>
                    <span class="component-alert-text">${__('msg_owner_role_warning')}</span>
                </div>
            ` : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('lbl_manage_role')}: ${targetUsername}</h2>
                    <p class="component-modal-desc">${__('modal_change_canvas_role_desc')}</p>
                </div>

                <div class="component-modal-body" data-ref="change-role-wrapper" 
                     data-canvas-id="${canvasId}"
                     data-canvas-uuid="${canvasUuid}"
                     data-target-user-id="${targetUserId}">

                    ${ownerWarningHtml}

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownCanvasRolesList">
                            <div class="component-dropdown-trigger-title">
                                <span class="material-symbols-rounded">shield</span>
                                <span class="component-dropdown-text">${__('lbl_select_canvas_roles')}</span>
                            </div>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>

                        <div class="component-module component-module--dropdown disabled" data-module="dropdownCanvasRolesList">
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
                    <button class="component-button component-button--primary component-button--h40" data-action="saveCanvasMemberRoleSubmit">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    },
    timelapseSettingsModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('lbl_timelapse_title')}</h3>
                    <p class="component-modal-desc">${__('lbl_timelapse_desc')}</p>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="confirmStartTimelapse">${__('lbl_timelapse_start_playback')}</button>
                </div>
            `;
        }
    },
    snapshotDownloadModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const exportType = data.type || 'image'; // 'image' or 'video'
            const imageFormat = data.format || 'png';
            const videoDuration = parseInt(data.duration, 10) || 30;
            const videoQuality = data.quality || '1080p';

            const formatLabels = {
                png: __('lbl_image_format_png'),
                jpg: __('lbl_image_format_jpg'),
                webp: __('lbl_image_format_webp'),
                pdf: __('lbl_image_format_pdf')
            };

            const durationLabels = {
                15: __('lbl_video_speed_15'),
                30: __('lbl_video_speed_30'),
                60: __('lbl_video_speed_60')
            };

            const qualityLabels = {
                '720p': __('lbl_video_quality_720'),
                '1080p': __('lbl_video_quality_1080'),
                '4k': __('lbl_video_quality_4k')
            };

            const qualityIcons = {
                '720p': 'hd',
                '1080p': 'high_quality',
                '4k': 'video_file'
            };

            const lockVideo = (typeof getLockDetails === 'function') 
                ? getLockDetails('feat_export_timelapse', 'link') 
                : { isLocked: false, classStr: '', attributesStr: '', badgeHtml: '' };

            const isVideoActive = (exportType === 'video');
            const linkVideoClasses = ['component-menu-link', isVideoActive ? 'active' : '', lockVideo.classStr].filter(Boolean).join(' ');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('lbl_snapshot_download_title')}</h3>
                    <p class="component-modal-desc">${__('lbl_snapshot_download_desc')}</p>
                </div>

                <div class="component-modal-body">
                    <!-- Trigger 1: Tipo de exportación (Imagen / Video) -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSnapshotExportType" data-ref="snapshot_export_type" data-value="${exportType}">
                            <span class="material-symbols-rounded" data-ref="snapshot_export_type_icon">${exportType === 'video' ? 'movie' : 'image'}</span>
                            <span class="component-dropdown-text" data-ref="snapshot_export_type_text">${exportType === 'video' ? __('lbl_export_type_video') : __('lbl_export_type_image')}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleSnapshotExportType">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link ${exportType === 'image' ? 'active' : ''}" data-action="selectSnapshotExportType" data-value="image" data-icon="image" data-text="${__('lbl_export_type_image')}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">image</span></div>
                                        <div class="component-menu-link-text"><span>${__('lbl_export_type_image')}</span></div>
                                    </div>
                                    <div class="${linkVideoClasses}" data-action="selectSnapshotExportType" data-value="video" data-icon="movie" data-text="${__('lbl_export_type_video')}"${lockVideo.attributesStr}>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">movie</span></div>
                                        <div class="component-menu-link-text"><span>${__('lbl_export_type_video')}</span>${lockVideo.badgeHtml}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Trigger 2 (IMAGE): Formato de imagen (PNG, JPG, WEBP, PDF) -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full ${exportType === 'image' ? '' : 'disabled'}" data-ref="snapshot-image-options-group">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSnapshotImageFormat" data-ref="snapshot_image_format" data-value="${imageFormat}">
                            <span class="material-symbols-rounded" data-ref="snapshot_image_format_icon">${imageFormat === 'pdf' ? 'picture_as_pdf' : (imageFormat === 'jpg' ? 'photo' : (imageFormat === 'webp' ? 'web_stories' : 'image'))}</span>
                            <span class="component-dropdown-text" data-ref="snapshot_image_format_text">${formatLabels[imageFormat] || formatLabels.png}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleSnapshotImageFormat">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link ${imageFormat === 'png' ? 'active' : ''}" data-action="selectSnapshotImageFormat" data-value="png" data-icon="image" data-text="${formatLabels.png}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">image</span></div>
                                        <div class="component-menu-link-text"><span>${formatLabels.png}</span></div>
                                    </div>
                                    <div class="component-menu-link ${imageFormat === 'jpg' ? 'active' : ''}" data-action="selectSnapshotImageFormat" data-value="jpg" data-icon="photo" data-text="${formatLabels.jpg}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">photo</span></div>
                                        <div class="component-menu-link-text"><span>${formatLabels.jpg}</span></div>
                                    </div>
                                    <div class="component-menu-link ${imageFormat === 'webp' ? 'active' : ''}" data-action="selectSnapshotImageFormat" data-value="webp" data-icon="web_stories" data-text="${formatLabels.webp}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">web_stories</span></div>
                                        <div class="component-menu-link-text"><span>${formatLabels.webp}</span></div>
                                    </div>
                                    <div class="component-menu-link ${imageFormat === 'pdf' ? 'active' : ''}" data-action="selectSnapshotImageFormat" data-value="pdf" data-icon="picture_as_pdf" data-text="${formatLabels.pdf}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">picture_as_pdf</span></div>
                                        <div class="component-menu-link-text"><span>${formatLabels.pdf}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Trigger 2 (VIDEO): Velocidad / Duración (15s, 30s, 60s) -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full ${exportType === 'video' ? '' : 'disabled'}" data-ref="snapshot-video-duration-group">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSnapshotVideoDuration" data-ref="snapshot_video_duration" data-value="${videoDuration}">
                            <span class="material-symbols-rounded" data-ref="snapshot_video_duration_icon">${videoDuration === 15 ? 'speed' : (videoDuration === 60 ? 'hourglass_bottom' : 'timer')}</span>
                            <span class="component-dropdown-text" data-ref="snapshot_video_duration_text">${durationLabels[videoDuration] || durationLabels[30]}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleSnapshotVideoDuration">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link ${videoDuration === 15 ? 'active' : ''}" data-action="selectSnapshotVideoDuration" data-value="15" data-icon="speed" data-text="${durationLabels[15]}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">speed</span></div>
                                        <div class="component-menu-link-text"><span>${durationLabels[15]}</span></div>
                                    </div>
                                    <div class="component-menu-link ${videoDuration === 30 ? 'active' : ''}" data-action="selectSnapshotVideoDuration" data-value="30" data-icon="timer" data-text="${durationLabels[30]}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                        <div class="component-menu-link-text"><span>${durationLabels[30]}</span></div>
                                    </div>
                                    <div class="component-menu-link ${videoDuration === 60 ? 'active' : ''}" data-action="selectSnapshotVideoDuration" data-value="60" data-icon="hourglass_bottom" data-text="${durationLabels[60]}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">hourglass_bottom</span></div>
                                        <div class="component-menu-link-text"><span>${durationLabels[60]}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Trigger 3 (VIDEO): Calidad / Resolución (720p, 1080p, 4k) -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full ${exportType === 'video' ? '' : 'disabled'}" data-ref="snapshot-video-quality-group">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSnapshotVideoQuality" data-ref="snapshot_video_quality" data-value="${videoQuality}">
                            <span class="material-symbols-rounded" data-ref="snapshot_video_quality_icon">${qualityIcons[videoQuality] || 'high_quality'}</span>
                            <span class="component-dropdown-text" data-ref="snapshot_video_quality_text">${qualityLabels[videoQuality] || qualityLabels['1080p']}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown disabled" data-module="moduleSnapshotVideoQuality">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list">
                                    <div class="component-menu-link ${videoQuality === '720p' ? 'active' : ''}" data-action="selectSnapshotVideoQuality" data-value="720p" data-icon="hd" data-text="${qualityLabels['720p']}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">hd</span></div>
                                        <div class="component-menu-link-text"><span>${qualityLabels['720p']}</span></div>
                                    </div>
                                    <div class="component-menu-link ${videoQuality === '1080p' ? 'active' : ''}" data-action="selectSnapshotVideoQuality" data-value="1080p" data-icon="high_quality" data-text="${qualityLabels['1080p']}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">high_quality</span></div>
                                        <div class="component-menu-link-text"><span>${qualityLabels['1080p']}</span></div>
                                    </div>
                                    <div class="component-menu-link ${videoQuality === '4k' ? 'active' : ''}" data-action="selectSnapshotVideoQuality" data-value="4k" data-icon="video_file" data-text="${qualityLabels['4k']}">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">video_file</span></div>
                                        <div class="component-menu-link-text"><span>${qualityLabels['4k']}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="confirmExecuteSnapshotDownload" data-ref="btn-confirm-snapshot-download">
                        <span class="material-symbols-rounded">download</span>
                        <span>${__('btn_download_snapshot')}</span>
                    </button>
                </div>
            `;
        }
    },
    selectCanvasTemplateModal: {
        medium: true,
        build: (data = {}) => {
            const templates = data.templates || [];
            const selectedTemplateId = data.selectedTemplateId || '';
            const basePath = data.basePath || '';

            const isEmptyActive = (!selectedTemplateId || selectedTemplateId === '') ? 'active selected' : '';

            let cardsHtml = `
                <div class="component-modal-template-card ${isEmptyActive}" data-action="selectModalTemplateCard" data-template-id="" data-template-name="${__('lbl_empty_canvas')}">
                    <div class="component-modal-template-preview component-modal-template-preview--empty">
                        <span class="material-symbols-rounded">crop_free</span>
                    </div>
                    <span class="component-modal-template-check material-symbols-rounded">check_circle</span>
                    <div class="component-modal-template-info">
                        <span class="component-modal-template-name">${__('lbl_empty_canvas')}</span>
                    </div>
                </div>
            `;

            templates.forEach(tpl => {
                const isTplActive = (selectedTemplateId === tpl.id) ? 'active selected' : '';
                const name = __(tpl.name_key);
                const thumbnailSrc = basePath + tpl.thumbnail;

                cardsHtml += `
                    <div class="component-modal-template-card ${isTplActive}" data-action="selectModalTemplateCard" data-template-id="${tpl.id}" data-template-name="${name}">
                        <img class="component-modal-template-img image-lazy-fade" data-ref="template-thumbnail" src="${thumbnailSrc}" alt="${name}" loading="lazy" onload="this.classList.add('image-loaded')" onerror="this.classList.add('image-loaded')">
                        <span class="component-modal-template-check material-symbols-rounded">check_circle</span>
                        <div class="component-modal-template-info">
                            <span class="component-modal-template-name">${name}</span>
                        </div>
                    </div>
                `;
            });

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('canvas_template_modal_title')}</h3>
                    <p class="component-modal-desc">${__('canvas_template_modal_desc')}</p>
                </div>
                <div class="component-modal-body component-modal-body--scrollable">
                    <div class="component-modal-template-grid" data-ref="modal_template_grid">
                        ${cardsHtml}
                    </div>
                    <div data-ref="selected_template_id" data-value="${selectedTemplateId}"></div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_select_template')}</button>
                </div>
            `;
        }
    },
    selectCanvasPaletteModal: {
        medium: true,
        build: (data = {}) => {
            const palettes = data.palettes || [];
            const selectedPaletteId = data.selectedPaletteId || 'default';
            const userTier = data.userTier ?? (window.APP_USER?.subscription_tier ?? 0);
            const canUseCustomPalettes = data.canUseCustomPalettes ?? (window.APP_LIMITS && window.APP_LIMITS.custom_palettes === true);

            let cardsHtml = '';
            palettes.forEach(palette => {
                const isDefault = palette.id === 'default';
                let fallbackTier = 0;
                if (!isDefault && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const paid = [...window.APP_TIERS].filter(t => parseInt(t.tier_level, 10) > 0 && t.is_active !== 0 && t.is_active !== false).sort((a, b) => parseInt(a.tier_level, 10) - parseInt(b.tier_level, 10));
                    if (paid.length > 0) fallbackTier = parseInt(paid[0].tier_level, 10);
                }
                const reqTier = palette.tier !== undefined ? palette.tier : (isDefault ? 0 : fallbackTier);
                const isLocked = isDefault ? false : (palette.id.startsWith('custom_') || palette.is_custom ? !canUseCustomPalettes : (userTier < reqTier));
                
                const translatedName = __(palette.name_key);
                const isActive = (selectedPaletteId === palette.id);
                const activeClass = isActive ? 'active selected' : '';
                const lockedClass = isLocked ? 'disabled-interaction' : '';
                const actionAttr = isLocked ? '' : 'selectModalPaletteCard';
                const titleAttr = isLocked ? `title="${__('tooltip_upgrade_palette')}"` : '';

                const tierName = reqTier > 0 ? getDynamicTierName(reqTier) : '';
                const lockHtml = isLocked ? `<span class="component-badge component-badge--sm"><span class="material-symbols-rounded">stars</span> ${tierName}</span>` : '';

                const colors = palette.colors || [];
                let swatchesHtml = '';
                colors.forEach(col => {
                    const hex = col.hex || col;
                    swatchesHtml += `<div class="component-modal-palette-swatch" style="background-color: ${hex};"></div>`;
                });

                cardsHtml += `
                    <div class="component-modal-palette-card ${activeClass} ${lockedClass}" data-action="${actionAttr}" data-palette-id="${palette.id}" data-palette-name="${translatedName}" ${titleAttr}>
                        <div class="component-modal-palette-card-header">
                            <div class="component-modal-palette-title-group">
                                <span class="material-symbols-rounded">palette</span>
                                <span class="component-modal-palette-name">${translatedName}</span>
                            </div>
                            <div class="component-modal-palette-badges">
                                ${lockHtml}
                            </div>
                        </div>
                        <div class="component-modal-palette-swatches">
                            ${swatchesHtml}
                        </div>
                        <span class="component-modal-palette-check material-symbols-rounded">check_circle</span>
                    </div>
                `;
            });

            const customBtnHtml = canUseCustomPalettes ? `
                <button type="button" class="component-modal-palette-custom-btn" data-action="openCreateCustomPaletteModal">
                    <span class="material-symbols-rounded">add_circle</span>
                    <span>${__('btn_create_custom_palette')}</span>
                </button>
            ` : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('canvas_palette_modal_title')}</h3>
                    <p class="component-modal-desc">${__('canvas_palette_modal_desc')}</p>
                </div>
                <div class="component-modal-body component-modal-body--scrollable">
                    <div class="component-modal-palette-grid" data-ref="modal_palette_grid">
                        ${cardsHtml}
                    </div>
                    ${customBtnHtml}
                    <div data-ref="selected_palette_id" data-value="${selectedPaletteId}"></div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_select_palette')}</button>
                </div>
            `;
        }
    },
    createCustomPaletteModal: {
        medium: true,
        build: (data = {}) => {
            const initialName = data.name || '';
            const initialColors = Array.isArray(data.colors) && data.colors.length >= 4 
                ? data.colors 
                : ['#D32029', '#206BD3', '#3EB352', '#FF8C00'];

            let swatchesHtml = '';
            initialColors.forEach((hex, idx) => {
                swatchesHtml += `
                    <div class="component-palette-swatch-card" data-action="editPaletteColorItem" data-index="${idx}" data-hex="${hex}">
                        <button type="button" class="component-palette-swatch-card__delete" data-action="removePaletteColorItem" data-index="${idx}" title="${__('delete')}">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                        <div class="component-palette-swatch-card__preview" style="background-color: ${hex};"></div>
                        <span class="component-palette-swatch-card__hex">${hex}</span>
                    </div>
                `;
            });

            const addBtnDisabled = initialColors.length >= 36 ? ' disabled-interaction' : '';
            const addBtnHtml = `
                <div class="component-palette-swatch-card--add${addBtnDisabled}" data-action="openAddPaletteColor" data-ref="btnAddPaletteColor">
                    <span class="material-symbols-rounded">add</span>
                    <span class="component-palette-swatch-card--add__text">${__('btn_add_to_palette') || 'Añadir Color'}</span>
                </div>
            `;

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                
                <!-- STEP 1: Palette Name -->
                <div class="active" data-ref="custom-palette-step-1">
                    <div class="component-modal-header">
                        <h3 class="component-modal-title">${__('canvas_create_custom_palette')}</h3>
                        <p class="component-modal-desc">${__('canvas_palette_name_accordion_desc') || 'Define el nombre de tu paleta personalizada.'}</p>
                    </div>
                    <div class="component-modal-body">
                        <div class="component-form-group">
                            <div class="component-input-group component-input-group--h40">
                                <span class="material-symbols-rounded">palette</span>
                                <input class="component-input-field" type="text" data-ref="custom_palette_name" placeholder="${__('canvas_palette_new') || 'Nueva Paleta'}" value="${escapeHTML(initialName)}" maxlength="40" autocomplete="off">
                            </div>
                        </div>
                    </div>
                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="customPaletteNextStep">${__('btn_next') || 'Siguiente'}</button>
                    </div>
                </div>

                <!-- STEP 2: Colors List / Builder -->
                <div class="disabled" data-ref="custom-palette-step-2" data-colors='${JSON.stringify(initialColors)}'>
                    <div class="component-modal-header">
                        <div class="component-modal-header-nav">
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="customPalettePrevStep" data-tooltip="${__('btn_back') || 'Atrás'}" data-position="right">
                                <span class="material-symbols-rounded msr-arrow_back">arrow_back</span>
                            </button>
                            <h3 class="component-modal-title" data-ref="custom_palette_title_display">${escapeHTML(initialName) || __('canvas_palette_new')}</h3>
                        </div>
                        <p class="component-modal-desc">${__('canvas_palette_color_add_desc') || 'Selecciona el nuevo tono para añadirlo a tu paleta personalizada.'}</p>
                    </div>
                    <div class="component-modal-body component-modal-body--scrollable">
                        <div class="component-palette-meta-row">
                            <span class="component-subtext" data-ref="customPaletteColorCount">${initialColors.length} / 36</span>
                            <span class="component-subtext component-subtext--sm">${__('msg_palette_min_colors') || 'Mínimo 4 colores'}</span>
                        </div>
                        <div class="component-palette-swatches-grid" data-ref="customPaletteSwatchesGrid">
                            ${swatchesHtml}
                            ${addBtnHtml}
                        </div>
                    </div>
                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-action="customPalettePrevStep">${__('btn_back') || 'Atrás'}</button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="submitCustomPalette">${__('btn_save') || 'Guardar'}</button>
                    </div>
                </div>
            `;
        }
    },
    editPaletteColorModal: {
        medium: false,
        colorPicker: true,
        build: (data = {}) => {
            const hex = (data.hex || '#3b82f6').toUpperCase();
            const hsv = hexToHsv(hex);
            const title = data.title || __('canvas_palette_color_modal_title');
            const desc = data.desc || __('canvas_palette_color_modal_desc');
            const confirmBtnText = data.confirmText || __('btn_save');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${title}</h3>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-color-picker" data-ref="customColorPicker" data-h="${hsv.h}" data-s="${hsv.s}" data-v="${hsv.v}">
                        <div class="component-color-picker__sv-area" data-action="dragSV" style="background-color: hsl(${hsv.h}, 100%, 50%);">
                            <div class="component-color-picker__sv-bg"></div>
                            <div class="component-color-picker__sv-thumb" data-ref="svThumb" style="left: ${hsv.s}%; top: ${100 - hsv.v}%;"></div>
                        </div>
                        <div class="component-color-picker__hue-area" data-action="dragHue">
                            <div class="component-color-picker__hue-thumb" data-ref="hueThumb" style="left: ${(hsv.h / 360) * 100}%;"></div>
                        </div>
                        <div class="component-input-group component-input-group--h34 component-input-group--color">
                            <div class="component-color-swatch component-color-swatch--sm" data-ref="hexInputPreview" style="background-color: ${hex};"></div>
                            <input class="component-input-field component-input-field--mono" data-ref="selected_hex" type="text" value="${hex}" maxlength="7" placeholder="#000000">
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${confirmBtnText}</button>
                </div>
            `;
        }
    },

    imageViewer: {
        customBoxClass: 'component-modal-box--image-viewer',
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const images = Array.isArray(data.images) ? data.images : [data.imageUrl || data.url || ''];
            const defaultSender = data.sender || {};
            const normalizedImages = images.map((item, idx) => {
                if (typeof item === 'string') {
                    return {
                        url: item,
                        name: data.title || __('lbl_attached_image') || 'Foto adjunta',
                        sender: defaultSender.username || defaultSender.name || __('lbl_user') || 'Usuario',
                        avatar: defaultSender.avatar || '',
                        date: defaultSender.date || '',
                        subBg: defaultSender.subBg || ''
                    };
                }
                return {
                    url: item.url || '',
                    name: item.name || data.title || __('lbl_attached_image') || 'Foto adjunta',
                    sender: item.sender || defaultSender.username || defaultSender.name || __('lbl_user') || 'Usuario',
                    avatar: item.avatar || defaultSender.avatar || '',
                    date: item.date || defaultSender.date || '',
                    subBg: item.subBg || defaultSender.subBg || ''
                };
            });

            const initialIndex = Math.max(0, Math.min(parseInt(data.initialIndex, 10) || 0, Math.max(0, normalizedImages.length - 1)));
            const total = normalizedImages.length;
            const currentItem = normalizedImages[initialIndex] || { url: '', name: 'Foto adjunta', sender: 'Usuario', avatar: '', date: '', subBg: '' };
            const encodedImages = escapeHTML(JSON.stringify(normalizedImages));
            const avatarUrl = currentItem.avatar || ((window.AppBasePath || '') + '/public/assets/img/fallbacks/avatar-default.png');
            const subBg = currentItem.subBg || '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-image-viewer-canva" data-ref="modal-image-viewer-root" data-images="${encodedImages}" data-current-index="${initialIndex}" data-canvas-uuid="${data.canvasUuid || ''}">
                    <!-- Left Column: Stage & Bottom Thumbnails -->
                    <div class="component-image-viewer-main-col">
                        <div class="component-image-viewer-stage">
                            <img src="${currentItem.url}" alt="Preview" class="component-image-viewer-img image-lazy-fade" data-ref="iv-stage-img" decoding="async" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${window.AppBasePath || ''}/public/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">
                        </div>

                        ${total > 1 ? `
                        <div class="component-tags-carousel-wrapper component-image-viewer-carousel-wrapper" data-ref="iv-carousel-wrapper">
                            <button type="button" class="component-tag-nav-btn component-tag-nav-left disabled" data-action="carouselLeft" title="${__('btn_prev')}">
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                            <div class="component-tags-carousel component-image-viewer-strip" data-ref="iv-thumbs-container">
                                ${normalizedImages.map((img, idx) => `
                                    <div class="component-image-viewer-thumb ${idx === initialIndex ? 'active' : ''} component-skeleton" data-modal-action="selectImageViewerIndex" data-index="${idx}">
                                        <img src="${img.url}" alt="" loading="lazy" decoding="async" class="image-lazy-fade" onload="this.classList.add('image-loaded'); this.parentElement.classList.remove('component-skeleton');" onerror="this.classList.add('image-loaded'); this.parentElement.classList.remove('component-skeleton');">
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="component-tag-nav-btn component-tag-nav-right" data-action="carouselRight" title="${__('btn_next')}">
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Right Column: Sidebar -->
                    <div class="component-image-viewer-side-col">
                        <div class="component-image-viewer-info-header">
                            <h2 class="component-image-viewer-title" data-ref="iv-title">${escapeHTML(currentItem.name)}</h2>
                            <div class="component-image-viewer-meta" data-ref="iv-meta">
                                <div class="component-badge component-badge--sm" data-ref="iv-meta-badge">
                                    <span class="material-symbols-rounded">photo_library</span>
                                    <span data-ref="iv-counter-text">${total > 1 ? `${initialIndex + 1} de ${total} imágenes` : '1 imagen'}</span>
                                </div>
                                <div class="component-badge component-badge--sm ${currentItem.date ? '' : 'disabled'}" data-ref="iv-date-badge">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span data-ref="iv-sender-date">${escapeHTML(currentItem.date || '')}</span>
                                </div>
                            </div>

                            <div class="component-image-viewer-sender">
                                <div class="component-avatar component-avatar--28 subscription-dynamic" data-ref="iv-sender-avatar-wrap" data-sub-bg="${subBg}" style="--active-subscription-bg: ${subBg};">
                                    <img src="${avatarUrl}" alt="Avatar" data-ref="iv-sender-avatar" onerror="this.onerror=null; this.src='${window.AppBasePath || ''}/public/assets/img/fallbacks/avatar-default.png';">
                                </div>
                                <span class="component-image-viewer-sender-name" data-ref="iv-sender-name">Por ${escapeHTML(currentItem.sender)}</span>
                            </div>

                            <div class="component-image-viewer-actions">
                                <button type="button" class="component-button component-button--primary component-button--h40 component-button--full" data-modal-action="downloadImageViewer">
                                    <span class="material-symbols-rounded">download</span>
                                    <span>${__('lbl_download_template') || 'Descargar plantilla'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    setup2faModal: {
        customBoxClass: 'component-modal-box--split',
        build: (data = {}) => {
            const secret = data.secret || '';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- Left Column: Form & Steps -->
                <div class="component-modal-split-left">
                    <!-- Step 1: Scan & Enter Code -->
                    <div class="active component-modal-step-inner" data-ref="2fa-setup-step-1">
                        <div class="component-modal-header">
                            <h2 class="component-modal-title">
                                ${__('2fa_protect_account_title') || __('2fa_title')}
                            </h2>
                            <p class="component-modal-desc">
                                ${__('2fa_protect_account_desc') || __('2fa_desc')}
                            </p>
                        </div>

                        <div class="component-modal-body">
                            <div class="component-input-group">
                                <input type="text" data-ref="2fa_setup_totp_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off" inputmode="numeric">
                                <label class="component-input-label">${__('lbl_6_digit_code') || 'Código de 6 dígitos'}</label>
                            </div>

                            <button type="button" class="component-button component-button--primary component-button--h40" data-action="submitSetupEnable2FA">
                                ${__('btn_enable_authenticator_app') || __('btn_activate')}
                            </button>

                            <div class="component-link-container component-link-container--start">
                                <span class="component-link" data-action="toggle2FASecretKey">${__('btn_show_secret_key') || __('2fa_cant_scan') || 'Mostrar clave secreta'}</span>
                            </div>

                            <div class="disabled" data-ref="2fa_secret_key_container">
                                <div class="component-2fa-secret-box" data-ref="2fa_secret_key_text" data-action="copy2FASecretKey" title="${__('copy')}">
                                    ${escapeHTML(secret) || '...'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Recovery Codes -->
                    <div class="disabled component-modal-step-inner" data-ref="2fa-setup-step-2-recovery">
                        <div class="component-modal-header">
                            <h2 class="component-modal-title">
                                ${__('2fa_activated_title')}
                            </h2>
                            <p class="component-modal-desc">
                                ${__('2fa_new_codes_desc')}
                            </p>
                        </div>

                        <div class="component-modal-body">
                            <div class="component-modal-code-grid" data-ref="2fa-recovery-codes-grid"></div>
                        </div>

                        <div class="component-modal-actions">
                            <button type="button" class="component-button component-button--h40" data-action="copySetupRecoveryCodes">
                                <span class="material-symbols-rounded">content_copy</span>
                                <span>${__('btn_copy_codes')}</span>
                            </button>
                            <button type="button" class="component-button component-button--primary component-button--h40" data-action="finishSetup2FA">
                                <span>${__('btn_finish')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Banner Gradient & QR Code -->
                <div class="component-modal-split-right">
                    <div class="component-2fa-qr-frame">
                        <div class="component-modal-split-qr-target" data-ref="2fa-qr-target">
                            <div class="component-spinner"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    recoveryCodesDisplayModal: {
        customBoxClass: 'component-modal-box--split',
        build: (data = {}) => {
            const codes = Array.isArray(data.recovery_codes) ? data.recovery_codes : [];
            let codesHtml = '';
            codes.forEach(c => {
                codesHtml += `
                    <div class="component-recovery-code">
                        <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                        <span class="component-recovery-code-text">${escapeHTML(c)}</span>
                    </div>
                `;
            });

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- Left Column: Codes & Actions -->
                <div class="component-modal-split-left">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">
                            ${__('2fa_new_codes_title') || 'Nuevos códigos de recuperación'}
                        </h2>
                        <p class="component-modal-desc">
                            ${__('2fa_new_codes_desc') || 'Guarda estos códigos en un lugar seguro. Los códigos anteriores han sido invalidados.'}
                        </p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-modal-code-grid" data-ref="2fa-display-recovery-codes-grid">
                            ${codesHtml}
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-action="copyDisplayRecoveryCodes" data-codes="${escapeHTML(codes.join('\n'))}">
                            <span class="material-symbols-rounded">content_copy</span>
                            <span>${__('btn_copy_codes') || 'Copiar códigos'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="cancel">
                            <span>${__('btn_finish_configuration') || 'Terminar configuración'}</span>
                        </button>
                    </div>
                </div>

                <!-- Right Column: Banner Gradient & Illustration -->
                <div class="component-modal-split-right">
                    <div class="component-modal-split-art-stage">
                        <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="100" cy="100" r="85" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2" stroke-dasharray="6 6"/>
                            <circle cx="100" cy="100" r="65" fill="rgba(255, 255, 255, 0.12)"/>
                            <path d="M100 45 L145 65 C145 105 125 138 100 155 C75 138 55 105 55 65 L100 45 Z" fill="rgba(255, 255, 255, 0.2)" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
                            <path d="M100 78 C91.7157 78 85 84.7157 85 93 C85 99.4 89.04 104.85 94.75 106.88 L94.75 122 C94.75 124.9 97.1 127.25 100 127.25 C102.9 127.25 105.25 124.9 105.25 122 L105.25 116 L111 116 C112.65 116 114 114.65 114 113 C114 111.35 112.65 110 111 110 L105.25 110 L105.25 106.88 C110.96 104.85 115 99.4 115 93 C115 84.7157 108.284 78 100 78 Z M100 86 C103.866 86 107 89.134 107 93 C107 96.866 103.866 100 100 100 C96.134 100 93 96.866 93 93 C93 89.134 96.134 86 100 86 Z" fill="#ffffff"/>
                        </svg>
                    </div>
                </div>
            `;
        }
    },

    exportAnimationModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const w = data.boardWidth || 32;
            const h = data.boardHeight || 32;
            const framesCount = data.framesCount || 1;
            const fps = data.fps || 12;
            const defaultScale = data.defaultScale || (w <= 32 ? 8 : (w <= 64 ? 4 : 2));

            const scales = [1, 2, 4, 8, 16];
            const scaleOptionsHtml = scales.map(s => {
                const isActive = (s === defaultScale);
                return `
                    <div class="component-menu-link ${isActive ? 'active' : ''}" data-action="selectExportAnimScaleOption" data-value="${s}" data-label="${s}x (${w * s}x${h * s} px)" data-icon="aspect_ratio" data-res="${w * s}x${h * s} px">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">aspect_ratio</span></div>
                        <div class="component-menu-link-text"><span>${s}x (${w * s}x${h * s} px)</span></div>
                    </div>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- ETAPA 1: SELECCIÓN DE FORMATO -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="export-anim-step-1">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('lbl_export_animation_title') || 'Exportar Animación'}</h2>
                        <p class="component-modal-desc">${__('lbl_export_step1_desc') || 'Selecciona el formato en el que deseas exportar tu animación o secuencia de fotogramas.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <!-- Dropdown Trigger: Formato de Exportación -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleExportAnimFormat" data-ref="export-format-trigger" data-value="gif">
                                <span class="material-symbols-rounded" data-ref="export-format-icon">gif</span>
                                <span class="component-dropdown-text" data-ref="export-format-label">${__('lbl_export_format_gif') || 'GIF Animado (.gif)'}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleExportAnimFormat">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectExportAnimFormatOption" data-value="gif" data-label="${__('lbl_export_format_gif') || 'GIF Animado (.gif)'}" data-icon="gif">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gif</span></div>
                                            <div class="component-menu-link-text">
                                                <span>${__('lbl_export_format_gif') || 'GIF Animado (.gif)'}</span>
                                                <span class="component-menu-link-subtext">${__('lbl_export_format_gif_desc') || 'Secuencia animada en bucle para compartir en web o redes'}</span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectExportAnimFormatOption" data-value="spritesheet" data-label="${__('lbl_export_format_spritesheet') || 'Sprite Sheet (.png)'}" data-icon="grid_on">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_on</span></div>
                                            <div class="component-menu-link-text">
                                                <span>${__('lbl_export_format_spritesheet') || 'Sprite Sheet (.png)'}</span>
                                                <span class="component-menu-link-subtext">${__('lbl_export_format_spritesheet_desc') || 'Tira horizontal de sprites para motores de videojuegos'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-modal-action="cancel">
                            <span>${__('btn_cancel') || 'Cancelar'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="exportAnimNextStep">
                            <span>${__('btn_continue') || 'Continuar'}</span>
                        </button>
                    </div>
                </div>

                <!-- ETAPA 2: CONFIGURACIÓN Y PREVISUALIZADOR -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="export-anim-step-2">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title" data-ref="export-step2-title">${__('lbl_export_step2_title') || 'Ajustes y Previsualización'}</h2>
                        <p class="component-modal-desc">${__('lbl_export_step2_desc') || 'Configura el escalado de píxeles y fondo antes de generar el archivo final.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <!-- Visualizador de Animación en Vivo -->
                        <div class="component-anim-preview-box mb-16">
                            <div class="component-anim-preview-stage">
                                <canvas class="component-anim-preview-canvas" data-ref="export-preview-canvas" width="160" height="160"></canvas>
                            </div>
                            <div class="component-anim-preview-meta">
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">movie</span> <span data-ref="export-meta-frames">${framesCount} frames</span></span>
                                <span class="component-badge component-badge--sm" data-ref="export-meta-fps"><span class="material-symbols-rounded">speed</span> ${fps} FPS</span>
                                <span class="component-badge component-badge--sm" data-ref="export-meta-res"><span class="material-symbols-rounded">aspect_ratio</span> <span data-ref="export-meta-res-text">${w * defaultScale}x${h * defaultScale} px</span></span>
                            </div>
                        </div>

                        <!-- Dropdown 1: Escalado de Píxeles -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleExportAnimScale" data-ref="export-scale-trigger" data-value="${defaultScale}">
                                <span class="material-symbols-rounded" data-ref="export-scale-icon">aspect_ratio</span>
                                <span class="component-dropdown-text" data-ref="export-scale-label">${defaultScale}x (${w * defaultScale}x${h * defaultScale} px)</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleExportAnimScale">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        ${scaleOptionsHtml}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Dropdown 2: Fondo (Transparente / Blanco) -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleExportAnimBg" data-ref="export-bg-trigger" data-value="transparent">
                                <span class="material-symbols-rounded" data-ref="export-bg-icon">opacity</span>
                                <span class="component-dropdown-text" data-ref="export-bg-label">${__('lbl_export_bg_transparent') || 'Fondo transparente'}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleExportAnimBg">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectExportAnimBgOption" data-value="transparent" data-label="${__('lbl_export_bg_transparent') || 'Fondo transparente'}" data-icon="opacity">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">opacity</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_export_bg_transparent') || 'Fondo transparente'}</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectExportAnimBgOption" data-value="white" data-label="${__('lbl_export_bg_white') || 'Fondo blanco / sólido'}" data-icon="format_color_fill">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">format_color_fill</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_export_bg_white') || 'Fondo blanco / sólido'}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Dropdown 3 (Solo visible para Sprite Sheet): Metadata JSON -->
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--full disabled" data-ref="export-json-wrapper">
                            <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleExportAnimJson" data-ref="export-json-trigger" data-value="true">
                                <span class="material-symbols-rounded" data-ref="export-json-icon">data_object</span>
                                <span class="component-dropdown-text" data-ref="export-json-label">${__('lbl_export_json_yes') || 'Incluir metadata JSON (.json)'}</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown disabled" data-module="moduleExportAnimJson">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list">
                                        <div class="component-menu-link active" data-action="selectExportAnimJsonOption" data-value="true" data-label="${__('lbl_export_json_yes') || 'Incluir metadata JSON (.json)'}" data-icon="data_object">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">data_object</span></div>
                                            <div class="component-menu-link-text">
                                                <span>${__('lbl_export_json_yes') || 'Incluir metadata JSON (.json)'}</span>
                                                <span class="component-menu-link-subtext">Para Godot, Unity, Phaser o Web</span>
                                            </div>
                                        </div>
                                        <div class="component-menu-link" data-action="selectExportAnimJsonOption" data-value="false" data-label="${__('lbl_export_json_no') || 'Solo imagen (.png)'}" data-icon="image">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">image</span></div>
                                            <div class="component-menu-link-text"><span>${__('lbl_export_json_no') || 'Solo imagen (.png)'}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-action="exportAnimPrevStep">
                            <span>${__('btn_back') || 'Atrás'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="triggerExportAnimationDownload">
                            <span class="material-symbols-rounded">download</span>
                            <span data-ref="export-download-label">${__('btn_download_gif') || 'Descargar GIF'}</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    autoOutlineModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const currentColor = data.currentColor || '#000000';
            const layerName = data.layerName || 'Capa Activa';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <div class="component-card--grouped component-card--flush active component-modal-step">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('lbl_auto_outline_title') || 'Generar Contorno (Auto-Outline)'}</h2>
                        <p class="component-modal-desc">${__('lbl_auto_outline_desc') || 'Añade automáticamente un contorno de 1px alrededor de todo el contenido de ' + layerName + '.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <!-- 1. Color del Contorno -->
                        <div class="component-form-group">
                            <label class="component-label">${__('lbl_outline_color') || 'Color del borde'}</label>
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOutlineColorDropdown" data-ref="outline-color-trigger" data-value="#000000">
                                    <span class="component-color-swatch component-color-swatch--sm" data-ref="outline-color-swatch" style="background-color: #000000;"></span>
                                    <span class="component-dropdown-text" data-ref="outline-color-label">Negro (#000000)</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleOutlineColorDropdown">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link active" data-action="selectOutlineColorOption" data-value="#000000" data-label="Negro (#000000)">
                                                <div class="component-menu-link-icon"><span class="component-color-swatch component-color-swatch--sm" style="background-color: #000000;"></span></div>
                                                <div class="component-menu-link-text"><span>Negro (#000000)</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectOutlineColorOption" data-value="${currentColor}" data-label="Color Actual (${currentColor})">
                                                <div class="component-menu-link-icon"><span class="component-color-swatch component-color-swatch--sm" style="background-color: ${currentColor};"></span></div>
                                                <div class="component-menu-link-text"><span>Color Actual (${currentColor})</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectOutlineColorOption" data-value="#FFFFFF" data-label="Blanco (#FFFFFF)">
                                                <div class="component-menu-link-icon"><span class="component-color-swatch component-color-swatch--sm" style="background-color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4);"></span></div>
                                                <div class="component-menu-link-text"><span>Blanco (#FFFFFF)</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Tipo de Conectividad (4 u 8 direcciones) -->
                        <div class="component-form-group">
                            <label class="component-label">${__('lbl_outline_shape') || 'Esquinas y Conectividad'}</label>
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOutlineShapeDropdown" data-ref="outline-shape-trigger" data-value="false">
                                    <span class="material-symbols-rounded" data-ref="outline-shape-icon">add</span>
                                    <span class="component-dropdown-text" data-ref="outline-shape-label">4 Direcciones (Ortogonal / Cruz)</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleOutlineShapeDropdown">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link active" data-action="selectOutlineShapeOption" data-value="false" data-label="4 Direcciones (Ortogonal / Cruz)" data-icon="add">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">add</span></div>
                                                <div class="component-menu-link-text">
                                                    <span>4 Direcciones (Ortogonal / Cruz)</span>
                                                    <span class="component-menu-link-subtext">Borde limpio pixel art clásico sin esquinas dobles</span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectOutlineShapeOption" data-value="true" data-label="8 Direcciones (Completo con Diagonales)" data-icon="grid_view">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">grid_view</span></div>
                                                <div class="component-menu-link-text">
                                                    <span>8 Direcciones (Completo con Diagonales)</span>
                                                    <span class="component-menu-link-subtext">Envuelve completamente incluyendo esquinas diagonales</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Destino (Capa Actual vs Nueva Capa Inferior) -->
                        <div class="component-form-group">
                            <label class="component-label">${__('lbl_outline_target') || 'Destino del contorno'}</label>
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleOutlineTargetDropdown" data-ref="outline-target-trigger" data-value="new_below">
                                    <span class="material-symbols-rounded" data-ref="outline-target-icon">layers</span>
                                    <span class="component-dropdown-text" data-ref="outline-target-label">Crear en nueva capa debajo (Recomendado)</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleOutlineTargetDropdown">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <div class="component-menu-link active" data-action="selectOutlineTargetOption" data-value="new_below" data-label="Crear en nueva capa debajo (Recomendado)" data-icon="layers">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">layers</span></div>
                                                <div class="component-menu-link-text">
                                                    <span>Crear en nueva capa debajo</span>
                                                    <span class="component-menu-link-subtext">Mantiene el dibujo original editable e independiente</span>
                                                </div>
                                            </div>
                                            <div class="component-menu-link" data-action="selectOutlineTargetOption" data-value="current" data-label="Aplicar en la capa actual" data-icon="edit">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">edit</span></div>
                                                <div class="component-menu-link-text">
                                                    <span>Aplicar en la capa actual</span>
                                                    <span class="component-menu-link-subtext">Escribe directamente sobre los píxeles adyacentes</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-modal-action="cancel">
                            <span>${__('btn_cancel') || 'Cancelar'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="triggerGenerateAutoOutline">
                            <span class="material-symbols-rounded">border_outer</span>
                            <span>${__('btn_apply_outline') || 'Aplicar Contorno'}</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    layerBlendModeModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const currentBlend = data.currentBlend || 'source-over';
            const layerName = data.layerName || 'Capa Activa';

            const blendModes = [
                { value: 'source-over', label: 'Normal (source-over)', desc: 'Modo de dibujo estándar sin mezcla especial' },
                { value: 'multiply', label: 'Multiplicar (multiply)', desc: 'Oscurece multiplicando los colores de las capas' },
                { value: 'screen', label: 'Pantalla (screen)', desc: 'Aclara combinando inversamente los valores de color' },
                { value: 'overlay', label: 'Superponer (overlay)', desc: 'Aumenta el contraste combinando multiplicar y pantalla' },
                { value: 'darken', label: 'Oscurecer (darken)', desc: 'Conserva los píxeles más oscuros de cada capa' },
                { value: 'lighten', label: 'Aclarar (lighten)', desc: 'Conserva los píxeles más claros de cada capa' },
                { value: 'color-dodge', label: 'Sobreexponer (color-dodge)', desc: 'Aclara los colores reflejando la capa superior' },
                { value: 'color-burn', label: 'Subexponer (color-burn)', desc: 'Oscurece aumentando el contraste' },
                { value: 'hard-light', label: 'Luz fuerte (hard-light)', desc: 'Simula iluminación dura sobre el contenido' },
                { value: 'soft-light', label: 'Luz suave (soft-light)', desc: 'Simula iluminación difusa suave' },
                { value: 'difference', label: 'Diferencia (difference)', desc: 'Resta el color más brillante del otro' },
                { value: 'exclusion', label: 'Exclusión (exclusion)', desc: 'Efecto similar a diferencia con menor contraste' }
            ];

            const currentObj = blendModes.find(b => b.value === currentBlend) || blendModes[0];

            const optionsHtml = blendModes.map(b => `
                <div class="component-menu-link ${b.value === currentBlend ? 'active' : ''}" data-action="selectModalBlendModeOption" data-value="${b.value}" data-label="${b.label}">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">layers</span></div>
                    <div class="component-menu-link-text">
                        <span>${b.label}</span>
                        <span class="component-menu-link-subtext">${b.desc}</span>
                    </div>
                </div>
            `).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <div class="component-card--grouped component-card--flush active component-modal-step">
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('lbl_blend_mode') || 'Modo de Fusión'}</h2>
                        <p class="component-modal-desc">${__('lbl_blend_mode_desc') || 'Selecciona cómo se fusionan visualmente los píxeles de ' + layerName + ' con las capas inferiores.'}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-form-group">
                            <label class="component-label">${__('lbl_blend_mode_select') || 'Modo de Mezcla'}</label>
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleModalBlendModeDropdown" data-ref="modal-blend-mode-trigger" data-value="${currentObj.value}">
                                    <span class="material-symbols-rounded" data-ref="modal-blend-mode-icon">layers</span>
                                    <span class="component-dropdown-text" data-ref="modal-blend-mode-label">${currentObj.label}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown disabled" data-module="moduleModalBlendModeDropdown">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            ${optionsHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-modal-action="cancel">
                            <span>${__('btn_cancel') || 'Cancelar'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="applyLayerBlendModeFromModal">
                            <span class="material-symbols-rounded">check</span>
                            <span>${__('btn_apply') || 'Aplicar'}</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },

    publishPixelArtModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const previewUrl = data.previewUrl || '';
            const defaultTitle = escapeHTML(data.title || 'Mi Pixel Art');
            const width = data.width || 64;
            const height = data.height || 64;

            return `
                <div class="component-modal-body-container" data-modal-name="publishPixelArtModal">
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    
                    <div class="component-modal-header">
                        <h2 class="component-modal-title">${__('publications.publish_title')}</h2>
                        <p class="component-modal-desc">${__('publications.publish_desc')}</p>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-publish-preview-wrapper" style="text-align: center; margin-bottom: 16px;">
                            <div class="component-publish-preview" style="display: inline-flex; align-items: center; justify-content: center; background: repeating-conic-gradient(var(--bg-tertiary) 0% 25%, var(--bg-surface) 0% 50%) 50% / 16px 16px; border: 1px solid var(--border-subtle); border-radius: var(--border-radius-md); padding: 12px; max-width: 100%; overflow: hidden;">
                                <img src="${previewUrl}" alt="Preview" data-ref="pub-preview-img" style="max-height: 180px; max-width: 100%; image-rendering: pixelated; object-fit: contain; border-radius: var(--border-radius-sm);">
                            </div>
                            <div class="component-text-muted component-font-sm" style="margin-top: 6px;">${width} x ${height} px</div>
                        </div>

                        <div class="component-form-group" style="margin-bottom: 14px;">
                            <label class="component-label">${__('publications.field_title')}</label>
                            <div class="component-input-group">
                                <input type="text" data-ref="pub-title" class="component-input-field" value="${defaultTitle}" placeholder="${__('publications.field_title')}" maxlength="100">
                            </div>
                        </div>

                        <div class="component-form-group" style="margin-bottom: 14px;">
                            <label class="component-label">${__('publications.field_desc')}</label>
                            <div class="component-input-group">
                                <textarea data-ref="pub-desc" class="component-input-field" rows="2" style="height: auto; padding: 8px 12px; resize: vertical;" placeholder="${__('publications.field_desc')}" maxlength="500"></textarea>
                            </div>
                        </div>

                        <div class="component-form-group" style="margin-bottom: 14px;">
                            <label class="component-label">${__('publications.field_tags')}</label>
                            <div class="component-input-group">
                                <input type="text" data-ref="pub-tags" class="component-input-field" placeholder="pixelart, retro, game, oc">
                            </div>
                        </div>

                        <div class="component-form-group">
                            <label class="component-label">${__('publications.field_privacy')}</label>
                            <select data-ref="pub-privacy" class="component-input-field component-select-field" style="cursor: pointer;">
                                <option value="public" selected>${__('publications.privacy_public')}</option>
                                <option value="unlisted">${__('publications.privacy_unlisted')}</option>
                            </select>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button type="button" class="component-button component-button--h40" data-modal-action="cancel">
                            <span>${__('btn_cancel') || 'Cancelar'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-action="submitPublishPixelArt">
                            <span class="material-symbols-rounded">rocket_launch</span>
                            <span>${__('publications.btn_publish_now')}</span>
                        </button>
                    </div>
                </div>
            `;
        }
    },
    bannerCropperModal: {
        customBoxClass: 'component-modal-box--cropper',
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                
                <div class="component-modal-header">
                    <h3 class="component-modal-title">${__('banner_customize_title') || 'Personalizar material gráfico del banner'}</h3>
                    <p class="component-modal-desc">${__('banner_customize_desc') || 'Ajusta el encuadre de la imagen para visualizar cómo se verá en diferentes dispositivos.'}</p>
                </div>

                <div class="component-alert component-alert--info active">
                    <div class="component-alert-icon">
                        <span class="material-symbols-rounded">info</span>
                    </div>
                    <div class="component-alert-text">
                        ${__('banner_customize_tip') || 'Para obtener los mejores resultados, usa una imagen de al menos 1200 × 320 píxeles.'}
                    </div>
                </div>

                <div class="component-modal-body">
                    <div class="component-banner-cropper-container" data-ref="banner-cropper-mount"></div>
                </div>

                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">
                        <span>${__('btn_cancel') || 'Cancelar'}</span>
                    </button>
                    <button type="button" class="component-button component-button--primary component-button--h40" data-ref="btn-confirm-banner-crop">
                        <span class="material-symbols-rounded">check</span>
                        <span>${__('btn_done') || 'Listo'}</span>
                    </button>
                </div>
            `;
        }
    }
};

