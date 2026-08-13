import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../core/utils/uiUtils.js';

export class ContactSupportController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.turnstileWidgetId = undefined;

        this._boundClick = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="contact-support-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        this._renderTurnstile();
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('click', this._boundClick);
        }
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.container) {
            this.container.removeEventListener('click', this._boundClick);
        }
        document.body.removeEventListener('click', this._boundClick);

        this._resetTurnstile();
        this.turnstileWidgetId = undefined;
    }

    handleClick(e) {
        const policyNav = e.target.closest('[data-nav^="/site-policy"]');
        if (policyNav) {
            const path = policyNav.getAttribute('data-nav');
            if (path && window.spaRouter) {
                e.preventDefault();
                window.spaRouter.navigate(path);
                return;
            }
        }

        const categoryItem = e.target.closest('[data-action="selectSupportCategory"]');
        if (categoryItem) {
            e.preventDefault();
            this._handleCategorySelect(categoryItem);
            return;
        }

        const submitBtn = e.target.closest('[data-action="submitSupportTicket"]');
        if (submitBtn) {
            e.preventDefault();
            this._submitTicket(submitBtn);
            return;
        }

        const focusBtn = e.target.closest('[data-action="focusSupportEmailForm"]');
        if (focusBtn) {
            e.preventDefault();
            this._focusEmailForm();
            return;
        }
    }

    _handleCategorySelect(item) {
        const val = item.getAttribute('data-val');
        const icon = item.getAttribute('data-icon');
        const labelEl = item.querySelector('.component-menu-link-text span');
        const labelText = labelEl ? labelEl.textContent.trim() : val;

        const textEl = document.querySelector('[data-ref="support-category-text"]');
        const iconEl = document.querySelector('[data-ref="support-category-icon"]');

        if (textEl) {
            textEl.textContent = labelText;
            textEl.setAttribute('data-value', val);
        }

        if (iconEl) {
            iconEl.className = `material-symbols-rounded msr-${icon}`;
            iconEl.textContent = icon;
        }

        const menuList = item.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('.component-menu-link').forEach(link => {
                link.classList.remove('active');
            });
            item.classList.add('active');
        }

        const dropdownModule = document.querySelector('[data-module="supportModuleCategory"]');
        if (dropdownModule) {
            dropdownModule.classList.remove('active');
            dropdownModule.classList.add('disabled');
        }
    }

    _focusEmailForm() {
        const liveChatModule = document.querySelector('[data-module="moduleSupportChat"]');
        if (liveChatModule) {
            liveChatModule.classList.remove('active');
            liveChatModule.classList.add('disabled');
        }

        const subjectInput = document.querySelector('[data-ref="support-subject"]');
        if (subjectInput) {
            subjectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                subjectInput.focus();
            }, 300);
        }
    }

    async _submitTicket(btn) {
        if (!btn || btn.classList.contains('disabled-interaction')) return;

        const subjectInput = document.querySelector('[data-ref="support-subject"]');
        const messageInput = document.querySelector('[data-ref="support-message"]');
        const categoryText = document.querySelector('[data-ref="support-category-text"]');

        const category = categoryText ? categoryText.getAttribute('data-value') : 'general';
        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!subject || subject.length < 4) {
            showMessage(window.__('err_support_invalid_subject'), 'error');
            if (subjectInput) subjectInput.focus();
            return;
        }

        if (!message || message.length < 15) {
            showMessage(window.__('err_support_invalid_message'), 'error');
            if (messageInput) messageInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const turnstileToken = await this._getTurnstileToken();

            const payload = {
                category: category,
                subject: subject,
                message: message,
                turnstile_token: turnstileToken,
                'cf-turnstile-response': turnstileToken
            };

            const response = await this.api.post(
                ApiRoutes.Support.Submit,
                payload,
                this.abortController ? this.abortController.signal : undefined
            );

            restoreButton(btn);
            this._resetTurnstile();

            if (response && response.success) {
                const ticketUuid = response.ticket_uuid || '';
                const successMsg = window.__('msg_support_ticket_created', { uuid: ticketUuid });

                showMessage(successMsg, 'success');

                if (subjectInput) subjectInput.value = '';
                if (messageInput) messageInput.value = '';
            } else {
                const errMsg = response && response.message ? response.message : window.__('err_support_submission_failed');
                showMessage(errMsg, 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            this._resetTurnstile();
            showMessage(window.__('err_support_submission_failed'), 'error');
        }
    }

    _resetTurnstile() {
        if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) {
            try {
                turnstile.reset(this.turnstileWidgetId);
            } catch (error) {}
        }
    }

    _renderTurnstile() {
        if (typeof turnstile === 'undefined') return;

        const turnstileElements = document.querySelectorAll('[data-ref="turnstile-container"]');
        turnstileElements.forEach(el => {
            if (el.innerHTML.trim() === '') {
                try {
                    this.turnstileWidgetId = turnstile.render(el, {
                        sitekey: el.getAttribute('data-sitekey') || window.AppTurnstileSiteKey,
                        action: el.getAttribute('data-action'),
                        appearance: 'interaction-only',
                        size: 'invisible'
                    });
                } catch (error) {}
            }
        });
    }

    async _getTurnstileToken() {
        if (typeof turnstile === 'undefined') return null;

        try {
            const existingToken = turnstile.getResponse(this.turnstileWidgetId);
            if (existingToken) return existingToken;
        } catch (error) {}

        return new Promise((resolve) => {
            if (this.turnstileWidgetId !== undefined) {
                const timeoutId = setTimeout(() => {
                    this._resetTurnstile();
                    resolve(null);
                }, 8000);

                try {
                    turnstile.execute(this.turnstileWidgetId, {
                        callback: (token) => {
                            clearTimeout(timeoutId);
                            resolve(token);
                        },
                        'error-callback': () => {
                            clearTimeout(timeoutId);
                            this._resetTurnstile();
                            resolve(null);
                        }
                    });
                } catch (error) {
                    clearTimeout(timeoutId);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    }
}
