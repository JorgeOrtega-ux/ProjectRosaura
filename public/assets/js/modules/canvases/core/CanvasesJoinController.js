import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

class CanvasesJoinController {
    constructor() {
        this.api = new ApiService();
        this.isInitialized = false;
        
        this.handleSubmitBound = this.handleSubmit.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.form = document.getElementById('form-join-canvas');
        this.input = document.getElementById('join-code-input');
        
        if (this.form && this.input) {
            this.form.addEventListener('submit', this.handleSubmitBound);
            this.input.addEventListener('input', this.handleInputBound);
        }
        
        if (!document.getElementById('shake-anim')) {
            const style = document.createElement('style');
            style.id = 'shake-anim';
            style.innerHTML = `
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    destroy() {
        if (this.form) this.form.removeEventListener('submit', this.handleSubmitBound);
        if (this.input) this.input.removeEventListener('input', this.handleInputBound);
        this.isInitialized = false;
    }

    handleInput(e) {
        let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (val.length > 4) {
            val = val.substring(0, 4) + '-' + val.substring(4, 8);
        }
        e.target.value = val;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const code = this.input.value.trim();
        if (code.length < 5) {
            showMessage('Por favor, ingresa un código válido.', 'error');
            return;
        }

        const btn = document.getElementById('btn-join-canvas') || this.form.querySelector('button[type="submit"]');
        if (!btn) return;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">autorenew</span> Validando...';
        btn.disabled = true;

        try {
            const response = await this.api.post('canvases.join_via_invite', { code: code });
            
            if (response && response.success) {
                showMessage(response.message || '¡Te has unido exitosamente!', 'success');
                const uuid = response.data?.uuid;
                
                btn.innerHTML = '<span class="material-symbols-rounded">check_circle</span> ¡Listo!';
                btn.classList.add('component-button--success');
                
                setTimeout(() => {
                    if (window.spaRouter) {
                        window.spaRouter.navigate(`${window.AppBasePath || ''}/canvases/edit/${uuid}`);
                    } else {
                        window.location.href = `${window.AppBasePath || ''}/canvases/edit/${uuid}`;
                    }
                }, 1000);
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
                showMessage(response?.message || 'Error al validar el código.', 'error');
            }
        } catch (error) {
            console.error('Error joining canvas:', error);
            btn.innerHTML = originalText;
            btn.disabled = false;
            showMessage('Error de conexión con el servidor.', 'error');
        }
    }
}

export { CanvasesJoinController };
