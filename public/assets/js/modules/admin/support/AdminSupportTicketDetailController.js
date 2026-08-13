import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { restoreButton, setButtonLoading, showMessage } from '../../../core/utils/uiUtils.js';

export class AdminSupportTicketDetailController {
    constructor() {
        this.api = new ApiService();
        this.container = null;
        this.abortController = null;
        this.ticketUuid = null;

        this._boundClick = this.handleClick.bind(this);
    }

    init() {
        this.container = document.querySelector('[data-ref="admin-ticket-detail-wrapper"]');
        this.abortController = new AbortController();

        const match = window.location.pathname.match(/\/admin\/support\/ticket\/([a-zA-Z0-9_-]+)/);
        if (match) {
            this.ticketUuid = match[1];
        }

        this.bindEvents();
        if (this.ticketUuid) {
            this._loadTicketDetail();
        }
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundClick);
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        document.body.removeEventListener('click', this._boundClick);
    }

    handleClick(e) {
        const replyBtn = e.target.closest('[data-action="submitTicketReply"]');
        if (replyBtn) {
            e.preventDefault();
            this._submitReply(replyBtn);
            return;
        }

        const navBack = e.target.closest('[data-nav^="/admin/support/tickets"]');
        if (navBack && window.spaRouter) {
            e.preventDefault();
            window.spaRouter.navigate('/admin/support/tickets');
            return;
        }
    }

    async _loadTicketDetail() {
        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.GetTicketDetail, {
                uuid: this.ticketUuid
            }, this.abortController ? this.abortController.signal : undefined);

            if (res && res.success && res.ticket) {
                this._renderTicket(res.ticket);
            } else {
                showMessage(res && res.message ? res.message : window.__('err_support_ticket_not_found'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            showMessage(window.__('err_generic'), 'error');
        }
    }

    _renderTicket(ticket) {
        const subjectEl = document.querySelector('[data-ref="ticket-detail-subject"]');
        const metaEl = document.querySelector('[data-ref="ticket-detail-meta"]');
        const msgEl = document.querySelector('[data-ref="ticket-detail-original-message"]');

        if (subjectEl) {
            subjectEl.textContent = ticket.subject;
        }

        if (metaEl) {
            metaEl.textContent = `${ticket.email || 'Guest'} • ${ticket.category} • Estado: ${ticket.status} • Prioridad: ${ticket.priority} • Fecha: ${ticket.created_at}`;
        }

        if (msgEl) {
            msgEl.innerHTML = `<p class="component-card__description">${this._escapeHtml(ticket.message)}</p>`;
        }
    }

    async _submitReply(btn) {
        if (!btn || !this.ticketUuid || btn.classList.contains('disabled-interaction')) return;

        const replyInput = document.querySelector('[data-ref="ticket-reply-text"]');
        const replyText = replyInput ? replyInput.value.trim() : '';

        if (!replyText || replyText.length < 5) {
            showMessage(window.__('err_support_invalid_message'), 'error');
            if (replyInput) replyInput.focus();
            return;
        }

        setButtonLoading(btn);

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.ReplyTicket, {
                uuid: this.ticketUuid,
                message: replyText
            }, this.abortController ? this.abortController.signal : undefined);

            restoreButton(btn);

            if (res && res.success) {
                showMessage(window.__('msg_support_ticket_replied'), 'success');
                if (replyInput) replyInput.value = '';
                this._loadTicketDetail();
            } else {
                showMessage(res && res.message ? res.message : window.__('err_generic'), 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            restoreButton(btn);
            showMessage(window.__('err_generic'), 'error');
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
