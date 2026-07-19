import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage } from '../../core/utils/uiUtils.js';
export class AdminDashboardController {
    constructor() {
        this.api = new ApiService();
        this.dom = {};
        this.chartTabsMain = null;
        this.currentTab = 'activity';
        this.lastChartsData = null;
    }
    async init() {
        window.dashboardController = this;
        this.cacheDOM();
        this._setLoadingState();
        await this.fetchAndRenderData();
    }
    cacheDOM() {
        this.dom.statNewUsers = document.getElementById('stat-new-users');
        this.dom.statLogins = document.getElementById('stat-logins');
        this.dom.statPageviews = document.getElementById('stat-pageviews');
        this.dom.statMessages = document.getElementById('stat-messages');
        this.dom.statCanvases = document.getElementById('stat-canvases');
        this.dom.statBanned = document.getElementById('stat-banned');
        this.dom.statLatency = document.getElementById('stat-latency');
        this.dom.canvasTabsMain = document.getElementById('chartTabsMain');
        
        this.dom.menuTabAct = document.getElementById('menu-tab-act');
        this.dom.menuTabReg = document.getElementById('menu-tab-reg');
        this.dom.menuTabErr = document.getElementById('menu-tab-err');
        
        this.dom.dropdownIcon = document.getElementById('chart-dropdown-icon');
        this.dom.dropdownText = document.getElementById('chart-dropdown-text');
        
        // Cargar traducciones desde el DOM
        const langDataEl = document.getElementById('dashboard-lang-data');
        this.lang = {
            activity: langDataEl && langDataEl.getAttribute('data-lbl-activity') ? langDataEl.getAttribute('data-lbl-activity') : window.__('admin_activity_global'),
            regs: langDataEl && langDataEl.getAttribute('data-lbl-regs') ? langDataEl.getAttribute('data-lbl-regs') : window.__('admin_new_regs'),
            errors: langDataEl && langDataEl.getAttribute('data-lbl-errors') ? langDataEl.getAttribute('data-lbl-errors') : window.__('admin_access_errors'),
            pageviews: langDataEl && langDataEl.getAttribute('data-lbl-pageviews') ? langDataEl.getAttribute('data-lbl-pageviews') : window.__('admin_pageviews'),
            logins: langDataEl && langDataEl.getAttribute('data-lbl-logins') ? langDataEl.getAttribute('data-lbl-logins') : window.__('admin_logins'),
            newusers: langDataEl && langDataEl.getAttribute('data-lbl-newusers') ? langDataEl.getAttribute('data-lbl-newusers') : window.__('admin_new_users'),
            loginfails: langDataEl && langDataEl.getAttribute('data-lbl-loginfails') ? langDataEl.getAttribute('data-lbl-loginfails') : window.__('admin_failed_logins')
        };
    }
    _setLoadingState() {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = '...';
        if (this.dom.statLogins) this.dom.statLogins.textContent = '...';
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = '...';
        if (this.dom.statMessages) this.dom.statMessages.textContent = '...';
        if (this.dom.statCanvases) this.dom.statCanvases.textContent = '...';
        if (this.dom.statBanned) this.dom.statBanned.textContent = '...';
        if (this.dom.statLatency) this.dom.statLatency.textContent = '...';
    }
    async fetchAndRenderData() {
        const response = await this.api.getDashboardMetrics(null, null);
        if (response && response.success) {
            this.updateStatsCards(response.summary);
            if (response.charts) {
                this.renderChart(response.charts);
            }
        } else {
            showMessage(response?.message, 'error');
            this.updateStatsCards({ new_users: 0, logins: 0, pageviews: 0, messages: 0, canvases: 0 });
        }
    }
    updateStatsCards(summary) {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = summary.new_users;
        if (this.dom.statLogins) this.dom.statLogins.textContent = summary.logins;
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = summary.pageviews;
        if (this.dom.statMessages) this.dom.statMessages.textContent = summary.messages ?? 0;
        if (this.dom.statCanvases) this.dom.statCanvases.textContent = summary.canvases ?? 0;
        if (this.dom.statBanned) this.dom.statBanned.textContent = summary.banned_users ?? 0;
        if (this.dom.statLatency) this.dom.statLatency.textContent = (summary.avg_latency ?? 0) + ' ms';
    }
    renderChart(chartsData) {
        if (typeof Chart === 'undefined') return;
        this.lastChartsData = chartsData;
        this.renderTabsChart(chartsData);
    }

    switchTab(tab) {
        this.currentTab = tab;
        if (this.lastChartsData) {
            this.destroy();
            this.renderTabsChart(this.lastChartsData);
        }
        
        // Close dropdown if open
        const module = document.querySelector('[data-module="moduleChartMode"]');
        if (module) module.classList.add('disabled');
    }

    renderTabsChart(chartsData) {
        if (!this.dom.canvasTabsMain) return;
        const ctx = this.dom.canvasTabsMain.getContext('2d');
        
        // Update menu active states and dropdown label
        [this.dom.menuTabAct, this.dom.menuTabReg, this.dom.menuTabErr].forEach(item => {
            if(item) item.classList.remove('active');
        });

        let dataset = [];
        let type = 'line';

        if (this.currentTab === 'activity') {
            if(this.dom.menuTabAct) this.dom.menuTabAct.classList.add('active');
            if(this.dom.dropdownIcon) this.dom.dropdownIcon.textContent = 'monitoring';
            if(this.dom.dropdownText) this.dom.dropdownText.textContent = this.lang.activity;
            
            dataset = [
                { label: this.lang.pageviews, data: chartsData.pageviews, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 2, fill: true, tension: 0.4 },
                { label: this.lang.logins, data: chartsData.logins, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }
            ];
        } else if (this.currentTab === 'regs') {
            if(this.dom.menuTabReg) this.dom.menuTabReg.classList.add('active');
            if(this.dom.dropdownIcon) this.dom.dropdownIcon.textContent = 'person_add';
            if(this.dom.dropdownText) this.dom.dropdownText.textContent = this.lang.regs;
            
            type = 'bar';
            dataset = [{ label: this.lang.newusers, data: chartsData.registrations, backgroundColor: '#8b5cf6', borderRadius: 4 }];
        } else if (this.currentTab === 'errors') {
            if(this.dom.menuTabErr) this.dom.menuTabErr.classList.add('active');
            if(this.dom.dropdownIcon) this.dom.dropdownIcon.textContent = 'warning';
            if(this.dom.dropdownText) this.dom.dropdownText.textContent = this.lang.errors;
            
            dataset = [{ label: this.lang.loginfails, data: chartsData.login_fails, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }];
        }

        this.chartTabsMain = new Chart(ctx, {
            type: type,
            data: { labels: chartsData.labels, datasets: dataset },
            options: {
                ...this._getCommonChartOptions(),
                maintainAspectRatio: false
            }
        });
    }

    _getCommonChartOptions() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#888';
        const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#333';
        const bgSurface = getComputedStyle(document.body).getPropertyValue('--bg-surface').trim() || '#222';
        const textPrimary = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#fff';

        return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textColor }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: bgSurface,
                        titleColor: textPrimary,
                        bodyColor: textColor,
                        borderColor: borderColor,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: borderColor },
                        ticks: { color: textColor }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: borderColor },
                        ticks: { color: textColor, precision: 0 }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            };
    }
    destroy() {
        if (this.chartTabsMain) this.chartTabsMain.destroy();
    }
}