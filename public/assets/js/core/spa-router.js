// public/assets/js/core/spa-router.js
export class SpaRouter {
    constructor(options = {}) {
        this.outlet = document.querySelector(options.outlet || '#app-router-outlet');
        this.basePath = '/ProjectRosaura';
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
        if (this.outlet) {
            this.outlet.innerHTML = '';
            this._showLoaderInOutlet();
        }

        try {
            const fetchPromise = fetch(url, {
                method: 'GET',
                headers: { 'X-SPA-Request': 'true' }
            });
            const delayPromise = new Promise(resolve => setTimeout(resolve, 200));
            const [response] = await Promise.all([fetchPromise, delayPromise]);

            if (response.ok || response.status === 404 || response.status === 403) {
                const updateUrl = response.headers.get('X-SPA-Update-URL');
                if (updateUrl) {
                    window.history.replaceState(null, '', updateUrl);
                    url = updateUrl; 
                }

                const html = await response.text();
                this.render(html);
                this.highlightCurrentRoute();
                this.updateDocumentTitle(url);

                // ACTUALIZACIÓN DE RUTAS DE "PANTALLA COMPLETA / SIN HEADER"
                const isAuthRoute = url.includes('/login') || url.includes('/register') || url.includes('/forgot-password') || url.includes('/reset-password') || url.includes('/account-suspended') || url.includes('/account-deleted');
                const topBar = document.querySelector('.general-content-top');

                if (topBar) {
                    if (isAuthRoute) {
                        topBar.classList.add('disabled');
                    } else {
                        topBar.classList.remove('disabled');
                    }
                }

                if (isAuthRoute) {
                    const sidebar = document.querySelector('.component-module--sidebar');
                    if (sidebar && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        sidebar.classList.add('disabled');
                    }
                }

                window.dispatchEvent(new CustomEvent('viewLoaded', { detail: { url } }));
            } else {
                this.render('<div class="view-content" style="padding: 24px; text-align: center;"><h1 style="color: #d32f2f;">Error HTTP</h1><p>No se pudo cargar la vista solicitada. Código: ' + response.status + '</p></div>');
            }
        } catch (error) {
            this.render('<div class="view-content" style="padding: 24px; text-align: center;"><h1 style="color: #d32f2f;">Error de Red</h1><p>Revise su conexión a internet.</p></div>');
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

        const mainMenu = document.getElementById('sidebar-menu-main');
        const settingsMenu = document.getElementById('sidebar-menu-settings');
        const adminMenu = document.getElementById('sidebar-menu-admin');
        
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
            const dropdownSettingsItem = document.querySelector('.component-module--dropdown [data-nav^="/ProjectRosaura/settings"]');
            if (dropdownSettingsItem) {
                dropdownSettingsItem.classList.add('active');
            }
        } else if (normalizedPath.includes('/admin')) {
            const dropdownAdminItem = document.querySelector('.component-module--dropdown [data-nav^="/ProjectRosaura/admin"]');
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
        loaderContainer.style.cssText = 'width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; min-height: 250px;';

        const spinner = document.createElement('div');
        spinner.style.cssText = 'width: 44px; height: 44px; border: 4px solid #00000015; border-top-color: #111; border-radius: 50%; animation: spin 0.8s linear infinite;';

        if (!document.getElementById('spa-spinner-keyframe')) {
            const style = document.createElement('style');
            style.id = 'spa-spinner-keyframe';
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        loaderContainer.appendChild(spinner);
        this.outlet.appendChild(loaderContainer);
    }
}