/**
 * AuthController
 * Controlador para gestionar la lógica de las vistas de autenticación.
 */
export class AuthController {
    constructor() {
        // Estado inicial si es necesario en el futuro
    }

    init() {
        this.bindEvents();
        console.log("AuthController inicializado.");
    }

    bindEvents() {
        // Delegación de eventos para escuchar clics en toda la aplicación (útil para la SPA)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="togglePassword"]');
            
            if (btn) {
                this.togglePasswordVisibility(btn);
            }
        });
    }

    togglePasswordVisibility(toggleBtn) {
        // Encuentra el contenedor padre del input
        const inputGroup = toggleBtn.closest('.component-input-group');
        if (!inputGroup) return;

        // Encuentra el input real dentro de ese grupo
        const inputField = inputGroup.querySelector('.component-input-field');
        if (!inputField) return;

        // Alterna el tipo de input y el ícono
        if (inputField.type === 'password') {
            inputField.type = 'text';
            toggleBtn.textContent = 'visibility';
        } else {
            inputField.type = 'password';
            toggleBtn.textContent = 'visibility_off';
        }
    }
}