// public/assets/js/admin-status-edit-controller.js
import { ApiService } from './core/api-services.js';
import { ApiRoutes } from './core/api-routes.js';

export class AdminStatusEditController {
    constructor() {
        this.api = new ApiService();
        this.targetUserId = null;
        
        // Estado inicial de las variables lógicas independientes
        // isSuspended se mantiene en '0' por defecto. 
        // suspensionReason inicia vacío para obligar al usuario a elegir.
        this.state = {
            status: 'active',
            deletedBy: 'admin',
            deletedReasonAdmin: 'Violación de políticas',
            deletedReasonUser: '',

            isSuspended: '0', 
            suspensionReason: '', // Vacío por defecto
            suspendedType: 'temporary',
            suspensionDuration: '7',
            endDate: '' 
        };

        this.maps = {
            status: { 'active': 'Activa', 'deleted': 'Eliminada' },
            deletedBy: { 'user': 'Por el usuario', 'admin': 'Administrativa' },
            isSuspended: { '0': 'Cuenta sin restricciones', '1': 'Cuenta con suspensión' },
            suspendedType: { 'temporary': 'Suspensión temporal', 'permanent': 'Suspensión permanente' },
            suspensionDuration: { '1': '1 día', '3': '3 días', '7': '7 días', '14': '14 días', '30': '30 días', 'custom': 'Establecer tiempo manual' }
        };

        // Mapa de duraciones sugeridas según la razón elegida
        this.reasonDurations = {
            'Incumplimiento de los Términos y Condiciones': 7,
            'Información falsa o suplantación de identidad': 30,
            'Actividades ilegales': 30,
            'Uso indebido o fraudulento del servicio': 14,
            'Conducta abusiva o inapropiada': 3,
            'Publicación de contenido prohibido': 7,
            'Violación de propiedad intelectual': 14,
            'Envío de spam o uso de automatización no autorizada': 7,
            'Intentos de vulnerar la seguridad de la plataforma': 30,
            'Uso de la cuenta para fines comerciales no autorizados': 14,
            'Otro': 1 
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
                
                // Inicializar el calendario global antes de mostrar el módulo
                if (target === 'adminModuleCalendar') {
                    if (window.calendarSystem) {
                        window.calendarSystem.setup(
                            this.state.endDate,
                            (isoString, displayString) => {
                                this.state.endDate = isoString;
                                const textEl = document.getElementById('admin-endDate-text');
                                if (textEl) textEl.textContent = displayString;
                            },
                            () => {
                                this.state.endDate = '';
                                const textEl = document.getElementById('admin-endDate-text');
                                if (textEl) textEl.textContent = 'Seleccionar fecha y hora...';
                            }
                        );
                    }
                }

                if (window.appInstance) window.appInstance.toggleModule(target);
            }

            const btnSetDropdown = e.target.closest('[data-action="adminSetDropdown"]');
            if (btnSetDropdown) {
                const key = btnSetDropdown.getAttribute('data-key');
                const val = btnSetDropdown.getAttribute('data-value');
                this.state[key] = val;
                
                // Lógica: Si cambia la razón, se autoasigna la duración recomendada
                if (key === 'suspensionReason') {
                    const recommended = this.reasonDurations[val] || 1;
                    this.state.suspensionDuration = recommended.toString();
                    this.calculateEndDateFromDuration(recommended);
                }
                
                // Lógica: Si selecciona una duración distinta, se recalcula la fecha final
                if (key === 'suspensionDuration') {
                    if (val !== 'custom') {
                        this.calculateEndDateFromDuration(parseInt(val));
                    }
                }
                
                // Limpiar estado de suspension si elige desactivarla
                if (key === 'isSuspended' && val === '0') {
                    this.state.suspensionReason = '';
                }

                const module = btnSetDropdown.closest('.component-module');
                if (module && window.appInstance) window.appInstance.closeModule(module);
                
                this.syncVisuals();
                this.renderUI();
            }

            const btnSubmitUpdate = e.target.closest('[data-action="submitStatusUpdate"]');
            if (btnSubmitUpdate) this.submitStatusUpdate(btnSubmitUpdate);
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

    calculateEndDateFromDuration(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        // Ajustamos la compensación para obtener una cadena ISO Local limpia (evita cambios de UTC)
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        this.state.endDate = localISOTime;
        this.updateCalendarText();
    }

    async loadUserData() {
        const loader = document.getElementById('admin-status-loader');
        const form = document.getElementById('admin-status-form');

        const res = await this.api.post(ApiRoutes.Admin.GetUser, { target_user_id: this.targetUserId });
        
        if (res.success) {
            const u = res.user;

            const triggerStatus = document.querySelector('[data-action="adminToggleModule"][data-target="adminModuleStatus"]');
            const descStatus = document.getElementById('admin-status-desc');
            
            const triggerSuspended = document.querySelector('[data-action="adminToggleModule"][data-target="adminModuleSuspended"]');
            const descSuspended = document.getElementById('admin-isSuspended-desc');

            if (u.role === 'founder') {
                if (triggerStatus) triggerStatus.classList.add('disabled-interaction');
                if (descStatus) descStatus.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. Su estado no puede ser modificado por seguridad.</span>';
                
                if (triggerSuspended) triggerSuspended.classList.add('disabled-interaction');
                if (descSuspended) descSuspended.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Esta cuenta pertenece a un Fundador. No puede ser suspendida por seguridad.</span>';
            } else {
                if (triggerStatus) triggerStatus.classList.remove('disabled-interaction');
                if (descStatus) descStatus.textContent = 'Determina si la cuenta está en uso o eliminada permanentemente.';
                
                if (triggerSuspended) triggerSuspended.classList.remove('disabled-interaction');
                if (descSuspended) descSuspended.textContent = 'Aplica una suspensión para bloquear el acceso sin borrar el historial.';
            }

            // --- Hidratación de datos del servidor ---
            this.state.status = u.user_status === 'deleted' ? 'deleted' : 'active';
            
            if (u.deleted_by) this.state.deletedBy = u.deleted_by;
            if (u.deleted_reason) {
                if (u.deleted_by === 'user') this.state.deletedReasonUser = u.deleted_reason;
                else this.state.deletedReasonAdmin = u.deleted_reason;
            }

            this.state.isSuspended = (u.is_suspended == 1) ? '1' : '0';
            this.state.suspensionReason = u.suspension_reason || ''; // Inicializado según la BD o vacío
            if (u.suspension_type) this.state.suspendedType = u.suspension_type;
            
            if (u.is_suspended == 1 && u.suspension_type === 'temporary' && u.suspension_end_date) {
                this.state.suspensionDuration = 'custom';
                const d = new Date(u.suspension_end_date.replace(' ', 'T') + 'Z');
                const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                this.state.endDate = localD.toISOString().slice(0, 16);
            } else {
                this.state.endDate = '';
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

    syncVisuals() {
        const syncLabel = (key) => {
            const val = this.state[key];
            const el = document.getElementById(`admin-${key}-text`);
            if (el) {
                // Validar texto cuando la Razón está vacía
                if (key === 'suspensionReason' && !val) {
                    el.textContent = 'Seleccionar razón de suspensión...';
                } else {
                    el.textContent = this.maps[key] ? this.maps[key][val] : val;
                }
            }
            
            // Sincronizar active status del dropdown
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
        
        const secSuspReason = document.getElementById('section-suspended-reason');
        const secSuspType = document.getElementById('section-suspended-type');
        const secSuspDuration = document.getElementById('section-suspended-duration');
        const secSuspDate = document.getElementById('section-suspended-date');

        // Ocultar todos los componentes condicionales por defecto
        [secDelDecision, secDelReasonAdmin, secDelReasonUser, secSuspReason, secSuspType, secSuspDuration, secSuspDate].forEach(el => {
            if (el) el.classList.add('disabled');
        });

        // 1. Mostrar campos si la cuenta está eliminada
        if (s.status === 'deleted') {
            if (secDelDecision) secDelDecision.classList.remove('disabled');
            if (s.deletedBy === 'admin') {
                if (secDelReasonAdmin) secDelReasonAdmin.classList.remove('disabled');
            } else {
                if (secDelReasonUser) secDelReasonUser.classList.remove('disabled');
            }
        }

        // 2. Mostrar lógica escalonada si la cuenta está suspendida
        if (s.isSuspended === '1') {
            // A. Primero mostramos el selector de razón (Obligatorio)
            if (secSuspReason) secSuspReason.classList.remove('disabled');
            
            // B. Si la razón ya fue seleccionada, mostramos el Tipo
            if (s.suspensionReason !== '') {
                if (secSuspType) secSuspType.classList.remove('disabled');
                
                // C. Si es temporal, mostramos opciones de tiempo
                if (s.suspendedType === 'temporary') {
                    if (secSuspDuration) secSuspDuration.classList.remove('disabled');
                    
                    // D. Si eligieron tiempo manual, mostramos el calendario
                    if (s.suspensionDuration === 'custom') {
                        if (secSuspDate) secSuspDate.classList.remove('disabled');
                    }
                }
            }
        }
    }

    formatDateForDB(dateStr) {
        if (!dateStr) return null;
        return dateStr.replace('T', ' ') + ':00'; // Parse simple a formato DB
    }

    async submitStatusUpdate(btn) {

        // Validaciones estrictas antes de guardar
        if (this.state.isSuspended === '1') {
            if (!this.state.suspensionReason) {
                this.showMessage('Debes seleccionar una razón para proceder con la suspensión.', 'error');
                return;
            }
            if (this.state.suspendedType === 'temporary' && !this.state.endDate) {
                this.showMessage('Debes seleccionar una fecha de finalización para la suspensión temporal.', 'error');
                return;
            }
        }

        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="component-spinner"></div>';
        btn.disabled = true;

        const payload = {
            target_user_id: this.targetUserId,
            status: this.state.status,
            deleted_by: this.state.deletedBy,
            deleted_reason_admin: this.state.deletedReasonAdmin,
            deleted_reason_user: this.state.deletedReasonUser,
            
            is_suspended: this.state.isSuspended,
            suspension_type: this.state.isSuspended === '1' ? this.state.suspendedType : null,
            suspension_reason: this.state.isSuspended === '1' ? this.state.suspensionReason : null,
            end_date: (this.state.isSuspended === '1' && this.state.suspendedType === 'temporary') ? this.formatDateForDB(this.state.endDate) : null
        };

        const result = await this.api.post(ApiRoutes.Admin.UpdateStatus, payload);

        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;

        if (result.success) {
            this.showMessage(result.message, 'success');
            this.loadUserData(); 
        } else {
            this.showMessage(result.message, 'error');
        }
    }
}