export class ManageCookiesController {
    constructor() {
        this._boundHandleChange = this._handleChange.bind(this);
    }

    init() {
        this.bindEvents();
        this._loadPreferences();
    }

    destroy() {
        document.body.removeEventListener('change', this._boundHandleChange);
    }

    bindEvents() {
        // El toggle de acordeones lo gestiona MainController globalmente
        // a través de data-action="toggleAccordion" en el HTML.
        document.body.addEventListener('change', this._boundHandleChange);
    }

    _loadPreferences() {
        const consent = localStorage.getItem('pr_cookie_consent');
        if (!consent) return;
        try {
            const prefs      = JSON.parse(consent);
            const funcToggle = document.getElementById('cookie_func');
            const perfToggle = document.getElementById('cookie_perf');
            const targToggle = document.getElementById('cookie_target');
            if (funcToggle) funcToggle.checked = !!prefs.func;
            if (perfToggle) perfToggle.checked = !!prefs.perf;
            if (targToggle) targToggle.checked = !!prefs.target;
        } catch (e) {
            console.error('Error parsing cookie preferences', e);
        }
    }

    _handleChange(e) {
        const toggle = e.target.closest('#cookie_func, #cookie_perf, #cookie_target');
        if (!toggle) return;

        const funcToggle = document.getElementById('cookie_func');
        const perfToggle = document.getElementById('cookie_perf');
        const targToggle = document.getElementById('cookie_target');

        const prefs = {
            essential: true,
            func:   funcToggle ? funcToggle.checked : false,
            perf:   perfToggle ? perfToggle.checked : false,
            target: targToggle ? targToggle.checked : false,
        };

        localStorage.setItem('pr_cookie_consent', JSON.stringify(prefs));

        const banner = document.querySelector('.component-notice-box--banner');
        if (banner) banner.remove();
    }
}