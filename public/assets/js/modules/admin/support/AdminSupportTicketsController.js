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
        this.selectedUuid = null;
        this.tickets = [];

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
        this.selectedUuid = null;
        this.tickets = [];
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

        const selectRow = e.target.closest('[data-action="selectTicketRow"]');
        if (selectRow && !e.target.closest('button') && !e.target.closest('a')) {
            e.preventDefault();
            const uuid = selectRow.getAttribute('data-uuid');
            if (this.selectedUuid === uuid) {
                this.selectedUuid = null;
            } else {
                this.selectedUuid = uuid;
            }
            this._updateSelectionUI();
            this._renderTickets(this.tickets);
            return;
        }

        const followUpBtn = e.target.closest('[data-action="followUpSelectedTicket"]');
        if (followUpBtn) {
            e.preventDefault();
            if (this.selectedUuid && window.spaRouter) {
                window.spaRouter.navigate('/admin/support/ticket/' + this.selectedUuid);
            }
            return;
        }

        const deselectBtn = e.target.closest('[data-action="deselectTicket"]');
        if (deselectBtn) {
            e.preventDefault();
            this.selectedUuid = null;
            this._updateSelectionUI();
            this._renderTickets(this.tickets);
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

        this.selectedUuid = null;
        this._updateSelectionUI();
        this._loadTickets();
    }

    _updateSelectionUI() {
        const selectionActions = document.querySelector('[data-ref="header-selection-actions"]');
        const defaultActions = document.querySelector('[data-ref="header-default-actions"]');

        if (this.selectedUuid) {
            if (selectionActions) {
                selectionActions.classList.remove('disabled');
                selectionActions.classList.add('active');
            }
            if (defaultActions) {
                defaultActions.classList.remove('active');
                defaultActions.classList.add('disabled');
            }
        } else {
            if (selectionActions) {
                selectionActions.classList.remove('active');
                selectionActions.classList.add('disabled');
            }
            if (defaultActions) {
                defaultActions.classList.remove('disabled');
                defaultActions.classList.add('active');
            }
        }
    }

    async _loadTickets() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetTicketsList, {
                status: this.currentStatus,
                search: this.searchQuery
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success) {
                this.tickets = res.tickets || [];
                this._renderTickets(this.tickets);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
        }
    }

    _parseSubscriptionColor(colorRaw) {
        if (!colorRaw) return 'transparent';
        try {
            let colorData = colorRaw;
            if (typeof colorRaw === 'string') {
                const trimmed = colorRaw.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    colorData = JSON.parse(trimmed);
                } else {
                    return colorRaw;
                }
            }
            if (colorData && typeof colorData === 'object') {
                if (colorData.type === 'solid') {
                    const firstColor = (colorData.colors && colorData.colors[0]);
                    return (typeof firstColor === 'string' ? firstColor : firstColor?.hex) || '#808080';
                }
                if (colorData.type === 'linear') {
                    const angle = colorData.angle || '90';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length - 1 || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `linear-gradient(${angle}deg, ${stops})`;
                }
                if (colorData.type === 'conic') {
                    const angle = colorData.angle || '0';
                    const colors = Array.isArray(colorData.colors) ? colorData.colors : [];
                    const stops = colors.map((c, i, arr) => {
                        const hex = typeof c === 'string' ? c : (c.hex || '#000');
                        const p = (typeof c === 'object' && c.percentage !== undefined) ? c.percentage : Math.floor((i / (arr.length || 1)) * 100);
                        return `${hex} ${p}%`;
                    }).join(', ');
                    return `conic-gradient(from ${angle}deg, ${stops})`;
                }
            }
        } catch (e) {}
        return 'transparent';
    }

    _renderTickets(tickets) {
        const tbody = document.querySelector('[data-ref="admin-tickets-table-body"]');
        if (!tbody) return;

        if (tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
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
            const isSelected = t.uuid === this.selectedUuid;

            const statusMap = {
                open: { class: 'component-badge--danger', icon: 'error', label: window.__('lbl_status_open') },
                in_progress: { class: 'component-badge--warning', icon: 'timelapse', label: window.__('lbl_status_in_progress') },
                resolved: { class: 'component-badge--success', icon: 'check_circle', label: window.__('lbl_status_resolved') },
                closed: { class: '', icon: 'lock', label: window.__('lbl_status_closed') }
            };
            const statusInfo = statusMap[t.status] || { class: '', icon: 'help', label: t.status };
            const statusBadge = `
                <div class="component-badge component-badge--sm ${statusInfo.class}">
                    <span class="material-symbols-rounded">${statusInfo.icon}</span>
                    <span>${this._escapeHtml(statusInfo.label)}</span>
                </div>
            `;

            const priorityMap = {
                low: { class: '', label: window.__('lbl_priority_low') },
                medium: { class: '', label: window.__('lbl_priority_medium') },
                high: { class: 'component-badge--warning', label: window.__('lbl_priority_high') },
                urgent: { class: 'component-badge--danger', label: window.__('lbl_priority_urgent') }
            };
            const priorityInfo = priorityMap[t.priority] || { class: '', label: t.priority };
            const priorityBadge = `
                <div class="component-badge component-badge--sm ${priorityInfo.class}">
                    <span class="material-symbols-rounded">flag</span>
                    <span>${this._escapeHtml(priorityInfo.label)}</span>
                </div>
            `;

            const subCss = this._parseSubscriptionColor(t.subscription_color);
            const hasSub = subCss && subCss !== 'transparent';
            const dynamicClass = hasSub ? 'subscription-dynamic' : '';
            const styleAttr = hasSub ? `style="--active-subscription-bg: ${this._escapeHtml(subCss)};"` : '';
            const dataAttr = hasSub ? `data-sub-bg="${this._escapeHtml(subCss)}"` : '';

            let avatarSrc = '/public/assets/img/fallbacks/avatar-default.png';
            if (t.profile_picture) {
                avatarSrc = t.profile_picture.startsWith('http') ? t.profile_picture : `${appUrl}/${t.profile_picture.replace(/^\/+/, '')}`;
            }
            const fallbackAvatar = `${appUrl}/public/assets/img/fallbacks/avatar-default.png`;
            const username = t.username || window.__('lbl_user');
            const msgSnippet = t.message ? (t.message.length > 70 ? t.message.substring(0, 70) + '...' : t.message) : '';

            html += `
                <tr class="component-table-row component-table-row--clickable ${isSelected ? 'selected' : ''}" data-action="selectTicketRow" data-uuid="${t.uuid}">
                    <td>
                        <div class="td-user-info">
                            <div class="component-button--profile ${dynamicClass} component-avatar--static-sm" ${dataAttr} ${styleAttr}>
                                <img class="avatar-image image-lazy-fade" src="${avatarSrc}" alt="${this._escapeHtml(username)}" onerror="this.onerror=null; this.src='${fallbackAvatar}';">
                            </div>
                            <div class="component-badge component-badge--sm">
                                <span class="material-symbols-rounded">person</span>
                                <span>${this._escapeHtml(username)}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="component-table-cell-group">
                            <span class="component-table-title">${this._escapeHtml(t.subject)}</span>
                            <span class="component-table-subtitle">${this._escapeHtml(msgSnippet)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">category</span>
                            <span>${this._escapeHtml(t.category)}</span>
                        </div>
                    </td>
                    <td>${priorityBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="component-badge component-badge--sm">
                            <span class="material-symbols-rounded">schedule</span>
                            <span>${t.created_at}</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        if (window.applySubscriptionDynamicColors) {
            try {
                window.applySubscriptionDynamicColors();
            } catch (e) {}
        }
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
