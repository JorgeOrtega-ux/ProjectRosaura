// public/assets/js/auth-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AuthController {
    constructor() {
        this.api = new ApiService();
    }

    init() {
        this.bindEvents();
        console.log("AuthController inicializado.");
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="togglePassword"]');
            const loginBtn = e.target.closest('[data-action="submitLogin"]');
            
            const registerStep1Btn = e.target.closest('[data-action="submitRegisterStep1"]');
            const registerStep2Btn = e.target.closest('[data-action="submitRegisterStep2"]');
            const registerVerifyBtn = e.target.closest('[data-action="submitRegisterVerify"]');
            
            const logoutBtn = e.target.closest('[data-action="submitLogout"]');
            
            if (toggleBtn) {
                this.togglePasswordVisibility(toggleBtn);
            }

            if (loginBtn) {
                e.preventDefault();
                this.handleLogin(loginBtn);
            }

            if (registerStep1Btn) {
                e.preventDefault();
                this.handleRegisterStep1(registerStep1Btn);
            }

            if (registerStep2Btn) {
                e.preventDefault();
                this.handleRegisterStep2(registerStep2Btn);
            }

            if (registerVerifyBtn) {
                e.preventDefault();
                this.handleRegisterVerify(registerVerifyBtn);
            }

            if (logoutBtn) {
                e.preventDefault();
                this.handleLogout(logoutBtn);
            }
        });
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

    showError(msg) {
        const errorBox = document.getElementById('auth-error-message');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.classList.add('active');
        } else {
            alert(msg);
        }
    }

    clearError() {
        const errorBox = document.getElementById('auth-error-message');
        if (errorBox) {
            errorBox.textContent = '';
            errorBox.classList.remove('active');
        }
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
        }
        btn.disabled = false;
    }

    async handleLogin(btn) {
        this.clearError();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

        this.setButtonLoading(btn);

        const data = {
            email: emailInput.value,
            password: passwordInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.Login, data);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterStep1(btn) {
        this.clearError();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

        this.setButtonLoading(btn);

        const data = {
            email: emailInput.value,
            password: passwordInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterStep1, data);

        if (result.success) {
            if (window.spaRouter) {
                window.spaRouter.navigate('/ProjectRosaura/register/aditional-data');
            } else {
                window.location.href = '/ProjectRosaura/register/aditional-data';
            }
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterStep2(btn) {
        this.clearError();
        const usernameInput = document.getElementById('username');

        if (!usernameInput) return;
        
        this.setButtonLoading(btn);

        const data = {
            username: usernameInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterStep2, data);

        if (result.success) {
            if (window.spaRouter) {
                window.spaRouter.navigate('/ProjectRosaura/register/verification-account');
            } else {
                window.location.href = '/ProjectRosaura/register/verification-account';
            }
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleRegisterVerify(btn) {
        this.clearError();
        const codeInput = document.getElementById('verification_code');

        if (!codeInput) return;

        this.setButtonLoading(btn);

        const data = {
            code: codeInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterVerify, data);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleLogout(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return; // Bloquear clics múltiples
        logoutBtn.dataset.loading = 'true';

        // Generar el spinner dinámicamente a la derecha del texto
        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        const result = await this.api.post(ApiRoutes.Auth.Logout);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            // Si falla se remueve el nodo inyectado
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
        }
    }
}