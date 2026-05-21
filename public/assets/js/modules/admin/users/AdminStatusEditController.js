// public/assets/js/modules/admin/users/AdminStatusEditController.js
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';

class AdminStatusEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.initialState = null; 
        this.basePath = window.AppBasePath || '';

        this.abortController = null;
        this.calendarSystem = null; 
        
        this.state = {
            isSuspended: '0', 
            suspensionReason: '', 
            customSuspensionReason: '',
            suspendedType: 'temporary',
            suspensionDuration: '7',
            endDate: '',
            notifyUserSuspension: true
        };

        this.maps = {
            isSuspended: { '0': 'suspension_none', '1': 'suspension_active' },
            suspendedType: { 'temporary': 'suspension_temp', 'permanent': 'suspension_perm' },
            suspensionDuration: { '1': 'duration_1d', '3': 'duration_3d', '7': 'duration_7d', '14': 'duration_14d', '30': 'duration_30d', 'custom': 'suspension_custom_time' }
        };

        this.reasonDurations = {
            'reason_terms': 7, 'reason_fake_info': 30, 'reason_illegal': 30,
            'reason_fraud_use': 14, 'reason_abuse': 3, 'reason_prohibited_content': 7,
            'reason_ip_violation': 14, 'reason_spam_bot': 7, 'reason_security_breach': 30,
            'reason_unauthorized_commercial': 14, 'reason_other': 1 
        };

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleChangeBound = this.handleChange.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.calendarSystem = new CalendarSystem();
        this.calendarSystem.init();

        this.bindEvents();
        if (window.location.pathname.includes('/admin/edit-status')) {
            this.setupInitialState();
        }
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }

        if (this.calendarSystem) {
            this.calendarSystem.destroy();
            this.calendarSystem = null;
        }

        window.removeEventListener('viewLoaded', this.handleViewLoadedBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        document.removeEventListener('change', this.handleChangeBound);
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('change', this.handleChangeBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/admin/edit-status')) this.setupInitialState();
    }

    setupInitialState() {
        const viewContent = document.querySelector('.view-content[data-user-id]');
        if (!viewContent) return;

        this.targetUserId = viewContent.getAttribute('data-user-id');
        const initialStateData = viewContent.getAttribute('data-initial-state');

        if (initialStateData) {
            try {
                const parsedState = JSON.parse(initialStateData);
                this.state = Object.assign({}, this.state, parsedState);
                this.initialState = JSON.parse(JSON.stringify(this.state)); 
                
                const inpSuspCustom = document.querySelector('[data-ref="inp_custom_suspension_reason"]');
                const chkNotifySuspension = document.querySelector('[data-ref="chk_notify_user_suspension"]');

                if (inpSuspCustom) inpSuspCustom.value = this.state.customSuspensionReason || '';
                if (chkNotifySuspension) chkNotifySuspension.checked = this.state.notifyUserSuspension;

                // SOLUCIÓN: En la carga inicial, el servidor ya hizo el trabajo de textos (SSR).
                // No llamamos updateCalendarText() y pasamos false a syncVisuals() 
                // para que NO sobreescriba los textos pre-renderizados, evitando cualquier caché en JS.
                this.syncVisuals(false); 
                this.renderUI();
                this.checkForChanges();
            } catch (error) {
                console.error("Error al analizar el estado inicial desde el DOM:", error);
            }
        }
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/admin/edit-status')) return;

        const btnToggleModule = e.target.closest('[data-action="toggleModule"]');
        if (btnToggleModule && !btnToggleModule.classList.contains('disabled-interaction')) {
            const target = btnToggleModule.getAttribute('data-target');
            
            if (target === 'adminModuleCalendar' && this.calendarSystem) {
                this.calendarSystem.setup(
                    this.state.endDate,
                    (isoString, displayString) => {
                        this.state.endDate = isoString;
                        const textEl = document.querySelector('[data-ref="admin-endDate-text"]');
                        if (textEl) textEl.textContent = displayString;
                        this.checkForChanges(); 
                    },
                    () => {
                        this.state.endDate = '';
                        const textEl = document.querySelector('[data-ref="admin-endDate-text"]');
                        if (textEl) textEl.textContent = __('lbl_select_date_time');
                        this.checkForChanges(); 
                    }
                );
            }
        }

        const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
        if (btnSetDropdown) {
            const key = btnSetDropdown.getAttribute('data-key');
            const val = btnSetDropdown.getAttribute('data-value');
            this.state[key] = val;
            
            if (key === 'suspensionReason') {
                const recommended = this.reasonDurations[val] || 1;
                this.state.suspensionDuration = recommended.toString();
                this.calculateEndDateFromDuration(recommended);
            }
            if (key === 'suspensionDuration' && val !== 'custom') {
                this.calculateEndDateFromDuration(parseInt(val));
            }
            if (key === 'isSuspended' && val === '0') {
                this.state.suspensionReason = '';
            }

            const module = btnSetDropdown.closest('.component-module');
            if (module && window.appInstance) window.appInstance.closeModule(module);
            
            // Aquí sí pasamos (true implícito) porque el usuario acaba de interactuar
            this.syncVisuals();
            this.renderUI();
            this.checkForChanges(); 
        }

        const btnSubmitSuspension = e.target.closest('[data-action="submitSuspensionUpdate"]');
        if (btnSubmitSuspension) this.submitSuspensionUpdate(btnSubmitSuspension);
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/admin/edit-status')) return;
        
        const ref = e.target.getAttribute('data-ref');
        if (!ref) return;

        if (ref === 'inp_custom_suspension_reason') {
            this.state.customSuspensionReason = e.target.value;
            this.checkForChanges(); 
            this.renderUI();
        }
    }

    handleChange(e) {
        if (!window.location.pathname.includes('/admin/edit-status')) return;
        
        const ref = e.target.getAttribute('data-ref');
        if (ref === 'chk_notify_user_suspension') {
            this.state.notifyUserSuspension = e.target.checked;
            this.checkForChanges(); 
        }
    }

    calculateEndDateFromDuration(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        this.state.endDate = localISOTime;
        this.updateCalendarText();
    }

    updateCalendarText() {
        const textEl = document.querySelector('[data-ref="admin-endDate-text"]');
        if (!textEl) return;
        if (!this.state.endDate) {
            textEl.textContent = __('lbl_select_date_time');
            return;
        }
        const d = new Date(this.state.endDate);
        const monthsStr = [__('month_jan'), __('month_feb'), __('month_mar'), __('month_apr'), __('month_may'), __('month_jun'), __('month_jul'), __('month_aug'), __('month_sep'), __('month_oct'), __('month_nov'), __('month_dec')];
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        textEl.textContent = `${d.getDate()} ${__('lbl_of')} ${monthsStr[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
    }

    syncVisuals(updateText = true) {
        const syncLabel = (key) => {
            const val = this.state[key];
            
            // SOLUCIÓN: Solo actualizar el texto si se requiere explícitamente.
            if (updateText) {
                const el = document.querySelector(`[data-ref="admin-${key}-text"]`);
                if (el) {
                    if (key === 'suspensionReason') {
                        if (!val) el.textContent = __('lbl_select_suspension_reason');
                        else if (this.reasonDurations.hasOwnProperty(val)) el.textContent = __(val);
                        else el.textContent = val;
                    } else {
                        el.textContent = this.maps[key] && this.maps[key][val] ? __(this.maps[key][val]) : val;
                    }
                }
            }
            
            // Esto SÍ se ejecuta siempre para aplicar las clases "active" al menú HTML
            document.querySelectorAll(`[data-action="adminSetDropdown"][data-key="${key}"]`).forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === String(val));
            });
        };

        ['isSuspended', 'suspensionReason', 'suspendedType', 'suspensionDuration'].forEach(key => syncLabel(key));
    }

    renderUI() {
        const s = this.state;
        
        const secSuspReason = document.querySelector('[data-ref="section-suspended-reason"]');
        const secSuspCustom = document.querySelector('[data-ref="section-suspended-custom-reason"]');
        const secSuspType = document.querySelector('[data-ref="section-suspended-type"]');
        const secSuspDuration = document.querySelector('[data-ref="section-suspended-duration"]');
        const secSuspDate = document.querySelector('[data-ref="section-suspended-date"]');
        const secNotifyUserSuspension = document.querySelector('[data-ref="section-notify-user-suspension"]');

        [secSuspReason, secSuspCustom, secSuspType, secSuspDuration, secSuspDate, secNotifyUserSuspension].forEach(el => {
            if (el) el.classList.add('disabled');
        });

        if (s.isSuspended === '1') {
            if (secSuspReason) secSuspReason.classList.remove('disabled');
            if (s.suspensionReason !== '') {
                if (s.suspensionReason === 'reason_other' && secSuspCustom) secSuspCustom.classList.remove('disabled');
                if (secSuspType) secSuspType.classList.remove('disabled');
                
                if (s.suspendedType === 'temporary') {
                    if (secSuspDuration) secSuspDuration.classList.remove('disabled');
                    if (s.suspensionDuration === 'custom' && secSuspDate) secSuspDate.classList.remove('disabled');
                }
            }
            if (secNotifyUserSuspension) secNotifyUserSuspension.classList.remove('disabled');
        }
    }

    checkForChanges() {
        if (!this.initialState) return;

        let hasChanges = false;
        for (const key in this.state) {
            if (this.state[key] !== this.initialState[key]) {
                hasChanges = true;
                break;
            }
        }

        const btnSave = document.querySelector('[data-ref="admin-btn-save-suspension"]');
        if (hasChanges) {
            if (btnSave) btnSave.classList.remove('disabled-interaction');
        } else {
            if (btnSave) btnSave.classList.add('disabled-interaction');
        }
    }

    formatDateForDB(dateStr) {
        if (!dateStr) return null;
        return dateStr.replace('T', ' ') + ':00'; 
    }

    async submitSuspensionUpdate(btn) {
        if (this.state.isSuspended === '1') {
            if (!this.state.suspensionReason) {
                showMessage(__('err_select_suspension_reason'), 'error'); return;
            }
            if (this.state.suspensionReason === 'reason_other' && !this.state.customSuspensionReason.trim()) {
                showMessage(__('err_specify_suspension_reason'), 'error'); return;
            }
            if (this.state.suspendedType === 'temporary' && !this.state.endDate) {
                showMessage(__('err_select_end_date'), 'error'); return;
            }
        }

        const resultDialog = await window.dialogSystem.show('verifyPasswordDialog', {
            title: __('admin_verify_identity_title'),
            desc: __('admin_verify_identity_status_desc'),
            confirmText: __('tooltip_save_status')
        });

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['dialog_verify_password'] ? resultDialog.data['dialog_verify_password'].trim() : '';
        if (!password) { showMessage(__('err_admin_password_required'), 'error'); return; }

        setButtonLoading(btn);

        const payload = {
            target_user_id: this.targetUserId,
            is_suspended: this.state.isSuspended,
            suspension_type: this.state.isSuspended === '1' ? this.state.suspendedType : null,
            suspension_reason: this.state.isSuspended === '1' ? (this.state.suspensionReason === 'reason_other' ? this.state.customSuspensionReason : this.state.suspensionReason) : null,
            end_date: (this.state.isSuspended === '1' && this.state.suspendedType === 'temporary') ? this.formatDateForDB(this.state.endDate) : null,
            notify_user: this.state.notifyUserSuspension,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateSuspension, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success) {
            showMessage(result.message, 'success');
            this.initialState = JSON.parse(JSON.stringify(this.state));
            this.checkForChanges();
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { AdminStatusEditController };