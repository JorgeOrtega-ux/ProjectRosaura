import { ModalTemplates } from './ModalTemplates.js';
import { CalendarSystem } from './CalendarSystem.js';
import { getEventCoords, hexToHsv, hsvToHex, restoreButton, setButtonLoading, showMessage, initCarouselScroll } from '../utils/uiUtils.js';
import { ApiService } from '../api/ApiService.js';
import { ApiRoutes } from '../api/ApiRoutes.js';

export class ModalSystem {
    constructor() {
        this.templates = ModalTemplates;

        this.activeResolveFn = null;
        this.activeWrapper = null;
        this.activeOverlay = null;
        this.activeBox = null;
        this.calendarSystem = null;
        this.modalStack = [];
        this.activeOnConfirm = null;
        this.activeAsyncConfirm = false;

        this.dragState = { startY: 0, currentDiff: 0, isDragging: false };
        this.colorPickerDrag = null;
        this.activeColorPicker = null;

        this.handleClickBound = this.handleClick.bind(this);
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        
        this.initialized = false;

        this.init();
    }

    registerTemplate(name, template) {
        this.templates[name] = template;
    }

    registerTemplates(templates) {
        Object.assign(this.templates, templates);
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('pointerdown', this.handlePointerDownBound);
        document.addEventListener('pointermove', this.handlePointerMoveBound);
        document.addEventListener('pointerup', this.handlePointerUpBound);
        document.addEventListener('pointercancel', this.handlePointerUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('input', this.handleInputBound);
    }

    destroy() {
        this.closeCurrent(false);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('pointerdown', this.handlePointerDownBound);
        document.removeEventListener('pointermove', this.handlePointerMoveBound);
        document.removeEventListener('pointerup', this.handlePointerUpBound);
        document.removeEventListener('pointercancel', this.handlePointerUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('input', this.handleInputBound);
        document.body.classList.remove('modal-open');
        
        const container = document.querySelector('.modal-container[data-type="modal"]');
        if (container) container.remove();
        this.initialized = false;
    }

    _getContainer() {
        let container = document.querySelector('.modal-container[data-type="modal"]');
        if (!container) {
            container = document.createElement('div');
            container.className = 'modal-container';
            container.setAttribute('data-type', 'modal');
            document.body.appendChild(container);
        }
        return container;
    }

    show(templateName, data = {}) {
        
        if (!this.initialized) {
            this.init();
        }

        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                
                resolve({ confirmed: false, data: {} });
                return;
            }

            if (this.activeTemplateName === templateName) {
                this.closeCurrent(false);
                resolve({ confirmed: false, data: {} });
                return;
            }

            if (this.activeOverlay || this.activeBox) {
                if (!this.modalStack) this.modalStack = [];
                if (this.activeOverlay) this.activeOverlay.classList.add('disabled');
                this.modalStack.push({
                    templateName: this.activeTemplateName,
                    resolveFn: this.activeResolveFn,
                    overlay: this.activeOverlay,
                    wrapper: this.activeWrapper,
                    box: this.activeBox,
                    calendarSystem: this.calendarSystem,
                    dragState: Object.assign({}, this.dragState),
                    onConfirm: this.activeOnConfirm,
                    asyncConfirm: this.activeAsyncConfirm
                });
                this.activeResolveFn = null;
                this.activeOverlay = null;
                this.activeWrapper = null;
                this.activeBox = null;
                this.calendarSystem = null;
                this.activeOnConfirm = null;
                this.activeAsyncConfirm = false;
            }

            const template = this.templates[templateName];
            this.activeTemplateName = templateName;
            this.activeOnConfirm = data.onConfirm || null;
            this.activeAsyncConfirm = !!(template.asyncConfirm || data.asyncConfirm || this.activeOnConfirm);

            const container = this._getContainer();

            this.activeOverlay = document.createElement('div');
            this.activeOverlay.className = 'component-modal-overlay';
            
            this.activeWrapper = document.createElement('div');
            this.activeWrapper.className = 'component-modal-wrapper';
            
            this.activeBox = document.createElement('div');
            this.activeBox.className = 'component-modal-box';

            if (template.fullScreen) {
                this.activeOverlay.classList.add('component-modal-overlay--fullscreen');
                this.activeWrapper.classList.add('component-modal-wrapper--fullscreen');
                this.activeBox.classList.add('component-modal-box--fullscreen');
            }

            if (template.noPadding) {
                this.activeBox.classList.add('component-modal-box--no-padding');
            }

            if (template.medium) {
                this.activeBox.classList.add('component-modal-box--medium');
            }

            if (template.imageViewer || templateName === 'imageViewer') {
                this.activeBox.classList.add('component-modal-box--image-viewer');
            }

            const buildFn = typeof template.build === 'function' ? template.build : (typeof template.template === 'function' ? template.template : null);
            if (!buildFn) {
                throw new Error(`Modal template '${templateName}' does not provide a build or template function.`);
            }
            this.activeBox.innerHTML = buildFn(data);

            if (template.imageViewer || templateName === 'imageViewer') {
                const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
                if (root && data && data.images) {
                    root._images = Array.isArray(data.images) ? data.images : [data.images];
                }
                const carouselWrap = this.activeBox.querySelector('[data-ref="iv-carousel-wrapper"]');
                if (carouselWrap) {
                    initCarouselScroll(carouselWrap);
                }
            }
            
            this.activeWrapper.appendChild(this.activeBox);

            if (!template.fullScreen && !template.hideCloseBtn) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'component-modal-close-btn';
                closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
                this.activeWrapper.appendChild(closeBtn);
            }

            this.activeOverlay.appendChild(this.activeWrapper);
            container.appendChild(this.activeOverlay);

            // Force layout reflow so initial state (translateY 100%, opacity 0) is registered
            void this.activeOverlay.offsetHeight;

            requestAnimationFrame(() => {
                if (this.activeOverlay) {
                    this.activeOverlay.classList.add('active');
                    document.body.classList.add('modal-open');
                }
            });

            this.activeResolveFn = resolve;
        });
    }






    handleKeyDown(e) {
        if (!this.activeBox) return;

        if (e.key === 'Enter') {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.tagName === 'TEXTAREA') return;

            if (this.activeBox) {
                const confirmBtn = this.activeBox.querySelector(
                    'button[data-modal-action="confirm"], ' +
                    'button[data-modal-action="confirm_dynamic_form"], ' +
                    'button[data-modal-action="finish"], ' +
                    'button[data-action="confirm"], ' +
                    'button[data-action="submitJoinLive"], ' +
                    'button[data-action="submitRoleModal"], ' +
                    '#btn_confirm_custom_backup'
                );

                if (confirmBtn && !confirmBtn.disabled && !confirmBtn.classList.contains('disabled') && !confirmBtn.classList.contains('disabled-interaction')) {
                    e.preventDefault();
                    confirmBtn.click();
                }
            }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            if (this.activeTemplateName === 'imageViewer' && this.activeBox) {
                const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
                if (root) {
                    const currentIdx = parseInt(root.getAttribute('data-current-index') || '0', 10);
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        this._updateImageViewer(root, currentIdx - 1);
                        return;
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        this._updateImageViewer(root, currentIdx + 1);
                        return;
                    }
                }
            }
        } else if (e.key === 'Escape') {
            const activeConfirmBtn = this.activeBox ? this.activeBox.querySelector(
                'button[data-modal-action="confirm"], ' +
                'button[data-modal-action="confirm_dynamic_form"], ' +
                'button[data-modal-action="finish"], ' +
                'button[data-action="confirm"], ' +
                'button[data-action="submitJoinLive"], ' +
                'button[data-action="submitRoleModal"], ' +
                '#btn_confirm_custom_backup'
            ) : null;
            const isCurrentlyLoading = activeConfirmBtn && activeConfirmBtn.classList.contains('disabled-interaction');
            if (isCurrentlyLoading) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            this.closeCurrent(false);
        }
    }

    handleClick(e) {
        if (!this.activeBox) return; 

        const activeConfirmBtn = this.activeBox ? this.activeBox.querySelector(
            'button[data-modal-action="confirm"], ' +
            'button[data-modal-action="confirm_dynamic_form"], ' +
            'button[data-modal-action="finish"], ' +
            'button[data-action="confirm"], ' +
            'button[data-action="submitJoinLive"], ' +
            'button[data-action="submitRoleModal"], ' +
            '#btn_confirm_custom_backup'
        ) : null;
        const isCurrentlyLoading = activeConfirmBtn && activeConfirmBtn.classList.contains('disabled-interaction');
        if (isCurrentlyLoading) {
            const closeBtn = e.target.closest('.component-modal-close-btn');
            const actionBtn = e.target.closest('[data-modal-action], [data-action="confirm"], [data-action="cancel"], #btn_confirm_custom_backup');
            if (closeBtn || (actionBtn && actionBtn.getAttribute('data-modal-action') === 'cancel') || e.target === this.activeOverlay || e.target === this.activeWrapper) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        const closeBtn = e.target.closest('.component-modal-close-btn');
        if (closeBtn) {
            this.closeCurrent(false);
            return;
        }

        const ivPrevBtn = e.target.closest('[data-modal-action="prevImageViewer"]');
        if (ivPrevBtn && this.activeBox) {
            e.preventDefault();
            const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
            if (root) {
                const currentIdx = parseInt(root.getAttribute('data-current-index') || '0', 10);
                this._updateImageViewer(root, currentIdx - 1);
            }
            return;
        }

        const ivNextBtn = e.target.closest('[data-modal-action="nextImageViewer"]');
        if (ivNextBtn && this.activeBox) {
            e.preventDefault();
            const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
            if (root) {
                const currentIdx = parseInt(root.getAttribute('data-current-index') || '0', 10);
                this._updateImageViewer(root, currentIdx + 1);
            }
            return;
        }

        const ivThumbBtn = e.target.closest('[data-modal-action="selectImageViewerIndex"]');
        if (ivThumbBtn && this.activeBox) {
            e.preventDefault();
            const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
            const targetIdx = parseInt(ivThumbBtn.getAttribute('data-index') || '0', 10);
            if (root) {
                this._updateImageViewer(root, targetIdx);
            }
            return;
        }

        const ivDownloadBtn = e.target.closest('[data-modal-action="downloadImageViewer"]');
        if (ivDownloadBtn && this.activeBox) {
            e.preventDefault();
            const root = this.activeBox.querySelector('[data-ref="modal-image-viewer-root"]');
            this._downloadImageViewerImage(root, ivDownloadBtn);
            return;
        }

        const btnAdjustHours = e.target.closest('[data-action="adjustCalendarHours"]');
        if (btnAdjustHours) {
            e.preventDefault();
            const step = parseInt(btnAdjustHours.getAttribute('data-step')) || 0;
            const centerEl = this.activeBox.querySelector('[data-ref="calendar-modal-hours-val"]');
            if (centerEl) {
                let val = parseInt(centerEl.getAttribute('data-value')) || 0;
                val = (val + step) % 24;
                if (val < 0) val += 24;
                centerEl.setAttribute('data-value', val);
                centerEl.textContent = String(val).padStart(2, '0');
            }
            return;
        }

        const btnAdjustMinutes = e.target.closest('[data-action="adjustCalendarMinutes"]');
        if (btnAdjustMinutes) {
            e.preventDefault();
            const step = parseInt(btnAdjustMinutes.getAttribute('data-step')) || 0;
            const centerEl = this.activeBox.querySelector('[data-ref="calendar-modal-minutes-val"]');
            if (centerEl) {
                let val = parseInt(centerEl.getAttribute('data-value')) || 0;
                val = (val + step) % 60;
                if (val < 0) val += 60;
                centerEl.setAttribute('data-value', val);
                centerEl.textContent = String(val).padStart(2, '0');
            }
            return;
        }

        const toggleModuleBtn = e.target.closest('[data-action="toggleModule"]');
        if (toggleModuleBtn) {
            const target = toggleModuleBtn.getAttribute('data-target');

            if (target === 'modalCalendarDateOnly' && this.activeBox) {
                // Guard: si es sanción permanente, no abrir el calendario
                const typeTrigger = this.activeBox.querySelector('[data-ref="suspension_type"]');
                if (typeTrigger && typeTrigger.getAttribute('data-value') === 'permanent') {
                    return;
                }

                if (!this.calendarSystem) {
                    this.calendarSystem = new CalendarSystem(this.activeBox);
                    this.calendarSystem.disablePastDates = true;
                    this.calendarSystem.init();
                }
                const trigger = this.activeBox.querySelector('[data-target="modalCalendarDateOnly"]');
                const initialVal = trigger ? trigger.getAttribute('data-value') : '';
                this.calendarSystem.setup(
                    initialVal,
                    (isoString, displayString) => {
                        if (trigger) trigger.setAttribute('data-value', isoString);
                        const textEl = this.activeBox.querySelector('[data-ref="modal-calendar-date-text"]');
                        if (textEl) {
                            textEl.textContent = displayString.split(',')[0];
                        }
                    },
                    () => {
                        if (trigger) trigger.setAttribute('data-value', '');
                        const textEl = this.activeBox.querySelector('[data-ref="modal-calendar-date-text"]');
                        if (textEl) textEl.textContent = typeof window.__ === 'function' ? window.__('lbl_select_date') : 'Seleccionar fecha';
                    }
                );
            }
        }

        const stepTargetBtn = e.target.closest('[data-step-target]');
        if (stepTargetBtn) {
            const targetStepId = stepTargetBtn.getAttribute('data-step-target');
            const stepContainer = stepTargetBtn.closest('.step-modal-content') || (this.activeBox ? this.activeBox.querySelector('.step-modal-content') : document);
            if (stepContainer) {
                stepContainer.querySelectorAll('.step-modal-step').forEach(step => step.classList.remove('active'));
                const targetStep = stepContainer.querySelector(`#${targetStepId}`);
                if (targetStep) targetStep.classList.add('active');
            }
            return;
        }

        // ── Sanction modal step navigation ─────────────────────────────────────
        const sanctionNextBtn = e.target.closest('[data-action="sanctionNextStep"]');
        if (sanctionNextBtn && this.activeBox) {
            // Guard: no abrir el paso de fecha si la sanción es permanente
            const typeTrigger = this.activeBox.querySelector('[data-ref="suspension_type"]');
            if (typeTrigger && typeTrigger.getAttribute('data-value') === 'permanent') return;

            this._setSanctionStep(2);

            // Inicializar el CalendarSystem inline (lazy, una sola vez por apertura)
            if (!this.calendarSystem) {
                this.calendarSystem = new CalendarSystem(this.activeBox);
                this.calendarSystem.disablePastDates = true;
                this.calendarSystem.init();
            }
            const initialVal = sanctionNextBtn.getAttribute('data-value') || '';
            this.calendarSystem.setup(initialVal, null, null);
            return;
        }

        const sanctionPrevBtn = e.target.closest('[data-action="sanctionPrevStep"]');
        if (sanctionPrevBtn && this.activeBox) {
            this._setSanctionStep(1);
            return;
        }

        const sanctionConfirmBtn = e.target.closest('[data-action="sanctionConfirmDate"]');
        if (sanctionConfirmBtn && this.activeBox) {
            if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                if (window.showMessage) showMessage(__('err_select_day') || 'Selecciona un día', 'error');
                return;
            }
            const step2 = this.activeBox.querySelector('.step-modal-step[data-step="2"]');
            const hoursEl   = step2 ? step2.querySelector('[data-ref="calendar-modal-hours-val"]')   : null;
            const minutesEl = step2 ? step2.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
            const h = hoursEl   ? String(parseInt(hoursEl.getAttribute('data-value')   || '0')).padStart(2, '0') : '00';
            const m = minutesEl ? String(parseInt(minutesEl.getAttribute('data-value') || '0')).padStart(2, '0') : '00';

            const d   = this.calendarSystem.selectedDate;
            const y   = d.getFullYear();
            const mo  = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const isoString = `${y}-${mo}-${day}T${h}:${m}`;
            const displayString = this.calendarSystem.getFormattedDisplayDate
                ? this.calendarSystem.getFormattedDisplayDate(d, h, m).split(',')[0]
                : `${day}/${mo}/${y}`;

            const endDateTrigger = this.activeBox.querySelector('[data-ref="end_date"]');
            if (endDateTrigger) endDateTrigger.setAttribute('data-value', isoString);
            const textEl = this.activeBox.querySelector('[data-ref="sanction-endDate-text"]');
            if (textEl) textEl.textContent = displayString;

            this._setSanctionStep(1);
            return;
        }
        // ── /Sanction modal step navigation ────────────────────────────────────

        // ── calendarModal step navigation ───────────────────────────────────────
        const calModalNextBtn = e.target.closest('[data-action="calendarModalNextStep"]');
        if (calModalNextBtn && this.activeBox) {
            this._setCalendarModalStep(2);
            if (!this.calendarSystem) {
                this.calendarSystem = new CalendarSystem(this.activeBox);
                this.calendarSystem.disablePastDates = true;
                this.calendarSystem.init();
            }
            const initialVal = calModalNextBtn.getAttribute('data-value') || '';
            this.calendarSystem.setup(initialVal, null, null);
            // Pre-seleccionar la fecha inicial para que Aceptar funcione sin re-clickar el día
            if (initialVal) {
                const datePart = initialVal.split('T')[0];
                const parts = datePart.split('-');
                if (parts.length === 3) {
                    this.calendarSystem.selectedDate = new Date(
                        parseInt(parts[0], 10),
                        parseInt(parts[1], 10) - 1,
                        parseInt(parts[2], 10)
                    );
                }
            }
            return;
        }

        const calModalPrevBtn = e.target.closest('[data-action="calendarModalPrevStep"]');
        if (calModalPrevBtn && this.activeBox) {
            this._setCalendarModalStep(1);
            return;
        }
        // ── /calendarModal step navigation ──────────────────────────────────────

        // ── Invite modal step navigation ─────────────────────────────────────────
        const inviteNextBtn = e.target.closest('[data-action="inviteNextStep"]');
        if (inviteNextBtn && this.activeBox) {
            this._setInviteStep(2);

            if (!this.calendarSystem) {
                this.calendarSystem = new CalendarSystem(this.activeBox);
                this.calendarSystem.disablePastDates = true;
                this.calendarSystem.init();
            }
            const initialVal = inviteNextBtn.getAttribute('data-value') || '';
            this.calendarSystem.setup(initialVal, null, null);
            if (initialVal) {
                const datePart = initialVal.split('T')[0];
                const parts = datePart.split('-');
                if (parts.length === 3) {
                    this.calendarSystem.selectedDate = new Date(
                        parseInt(parts[0], 10),
                        parseInt(parts[1], 10) - 1,
                        parseInt(parts[2], 10)
                    );
                }
            }
            return;
        }

        const invitePrevBtn = e.target.closest('[data-action="invitePrevStep"]');
        if (invitePrevBtn && this.activeBox) {
            this._setInviteStep(1);
            return;
        }

        const inviteClearDateBtn = e.target.closest('[data-action="inviteClearDate"]');
        if (inviteClearDateBtn && this.activeBox) {
            if (this.calendarSystem) {
                this.calendarSystem.selectedDate = null;
            }
            const endDateTrigger = this.activeBox.querySelector('[data-ref="invite_expires_at"]');
            if (endDateTrigger) endDateTrigger.setAttribute('data-value', '');
            const textEl = this.activeBox.querySelector('[data-ref="invite-endDate-text"]');
            const __ = typeof window.__ === 'function' ? window.__ : k => k;
            if (textEl) textEl.textContent = __('lbl_no_expiration');

            this._setInviteStep(1);
            return;
        }

        const inviteConfirmBtn = e.target.closest('[data-action="inviteConfirmDate"]');
        if (inviteConfirmBtn && this.activeBox) {
            if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                if (window.showMessage) showMessage(__('err_select_day') || 'Selecciona un día', 'error');
                return;
            }
            const step2 = this.activeBox.querySelector('.step-modal-step[data-step="2"]');
            const hoursEl   = step2 ? step2.querySelector('[data-ref="calendar-modal-hours-val"]')   : null;
            const minutesEl = step2 ? step2.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
            const h = hoursEl   ? String(parseInt(hoursEl.getAttribute('data-value')   || '0')).padStart(2, '0') : '00';
            const m = minutesEl ? String(parseInt(minutesEl.getAttribute('data-value') || '0')).padStart(2, '0') : '00';

            const d   = this.calendarSystem.selectedDate;
            const y   = d.getFullYear();
            const mo  = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            const selectedDateTime = new Date(y, d.getMonth(), parseInt(day, 10), parseInt(h, 10), parseInt(m, 10));
            const now = new Date();
            const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
            if (selectedDateTime < minFuture) {
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                if (window.showMessage) showMessage(__('err_date_minimum_5_minutes') || 'La fecha programada debe tener un margen mínimo de 5 minutos al futuro.', 'error');
                return;
            }

            const isoString = `${y}-${mo}-${day}T${h}:${m}`;
            const displayString = this.calendarSystem.getFormattedDisplayDate
                ? this.calendarSystem.getFormattedDisplayDate(d, h, m)
                : `${day}/${mo}/${y} ${h}:${m}`;

            const endDateTrigger = this.activeBox.querySelector('[data-ref="invite_expires_at"]');
            if (endDateTrigger) endDateTrigger.setAttribute('data-value', isoString);
            const textEl = this.activeBox.querySelector('[data-ref="invite-endDate-text"]');
            if (textEl) textEl.textContent = displayString;

            this._setInviteStep(1);
            return;
        }
        // ── /Invite modal step navigation ────────────────────────────────────

        const selectReasonBtn = e.target.closest('[data-action="selectReportReason"]');
        if (selectReasonBtn) {
            const val = selectReasonBtn.getAttribute('data-value');
            const icon = selectReasonBtn.getAttribute('data-icon');
            const text = selectReasonBtn.getAttribute('data-text');
            const modal = this.activeBox;
            if (modal) {
                const inputs = modal.querySelectorAll('#report_reason, #report_reason_input, [data-ref="report_reason"]');
                inputs.forEach(inp => {
                    inp.value = val;
                    inp.setAttribute('data-value', val);
                });
                
                const triggerText = modal.querySelector('[data-ref="report_trigger_text"]');
                if (triggerText) triggerText.textContent = text;
                
                const triggerIcon = modal.querySelector('[data-ref="report_trigger_icon"]');
                if (triggerIcon) triggerIcon.textContent = icon;
                
                const otherGroup = modal.querySelector('#report_other_group');
                if (otherGroup) {
                    if (val === 'other') {
                        otherGroup.classList.remove('disabled');
                    } else {
                        otherGroup.classList.add('disabled');
                    }
                }
                
                modal.querySelectorAll('[data-action="selectReportReason"]').forEach(el => el.classList.remove('active'));
                selectReasonBtn.classList.add('active');
                
                const module = selectReasonBtn.closest('.component-module');
                if (module && window.appInstance && typeof window.appInstance.closeModule === 'function') {
                    window.appInstance.closeModule(module);
                } else if (module) {
                    module.classList.replace('active', 'disabled');
                }
            }
            return;
        }

        const selectSanctionOptionBtn = e.target.closest('[data-action="selectSanctionDropdownOption"]');
        if (selectSanctionOptionBtn) {
            const inputName = selectSanctionOptionBtn.getAttribute('data-target-input');
            const val = selectSanctionOptionBtn.getAttribute('data-value');
            const icon = selectSanctionOptionBtn.getAttribute('data-icon');
            const text = selectSanctionOptionBtn.getAttribute('data-text');
            const modal = this.activeBox;
            if (modal) {
                const trigger = modal.querySelector(`[data-ref="${inputName}"]`);
                if (trigger) trigger.setAttribute('data-value', val);

                const wrapper = selectSanctionOptionBtn.closest('.component-dropdown-wrapper');
                if (wrapper) {
                    const triggerText = wrapper.querySelector('.component-dropdown-text');
                    if (triggerText) triggerText.textContent = text;

                    const triggerIcon = wrapper.querySelector('.component-dropdown-trigger .material-symbols-rounded:first-child');
                    if (triggerIcon && icon) triggerIcon.textContent = icon;
                }

                if (inputName === 'suspension_type') {
                    const endDateGroup = modal.querySelector('.modal-end-date-group');
                    if (endDateGroup) {
                        endDateGroup.classList.toggle('disabled', val !== 'temporary');
                    }
                }

                const menuList = selectSanctionOptionBtn.closest('.component-menu-list');
                if (menuList) {
                    menuList.querySelectorAll('[data-action="selectSanctionDropdownOption"]').forEach(el => el.classList.remove('active'));
                    selectSanctionOptionBtn.classList.add('active');
                }

                const module = selectSanctionOptionBtn.closest('.component-module');
                if (module && window.appInstance && typeof window.appInstance.closeModule === 'function') {
                    window.appInstance.closeModule(module);
                } else if (module) {
                    module.classList.replace('active', 'disabled');
                }
            }
            return;
        }

        const selectInviteRoleBtn = e.target.closest('[data-action="selectInviteRoleDropdownOption"]');
        if (selectInviteRoleBtn && this.activeBox) {
            e.preventDefault();
            if (selectInviteRoleBtn.classList.contains('disabled') || selectInviteRoleBtn.classList.contains('disabled-interaction')) {
                return;
            }
            const val = selectInviteRoleBtn.getAttribute('data-value');
            const icon = selectInviteRoleBtn.getAttribute('data-icon');
            const text = selectInviteRoleBtn.getAttribute('data-text') || selectInviteRoleBtn.getAttribute('data-label');

            const trigger = this.activeBox.querySelector('[data-ref="invite_role"]');
            if (trigger) {
                trigger.setAttribute('data-value', val);
                const triggerText = trigger.querySelector('[data-ref="invite_role_trigger_text"]') || trigger.querySelector('.component-dropdown-text');
                if (triggerText) triggerText.textContent = text;
                const triggerIcon = trigger.querySelector('[data-ref="invite_role_trigger_icon"]') || trigger.querySelector('.material-symbols-rounded:first-child');
                if (triggerIcon && icon) triggerIcon.textContent = icon;
            }

            const menuList = selectInviteRoleBtn.closest('.component-menu-list');
            if (menuList) {
                menuList.querySelectorAll('[data-action="selectInviteRoleDropdownOption"]').forEach(el => el.classList.remove('active'));
                selectInviteRoleBtn.classList.add('active');
            }

            const module = selectInviteRoleBtn.closest('.component-module');
            if (module && window.appInstance && typeof window.appInstance.closeModule === 'function') {
                window.appInstance.closeModule(module);
            } else if (module) {
                module.classList.replace('active', 'disabled');
            }
            return;
        }

        const btnAdjustInviteMax = e.target.closest('[data-action="adjustInviteMaxUses"]');
        if (btnAdjustInviteMax && this.activeBox) {
            e.preventDefault();
            const step = parseInt(btnAdjustInviteMax.getAttribute('data-step')) || 0;
            const min = parseInt(btnAdjustInviteMax.getAttribute('data-min')) || 0;
            const max = parseInt(btnAdjustInviteMax.getAttribute('data-max')) || 999;

            const centerEl = this.activeBox.querySelector('[data-ref="invite-max-uses-val"]');
            if (centerEl) {
                let current = parseInt(centerEl.getAttribute('data-value')) || 0;
                current += step;
                if (current < min) current = min;
                if (current > max) current = max;

                centerEl.setAttribute('data-value', current);
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                centerEl.textContent = current === 0 ? __('lbl_no_limit') : current;
            }
            return;
        }

        const triggerGoogleBtn = e.target.closest('[data-action="triggerGoogleVerify"]');
        if (triggerGoogleBtn) {
            e.preventDefault();
            this.handleGoogleVerifyInModal(triggerGoogleBtn);
            return;
        }

        const toggleVerifyBtn = e.target.closest('[data-action="toggleVerifyMethod"]');
        if (toggleVerifyBtn) {
            e.preventDefault();
            const mode = toggleVerifyBtn.getAttribute('data-mode');
            const container = toggleVerifyBtn.closest('[data-ref="verification-method-container"]');
            if (container) {
                const googleBox = container.querySelector('[data-ref="google-verify-box"]');
                const passBox = container.querySelector('[data-ref="password-verify-box"]');
                if (mode === 'password') {
                    if (googleBox) googleBox.classList.add('disabled');
                    if (passBox) passBox.classList.remove('disabled');
                } else {
                    if (passBox) passBox.classList.add('disabled');
                    if (googleBox) googleBox.classList.remove('disabled');
                }
            }
            return;
        }

        const selectTemplateCardBtn = e.target.closest('[data-action="selectModalTemplateCard"]');
        if (selectTemplateCardBtn && this.activeBox) {
            const templateId = selectTemplateCardBtn.getAttribute('data-template-id') || '';
            const valEl = this.activeBox.querySelector('[data-ref="selected_template_id"]');
            if (valEl) {
                valEl.setAttribute('data-value', templateId);
            }
            const grid = selectTemplateCardBtn.closest('[data-ref="modal_template_grid"]');
            if (grid) {
                grid.querySelectorAll('.component-modal-template-card').forEach(c => {
                    c.classList.remove('active');
                    c.classList.remove('selected');
                });
                selectTemplateCardBtn.classList.add('active');
                selectTemplateCardBtn.classList.add('selected');
            }
            return;
        }

        const selectPaletteCardBtn = e.target.closest('[data-action="selectModalPaletteCard"]');
        if (selectPaletteCardBtn && this.activeBox) {
            const paletteId = selectPaletteCardBtn.getAttribute('data-palette-id') || 'default';
            const valEl = this.activeBox.querySelector('[data-ref="selected_palette_id"]');
            if (valEl) {
                valEl.setAttribute('data-value', paletteId);
            }
            const grid = selectPaletteCardBtn.closest('[data-ref="modal_palette_grid"]');
            if (grid) {
                grid.querySelectorAll('.component-modal-palette-card').forEach(c => {
                    c.classList.remove('active');
                    c.classList.remove('selected');
                });
                selectPaletteCardBtn.classList.add('active');
                selectPaletteCardBtn.classList.add('selected');
            }
            return;
        }

        const navCustomPaletteBtn = e.target.closest('[data-action="navigateCustomPaletteModal"]');
        if (navCustomPaletteBtn) {
            this.closeCurrent(false);
            const basePath = window.AppBasePath || '';
            if (window.spaRouter) {
                window.spaRouter.navigate(`${basePath}/canvases/palettes/create`);
            } else {
                window.location.href = `${basePath}/canvases/palettes/create`;
            }
            return;
        }

        const actionBtn = e.target.closest('[data-modal-action], [data-action="confirm"], [data-action="cancel"], #btn_confirm_custom_backup');
        
        if (actionBtn) {
            let action = actionBtn.getAttribute('data-modal-action') || actionBtn.getAttribute('data-action');

            if (!action && actionBtn.id === 'btn_confirm_custom_backup') {
                action = 'confirm';
            }

            if (action === 'togglePassword') {
                const inputGroup = actionBtn.closest('.component-input-group');
                if (inputGroup) {
                    const inputField = inputGroup.querySelector('input');
                    if (inputField) {
                        if (inputField.type === 'password') {
                            inputField.type = 'text';
                            actionBtn.textContent = 'visibility';
                        } else {
                            inputField.type = 'password';
                            actionBtn.textContent = 'visibility_off';
                        }
                    }
                }
                return; 
            }

            if (action === 'cancel') {
                this.closeCurrent(false);
            } else {
                const isConfirmAction = action === 'confirm' || action === 'confirm_dynamic_form' || action === 'finish' || action === 'submitJoinLive' || actionBtn.id === 'btn_confirm_custom_backup';
                if (isConfirmAction && this.activeAsyncConfirm) {
                    this.handleAsyncConfirm(actionBtn, action);
                } else {
                    this.closeCurrent(action || true);
                }
            }
            return;
        }

        if (e.target === this.activeOverlay || e.target === this.activeWrapper) {
            this.closeCurrent(false);
        }
    }

    hasActiveModal() {
        return !!(this.activeOverlay || this.activeBox || (this.modalStack && this.modalStack.length > 0));
    }

    closeAll(result = false) {
        if (this.modalStack && this.modalStack.length > 0) {
            while (this.modalStack.length > 0) {
                const prevModal = this.modalStack.pop();
                if (prevModal.calendarSystem) {
                    prevModal.calendarSystem.destroy();
                }
                if (prevModal.overlay && prevModal.overlay.parentNode) {
                    prevModal.overlay.remove();
                }
                if (prevModal.resolveFn) {
                    prevModal.resolveFn({ confirmed: false, action: false, data: {} });
                }
            }
        }
        if (this.activeOverlay || this.activeBox) {
            this.closeCurrent(result);
        }
        document.body.classList.remove('modal-open');
    }

    closeCurrent(result = false) {
        let formData = {};
        
        try {
            if (result !== false && this.activeBox) {
                formData = this._getFormData();
            }
        } catch (error) {
            if (error.message === 'date_minimum_5_minutes') return;
        }

        const overlayToRemove = this.activeOverlay;
        const wrapperToRemove = this.activeWrapper;
        const resolveToCall = this.activeResolveFn;

        if (wrapperToRemove) wrapperToRemove.removeAttribute('style'); 
        if (overlayToRemove) overlayToRemove.classList.remove('active');
        
        if (this.calendarSystem) {
            this.calendarSystem.destroy();
            this.calendarSystem = null;
        }

        this.activeResolveFn = null;
        this.activeOverlay = null;
        this.activeWrapper = null;
        this.activeBox = null;
        this.activeTemplateName = null;
        this.activeOnConfirm = null;
        this.activeAsyncConfirm = false;

        if (resolveToCall) {
            resolveToCall({ confirmed: result !== false, action: result, data: formData });
        }

        if (this.modalStack && this.modalStack.length > 0) {
            const prevModal = this.modalStack.pop();
            this.activeTemplateName = prevModal.templateName;
            this.activeResolveFn = prevModal.resolveFn;
            this.activeOverlay = prevModal.overlay;
            this.activeWrapper = prevModal.wrapper;
            this.activeBox = prevModal.box;
            this.calendarSystem = prevModal.calendarSystem;
            this.dragState = prevModal.dragState;
            this.activeOnConfirm = prevModal.onConfirm;
            this.activeAsyncConfirm = prevModal.asyncConfirm;

            if (this.activeOverlay) this.activeOverlay.classList.remove('disabled');
        } else {
            document.body.classList.remove('modal-open');
        }

        setTimeout(() => {
            if (overlayToRemove && overlayToRemove.parentNode) {
                overlayToRemove.remove();
            }
            
            const container = document.querySelector('.modal-container[data-type="modal"]');
            if (container && container.childNodes.length === 0 && container.parentNode) {
                container.remove();
            }
        }, 300); 
    }

    _setSanctionStep(step) {
        if (!this.activeBox) return;
        const steps = this.activeBox.querySelectorAll('.step-modal-step');
        steps.forEach(s => {
            const n = parseInt(s.getAttribute('data-step'), 10);
            s.classList.toggle('active', n === step);
            s.classList.toggle('disabled', n !== step);
        });
        const prevBtn    = this.activeBox.querySelector('[data-ref="btn-sanction-prev"]');
        const confirmBtn = this.activeBox.querySelector('[data-ref="btn-sanction-confirm"]');
        const acceptBtn  = this.activeBox.querySelector('[data-ref="btn-sanction-accept"]');
        if (step === 1) {
            if (prevBtn)    prevBtn.classList.add('disabled');
            if (confirmBtn) confirmBtn.classList.remove('disabled');
            if (acceptBtn)  acceptBtn.classList.add('disabled');
        } else {
            if (prevBtn)    prevBtn.classList.remove('disabled');
            if (confirmBtn) confirmBtn.classList.add('disabled');
            if (acceptBtn)  acceptBtn.classList.remove('disabled');
        }
    }

    _setCalendarModalStep(step) {
        if (!this.activeBox) return;
        this.activeBox.querySelectorAll('.step-modal-step').forEach(s => {
            const n = parseInt(s.getAttribute('data-step'), 10);
            s.classList.toggle('active', n === step);
            s.classList.toggle('disabled', n !== step);
        });
        const prevBtn    = this.activeBox.querySelector('[data-ref="btn-calmodal-prev"]');
        const confirmBtn = this.activeBox.querySelector('[data-ref="btn-calmodal-confirm"]');
        if (step === 1) {
            if (prevBtn)    prevBtn.classList.add('disabled');
            if (confirmBtn) confirmBtn.classList.add('disabled');
        } else {
            if (prevBtn)    prevBtn.classList.remove('disabled');
            if (confirmBtn) confirmBtn.classList.remove('disabled');
        }
    }

    _setInviteStep(step) {
        if (!this.activeBox) return;
        const steps = this.activeBox.querySelectorAll('.step-modal-step');
        steps.forEach(s => {
            const n = parseInt(s.getAttribute('data-step'), 10);
            s.classList.toggle('active', n === step);
            s.classList.toggle('disabled', n !== step);
        });

        const cancelBtn  = this.activeBox.querySelector('[data-modal-action="cancel"]');
        const prevBtn    = this.activeBox.querySelector('[data-ref="btn-invite-prev"]');
        const clearBtn   = this.activeBox.querySelector('[data-ref="btn-invite-clear"]');
        const confirmBtn = this.activeBox.querySelector('[data-ref="btn-invite-confirm"]');
        const acceptBtn  = this.activeBox.querySelector('[data-ref="btn-invite-accept"]');

        if (step === 1) {
            if (cancelBtn)  cancelBtn.classList.remove('disabled');
            if (prevBtn)    prevBtn.classList.add('disabled');
            if (clearBtn)   clearBtn.classList.add('disabled');
            if (confirmBtn) confirmBtn.classList.remove('disabled');
            if (acceptBtn)  acceptBtn.classList.add('disabled');
        } else {
            if (cancelBtn)  cancelBtn.classList.add('disabled');
            if (prevBtn)    prevBtn.classList.remove('disabled');
            if (clearBtn)   clearBtn.classList.remove('disabled');
            if (confirmBtn) confirmBtn.classList.add('disabled');
            if (acceptBtn)  acceptBtn.classList.remove('disabled');
        }
    }

    _getFormData() {
        let formData = {};
        if (!this.activeBox) return formData;

        const template = this.templates ? this.templates[this.activeTemplateName] : null;
        if (template && typeof template.getData === 'function') {
            return template.getData(this.activeBox);
        }

        if (this.activeTemplateName === 'calendarModal') {
            // Fuente primaria: selectedDate del CalendarSystem (cubre re-selección y pre-población)
            let isoDateVal = '';
            if (this.calendarSystem && this.calendarSystem.selectedDate) {
                const d = this.calendarSystem.selectedDate;
                isoDateVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else {
                // Fallback: data-value del trigger (valor inicial, si no se ha navegado al step 2)
                const trigger = this.activeBox.querySelector('[data-ref="modal_selected_iso_date"]');
                isoDateVal = trigger ? (trigger.getAttribute('data-value') || '').split('T')[0] : '';
            }
            const hoursEl   = this.activeBox.querySelector('[data-ref="calendar-modal-hours-val"]');
            const minutesEl = this.activeBox.querySelector('[data-ref="calendar-modal-minutes-val"]');


            if (isoDateVal) {
                const datePart = isoDateVal.split('T')[0];
                const h = hoursEl ? hoursEl.getAttribute('data-value').padStart(2, '0') : '00';
                const m = minutesEl ? minutesEl.getAttribute('data-value').padStart(2, '0') : '00';
                
                const dateObj = new Date(
                    parseInt(datePart.split('-')[0], 10),
                    parseInt(datePart.split('-')[1], 10) - 1,
                    parseInt(datePart.split('-')[2], 10),
                    parseInt(h, 10),
                    parseInt(m, 10)
                );
                
                if (this.calendarSystem && this.calendarSystem.disablePastDates) {
                    const now = new Date();
                    const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
                    if (dateObj < minFuture) {
                        showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha programada debe tener un margen mínimo de 5 minutos al futuro.', 'error');
                        throw new Error('date_minimum_5_minutes');
                    }
                }
                
                formData.isoString = `${datePart}T${h}:${m}`;
                if (this.calendarSystem) {
                    formData.displayString = this.calendarSystem.getFormattedDisplayDate(dateObj, h, m);
                } else {
                    formData.displayString = `${datePart}, ${h}:${m}`;
                }
            } else {
                formData.isoString = '';
                formData.displayString = '';
            }
        }

        const inputs = this.activeBox.querySelectorAll('input, select, textarea');
        const processedRadioNames = new Set();
        inputs.forEach(inp => { 
            if (inp.type === 'radio') {
                const radioName = inp.name;
                if (radioName && !processedRadioNames.has(radioName)) {
                    processedRadioNames.add(radioName);
                    const checked = this.activeBox.querySelector(`input[name="${radioName}"]:checked`);
                    formData[radioName] = checked ? checked.value : '';
                }
                return;
            }
            const key = inp.id || inp.name || inp.getAttribute('data-ref'); 
            if (key) {
                if (inp.type === 'checkbox') {
                    formData[key] = inp.checked;
                } else {
                    formData[key] = inp.value;
                }
            } 
        });

        const valElements = this.activeBox.querySelectorAll('[data-value]');
        valElements.forEach(el => {
            const key = el.getAttribute('data-ref') || el.id;
            if (key && !key.endsWith('-val') && !key.includes('val_') && !formData[key]) {
                formData[key] = el.getAttribute('data-value');
            }
        });

        return formData;
    }

    async handleAsyncConfirm(confirmBtn, action) {
        if (confirmBtn.classList.contains('disabled-interaction')) return;

        let formData = {};
        try {
            formData = this._getFormData();
        } catch (error) {
            if (error.message === 'date_minimum_5_minutes') return;
        }

        setButtonLoading(confirmBtn);

        if (typeof this.activeOnConfirm === 'function') {
            try {
                const success = await this.activeOnConfirm(formData, confirmBtn);
                if (success) {
                    this.closeCurrent(action || true);
                } else {
                    restoreButton(confirmBtn);
                }
            } catch (error) {
                restoreButton(confirmBtn);
            }
        } else {
            const resolveToCall = this.activeResolveFn;
            this.activeResolveFn = null;

            if (resolveToCall) {
                resolveToCall({
                    confirmed: true,
                    action: action || true,
                    data: formData,
                    success: () => {
                        this.closeCurrent(action || true);
                    },
                    failure: (msg) => {
                        restoreButton(confirmBtn);
                        if (msg) {
                            showMessage(msg, 'error');
                        }
                    }
                });
            }
        }
    }

    handleInput(e) {
        if (!this.activeBox) return;
        const hexInput = e.target.closest('[data-ref="selected_hex"]');
        if (hexInput && this.activeBox.contains(hexInput)) {
            let val = hexInput.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                const picker = this.activeBox.querySelector('[data-ref="customColorPicker"]');
                if (picker) {
                    const hsv = hexToHsv(val);
                    picker.dataset.h = hsv.h;
                    picker.dataset.s = hsv.s;
                    picker.dataset.v = hsv.v;
                    this._updateModalPickerUI(picker, false);
                }
            }
        }
    }

    handlePointerDown(e) {
        if (!this.activeBox) return; 

        const svArea = e.target.closest('[data-action="dragSV"]');
        if (svArea && this.activeBox.contains(svArea)) {
            this.colorPickerDrag = 'sv';
            this.activeColorPicker = svArea.closest('[data-ref="customColorPicker"]');
            this._updateModalColorFromPointer(e, svArea);
            if (e.cancelable) e.preventDefault();
            return;
        }

        const hueArea = e.target.closest('[data-action="dragHue"]');
        if (hueArea && this.activeBox.contains(hueArea)) {
            this.colorPickerDrag = 'hue';
            this.activeColorPicker = hueArea.closest('[data-ref="customColorPicker"]');
            this._updateModalColorFromPointer(e, hueArea);
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (window.innerWidth > 768 && window.innerHeight > 550) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 

        const dragHandle = e.target.closest('.pill-container');
        if (!dragHandle || !this.activeBox.contains(dragHandle)) return;

        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        
        if (this.activeOverlay) this.activeOverlay.classList.add('is-dragging');
        if (this.activeWrapper) this.activeWrapper.setPointerCapture(e.pointerId);
    }

    handlePointerMove(e) {
        if (this.colorPickerDrag && this.activeColorPicker) {
            if (this.colorPickerDrag === 'sv') {
                const svArea = this.activeColorPicker.querySelector('[data-action="dragSV"]');
                this._updateModalColorFromPointer(e, svArea);
            } else if (this.colorPickerDrag === 'hue') {
                const hueArea = this.activeColorPicker.querySelector('[data-action="dragHue"]');
                this._updateModalColorFromPointer(e, hueArea);
            }
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (!this.dragState.isDragging || !this.activeWrapper) return;
        this.dragState.currentDiff = e.clientY - this.dragState.startY;
        
        if (this.dragState.currentDiff > 0) {
            this.activeWrapper.style.transform = `translateY(${this.dragState.currentDiff}px)`;
        }
    }

    handlePointerUp(e) {
        if (this.colorPickerDrag) {
            this.colorPickerDrag = null;
            this.activeColorPicker = null;
        }

        if (!this.dragState.isDragging || !this.activeWrapper) return;
        this.dragState.isDragging = false;
        
        if (this.activeOverlay) this.activeOverlay.classList.remove('is-dragging');
        
        if (this.activeWrapper.hasPointerCapture(e.pointerId)) {
            this.activeWrapper.releasePointerCapture(e.pointerId);
        }

        if (this.dragState.currentDiff > this.activeWrapper.offsetHeight * 0.35) {
            this.closeCurrent(false);
        } else {
            this.activeWrapper.removeAttribute('style'); 
        }
        
        this.dragState.currentDiff = 0;
    }

    _updateModalColorFromPointer(e, container) {
        if (!container || !this.activeColorPicker) return;
        const rect = container.getBoundingClientRect();
        const coords = getEventCoords(e);

        let x = Math.max(0, Math.min(coords.clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(coords.clientY - rect.top, rect.height));

        if (this.colorPickerDrag === 'sv') {
            this.activeColorPicker.dataset.s = (x / rect.width) * 100;
            this.activeColorPicker.dataset.v = 100 - ((y / rect.height) * 100);
        } else if (this.colorPickerDrag === 'hue') {
            this.activeColorPicker.dataset.h = (x / rect.width) * 360;
        }

        this._updateModalPickerUI(this.activeColorPicker, true);
    }

    _updateModalPickerUI(pickerNode, updateInput = true) {
        let h = Math.max(0, Math.min(360, parseFloat(pickerNode.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.v) || 0));

        const hex = hsvToHex(h, s, v);

        const svArea = pickerNode.querySelector('[data-action="dragSV"]');
        if (svArea) svArea.style.backgroundColor = `hsl(${h}, 100%, 50%)`;

        const svThumb = pickerNode.querySelector('[data-ref="svThumb"]');
        if (svThumb) {
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
        }

        const hueThumb = pickerNode.querySelector('[data-ref="hueThumb"]');
        if (hueThumb) hueThumb.style.left = `${(h / 360) * 100}%`;

        if (updateInput) {
            const hexInput = pickerNode.querySelector('[data-ref="selected_hex"]');
            if (hexInput) hexInput.value = hex;
        }

        const hexInputPreview = pickerNode.querySelector('[data-ref="hexInputPreview"]');
        if (hexInputPreview) hexInputPreview.style.backgroundColor = hex;
    }

    handleGoogleVerifyInModal(btn) {
        const __ = (typeof window.__ === 'function') ? window.__ : (k => k);

        if (!window.google || !window.google.accounts) {
            showMessage(__('err_google_sdk_not_loaded'), 'error');
            return;
        }
        const clientId = window.GOOGLE_CLIENT_ID || '';
        if (!clientId) {
            showMessage(__('err_google_client_id_missing'), 'error');
            return;
        }

        setButtonLoading(btn);

        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile',
            callback: (response) => {
                if (response && response.access_token) {
                    const modal = btn.closest('.component-modal-box');
                    if (modal) {
                        const googleTokenEl = modal.querySelector('[data-ref="google_token"]');
                        const credentialEl = modal.querySelector('[data-ref="credential"]');
                        if (googleTokenEl) {
                            googleTokenEl.value = response.access_token;
                            googleTokenEl.setAttribute('data-value', response.access_token);
                            googleTokenEl.setAttribute('value', response.access_token);
                        }
                        if (credentialEl) {
                            if ('value' in credentialEl) credentialEl.value = response.access_token;
                            credentialEl.setAttribute('data-value', response.access_token);
                            credentialEl.setAttribute('value', response.access_token);
                        }
                    }

                    // Keep loader spinner active on the badge while the backend verifies identity
                    const confirmBtn = modal ? modal.querySelector(
                        'button[data-action="submitVerifyCurrentPassword"], ' +
                        'button[data-modal-action="confirm"], ' +
                        'button[data-modal-action="confirm_dynamic_form"], ' +
                        'button[data-action="confirm"]'
                    ) : null;

                    if (confirmBtn && !confirmBtn.disabled) {
                        confirmBtn.click();
                    } else {
                        restoreButton(btn);
                    }
                } else {
                    restoreButton(btn);
                    if (response && response.error) {
                        showMessage(__('err_google_auth_failed'), 'error');
                    }
                }
            },
            error_callback: () => {
                restoreButton(btn);
                showMessage(__('err_google_connect_failed'), 'error');
            }
        });

        client.requestAccessToken();
    }

    _updateImageViewer(root, newIndex) {
        if (!root) return;
        let images = root._images;
        if (!images || !Array.isArray(images) || images.length === 0) {
            try {
                let raw = root.getAttribute('data-images') || '[]';
                if (raw.includes('&quot;')) raw = raw.replace(/&quot;/g, '"');
                if (raw.includes('&amp;')) raw = raw.replace(/&amp;/g, '&');
                images = JSON.parse(raw);
            } catch(e) {
                try {
                    const txt = document.createElement('textarea');
                    txt.innerHTML = root.getAttribute('data-images') || '[]';
                    images = JSON.parse(txt.value);
                } catch(err2) {
                    images = [];
                }
            }
            root._images = images;
        }
        const total = images ? images.length : 0;
        if (total === 0) return;

        const idx = Math.max(0, Math.min(newIndex, total - 1));
        root.setAttribute('data-current-index', idx.toString());

        const currentItem = images[idx];
        const currentUrl = typeof currentItem === 'string' ? currentItem : (currentItem?.url || '');

        const stageImg = root.querySelector('[data-ref="iv-stage-img"]');
        if (stageImg && currentUrl) {
            stageImg.classList.remove('image-loaded');
            const preloader = new Image();
            preloader.onload = () => {
                stageImg.src = currentUrl;
                stageImg.classList.add('image-loaded');
            };
            preloader.onerror = () => {
                stageImg.src = (window.AppBasePath || '') + '/public/assets/img/fallbacks/canvas-default.png';
                stageImg.classList.add('image-loaded');
            };
            preloader.src = currentUrl;
        }

        const titleEl = root.querySelector('[data-ref="iv-title"]');
        if (titleEl && typeof currentItem === 'object' && currentItem.name) {
            titleEl.textContent = currentItem.name;
        }

        const counterText = root.querySelector('[data-ref="iv-counter-text"]');
        if (counterText) {
            counterText.textContent = total > 1 ? `${idx + 1} de ${total} imágenes` : '1 imagen';
        }

        const senderNameEl = root.querySelector('[data-ref="iv-sender-name"]');
        if (senderNameEl && typeof currentItem === 'object' && currentItem.sender) {
            senderNameEl.textContent = `Por ${currentItem.sender}`;
        }

        const dateBadge = root.querySelector('[data-ref="iv-date-badge"]');
        const senderDateEl = root.querySelector('[data-ref="iv-sender-date"]');
        if (senderDateEl && typeof currentItem === 'object') {
            const d = currentItem.date || '';
            senderDateEl.textContent = d;
            if (dateBadge) dateBadge.classList.toggle('disabled', !d);
        }

        const senderAvatarEl = root.querySelector('[data-ref="iv-sender-avatar"]');
        if (senderAvatarEl && typeof currentItem === 'object' && currentItem.avatar) {
            senderAvatarEl.src = currentItem.avatar;
        }

        const senderAvatarWrap = root.querySelector('[data-ref="iv-sender-avatar-wrap"]');
        if (senderAvatarWrap && typeof currentItem === 'object') {
            const subBg = currentItem.subBg || '';
            senderAvatarWrap.setAttribute('data-sub-bg', subBg);
            senderAvatarWrap.style.setProperty('--active-subscription-bg', subBg || 'transparent');
        }

        const thumbs = root.querySelectorAll('.component-image-viewer-thumb');
        thumbs.forEach((thumb, tIdx) => {
            const isActive = (tIdx === idx);
            thumb.classList.toggle('active', isActive);
            if (isActive) {
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
    }

    async _downloadImageViewerImage(root, btn) {
        if (!root) return;
        let images = root._images;
        if (!images || !Array.isArray(images) || images.length === 0) {
            try {
                let raw = root.getAttribute('data-images') || '[]';
                if (raw.includes('&quot;')) raw = raw.replace(/&quot;/g, '"');
                if (raw.includes('&amp;')) raw = raw.replace(/&amp;/g, '&');
                images = JSON.parse(raw);
            } catch(e) {
                images = [];
            }
        }

        const idx = parseInt(root.getAttribute('data-current-index') || '0', 10);
        const item = (images && images[idx]) ? images[idx] : null;
        let currentUrl = typeof item === 'string' ? item : (item?.url || '');
        if (!currentUrl) {
            const stageImg = root.querySelector('[data-ref="iv-stage-img"]');
            currentUrl = stageImg ? stageImg.src : '';
        }
        if (!currentUrl) return;

        if (btn) setButtonLoading(btn);

        try {
            let fileName = 'plantilla.png';
            try {
                if (typeof item === 'object' && item && item.name && item.name.includes('.')) {
                    fileName = item.name;
                } else {
                    const cleanName = currentUrl.split('/').pop().split('?')[0];
                    if (cleanName && cleanName.includes('.')) {
                        fileName = cleanName;
                    }
                }
            } catch(e) {}

            const response = await fetch(currentUrl);
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();

            // 1. Download file directly to user device
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                a.remove();
            }, 1000);

            // 2. Save template into Rosaura canvas templates library
            try {
                const api = new ApiService();
                const file = new File([blob], fileName, { type: blob.type || 'image/png' });
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await api.postForm(ApiRoutes.Canvases.UploadTemplate, formData);
                if (uploadRes && (uploadRes.success || uploadRes.status === 'success')) {
                    if (window.showMessage) {
                        const __ = typeof window.__ === 'function' ? window.__ : (k => k);
                        showMessage(__('msg_template_saved') || 'Plantilla guardada en tu biblioteca', 'success');
                    }
                } else if (window.showMessage) {
                    const __ = typeof window.__ === 'function' ? window.__ : (k => k);
                    showMessage(__('lbl_download_success') || 'Descarga iniciada', 'success');
                }
            } catch(uploadErr) {
                if (window.showMessage) {
                    const __ = typeof window.__ === 'function' ? window.__ : (k => k);
                    showMessage(__('lbl_download_success') || 'Descarga iniciada', 'success');
                }
            }
        } catch(err) {
            console.warn('[ModalSystem] Direct blob download failed, falling back:', err);
            const a = document.createElement('a');
            a.href = currentUrl;
            a.download = 'plantilla.png';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 1000);
        } finally {
            if (btn) restoreButton(btn);
        }
    }
}