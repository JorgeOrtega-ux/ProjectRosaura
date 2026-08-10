/**
 * ThemeManager — Gestiona el tema visual (light/dark/system).
 * Extrae esta responsabilidad de MainController.
 */
export class ThemeManager {
    constructor() {
        this.themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.handleThemeMediaQueryBound = this.handleThemeMediaQuery.bind(this);
    }

    init() {
        this.themeMediaQuery.addEventListener('change', this.handleThemeMediaQueryBound);
    }

    destroy() {
        this.themeMediaQuery.removeEventListener('change', this.handleThemeMediaQueryBound);
    }

    handleThemeMediaQuery() {
        const theme = this.getCurrentTheme();
        if (theme === 'system') this.apply('system');
    }

    /**
     * Obtiene el tema actual desde window.AppUserPrefs o localStorage.
     */
    getCurrentTheme() {
        if (window.AppUserPrefs?.theme !== undefined && window.AppUserPrefs?.theme !== null) {
            return window.AppUserPrefs.theme;
        }
        return localStorage.getItem('pr_theme') || 'system';
    }

    /**
     * Aplica el tema al documento.
     * @param {'light'|'dark'|'system'} theme
     */
    apply(theme) {
        let isDark = false;
        if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        else if (theme === 'dark') isDark = true;

        if (isDark) {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.classList.remove('light-theme');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark-theme');
        }
    }
}
