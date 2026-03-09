// public/assets/js/core/router/SpaRouter.js
export class SpaRouter {
    constructor(options = {}) {
        this.outlet = document.querySelector(options.outlet || '[data-ref="app-router-outlet"]');
        this.basePath = window.AppBasePath || ''; 
        this.abortController = null; 
        this.init();
    }

    init() {
        this.updateDocumentTitle(window.location.pathname);

        window.addEventListener('popstate', (e) => {
            const url = window.location.pathname;
            this.loadRoute(url);
        });

        document.body.addEventListener('click', (e) => {
            const navTarget = e.target.closest('[data-nav]');
            if (navTarget) {
                e.preventDefault();

                const module = navTarget.closest('.component-module');
                if (module && module.classList.contains('active')) {
                    module.classList.remove('active');
                    module.classList.add('disabled');
                    
                    module.querySelectorAll('.component-menu').forEach(panel => {
                        panel.style.transform = '';
                    });
                }

                let url = navTarget.dataset.nav;
                
                // CORRECCIÓN CRÍTICA: Añadir el basePath si falta
                if (this.basePath && url.startsWith('/') && !url.startsWith(this.basePath)) {
                    url = this.basePath + url;
                }

                this.navigate(url);
                return;
            }

            const anchor = e.target.closest('a');
            if (anchor && anchor.href && !anchor.href.startsWith(window.location.origin) && !anchor.href.startsWith('javascript:')) {
                let openNewTab = true;
                if (window.AppUserPrefs) {
                    openNewTab = parseInt(window.AppUserPrefs.open_links_new_tab) === 1;
                } else {
                    openNewTab = localStorage.getItem('pr_open_links_new_tab') !== '0';
                }

                if (openNewTab) {
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                }
            }
        });

        window.addEventListener('routeChange', (e) => {
            if (e.detail && e.detail.url) {
                let url = e.detail.url;
                if (!url.startsWith(this.basePath) && this.basePath) {
                    url = this.basePath + url;
                }
                this.navigate(url);
            }
        });

        this.highlightCurrentRoute();
    }

    navigate(url) {
        let currentPath = window.location.pathname;
        let normalizedCurrent = currentPath.endsWith('/') && currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath;
        let normalizedUrl = url.endsWith('/') && url.length > 1 ? url.slice(0, -1) : url;

        if (normalizedCurrent === normalizedUrl) return;

        window.history.pushState(null, '', url);
        this.loadRoute(url);
    }

    async loadRoute(url) {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        if (this.outlet) {
            this.outlet.innerHTML = '';
            this._showLoaderInOutlet();
        }

        try {
            const fetchPromise = fetch(url, {
                method: 'GET',
                headers: { 'X-SPA-Request': 'true' },
                signal: signal
            });
            const delayPromise = new Promise(resolve => setTimeout(resolve, 200));
            const [response] = await Promise.all([fetchPromise, delayPromise]);

            if (response.ok || response.status === 404 || response.status === 403 || response.status === 503) {
                const updateUrl = response.headers.get('X-SPA-Update-URL');
                if (updateUrl) {
                    window.history.replaceState(null, '', updateUrl);
                    url = updateUrl; 
                }

                const html = await response.text();
                this.render(html);
                this.highlightCurrentRoute();
                this.updateDocumentTitle(url);

                const isAuthRoute = url.includes('/login') || url.includes('/register') || url.includes('/forgot-password') || url.includes('/reset-password') || url.includes('/account-suspended') || url.includes('/account-deleted');
                const isMaintenanceRoute = response.status === 503 || html.includes('component-message-icon');
                
                const topBar = document.querySelector('.general-content-top');

                if (topBar) {
                    if (isAuthRoute || isMaintenanceRoute) {
                        topBar.classList.add('disabled');
                    } else {
                        topBar.classList.remove('disabled');
                    }
                }

                if (isAuthRoute || isMaintenanceRoute) {
                    const sidebar = document.querySelector('.component-module--sidebar');
                    if (sidebar && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        sidebar.classList.add('disabled');
                    }
                }

                let cleanUrl = url.split('?')[0].split('#')[0];
                
                let routePath = cleanUrl;
                if (this.basePath && routePath.startsWith(this.basePath)) {
                    routePath = routePath.substring(this.basePath.length);
                }

                if (routePath.endsWith('/') && routePath.length > 1) {
                    routePath = routePath.slice(0, -1);
                }

                let moduleKey = routePath;

                if (moduleKey.startsWith('/@')) {
                    moduleKey = '/@channel';
                }

                window.dispatchEvent(new CustomEvent('viewLoaded', { 
                    detail: { 
                        url: url,
                        cleanUrl: moduleKey 
                    } 
                }));
            } else {
                this.renderHttpError(response.status, 'Error HTTP', 'No se pudo cargar la vista solicitada.');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            this.renderHttpError('Network', 'Error de Red', 'Revise su conexión a internet y vuelva a intentarlo.', 'wifi_off');
        }
    }

    render(html) {
        if (this.outlet) {
            this.outlet.innerHTML = html;
            this.outlet.scrollTop = 0;
        }
    }

    // NUEVA FUNCIÓN PÚBLICA PARA DISPARAR ERRORES PROGRAMÁTICAMENTE (Ej: 404 desde el WatchController)
    renderHttpError(statusCode, title = 'Error', description = 'Ha ocurrido un error inesperado.', iconName = 'error') {
        this.render(`
            <div class="component-message-layout" style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
                <div class="component-message-box" style="text-align: center;">
                    <div class="component-message-icon-wrapper" style="margin-bottom: 16px;">
                        <span class="material-symbols-rounded component-message-icon" style="font-size: 48px; color: var(--text-secondary);">${iconName}</span>
                    </div>
                    <h1 class="component-message-title" style="font-size: 24px; margin-bottom: 8px;">${title} ${statusCode !== 'Network' ? `(${statusCode})` : ''}</h1>
                    <p class="component-message-desc" style="color: var(--text-secondary);">${description}</p>
                </div>
            </div>
        `);
    }

    highlightCurrentRoute() {
        const path = window.location.pathname;
        let normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

        let pathWithoutBase = normalizedPath;
        if (this.basePath && normalizedPath.startsWith(this.basePath)) {
            pathWithoutBase = normalizedPath.substring(this.basePath.length);
        }
        if (pathWithoutBase === '') pathWithoutBase = '/';

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        const targets = document.querySelectorAll(`[data-nav="${normalizedPath}"], [data-nav="${normalizedPath}/"], [data-nav="${pathWithoutBase}"], [data-nav="${pathWithoutBase}/"]`);
        targets.forEach(target => {
            target.classList.add('active');
        });

        const mainMenu = document.querySelector('[data-ref="sidebar-menu-main"]');
        const settingsMenu = document.querySelector('[data-ref="sidebar-menu-settings"]');
        const adminMenu = document.querySelector('[data-ref="sidebar-menu-admin"]');
        const studioMenu = document.querySelector('[data-ref="sidebar-menu-studio"]');

        const hideAllMenus = () => {
            if (mainMenu) { mainMenu.classList.remove('active'); mainMenu.classList.add('disabled'); }
            if (settingsMenu) { settingsMenu.classList.remove('active'); settingsMenu.classList.add('disabled'); }
            if (adminMenu) { adminMenu.classList.remove('active'); adminMenu.classList.add('disabled'); }
            if (studioMenu) { studioMenu.classList.remove('active'); studioMenu.classList.add('disabled'); }
        };

        hideAllMenus();

        if (normalizedPath.includes('/admin') && adminMenu) {
            adminMenu.classList.remove('disabled');
            adminMenu.classList.add('active');
        } else if (normalizedPath.includes('/settings') && settingsMenu) {
            settingsMenu.classList.remove('disabled');
            settingsMenu.classList.add('active');
        } else if (normalizedPath.includes('/studio') && studioMenu) {
            studioMenu.classList.remove('disabled');
            studioMenu.classList.add('active');
        } else if (mainMenu) {
            mainMenu.classList.remove('disabled');
            mainMenu.classList.add('active');
        }

        if (normalizedPath.includes('/settings')) {
            const dropdownSettingsItem = document.querySelector(`.component-module--dropdown [data-nav^="${this.basePath}/settings"]`);
            if (dropdownSettingsItem) dropdownSettingsItem.classList.add('active');
        } else if (normalizedPath.includes('/admin')) {
            const dropdownAdminItem = document.querySelector(`.component-module--dropdown [data-nav^="${this.basePath}/admin"]`);
            if (dropdownAdminItem) dropdownAdminItem.classList.add('active');
        } else if (normalizedPath.includes('/studio')) {
            const dropdownStudioItem = document.querySelector(`.component-module--dropdown [data-nav^="${this.basePath}/studio"]`);
            if (dropdownStudioItem) dropdownStudioItem.classList.add('active');
        }
    }

    updateDocumentTitle(url) {
        if (!window.AppRouteTitles || !window.AppName) return;

        let path = url.replace(this.basePath, '').split('?')[0].split('#')[0];
        if (path === '') path = '/';

        let translatedSection = window.AppRouteTitles[path];

        if (translatedSection) {
            document.title = `${translatedSection} - ${window.AppName}`;
        } else {
            document.title = window.AppName;
        }
    }

    _showLoaderInOutlet() {
        const loaderContainer = document.createElement('div');
        loaderContainer.className = 'component-layout-centered';

        const spinner = document.createElement('div');
        spinner.className = 'component-spinner component-spinner--centered';

        loaderContainer.appendChild(spinner);
        this.outlet.appendChild(loaderContainer);
    }
}