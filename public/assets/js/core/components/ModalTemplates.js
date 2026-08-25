import { escapeHTML, getDynamicTierName, getLockDetails, hexToHsv } from '../utils/uiUtils.js';

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
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">chat_off</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h3 class="component-modal-title">${__('chat_deactivated_title')}</h3>
                            <p class="component-modal-desc">${__('chat_non_owner_deactivated_desc')}</p>
                        </div>
                    </div>
                    <div class="component-modal-actions">
                        <button class="component-button component-button--primary component-button--h40" data-modal-action="cancel">${__('btn_accept')}</button>
                    </div>
                `;
            }
            
            if (!hasLiveChat) {
                return `
                    <div class="pill-container"><div class="drag-handle"></div></div>
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">stars</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h3 class="component-modal-title">${__('chat_activation_pro_required')}</h3>
                            <p class="component-modal-desc">${__('chat_pro_required_desc')}</p>
                        </div>
                    </div>
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <a href="/upgrade" class="component-button component-button--primary component-button--h40">
                            <span class="material-symbols-rounded">stars</span>
                            <span>${__('btn_upgrade')}</span>
                        </a>
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
        fullScreen: true,
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
        fullScreen: true,
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            let badgeIcon = 'stars';
            let badgeText = '';
            
            let tierName = data.tier_name || '';
            if (!tierName && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
                if (found && found.name) tierName = found.name;
            }
            badgeText = `${__('subscription')} ${tierName}`;

            const thanksTitle = __('thank_you_purchase');
            const momentsDesc = __('in_few_moments_items');
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
                        <button class="component-button component-button--primary component-button--h45 component-button--pill component-button--wide" data-modal-action="confirm">
                            ${continueText}
                        </button>
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
                <style>
                    .onboarding-tour-modal-wrapper {
                        position: relative;
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    .onboarding-tour-container.step-modal-content {
                        padding: 0 !important;
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        min-height: 480px;
                        max-height: 90vh;
                        background: var(--bg-surface);
                        overflow: hidden;
                    }
                    .onboarding-tour-step {
                        display: none;
                        flex-direction: column;
                        flex: 1;
                    }
                    .onboarding-tour-step.active {
                        display: flex;
                    }
                    .onboarding-tour-banner {
                        width: 100%;
                        height: 215px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        flex-shrink: 0;
                        background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .dark-theme .onboarding-tour-banner,
                    [data-theme="dark"] .onboarding-tour-banner {
                        background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%);
                    }

                    .onboarding-tour-icon-tile {
                        width: 65px;
                        height: 65px;
                        border-radius: 18px;
                        background: rgba(255, 255, 255, 0.18);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        backdrop-filter: blur(14px);
                        -webkit-backdrop-filter: blur(14px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
                        animation: stepSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .dark-theme .onboarding-tour-icon-tile,
                    [data-theme="dark"] .onboarding-tour-icon-tile {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.15);
                        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
                    }

                    .onboarding-tour-icon-tile .material-symbols-rounded {
                        font-size: 32px;
                        color: #ffffff;
                        line-height: 1;
                    }

                    .dark-theme .onboarding-tour-icon-tile .material-symbols-rounded,
                    [data-theme="dark"] .onboarding-tour-icon-tile .material-symbols-rounded {
                        color: #f8fafc;
                    }

                    .onboarding-tour-body {
                        padding: 24px;
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        overflow-y: auto;
                    }

                    .onboarding-tour-body .component-modal-title,
                    .onboarding-tour-body .step-modal-desc,
                    .onboarding-tour-body .welcome-features-list {
                        animation: stepSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    @media (max-width: 768px), (max-height: 550px) {
                        .onboarding-tour-modal-wrapper .pill-container {
                            position: absolute !important;
                            top: 0;
                            left: 0;
                            width: 100%;
                            z-index: 10;
                            background: transparent !important;
                        }
                        .onboarding-tour-modal-wrapper .drag-handle {
                            background-color: rgba(255, 255, 255, 0.45) !important;
                        }
                        .onboarding-tour-banner {
                            padding-top: 24px;
                        }
                    }
                </style>
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
                <style>
                    .onboarding-tour-modal-wrapper {
                        position: relative;
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    .onboarding-tour-container.step-modal-content {
                        padding: 0 !important;
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        min-height: 480px;
                        max-height: 90vh;
                        background: var(--bg-surface);
                        overflow: hidden;
                    }
                    .onboarding-tour-step {
                        display: none;
                        flex-direction: column;
                        flex: 1;
                    }
                    .onboarding-tour-step.active {
                        display: flex;
                    }
                    .onboarding-tour-banner {
                        width: 100%;
                        height: 215px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        flex-shrink: 0;
                        background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .dark-theme .onboarding-tour-banner,
                    [data-theme="dark"] .onboarding-tour-banner {
                        background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%);
                    }

                    .onboarding-tour-icon-tile {
                        width: 65px;
                        height: 65px;
                        border-radius: 18px;
                        background: rgba(255, 255, 255, 0.18);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        backdrop-filter: blur(14px);
                        -webkit-backdrop-filter: blur(14px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
                        animation: stepSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .dark-theme .onboarding-tour-icon-tile,
                    [data-theme="dark"] .onboarding-tour-icon-tile {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.15);
                        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
                    }

                    .onboarding-tour-icon-tile .material-symbols-rounded {
                        font-size: 32px;
                        color: #ffffff;
                        line-height: 1;
                    }

                    .dark-theme .onboarding-tour-icon-tile .material-symbols-rounded,
                    [data-theme="dark"] .onboarding-tour-icon-tile .material-symbols-rounded {
                        color: #f8fafc;
                    }

                    .onboarding-tour-body {
                        padding: 24px;
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        overflow-y: auto;
                    }

                    .onboarding-tour-body .component-modal-title,
                    .onboarding-tour-body .step-modal-desc,
                    .onboarding-tour-body .welcome-features-list {
                        animation: stepSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    @media (max-width: 768px), (max-height: 550px) {
                        .onboarding-tour-modal-wrapper .pill-container {
                            position: absolute !important;
                            top: 0;
                            left: 0;
                            width: 100%;
                            z-index: 10;
                            background: transparent !important;
                        }
                        .onboarding-tour-modal-wrapper .drag-handle {
                            background-color: rgba(255, 255, 255, 0.45) !important;
                        }
                        .onboarding-tour-banner {
                            padding-top: 24px;
                        }
                    }
                </style>
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
                <button class="component-button component-button--h40" data-modal-action="confirm">${__('btn_delete')}</button>
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
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_save')}</button>
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
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_save_permissions')}</button>
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

            const title = data.title || (data.titleKey ? __(data.titleKey) : __('title_verify_identity'));
            const desc = data.descHtml || data.message || (data.descKey ? __(data.descKey) : __('desc_verify_identity'));
            const cancelBtnText = __('btn_cancel');
            const confirmBtnText = data.confirmKey ? __(data.confirmKey) : __('btn_continue');
            const passwordLblText = __('lbl_current_password');
            const confirmClass = data.confirmClass || 'component-button--primary';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    ${renderVerificationInput({ inputRef: 'modal_verify_password', label: passwordLblText })}
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
        build: (data) => `
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
                <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__('btn_save')}</button>
            </div>
        `
    },

    confirmRemoveMembers: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_remove_member',
            descHtml: __('desc_remove_member').replace(':count', data.count || 1),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_remove'
        })
    },

    confirmCreateCanvas: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_create_canvas',
            descKey: 'desc_confirm_create_canvas',
            confirmClass: '',
            confirmClass: 'component-button--primary',
            confirmKey: 'btn_create_canvas'
        })
    },

    verifyPasswordDeleteCanvas: {
        build: () => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_confirm_delete_canvas',
            descKey: 'desc_confirm_delete_canvas',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_delete_canvas'
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

    confirmResetNow: {
        build: () => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_reset_now',
            descKey: 'desc_confirm_reset_now',
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_reset_now'
        })
    },

    confirmResizeNow: {
        build: (data) => ModalTemplates.confirmAction.build({
            titleKey: 'title_confirm_resize_now',
            descKey: 'desc_confirm_resize_now',
            descHtml: data?.sizeLabel
                ? __('desc_confirm_resize_now').replace(':size', `<b>${data.sizeLabel}</b>`)
                : __('desc_confirm_resize_now').replace(':size', ''),
            confirmClass: 'component-button--danger',
            confirmKey: 'btn_apply_now'
        })
    },

    offlineResizeModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const currentSize = data.currentSize || '64x64';
            const userTier = parseInt(data.userTier ?? (window.APP_USER?.subscription_tier ?? 0), 10);
            const isOffline = data.isOfflineMode !== false;
            const resizeActive = !!data.resizeActive;
            const scheduledSize = data.resizeTargetSize || currentSize;

            const formatLocalDatetime = (dateInput, addMs = 3600000) => {
                let d = null;
                if (dateInput) {
                    d = new Date(dateInput);
                }
                if (!d || isNaN(d.getTime())) {
                    d = new Date(Date.now() + addMs);
                }
                const pad = n => String(n).padStart(2, '0');
                const y = d.getFullYear();
                const m = pad(d.getMonth() + 1);
                const day = pad(d.getDate());
                const hh = pad(d.getHours());
                const mm = pad(d.getMinutes());
                return `${y}-${m}-${day}T${hh}:${mm}`;
            };

            const minDateTime = formatLocalDatetime(null, 5 * 60 * 1000);
            const scheduledDateTimeVal = formatLocalDatetime(data.nextResizeAt, 3600000);

            const sizesList = {
                "16x16": { label: "16x16", icon: "crop_square", tier: 0 },
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
            const scheduledMeta = sizesList[scheduledSize] || { label: scheduledSize, icon: "aspect_ratio", tier: 0 };

            let instantSizesHtml = '';
            let scheduledSizesHtml = '';

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

                const isSchedActive = (val === scheduledSize && isAllowed);
                scheduledSizesHtml += `
                    <div class="component-menu-link ${isSchedActive ? 'active' : ''} ${disabledClass}"
                         data-action="${isAllowed ? 'selectScheduledResizeSize' : ''}"
                         data-type="scheduled_resize_size"
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

            const scheduledOptionClass = isOffline ? 'disabled-interaction' : '';
            const scheduledBadge = isOffline
                ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${__('lbl_offline_not_available')}</span></span>`
                : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- STEP 1: Tipo de Expansión -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="offline-resize-step-1" data-selected-type="instant">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">aspect_ratio</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('canvas_resize_title')}</h2>
                            <p class="component-modal-desc">${__('canvas_resize_desc')}</p>
                        </div>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--static">
                            <div class="component-menu-list">
                                <div class="component-menu-link active" data-action="selectResizeType" data-type="instant">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                    <div class="component-menu-link-text">
                                        <span>${__('canvas_resize_now_title')}</span>
                                    </div>
                                    <span class="material-symbols-rounded component-text-success" data-ref="resize-instant-check">check_circle</span>
                                </div>
                                <div class="component-menu-link ${scheduledOptionClass}" data-action="${isOffline ? '' : 'selectResizeType'}" data-type="scheduled">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                    <div class="component-menu-link-text">
                                        <span>${__('canvas_resize_active_title')}</span>
                                    </div>
                                    ${scheduledBadge}
                                    <span class="material-symbols-rounded component-text-success disabled" data-ref="resize-scheduled-check">check_circle</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResizeNextStep">
                            <span>${__('btn_continue')}</span>
                            <span class="material-symbols-rounded">chevron_right</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2A: Selección de Tamaño Inmediato -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-resize-step-2-instant">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">photo_size_select_large</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('canvas_resize_instant_size_title')}</h2>
                            <p class="component-modal-desc">${__('canvas_resize_instant_size_desc')}</p>
                        </div>
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
                            ${__('canvas_resize_warning_desc')}
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResizePrevStep">
                            <span class="material-symbols-rounded">chevron_left</span>
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitOfflineResize">
                            <span class="material-symbols-rounded">flash_on</span>
                            <span>${__('btn_apply_now')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2B: Configuración de Expansión Programada (Online) -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-resize-step-2-scheduled">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">schedule</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('canvas_resize_active_title')}</h2>
                            <p class="component-modal-desc">${__('canvas_resize_active_desc')}</p>
                        </div>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">${__('canvas_resize_active_title')}</h2>
                                    <p class="component-card__description">${__('canvas_resize_active_desc')}</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="scheduled_resize_active" data-action="toggleScheduledResizeSection" ${resizeActive ? 'checked' : ''}>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="component-form-body ${resizeActive ? '' : 'disabled-interaction'}" data-ref="scheduled_resize_fields" style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="scheduled_resize_datetime" type="datetime-local" placeholder=" " value="${scheduledDateTimeVal}" min="${minDateTime}">
                                <label class="component-input-label">${__('lbl_scheduled_datetime')}</label>
                            </div>

                            <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                                <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="dropdownScheduledResizeSizes" data-ref="scheduled-resize-trigger" data-value="${escapeHTML(scheduledSize)}">
                                    <span class="material-symbols-rounded" data-ref="scheduled-resize-icon">${escapeHTML(scheduledMeta.icon)}</span>
                                    <span class="component-dropdown-text" data-ref="scheduled-resize-label">${escapeHTML(scheduledMeta.label)}</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>

                                <div class="component-module component-module--dropdown disabled" data-module="dropdownScheduledResizeSizes">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            ${scheduledSizesHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-alert-error" data-ref="scheduled-resize-shrink-warning">
                                ${__('canvas_resize_warning_desc')}
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResizePrevStep">
                            <span class="material-symbols-rounded">chevron_left</span>
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitScheduledResize">
                            <span class="material-symbols-rounded">save</span>
                            <span>${__('btn_save_changes')}</span>
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
            const resetActive = !!data.resetActive;
            const canTakeSnapshot = data.canTakeSnapshot !== false;

            const formatLocalDatetime = (dateInput, addMs = 3600000) => {
                let d = null;
                if (dateInput) {
                    d = new Date(dateInput);
                }
                if (!d || isNaN(d.getTime())) {
                    d = new Date(Date.now() + addMs);
                }
                const pad = n => String(n).padStart(2, '0');
                const y = d.getFullYear();
                const m = pad(d.getMonth() + 1);
                const day = pad(d.getDate());
                const hh = pad(d.getHours());
                const mm = pad(d.getMinutes());
                return `${y}-${m}-${day}T${hh}:${mm}`;
            };

            const minDateTime = formatLocalDatetime(null, 5 * 60 * 1000);
            const scheduledResetDateTimeVal = formatLocalDatetime(data.nextResetAt, 3600000);

            const scheduledOptionClass = isOffline ? 'disabled-interaction' : '';
            const scheduledBadge = isOffline
                ? `<span class="component-badge component-badge--warning component-badge--sm"><span class="material-symbols-rounded">block</span><span>${__('lbl_offline_not_available')}</span></span>`
                : '';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- STEP 1: Tipo de Reinicio -->
                <div class="component-card--grouped component-card--flush active component-modal-step" data-ref="offline-reset-step-1" data-selected-type="instant">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">restart_alt</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('canvas_resets_title')}</h2>
                            <p class="component-modal-desc">${__('canvas_resets_desc')}</p>
                        </div>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--static">
                            <div class="component-menu-list">
                                <div class="component-menu-link active" data-action="selectResetType" data-type="instant">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">flash_on</span></div>
                                    <div class="component-menu-link-text">
                                        <span>${__('canvas_reset_now_title')}</span>
                                    </div>
                                    <span class="material-symbols-rounded component-text-success" data-ref="reset-instant-check">check_circle</span>
                                </div>
                                <div class="component-menu-link ${scheduledOptionClass}" data-action="${isOffline ? '' : 'selectResetType'}" data-type="scheduled">
                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                    <div class="component-menu-link-text">
                                        <span>${__('canvas_reset_active_title')}</span>
                                    </div>
                                    ${scheduledBadge}
                                    <span class="material-symbols-rounded component-text-success disabled" data-ref="reset-scheduled-check">check_circle</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button class="component-button component-button--primary component-button--h40" data-action="offlineResetNextStep">
                            <span>${__('btn_continue')}</span>
                            <span class="material-symbols-rounded">chevron_right</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2A: Reinicio Inmediato -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-reset-step-2-instant">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">delete_forever</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('title_confirm_reset_now')}</h2>
                            <p class="component-modal-desc">${__('desc_confirm_reset_now')}</p>
                        </div>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">${__('canvas_reset_captura_title')}</h2>
                                    <p class="component-card__description">${__('take_photo_before_reset')}</p>
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
                            <span class="material-symbols-rounded">chevron_left</span>
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--danger component-button--h40" data-action="submitOfflineReset">
                            <span class="material-symbols-rounded">delete_forever</span>
                            <span>${__('btn_reset_now')}</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 2B: Configuración de Reinicio Programado (Online) -->
                <div class="component-card--grouped component-card--flush disabled component-modal-step" data-ref="offline-reset-step-2-scheduled">
                    <div class="component-modal-header component-modal-header--with-icon">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">schedule</span>
                        </div>
                        <div class="component-modal-header-text">
                            <h2 class="component-modal-title">${__('canvas_reset_active_title')}</h2>
                            <p class="component-modal-desc">${__('canvas_reset_active_desc')}</p>
                        </div>
                    </div>

                    <div class="component-modal-body">
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">${__('canvas_reset_active_title')}</h2>
                                    <p class="component-card__description">${__('canvas_reset_active_desc')}</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" data-ref="scheduled_reset_active" data-action="toggleScheduledResetSection" ${resetActive ? 'checked' : ''}>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="component-form-body ${resetActive ? '' : 'disabled-interaction'}" data-ref="scheduled_reset_fields" style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
                            <div class="component-input-group">
                                <input class="component-input-field" data-ref="scheduled_reset_datetime" type="datetime-local" placeholder=" " value="${scheduledResetDateTimeVal}" min="${minDateTime}">
                                <label class="component-input-label">${__('lbl_scheduled_datetime')}</label>
                            </div>

                            <div class="component-group-item">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">${__('canvas_reset_captura_title')}</h2>
                                        <p class="component-card__description">${__('take_photo_before_reset')}</p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" data-ref="scheduled_reset_snapshot" checked>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-action="offlineResetPrevStep">
                            <span class="material-symbols-rounded">chevron_left</span>
                            <span>${__('btn_back')}</span>
                        </button>
                        <button class="component-button component-button--primary component-button--h40" data-action="submitScheduledReset">
                            <span class="material-symbols-rounded">save</span>
                            <span>${__('btn_save_changes')}</span>
                        </button>
                    </div>
                </div>
            `;
        }
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
                    <button class="component-button component-button--primary component-button--h40" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : __('btn_accept')}</button>
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
        build: (data) => ModalTemplates.verifyPasswordDialog.build({
            titleKey: 'title_verify_delete_canvases',
            descHtml: __('desc_verify_delete_canvases').replace(':count', data.count || 0),
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

    dynamicHtmlModal: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            ${data.html}
        `
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

    startLiveShare: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h3 class="component-modal-title">${__('title_start_live_share')}</h3>
                <p class="component-modal-desc">${__('desc_start_live_share')}</p>
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
                                <div class="component-inline-control__center" data-ref="live-input-x" data-value="${data.x || 0}">${data.x || 0}</div>
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
                                <div class="component-inline-control__center" data-ref="live-input-y" data-value="${data.y || 0}">${data.y || 0}</div>
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
                            <div class="component-inline-control__center" data-ref="live-input-opacity" data-value="${data.opacity !== undefined ? data.opacity : 1}">${Math.round((data.opacity !== undefined ? data.opacity : 1) * 100)}%</div>
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
                <button class="component-button component-button--primary component-button--h40 ${data.isActive ? 'disabled' : 'active'}" data-action="startLive">${__('btn_start_live')}</button>
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

                        <!-- Step 2: Calendario inline + H:MM -->
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${parseInt(sanctionHours) || 0}">${sanctionHours}</div>
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${parseInt(sanctionMinutes) || 0}">${sanctionMinutes}</div>
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
            const hours = data.hours || '00';
            const minutes = data.minutes || '00';
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

                        <!-- Step 2: Calendario + H:MM -->
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

                            <!-- Hours and Minutes -->
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="${parseInt(hours) || 0}">${hours}</div>
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="${parseInt(minutes) || 0}">${minutes}</div>
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
                    <button type="button" class="component-button component-button--primary component-button--h40 disabled" data-modal-action="confirm" data-ref="btn-calmodal-confirm">${btnConfirm}</button>
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
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">add_link</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_generate_new_invite')}</h2>
                        <p class="component-modal-desc">${__('desc_invite_role')}</p>
                    </div>
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

                        <!-- Step 2: Calendario inline + H:MM -->
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-hours-val" data-value="0">00</div>
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
                                        <div class="component-inline-control__center" data-ref="calendar-modal-minutes-val" data-value="0">00</div>
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
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">manage_accounts</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h2 class="component-modal-title">${__('lbl_manage_role')}: ${targetUsername}</h2>
                        <p class="component-modal-desc">${__('modal_change_canvas_role_desc')}</p>
                    </div>
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
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">timelapse</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h3 class="component-modal-title">${__('lbl_timelapse_title')}</h3>
                        <p class="component-modal-desc">${__('lbl_timelapse_desc')}</p>
                    </div>
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
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded" data-ref="snapshot-download-header-icon">${exportType === 'video' ? 'movie' : 'download'}</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h3 class="component-modal-title">${__('lbl_snapshot_download_title')}</h3>
                        <p class="component-modal-desc">${__('lbl_snapshot_download_desc')}</p>
                    </div>
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
    timelapseExportVideoModal: {
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const selectedDuration = data.duration || 30;

            const durations = [
                { val: 15, label: __('lbl_timelapse_video_duration_15') || '15s (Rápido)' },
                { val: 30, label: __('lbl_timelapse_video_duration_30') || '30s (Recomendado)' },
                { val: 60, label: __('lbl_timelapse_video_duration_60') || '60s (Detallado)' }
            ];

            const durationsHtml = durations.map(d => {
                const isActive = (d.val === selectedDuration) ? 'active' : '';
                return `
                    <button class="component-button component-button--h35 component-timelapse-speed-btn ${isActive}" 
                            data-action="selectTimelapseVideoDuration" 
                            data-duration="${d.val}" 
                            type="button">
                        ${d.label}
                    </button>
                `;
            }).join('');

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header component-modal-header--with-icon">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">movie</span>
                    </div>
                    <div class="component-modal-header-text">
                        <h3 class="component-modal-title">${__('lbl_export_timelapse_video_title')}</h3>
                        <p class="component-modal-desc">${__('lbl_export_timelapse_video_desc')}</p>
                    </div>
                </div>

                <div class="component-modal-content">
                    <div class="component-form-group">
                        <label class="component-label">${__('lbl_timelapse_video_duration')}</label>
                        <div class="component-timelapse-speeds-grid" data-ref="timelapse-video-durations-container">
                            ${durationsHtml}
                        </div>
                    </div>
                </div>

                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--primary component-button--h40" data-action="confirmExportTimelapseVideo" data-ref="btn-confirm-export-video">${__('btn_generate_mp4')}</button>
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
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span class="component-subtext" data-ref="customPaletteColorCount">${initialColors.length} / 36</span>
                            <span class="component-subtext" style="font-size: 0.72rem;">${__('msg_palette_min_colors') || 'Mínimo 4 colores'}</span>
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
        fullScreen: false,
        noPadding: true,
        hideCloseBtn: false,
        build: (data = {}) => {
            const rawImages = Array.isArray(data.images) ? data.images : (data.images ? [data.images] : []);
            const defaultSender = data.sender || {};
            const normalizedImages = rawImages.map(item => {
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
        customBoxClass: 'component-modal-box--2fa-setup',
        build: (data = {}) => {
            const secret = data.secret || '';
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>

                <!-- Left Column: Form & Steps -->
                <div class="component-2fa-modal-left">
                    <!-- Step 1: Scan & Enter Code -->
                    <div class="active" data-ref="2fa-setup-step-1" style="display: flex; flex-direction: column; gap: 8px; justify-content: flex-start;">
                        <div class="component-modal-header" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                            <h2 class="component-modal-title" style="margin: 0;">
                                ${__('2fa_protect_account_title') || __('2fa_title')}
                            </h2>
                            <p class="component-modal-desc" style="margin: 0;">
                                ${__('2fa_protect_account_desc') || __('2fa_desc')}
                            </p>
                        </div>

                        <div class="component-modal-body" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                            <div class="component-input-group" style="margin: 0;">
                                <input type="text" data-ref="2fa_setup_totp_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off" inputmode="numeric">
                                <label class="component-input-label">${__('lbl_6_digit_code') || 'Código de 6 dígitos'}</label>
                            </div>

                            <button type="button" class="component-button component-button--primary component-button--h40" data-action="submitSetupEnable2FA" style="width: 100%; margin: 0;">
                                ${__('btn_enable_authenticator_app') || __('btn_activate')}
                            </button>

                            <div class="component-link-container component-link-container--start" style="margin: 0;">
                                <span class="component-link" data-action="toggle2FASecretKey">${__('btn_show_secret_key') || __('2fa_cant_scan') || 'Mostrar clave secreta'}</span>
                            </div>

                            <div class="disabled" data-ref="2fa_secret_key_container" style="margin: 0;">
                                <div class="component-2fa-secret-box" data-ref="2fa_secret_key_text" data-action="copy2FASecretKey" title="${__('copy')}">
                                    ${escapeHTML(secret) || '...'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Recovery Codes -->
                    <div class="disabled" data-ref="2fa-setup-step-2-recovery" style="display: flex; flex-direction: column; gap: 8px; justify-content: flex-start;">
                        <div class="component-modal-header" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                            <h2 class="component-modal-title" style="margin: 0;">
                                ${__('2fa_activated_title')}
                            </h2>
                            <p class="component-modal-desc" style="margin: 0;">
                                ${__('2fa_new_codes_desc')}
                            </p>
                        </div>

                        <div class="component-modal-body" style="padding: 0; margin: 0;">
                            <div class="component-2fa-recovery-list" data-ref="2fa-recovery-codes-grid" style="margin: 0;"></div>
                        </div>

                        <div class="component-modal-actions" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                            <button type="button" class="component-button component-button--h40" data-action="copySetupRecoveryCodes" style="width: 100%; margin: 0;">
                                <span class="material-symbols-rounded">content_copy</span>
                                <span>${__('btn_copy_codes')}</span>
                            </button>
                            <button type="button" class="component-button component-button--primary component-button--h40" data-action="finishSetup2FA" style="width: 100%; margin: 0;">
                                <span>${__('btn_finish')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Banner Gradient & QR Code -->
                <div class="component-2fa-modal-right">
                    <div class="component-2fa-qr-frame">
                        <div data-ref="2fa-qr-target" style="width: 218px; height: 218px; display: flex; align-items: center; justify-content: center;">
                            <div class="component-spinner"></div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    manage2faModal: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h3 class="component-modal-title">${__('sec_2fa_title') || 'Autenticación en dos pasos'}</h3>
                <p class="component-modal-desc">${__('2fa_manage_desc') || 'Gestiona la seguridad y los métodos de respaldo de tu cuenta.'}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-menu-list">
                    <button type="button" class="component-menu-link" data-action="manageRegenerateRecoveryCodes">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">key</span></div>
                        <div class="component-menu-link-text">
                            <span>${__('2fa_recovery_title_card') || 'Códigos de recuperación'}</span>
                        </div>
                        <div class="component-menu-link-arrow"><span class="material-symbols-rounded">chevron_right</span></div>
                    </button>
                    <button type="button" class="component-menu-link component-text-notice--danger" data-action="manageDisable2FA">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield</span></div>
                        <div class="component-menu-link-text">
                            <span>${__('btn_deactivate') || 'Desactivar 2FA'}</span>
                        </div>
                        <div class="component-menu-link-arrow"><span class="material-symbols-rounded">chevron_right</span></div>
                    </button>
                </div>
            </div>
            <div class="component-modal-actions">
                <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel') || 'Cancelar'}</button>
            </div>
        `
    },

    recoveryCodesDisplayModal: {
        customBoxClass: 'component-modal-box--2fa-setup',
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
                <div class="component-2fa-modal-left">
                    <div class="component-modal-header" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px;">
                        <h2 class="component-modal-title" style="margin: 0;">
                            ${__('2fa_new_codes_title') || 'Nuevos códigos de recuperación'}
                        </h2>
                        <p class="component-modal-desc" style="margin: 0;">
                            ${__('2fa_new_codes_desc') || 'Guarda estos códigos en un lugar seguro. Los códigos anteriores han sido invalidados.'}
                        </p>
                    </div>

                    <div class="component-modal-body" style="padding: 0; margin: 0;">
                        <div class="component-2fa-recovery-list" data-ref="2fa-display-recovery-codes-grid" style="margin: 0;">
                            ${codesHtml}
                        </div>
                    </div>

                    <div class="component-modal-actions" style="padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                        <button type="button" class="component-button component-button--h40" data-action="copyDisplayRecoveryCodes" data-codes="${escapeHTML(codes.join('\n'))}" style="width: 100%; margin: 0;">
                            <span class="material-symbols-rounded">content_copy</span>
                            <span>${__('btn_copy_codes') || 'Copiar códigos'}</span>
                        </button>
                        <button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="cancel" style="width: 100%; margin: 0;">
                            <span>${__('btn_finish_configuration') || 'Terminar configuración'}</span>
                        </button>
                    </div>
                </div>

                <!-- Right Column: Banner Gradient & Illustration -->
                <div class="component-2fa-modal-right">
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
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
    }
};


