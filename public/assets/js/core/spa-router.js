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
                
                // Cerrar cualquier sidebar/dropdown en móviles al hacer clic en un link
                const module = navTarget.closest('.component-module');
                if (module && module.classList.contains('active')) {
                    module.classList.remove('active');
                    module.classList.add('disabled');
                    const panel = module.querySelector('.component-menu');
                    if(panel) panel.removeAttribute('style');
                }
                
                const url = navTarget.dataset.nav;
                this.navigate(url);
            }
        });
        
        this.highlightCurrentRoute();
    }

    navigate(url) {
        if (window.location.pathname === url) return;
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

            const redirectUrl = response.headers.get('X-SPA-Redirect');
            if (redirectUrl) {
                window.location.href = redirectUrl; 
                return;
            }

            if (response.ok) {
                const html = await response.text();
                this.render(html);
                this.highlightCurrentRoute();
                this.updateDocumentTitle(url);
                
                // LÓGICA SPA PURA: Evaluamos si la ruta es de Auth y actualizamos el layout visual
                const isAuthRoute = url.includes('/login') || url.includes('/register');
                if (isAuthRoute) {
                    document.body.classList.add('layout-auth');
                } else {
                    document.body.classList.remove('layout-auth');
                }

                window.dispatchEvent(new CustomEvent('viewLoaded', { detail: { url } }));
            } else {
                this.render('<div class="view-content" style="padding: 24px; text-align: center;"><h1 style="color: #d32f2f;">Error HTTP</h1><p>No se pudo cargar la vista solicitada.</p></div>');
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
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        const targets = document.querySelectorAll(`[data-nav="${path}"], [data-nav="${path}/"]`);
        targets.forEach(target => {
            target.classList.add('active');
        });
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