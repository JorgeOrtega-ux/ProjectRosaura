import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';

export class AdminSupportMetricsController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-support-metrics-wrapper"]');
        this.abortController = new AbortController();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async _loadMetrics() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetMetrics, {}, this.abortController ? this.abortController.signal : undefined);
            if (res && res.success && res.metrics) {
                this._renderMetrics(res.metrics);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderMetrics(m) {
        const totalChatsEl = document.querySelector('[data-ref="metric-total-chats"]');
        const avgCsatEl = document.querySelector('[data-ref="metric-avg-csat"]');
        const avgFrtEl = document.querySelector('[data-ref="metric-avg-frt"]');
        const avgDurationEl = document.querySelector('[data-ref="metric-avg-duration"]');
        const transfersL1L2El = document.querySelector('[data-ref="metric-transfers-l1-l2"]');
        const transfersL2L3El = document.querySelector('[data-ref="metric-transfers-l2-l3"]');
        const totalTicketsEl = document.querySelector('[data-ref="metric-total-tickets"]');
        const openTicketsEl = document.querySelector('[data-ref="metric-open-tickets"]');

        if (totalChatsEl) totalChatsEl.textContent = (m.total_chats || 0).toLocaleString();
        if (avgCsatEl) avgCsatEl.textContent = m.avg_csat ? `${Number(m.avg_csat).toFixed(1)} ★` : '--';
        if (avgFrtEl) avgFrtEl.textContent = this._formatSeconds(m.avg_frt_seconds);
        if (avgDurationEl) avgDurationEl.textContent = this._formatSeconds(m.avg_duration_seconds);
        if (transfersL1L2El) transfersL1L2El.textContent = (m.transfers_l1_l2 || 0).toLocaleString();
        if (transfersL2L3El) transfersL2L3El.textContent = (m.transfers_l2_l3 || 0).toLocaleString();
        if (totalTicketsEl) totalTicketsEl.textContent = (m.total_tickets || 0).toLocaleString();
        if (openTicketsEl) openTicketsEl.textContent = (m.open_tickets || 0).toLocaleString();
    }

    _formatSeconds(sec) {
        if (!sec || isNaN(sec)) return '--';
        const s = Math.round(Number(sec));
        if (s <= 0) return '--';
        if (s < 60) return `${s}s`;
        const mins = Math.floor(s / 60);
        const remSec = s % 60;
        return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
    }
}
