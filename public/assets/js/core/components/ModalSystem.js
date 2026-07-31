import { ModalTemplates } from './ModalTemplates.js';
import { CalendarSystem } from './CalendarSystem.js';
import { showMessage } from '../utils/uiUtils.js';

export class ModalSystem {
    constructor() {
        this.templates = ModalTemplates;

        this.activeResolveFn = null;
        this.activeWrapper = null;
        this.activeOverlay = null;
        this.activeBox = null;
        this.calendarSystem = null;
        this.modalStack = [];

        this.dragState = { startY: 0, currentDiff: 0, isDragging: false };

        this.handleClickBound = this.handleClick.bind(this);
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        
        this.initialized = false;

        this.init();
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
    }

    destroy() {
        this.closeCurrent(false);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('pointerdown', this.handlePointerDownBound);
        document.removeEventListener('pointermove', this.handlePointerMoveBound);
        document.removeEventListener('pointerup', this.handlePointerUpBound);
        document.removeEventListener('pointercancel', this.handlePointerUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        
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

            if (this.activeResolveFn) {
                if (!this.modalStack) this.modalStack = [];
                if (this.activeOverlay) this.activeOverlay.style.display = 'none';
                if (this.activeWrapper) this.activeWrapper.style.display = 'none';
                this.modalStack.push({
                    templateName: this.activeTemplateName,
                    resolveFn: this.activeResolveFn,
                    overlay: this.activeOverlay,
                    wrapper: this.activeWrapper,
                    box: this.activeBox,
                    calendarSystem: this.calendarSystem,
                    dragState: Object.assign({}, this.dragState)
                });
                this.activeResolveFn = null;
                this.activeOverlay = null;
                this.activeWrapper = null;
                this.activeBox = null;
                this.calendarSystem = null;
            }

            this.activeTemplateName = templateName;

            const container = this._getContainer();

            const template = this.templates[templateName];

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

            if (template.customClass) {
                this.activeBox.classList.add(template.customClass);
            }
            this.activeBox.innerHTML = template.build(data);
            
            this.activeWrapper.appendChild(this.activeBox);

            if (!template.fullScreen && !template.hideCloseBtn) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'component-modal-close-btn';
                closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
                this.activeWrapper.appendChild(closeBtn);
            }

            this.activeOverlay.appendChild(this.activeWrapper);
            container.appendChild(this.activeOverlay);

            requestAnimationFrame(() => this.activeOverlay.classList.add('active'));

            this.activeResolveFn = resolve;
        });
    }

    handleKeyDown(e) {
        if (!this.activeResolveFn) return;

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
                    '#btn_confirm_custom_backup'
                );

                if (confirmBtn && !confirmBtn.disabled && !confirmBtn.classList.contains('disabled') && !confirmBtn.classList.contains('disabled-interaction')) {
                    e.preventDefault();
                    confirmBtn.click();
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.closeCurrent(false);
        }
    }

    handleClick(e) {
        if (!this.activeResolveFn) return; 

        const closeBtn = e.target.closest('.component-modal-close-btn');
        if (closeBtn) {
            this.closeCurrent(false);
            return;
        }

        const btnAdjustHours = e.target.closest('[data-action="adjustCalendarHours"]');
        if (btnAdjustHours) {
            e.preventDefault();
            const step = parseInt(btnAdjustHours.getAttribute('data-step')) || 0;
            const centerEl = this.activeBox.querySelector('[data-ref="calendar-modal-hours-val"]');
            if (centerEl) {
                let val = parseInt(centerEl.getAttribute('data-val')) || 0;
                val = (val + step) % 24;
                if (val < 0) val += 24;
                centerEl.setAttribute('data-val', val);
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
                let val = parseInt(centerEl.getAttribute('data-val')) || 0;
                val = (val + step) % 60;
                if (val < 0) val += 60;
                centerEl.setAttribute('data-val', val);
                centerEl.textContent = String(val).padStart(2, '0');
            }
            return;
        }

        const toggleModuleBtn = e.target.closest('[data-action="toggleModule"]');
        if (toggleModuleBtn) {
            const target = toggleModuleBtn.getAttribute('data-target');

            if (target === 'modalCalendarDateOnly' && this.activeBox) {
                if (!this.calendarSystem) {
                    this.calendarSystem = new CalendarSystem(this.activeBox);
                    this.calendarSystem.disablePastDates = true;
                    this.calendarSystem.init();
                }
                const trigger = this.activeBox.querySelector('[data-target="modalCalendarDateOnly"]');
                const initialVal = trigger ? trigger.getAttribute('data-val') : '';
                this.calendarSystem.setup(
                    initialVal,
                    (isoString, displayString) => {
                        if (trigger) trigger.setAttribute('data-val', isoString);
                        const textEl = this.activeBox.querySelector('[data-ref="modal-calendar-date-text"]');
                        if (textEl) {
                            textEl.textContent = displayString.split(',')[0];
                        }
                    },
                    () => {
                        if (trigger) trigger.setAttribute('data-val', '');
                        const textEl = this.activeBox.querySelector('[data-ref="modal-calendar-date-text"]');
                        if (textEl) textEl.textContent = typeof window.__ === 'function' ? window.__('lbl_select_date') : 'Seleccionar fecha';
                    }
                );
            }
        }

        const btnOpenSanctionCalendar = e.target.closest('[data-action="openSanctionCalendarModal"]');
        if (btnOpenSanctionCalendar) {
            e.preventDefault();
            const currentVal = btnOpenSanctionCalendar.getAttribute('data-val') || '';
            const typeTrigger = this.activeBox.querySelector('[data-ref="suspension_type"]');
            const sanctionType = typeTrigger ? typeTrigger.getAttribute('data-val') : 'temporary';
            if (sanctionType === 'permanent') {
                return;
            }

            let hours = '00';
            let minutes = '00';
            if (currentVal) {
                const parts = currentVal.split('T');
                if (parts[1]) {
                    const timeParts = parts[1].split(':');
                    hours = (timeParts[0] || '00').padStart(2, '0');
                    minutes = (timeParts[1] || '00').padStart(2, '0');
                }
            }

            this.show('calendarModal', {
                isoDate: currentVal,
                hours: hours,
                minutes: minutes
            }).then(res => {
                if (res && res.confirmed) {
                    const data = res.data || {};
                    if (data.isoString) {
                        btnOpenSanctionCalendar.setAttribute('data-val', data.isoString);
                        const textEl = this.activeBox.querySelector('[data-ref="sanction-endDate-text"]');
                        if (textEl) {
                            textEl.textContent = data.displayString;
                        }
                    } else {
                        btnOpenSanctionCalendar.setAttribute('data-val', '');
                        const textEl = this.activeBox.querySelector('[data-ref="sanction-endDate-text"]');
                        if (textEl) {
                            textEl.textContent = typeof window.__ === 'function' ? window.__('lbl_select_expiration_date') : 'Seleccionar fecha de expiración';
                        }
                    }
                }
            });
            return;
        }

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
                    inp.setAttribute('data-val', val);
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
                if (trigger) trigger.setAttribute('data-val', val);

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
                        endDateGroup.style.display = (val === 'temporary') ? 'block' : 'none';
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

        // Dropdown toggling inside modals
        const btnToggleDropdown = e.target.closest('[data-action="toggleDropdown"]');
        if (btnToggleDropdown) {
            e.preventDefault();
            const targetId = btnToggleDropdown.getAttribute('data-target');
            const targetDropdown = this.activeBox.querySelector(`[data-module="${targetId}"]`);
            
            this.activeBox.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
                if (el !== targetDropdown) {
                    el.classList.remove('active');
                    el.classList.add('disabled');
                }
            });

            if (targetDropdown) {
                if (targetDropdown.classList.contains('disabled')) {
                    targetDropdown.classList.remove('disabled');
                    targetDropdown.classList.add('active');
                } else {
                    targetDropdown.classList.remove('active');
                    targetDropdown.classList.add('disabled');
                }
            }
            return;
        }

        // Dropdown value selection inside modals
        const btnSelectValue = e.target.closest('[data-action="selectValue"]');
        if (btnSelectValue) {
            e.preventDefault();
            const type = btnSelectValue.getAttribute('data-type');
            const value = btnSelectValue.getAttribute('data-value');
            const label = btnSelectValue.getAttribute('data-label');
            const icon = btnSelectValue.getAttribute('data-icon');

            if (type === 'size') {
                const sizeTrigger = this.activeBox.querySelector('[data-ref="sandbox_size"]');
                if (sizeTrigger) {
                    sizeTrigger.setAttribute('data-val', value);
                }
                const widthInput = this.activeBox.querySelector('#sandbox_width');
                const heightInput = this.activeBox.querySelector('#sandbox_height');
                if (widthInput && heightInput && value) {
                    const parts = value.split('x');
                    widthInput.value = parts[0];
                    heightInput.value = parts[1];
                }
            } else if (type === 'palette') {
                const paletteTrigger = this.activeBox.querySelector('[data-ref="sandbox_palette"]');
                if (paletteTrigger) {
                    paletteTrigger.setAttribute('data-val', value);
                }
                const paletteInput = this.activeBox.querySelector('#sandbox_palette');
                if (paletteInput) {
                    paletteInput.value = value;
                }
            } else if (type === 'template') {
                const templateTrigger = this.activeBox.querySelector('[data-ref="sandbox_template_id"]');
                if (templateTrigger) {
                    templateTrigger.setAttribute('data-val', value);
                }
            }

            const menu = btnSelectValue.closest('.component-menu-list');
            if (menu) {
                menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
                btnSelectValue.classList.add('active');
            }

            const dropdownWrapper = btnSelectValue.closest('.component-dropdown-wrapper');
            if (dropdownWrapper) {
                const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
                if (triggerText) {
                    triggerText.textContent = label;
                }
                const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger span:first-child');
                if (triggerIcon && icon) {
                    triggerIcon.textContent = icon;
                }
                const targetModule = dropdownWrapper.querySelector('.component-module--dropdown');
                if (targetModule) {
                    targetModule.classList.remove('active');
                    targetModule.classList.add('disabled');
                }
            }
            return;
        }

        // Stepper controls inside modals (e.g. cooldown Batch adjust)
        const btnAdjustSandboxCooldown = e.target.closest('[data-action="adjustSandboxCooldownBatch"]');
        if (btnAdjustSandboxCooldown) {
            e.preventDefault();
            const step = parseInt(btnAdjustSandboxCooldown.getAttribute('data-step'), 10);
            const min = parseInt(btnAdjustSandboxCooldown.getAttribute('data-min') || '1', 10);
            const max = parseInt(btnAdjustSandboxCooldown.getAttribute('data-max') || '1000', 10);
            
            const valEl = this.activeBox.querySelector('#sandbox_cooldown_batch_val') || this.activeBox.querySelector('[data-ref="sandbox_cooldown_batch"]');
            const inputEl = this.activeBox.querySelector('#sandbox_cooldown_batch');
            if (valEl) {
                let curVal = parseInt(valEl.getAttribute('data-val') || '100', 10);
                let newVal = curVal + step;
                if (newVal < min) newVal = min;
                if (newVal > max) newVal = max;
                
                valEl.setAttribute('data-val', newVal);
                valEl.textContent = newVal;
                
                if (inputEl) {
                    inputEl.value = newVal;
                }
            }
            return;
        }

        // Sandbox multi-stage modal navigation
        const btnNextStage = e.target.closest('[data-action="nextStage"]');
        if (btnNextStage) {
            e.preventDefault();
            localStorage.setItem('rosaura_sandbox_onboarded', 'true');
            const stage1 = this.activeBox.querySelector('.component-modal-stage[data-stage="1"]');
            const stage2 = this.activeBox.querySelector('.component-modal-stage[data-stage="2"]');
            if (stage1 && stage2) {
                stage1.classList.remove('active');
                stage2.classList.add('active');
            }
            return;
        }

        const btnGoCreateForm = e.target.closest('[data-action="goCreateForm"]');
        if (btnGoCreateForm) {
            e.preventDefault();
            const stage2 = this.activeBox.querySelector('.component-modal-stage[data-stage="2"]');
            const stage3 = this.activeBox.querySelector('.component-modal-stage[data-stage="3"]');
            if (stage2 && stage3) {
                stage2.classList.remove('active');
                stage3.classList.add('active');
            }
            const actionInput = this.activeBox.querySelector('[data-ref="sandbox_action"]');
            if (actionInput) actionInput.setAttribute('data-val', 'create_new');
            return;
        }

        const btnBackToLobby = e.target.closest('[data-action="backToLobby"]');
        if (btnBackToLobby) {
            e.preventDefault();
            const stage2 = this.activeBox.querySelector('.component-modal-stage[data-stage="2"]');
            const stage3 = this.activeBox.querySelector('.component-modal-stage[data-stage="3"]');
            if (stage2 && stage3) {
                stage3.classList.remove('active');
                stage2.classList.add('active');
            }
            const actionInput = this.activeBox.querySelector('[data-ref="sandbox_action"]');
            if (actionInput) actionInput.setAttribute('data-val', 'play_existing');
            return;
        }

        const btnSelectSandbox = e.target.closest('[data-action="selectSandbox"]');
        if (btnSelectSandbox) {
            e.preventDefault();
            
            this.activeBox.querySelectorAll('[data-action="selectSandbox"]').forEach(row => {
                row.classList.remove('active');
            });
            btnSelectSandbox.classList.add('active');
            
            const uuid = btnSelectSandbox.getAttribute('data-uuid');
            const name = btnSelectSandbox.getAttribute('data-name');
            const size = btnSelectSandbox.getAttribute('data-size');
            const palette = btnSelectSandbox.getAttribute('data-palette');
            const thumbnail = btnSelectSandbox.getAttribute('data-thumbnail');
            
            const uuidInput = this.activeBox.querySelector('[data-ref="selected_sandbox_uuid"]');
            if (uuidInput) uuidInput.setAttribute('data-val', uuid);
            
            const actionInput = this.activeBox.querySelector('[data-ref="sandbox_action"]');
            if (actionInput) actionInput.setAttribute('data-val', 'play_existing');
            
            const previewCardWrapper = this.activeBox.querySelector('[data-ref="previewCardWrapper"]');
            if (previewCardWrapper) {
                const hasThumb = thumbnail && thumbnail !== 'null' && thumbnail !== '';
                previewCardWrapper.innerHTML = `
                    <div class="sandbox-preview-card" style="width: 100%; border: 1px solid var(--border-color); border-radius: 16px; padding: 16px; text-align: left; display: flex; flex-direction: column; gap: 16px; background: var(--bg-surface-elevated); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div class="sandbox-preview-thumb-container" style="width: 100%; height: 160px; border-radius: 12px; background: var(--bg-hover-light); overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">
                            ${hasThumb ? `<img src="${thumbnail}" style="width: 100%; height: 100%; object-fit: contain;">` : `<span class="material-symbols-rounded" style="font-size: 64px; opacity: 0.3; color: var(--text-primary);">science</span>`}
                        </div>
                        <div class="sandbox-preview-details" style="display: flex; flex-direction: column; gap: 4px;">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">${name}</h3>
                            <span style="font-size: 13px; color: var(--text-secondary);">Lienzo local: ${size}</span>
                            <span style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">Paleta: ${palette}</span>
                        </div>
                    </div>
                `;
            }
            
            const playBtn = this.activeBox.querySelector('.sandbox-play-btn');
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.classList.remove('disabled');
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
            } else if (action === 'confirm') {
                this.closeCurrent(true);
            } else {
                this.closeCurrent(action || true);
            }
            return;
        }

        if (e.target === this.activeOverlay || e.target === this.activeWrapper) {
            this.closeCurrent(false);
        }
    }

    closeCurrent(result = false) {
        if (!this.activeResolveFn) return;

        let formData = {};
        
        try {
            if (result !== false && this.activeBox) {
                if (this.activeTemplateName === 'calendarModal') {
                    const trigger = this.activeBox.querySelector('[data-target="modalCalendarDateOnly"]');
                    const isoDateVal = trigger ? trigger.getAttribute('data-val') : '';
                    const hoursEl = this.activeBox.querySelector('[data-ref="calendar-modal-hours-val"]');
                    const minutesEl = this.activeBox.querySelector('[data-ref="calendar-modal-minutes-val"]');
                    
                    if (isoDateVal) {
                        const datePart = isoDateVal.split('T')[0]; // YYYY-MM-DD
                        const h = hoursEl ? hoursEl.getAttribute('data-val').padStart(2, '0') : '00';
                        const m = minutesEl ? minutesEl.getAttribute('data-val').padStart(2, '0') : '00';
                        
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
                                return;
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

                // Collect elements with data-val (like custom dropdown triggers)
                const valElements = this.activeBox.querySelectorAll('[data-val]');
                valElements.forEach(el => {
                    const key = el.getAttribute('name') || el.getAttribute('data-ref');
                    if (key && !key.endsWith('-val') && !key.includes('val_') && !formData[key]) {
                        formData[key] = el.getAttribute('data-val');
                    }
                });
            }
        } catch (error) {
            
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

        resolveToCall({ confirmed: result !== false, action: result, data: formData });

        if (this.modalStack && this.modalStack.length > 0) {
            const prevModal = this.modalStack.pop();
            this.activeTemplateName = prevModal.templateName;
            this.activeResolveFn = prevModal.resolveFn;
            this.activeOverlay = prevModal.overlay;
            this.activeWrapper = prevModal.wrapper;
            this.activeBox = prevModal.box;
            this.calendarSystem = prevModal.calendarSystem;
            this.dragState = prevModal.dragState;

            if (this.activeOverlay) this.activeOverlay.style.display = '';
            if (this.activeWrapper) this.activeWrapper.style.display = '';
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

    handlePointerDown(e) {
        if (!this.activeResolveFn) return; 
        if (window.innerWidth > 768) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return; 

        const dragHandle = e.target.closest('.pill-container');
        if (!dragHandle || !this.activeBox.contains(dragHandle)) return;

        this.dragState.isDragging = true;
        this.dragState.startY = e.clientY;
        
        if (this.activeOverlay) this.activeOverlay.classList.add('is-dragging');
        if (this.activeWrapper) this.activeWrapper.setPointerCapture(e.pointerId);
    }

    handlePointerMove(e) {
        if (!this.dragState.isDragging || !this.activeWrapper) return;
        this.dragState.currentDiff = e.clientY - this.dragState.startY;
        
        if (this.dragState.currentDiff > 0) {
            this.activeWrapper.style.transform = `translateY(${this.dragState.currentDiff}px)`;
        }
    }

    handlePointerUp(e) {
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
}