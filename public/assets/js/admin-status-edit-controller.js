// public/assets/js/admin-status-edit-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminStatusEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        
        // Estado inicial de las variables lógicas independientes
        this.state = {
            status: 'active',
            deletedBy: 'admin',
            deletedReasonAdmin: 'Violación de políticas',
            deletedReasonUser: '',

            isSuspended: '0', 
            suspendedType: 'temporary',
            suspensionReason: 'Violación de políticas',
            endDate: '' // Guardará YYYY-MM-DDTHH:mm
        };

        // Estado interno del calendario custom
        this.currentCalendarDate = new Date();
        this.selectedCalendarDate = null;

        this.maps = {
            status: { 'active': 'Activa', 'deleted': 'Eliminada' },
            deletedBy: { 'user': 'Por el usuario', 'admin': 'Administrativa' },
            isSuspended: { '0': 'Cuenta sin restricciones', '1': 'Cuenta con suspensión' },
            suspendedType: { 'temporary': 'Suspensión temporal', 'permanent': 'Suspensión permanente' }
        };
    }

    init() {
        this.bindEvents();
        if (window.location.pathname.includes('/admin/edit-status')) {
            this.handleLoad();
        }
    }

    handleLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        this.targetUserId = urlParams.get('id');
        if (this.targetUserId) {
            this.loadUserData();
        } else {
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    bindEvents() {
        window.addEventListener('viewLoaded', (e) => {
            if (e.detail.url.includes('/admin/edit-status')) this.handleLoad();
        });

        document.addEventListener('click', (e) => {
            if (!window.location.pathname.includes('/admin/edit-status')) return;

            // Lógica Menús
            const btnToggleModule = e.target.closest('[data-action="adminToggleModule"]');
            if (btnToggleModule && !btnToggleModule.classList.contains('disabled-interaction')) {
                const target = btnToggleModule.getAttribute('data-target');
                
                // Si abren el calendario, reiniciamos el view al mes seleccionado o actual
                if (target === 'adminModuleCalendar') {
                    this.currentCalendarDate = this.selectedCalendarDate ? new Date(this.selectedCalendarDate) : new Date();
                    this.renderCalendar();
                }

                if (window.appInstance) window.appInstance.toggleModule(target);
            }

            const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
            if (btnSetDropdown) {
                const key = btnSetDropdown.getAttribute('data-key');
                const val = btnSetDropdown.getAttribute('data-value');
                this.state[key] = val;
                
                const module = btnSetDropdown.closest('.component-module');
                if (module && window.appInstance) window.appInstance.closeModule(module);
                
                this.syncVisuals();
                this.renderUI();
            }

            // Lógica Calendario Custom
            const btnCalPrev = e.target.closest('[data-action="calendarPrevMonth"]');
            const btnCalNext = e.target.closest('[data-action="calendarNextMonth"]');
            const btnCalDay = e.target.closest('[data-action="calendarSelectDay"]');
            const btnCalConfirm = e.target.closest('[data-action="calendarConfirm"]');
            const btnCalCancel = e.target.closest('[data-action="calendarCancel"]');
            const btnCalClear = e.target.closest('[data-action="calendarClear"]');

            if (btnCalPrev) this.changeCalendarMonth(-1);
            if (btnCalNext) this.changeCalendarMonth(1);
            if (btnCalDay) this.selectCalendarDay(btnCalDay);
            if (btnCalConfirm) this.confirmCalendar();
            if (btnCalClear) this.clearCalendar();
            
            if (btnCalCancel) {
                if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleCalendar"]'));
            }

            // Lógica de Formulario Final
            const btnCancelUpdate = e.target.closest('[data-action="cancelStatusUpdate"]');
            if (btnCancelUpdate) this.loadUserData();

            const btnSubmitUpdate = e.target.closest('[data-action="submitStatusUpdate"]');
            if (btnSubmitUpdate) this.submitStatusUpdate(btnSubmitUpdate);

            // Toggle Password
            const togglePassBtn = e.target.closest('[data-action="togglePassword"]');
            if (togglePassBtn) {
                const inputField = togglePassBtn.parentElement.querySelector('.component-input-field');
                if (inputField && inputField.id === 'admin_status_confirm_password') {
                    if (inputField.type === 'password') {
                        inputField.type = 'text';
                        togglePassBtn.textContent = 'visibility';
                    } else {
                        inputField.type = 'password';
                        togglePassBtn.textContent = 'visibility_off';
                    }
                }
            }
        });

        // Validaciones en blur de tiempo del calendario
        document.addEventListener('focusout', (e) => {
            if (!window.location.pathname.includes('/admin/edit-status')) return;
            if (e.target.id === 'calendar-hours') {
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val > 23) val = 23;
                e.target.value = String(val).padStart(2, '0');
            }
            if (e.target.id === 'calendar-minutes') {
                let val = parseInt(e.target.value) || 0;
                if (val < 0) val = 0;
                if (val > 59) val = 59;
                e.target.value = String(val).padStart(2, '0');
            }
        });

        document.addEventListener('input', (e) => {
            if (!window.location.pathname.includes('/admin/edit-status')) return;
            if (e.target.id === 'inp_deleted_reason_user') this.state.deletedReasonUser = e.target.value;
        });
    }

    showMessage(msg, type = 'error') {
        if (window.appInstance && typeof window.appInstance.showToast === 'function') {
            window.appInstance.showToast(msg, type);
        } else alert(msg);
    }

    /* === MÉTODOS DEL CALENDARIO CUSTOM === */
    renderCalendar() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const title = document.getElementById('calendar-title');
        const monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        if (title) title.textContent = `${monthsStr[month]} ${year}`;
        
        const daysContainer = document.getElementById('calendar-days');
        if (!daysContainer) return;
        daysContainer.innerHTML = '';
        
        // Días grises del mes pasado
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            daysContainer.innerHTML += `<button type="button" class="component-calendar-day muted" disabled>${dayNum}</button>`;
        }
        
        // Días interactivos del mes actual
        for (let i = 1; i <= daysInMonth; i++) {
            let isSelected = false;
            if (this.selectedCalendarDate && 
                this.selectedCalendarDate.getDate() === i && 
                this.selectedCalendarDate.getMonth() === month && 
                this.selectedCalendarDate.getFullYear() === year) {
                isSelected = true;
            }
            const cls = isSelected ? 'component-calendar-day active' : 'component-calendar-day';
            daysContainer.innerHTML += `<button type="button" class="${cls}" data-action="calendarSelectDay" data-day="${i}">${i}</button>`;
        }
        
        // Días grises del próximo mes (para rellenar celdas)
        const totalCells = firstDay + daysInMonth;
        const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
        for (let i = 1; i <= nextDays; i++) {
            daysContainer.innerHTML += `<button type="button" class="component-calendar-day muted" disabled>${i}</button>`;
        }
    }

    changeCalendarMonth(dir) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + dir);
        this.renderCalendar();
    }

    selectCalendarDay(btn) {
        const day = parseInt(btn.getAttribute('data-day'));
        this.selectedCalendarDate = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), day);
        this.renderCalendar(); // Re-renderiza para aplicar la clase active
    }

    confirmCalendar() {
        if (!this.selectedCalendarDate) {
            this.showMessage('Selecciona un día en el calendario.', 'error');
            return;
        }
        const hInput = document.getElementById('calendar-hours');
        const mInput = document.getElementById('calendar-minutes');
        
        const h = hInput ? hInput.value.padStart(2, '0') : '00';
        const m = mInput ? mInput.value.padStart(2, '0') : '00';
        
        const y = this.selectedCalendarDate.getFullYear();
        const mo = String(this.selectedCalendarDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.selectedCalendarDate.getDate()).padStart(2, '0');
        
        this.state.endDate = `${y}-${mo}-${d}T${h}:${m}`;
        this.updateCalendarText();
        
        if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleCalendar"]'));
    }

    clearCalendar() {
        this.selectedCalendarDate = null;
        this.state.endDate = '';
        this.updateCalendarText();
        this.renderCalendar();
        
        if (window.appInstance) window.appInstance.closeModule(document.querySelector('[data-module="adminModuleCalendar"]'));
    }

    updateCalendarText() {
        const textEl = document.getElementById('admin-endDate-text');
        if (!textEl) return;
        
        if (!this.state.endDate) {
            textEl.textContent = 'Seleccionar fecha y hora...';
            return;
        }
        
        const d = new Date(this.state.endDate);
        const monthsStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        
        textEl.textContent = `${d.getDate()} de ${monthsStr[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
    }
    /* === FIN MÉTODOS CALENDARIO === */

    async loadUserData() {
        const loader = document.getElementById('admin-status-loader');
        const form = document.getElementById('admin-status-form');
        
        const passInput = document.getElementById('admin_status_confirm_password');
        if (passInput) passInput.value = '';

        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const u = res.user;

            const trigger = document.querySelector('[data-action="adminToggleModule"][data-target="adminModuleStatus"]');
            const desc = document.getElementById('admin-status-desc');

            if (u.role === 'founder') {
                if (trigger) trigger.classList.add('disabled-interaction');
                if (desc) desc.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. Su estado no puede ser modificado por seguridad.</span>';
            } else {
                if (trigger) trigger.classList.remove('disabled-interaction');
                if (desc) desc.textContent = 'Determina si la cuenta está en uso o eliminada permanentemente.';
            }

            // Hydrate logic
            this.state.status = u.user_status === 'deleted' ? 'deleted' : 'active';
            
            if (u.deleted_by) this.state.deletedBy = u.deleted_by;
            if (u.deleted_reason) {
                if (u.deleted_by === 'user') this.state.deletedReasonUser = u.deleted_reason;
                else this.state.deletedReasonAdmin = u.deleted_reason;
            }

            this.state.isSuspended = (u.is_suspended == 1) ? '1' : '0';
            if (u.suspension_type) this.state.suspendedType = u.suspension_type;
            if (u.suspension_reason) this.state.suspensionReason = u.suspension_reason;
            
            // Re-hidratar la fecha parseando desde MySQL
            if (u.suspension_end_date) {
                const d = new Date(u.suspension_end_date.replace(' ', 'T') + 'Z');
                const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                
                this.state.endDate = localD.toISOString().slice(0, 16);
                this.selectedCalendarDate = new Date(localD.getFullYear(), localD.getMonth(), localD.getDate());
                
                const hInput = document.getElementById('calendar-hours');
                const mInput = document.getElementById('calendar-minutes');
                if (hInput) hInput.value = String(localD.getHours()).padStart(2, '0');
                if (mInput) mInput.value = String(localD.getMinutes()).padStart(2, '0');
            } else {
                this.state.endDate = '';
                this.selectedCalendarDate = null;
            }

            const inpUserReason = document.getElementById('inp_deleted_reason_user');
            if (inpUserReason) inpUserReason.value = this.state.deletedReasonUser;
            
            this.updateCalendarText();
            this.syncVisuals();
            this.renderUI();

            if (loader) loader.classList.add('disabled');
            if (form) form.classList.remove('disabled');
        } else {
            this.showMessage(res.message, 'error');
            if (window.spaRouter) window.spaRouter.navigate('/ProjectRosaura/admin/manage-users');
        }
    }

    syncVisuals() {
        const syncLabel = (key) => {
            const val = this.state[key];
            const el = document.getElementById(`admin-${key}-text`);
            if (el) {
                el.textContent = this.maps[key] ? this.maps[key][val] : val;
            }
            document.querySelectorAll(`[data-action="adminSetDropdown"][data-key="${key}"]`).forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-value') === val);
            });
        };

        Object.keys(this.state).forEach(key => {
            if (key !== 'deletedReasonUser' && key !== 'endDate') {
                syncLabel(key);
            }
        });
    }

    renderUI() {
        const s = this.state;
        
        const secDelDecision = document.getElementById('section-deleted-decision');
        const secDelReasonAdmin = document.getElementById('section-deleted-admin-reason');
        const secDelReasonUser = document.getElementById('section-deleted-user-reason');
        
        const secSuspType = document.getElementById('section-suspended-type');
        const secSuspDate = document.getElementById('section-suspended-date');
        const secSuspReason = document.getElementById('section-suspended-reason');

        [secDelDecision, secDelReasonAdmin, secDelReasonUser, secSuspType, secSuspDate, secSuspReason].forEach(el => {
            if (el) el.classList.add('disabled');
        });

        if (s.status === 'deleted') {
            if (secDelDecision) secDelDecision.classList.remove('disabled');
            if (s.deletedBy === 'admin') {
                if (secDelReasonAdmin) secDelReasonAdmin.classList.remove('disabled');
            } else {
                if (secDelReasonUser) secDelReasonUser.classList.remove('disabled');
            }
        }

        if (s.isSuspended === '1') {
            if (secSuspType) secSuspType.classList.remove('disabled');
            if (secSuspReason) secSuspReason.classList.remove('disabled');
            if (s.suspendedType === 'temporary') {
                if (secSuspDate) secSuspDate.classList.remove('disabled');
            }
        }
    }

    formatDateForDB(dateStr) {
        if (!dateStr) return null;
        return dateStr.replace('T', ' ') + ':00'; // Convierte de 'YYYY-MM-DDTHH:mm' a 'YYYY-MM-DD HH:mm:00'
    }

    async submitStatusUpdate(btn) {
        const passInput = document.getElementById('admin_status_confirm_password');
        const password = passInput ? passInput.value.trim() : '';

        if (!password) {
            this.showMessage('Debes ingresar tu contraseña actual para confirmar.', 'error');
            return;
        }

        if (this.state.isSuspended === '1' && this.state.suspendedType === 'temporary' && !this.state.endDate) {
            this.showMessage('Debes seleccionar una fecha para la suspensión temporal.', 'error');
            return;
        }

        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;

        const payload = {
            target_user_id: this.targetUserId,
            password: password,
            status: this.state.status,
            deleted_by: this.state.deletedBy,
            deleted_reason_admin: this.state.deletedReasonAdmin,
            deleted_reason_user: this.state.deletedReasonUser,
            is_suspended: this.state.isSuspended,
            suspension_type: this.state.suspendedType,
            suspension_reason: this.state.suspensionReason,
            end_date: this.formatDateForDB(this.state.endDate)
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateStatus, payload);

        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;

        if (result.success) {
            this.showMessage(result.message, 'success');
            if (passInput) passInput.value = '';
            this.loadUserData(); 
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}