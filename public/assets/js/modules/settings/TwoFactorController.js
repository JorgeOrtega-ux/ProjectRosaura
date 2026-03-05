// public/assets/js/modules/settings/TwoFactorController.js
import { ApiService } from '../../core/api/ApiServices.js';
import { ApiRoutes } from '../../core/api/ApiRoutes.js';

export class TwoFactorController {
    constructor() {
        this.api = new ApiService();
        this.currentRecoveryCodes = null;
        this.newRecoveryCodes = null;
        this.basePath = window.AppBasePath || '';
        this.eventsBound = false; // <-- BANDERA DE BLINDAJE
    }

    init() {
        this.bindEvents();
        console.log("TwoFactorController inicializado.");

        // Esta lógica debe ejecutarse cada vez que init() es llamado tras renderizar la vista
        if (document.querySelector('[data-ref="2fa-setup-container"]')) {
            this.init2FAView();
        }
    }

    bindEvents() {
        if (this.eventsBound) return; // <-- EVITA DUPLICAR EVENTOS

        document.addEventListener('click', (e) => {
            const btnActivate2FA = e.target.closest('[data-action="submitActivate2FA"]');
            if (btnActivate2FA) this.enable2FA(btnActivate2FA);

            const btnDeactivate2FA = e.target.closest('[data-action="submitDeactivate2FA"]');
            if (btnDeactivate2FA) this.disable2FA(btnDeactivate2FA);

            const btnCopyRecovery = e.target.closest('[data-action="copyRecoveryCodes"]');
            if (btnCopyRecovery) this.copyRecoveryCodes(btnCopyRecovery);
            
            const btnRegenerate2FA = e.target.closest('[data-action="submitRegenerateRecoveryCodes"]');
            if (btnRegenerate2FA) this.regenerateRecoveryCodes(btnRegenerate2FA);

            const btnCopyNewRecovery = e.target.closest('[data-action="copyNewRecoveryCodes"]');
            if (btnCopyNewRecovery) this.copyNewRecoveryCodes(btnCopyNewRecovery);

            const btnFinish2FA = e.target.closest('[data-action="finish2FA"]');
            if (btnFinish2FA) {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/security');
                else window.location.href = this.basePath + '/settings/security';
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.getAttribute('data-ref') === 'chk_confirm_deactivate_2fa') {
                const passArea = document.querySelector('[data-ref="deactivate_2fa_password_area"]');
                if (passArea) {
                    if (e.target.checked) passArea.classList.remove('disabled');
                    else passArea.classList.add('disabled');
                }
            }
        });

        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/settings/2fa') && !e.detail.url.includes('recovery') && !e.detail.url.includes('deactivate')) {
                this.init2FAView();
            }
        });

        this.eventsBound = true; // <-- SELLA LOS EVENTOS
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    setButtonLoading(btn) {
        if (btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;
    }

    restoreButton(btn) {
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }

    async init2FAView() {
        const setupContainer = document.querySelector('[data-ref="2fa-setup-container"]');
        if (setupContainer && setupContainer.classList.contains('active')) {
            const res = await this.api.post(ApiRoutes.Settings.Generate2FA);
            if (res.success) {
                const qrContainer = document.querySelector('[data-ref="2fa-qr-container"]');
                if (qrContainer) {
                    try {
                        if (!window.QRCodeStyling) {
                            await new Promise((resolve, reject) => {
                                const script = document.createElement('script');
                                script.src = 'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js';
                                script.onload = resolve;
                                script.onerror = reject;
                                document.head.appendChild(script);
                            });
                        }

                        qrContainer.innerHTML = '';
                        const qrCode = new window.QRCodeStyling({
                            width: 150, 
                            height: 150, 
                            type: "svg", 
                            data: res.qr_url,
                            margin: 0,
                            dotsOptions: { color: "#111111", type: "rounded" },
                            backgroundOptions: { color: "#ffffff" },
                            cornersSquareOptions: { type: "extra-rounded", color: "#111111" },
                            cornersDotOptions: { type: "dot", color: "#111111" }
                        });

                        qrCode.append(qrContainer);

                        const qrElement = qrContainer.querySelector('canvas, svg');
                        if (qrElement) {
                            qrElement.classList.add('component-qr');
                        }

                    } catch (error) {
                        console.error("No se pudo cargar qr-code-styling, utilizando fallback.", error);
                        qrContainer.innerHTML = `<p class="component-text--danger">Error renderizando QR. Usa la clave secreta abajo.</p>`;
                    }
                }
                
                const secretText = document.querySelector('[data-ref="2fa-secret-text"]');
                if (secretText) {
                    secretText.textContent = res.secret;
                }
            } else {
                this.showMessage(res.message, 'error');
            }
        }
    }

    async enable2FA(btn) {
        const input = document.querySelector('[data-ref="2fa_app_code"]');
        if (!input) return;
        const code = input.value.trim();
        if (code.length !== 6) {
            this.showMessage('El código debe tener 6 dígitos.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Enable2FA, { code: code });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            
            document.querySelector('[data-ref="2fa-setup-container"]').classList.replace('active', 'disabled');
            const recoveryContainer = document.querySelector('[data-ref="2fa-recovery-container"]');
            recoveryContainer.classList.replace('disabled', 'active');
            
            const codeList = document.querySelector('[data-ref="2fa-recovery-codes-list"]');
            codeList.innerHTML = '';
            result.recovery_codes.forEach(c => {
                const div = document.createElement('div');
                div.className = 'component-recovery-code';
                div.innerHTML = `
                    <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                    <span class="component-recovery-code-text">${c}</span>
                `;
                codeList.appendChild(div);
            });
            
            this.currentRecoveryCodes = result.recovery_codes.join('\n');
            
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    async disable2FA(btn) {
        const input = document.querySelector('[data-ref="2fa_disable_password"]');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            this.showMessage('Debes ingresar tu contraseña.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Disable2FA, { password: pass });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/2fa');
                else window.location.href = this.basePath + '/settings/2fa';
            }, 1000);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    copyRecoveryCodes(btn) {
        if (!this.currentRecoveryCodes) return;
        navigator.clipboard.writeText(this.currentRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = typeof window.__ === 'function' ? __('btn_copied') : 'Copiado!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }

    async regenerateRecoveryCodes(btn) {
        const input = document.querySelector('[data-ref="2fa_regenerate_password"]');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            this.showMessage('Debes ingresar tu contraseña.', 'error');
            return;
        }

        this.setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.RegenerateRecoveryCodes, { password: pass });
        this.restoreButton(btn);

        if (result.success) {
            this.showMessage(result.message, 'success');
            
            const step1 = document.querySelector('[data-ref="step-1-generate-codes"]');
            const wrapper = document.querySelector('[data-ref="2fa-new-recovery-codes-wrapper"]');
            
            if (step1) step1.classList.replace('active', 'disabled');
            if (wrapper) wrapper.classList.replace('disabled', 'active');
            
            const codeList = document.querySelector('[data-ref="2fa-new-recovery-codes-list"]');
            if (codeList) {
                codeList.innerHTML = '';
                result.recovery_codes.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'component-recovery-code';
                    div.innerHTML = `
                        <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                        <span class="component-recovery-code-text">${c}</span>
                    `;
                    codeList.appendChild(div);
                });
            }
            
            this.newRecoveryCodes = result.recovery_codes.join('\n');
            input.value = ''; 
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    copyNewRecoveryCodes(btn) {
        if (!this.newRecoveryCodes) return;
        navigator.clipboard.writeText(this.newRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = typeof window.__ === 'function' ? __('btn_copied') : 'Copiado!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }
}