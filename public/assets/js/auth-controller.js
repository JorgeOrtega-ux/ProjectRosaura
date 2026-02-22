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
            const registerBtn = e.target.closest('[data-action="submitRegister"]');
            const logoutBtn = e.target.closest('[data-action="submitLogout"]');
            
            if (toggleBtn) {
                this.togglePasswordVisibility(toggleBtn);
            }

            if (loginBtn) {
                e.preventDefault();
                this.handleLogin();
            }

            if (registerBtn) {
                e.preventDefault();
                this.handleRegister();
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

    async handleRegister() {
        const emailInput = document.getElementById('email');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !usernameInput || !passwordInput) return;

        const data = {
            username: usernameInput.value,
            email: emailInput.value,
            password: passwordInput.value
        };

        const result = await this.api.post(ApiRoutes.Auth.Register, data);

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