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
                this.handleLogin();
            }

            if (registerStep1Btn) {
                e.preventDefault();
                this.handleRegisterStep1();
            }

            if (registerStep2Btn) {
                e.preventDefault();
                this.handleRegisterStep2();
            }

            if (registerVerifyBtn) {
                e.preventDefault();
                this.handleRegisterVerify();
            }

            if (logoutBtn) {
                e.preventDefault();
                this.handleLogout();
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

    async handleLogin() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

        const data = {
            email: emailInput.value,
            password: passwordInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.Login, data);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            alert(result.message);
        }
    }

    async handleRegisterStep1() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

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
            alert(result.message);
        }
    }

    async handleRegisterStep2() {
        const usernameInput = document.getElementById('username');

        if (!usernameInput) return;

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
            alert(result.message);
        }
    }

    async handleRegisterVerify() {
        const codeInput = document.getElementById('verification_code');

        if (!codeInput) return;

        const data = {
            code: codeInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.RegisterVerify, data);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            alert(result.message);
        }
    }

    async handleLogout() {
        const result = await this.api.post(ApiRoutes.Auth.Logout);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        }
    }
}