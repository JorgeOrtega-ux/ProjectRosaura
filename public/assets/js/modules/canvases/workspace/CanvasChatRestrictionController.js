import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../../core/components/CalendarSystem.js';

class CanvasChatRestrictionController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        this.canvasId = null;
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
            endDate: ''
        };

        this.reasonDurations = {
            'reason_terms': 7, 'reason_fake_info': 30, 'reason_illegal': 30,
            'reason_fraud_use': 14, 'reason_abuse': 3, 'reason_prohibited_content': 7,
            'reason_ip_violation': 14, 'reason_spam_bot': 7, 'reason_security_breach': 30,
            'reason_unauthorized_commercial': 14, 'reason_other': 1 
        };

        this.defaultTexts = {
            suspensionReason: '',
            endDate: ''
        };

        this.handleViewLoadedBound = this.handleViewLoaded.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.calendarSystem = new CalendarSystem();
        this.calendarSystem.init();

        this.bindEvents();
        if (window.location.pathname.includes('/manage/chat-restriction')) {
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
    }

    bindEvents() {
        window.addEventListener('viewLoaded', this.handleViewLoadedBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleViewLoaded(e) {
        if (e.detail.url.includes('/manage/chat-restriction')) this.setupInitialState();
    }

    setupInitialState() {
        const viewContent = document.querySelector('.view-content[data-user-id]');
        if (!viewContent) return;

        this.targetUserId = viewContent.getAttribute('data-user-id');
        this.canvasId = viewContent.getAttribute('data-canvas-id');

        this.state = {
            isSuspended: viewContent.getAttribute('data-is-suspended') || '0',
            suspensionReason: viewContent.getAttribute('data-suspension-reason') || '',
            customSuspensionReason: viewContent.getAttribute('data-custom-suspension-reason') || '',
            suspendedType: viewContent.getAttribute('data-suspended-type') || 'temporary',
            suspensionDuration: viewContent.getAttribute('data-suspension-duration') || '7',
            endDate: viewContent.getAttribute('data-end-date') || ''
        };
        this.initialState = Object.assign({}, this.state);

        const inpSuspCustom = document.querySelector('[data-ref="inp_custom_suspension_reason"]');
        if (inpSuspCustom) inpSuspCustom.value = this.state.customSuspensionReason || '';

        const reasonEl = document.querySelector('[data-ref="admin-suspensionReason-text"]');
        if (reasonEl) this.defaultTexts.suspensionReason = reasonEl.textContent.trim();
        
        const dateEl = document.querySelector('[data-ref="admin-endDate-text"]');
        if (dateEl) this.defaultTexts.endDate = dateEl.textContent.trim();

        this.syncVisuals(false); 
        this.renderUI();
        this.checkForChanges();
    }

    handleClick(e) {
        if (!window.location.pathname.includes('/manage/chat-restriction')) return;

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
                        if (textEl) textEl.textContent = this.defaultTexts.endDate;
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
            
            this.syncVisuals(true);
            this.renderUI();
            this.checkForChanges(); 
        }

        const btnSubmitSuspension = e.target.closest('[data-action="submitSuspensionUpdate"]');
        if (btnSubmitSuspension) this.submitSuspensionUpdate(btnSubmitSuspension);
    }

    handleInput(e) {
        if (!window.location.pathname.includes('/manage/chat-restriction')) return;
        
        const ref = e.target.getAttribute('data-ref');
        if (!ref) return;

        if (ref === 'inp_custom_suspension_reason') {
            this.state.customSuspensionReason = e.target.value;
            this.checkForChanges(); 
            this.renderUI();
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
            textEl.textContent = this.defaultTexts.endDate;
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
            const val = String(this.state[key]);
            let selectedText = '';
            
            document.querySelectorAll(`[data-action="adminSetDropdown"][data-key="${key}"]`).forEach(item => {
                const isMatch = item.getAttribute('data-value') === val;
                item.classList.toggle('active', isMatch);
                
                if (isMatch) {
                    const textNode = item.querySelector('.component-menu-link-text');
                    if (textNode) {
                        selectedText = textNode.textContent.trim();
                    }
                }
            });

            if (updateText) {
                const el = document.querySelector(`[data-ref="admin-${key}-text"]`);
                if (el) {
                    if (selectedText) {
                        el.textContent = selectedText;
                    } else if (key === 'suspensionReason') {
                        if (!val) {
                            el.textContent = this.defaultTexts.suspensionReason;
                        } else {
                            el.textContent = val;
                        }
                    }
                }
            }
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

        [secSuspReason, secSuspCustom, secSuspType, secSuspDuration, secSuspDate].forEach(el => {
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
                showMessage(typeof window.__ === 'function' ? window.__('err_select_suspension_reason') : 'Debes seleccionar una razón', 'error'); return;
            }
            if (this.state.suspensionReason === 'reason_other' && !this.state.customSuspensionReason.trim()) {
                showMessage(typeof window.__ === 'function' ? window.__('err_specify_suspension_reason') : 'Debes especificar el motivo', 'error'); return;
            }
            if (this.state.suspendedType === 'temporary' && !this.state.endDate) {
                showMessage(typeof window.__ === 'function' ? window.__('err_select_end_date') : 'Debes seleccionar una fecha', 'error'); return;
            }
        }

        const resultDialog = await window.dialogSystem.show('verifyPasswordUpdateStatus');

        if (!resultDialog.confirmed) return;

        const password = resultDialog.data['modal_verify_password'] ? resultDialog.data['modal_verify_password'].trim() : '';
        if (!password) { showMessage(typeof window.__ === 'function' ? window.__('err_admin_password_required') : 'Debes ingresar tu contraseña', 'error'); return; }

        setButtonLoading(btn);

        const payload = {
            canvas_id: this.canvasId,
            target_user_id: this.targetUserId,
            is_suspended: this.state.isSuspended,
            suspension_type: this.state.isSuspended === '1' ? this.state.suspendedType : null,
            suspension_reason: this.state.isSuspended === '1' ? (this.state.suspensionReason === 'reason_other' ? this.state.customSuspensionReason : this.state.suspensionReason) : null,
            end_date: (this.state.isSuspended === '1' && this.state.suspendedType === 'temporary') ? this.formatDateForDB(this.state.endDate) : null,
            password: password
        };

        const result = await this.api.post(ApiRoutes.Canvases.UpdateChatRestriction, payload, this.abortController.signal);
        
        if (result.aborted) return;
        restoreButton(btn);

        if (result.success || result.status === 'success') {
            showMessage(result.message, 'success');
            this.initialState = JSON.parse(JSON.stringify(this.state));
            this.checkForChanges();
        } else {
            showMessage(result.message, 'error');
        }
    }
}

export { CanvasChatRestrictionController };
