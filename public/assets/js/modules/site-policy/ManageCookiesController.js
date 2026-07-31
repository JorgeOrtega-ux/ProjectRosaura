export class ManageCookiesController {
    constructor() {
        this._boundHandleClick = this._handleClick.bind(this);
    }

    init() {
        document.body.addEventListener('click', this._boundHandleClick);
        this._loadPreferences();
    }

    destroy() {
        document.body.removeEventListener('click', this._boundHandleClick);
    }

    _loadPreferences() {
        const consent = localStorage.getItem('pr_cookie_consent');
        if (consent) {
            try {
                const prefs = JSON.parse(consent);
                const funcToggle = document.getElementById('cookie_func');
                const perfToggle = document.getElementById('cookie_perf');
                const targetToggle = document.getElementById('cookie_target');
                
                if (funcToggle) funcToggle.checked = !!prefs.func;
                if (perfToggle) perfToggle.checked = !!prefs.perf;
                if (targetToggle) targetToggle.checked = !!prefs.target;
            } catch (e) {
                console.error('Error parsing cookie preferences', e);
            }
        }
    }

    _handleClick(e) {
        const accordionHeader = e.target.closest('.component-accordion-header');
        if (accordionHeader && !e.target.closest('input, label, .component-toggle-switch')) {
            const accordionGroup = accordionHeader.closest('.component-accordion');
            if (accordionGroup) {
                accordionGroup.classList.toggle('active');
            }
        }

        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.getAttribute('data-action');
            
            if (action === 'accept_all') {
                this._saveAndRedirect({ essential: true, func: true, perf: true, target: true });
            } else if (action === 'reject_all') {
                this._saveAndRedirect({ essential: true, func: false, perf: false, target: false });
            } else if (action === 'save_prefs') {
                const funcToggle = document.getElementById('cookie_func');
                const perfToggle = document.getElementById('cookie_perf');
                const targetToggle = document.getElementById('cookie_target');
                
                this._saveAndRedirect({
                    essential: true,
                    func: funcToggle ? funcToggle.checked : false,
                    perf: perfToggle ? perfToggle.checked : false,
                    target: targetToggle ? targetToggle.checked : false
                });
            }
        }
    }

    _saveAndRedirect(prefs) {
        localStorage.setItem('pr_cookie_consent', JSON.stringify(prefs));
        
        // Remove cookie banner if it exists in DOM
        const banner = document.querySelector('.component-notice-box--banner');
        if (banner) {
            banner.remove();
        }

        // Redirect to home
        if (window.spaRouter) {
            window.spaRouter.navigate('/');
        } else {
            window.location.href = '/';
        }
    }
}
