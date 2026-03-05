// public/assets/js/core/router/SpaRouter.js
export class SpaRouter {
    constructor(options = {}) {
        this.outlet = document.querySelector(options.outlet || '[data-ref="app-router-outlet"]');
        this.basePath = window.AppBasePath || ''; // Dinámico desde app.php
        this.abortController = null; // Gestor nativo para matar peticiones fantasma
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

                const url = navTarget.dataset.nav;
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
        // Matar cualquier petición de navegación anterior que siga viva
        if (this.abortController) {
            this.abortController.abort();
        }
        
        // Crear una nueva señal de vida para esta navegación exacta
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
                signal: signal // Vinculamos el fetch a la guillotina del abort
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
                
                if (cleanUrl.endsWith('/') && cleanUrl.length > 1) {
                    cleanUrl = cleanUrl.slice(0, -1);
                }

                window.dispatchEvent(new CustomEvent('viewLoaded', { 
                    detail: { 
                        url: url,
                        cleanUrl: cleanUrl 
                    } 
                }));
            } else {
                this.render(`
                    <div class="component-message-layout">
                        <div class="component-message-box">
                            <div class="component-message-icon-wrapper">
                                <span class="material-symbols-rounded component-message-icon">error</span>
                            </div>
                            <h1 class="component-message-title">Error HTTP</h1>
                            <p class="component-message-desc">No se pudo cargar la vista solicitada. Código: ${response.status}</p>
                        </div>
                    </div>
                `);
            }
        } catch (error) {
            // Si el error es porque nosotros matamos la petición (AbortError), no renderizamos error de red, silenciamos el proceso.
            if (error.name === 'AbortError') {
                return;
            }

            this.render(`
                <div class="component-message-layout">
                    <div class="component-message-box">
                        <div class="component-message-icon-wrapper">
                            <span class="material-symbols-rounded component-message-icon">wifi_off</span>
                        </div>
                        <h1 class="component-message-title">Error de Red</h1>
                        <p class="component-message-desc">Revise su conexión a internet.</p>
                    </div>
                </div>
            `);
        }
    }

    render(html) {
        if (this.outlet) {
            this.outlet.innerHTML = html;
            this.outlet.scrollTop = 0;
        }
    }

    highlightCurrentRoute() {
        const path = window.location.pathname;
        let normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        const targets = document.querySelectorAll(`[data-nav="${normalizedPath}"], [data-nav="${normalizedPath}/"]`);
        targets.forEach(target => {
            target.classList.add('active');
        });

        const mainMenu = document.querySelector('[data-ref="sidebar-menu-main"]');
        const settingsMenu = document.querySelector('[data-ref="sidebar-menu-settings"]');
        const adminMenu = document.querySelector('[data-ref="sidebar-menu-admin"]');
        
        if (mainMenu && settingsMenu) {
            if (normalizedPath.includes('/admin') && adminMenu) {
                mainMenu.classList.remove('active');
                mainMenu.classList.add('disabled');
                
                settingsMenu.classList.remove('active');
                settingsMenu.classList.add('disabled');
                
                adminMenu.classList.remove('disabled');
                adminMenu.classList.add('active');
            } else if (normalizedPath.includes('/settings')) {
                mainMenu.classList.remove('active');
                mainMenu.classList.add('disabled');
                
                if (adminMenu) {
                    adminMenu.classList.remove('active');
                    adminMenu.classList.add('disabled');
                }
                
                settingsMenu.classList.remove('disabled');
                settingsMenu.classList.add('active');
            } else {
                settingsMenu.classList.remove('active');
                settingsMenu.classList.add('disabled');
                
                if (adminMenu) {
                    adminMenu.classList.remove('active');
                    adminMenu.classList.add('disabled');
                }
                
                mainMenu.classList.remove('disabled');
                mainMenu.classList.add('active');
            }
        }

        if (normalizedPath.includes('/settings')) {
            const dropdownSettingsItem = document.querySelector(`.component-module--dropdown [data-nav^="${this.basePath}/settings"]`);
            if (dropdownSettingsItem) {
                dropdownSettingsItem.classList.add('active');
            }
        } else if (normalizedPath.includes('/admin')) {
            const dropdownAdminItem = document.querySelector(`.component-module--dropdown [data-nav^="${this.basePath}/admin"]`);
            if (dropdownAdminItem) {
                dropdownAdminItem.classList.add('active');
            }
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