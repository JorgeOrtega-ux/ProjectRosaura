import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage } from '../../core/utils/uiUtils.js';

export class AdminDashboardController {
    constructor() {
        this.api = new ApiService();
        this.dom = {};
    }

    async init() {
        this.cacheDOM();
        
        this._setLoadingState();

        await this.fetchAndRenderData();
    }

    cacheDOM() {
        this.dom.statNewUsers = document.getElementById('stat-new-users');
        this.dom.statLogins = document.getElementById('stat-logins');
        this.dom.statPageviews = document.getElementById('stat-pageviews');
    }

    _setLoadingState() {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = '...';
        if (this.dom.statLogins) this.dom.statLogins.textContent = '...';
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = '...';
    }

    async fetchAndRenderData() {
        const response = await this.api.getDashboardMetrics(null, null);

        if (response && response.success) {
            this.updateStatsCards(response.summary);
        } else {
            showMessage(response?.message || 'Error al obtener datos', 'error');
            this.updateStatsCards({ new_users: 0, logins: 0, pageviews: 0 });
        }
    }

    updateStatsCards(summary) {
        if (this.dom.statNewUsers) this.dom.statNewUsers.textContent = summary.new_users;
        if (this.dom.statLogins) this.dom.statLogins.textContent = summary.logins;
        if (this.dom.statPageviews) this.dom.statPageviews.textContent = summary.pageviews;
    }

    destroy() {
        
    }
}