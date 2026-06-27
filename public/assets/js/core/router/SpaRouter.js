// public/assets/js/core/router/SpaRouter.js
import { RouteModulesMap } from './RouteModulesMap.js';
import { SkeletonTemplates } from '../components/SkeletonTemplates.js';

export class SpaRouter {
    constructor(options = {}) {
        this.outlet = document.querySelector(options.outlet || '[data-ref="app-router-outlet"]');
        this.basePath = window.AppBasePath || ''; 
        this.abortController = null; 
        
        this.handlePopState = this.handlePopState.bind(this);
        this.handleBodyClick = this.handleBodyClick.bind(this);
        
        this.init();
    }

    init() {
        this.updateDocumentTitle(window.location.pathname);
        window.addEventListener('popstate', this.handlePopState);
        document.body.addEventListener('click', this.handleBodyClick);
        this.highlightCurrentRoute();

        // === PARCHE: SOLUCIÓN A CARGA DE JS EN RUTAS DINÁMICAS NATIVAS ===
        // Si el usuario refresca o ingresa directamente (nivel servidor), 
        // disparamos viewLoaded con el path mapeado para que MainController cargue el JS.
        let currentPath = window.location.pathname;
        let moduleUrl = currentPath;
        if (this.basePath && moduleUrl.startsWith(this.basePath)) {
            moduleUrl = moduleUrl.slice(this.basePath.length);
        }
        
        let triggerManualLoad = false;
        
        if (moduleUrl.startsWith('/canvases/edit/')) {
            moduleUrl = '/canvases/edit/:uuid';
            triggerManualLoad = true;
        } else if (moduleUrl.startsWith('/canvases/manage/requests/')) {
            moduleUrl = '/canvases/manage/requests/:uuid';
            triggerManualLoad = true;
        } else if (moduleUrl.startsWith('/canvases/manage/resets/')) {
            moduleUrl = '/canvases/manage/resets/:uuid';
            triggerManualLoad = true;
        } else if (moduleUrl.startsWith('/canvases/members/')) {
            moduleUrl = '/canvases/members/:uuid';
            triggerManualLoad = true;
        } else if (moduleUrl.startsWith('/design/s/')) {
            moduleUrl = '/design/s/:uuid';
            triggerManualLoad = true;
        } else if (moduleUrl.startsWith('/snapshot/view/')) {
            moduleUrl = '/snapshot/view/:id';
            triggerManualLoad = true;
        }

        if (triggerManualLoad) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('viewLoaded', { 
                    detail: { 
                        url: window.location.href,
                        cleanUrl: moduleUrl, 
                        originalUrl: currentPath, 
                        loadTimeMs: 0
                    } 
                }));
            }, 100); // Retraso de seguridad asegurando que MainController ya inicializó sus Listeners
        }
        // =================================================================
    }

    destroy() {
        window.removeEventListener('popstate', this.handlePopState);
        document.body.removeEventListener('click', this.handleBodyClick);
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    handlePopState(e) {
        const url = window.location.pathname + window.location.search;
        this.loadRoute(url);
    }

    handleBodyClick(e) {
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

            // === PARCHE: FORZAR NAVEGACIÓN A NIVEL SERVIDOR PARA EVITAR PARPADEOS ===
            if (url.includes('/canvases/edit/') || url.includes('/canvases/manage/requests/')) {
                window.location.href = url;
                return;
            }
            // ========================================================================

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
    }

    navigate(url) {
        let targetPath = url;
        try {
            if (url.startsWith('http')) {
                targetPath = new URL(url).pathname;
            }
        } catch(e) {}
        
        // === PARCHE: SEGURO ADICIONAL PARA NAVEGACIÓN PROGRAMÁTICA ===
        if (targetPath.includes('/canvases/edit/') || targetPath.includes('/canvases/manage/requests/')) {
            window.location.href = url;
            return;
        }
        // ============================================================

        let currentPath = window.location.pathname;
        
        targetPath = targetPath.split('?')[0].split('#')[0];
        currentPath = currentPath.split('?')[0].split('#')[0];
        
        let normalizedCurrent = currentPath.endsWith('/') && currentPath.length > 1 ? currentPath.slice(0, -1) : currentPath;
        let normalizedTarget = targetPath.endsWith('/') && targetPath.length > 1 ? targetPath.slice(0, -1) : targetPath;

        if (normalizedCurrent === normalizedTarget) return;

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
            this.outlet.scrollTop = 0;
            
            let cleanUrlForLoader = url;
            try {
                if (url.startsWith('http')) {
                    cleanUrlForLoader = new URL(url).pathname;
                }
            } catch(e) {}
            cleanUrlForLoader = cleanUrlForLoader.split('?')[0].split('#')[0];
            
            if (this.basePath && cleanUrlForLoader.startsWith(this.basePath)) {
                cleanUrlForLoader = cleanUrlForLoader.slice(this.basePath.length);
            }
            if (cleanUrlForLoader === '') {
                cleanUrlForLoader = '/';
            }
            if (cleanUrlForLoader !== '/' && cleanUrlForLoader.endsWith('/')) {
                cleanUrlForLoader = cleanUrlForLoader.slice(0, -1);
            }

            // === PARCHE: INTERCEPTACIÓN DIRECTA EN EL LOADER ===
            if (cleanUrlForLoader.includes('/canvases/edit/') || cleanUrlForLoader.includes('/canvases/manage/requests/')) {
                window.location.href = url;
                return;
            }
            // ==================================================

            if (cleanUrlForLoader === '/design') {
                this.navigate(this.basePath + '/');
                return;
            }
            
            this._showLoaderInOutlet(cleanUrlForLoader);
        }

        const startTime = performance.now();

        try {
            const fetchPromise = fetch(url, {
                method: 'GET',
                headers: { 'X-SPA-Request': 'true' },
                signal: signal 
            });
            const delayPromise = new Promise(resolve => setTimeout(resolve, 200));
            const [response] = await Promise.all([fetchPromise, delayPromise]);

            if (response.status === 503) {
                window.dispatchEvent(new CustomEvent('systemMaintenanceTriggered'));
                return;
            }

            if (response.ok || response.status === 404 || response.status === 403 || response.status === 500) {
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
                const isMaintenanceRoute = response.status === 500 || html.includes('component-message-icon');
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

                let moduleUrl = cleanUrl;
                if (this.basePath && moduleUrl.startsWith(this.basePath)) {
                    moduleUrl = moduleUrl.slice(this.basePath.length);
                }
                
                // --- MAPEO DE RUTAS DINÁMICAS PARA QUE CARGUE EL JS CORRECTO ---
                if (moduleUrl.startsWith('/design/s/')) {
                    moduleUrl = '/design/s/:uuid';
                } else if (moduleUrl.startsWith('/snapshot/view/')) {
                    moduleUrl = '/snapshot/view/:id';
                } else if (moduleUrl.startsWith('/design/')) {
                    moduleUrl = '/design'; 
                } else if (moduleUrl.startsWith('/canvases/manage/requests/')) {
                    moduleUrl = '/canvases/manage/requests/:uuid';
                } else if (moduleUrl.startsWith('/canvases/manage/resets/')) {
                    moduleUrl = '/canvases/manage/resets/:uuid';
                } else if (moduleUrl.startsWith('/canvases/edit/')) {
                    moduleUrl = '/canvases/edit/:uuid';
                } else if (moduleUrl.startsWith('/canvases/members/')) {
                    moduleUrl = '/canvases/members/:uuid';
                }
                // -------------------------------------------------------------

                const loadTimeMs = Math.round(performance.now() - startTime);

                window.dispatchEvent(new CustomEvent('viewLoaded', { 
                    detail: { 
                        url: url,
                        cleanUrl: moduleUrl, 
                        originalUrl: cleanUrl, 
                        loadTimeMs: loadTimeMs
                    } 
                }));
            } else {
                this.render(`
                    <div class="component-message-layout">
                        <div class="component-message-box">
                            <div class="component-message-icon-wrapper">
                                <span class="material-symbols-rounded component-message-icon">error</span>
                            </div>
                            <h1 class="component-message-title">${__('http_error_title')}</h1>
                            <p class="component-message-desc">${__('http_error_desc')} ${response.status}</p>
                        </div>
                    </div>
                `);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            this.render(`
                <div class="component-message-layout">
                    <div class="component-message-box">
                        <div class="component-message-icon-wrapper">
                            <span class="material-symbols-rounded component-message-icon">wifi_off</span>
                        </div>
                        <h1 class="component-message-title">${__('network_error_title')}</h1>
                        <p class="component-message-desc">${__('network_error_desc')}</p>
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

        document.querySelectorAll('.nav-item').forEach(el => {
            let navUrl = el.getAttribute('data-nav');
            if (navUrl) {
                let targetPath = navUrl;
                try {
                    if (navUrl.startsWith('http')) {
                        targetPath = new URL(navUrl).pathname;
                    }
                } catch(e) {}
                let normalizedTarget = targetPath.endsWith('/') && targetPath.length > 1 ? targetPath.slice(0, -1) : targetPath;
                
                if (normalizedTarget === normalizedPath) {
                    el.classList.add('active');
                }
            }
        });

        const mainMenu = document.querySelector('[data-ref="sidebar-menu-main"]');
        const settingsMenu = document.querySelector('[data-ref="sidebar-menu-settings"]');
        const adminMenu = document.querySelector('[data-ref="sidebar-menu-admin"]');
        const sitePolicyMenu = document.querySelector('[data-ref="sidebar-menu-site-policy"]'); 
        
        if (mainMenu && settingsMenu) {
            if (normalizedPath.includes('/admin') && adminMenu) {
                mainMenu.classList.remove('active'); mainMenu.classList.add('disabled');
                settingsMenu.classList.remove('active'); settingsMenu.classList.add('disabled');
                if (sitePolicyMenu) { sitePolicyMenu.classList.remove('active'); sitePolicyMenu.classList.add('disabled'); }
                adminMenu.classList.remove('disabled'); adminMenu.classList.add('active');
            } else if (normalizedPath.includes('/settings')) {
                mainMenu.classList.remove('active'); mainMenu.classList.add('disabled');
                if (adminMenu) { adminMenu.classList.remove('active'); adminMenu.classList.add('disabled'); }
                if (sitePolicyMenu) { sitePolicyMenu.classList.remove('active'); sitePolicyMenu.classList.add('disabled'); }
                settingsMenu.classList.remove('disabled'); settingsMenu.classList.add('active');
            } else if (normalizedPath.includes('/site-policy') && sitePolicyMenu) {
                mainMenu.classList.remove('active'); mainMenu.classList.add('disabled');
                settingsMenu.classList.remove('active'); settingsMenu.classList.add('disabled');
                if (adminMenu) { adminMenu.classList.remove('active'); adminMenu.classList.add('disabled'); }
                sitePolicyMenu.classList.remove('disabled'); sitePolicyMenu.classList.add('active');
            } else {
                settingsMenu.classList.remove('active'); settingsMenu.classList.add('disabled');
                if (adminMenu) { adminMenu.classList.remove('active'); adminMenu.classList.add('disabled'); }
                if (sitePolicyMenu) { sitePolicyMenu.classList.remove('active'); sitePolicyMenu.classList.add('disabled'); }
                mainMenu.classList.remove('disabled'); mainMenu.classList.add('active');
            }
        }

        const checkDropdownFallback = (token) => {
            const dropdownItems = document.querySelectorAll('.component-module--dropdown .nav-item');
            let hasExactMatch = false;
            let fallbackItem = null;
            
            dropdownItems.forEach(el => {
                let navUrl = el.getAttribute('data-nav') || '';
                if (navUrl.includes(token)) {
                    if (el.classList.contains('active')) {
                        hasExactMatch = true;
                    }
                    if (!fallbackItem) {
                        fallbackItem = el; 
                    }
                }
            });

            if (!hasExactMatch && fallbackItem) {
                fallbackItem.classList.add('active');
            }
        };

        if (normalizedPath.includes('/settings')) {
            checkDropdownFallback('/settings');
        } else if (normalizedPath.includes('/admin')) {
            checkDropdownFallback('/admin');
        } else if (normalizedPath.includes('/site-policy')) {
            checkDropdownFallback('/site-policy');
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

    _showLoaderInOutlet(cleanUrl) {
        let mapKey = cleanUrl;
        
        // --- MAPEO DE RUTAS DINÁMICAS PARA QUE CARGUE EL SKELETON CORRECTO ---
        if (cleanUrl.startsWith('/design/s/')) {
            mapKey = '/design/s/:uuid';
        } else if (cleanUrl.startsWith('/snapshot/view/')) {
            mapKey = '/snapshot/view/:id';
        } else if (cleanUrl.startsWith('/design/')) {
            mapKey = '/design';
        } else if (cleanUrl.startsWith('/canvases/manage/requests/')) {
            mapKey = '/canvases/manage/requests/:uuid';
        } else if (cleanUrl.startsWith('/canvases/manage/resets/')) {
            mapKey = '/canvases/manage/resets/:uuid';
        } else if (cleanUrl.startsWith('/canvases/edit/')) {
            mapKey = '/canvases/edit/:uuid';
        } else if (cleanUrl.startsWith('/canvases/members/')) {
            mapKey = '/canvases/members/:uuid';
        }
        // -------------------------------------------------------------

        const routeConfig = RouteModulesMap[mapKey];
        const skeletonType = routeConfig && routeConfig.skeletonType ? routeConfig.skeletonType : 'generic';
        
        this.outlet.innerHTML = SkeletonTemplates.get(skeletonType);
    }
}