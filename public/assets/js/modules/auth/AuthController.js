import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

class AuthController {
    constructor() {
        this.api = new ApiService();
        this.config = window.AppServerConfig || {};
        this.resendInterval = null;
        this.basePath = window.AppBasePath || '';

        this.abortController = null;
        this.turnstileWidgetId = undefined;

        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        this.abortController = new AbortController();

        this.bindEvents();
        this._renderTurnstile();

        if (window.location.pathname.includes('/register/verification-account')) {
            const resendBtn = document.querySelector('[data-ref="btn-resend-register-code"]');
            const defaultText = __('btn_resend_code');
            if (resendBtn) this.startResendTimer(resendBtn, defaultText, 60, true);
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);

        if (this.resendInterval) {
            clearInterval(this.resendInterval);
            this.resendInterval = null;
        }

        this.turnstileWidgetId = undefined;
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/register/verification-account')) {
            const resendBtn = document.querySelector('[data-ref="btn-resend-register-code"]');
            const defaultText = __('btn_resend_code');
            if (resendBtn) this.startResendTimer(resendBtn, defaultText, 60, true);
        }
    }

    handleClick(e) {
        const toggleBtn = e.target.closest('[data-action="togglePassword"]');
        const loginBtn = e.target.closest('[data-action="submitLogin"]');
        const login2FABtn = e.target.closest('[data-action="submitLogin2FA"]');
        const registerStep1Btn = e.target.closest('[data-action="submitRegisterStep1"]');
        const registerStep2Btn = e.target.closest('[data-action="submitRegisterStep2"]');
        const generateUserBtn = e.target.closest('[data-action="generateUsername"]');
        const registerVerifyBtn = e.target.closest('[data-action="submitRegisterVerify"]');
        const resendRegisterCodeBtn = e.target.closest('[data-action="resendRegisterCode"]');
        const forgotPasswordBtn = e.target.closest('[data-action="submitForgotPassword"]');
        const resetPasswordBtn = e.target.closest('[data-action="submitResetPassword"]');

        const switchAccountBtn = e.target.closest('[data-action="switchAccount"]');
        const logoutAllBtn = e.target.closest('[data-action="logoutAll"]');

        const cancelDeletionBtn = e.target.closest('[data-action="cancelAccountDeletion"]');
        const continueDeletionBtn = e.target.closest('[data-action="continueAccountDeletion"]');

        if (toggleBtn) this.togglePasswordVisibility(toggleBtn);
        if (generateUserBtn) { e.preventDefault(); this.generateRandomUsername(generateUserBtn); }
        if (loginBtn) { e.preventDefault(); this.handleLogin(loginBtn); }
        if (login2FABtn) { e.preventDefault(); this.handleLogin2FA(login2FABtn); }
        if (registerStep1Btn) { e.preventDefault(); this.handleRegisterStep1(registerStep1Btn); }
        if (registerStep2Btn) { e.preventDefault(); this.handleRegisterStep2(registerStep2Btn); }
        if (registerVerifyBtn) { e.preventDefault(); this.handleRegisterVerify(registerVerifyBtn); }
        if (resendRegisterCodeBtn) { e.preventDefault(); this.handleResendRegisterCode(resendRegisterCodeBtn); }
        if (forgotPasswordBtn) { e.preventDefault(); this.handleForgotPassword(forgotPasswordBtn); }
        if (resetPasswordBtn) { e.preventDefault(); this.handleResetPassword(resetPasswordBtn); }

        if (switchAccountBtn) { e.preventDefault(); this.handleSwitchAccount(switchAccountBtn); }
        if (logoutAllBtn) { e.preventDefault(); this.handleLogoutAll(logoutAllBtn); }

        if (cancelDeletionBtn) { e.preventDefault(); this.handleCancelAccountDeletion(cancelDeletionBtn); }
        if (continueDeletionBtn) { e.preventDefault(); window.location.href = this.basePath + '/login'; }
    }

    handleInput(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'verification_code') {
            let val = e.target.value.replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += '-';
                formatted += val[i];
            }
            e.target.value = formatted;
        }
    }

    startResendTimer(element, defaultText, seconds = 60, isLink = false) {
        if (this.resendInterval) clearInterval(this.resendInterval);
        let timeLeft = seconds;

        if (isLink) {
            element.classList.add('disabled-interactive', 'component-text-notice--muted');
        } else {
            element.classList.add('disabled-interactive');
        }

        element.textContent = `${defaultText} (${timeLeft})`;

        this.resendInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.resendInterval);
                if (isLink) {
                    element.classList.remove('disabled-interactive', 'component-text-notice--muted');
                } else {
                    element.classList.remove('disabled-interactive');
                    element.dataset.originalText = defaultText;
                }
                element.textContent = defaultText;
            } else {
                element.textContent = `${defaultText} (${timeLeft})`;
            }
        }, 1000);
    }

    togglePasswordVisibility(toggleBtn) {
        const inputGroup = toggleBtn.closest('.component-input-group');
        if (!inputGroup) return;

        const inputField = inputGroup.querySelector('.component-input-field');
        if (!inputField) return;

        if (inputField.type === 'password') {
            inputField.type = 'text';
            toggleBtn.textContent = 'visibility';
        } else {
            inputField.type = 'password';
            toggleBtn.textContent = 'visibility_off';
        }
    }

    generateRandomUsername(btn) {
        const usernameInput = document.querySelector('[data-ref="username"]');
        if (!usernameInput) return;

        const minUser = this.config.min_username_length || 3;
        const maxUser = this.config.max_username_length || 32;

        const prefix = 'User';
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 6);

        let generated = `${prefix}_${timestamp}${randomStr}`;

        if (generated.length > maxUser) {
            generated = generated.substring(0, maxUser);
        }

        while (generated.length < minUser) {
            generated += Math.floor(Math.random() * 10);
        }

        usernameInput.value = generated;
        usernameInput.focus();
    }

    showError(msg) {
        this.clearMessages();
        const errorBox = document.querySelector('[data-ref="auth-error-message"]');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.classList.add('active');
        } else {
            showMessage(msg, 'error');
        }
    }

    showSuccess(msg) {
        this.clearMessages();
        const successBox = document.querySelector('[data-ref="auth-success-message"]');
        if (successBox) {
            successBox.textContent = msg;
            successBox.classList.add('active');
        } else {
            showMessage(msg, 'success');
        }
    }

    clearMessages() {
        const errorBox = document.querySelector('[data-ref="auth-error-message"]');
        if (errorBox) {
            errorBox.textContent = '';
            errorBox.classList.remove('active');
        }

        const successBox = document.querySelector('[data-ref="auth-success-message"]');
        if (successBox) {
            successBox.textContent = '';
            successBox.classList.remove('active');
        }
    }

    _renderTurnstile() {
        if (typeof turnstile === 'undefined') return;

        const turnstileElements = document.querySelectorAll('[data-ref="turnstile-container"]');

        turnstileElements.forEach(el => {
            if (el.innerHTML.trim() === '') {
                this.turnstileWidgetId = turnstile.render(el, {
                    sitekey: el.getAttribute('data-sitekey'),
                    action: el.getAttribute('data-action'),
                    appearance: 'interaction-only',
                    size: 'invisible'
                });
            }
        });
    }

    async _getTurnstileToken() {
        if (typeof turnstile === 'undefined') return null;

        const existingToken = turnstile.getResponse(this.turnstileWidgetId);
        if (existingToken) return existingToken;

        return new Promise((resolve) => {
            if (this.turnstileWidgetId !== undefined) {
                const timeoutId = setTimeout(() => {
                    turnstile.reset(this.turnstileWidgetId);
                    resolve(null);
                }, 8000);

                turnstile.execute(this.turnstileWidgetId, {
                    callback: (token) => {
                        clearTimeout(timeoutId);
                        resolve(token);
                    },
                    'error-callback': () => {
                        clearTimeout(timeoutId);
                        turnstile.reset(this.turnstileWidgetId);
                        resolve(null);
                    }
                });
            } else {
                resolve(null);
            }
        });
    }

    async handleSwitchAccount(btn) {
        const userId = btn.getAttribute('data-id');
        if (!userId) return;

        const data = { user_id: userId };
        const result = await this.api.post(ApiRoutes.Auth.SwitchAccount, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            window.location.href = this.basePath + '/';
        } else {
            showMessage(result.message || 'Error al cambiar de cuenta', 'error');
        }
    }

    async handleLogoutAll(btn) {
        const result = await this.api.post(ApiRoutes.Auth.LogoutAll, {}, this.abortController.signal);
        if (result.aborted) return;
        window.location.href = this.basePath + '/login';
    }

    async handleLogin(btn) {
        this.clearMessages();
        const emailInput = document.querySelector('[data-ref="email"]');
        const passwordInput = document.querySelector('[data-ref="password"]');

        if (!emailInput || !passwordInput) return;

        setButtonLoading(btn);

        const data = {
            email: emailInput.value,
            password: passwordInput.value,
            turnstile_token: await this._getTurnstileToken()
        };

        const result = await this.api.post(ApiRoutes.Auth.Login, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            if (result.requires_2fa) {
                sessionStorage.setItem('temp_auth_token', result.temp_auth_token);
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/login/two-factor');
                else window.location.href = this.basePath + '/login/two-factor';
            } else {
                window.location.href = this.basePath + '/';
            }
        } else {
            if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) turnstile.reset(this.turnstileWidgetId);
            restoreButton(btn);

            if (result.status === 'pending_deletion') {
                const formWrapper = document.querySelector('.component-form-box');
                if (formWrapper) {
                    formWrapper.innerHTML = `
                        <div class="component-form-header">
                            <h1 class="component-form-title">Cuenta en eliminación</h1>
                            <p class="component-form-desc">Tu cuenta ha sido programada para ser eliminada permanentemente el <strong>${new Date(result.scheduled_at).toLocaleDateString()}</strong>.</p>
                        </div>
                        <div class="component-form-body">
                            <p style="margin-bottom: 24px; font-size: 14px; color: var(--color-text-primary); text-align: center;">¿Deseas cancelar el proceso y recuperar el acceso a tu cuenta?</p>
                            <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="cancelAccountDeletion" data-token="${result.temp_auth_token}">Sí, cancelar eliminación y entrar</button>
                            
                            <div class="component-link-container component-link-container--center" style="margin-top: 16px;">
                                <span class="component-link" data-action="continueAccountDeletion" style="cursor: pointer;">No, mantener eliminación y salir</span>
                            </div>
                        </div>
                    `;
                } else {
                    this.showError(result.message);
                }
            } else if (result.status === 'suspended') {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/account-suspended');
                else window.location.href = this.basePath + '/account-suspended';
            } else if (result.status === 'deleted') {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/account-deleted');
                else window.location.href = this.basePath + '/account-deleted';
            } else {
                this.showError(result.message || 'Error al iniciar sesión. Comprueba el límite de cuentas.');
            }
        }
    }

    async handleCancelAccountDeletion(btn) {
        const token = btn.getAttribute('data-token');
        if (!token) return;

        setButtonLoading(btn);

        const data = { temp_auth_token: token };
        const result = await this.api.post(ApiRoutes.Auth.CancelAccountDeletion, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            if (result.requires_2fa) {
                sessionStorage.setItem('temp_auth_token', result.temp_auth_token);
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/login/two-factor');
                else window.location.href = this.basePath + '/login/two-factor';
            } else {
                window.location.href = this.basePath + '/';
            }
        } else {
            restoreButton(btn);
            showMessage(result.message, 'error');
            setTimeout(() => { window.location.href = this.basePath + '/login'; }, 2000);
        }
    }

    async handleLogin2FA(btn) {
        this.clearMessages();
        const codeInput = document.querySelector('[data-ref="2fa_code"]');
        if (!codeInput) return;

        const code = codeInput.value.trim();
        if (!code) {
            this.showError(__('err_code_required'));
            return;
        }

        const tempToken = sessionStorage.getItem('temp_auth_token');
        if (!tempToken) {
            this.showError(__('err_session_expired') || 'Sesión expirada.');
            return;
        }

        setButtonLoading(btn);

        const data = {
            code: code,
            temp_auth_token: tempToken,
            turnstile_token: await this._getTurnstileToken()
        };

        const result = await this.api.post(ApiRoutes.Auth.LoginVerify2FA, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            sessionStorage.removeItem('temp_auth_token');
            window.location.href = this.basePath + '/';
        } else {
            if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) turnstile.reset(this.turnstileWidgetId);
            restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterStep1(btn) {
        this.clearMessages();
        const emailInput = document.querySelector('[data-ref="email"]');
        const passwordInput = document.querySelector('[data-ref="password"]');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (password.length < minPass || password.length > maxPass) {
            this.showError(__('err_password_length').replace(':min', minPass).replace(':max', maxPass));
            return;
        }

        if (email.length < 6 || email.length > 254) {
            this.showError(__('err_email_length'));
            return;
        }

        const atIndex = email.indexOf('@');
        if (atIndex === -1) {
            this.showError(__('err_email_format'));
            return;
        }

        setButtonLoading(btn);

        const data = {
            email: email,
            password: password,
            turnstile_token: await this._getTurnstileToken()
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterStep1, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            sessionStorage.setItem('reg_token', result.reg_token);
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/register/aditional-data');
            else window.location.href = this.basePath + '/register/aditional-data';
        } else {
            if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) turnstile.reset(this.turnstileWidgetId);
            restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterStep2(btn) {
        this.clearMessages();
        const usernameInput = document.querySelector('[data-ref="username"]');
        if (!usernameInput) return;

        const username = usernameInput.value.trim();
        const regToken = sessionStorage.getItem('reg_token');

        if (!regToken) {
            this.showError(__('err_session_expired') || 'Sesión expirada.');
            return;
        }

        setButtonLoading(btn);

        const data = {
            username: username,
            reg_token: regToken
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterStep2, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/register/verification-account');
            else window.location.href = this.basePath + '/register/verification-account';
        } else {
            restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterVerify(btn) {
        this.clearMessages();
        const codeInput = document.querySelector('[data-ref="verification_code"]');
        if (!codeInput) return;

        const regToken = sessionStorage.getItem('reg_token');
        if (!regToken) {
            this.showError(__('err_session_expired') || 'Sesión expirada.');
            return;
        }

        setButtonLoading(btn);

        const data = {
            code: codeInput.value,
            reg_token: regToken
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterVerify, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            sessionStorage.removeItem('reg_token');
            window.location.href = this.basePath + '/';
        } else {
            restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleResendRegisterCode(btn) {
        this.clearMessages();
        if (btn.classList.contains('disabled-interactive')) return;

        const regToken = sessionStorage.getItem('reg_token');
        if (!regToken) {
            this.showError(__('err_session_expired') || 'Sesión expirada.');
            return;
        }

        btn.classList.add('disabled-interactive', 'component-text-notice--muted');
        btn.textContent = __('btn_sending');

        const data = { reg_token: regToken };
        const result = await this.api.post(ApiRoutes.Auth.RegisterResendCode, data, this.abortController.signal);

        if (result.aborted) return;

        const defaultText = __('btn_resend_code');

        if (result.success) {
            this.showSuccess(result.message);
            this.startResendTimer(btn, defaultText, 60, true);
        } else {
            this.showError(result.message);
            if (result.cooldown) {
                this.startResendTimer(btn, defaultText, result.cooldown, true);
            } else {
                btn.classList.remove('disabled-interactive', 'component-text-notice--muted');
                btn.textContent = defaultText;
            }
        }
    }

    async handleForgotPassword(btn) {
        this.clearMessages();
        const emailInput = document.querySelector('[data-ref="forgot_email"]');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email) {
            this.showError(__('err_email_required'));
            return;
        }

        setButtonLoading(btn);

        const data = {
            email: email,
            turnstile_token: await this._getTurnstileToken()
        };
        const result = await this.api.post(ApiRoutes.Auth.ForgotPassword, data, this.abortController.signal);

        if (result.aborted) return;

        let defaultText = __('btn_resend_email');
        if (defaultText === 'btn_resend_email') {
            defaultText = 'Reenviar correo';
        }

        if (result.success) {
            this.showSuccess(result.message);
            restoreButton(btn);
            this.startResendTimer(btn, defaultText, 60, false);
        } else {
            if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) turnstile.reset(this.turnstileWidgetId);
            restoreButton(btn);
            this.showError(result.message);
            if (result.cooldown) {
                this.startResendTimer(btn, defaultText, result.cooldown, false);
            }
        }
    }

    async handleResetPassword(btn) {
        this.clearMessages();
        const tokenInput = document.querySelector('[data-ref="reset_token"]');
        const passInput = document.querySelector('[data-ref="new_password"]');
        const confirmInput = document.querySelector('[data-ref="confirm_password"]');

        if (!tokenInput || !passInput || !confirmInput) return;

        const password = passInput.value;
        const confirmPassword = confirmInput.value;

        if (password !== confirmPassword) {
            this.showError(__('err_password_mismatch'));
            return;
        }

        setButtonLoading(btn);

        const data = {
            token: tokenInput.value,
            password: password,
            turnstile_token: await this._getTurnstileToken()
        };

        const result = await this.api.post(ApiRoutes.Auth.ResetPassword, data, this.abortController.signal);

        if (result.aborted) return;

        if (result.success) {
            this.showSuccess(result.message);
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/login');
                else window.location.href = this.basePath + '/login';
            }, 2000);
        } else {
            if (typeof turnstile !== 'undefined' && this.turnstileWidgetId !== undefined) turnstile.reset(this.turnstileWidgetId);
            restoreButton(btn);
            this.showError(result.message);
        }
    }
}

export { AuthController };