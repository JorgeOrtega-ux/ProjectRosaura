import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';

class CanvasInvitesGenerateController {
    constructor() {
        this.api = new ApiService();
        this.isInitialized = false;
        this.calendar = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.wrapper = document.querySelector('[data-ref="manage-invites-generate-wrapper"]');
        if (this.wrapper) {
            this.canvasId = this.wrapper.dataset.canvasId;
            this.canvasUuid = this.wrapper.dataset.canvasUuid;
            this.form = document.getElementById('form-generate-invite');
            
            this.calendar = new CalendarSystem('.view-content[data-ref="manage-invites-generate-wrapper"]');
            this.calendar.init();
            this.calendar.setup(null, (iso, display) => {
                this.wrapper.querySelector('[data-ref="hidden-expires-at"]').value = iso;
                this.wrapper.querySelector('[data-ref="invite-endDate-text"]').textContent = display;
            }, () => {
                this.wrapper.querySelector('[data-ref="hidden-expires-at"]').value = '';
                this.wrapper.querySelector('[data-ref="invite-endDate-text"]').textContent = 'Sin caducidad';
            });
        }
        
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    destroy() {
        document.removeEventListener('click', this.handleGlobalClickBound);
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
        this.isInitialized = false;
    }

    handleGlobalClick(e) {
        if (!this.wrapper) return;

        const btnSubmit = e.target.closest('[data-action="submitGenerateInvite"]');
        const btnRole = e.target.closest('[data-action="selectInviteRole"]');
        const btnAdjustMax = e.target.closest('[data-action="adjustMaxUses"]');

        if (btnSubmit) {
            e.preventDefault();
            this.generateInvite();
            return;
        }

        if (btnRole) {
            e.preventDefault();
            if (btnRole.classList.contains('disabled') || btnRole.classList.contains('disabled-interaction')) {
                return;
            }
            
            const val = btnRole.dataset.value;
            const label = btnRole.dataset.label;
            const icon = btnRole.dataset.icon;
            
            this.wrapper.querySelector('[data-ref="hidden-role-id"]').value = val;
            this.wrapper.querySelector('[data-ref="text-role"]').textContent = label;
            this.wrapper.querySelector('[data-ref="icon-role"]').textContent = icon;
            
            const menu = btnRole.closest('.component-menu-list');
            if (menu) {
                menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
                btnRole.classList.add('active');
            }
            
            if (window.appInstance) {
                window.appInstance.closeModule(btnRole.closest('.component-module'));
            }
            return;
        }

        if (btnAdjustMax) {
            e.preventDefault();
            const step = parseInt(btnAdjustMax.dataset.step) || 0;
            const min = parseInt(btnAdjustMax.dataset.min) || 0;
            const max = parseInt(btnAdjustMax.dataset.max) || 999;
            
            const hiddenInput = this.wrapper.querySelector('[data-ref="hidden-max-uses"]');
            const valDisplay = this.wrapper.querySelector('[data-ref="val_max_uses"]');
            
            let current = parseInt(hiddenInput.value) || 0;
            current += step;
            
            if (current < min) current = min;
            if (current > max) current = max;
            
            hiddenInput.value = current === 0 ? '' : current;
            valDisplay.textContent = current === 0 ? 'Sin límite' : current;
            return;
        }
    }

    async generateInvite() {
        if (!this.form || !this.canvasId) return;

        const data = {
            canvas_id: this.canvasId,
            role: this.wrapper.querySelector('[data-ref="hidden-role-id"]').value,
            max_uses: this.wrapper.querySelector('[data-ref="hidden-max-uses"]').value || null,
            expires_at: this.wrapper.querySelector('[data-ref="hidden-expires-at"]').value || null
        };
        
        if (data.expires_at) {
            const dt = new Date(data.expires_at);
            data.expires_at = dt.toISOString().slice(0, 19).replace('T', ' ');
        }

        if (!data.role) {
            showMessage(__('err_select_role'), 'error');
            return;
        }

        const btnSubmit = document.querySelector('[data-action="submitGenerateInvite"]');
        if (btnSubmit) setButtonLoading(btnSubmit);

        try {
            const response = await this.api.post('canvases.generate_invite', data);
            
            if (response && response.success) {
                showMessage(response.message || __('msg_invite_generated'), 'success');
                
                if (window.spaRouter) {
                    window.spaRouter.navigate(`${window.AppBasePath || ''}/canvases/manage/invites/${this.canvasUuid}`);
                } else {
                    window.location.href = `${window.AppBasePath || ''}/canvases/manage/invites/${this.canvasUuid}`;
                }
            } else {
                showMessage(response?.message || __('err_generate_invite'), 'error');
                if (btnSubmit) restoreButton(btnSubmit);
            }
        } catch (error) {
            
            showMessage(__('err_connection'), 'error');
            if (btnSubmit) restoreButton(btnSubmit);
        }
    }
}

export { CanvasInvitesGenerateController };
