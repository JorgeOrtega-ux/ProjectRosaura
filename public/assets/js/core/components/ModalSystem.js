import { ModalTemplates } from './ModalTemplates.js';
import { CalendarSystem } from './CalendarSystem.js';
import { getEventCoords, hexToHsv, hsvToHex, restoreButton, setButtonLoading, showMessage, initCarouselScroll, closeDropdown, localInputFormatToUtcString, copyToClipboard } from '../utils/uiUtils.js';
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

            if (template.customBoxClass) {
                this.activeBox.classList.add(template.customBoxClass);
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

            if (templateName === 'setup2faModal') {
                const api = new ApiService();
                api.post(ApiRoutes.Settings.Generate2FA).then(res => {
                    if (res && res.success) {
                        const qrTarget = this.activeBox?.querySelector('[data-ref="2fa-qr-target"]');
                        const secretText = this.activeBox?.querySelector('[data-ref="2fa_secret_key_text"]');
                        if (secretText && res.secret) {
                            secretText.textContent = res.secret;
                            secretText.setAttribute('data-secret', res.secret);
                        }
                        if (qrTarget) {
                            if (res.qr_svg) {
                                const trimmedSvg = res.qr_svg.trim();
                                if (trimmedSvg.startsWith('<svg')) {
                                    qrTarget.innerHTML = trimmedSvg;
                                    const svgElem = qrTarget.querySelector('svg');
                                    if (svgElem) {
                                        svgElem.setAttribute('width', '220');
                                        svgElem.setAttribute('height', '220');
                                        svgElem.style.width = '220px';
                                        svgElem.style.height = '220px';
                                    }
                                } else if (trimmedSvg.startsWith('data:image/') || trimmedSvg.startsWith('http')) {
                                    qrTarget.innerHTML = `<img src="${trimmedSvg}" alt="QR Code" style="width: 220px; height: 220px;">`;
                                } else {
                                    qrTarget.innerHTML = `<img src="data:image/svg+xml;base64,${trimmedSvg}" alt="QR Code" style="width: 220px; height: 220px;">`;
                                }
                            } else if (res.qr_url) {
                                qrTarget.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(res.qr_url)}" alt="QR Code" style="width: 220px; height: 220px;">`;
                            }
                        }
                    } else if (this.activeBox) {
                        const qrTarget = this.activeBox.querySelector('[data-ref="2fa-qr-target"]');
                        if (qrTarget) qrTarget.innerHTML = `<span class="component-text-danger">${res?.message || 'Error'}</span>`;
                    }
                }).catch(() => {
                    if (this.activeBox) {
                        const qrTarget = this.activeBox.querySelector('[data-ref="2fa-qr-target"]');
                        if (qrTarget) qrTarget.innerHTML = `<span class="component-text-danger">Error de conexión</span>`;
                    }
                });
            }

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
                    'button[data-action="submitSetupEnable2FA"], ' +
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

            if ((target === 'moduleOfflineResizeDate' || target === 'moduleOfflineResetDate') && this.activeBox) {
                if (!this.calendarSystem) {
                    this.calendarSystem = new CalendarSystem(this.activeBox);
                    this.calendarSystem.disablePastDates = true;
                    this.calendarSystem.init();
                }
                const trigger = this.activeBox.querySelector(target === 'moduleOfflineResizeDate' ? '[data-ref="offline-resize-datetime-trigger"]' : '[data-ref="offline-reset-datetime-trigger"]');
                const initialVal = trigger ? trigger.getAttribute('data-value') : '';
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

        // ── Workspace Resize & Reset Modal interactions ────────────────────────
        const btnSelectResizeTypeOption = e.target.closest('[data-action="selectResizeTypeOption"]') || e.target.closest('[data-action="selectResizeType"]');
        if (btnSelectResizeTypeOption && this.activeBox) {
            e.preventDefault();
            const val = btnSelectResizeTypeOption.getAttribute('data-value') || btnSelectResizeTypeOption.getAttribute('data-type') || 'instant';
            const label = btnSelectResizeTypeOption.getAttribute('data-label') || '';
            const icon = btnSelectResizeTypeOption.getAttribute('data-icon') || 'flash_on';
            const step1 = this.activeBox.querySelector('[data-ref="offline-resize-step-1"]');
            if (step1) {
                step1.setAttribute('data-selected-type', val);
                const trigger = this.activeBox.querySelector('[data-ref="offline-resize-type-trigger"]');
                const labelRef = this.activeBox.querySelector('[data-ref="offline-resize-type-label"]');
                const iconRef = this.activeBox.querySelector('[data-ref="offline-resize-type-icon"]');
                if (trigger) trigger.setAttribute('data-value', val);
                if (labelRef && label) labelRef.textContent = label;
                if (iconRef && icon) iconRef.textContent = icon;
                const dateContainer = this.activeBox.querySelector('[data-ref="offline-resize-scheduled-date-container"]');
                if (dateContainer) {
                    if (val === 'scheduled') dateContainer.classList.remove('disabled');
                    else dateContainer.classList.add('disabled');
                }
                const dropdown = btnSelectResizeTypeOption.closest('.component-module--dropdown');
                if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);
                btnSelectResizeTypeOption.closest('.component-menu-list')?.querySelectorAll('.component-menu-link')?.forEach(l => {
                    l.classList.toggle('active', l === btnSelectResizeTypeOption);
                });
            }
            return;
        }

        const btnSelectResetTypeOption = e.target.closest('[data-action="selectResetTypeOption"]') || e.target.closest('[data-action="selectResetType"]');
        if (btnSelectResetTypeOption && this.activeBox) {
            e.preventDefault();
            const val = btnSelectResetTypeOption.getAttribute('data-value') || btnSelectResetTypeOption.getAttribute('data-type') || 'instant';
            const label = btnSelectResetTypeOption.getAttribute('data-label') || '';
            const icon = btnSelectResetTypeOption.getAttribute('data-icon') || 'flash_on';
            const step1 = this.activeBox.querySelector('[data-ref="offline-reset-step-1"]');
            if (step1) {
                step1.setAttribute('data-selected-type', val);
                const trigger = this.activeBox.querySelector('[data-ref="offline-reset-type-trigger"]');
                const labelRef = this.activeBox.querySelector('[data-ref="offline-reset-type-label"]');
                const iconRef = this.activeBox.querySelector('[data-ref="offline-reset-type-icon"]');
                if (trigger) trigger.setAttribute('data-value', val);
                if (labelRef && label) labelRef.textContent = label;
                if (iconRef && icon) iconRef.textContent = icon;
                const dateContainer = this.activeBox.querySelector('[data-ref="offline-reset-scheduled-date-container"]');
                if (dateContainer) {
                    if (val === 'scheduled') dateContainer.classList.remove('disabled');
                    else dateContainer.classList.add('disabled');
                }
                const dropdown = btnSelectResetTypeOption.closest('.component-module--dropdown');
                if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);
                btnSelectResetTypeOption.closest('.component-menu-list')?.querySelectorAll('.component-menu-link')?.forEach(l => {
                    l.classList.toggle('active', l === btnSelectResetTypeOption);
                });
            }
            return;
        }

        const btnConfirmOfflineResizeDate = e.target.closest('[data-action="confirmOfflineResizeDate"]');
        if (btnConfirmOfflineResizeDate && this.activeBox) {
            e.preventDefault();
            if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                if (window.showMessage) showMessage(__('err_select_day') || 'Selecciona un día', 'error');
                return;
            }
            const moduleEl = this.activeBox.querySelector('[data-module="moduleOfflineResizeDate"]');
            const hoursEl = moduleEl ? moduleEl.querySelector('[data-ref="calendar-modal-hours-val"]') : null;
            const minutesEl = moduleEl ? moduleEl.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
            const h = hoursEl ? String(parseInt(hoursEl.getAttribute('data-value') || '0', 10)).padStart(2, '0') : '00';
            const m = minutesEl ? String(parseInt(minutesEl.getAttribute('data-value') || '0', 10)).padStart(2, '0') : '00';

            const d = this.calendarSystem.selectedDate;
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const isoString = `${y}-${mo}-${day}T${h}:${m}`;
            const displayString = `${day}/${mo}/${y} ${h}:${m}`;

            const trigger = this.activeBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
            if (trigger) trigger.setAttribute('data-value', isoString);
            const textEl = this.activeBox.querySelector('[data-ref="offline-resize-datetime-text"]');
            if (textEl) textEl.textContent = displayString;

            if (moduleEl && typeof closeDropdown === 'function') closeDropdown(moduleEl);
            return;
        }

        const btnConfirmOfflineResetDate = e.target.closest('[data-action="confirmOfflineResetDate"]');
        if (btnConfirmOfflineResetDate && this.activeBox) {
            e.preventDefault();
            if (!this.calendarSystem || !this.calendarSystem.selectedDate) {
                const __ = typeof window.__ === 'function' ? window.__ : k => k;
                if (window.showMessage) showMessage(__('err_select_day') || 'Selecciona un día', 'error');
                return;
            }
            const moduleEl = this.activeBox.querySelector('[data-module="moduleOfflineResetDate"]');
            const hoursEl = moduleEl ? moduleEl.querySelector('[data-ref="calendar-modal-hours-val"]') : null;
            const minutesEl = moduleEl ? moduleEl.querySelector('[data-ref="calendar-modal-minutes-val"]') : null;
            const h = hoursEl ? String(parseInt(hoursEl.getAttribute('data-value') || '0', 10)).padStart(2, '0') : '00';
            const m = minutesEl ? String(parseInt(minutesEl.getAttribute('data-value') || '0', 10)).padStart(2, '0') : '00';

            const d = this.calendarSystem.selectedDate;
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const isoString = `${y}-${mo}-${day}T${h}:${m}`;
            const displayString = `${day}/${mo}/${y} ${h}:${m}`;

            const trigger = this.activeBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
            if (trigger) trigger.setAttribute('data-value', isoString);
            const textEl = this.activeBox.querySelector('[data-ref="offline-reset-datetime-text"]');
            if (textEl) textEl.textContent = displayString;

            if (moduleEl && typeof closeDropdown === 'function') closeDropdown(moduleEl);
            return;
        }

        const btnOfflineResizeNext = e.target.closest('[data-action="offlineResizeNextStep"]');
        if (btnOfflineResizeNext && this.activeBox) {
            e.preventDefault();
            const step1 = this.activeBox.querySelector('[data-ref="offline-resize-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="offline-resize-step-2"]') || this.activeBox.querySelector('[data-ref="offline-resize-step-2-instant"]');
            if (step1 && step2) {
                const selectedType = step1.getAttribute('data-selected-type') || 'instant';
                if (selectedType === 'scheduled') {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_resize_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_resize_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                }
                step1.classList.replace('active', 'disabled');
                step2.classList.replace('disabled', 'active');
            }
            return;
        }

        const btnOfflineResizePrev = e.target.closest('[data-action="offlineResizePrevStep"]');
        if (btnOfflineResizePrev && this.activeBox) {
            e.preventDefault();
            const step1 = this.activeBox.querySelector('[data-ref="offline-resize-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="offline-resize-step-2"]') || this.activeBox.querySelector('[data-ref="offline-resize-step-2-instant"]');
            if (step2) step2.classList.replace('active', 'disabled');
            if (step1) step1.classList.replace('disabled', 'active');
            return;
        }

        const btnOfflineResetNext = e.target.closest('[data-action="offlineResetNextStep"]');
        if (btnOfflineResetNext && this.activeBox) {
            e.preventDefault();
            const step1 = this.activeBox.querySelector('[data-ref="offline-reset-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="offline-reset-step-2"]') || this.activeBox.querySelector('[data-ref="offline-reset-step-2-instant"]');
            if (step1 && step2) {
                const selectedType = step1.getAttribute('data-selected-type') || 'instant';
                if (selectedType === 'scheduled') {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_reset_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_reset_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                }
                step1.classList.replace('active', 'disabled');
                step2.classList.replace('disabled', 'active');
            }
            return;
        }

        const btnOfflineResetPrev = e.target.closest('[data-action="offlineResetPrevStep"]');
        if (btnOfflineResetPrev && this.activeBox) {
            e.preventDefault();
            const step1 = this.activeBox.querySelector('[data-ref="offline-reset-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="offline-reset-step-2"]') || this.activeBox.querySelector('[data-ref="offline-reset-step-2-instant"]');
            if (step2) step2.classList.replace('active', 'disabled');
            if (step1) step1.classList.replace('disabled', 'active');
            return;
        }

        const btnSelectOfflineResizeSize = e.target.closest('[data-action="selectOfflineResizeSize"]');
        if (btnSelectOfflineResizeSize && this.activeBox) {
            e.preventDefault();
            const val = btnSelectOfflineResizeSize.getAttribute('data-value');
            const label = btnSelectOfflineResizeSize.getAttribute('data-label');
            const icon = btnSelectOfflineResizeSize.getAttribute('data-icon');
            const trigger = this.activeBox.querySelector('[data-ref="offline-resize-trigger"]');
            const labelRef = this.activeBox.querySelector('[data-ref="offline-resize-label"]');
            const iconRef = this.activeBox.querySelector('[data-ref="offline-resize-icon"]');
            if (trigger) trigger.setAttribute('data-value', val);
            if (labelRef && label) labelRef.textContent = label;
            if (iconRef && icon) iconRef.textContent = icon;
            const dropdown = btnSelectOfflineResizeSize.closest('.component-module--dropdown');
            if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);
            btnSelectOfflineResizeSize.closest('.component-menu-list')?.querySelectorAll('.component-menu-link')?.forEach(l => {
                l.classList.toggle('active', l === btnSelectOfflineResizeSize);
            });

            const warning = this.activeBox.querySelector('[data-ref="offline-resize-shrink-warning"]');
            if (warning && trigger) {
                const currentSize = this.activeBox.getAttribute('data-current-size') || '64x64';
                const currWidth = parseInt(currentSize.split('x')[0], 10);
                const nextWidth = parseInt(val.split('x')[0], 10);
                warning.classList.toggle('active', nextWidth < currWidth);
            }
            return;
        }

        const btnSelectSchedResizeSize = e.target.closest('[data-action="selectScheduledResizeSize"]');
        if (btnSelectSchedResizeSize && this.activeBox) {
            e.preventDefault();
            const val = btnSelectSchedResizeSize.getAttribute('data-value') || '64x64';
            const label = btnSelectSchedResizeSize.getAttribute('data-label') || '';
            const icon = btnSelectSchedResizeSize.getAttribute('data-icon') || 'aspect_ratio';
            const trigger = this.activeBox.querySelector('[data-ref="scheduled-resize-trigger"]');
            const labelRef = this.activeBox.querySelector('[data-ref="scheduled-resize-label"]');
            const iconRef = this.activeBox.querySelector('[data-ref="scheduled-resize-icon"]');
            if (trigger) trigger.setAttribute('data-value', val);
            if (labelRef && label) labelRef.textContent = label;
            if (iconRef && icon) iconRef.textContent = icon;
            const dropdown = btnSelectSchedResizeSize.closest('.component-module--dropdown');
            if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);
            btnSelectSchedResizeSize.closest('.component-menu-list')?.querySelectorAll('.component-menu-link')?.forEach(l => {
                l.classList.toggle('active', l === btnSelectSchedResizeSize);
            });

            const warning = this.activeBox.querySelector('[data-ref="scheduled-resize-shrink-warning"]');
            if (warning && trigger) {
                const currentSize = this.activeBox.getAttribute('data-current-size') || '64x64';
                const currWidth = parseInt(currentSize.split('x')[0], 10);
                const nextWidth = parseInt(val.split('x')[0], 10);
                warning.classList.toggle('active', nextWidth < currWidth);
            }
            return;
        }

        const toggleSchedResize = e.target.closest('[data-action="toggleScheduledResizeSection"]');
        if (toggleSchedResize && this.activeBox) {
            const fields = this.activeBox.querySelector('[data-ref="scheduled_resize_fields"]');
            if (fields) fields.classList.toggle('disabled-interaction', !toggleSchedResize.checked);
        }

        const toggleSchedReset = e.target.closest('[data-action="toggleScheduledResetSection"]');
        if (toggleSchedReset && this.activeBox) {
            const fields = this.activeBox.querySelector('[data-ref="scheduled_reset_fields"]');
            if (fields) fields.classList.toggle('disabled-interaction', !toggleSchedReset.checked);
        }

        // Submits when onConfirm callback is provided (e.g. from cards)
        if (this.activeOnConfirm) {
            const btnSubmitResizeUnified = e.target.closest('[data-action="submitOfflineResizeUnified"]') || e.target.closest('[data-action="submitOfflineResize"]');
            if (btnSubmitResizeUnified && this.activeBox) {
                e.preventDefault();
                const step1 = this.activeBox.querySelector('[data-ref="offline-resize-step-1"]');
                const mode = step1 ? (step1.getAttribute('data-selected-type') || 'instant') : 'instant';
                const trigger = this.activeBox.querySelector('[data-ref="offline-resize-trigger"]');
                const size = trigger ? trigger.getAttribute('data-value') : '64x64';

                let nextResizeAt = null;
                if (mode === 'scheduled') {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_resize_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_resize_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                    nextResizeAt = typeof localInputFormatToUtcString === 'function' ? localInputFormatToUtcString(localTimeStr) : localTimeStr;
                }

                this.activeOnConfirm({ mode, size, targetSize: size, isActive: (mode === 'scheduled'), nextResizeAt }, btnSubmitResizeUnified);
                return;
            }

            const btnSubmitSchedResize = e.target.closest('[data-action="submitScheduledResize"]');
            if (btnSubmitSchedResize && this.activeBox) {
                e.preventDefault();
                const toggle = this.activeBox.querySelector('[data-ref="scheduled_resize_active"]');
                const isActive = toggle ? toggle.checked : false;
                const trigger = this.activeBox.querySelector('[data-ref="scheduled-resize-trigger"]') || this.activeBox.querySelector('[data-ref="offline-resize-trigger"]');
                const targetSize = trigger ? trigger.getAttribute('data-value') : '64x64';
                let nextResizeAt = null;
                if (isActive) {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-resize-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_resize_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_resize_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                    nextResizeAt = typeof localInputFormatToUtcString === 'function' ? localInputFormatToUtcString(localTimeStr) : localTimeStr;
                }
                this.activeOnConfirm({ mode: 'scheduled', isActive, nextResizeAt, targetSize }, btnSubmitSchedResize);
                return;
            }

            const btnSubmitResetUnified = e.target.closest('[data-action="submitOfflineResetUnified"]') || e.target.closest('[data-action="submitOfflineReset"]');
            if (btnSubmitResetUnified && this.activeBox) {
                e.preventDefault();
                const step1 = this.activeBox.querySelector('[data-ref="offline-reset-step-1"]');
                const mode = step1 ? (step1.getAttribute('data-selected-type') || 'instant') : 'instant';
                const snapshotCheckbox = this.activeBox.querySelector('[data-ref="offline_reset_snapshot"]');
                const takeSnapshot = snapshotCheckbox ? snapshotCheckbox.checked : false;

                let nextResetAt = null;
                if (mode === 'scheduled') {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_reset_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_reset_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                    nextResetAt = typeof localInputFormatToUtcString === 'function' ? localInputFormatToUtcString(localTimeStr) : localTimeStr;
                }

                this.activeOnConfirm({ mode, takeSnapshot, isActive: (mode === 'scheduled'), nextResetAt }, btnSubmitResetUnified);
                return;
            }

            const btnSubmitSchedReset = e.target.closest('[data-action="submitScheduledReset"]');
            if (btnSubmitSchedReset && this.activeBox) {
                e.preventDefault();
                const toggle = this.activeBox.querySelector('[data-ref="scheduled_reset_active"]');
                const isActive = toggle ? toggle.checked : false;
                const snapshotCheckbox = this.activeBox.querySelector('[data-ref="scheduled_reset_snapshot"]');
                const takeSnapshot = snapshotCheckbox ? snapshotCheckbox.checked : false;
                let nextResetAt = null;
                if (isActive) {
                    const triggerDateTime = this.activeBox.querySelector('[data-ref="offline-reset-datetime-trigger"]');
                    const inputDateTime = this.activeBox.querySelector('[data-ref="scheduled_reset_datetime"]');
                    const localTimeStr = triggerDateTime ? triggerDateTime.getAttribute('data-value') : (inputDateTime ? inputDateTime.value : '');
                    if (!localTimeStr) {
                        if (window.showMessage) showMessage(window.__('err_reset_date_required') || 'Debe seleccionar una fecha y hora.', 'warning');
                        return;
                    }
                    const date = new Date(localTimeStr);
                    const minFuture = new Date(Date.now() + 5 * 60 * 1000);
                    if (isNaN(date.getTime()) || date < minFuture) {
                        if (window.showMessage) showMessage(window.__('err_date_minimum_5_minutes') || 'La fecha debe ser al menos 5 minutos en el futuro.', 'error');
                        return;
                    }
                    nextResetAt = typeof localInputFormatToUtcString === 'function' ? localInputFormatToUtcString(localTimeStr) : localTimeStr;
                }
                this.activeOnConfirm({ mode: 'scheduled', isActive, nextResetAt, takeSnapshot }, btnSubmitSchedReset);
                return;
            }
        }
        // ── /Workspace Resize & Reset Modal interactions ───────────────────────

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

        const openCreateCustomPaletteBtn = e.target.closest('[data-action="openCreateCustomPaletteModal"], [data-action="navigateCustomPaletteModal"]');
        if (openCreateCustomPaletteBtn) {
            e.preventDefault();
            this.show('createCustomPaletteModal', {
                onCreated: (newPalette) => {
                    if (this.activeBox) {
                        const grid = this.activeBox.querySelector('[data-ref="modal_palette_grid"]');
                        if (grid) {
                            const newCardHtml = `
                                <div class="component-modal-palette-card active selected" data-action="selectModalPaletteCard" data-palette-id="${newPalette.palette_key}" data-palette-name="${newPalette.name}">
                                    <div class="component-modal-palette-card-header">
                                        <div class="component-modal-palette-title-group">
                                            <span class="material-symbols-rounded">palette</span>
                                            <span class="component-modal-palette-name">${newPalette.name}</span>
                                        </div>
                                        <div class="component-modal-palette-badges"></div>
                                    </div>
                                    <div class="component-modal-palette-swatches">
                                        ${newPalette.colors.map(c => `<div class="component-modal-palette-swatch" style="background-color: ${c.hex || c};"></div>`).join('')}
                                    </div>
                                    <span class="component-modal-palette-check material-symbols-rounded">check_circle</span>
                                </div>
                            `;
                            grid.querySelectorAll('.component-modal-palette-card').forEach(c => {
                                c.classList.remove('active');
                                c.classList.remove('selected');
                            });
                            grid.insertAdjacentHTML('afterbegin', newCardHtml);
                            const selectedIdHolder = this.activeBox.querySelector('[data-ref="selected_palette_id"]');
                            if (selectedIdHolder) selectedIdHolder.setAttribute('data-value', newPalette.palette_key);
                        }
                    }
                }
            });
            return;
        }

        const btnPaletteNext = e.target.closest('[data-action="customPaletteNextStep"]');
        if (btnPaletteNext && this.activeBox) {
            e.preventDefault();
            const nameInput = this.activeBox.querySelector('[data-ref="custom_palette_name"]');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                showMessage(window.__('msg_palette_name_required') || 'El nombre de la paleta es requerido.', 'warning');
                return;
            }
            const titleDisplay = this.activeBox.querySelector('[data-ref="custom_palette_title_display"]');
            if (titleDisplay) titleDisplay.textContent = name;

            const step1 = this.activeBox.querySelector('[data-ref="custom-palette-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            if (step1 && step2) {
                step1.classList.replace('active', 'disabled');
                step2.classList.replace('disabled', 'active');
            }
            return;
        }

        const btnPalettePrev = e.target.closest('[data-action="customPalettePrevStep"]');
        if (btnPalettePrev && this.activeBox) {
            e.preventDefault();
            const step1 = this.activeBox.querySelector('[data-ref="custom-palette-step-1"]');
            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            if (step1 && step2) {
                step2.classList.replace('active', 'disabled');
                step1.classList.replace('disabled', 'active');
            }
            return;
        }

        const btnAddColor = e.target.closest('[data-action="openAddPaletteColor"]');
        if (btnAddColor && this.activeBox) {
            e.preventDefault();
            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            if (!step2) return;
            const currentColors = JSON.parse(step2.getAttribute('data-colors') || '[]');
            if (currentColors.length >= 36) {
                showMessage(window.__('err_palette_incomplete') || 'Máximo 36 colores permitidos.', 'warning');
                return;
            }

            this.show('editPaletteColorModal', {
                hex: '#3B82F6',
                title: window.__('canvas_palette_color_add_title') || 'Añadir Color',
                desc: window.__('canvas_palette_color_add_desc') || 'Selecciona el nuevo tono para añadirlo a tu paleta personalizada.',
                confirmText: window.__('btn_add_to_palette') || 'Añadir Color'
            }).then(res => {
                if (res && res.confirmed) {
                    let hex = (res.data?.selected_hex || '#3B82F6').toUpperCase();
                    if (!hex.startsWith('#')) hex = '#' + hex;
                    currentColors.push(hex);
                    this._renderCustomPaletteSwatches(this.activeBox, currentColors);
                }
            });
            return;
        }

        const btnRemoveColor = e.target.closest('[data-action="removePaletteColorItem"]');
        if (btnRemoveColor && this.activeBox) {
            e.preventDefault();
            e.stopPropagation();
            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            if (!step2) return;
            const currentColors = JSON.parse(step2.getAttribute('data-colors') || '[]');
            if (currentColors.length <= 4) {
                showMessage(window.__('err_palette_min_colors') || 'La paleta debe tener al menos 4 colores.', 'warning');
                return;
            }
            const idx = parseInt(btnRemoveColor.getAttribute('data-index'), 10);
            if (!isNaN(idx) && idx >= 0 && idx < currentColors.length) {
                currentColors.splice(idx, 1);
                this._renderCustomPaletteSwatches(this.activeBox, currentColors);
            }
            return;
        }

        const btnEditColor = e.target.closest('[data-action="editPaletteColorItem"]');
        if (btnEditColor && this.activeBox && !e.target.closest('[data-action="removePaletteColorItem"]')) {
            e.preventDefault();
            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            if (!step2) return;
            const currentColors = JSON.parse(step2.getAttribute('data-colors') || '[]');
            const idx = parseInt(btnEditColor.getAttribute('data-index'), 10);
            const currentHex = btnEditColor.getAttribute('data-hex') || currentColors[idx] || '#3B82F6';

            this.show('editPaletteColorModal', {
                hex: currentHex,
                title: window.__('canvas_palette_color_modal_title') || 'Ajustar Color',
                desc: window.__('canvas_palette_color_modal_desc') || 'Ajusta el tono de este color.',
                confirmText: window.__('btn_save') || 'Guardar'
            }).then(res => {
                if (res && res.confirmed) {
                    let hex = (res.data?.selected_hex || currentHex).toUpperCase();
                    if (!hex.startsWith('#')) hex = '#' + hex;
                    currentColors[idx] = hex;
                    this._renderCustomPaletteSwatches(this.activeBox, currentColors);
                }
            });
            return;
        }

        const btnSubmitCustomPalette = e.target.closest('[data-action="submitCustomPalette"]');
        if (btnSubmitCustomPalette && this.activeBox) {
            e.preventDefault();
            const nameInput = this.activeBox.querySelector('[data-ref="custom_palette_name"]');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                showMessage(window.__('msg_palette_name_required') || 'El nombre de la paleta es requerido.', 'warning');
                return;
            }

            const step2 = this.activeBox.querySelector('[data-ref="custom-palette-step-2"]');
            const colors = step2 ? JSON.parse(step2.getAttribute('data-colors') || '[]') : [];
            if (colors.length < 4) {
                showMessage(window.__('err_palette_min_colors') || 'La paleta debe tener al menos 4 colores.', 'warning');
                return;
            }

            setButtonLoading(btnSubmitCustomPalette);
            const api = new ApiService();
            api.post(ApiRoutes.Canvases.CreateCustomPalette, { name, colors })
                .then(res => {
                    restoreButton(btnSubmitCustomPalette);
                    if (res && res.success) {
                        const paletteKey = res.data?.palette_key || ('custom_' + Date.now());
                        const newPalette = {
                            palette_key: paletteKey,
                            id: paletteKey,
                            name: name,
                            name_key: name,
                            colors: colors.map(c => ({ hex: c }))
                        };

                        window.APP_CUSTOM_PALETTES = window.APP_CUSTOM_PALETTES || [];
                        window.APP_CUSTOM_PALETTES.push({
                            palette_key: paletteKey,
                            name: name,
                            colors: colors
                        });

                        showMessage(res.message || window.__('msg_palette_created') || 'Paleta creada exitosamente.', 'success');
                        
                        window.dispatchEvent(new CustomEvent('customPaletteCreated', { detail: newPalette }));

                        if (typeof this.activeCustomPaletteCallback === 'function') {
                            this.activeCustomPaletteCallback(newPalette);
                        }

                        this.closeCurrent(true);
                    } else {
                        showMessage(res?.message || window.__('err_palette_create_failed') || 'Error al crear la paleta.', 'error');
                    }
                })
                .catch(err => {
                    restoreButton(btnSubmitCustomPalette);
                    showMessage(window.__('err_palette_create_failed') || 'Error al crear la paleta.', 'error');
                });
            return;
        }

        const btnToggleSecret = e.target.closest('[data-action="toggle2FASecretKey"]');
        if (btnToggleSecret && this.activeBox) {
            e.preventDefault();
            const container = this.activeBox.querySelector('[data-ref="2fa_secret_key_container"]');
            if (container) {
                const isHidden = container.classList.contains('disabled');
                if (isHidden) {
                    container.classList.replace('disabled', 'active');
                    btnToggleSecret.textContent = window.__('btn_hide_secret_key') || 'Ocultar clave secreta';
                } else {
                    container.classList.replace('active', 'disabled');
                    btnToggleSecret.textContent = window.__('btn_show_secret_key') || 'Mostrar clave secreta';
                }
            }
            return;
        }

        const btnCopySecret = e.target.closest('[data-action="copy2FASecretKey"]');
        if (btnCopySecret && this.activeBox) {
            e.preventDefault();
            const textEl = this.activeBox.querySelector('[data-ref="2fa_secret_key_text"]');
            const secret = textEl ? (textEl.getAttribute('data-secret') || textEl.textContent.trim()) : '';
            if (secret && secret !== '...') {
                copyToClipboard(secret).then(() => {
                    showMessage(window.__('btn_copied') || 'Copiado al portapapeles', 'info');
                });
            }
            return;
        }

        const btnSubmitEnable2fa = e.target.closest('[data-action="submitSetupEnable2FA"]');
        if (btnSubmitEnable2fa && this.activeBox) {
            e.preventDefault();
            const inputCode = this.activeBox.querySelector('[data-ref="2fa_setup_totp_code"]');
            const code = inputCode ? inputCode.value.trim() : '';
            if (code.length !== 6) {
                showMessage(window.__('err_code_6_digits') || 'El código debe tener 6 dígitos', 'warning');
                return;
            }

            setButtonLoading(btnSubmitEnable2fa);
            const api = new ApiService();
            api.post(ApiRoutes.Settings.Enable2FA, { code })
                .then(res => {
                    restoreButton(btnSubmitEnable2fa);
                    if (res && res.success) {
                        showMessage(res.message || window.__('msg_2fa_enabled_success') || '2FA habilitado correctamente', 'success');
                        const step1 = this.activeBox.querySelector('[data-ref="2fa-setup-step-1"]');
                        const step2 = this.activeBox.querySelector('[data-ref="2fa-setup-step-2-recovery"]');
                        if (step1 && step2) {
                            step1.classList.replace('active', 'disabled');
                            step2.classList.replace('disabled', 'active');
                        }
                        const grid = this.activeBox.querySelector('[data-ref="2fa-recovery-codes-grid"]');
                        if (grid && Array.isArray(res.recovery_codes)) {
                            grid.innerHTML = res.recovery_codes.map(c => `
                                <div class="component-recovery-code">
                                    <span class="material-symbols-rounded component-recovery-code-icon">key</span>
                                    <span class="component-recovery-code-text">${c}</span>
                                </div>
                            `).join('');
                            this._currentSetupRecoveryCodes = res.recovery_codes.join('\n');
                        }
                        window.dispatchEvent(new CustomEvent('2faStatusChanged', { detail: { active: true } }));
                    } else {
                        showMessage(res?.message || window.__('err_invalid_2fa_code') || 'Código inválido', 'error');
                    }
                })
                .catch(() => {
                    restoreButton(btnSubmitEnable2fa);
                    showMessage(window.__('err_connection') || 'Error de conexión', 'error');
                });
            return;
        }

        const btnCopySetupCodes = e.target.closest('[data-action="copySetupRecoveryCodes"]');
        if (btnCopySetupCodes) {
            e.preventDefault();
            if (this._currentSetupRecoveryCodes) {
                copyToClipboard(this._currentSetupRecoveryCodes).then(() => {
                    showMessage(window.__('btn_copied') || 'Códigos copiados', 'info');
                });
            }
            return;
        }

        const btnFinish2fa = e.target.closest('[data-action="finishSetup2FA"]');
        if (btnFinish2fa) {
            e.preventDefault();
            this.closeCurrent(true);
            window.dispatchEvent(new CustomEvent('2faStatusChanged', { detail: { active: true, remainingCodes: 10 } }));
            return;
        }

        const btnManageRegen = e.target.closest('[data-action="manageRegenerateRecoveryCodes"]');
        if (btnManageRegen) {
            e.preventDefault();
            this.closeCurrent(false);
            this.show('confirmPasswordModal', {
                title: window.__('2fa_recovery_title') || 'Regenerar códigos',
                desc: window.__('2fa_recovery_verify_desc') || 'Ingresa tu contraseña actual para generar nuevos códigos de recuperación.',
                asyncConfirm: true
            }).then(async (dialog) => {
                if (dialog && dialog.confirmed) {
                    const password = dialog.data?.confirmSecPasswordInput || dialog.data?.password || dialog.data?.current_password || '';
                    const credential = dialog.data?.credential || dialog.data?.google_token || '';
                    if (!password && !credential) {
                        dialog.failure(window.__('err_identity_verification_required') || window.__('err_password_required') || 'Debes ingresar tu contraseña o verificar con Google');
                        return;
                    }
                    const api = new ApiService();
                    try {
                        const payload = credential ? { credential, google_token: credential } : { password };
                        const res = await api.post(ApiRoutes.Settings.RegenerateRecoveryCodes, payload);
                        if (res && res.success) {
                            dialog.success();
                            const remaining = Array.isArray(res.recovery_codes) ? res.recovery_codes.length : 10;
                            window.dispatchEvent(new CustomEvent('2faStatusChanged', { detail: { active: true, remainingCodes: remaining } }));
                            this.show('recoveryCodesDisplayModal', {
                                recovery_codes: res.recovery_codes || []
                            });
                        } else {
                            dialog.failure(res?.message || 'Error al regenerar códigos');
                        }
                    } catch (err) {
                        dialog.failure(window.__('err_connection') || 'Error de conexión');
                    }
                }
            });
            return;
        }

        const btnManageDisable = e.target.closest('[data-action="manageDisable2FA"]');
        if (btnManageDisable) {
            e.preventDefault();
            this.closeCurrent(false);
            this.show('confirmPasswordModal', {
                title: window.__('2fa_deactivate_title') || 'Desactivar 2FA',
                desc: window.__('2fa_deactivate_warning') || 'Ingresa tu contraseña para confirmar la desactivación de la autenticación en dos pasos.',
                confirmText: window.__('btn_deactivate') || 'Desactivar',
                confirmDanger: true,
                asyncConfirm: true
            }).then(async (dialog) => {
                if (dialog && dialog.confirmed) {
                    const password = dialog.data?.confirmSecPasswordInput || dialog.data?.password || dialog.data?.current_password || '';
                    const credential = dialog.data?.credential || dialog.data?.google_token || '';
                    if (!password && !credential) {
                        dialog.failure(window.__('err_identity_verification_required') || window.__('err_password_required') || 'Debes ingresar tu contraseña o verificar con Google');
                        return;
                    }
                    const api = new ApiService();
                    try {
                        const payload = credential ? { credential, google_token: credential } : { password };
                        const res = await api.post(ApiRoutes.Settings.Disable2FA, payload);
                        if (res && res.success) {
                            dialog.success();
                            showMessage(res.message || window.__('msg_2fa_disabled_success') || '2FA desactivado correctamente', 'success');
                            window.dispatchEvent(new CustomEvent('2faStatusChanged', { detail: { active: false, remainingCodes: 0 } }));
                        } else {
                            dialog.failure(res?.message || 'Error al desactivar 2FA');
                        }
                    } catch (err) {
                        dialog.failure(window.__('err_connection') || 'Error de conexión');
                    }
                }
            });
            return;
        }

        const btnCopyDisplayCodes = e.target.closest('[data-action="copyDisplayRecoveryCodes"]');
        if (btnCopyDisplayCodes) {
            e.preventDefault();
            const codes = btnCopyDisplayCodes.getAttribute('data-codes') || '';
            if (codes) {
                copyToClipboard(codes).then(() => {
                    showMessage(window.__('btn_copied') || 'Códigos copiados', 'info');
                });
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

    _renderCustomPaletteSwatches(box, colors) {
        if (!box) return;
        const grid = box.querySelector('[data-ref="customPaletteSwatchesGrid"]');
        const countEl = box.querySelector('[data-ref="customPaletteColorCount"]');
        const step2 = box.querySelector('[data-ref="custom-palette-step-2"]');
        if (step2) step2.setAttribute('data-colors', JSON.stringify(colors));
        if (countEl) countEl.textContent = `${colors.length} / 36`;

        if (!grid) return;
        const __ = typeof window.__ === 'function' ? window.__ : (k => k);
        let swatchesHtml = '';
        colors.forEach((hex, idx) => {
            swatchesHtml += `
                <div class="component-palette-swatch-card" data-action="editPaletteColorItem" data-index="${idx}" data-hex="${hex}">
                    <button type="button" class="component-palette-swatch-card__delete" data-action="removePaletteColorItem" data-index="${idx}" title="${__('delete') || 'Eliminar'}">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                    <div class="component-palette-swatch-card__preview" style="background-color: ${hex};"></div>
                    <span class="component-palette-swatch-card__hex">${hex}</span>
                </div>
            `;
        });

        const addBtnDisabled = colors.length >= 36 ? ' disabled-interaction' : '';
        const addBtnHtml = `
            <div class="component-palette-swatch-card--add${addBtnDisabled}" data-action="openAddPaletteColor" data-ref="btnAddPaletteColor">
                <span class="material-symbols-rounded">add</span>
                <span class="component-palette-swatch-card--add__text">${__('btn_add_to_palette') || 'Añadir Color'}</span>
            </div>
        `;
        grid.innerHTML = swatchesHtml + addBtnHtml;
    }
}