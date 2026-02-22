/**
 * AuthController
 * Controlador para gestionar la lógica de las vistas de autenticación.
 */
export class AuthController {
    constructor() {
        this.apiUrl = '/ProjectRosaura/api/auth-handler.php';
    }

    init() {
        this.bindEvents();
        console.log("AuthController inicializado.");
    }

    bindEvents() {
        // Delegación de eventos para escuchar clics en toda la aplicación (útil para la SPA)
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
            action: 'login',
            email: emailInput.value,
            password: passwordInput.value
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                // Forzamos la recarga real de la página para que PHP reconstruya el header con la sesión activa
                window.location.href = '/ProjectRosaura/';
            } else {
                alert(result.message); // En el futuro puedes cambiar esto por un toast o modal nativo
            }
        } catch (error) {
            console.error("Error en login:", error);
            alert("Ocurrió un error al iniciar sesión.");
        }
    }

    async handleRegister() {
        const emailInput = document.getElementById('email');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !usernameInput || !passwordInput) return;

        const data = {
            action: 'register',
            email: emailInput.value,
            username: usernameInput.value,
            password: passwordInput.value
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                // Al registrar, la sesión se inicia en backend, por lo que recargamos
                window.location.href = '/ProjectRosaura/';
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error("Error en registro:", error);
            alert("Ocurrió un error al registrar la cuenta.");
        }
    }

    async handleLogout() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            const result = await response.json();

            if (result.success) {
                // Al cerrar sesión, recargamos la página base
                window.location.href = '/ProjectRosaura/';
            }
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    }
}