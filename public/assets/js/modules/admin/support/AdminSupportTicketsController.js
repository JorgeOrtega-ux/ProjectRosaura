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
        const toggleSearchBtn = e.target.closest('[data-action="toggleSearch"]');
        if (toggleSearchBtn) {
            e.preventDefault();
            const toolbar = document.querySelector('[data-ref="search-toolbar"]');
            if (toolbar) {
                const isHidden = toolbar.classList.contains('disabled');
                if (isHidden) {
                    toolbar.classList.remove('disabled');
                    const input = toolbar.querySelector('[data-ref="tickets-search-input"]');
                    if (input) input.focus();
                } else {
                    toolbar.classList.add('disabled');
                }
            }
            return;
        }

        const filterBtn = e.target.closest('[data-action="filterTicketStatus"]');
        if (filterBtn) {
            e.preventDefault();
            this._handleStatusFilter(filterBtn);
            return;
        }

        const navTarget = e.target.closest('[data-nav^="/admin/support/ticket/"]');
        if (navTarget && window.spaRouter) {
            e.preventDefault();
            const path = navTarget.getAttribute('data-nav');
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

        const filterModule = document.querySelector('[data-module="moduleTicketFilters"]');
        if (filterModule) {
            filterModule.classList.add('disabled');
        }

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
        const tbody = document.querySelector('[data-ref="admin-tickets-table-body"]');
        if (!tbody) return;

        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="component-empty-state component-p-4">
                            <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                            <h3 class="component-card__title">${window.__('lbl_no_tickets_found')}</h3>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const appUrl = window.APP_URL || '';
        let html = '';

        tickets.forEach(t => {
            const statusBadgeMap = {
                open: `<span class="component-badge component-badge--danger">${window.__('lbl_status_open')}</span>`,
                in_progress: `<span class="component-badge component-badge--warning">${window.__('lbl_status_in_progress')}</span>`,
                resolved: `<span class="component-badge component-badge--success">${window.__('lbl_status_resolved')}</span>`,
                closed: `<span class="component-badge">${window.__('lbl_status_closed')}</span>`
            };
            const statusBadge = statusBadgeMap[t.status] || `<span class="component-badge">${t.status}</span>`;

            const priorityBadgeMap = {
                low: `<span class="component-badge component-badge--sm">${window.__('lbl_priority_low')}</span>`,
                medium: `<span class="component-badge component-badge--sm">${window.__('lbl_priority_medium')}</span>`,
                high: `<span class="component-badge component-badge--sm component-badge--warning">${window.__('lbl_priority_high')}</span>`,
                urgent: `<span class="component-badge component-badge--sm component-badge--danger">${window.__('lbl_priority_urgent')}</span>`
            };
            const priorityBadge = priorityBadgeMap[t.priority] || `<span class="component-badge component-badge--sm">${t.priority}</span>`;

            const avatarSrc = t.avatar ? (appUrl + t.avatar) : (appUrl + '/public/assets/images/defaults/avatar_default.webp');
            const fallbackAvatar = appUrl + '/public/assets/images/defaults/avatar_default.webp';
            const userLabel = t.username || t.email || window.__('lbl_user');
            const msgSnippet = t.message ? (t.message.length > 80 ? t.message.substring(0, 80) + '...' : t.message) : '';

            html += `
                <tr class="component-table-row component-table-row--clickable" data-nav="/admin/support/ticket/${t.uuid}">
                    <td>
                        <div class="component-table-cell-group">
                            <span class="component-table-title">${this._escapeHtml(t.subject)}</span>
                            <span class="component-table-subtitle">${this._escapeHtml(msgSnippet)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="component-user-cell">
                            <div class="component-avatar component-avatar--sm">
                                <img src="${avatarSrc}" alt="${this._escapeHtml(userLabel)}" onerror="this.src='${fallbackAvatar}'">
                            </div>
                            <div class="component-user-cell__info">
                                <span class="component-user-cell__name">${this._escapeHtml(t.username || userLabel)}</span>
                                <span class="component-user-cell__email">${this._escapeHtml(t.email || '')}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="component-badge">${this._escapeHtml(t.category)}</span></td>
                    <td>${priorityBadge}</td>
                    <td>${statusBadge}</td>
                    <td><span class="component-table-date">${t.created_at}</span></td>
                    <td class="text-right">
                        <button class="component-button component-button--icon component-button--h28" data-action="viewTicket" data-nav="/admin/support/ticket/${t.uuid}">
                            <span class="material-symbols-rounded">chevron_right</span>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
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
