// public/assets/js/modules/admin/AdminDashboardController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage } from '../../core/utils/uiUtils.js';
import { CalendarSystem } from '../../core/components/CalendarSystem.js';

export class AdminDashboardController {
    constructor() {
        this.api = new ApiService();
        this.dom = {};
        this.chartInstances = {
            registrations: null,
            activity: null
        };
        this.isChartJsLoaded = false;
        
        // Instanciamos pasándole el contenedor específico para evitar conflictos
        this.calendarStart = new CalendarSystem('[data-module="adminModuleCalendarStart"]');
        this.calendarEnd = new CalendarSystem('[data-module="adminModuleCalendarEnd"]');
    }

    async init() {
        this.cacheDOM();
        this.bindEvents();
        this.initCalendars();
        
        // Mostrar estado de carga en las tarjetas temporalmente
        this._setLoadingState();

        // Cargar script de Chart.js dinámicamente si no existe
        await this.loadChartJs();

        // Realizar la primera petición de datos
        await this.fetchAndRenderData();
    }

    cacheDOM() {
        this.dom.startDateInput = document.getElementById('dash-start-date');
        this.dom.endDateInput = document.getElementById('dash-end-date');
        this.dom.btnApply = document.getElementById('dash-apply-filters');

        this.dom.statNewUsers = document.getElementById('stat-new-users');
        this.dom.statLogins = document.getElementById('stat-logins');
        this.dom.statPageviews = document.getElementById('stat-pageviews');

        this.dom.canvasRegistrations = document.getElementById('chart-registrations');
        this.dom.canvasActivity = document.getElementById('chart-activity');
    }

    initCalendars() {
        this.calendarStart.init();
        const startVal = this.dom.startDateInput ? this.dom.startDateInput.value : '';
        this.calendarStart.setup(startVal ? `${startVal}T00:00` : '', (isoString, displayString) => {
            if (this.dom.startDateInput) this.dom.startDateInput.value = isoString.split('T')[0];
            const textRef = document.querySelector('[data-ref="admin-startDate-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (this.dom.startDateInput) this.dom.startDateInput.value = '';
            const textRef = document.querySelector('[data-ref="admin-startDate-text"]');
            if (textRef) textRef.textContent = window.__ ? window.__('btn_clear') : 'Sin fecha';
        });

        this.calendarEnd.init();
        const endVal = this.dom.endDateInput ? this.dom.endDateInput.value : '';
        this.calendarEnd.setup(endVal ? `${endVal}T23:59` : '', (isoString, displayString) => {
            if (this.dom.endDateInput) this.dom.endDateInput.value = isoString.split('T')[0];
            const textRef = document.querySelector('[data-ref="admin-endDate-text"]');
            if (textRef) textRef.textContent = displayString;
        }, () => {
            if (this.dom.endDateInput) this.dom.endDateInput.value = '';
            const textRef = document.querySelector('[data-ref="admin-endDate-text"]');
            if (textRef) textRef.textContent = window.__ ? window.__('btn_clear') : 'Sin fecha';
        });
    }

    bindEvents() {
        if (this.dom.btnApply) {
            this.dom.btnApply.addEventListener('click', () => {
                this._setLoadingState();
                this.fetchAndRenderData();
            });
        }
    }

    /**
     * Inyecta el script de Chart.js mediante CDN de manera asíncrona
     * Solo se descarga cuando un Admin entra al Dashboard
     */
    async loadChartJs() {
        if (window.Chart) {
            this.isChartJsLoaded = true;
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.async = true;
            script.onload = () => {
                this.isChartJsLoaded = true;
                resolve();
            };
            script.onerror = () => {
                showMessage(window.__ ? window.__('error_loading_chartjs') : 'Error al cargar librerías gráficas', 'error');
                reject(new Error('Failed to load Chart.js'));
            };
            document.head.appendChild(script);
        });
    }

    _setLoadingState() {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = '...';
        if (this.dom.statLogins) this.dom.statLogins.textContent = '...';
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = '...';
        
        if (this.dom.btnApply) {
            this.dom.btnApply.classList.add('disabled-interaction');
        }
    }

    async fetchAndRenderData() {
        const startDate = this.dom.startDateInput.value;
        const endDate = this.dom.endDateInput.value;

        // Validaciones básicas
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showMessage(window.__ ? window.__('validation_invalid_date_range') : 'La fecha de inicio no puede ser mayor a la fecha final', 'error');
            this._resetButtonState();
            return;
        }

        const response = await this.api.getDashboardMetrics(startDate, endDate);

        this._resetButtonState();

        if (response && response.success) {
            this.updateStatsCards(response.summary);
            this.renderCharts(response.charts);
        } else {
            showMessage(response?.message || 'Error al obtener datos', 'error');
            this.updateStatsCards({ new_users: 0, logins: 0, pageviews: 0 });
        }
    }

    _resetButtonState() {
        if (this.dom.btnApply) {
            this.dom.btnApply.classList.remove('disabled-interaction');
        }
    }

    updateStatsCards(summary) {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = summary.new_users;
        if (this.dom.statLogins) this.dom.statLogins.textContent = summary.logins;
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = summary.pageviews;
    }

    renderCharts(chartData) {
        if (!this.isChartJsLoaded || !window.Chart) return;

        // 1. Gráfica de Registros (Evolución)
        if (this.dom.canvasRegistrations) {
            // Destruir instancia previa si existe para evitar "efecto fantasma" o superposición
            if (this.chartInstances.registrations) {
                this.chartInstances.registrations.destroy();
            }

            const ctxReg = this.dom.canvasRegistrations.getContext('2d');
            this.chartInstances.registrations = new window.Chart(ctxReg, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: window.__ ? window.__('admin_dashboard_new_users') : 'Nuevos Usuarios',
                        data: chartData.registrations,
                        borderColor: '#3b82f6', // Color primario
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3, // Curvatura suave
                        fill: true,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#3b82f6'
                    }]
                },
                options: this._getChartOptions()
            });
        }

        // 2. Gráfica de Actividad (Vistas vs Logins)
        if (this.dom.canvasActivity) {
            if (this.chartInstances.activity) {
                this.chartInstances.activity.destroy();
            }

            const ctxAct = this.dom.canvasActivity.getContext('2d');
            this.chartInstances.activity = new window.Chart(ctxAct, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            type: 'line',
                            label: window.__ ? window.__('admin_dashboard_logins') : 'Inicios de Sesión',
                            data: chartData.logins,
                            borderColor: '#10b981', // Verde
                            backgroundColor: '#10b981',
                            borderWidth: 2,
                            tension: 0.3,
                            yAxisID: 'y'
                        },
                        {
                            type: 'bar',
                            label: window.__ ? window.__('admin_dashboard_pageviews') : 'Vistas de Página',
                            data: chartData.pageviews,
                            backgroundColor: 'rgba(139, 92, 246, 0.6)', // Morado semi-transparente
                            borderColor: '#8b5cf6',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    ...this._getChartOptions(),
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        x: {
                            grid: { display: false }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: { display: true, text: 'Logins' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: { drawOnChartArea: false }, // No superponer líneas de cuadrícula
                            title: { display: true, text: 'Pageviews' }
                        }
                    }
                }
            });
        }
    }

    /**
     * Opciones globales comunes para mantener consistencia visual
     */
    _getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false, // Fundamental para que el contenedor CSS controle la altura
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        // Modificado para usar rectángulos puros
                        boxWidth: 16,
                        boxHeight: 12,
                        useBorderRadius: true,
                        borderRadius: 3 // Borde de rectángulo suave, pon en 0 si lo quieres rígido.
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 10,
                    titleFont: { size: 13 },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false, // Limpiar el eje X
                        drawBorder: false
                    },
                    ticks: {
                        maxTicksLimit: 10 // No sobrecargar de fechas si el rango es muy grande
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                }
            }
        };
    }

    /**
     * Se llama automáticamente por el SpaRouter al cambiar de ruta
     * Previene fugas de memoria destruyendo los Canvas
     */
    destroy() {
        if (this.chartInstances.registrations) {
            this.chartInstances.registrations.destroy();
        }
        if (this.chartInstances.activity) {
            this.chartInstances.activity.destroy();
        }
        
        this.calendarStart.destroy();
        this.calendarEnd.destroy();
        
        // Limpiar listeners si es necesario
        if (this.dom.btnApply) {
            // El recolector de basura de JS suele limpiar esto al borrar el DOM, 
            // pero es buena práctica mencionarlo.
            const newBtn = this.dom.btnApply.cloneNode(true);
            this.dom.btnApply.parentNode.replaceChild(newBtn, this.dom.btnApply);
        }
    }
}