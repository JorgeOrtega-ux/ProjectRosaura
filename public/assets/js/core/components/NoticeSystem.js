import { NoticeTemplates } from './NoticeTemplates.js';

export class NoticeSystem {
    constructor() {
        this.templates = NoticeTemplates;
        this.activeNotices = new Map(); // Support multiple notices at once
        this.handleClickBound = this.handleClick.bind(this);
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        document.addEventListener('click', this.handleClickBound);
    }

    destroy() {
        this.activeNotices.forEach((_, noticeId) => this.close(noticeId, false));
        document.removeEventListener('click', this.handleClickBound);
        const container = document.querySelector('.notice-container-root');
        if (container) container.remove();
        this.initialized = false;
    }

    _getContainerRoot() {
        let container = document.querySelector('.notice-container-root');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notice-container-root';
            document.body.appendChild(container);
        }
        return container;
    }

    _getPositionContainer(position) {
        const root = this._getContainerRoot();
        const posClass = `notice-container--${position}`;
        let posContainer = root.querySelector(`.${posClass}`);
        if (!posContainer) {
            posContainer = document.createElement('div');
            posContainer.className = `notice-container ${posClass}`;
            root.appendChild(posContainer);
        }
        return posContainer;
    }

    show(templateName, data = {}) {
        if (!this.initialized) {
            this.init();
        }

        return new Promise((resolve) => {
            if (!this.templates[templateName]) {
                resolve({ confirmed: false, data: {} });
                return;
            }

            const template = this.templates[templateName];
            const noticeId = 'notice_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            const position = template.position || 'bottom-left';
            const posContainer = this._getPositionContainer(position);

            const noticeBox = document.createElement('div');
            noticeBox.className = 'component-notice-box';
            noticeBox.setAttribute('data-notice-id', noticeId);
            
            // Apply custom CSS class instead of inline styles
            if (template.customClass) {
                noticeBox.classList.add(template.customClass);
            }
            
            noticeBox.innerHTML = template.build(data);

            // Add close button
            if (!template.hideCloseBtn) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'component-notice-close-btn';
                closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
                closeBtn.setAttribute('data-action', 'close_notice');
                noticeBox.appendChild(closeBtn);
            }

            posContainer.appendChild(noticeBox);

            // Animate in
            requestAnimationFrame(() => noticeBox.classList.add('active'));

            this.activeNotices.set(noticeId, {
                resolve,
                element: noticeBox,
                autoCloseTimeout: null
            });

            // Optional auto close
            if (data.autoClose && typeof data.autoClose === 'number') {
                const timeout = setTimeout(() => {
                    this.close(noticeId, false);
                }, data.autoClose);
                this.activeNotices.get(noticeId).autoCloseTimeout = timeout;
            }
        });
    }

    handleClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const noticeBox = actionBtn.closest('.component-notice-box');
            if (!noticeBox) return;

            const noticeId = noticeBox.getAttribute('data-notice-id');
            const action = actionBtn.getAttribute('data-action');

            if (action === 'cancel' || action === 'close_notice') {
                this.close(noticeId, false);
            } else if (action === 'confirm') {
                this.close(noticeId, true);
            } else {
                this.close(noticeId, action);
            }
        }
    }

    close(noticeId, result = false) {
        const notice = this.activeNotices.get(noticeId);
        if (!notice) return;

        if (notice.autoCloseTimeout) {
            clearTimeout(notice.autoCloseTimeout);
        }

        const noticeBox = notice.element;
        noticeBox.classList.remove('active');

        // Extract form data if any
        let formData = {};
        const inputs = noticeBox.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => { 
            const key = inp.id || inp.name || inp.getAttribute('data-ref'); 
            if (key) {
                if (inp.type === 'checkbox') {
                    formData[key] = inp.checked;
                } else if (inp.type === 'radio') {
                    if (inp.checked) formData[key] = inp.value;
                } else {
                    formData[key] = inp.value;
                }
            } 
        });

        notice.resolve({ confirmed: result, data: formData });
        this.activeNotices.delete(noticeId);

        setTimeout(() => {
            if (noticeBox && noticeBox.parentNode) {
                const posContainer = noticeBox.parentNode;
                noticeBox.remove();
                
                // Cleanup empty containers
                if (posContainer.childNodes.length === 0) {
                    posContainer.remove();
                }
            }
        }, 300); // Wait for transition
    }
}

// Instantiate globally to be available for console testing
window.NoticeSystemInstance = new NoticeSystem();
