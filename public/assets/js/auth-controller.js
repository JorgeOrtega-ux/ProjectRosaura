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
            
            const forgotPasswordBtn = e.target.closest('[data-action="submitForgotPassword"]');
            const resetPasswordBtn = e.target.closest('[data-action="submitResetPassword"]');
            
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

            if (forgotPasswordBtn) {
                e.preventDefault();
                this.handleForgotPassword(forgotPasswordBtn);
            }

            if (resetPasswordBtn) {
                e.preventDefault();
                this.handleResetPassword(resetPasswordBtn);
            }

            if (logoutBtn) {
                e.preventDefault();
                this.handleLogout(logoutBtn);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'verification_code') {
                let val = e.target.value.replace(/\D/g, ''); 
                let formatted = '';
                for (let i = 0; i < val.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formatted += '-';
                    }
                    formatted += val[i];
                }
                e.target.value = formatted;
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
        this.clearMessages();
        const errorBox = document.getElementById('auth-error-message');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.classList.add('active');
        } else {
            alert(msg);
        }
    }

    showSuccess(msg) {
        this.clearMessages();
        const successBox = document.getElementById('auth-success-message');
        if (successBox) {
            successBox.textContent = msg;
            successBox.classList.add('active');
        } else {
            alert(msg);
        }
    }

    clearMessages() {
        const errorBox = document.getElementById('auth-error-message');
        if (errorBox) {
            errorBox.textContent = '';
            errorBox.classList.remove('active');
        }
        
        const successBox = document.getElementById('auth-success-message');
        if (successBox) {
            successBox.textContent = '';
            successBox.classList.remove('active');
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
        this.clearMessages();
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
        this.clearMessages();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (password.length < 8 || password.length > 64) {
            this.showError('La contraseña debe tener entre 8 y 64 caracteres.');
            return;
        }

        if (email.length < 6 || email.length > 254) {
            this.showError('El correo debe tener entre 6 y 254 caracteres en total.');
            return;
        }

        const atIndex = email.indexOf('@');
        if (atIndex === -1) {
             this.showError('El formato del correo electrónico no es válido.');
             return;
        }

        const localPart = email.substring(0, atIndex);
        const domainPart = email.substring(atIndex + 1);

        if (localPart.length < 2 || localPart.length > 64) {
            this.showError('La parte local del correo debe tener entre 2 y 64 caracteres.');
            return;
        }

        if (domainPart.length < 3 || domainPart.length > 255) {
            this.showError('El dominio del correo debe tener entre 3 y 255 caracteres.');
            return;
        }

        const subdomains = domainPart.split('.');
        if (subdomains.length < 2) {
             this.showError('El dominio del correo electrónico debe incluir una extensión.');
             return;
        }

        for (const sub of subdomains) {
            if (sub.length < 2 || sub.length > 63) {
                this.showError('Cada parte del dominio debe tener entre 2 y 63 caracteres.');
                return;
            }
        }

        this.setButtonLoading(btn);

        const data = {
            email: email,
            password: password
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
        this.clearMessages();
        const usernameInput = document.getElementById('username');

        if (!usernameInput) return;
        
        const username = usernameInput.value.trim();

        if (username.length < 3 || username.length > 32) {
            this.showError('El nombre de usuario debe tener entre 3 y 32 caracteres.');
            return;
        }

        this.setButtonLoading(btn);

        const data = {
            username: username
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
        this.clearMessages();
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

    async handleForgotPassword(btn) {
        this.clearMessages();
        const emailInput = document.getElementById('forgot_email');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email) {
            this.showError('Por favor ingresa tu correo.');
            return;
        }

        this.setButtonLoading(btn);

        const data = { email: email };
        const result = await this.api.post(ApiRoutes.Auth.ForgotPassword, data);

        this.restoreButton(btn);

        if (result.success) {
            this.showSuccess(result.message);
        } else {
            this.showError(result.message);
        }
    }

    async handleResetPassword(btn) {
        this.clearMessages();
        const tokenInput = document.getElementById('reset_token');
        const passInput = document.getElementById('new_password');
        const confirmInput = document.getElementById('confirm_password');

        if (!tokenInput || !passInput || !confirmInput) return;

        const password = passInput.value;
        const confirmPassword = confirmInput.value;

        if (password !== confirmPassword) {
            this.showError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 8 || password.length > 64) {
            this.showError('La contraseña debe tener entre 8 y 64 caracteres.');
            return;
        }

        this.setButtonLoading(btn);

        const data = {
            token: tokenInput.value,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Auth.ResetPassword, data);

        if (result.success) {
            this.showSuccess(result.message);
            setTimeout(() => {
                if (window.spaRouter) {
                    window.spaRouter.navigate('/ProjectRosaura/login');
                } else {
                    window.location.href = '/ProjectRosaura/login';
                }
            }, 2000);
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleLogout(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return; 
        logoutBtn.dataset.loading = 'true';

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        const result = await this.api.post(ApiRoutes.Auth.Logout);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
        }
    }
}