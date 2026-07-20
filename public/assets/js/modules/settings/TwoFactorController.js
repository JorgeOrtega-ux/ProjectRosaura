import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../core/utils/uiUtils.js';

const __ = (key, params, defaultText) => {
    if (typeof window.__ === 'function') {
        return window.__(key, params, defaultText);
    }
    return defaultText || key;
};

class TwoFactorController {
    constructor() {
        this.api = new ApiService();
        this.currentRecoveryCodes = null;
        this.newRecoveryCodes = null;
        this.basePath = window.AppBasePath || '';

        this.abortController = null;

        this.handleClickBound = this.handleClick.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.bindEvents();

        if (document.querySelector('[data-ref="2fa-setup-container"]')) {
            this.init2FAView();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('change', this.handleChangeBound);
        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('change', this.handleChangeBound);
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
    }

    handleClick(e) {
        const btnOpenActivate = e.target.closest('[data-action="openActivate2FADialog"]');
        if (btnOpenActivate) this.enable2FA(btnOpenActivate);

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
    }

    handleChange(e) {
        if (e.target && e.target.getAttribute('data-ref') === 'chk_confirm_deactivate_2fa') {
            const passArea = document.querySelector('[data-ref="deactivate_2fa_password_area"]');
            if (passArea) {
                if (e.target.checked) passArea.classList.remove('disabled');
                else passArea.classList.add('disabled');
            }
        }
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/settings/2fa') && !e.detail.url.includes('recovery') && !e.detail.url.includes('deactivate')) {
            this.init2FAView();
        }
    }

    async init2FAView() {
        const setupContainer = document.querySelector('[data-ref="2fa-setup-container"]');
        if (setupContainer && setupContainer.classList.contains('active')) {
            const res = await this.api.post(ApiRoutes.Settings.Generate2FA, {}, this.abortController?.signal);
            
            if (res.aborted) return;
            
            if (res.success) {
                const qrContainer = document.querySelector('[data-ref="2fa-qr-container"]');
                if (qrContainer) {
                    if (res.qr_svg) {
                        qrContainer.innerHTML = res.qr_svg;
                        const svgElem = qrContainer.querySelector('svg');
                        if (svgElem) {
                            svgElem.setAttribute('width', '150');
                            svgElem.setAttribute('height', '150');
                            svgElem.classList.add('component-qr');
                        }
                    } else if (res.qr_url) {
                        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(res.qr_url)}" alt="QR Code" style="width:150px;height:150px;display:block;margin:auto;">`;
                    }
                }
                
                const secretText = document.querySelector('[data-ref="2fa-secret-text"]');
                if (secretText) {
                    secretText.textContent = res.secret;
                }
            } else {
                showMessage(res.message, 'error');
            }
        }
    }

    async enable2FA(btn) {
        const isConfirmed = await window.dialogSystem.show('activate2FADialog');
        if (!isConfirmed.confirmed) return;

        const code = isConfirmed.data['modal_2fa_code'] ? isConfirmed.data['modal_2fa_code'].trim() : '';

        if (code.length !== 6) {
            showMessage(__('err_code_6_digits'), 'error');
            return;
        }

        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Enable2FA, { code: code }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            
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
            showMessage(result.message, 'error');
        }
    }

    async disable2FA(btn) {
        const input = document.querySelector('[data-ref="2fa_disable_password"]');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            showMessage(__('err_password_required'), 'error');
            return;
        }

        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.Disable2FA, { password: pass }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            setTimeout(() => {
                if (window.spaRouter) window.spaRouter.navigate(this.basePath + '/settings/2fa');
                else window.location.href = this.basePath + '/settings/2fa';
            }, 1000);
        } else {
            showMessage(result.message, 'error');
        }
    }

    copyRecoveryCodes(btn) {
        if (!this.currentRecoveryCodes) return;
        navigator.clipboard.writeText(this.currentRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = __('btn_copied');
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }

    async regenerateRecoveryCodes(btn) {
        const input = document.querySelector('[data-ref="2fa_regenerate_password"]');
        if (!input) return;
        const pass = input.value;
        if (!pass) {
            showMessage(__('err_password_required'), 'error');
            return;
        }

        setButtonLoading(btn);
        const result = await this.api.post(ApiRoutes.Settings.RegenerateRecoveryCodes, { password: pass }, this.abortController.signal);
        
        if (result.aborted) return;
        
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            
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
            showMessage(result.message, 'error');
        }
    }

    copyNewRecoveryCodes(btn) {
        if (!this.newRecoveryCodes) return;
        navigator.clipboard.writeText(this.newRecoveryCodes).then(() => {
            const originalText = btn.textContent;
            btn.textContent = __('btn_copied');
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }
}

export { TwoFactorController };