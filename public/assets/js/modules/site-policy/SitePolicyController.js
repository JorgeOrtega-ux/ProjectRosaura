export class SitePolicyController {
    constructor() {
        this._boundHandleClick = this._handleClick.bind(this);
    }

    init() {
        this.bindEvents();
    }

    destroy() {
        document.body.removeEventListener('click', this._boundHandleClick);
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundHandleClick);
    }

    _handleClick(e) {
        const policyNav = e.target.closest('[data-nav^="/site-policy"]');
        if (policyNav) {
            const path = policyNav.getAttribute('data-nav');
            if (path && window.spaRouter) {
                e.preventDefault();
                window.spaRouter.navigate(path);
            }
        }
    }
}