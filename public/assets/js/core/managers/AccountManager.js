import { ApiService } from '../api/ApiServices.js';
import { ApiRoutes } from '../api/ApiRoutes.js';
import { setButtonLoading, restoreButton, showMessage } from '../utils/uiUtils.js';

/**
 * AccountManager — Gestiona autenticación: logout, switch de cuenta, join canvas.
 * Extrae estas responsabilidades de MainController.
 */
export class AccountManager {
    constructor(showToastFn) {
        this.api = new ApiService();
        this.showToast = showToastFn;
        this.logoutAbortController = null;
    }

    destroy() {
        if (this.logoutAbortController) this.logoutAbortController.abort();
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    async handleLogout(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return;
        logoutBtn.dataset.loading = 'true';

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        if (this.logoutAbortController) this.logoutAbortController.abort();
        this.logoutAbortController = new AbortController();

        const result = await this.api.post(ApiRoutes.Auth.Logout, {}, this.logoutAbortController.signal);

        if (result && result.aborted) return;

        if (result.success) {
            const basePath = window.AppBasePath || '';
            window.location.href = basePath + '/';
        } else {
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
        }
    }

    async handleLogoutAll(logoutBtn) {
        if (logoutBtn.dataset.loading === 'true') return;
        logoutBtn.dataset.loading = 'true';

        const spinnerDiv = document.createElement('div');
        spinnerDiv.className = 'component-menu-link-icon';
        spinnerDiv.innerHTML = '<div class="component-spinner"></div>';
        logoutBtn.appendChild(spinnerDiv);

        if (this.logoutAbortController) this.logoutAbortController.abort();
        this.logoutAbortController = new AbortController();

        const result = await this.api.post(ApiRoutes.Auth.LogoutAll, {}, this.logoutAbortController.signal);

        if (result && result.aborted) return;

        if (result.success) {
            const basePath = window.AppBasePath || '';
            window.location.href = basePath + '/login';
        } else {
            spinnerDiv.remove();
            logoutBtn.dataset.loading = 'false';
            this.showToast(result.message, 'error');
        }
    }

    // ─── Switch de cuenta ─────────────────────────────────────────────────────

    async handleSwitchAccount(accountId, btnElement) {
        if (!accountId) return;
        if (btnElement && btnElement.dataset.loading === 'true') return;

        if (btnElement) {
            btnElement.dataset.loading = 'true';
            btnElement.classList.add('disabled-interaction');
            btnElement.style.pointerEvents = 'none';
        }

        const result = await this.api.post(ApiRoutes.Auth.SwitchAccount, { user_id: accountId });

        if (result && result.aborted) {
            if (btnElement) {
                btnElement.dataset.loading = 'false';
                btnElement.classList.remove('disabled-interaction');
                btnElement.style.pointerEvents = '';
            }
            return;
        }

        if (result.success) {
            window.location.reload();
        } else {
            if (btnElement) {
                btnElement.dataset.loading = 'false';
                btnElement.classList.remove('disabled-interaction');
                btnElement.style.pointerEvents = '';
            }
            this.showToast(result.message, 'error');
        }
    }

    // ─── Join canvas ──────────────────────────────────────────────────────────

    async handleOpenJoinCanvasModal(btn) {
        if (btn.classList.contains('disabled-interaction')) return;

        const dialog = await window.modalSystem.show('joinCanvasModal');
        if (dialog.confirmed) {
            const code = dialog.data['canvas-join-code-modal'];
            if (!code || code.trim().length < 5) {
                showMessage(window.__('err_invalid_code') || 'Código no válido', 'error');
                return;
            }

            setButtonLoading(btn);

            try {
                const response = await this.api.post(ApiRoutes.Canvases.JoinViaInvite, {
                    code: code.trim(),
                    terms_accepted: true
                });

                if (response && response.success) {
                    showMessage(response.message || window.__('msg_joined_successfully') || 'Te has unido con éxito.', 'success');
                    const uuid = response.data?.uuid;
                    setTimeout(() => {
                        const basePath = window.AppBasePath || '';
                        window.location.href = `${basePath}/canvases/edit/${uuid}`;
                    }, 1000);
                } else {
                    restoreButton(btn);
                    showMessage(response?.message || window.__('err_validate_code') || 'Código de invitación no válido.', 'error');
                }
            } catch (error) {
                restoreButton(btn);
                showMessage(window.__('err_connection') || 'Error de conexión', 'error');
            }
        }
    }
}
