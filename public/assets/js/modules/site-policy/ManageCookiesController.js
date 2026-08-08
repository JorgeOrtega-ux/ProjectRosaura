export class ManageCookiesController {
    constructor() {
        this._boundHandleClick = this._handleClick.bind(this);
        this._boundHandleChange = this._handleChange.bind(this);
    }

    init() {
        this.bindEvents();
        this._loadPreferences();
    }

    destroy() {
        document.body.removeEventListener('click', this._boundHandleClick);
        document.body.removeEventListener('change', this._boundHandleChange);
    }

    bindEvents() {
        document.body.addEventListener('click', this._boundHandleClick);
        document.body.addEventListener('change', this._boundHandleChange);
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
    }

    _handleChange(e) {
        const toggle = e.target.closest('#cookie_func, #cookie_perf, #cookie_target');
        if (toggle) {
            const funcToggle = document.getElementById('cookie_func');
            const perfToggle = document.getElementById('cookie_perf');
            const targetToggle = document.getElementById('cookie_target');
            
            const prefs = {
                essential: true,
                func: funcToggle ? funcToggle.checked : false,
                perf: perfToggle ? perfToggle.checked : false,
                target: targetToggle ? targetToggle.checked : false
            };
            
            localStorage.setItem('pr_cookie_consent', JSON.stringify(prefs));
            
            const banner = document.querySelector('.component-notice-box--banner');
            if (banner) {
                banner.remove();
            }
        }
    }
}