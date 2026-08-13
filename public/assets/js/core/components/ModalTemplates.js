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
                        <button class="component-button component-button--dark component-button--h40" data-modal-action="cancel">${__('btn_accept')}</button>
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
                        <a href="/upgrade" class="component-button component-button--dark component-button--h40">
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
                    <button class="component-button component-button--dark component-button--h40" data-modal-action="confirm">${__('btn_activate_live_chat_confirm')}</button>
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
                        <div class="component-input-group">
                            <input type="password" data-ref="cp_current_password" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="off">
                            <label class="component-input-label">${__('lbl_current_password')}</label>
                            <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                        </div>
                    </div>
                    
                    <div class="component-modal-actions">
                        <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                        <button class="component-button component-button--h40 component-button--dark" data-action="submitVerifyCurrentPassword">${__('btn_verify')}</button>
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
                        <button class="component-button component-button--h40 component-button--dark" data-action="submitUpdatePassword">${__('btn_save_password')}</button>
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
                            <input type="text" id="canvas-join-code-modal" data-ref="canvas-join-code-modal" class="component-input-field" placeholder="${__('ph_invite_code')}" maxlength="9" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(.+)/, '$1-$2').slice(0, 9);" required autocomplete="off">
                            <label class="component-input-label">${__('lbl_invite_code')}</label>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button class="component-button component-button--dark component-button--h40" data-modal-action="confirm">${__('btn_accept')}</button>
                </div>
            `;
        }
    },

    purchaseSuccessModal: {
        fullScreen: true,
        build: (data = {}) => {
            const __ = (typeof window.__ === 'function') ? window.__ : (k => k);
            const isCoins = data.item_type === 'coins' || (data.coins !== undefined && data.coins > 0);
            
            let badgeIcon = 'stars';
            let badgeText = '';
            
            if (isCoins) {
                badgeIcon = 'toll';
                const coinAmount = data.coins || data.amount || 0;
                let formattedCoins = '0';
                if (typeof window.formatNumber === 'function') {
                    formattedCoins = window.formatNumber(coinAmount);
                } else if (!isNaN(Number(coinAmount))) {
                    formattedCoins = Number(coinAmount).toLocaleString('en-US');
                } else {
                    formattedCoins = coinAmount;
                }
                badgeText = `${formattedCoins} ${__('coins')}`;
            } else {
                let tierName = data.tier_name || '';
                if (!tierName && window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const found = window.APP_TIERS.find(t => parseInt(t.tier_level, 10) === parseInt(data.tier, 10));
                    if (found && found.name) tierName = found.name;
                }
                badgeIcon = 'stars';
                badgeText = `${__('subscription')} ${tierName}`;
            }

            const thanksTitle = __('thank_you_purchase');
            const momentsDesc = __('in_few_moments_items');
            const supportText = __('need_help_contact');
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
                        <button class="component-button component-button--h45 component-button--dark component-button--pill component-button--wide" data-modal-action="confirm">
                            ${continueText}
                        </button>

                        <p class="component-hero-support-text">
                            <a href="/support" data-nav="/support" data-action="close_modal">
                                ${supportText}
                            </a>
                        </p>
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
                            <button class="component-button component-button--h40 component-button--dark" data-step-target="welcome-step-2">
                                ${window.__('welcome_modal_btn_next')}
                            </button>
                        </div>
                    `;
                } else if (idx === 1) {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            <button class="component-button component-button--h40 component-button--dark" data-step-target="welcome-step-3">
                                ${window.__('welcome_modal_btn_next')}
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            <button class="component-button component-button--h40 component-button--dark" data-modal-action="finish">
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
                    <div class="step-modal-step onboarding-tour-step ${isActive}" id="${step.id}">
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
                        animation: fadeIn 0.3s ease;
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
                        background: linear-gradient(135deg, rgba(186, 230, 253, 0.75) 0%, rgba(224, 204, 254, 0.7) 60%, rgba(199, 210, 254, 0.75) 100%);
                        position: relative;
                        overflow: hidden;
                    }

                    .onboarding-tour-banner::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 56px;
                        background: linear-gradient(to bottom, transparent, var(--bg-surface));
                        pointer-events: none;
                    }
                    
                    .dark-theme .onboarding-tour-banner,
                    [data-theme="dark"] .onboarding-tour-banner {
                        background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(49, 46, 129, 0.75) 50%, rgba(76, 29, 149, 0.7) 100%);
                    }

                    .onboarding-tour-icon-tile {
                        width: 65px;
                        height: 65px;
                        border-radius: 16px;
                        background: rgba(255, 255, 255, 0.75);
                        border: 1px solid rgba(255, 255, 255, 0.4);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03);
                    }

                    .dark-theme .onboarding-tour-icon-tile,
                    [data-theme="dark"] .onboarding-tour-icon-tile {
                        background: rgba(255, 255, 255, 0.07);
                        border-color: rgba(255, 255, 255, 0.08);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
                    }

                    .onboarding-tour-icon-tile .material-symbols-rounded {
                        font-size: 30px;
                        color: #0f172a;
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

                    @media (max-width: 768px) {
                        .onboarding-tour-modal-wrapper .pill-container {
                            position: absolute !important;
                            top: 0;
                            left: 0;
                            width: 100%;
                            z-index: 10;
                            background: transparent !important;
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
        build: (data) => {
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
                        ${window.__('btn_back') || 'Atrás'}
                    </button>
                ` : '';

                if (idx < steps.length - 1) {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            ${backBtn}
                            <button class="component-button component-button--h40 component-button--dark" data-step-target="${modalId}-step-${stepNum + 1}">
                                ${window.__('onboarding_btn_next') || 'Siguiente'}
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="step-modal-actions">
                            ${backBtn}
                            <button class="component-button component-button--h40 component-button--dark" data-modal-action="finish">
                                ${window.__('onboarding_btn_finish') || 'Entendido'}
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
                    <div class="step-modal-step onboarding-tour-step ${isActive}" id="${modalId}-step-${stepNum}">
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
                        animation: fadeIn 0.3s ease;
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
                        background: linear-gradient(135deg, rgba(186, 230, 253, 0.75) 0%, rgba(224, 204, 254, 0.7) 60%, rgba(199, 210, 254, 0.75) 100%);
                        position: relative;
                        overflow: hidden;
                    }

                    .onboarding-tour-banner::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 56px;
                        background: linear-gradient(to bottom, transparent, var(--bg-surface));
                        pointer-events: none;
                    }
                    
                    .dark-theme .onboarding-tour-banner,
                    [data-theme="dark"] .onboarding-tour-banner {
                        background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(49, 46, 129, 0.75) 50%, rgba(76, 29, 149, 0.7) 100%);
                    }

                    .onboarding-tour-icon-tile {
                        width: 65px;
                        height: 65px;
                        border-radius: 16px;
                        background: rgba(255, 255, 255, 0.75);
                        border: 1px solid rgba(255, 255, 255, 0.4);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03);
                    }

                    .dark-theme .onboarding-tour-icon-tile,
                    [data-theme="dark"] .onboarding-tour-icon-tile {
                        background: rgba(255, 255, 255, 0.07);
                        border-color: rgba(255, 255, 255, 0.08);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
                    }

                    .onboarding-tour-icon-tile .material-symbols-rounded {
                        font-size: 30px;
                        color: #0f172a;
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

                    @media (max-width: 768px) {
                        .onboarding-tour-modal-wrapper .pill-container {
                            position: absolute !important;
                            top: 0;
                            left: 0;
                            width: 100%;
                            z-index: 10;
                            background: transparent !important;
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
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_activate')}</button>
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
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_delete')}</button>
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
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_verify')}</button>
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
                
                <div class="component-role-color-row">
                    <p class="component-input-label">${__('lbl_role_color')}</p>
                    <input type="color" data-ref="roleColorInput" value="${data.colorValue || '#808080'}" class="component-role-color-preview">
                    <span class="component-role-color-text" data-ref="roleColorDisplay">${data.colorValue || '#808080'}</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_save')}</button>
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
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_save_permissions')}</button>
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
            const confirmClass = data.confirmClass || 'component-button--dark';

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" data-ref="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                        <label class="component-input-label">${passwordLblText}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
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
                <div class="component-input-group">
                    <input type="password" data-ref="modal_delete_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label class="component-input-label">${__('lbl_password')}</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
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
                <button class="component-button component-button--h40 ${data.dangerBtn ? 'component-button--danger' : 'component-button--dark'}" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __('btn_confirm')}</button>
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
                <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_save')}</button>
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
            confirmClass: 'component-button--dark',
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
                    <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : __('btn_accept')}</button>
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
                <button class="component-button component-button--dark component-button--h40" data-action="submitJoinLive">${__('btn_join')}</button>
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
                <button class="component-button component-button--dark component-button--h40 ${data.isActive ? 'disabled' : 'active'}" data-action="startLive">${__('btn_start_live')}</button>
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
                <button class="component-button component-button--dark component-button--h40" data-modal-action="confirm">${window.__('btn_accept')}</button>
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
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
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
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleReportReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
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
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${window.__('btn_disconnect')}</button>
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
                    <div class="component-input-group">
                        <input type="password" id="confirmPurchasePasswordInput" data-ref="confirmPurchasePasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                        <label class="component-input-label">${passwordLabel}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
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
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${btnConfirm}</button>
                </div>
            `;
        }
    },

    confirmPasswordModal: {
        build: (data = {}) => {
            const title = data.title || __('login_2fa_title');
            const desc = data.desc || __('2fa_verify_desc');
            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${title}</h2>
                    <p class="component-modal-desc">${desc}</p>
                </div>
                <div class="component-modal-body">
                    <div class="component-input-group">
                        <input type="password" id="confirmSecPasswordInput" data-ref="confirmSecPasswordInput" class="component-input-field component-input-field--with-icon" placeholder=" " autocomplete="current-password">
                        <label class="component-input-label">${__('lbl_account_password')}</label>
                        <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_confirm')}</button>
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

    confirmBulkPerkPurchaseModal: {
        build: (data = {}) => {
            const items = data.items || [];
            const totalCoins = data.totalCoins || 0;
            const formattedTotal = (typeof window.formatNumber === 'function') ? window.formatNumber(totalCoins) : totalCoins;

            const __ = (typeof window.__ === 'function') ? window.__ : ((k, p) => {
                let text = k;
                if (p) {
                    for (const [pKey, pValue] of Object.entries(p)) {
                        text = text.replace(new RegExp(`{${pKey}}`, 'g'), pValue);
                    }
                }
                return text;
            });

            // Build inline description: "[ventaja] y otras X más, con un costo de [total] monedas"
            const uniqueNames = [...new Set(items.map(i => i.name))];
            let descText;
            if (uniqueNames.length === 0) {
                descText = `${__('msg_confirm_bulk_purchase_desc_cost').replace(':cost', `<b>${formattedTotal} ${__('coins')}</b>`)}`;
            } else if (uniqueNames.length === 1) {
                descText = `${__('msg_confirm_bulk_purchase_desc_single')
                    .replace(':name', `<b>${uniqueNames[0]}</b>`)
                    .replace(':cost', `<b>${formattedTotal} ${__('coins')}</b>`)}`;
            } else {
                const others = uniqueNames.length - 1;
                descText = `${__('msg_confirm_bulk_purchase_desc_multi')
                    .replace(':name', `<b>${uniqueNames[0]}</b>`)
                    .replace(':others', `<b>${others}</b>`)
                    .replace(':cost', `<b>${formattedTotal} ${__('coins')}</b>`)}`;
            }

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('msg_confirm_bulk_purchase_title', { total: formattedTotal })}</h2>
                    <p class="component-modal-desc">${descText}</p>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_confirm')}</button>
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

            const endDateDisplay = endDate ? endDate.replace('T', ' ') : (__('lbl_select_expiration_date'));

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${__('canvases_sanctions_title') || 'Gestionar SanciÃ³n'}: ${username}</h2>
                    <p class="component-modal-desc">${__('desc_chat_restriction')}</p>
                </div>
                <div class="component-modal-body">
                    <!-- Alcance de la SanciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSanctionScope" data-ref="sanction_scope" data-value="${activeScope.key}">
                            <span class="material-symbols-rounded" data-ref="sanction_scope_trigger_icon">${activeScope.icon}</span>
                            <span class="component-dropdown-text" data-ref="sanction_scope_trigger_text">${activeScope.label}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSanctionScope">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${scopeOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- DuraciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionType" data-ref="suspension_type" data-value="${activeType.key}">
                            <span class="material-symbols-rounded" data-ref="suspension_type_trigger_icon">${activeType.icon}</span>
                            <span class="component-dropdown-text" data-ref="suspension_type_trigger_text">${activeType.label}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSuspensionType">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${typeOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Motivo -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="moduleSuspensionReason" data-ref="suspension_reason" data-value="${activeReasonKey}">
                            <span class="material-symbols-rounded" data-ref="suspension_reason_trigger_icon">${activeReasonIcon}</span>
                            <span class="component-dropdown-text" data-ref="suspension_reason_trigger_text">${activeReasonLabel}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleSuspensionReason">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    ${reasonOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fecha de ExpiraciÃ³n -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full modal-end-date-group">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="openSanctionCalendarModal" data-ref="end_date" data-value="${endDate}">
                            <span class="material-symbols-rounded">calendar_month</span>
                            <span class="component-dropdown-text" data-ref="sanction-endDate-text">${endDateDisplay}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                    </div>
                </div>
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${__('btn_cancel')}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('lbl_save_changes')}</button>
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
                    <button class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${__('btn_start_broadcast', [])}</button>
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
                    <!-- Date Selector Trigger inside Modal -->
                    <div class="component-dropdown-wrapper component-dropdown-wrapper--full">
                        <div class="component-dropdown-trigger component-dropdown-trigger--full" data-action="toggleModule" data-target="modalCalendarDateOnly" data-ref="modal_selected_iso_date" data-value="${isoDate}">
                            <span class="material-symbols-rounded">calendar_month</span>
                            <span class="component-dropdown-text" data-ref="modal-calendar-date-text">${dateDisplay}</span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="modalCalendarDateOnly">
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
                                <div class="pill-container"><div class="drag-handle"></div></div>
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
                                    <div class="component-calendar-actions">
                                        <button type="button" class="component-button component-button--h30" data-action="calendarClear">${__('btn_clear')}</button>
                                        <div>
                                            <button type="button" class="component-button component-button--h30" data-action="calendarCancel">${btnCancel}</button>
                                            <button type="button" class="component-button component-button--h30 component-button--dark" data-action="calendarConfirm">${btnConfirm}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Hours and Minutes Inline Controls -->
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
                <div class="component-modal-actions">
                    <button type="button" class="component-button component-button--h40" data-modal-action="cancel">${btnCancel}</button>
                    <button type="button" class="component-button component-button--h40 component-button--dark" data-modal-action="confirm">${btnConfirm}</button>
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

                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--dropdown-full component-module--spaced disabled" data-module="dropdownCanvasRolesList">
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
                    <button class="component-button component-button--h40 component-button--dark" data-action="saveCanvasMemberRoleSubmit">${__('btn_save_changes')}</button>
                </div>
            `;
        }
    }
};
