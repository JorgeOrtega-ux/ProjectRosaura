import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

export class AdminSupportTicketsController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.currentStatus = '';
        this.searchQuery = '';
        this.searchTimeout = null;

        this._boundClick = this.handleClick.bind(this);
        this._boundInput = this.handleInput.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-support-tickets-wrapper"]');
        this.abortController = new AbortController();
        this.bindEvents();
        this._loadTickets();
    }

    bindEvents() {
        if (this.container) {
            this.container.addEventListener('input', this._boundInput);
        }
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.container) {
            this.container.removeEventListener('input', this._boundInput);
        }
        document.body.removeEventListener('click', this._boundClick);
    }

    handleInput(e) {
        const searchInput = e.target.closest('[data-ref="tickets-search-input"]');
        if (searchInput) {
            if (this.searchTimeout) clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchQuery = searchInput.value.trim();
                this._loadTickets();
            }, 300);
        }
    }

    handleClick(e) {
        const filterBtn = e.target.closest('[data-action="filterTicketStatus"]');
        if (filterBtn) {
            e.preventDefault();
            this._handleStatusFilter(filterBtn);
            return;
        }

        const row = e.target.closest('[data-nav^="/admin/support/ticket/"]');
        if (row && window.spaRouter) {
            e.preventDefault();
            const path = row.getAttribute('data-nav');
            window.spaRouter.navigate(path);
            return;
        }
    }

    _handleStatusFilter(btn) {
        const status = btn.getAttribute('data-status') || '';
        this.currentStatus = status;

        const allPills = document.querySelectorAll('[data-action="filterTicketStatus"]');
        allPills.forEach(b => {
            if (b === btn) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        this._loadTickets();
    }

    async _loadTickets() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetTicketsList, {
                status: this.currentStatus,
                search: this.searchQuery
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this._renderTickets(res.tickets || []);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _renderTickets(tickets) {
        const container = document.querySelector('[data-ref="admin-tickets-container"]');
        if (!container) return;

        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                    <h3 class="component-card__title">${window.__('lbl_no_tickets_found')}</h3>
                </div>
            `;
            return;
        }

        let html = '';
        tickets.forEach(t => {
            const statusBadgeMap = {
                open: '<span class="component-badge component-badge--danger">Abierto</span>',
                in_progress: '<span class="component-badge component-badge--warning">En Progreso</span>',
                resolved: '<span class="component-badge component-badge--success">Resuelto</span>',
                closed: '<span class="component-badge">Cerrado</span>'
            };
            const badge = statusBadgeMap[t.status] || `<span class="component-badge">${t.status}</span>`;

            html += `
                <div class="component-group-item component-group-item--clickable" data-nav="/admin/support/ticket/${t.uuid}">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">mark_email_unread</span>
                        </div>
                        <div class="component-card__text">
                            <h3 class="component-card__title">${this._escapeHtml(t.subject)} ${badge}</h3>
                            <p class="component-card__description">${this._escapeHtml(t.email || 'No email')} &bull; ${this._escapeHtml(t.category)} &bull; ${t.created_at}</p>
                        </div>
                    </div>
                    <div class="component-card__actions">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </div>
                </div>
                <hr class="component-divider">
            `;
        });

        container.innerHTML = html;
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
