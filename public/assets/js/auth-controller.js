// public/assets/js/auth-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AuthController {
    constructor() {
        this.api = new ApiService();
        this.config = window.AppServerConfig || {};
        this.resendInterval = null; // Almacena el interval globalmente para limpiarlo al navegar
    }

    init() {
        this.bindEvents();
        console.log("AuthController inicializado.");
        
        // Verifica en carga de ventana si está en la etapa 3 para iniciar timer automáticamente
        if (window.location.pathname.includes('/register/verification-account')) {
            const resendBtn = document.getElementById('btn-resend-register-code');
            if (resendBtn) this.startResendTimer(resendBtn, __('btn_resend_code'), 60, true);
        }
    }

    bindEvents() {
        // Escuchar transiciones SPA
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/register/verification-account')) {
                const resendBtn = document.getElementById('btn-resend-register-code');
                if (resendBtn) this.startResendTimer(resendBtn, __('btn_resend_code'), 60, true);
            }
        });

        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-action="togglePassword"]');
            
            const loginBtn = e.target.closest('[data-action="submitLogin"]');
            const login2FABtn = e.target.closest('[data-action="submitLogin2FA"]');
            
            const registerStep1Btn = e.target.closest('[data-action="submitRegisterStep1"]');
            const registerStep2Btn = e.target.closest('[data-action="submitRegisterStep2"]');
            const registerVerifyBtn = e.target.closest('[data-action="submitRegisterVerify"]');
            const resendRegisterCodeBtn = e.target.closest('[data-action="resendRegisterCode"]');
            
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

            if (login2FABtn) {
                e.preventDefault();
                this.handleLogin2FA(login2FABtn);
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

            if (resendRegisterCodeBtn) {
                e.preventDefault();
                this.handleResendRegisterCode(resendRegisterCodeBtn);
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

    startResendTimer(element, defaultText, seconds = 60, isLink = false) {
        if (this.resendInterval) clearInterval(this.resendInterval);
        let timeLeft = seconds;
        
        if (isLink) {
            element.style.pointerEvents = 'none';
            element.style.color = '#999999';
        } else {
            element.disabled = true;
        }
        
        element.textContent = `${defaultText} (${timeLeft})`;

        this.resendInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.resendInterval);
                if (isLink) {
                    element.style.pointerEvents = 'auto';
                    element.style.color = ''; 
                } else {
                    element.disabled = false;
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
            if (result.requires_2fa) {
                if (window.spaRouter) {
                    window.spaRouter.navigate('/ProjectRosaura/login/two-factor');
                } else {
                    window.location.href = '/ProjectRosaura/login/two-factor';
                }
            } else {
                window.location.href = '/ProjectRosaura/';
            }
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleLogin2FA(btn) {
        this.clearMessages();
        const codeInput = document.getElementById('2fa_code');

        if (!codeInput) return;

        const code = codeInput.value.trim();

        if (!code) {
            this.showError('El código es obligatorio.');
            return;
        }

        this.setButtonLoading(btn);

        const data = { code: code };

        const result = await this.api.post(ApiRoutes.Auth.LoginVerify2FA, data);

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

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (password.length < minPass || password.length > maxPass) {
            this.showError(`La contraseña debe tener entre ${minPass} y ${maxPass} caracteres.`);
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

        const minUser = this.config.min_username_length || 3;
        const maxUser = this.config.max_username_length || 32;

        if (username.length < minUser || username.length > maxUser) {
            this.showError(`El nombre de usuario debe tener entre ${minUser} y ${maxUser} caracteres.`);
            return;
        }

        this.setButtonLoading(btn);

        const data = { username: username };

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

        const data = { code: codeInput.value };

        const result = await this.api.post(ApiRoutes.Auth.RegisterVerify, data);

        if (result.success) {
            window.location.href = '/ProjectRosaura/';
        } else {
            this.restoreButton(btn);
            this.showError(result.message);
        }
    }

    async handleResendRegisterCode(btn) {
        this.clearMessages();
        
        if(btn.style.pointerEvents === 'none') return;
        
        btn.style.pointerEvents = 'none';
        btn.style.color = '#999999';
        btn.textContent = 'Enviando...';

        const result = await this.api.post(ApiRoutes.Auth.RegisterResendCode);

        if (result.success) {
            this.showSuccess(result.message);
            this.startResendTimer(btn, __('btn_resend_code'), 60, true);
        } else {
            this.showError(result.message);
            btn.style.pointerEvents = 'auto';
            btn.style.color = '';
            btn.textContent = __('btn_resend_code');
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

        if (result.success) {
            this.showSuccess(result.message);
            this.startResendTimer(btn, __('btn_resend_email'), 60, false);
        } else {
            this.restoreButton(btn);
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

        const minPass = this.config.min_password_length || 8;
        const maxPass = this.config.max_password_length || 64;

        if (password.length < minPass || password.length > maxPass) {
            this.showError(`La contraseña debe tener entre ${minPass} y ${maxPass} caracteres.`);
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