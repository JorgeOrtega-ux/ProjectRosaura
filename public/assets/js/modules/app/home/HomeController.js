import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { renderSkeleton } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';

class HomeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        this.contentArea = null;
        this.cardInteractions = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        
        this.bindEvents();
        
        this.contentArea = document.querySelector('[data-ref="dynamic-content-area"]');
        
        if (this.contentArea) {
            const initialData = this.contentArea.getAttribute('data-initial-canvases');
            if (initialData) {
                try {
                    window.initialHomeCanvases = JSON.parse(initialData);
                    this.contentArea.removeAttribute('data-initial-canvases');
                } catch(e) {}
            }

            if (!window.initialHomeCanvases) {
                
                this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-all-canvases"></div>';
                renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            }
        }
        
        this.loadCanvases();
        this.checkCheckoutSuccess();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
    }

    handleGlobalClick(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        
        const action = actionBtn.getAttribute('data-action');

        if (action === 'reloadHome') {
            e.preventDefault();
            this.loadCanvases();
            return;
        }

        if (action === 'openFilterSubMenu') {
            this.openFilterSubMenu(actionBtn);
            return;
        }

        if (action === 'backToMainFilters') {
            this.backToMainFilters(actionBtn);
            return;
        }

        if (action === 'changeHomeFilter' || action === 'changeExploreSort') {

            if (actionBtn.tagName.toLowerCase() === 'input' && actionBtn.type === 'checkbox') {
                const name = actionBtn.getAttribute('name');
                document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
                    if (cb !== actionBtn) cb.checked = false;
                });
            }

            this.updateFilterDot();

            const dropdownModule = actionBtn.closest('.component-module');
            if (dropdownModule) {
                
            }
            this.loadCanvases();
            return;
        }

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }
    }

    async loadCanvases() {
        const isExplore = window.location.pathname.includes('/explore');
        const isHome = !isExplore && (window.location.pathname === '/' || window.location.pathname.includes('/home'));
        const isLoggedIn = window.activeUserId !== null;

        if (isHome && !isLoggedIn) {
            const msgEmpty = window.__ ? window.__('msg_home_guest') || window.__('msg_home_guest') : window.__('msg_home_guest');
            const emptyHtml = `
                <div class="component-empty-state" data-ref="empty-state-rendered" style="padding: 40px 20px;">
                    <span class="material-symbols-rounded component-empty-state-icon">explore</span>
                    <p class="component-empty-state-text" style="font-size: 1.1rem;">${msgEmpty}</p>
                    <div style="margin-top: 24px;">
                        <a href="${this.basePath}/explore" class="component-button component-button--brand" data-nav="${this.basePath}/explore">
                            <span class="material-symbols-rounded">rocket_launch</span> Explorar Ahora
                        </a>
                    </div>
                </div>
            `;
            this.contentArea.innerHTML = emptyHtml;
            this.reinitializeUI();
            return;
        }

        let allCanvases = [];
        let isError = false;

        if (isHome && isLoggedIn) {
            
            const filterRadio = document.querySelector('input[name="home_filter"]:checked');
            const filter = filterRadio ? filterRadio.value : 'all';

            if (window.initialHomeCanvases && filter === 'all') {
                allCanvases = window.initialHomeCanvases;
                window.initialHomeCanvases = null; 
            } else {
                
                const res = await this.api.post(ApiRoutes.Canvases.GetMine, { limit: 50, filter: filter }, this.abortController.signal).catch(() => null);
                if (this.abortController.signal.aborted) return;
                
                if (res && res.success) {
                    allCanvases = res.data || [];
                } else {
                    isError = true;
                }
            }

            if (allCanvases.length > 0) {
                this.renderCanvases(this.contentArea, allCanvases);
            } else if (isError) {
                this.showError(this.contentArea, (res && res.message) ? res.message : window.__('err_load_canvases'));
            } else {
                const msgEmpty = window.__ ? window.__('msg_home_empty') || window.__('msg_home_empty') : window.__('msg_home_empty');
                const emptyHtml = `
                    <div class="component-empty-state" data-ref="empty-state-rendered" style="padding: 40px 20px;">
                        <span class="material-symbols-rounded component-empty-state-icon">dashboard_customize</span>
                        <p class="component-empty-state-text" style="font-size: 1.1rem; max-width: 400px; margin: 0 auto;">${msgEmpty}</p>
                        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <a href="${this.basePath}/canvases/manage" class="component-button component-button--brand" data-nav="${this.basePath}/canvases/manage">
                                <span class="material-symbols-rounded">add</span> Crear
                            </a>
                            <a href="${this.basePath}/explore" class="component-button component-button--dark" data-nav="${this.basePath}/explore">
                                <span class="material-symbols-rounded">explore</span> Explorar
                            </a>
                        </div>
                    </div>
                `;
                this.contentArea.innerHTML = emptyHtml;
            }
        } else {
            
            const sortRadio = document.querySelector('input[name="explore_sort"]:checked');
            const sort = sortRadio ? sortRadio.value : 'newest';

            if (window.initialHomeCanvases && sort === 'newest') {
                allCanvases = window.initialHomeCanvases;
                window.initialHomeCanvases = null;
            } else {
                
                const [publicRes, officialRes] = await Promise.all([
                    this.api.post(ApiRoutes.Canvases.GetPublic, { limit: 50, sort: sort }, this.abortController.signal).catch(() => null),
                    this.api.post(ApiRoutes.Canvases.GetOfficial, { sort: sort }, this.abortController.signal).catch(() => null)
                ]);
                
                if (this.abortController.signal.aborted) return;

                if (officialRes && officialRes.success) {
                    allCanvases = allCanvases.concat(officialRes.data || []);
                } else if (!officialRes) {
                    isError = true;
                }

                if (publicRes && publicRes.success) {
                    const existingIds = new Set(allCanvases.map(c => c.id));
                    const newPublics = (publicRes.data || []).filter(c => !existingIds.has(c.id));
                    allCanvases = allCanvases.concat(newPublics);
                } else if (!publicRes) {
                    isError = true;
                }

                if (allCanvases.length > 0) {
                    allCanvases.sort((a, b) => {
                        if (sort === 'oldest') {
                            return new Date(a.created_at) - new Date(b.created_at);
                        } else if (sort === 'members') {
                            if (b.members_count !== a.members_count) {
                                return b.members_count - a.members_count;
                            }
                            return new Date(b.created_at) - new Date(a.created_at);
                        } else { 
                            return new Date(b.created_at) - new Date(a.created_at);
                        }
                    });
                }
            }

            if (allCanvases.length > 0) {
                this.renderCanvases(this.contentArea, allCanvases);
            } else if (isError) {
                this.showError(this.contentArea, window.__ ? window.__('err_load_public_canvases') : 'Error al cargar lienzos. El servidor no responde.');
            } else {
                const msgEmpty = window.__ ? window.__('empty_home_gallery') || window.__('empty_home_gallery') : window.__('empty_home_gallery');
                this.contentArea.innerHTML = CardTemplates.emptyState(msgEmpty, 'collections');
            }
        }

        this.reinitializeUI();
    }

    showError(container, message) {
        if (container) {
            container.innerHTML = CardTemplates.emptyState(message, 'error');
        }
    }

    renderCanvases(container, canvases) {
        if (!container) return;
        const cardsHtml = canvases.map(canvas => CardTemplates.canvasCard(canvas, { basePath: this.basePath })).join('');
        
        container.innerHTML = `<div class="component-grid" data-ref="home-all-canvases">${cardsHtml}</div>`;
    }

    reinitializeUI() {
        if (!this.contentArea) return;
        const grid = this.contentArea.querySelector('.component-grid');
        if (!grid) return; 
        
        if (window.app && typeof window.app.initModules === 'function') window.app.initModules(grid);
        else if (window.uiUtils && typeof window.uiUtils.initDropdowns === 'function') window.uiUtils.initDropdowns(grid);
        
        if (window.router && typeof window.router.bindLinks === 'function') window.router.bindLinks(grid);
    }

    async checkCheckoutSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('checkout') === 'success' && urlParams.get('session_id')) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            for (let i = 0; i < 5; i++) {
                try {
                    const result = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus, {}, this.abortController.signal);
                    if (result && result.success && result.data && result.data.status === 'active') {
                        if (window.dialogSystem) {
                            window.dialogSystem.show('welcomePremiumModal', result.data);
                        }
                        break;
                    }
                } catch (e) {
                    
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    openFilterSubMenu(btn) {
        const targetId = btn.getAttribute('data-target');
        const dropdown = btn.closest('.component-module');
        if (!dropdown) return;

        const targetMenu = dropdown.querySelector(`[data-ref="${targetId}"]`);
        const mainFilters = dropdown.querySelector('[data-ref="menuMainFilters"]');
        
        if (targetMenu && mainFilters) {
            mainFilters.classList.add('disabled');
            mainFilters.classList.remove('active');
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }
    }

    backToMainFilters(btn) {
        const activeModule = btn.closest('.component-module');
        if (!activeModule) return;
        
        const mainFilters = activeModule.querySelector('[data-ref="menuMainFilters"]');
        const subMenus = activeModule.querySelectorAll('.component-menu:not([data-ref="menuMainFilters"])');
        
        if (mainFilters) {
            subMenus.forEach(menu => {
                menu.classList.add('disabled');
                menu.classList.remove('active');
            });
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
        }
    }

    updateFilterDot() {
        const homeFiltersBtn = document.querySelector('[data-target="moduleHomeFilters"]');
        if (homeFiltersBtn) {
            const isDefault = document.querySelector('input[name="home_filter"][value="all"]')?.checked;
            if (isDefault) {
                homeFiltersBtn.classList.remove('has-active-filter');
            } else {
                homeFiltersBtn.classList.add('has-active-filter');
            }
        }

        const exploreFiltersBtn = document.querySelector('[data-target="moduleExploreFilters"]');
        if (exploreFiltersBtn) {
            const isDefault = document.querySelector('input[name="explore_sort"][value="newest"]')?.checked;
            if (isDefault) {
                exploreFiltersBtn.classList.remove('has-active-filter');
            } else {
                exploreFiltersBtn.classList.add('has-active-filter');
            }
        }
    }
}

export { HomeController };