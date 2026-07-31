import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { renderSkeleton, showMessage } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { CanvasCardInteractions } from '../../../core/components/CanvasCardInteractions.js';
import { VirtualGridObserver } from '../../../core/utils/VirtualGridObserver.js';

class HomeController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        
        this.contentArea = null;
        this.cardInteractions = null;
        
        this.currentOffset = 0;
        this.allCanvases = [];
        this.isLoadingMore = false;
        this.hasMore = true;
        this.currentTag = 'all';
        this.observer = null;
        this.virtualObserver = null;
        
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        this.cardInteractions = new CanvasCardInteractions(this.api, this.basePath, this.abortController);
        
        this.virtualObserver = new VirtualGridObserver((canvas) => {
            return CardTemplates.canvasCard(canvas, { basePath: this.basePath });
        });
        
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
        this.setupCarouselDrag();
        this.syncOfflineSandboxes();
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        document.removeEventListener('click', this.handleGlobalClickBound);
        if (this.observer) this.observer.disconnect();
        if (this.virtualObserver) this.virtualObserver.disconnect();
    }

    bindEvents() {
        document.addEventListener('click', this.handleGlobalClickBound);
        
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
        if (carousel) {
            carousel.addEventListener('scroll', () => this.updateCarouselButtons());
            window.addEventListener('resize', () => this.updateCarouselButtons());
            
            setTimeout(() => this.updateCarouselButtons(), 100);
        }
    }

    updateCarouselButtons() {
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
        const leftBtn = document.querySelector('.component-tag-nav-left');
        const rightBtn = document.querySelector('.component-tag-nav-right');
        
        if (!carousel || !leftBtn || !rightBtn) return;
        
        if (carousel.scrollLeft > 0) {
            leftBtn.classList.remove('disabled');
        } else {
            leftBtn.classList.add('disabled');
        }
        
        if (carousel.scrollWidth > carousel.clientWidth && Math.ceil(carousel.scrollLeft + carousel.clientWidth) < carousel.scrollWidth) {
            rightBtn.classList.remove('disabled');
        } else {
            rightBtn.classList.add('disabled');
        }
    }

    setupCarouselDrag() {
        const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
        if (!carousel) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        let isDragging = false;

        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });
        
        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        });
        
        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
            setTimeout(() => { isDragging = false; }, 50);
        });
        
        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2; 
            if (Math.abs(walk) > 5) {
                isDragging = true;
                carousel.classList.add('is-dragging');
            }
            if (isDragging) {
                carousel.scrollLeft = scrollLeft - walk;
            }
        });

        carousel.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true });
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

        if (action === 'filterHomeTag') {
            const selectedTag = actionBtn.getAttribute('data-tag') || 'all';
            
            // Skip if clicking the already-active tag
            if (selectedTag === this.currentTag) return;
            
            document.querySelectorAll('.component-tags-carousel .component-badge').forEach(btn => btn.classList.remove('active'));
            actionBtn.classList.add('active');
            
            this.contentArea.innerHTML = '<div class="component-grid" data-ref="home-all-canvases"></div>';
            renderSkeleton(this.contentArea.querySelector('.component-grid'), 'homeCanvasGrid');
            
            this.loadCanvases();
            return;
        }

        if (action === 'scrollTagsLeft') {
            const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
            if (carousel) carousel.scrollBy({ left: -200, behavior: 'smooth' });
            return;
        }
        
        if (action === 'scrollTagsRight') {
            const carousel = document.querySelector('[data-ref="home-tags-carousel"]');
            if (carousel) carousel.scrollBy({ left: 200, behavior: 'smooth' });
            return;
        }

        if (action === 'openCreateSandboxModal') {
            e.preventDefault();
            this.openCreateSandboxModal();
            return;
        }

        if (action === 'goCreateForm') {
            setTimeout(() => {
                const size = this.getSandboxSelectedSize();
                this.selectedSandboxTemplateId = "";
                const hiddenInput = document.getElementById('sandbox_template_id');
                if (hiddenInput) hiddenInput.value = "";
                this.updateSandboxTemplatesGrid(size);
            }, 0);
        }

        if (action === 'selectValue' && actionBtn.getAttribute('data-type') === 'size') {
            setTimeout(() => {
                const size = actionBtn.getAttribute('data-value');
                this.updateSandboxTemplatesGrid(size);
            }, 0);
        }

        if (action === 'selectSandboxTemplate') {
            const templateId = actionBtn.getAttribute('data-template-id');
            this.selectedSandboxTemplateId = templateId || "";
            
            const listContainer = document.getElementById('sandbox_canvas_templates_list');
            if (listContainer) {
                listContainer.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
                actionBtn.classList.add('active');
            }
            
            const triggerText = document.getElementById('sandbox_text_template');
            if (triggerText) {
                const label = actionBtn.getAttribute('data-label');
                triggerText.textContent = label || 'Seleccionar plantilla';
            }
            
            const dropdownModule = actionBtn.closest('.component-module--dropdown');
            if (dropdownModule) {
                dropdownModule.classList.remove('active');
                dropdownModule.classList.add('disabled');
            }
            
            const hiddenInput = document.getElementById('sandbox_template_id');
            if (hiddenInput) {
                hiddenInput.value = templateId || "";
            }
            return;
        }

        if (this.cardInteractions && this.cardInteractions.handleAction(action, actionBtn)) {
            return;
        }
    }

    async loadCanvases(isLoadMore = false) {
        if (!isLoadMore) {
            this.currentOffset = 0;
            this.allCanvases = [];
            this.hasMore = true;
        }

        if (!this.hasMore || this.isLoadingMore) return;
        
        const activeTagEl = document.querySelector('.component-tags-carousel .component-badge.active');
        const currentTag = activeTagEl ? activeTagEl.getAttribute('data-tag') : 'all';
        this.currentTag = currentTag;

        this.isLoadingMore = true;
        if (isLoadMore && this.contentArea) {
            const grid = this.contentArea.querySelector('.component-grid');
            if (grid) {
                let skeletonCards = '';
                for (let i = 0; i < 4; i++) {
                    skeletonCards += `<div class="component-skeleton component-skeleton--card infinite-scroll-skeleton"></div>`;
                }
                grid.insertAdjacentHTML('beforeend', skeletonCards);
            }
        }

        let newCanvases = [];
        let isError = false;
        let res = null;
        const limit = 20;

        let localSandboxes = [];

        // If tag is 'sandbox', bypass API calls completely since sandboxes are strictly client-side
        if (currentTag === 'sandbox') {
            newCanvases = [];
            this.hasMore = false;
        } else {
            if (window.initialHomeCanvases && currentTag === 'all' && !isLoadMore) {
                newCanvases = window.initialHomeCanvases;
                window.initialHomeCanvases = null; 
            } else {
                res = await this.api.post(ApiRoutes.Canvases.GetHomeFeed, { limit: limit, offset: this.currentOffset, tag: currentTag }, this.abortController.signal).catch(() => null);
                
                if (this.abortController.signal.aborted) {
                    this.isLoadingMore = false;
                    return;
                }
                
                if (res && res.success) {
                    newCanvases = res.data || [];
                } else {
                    isError = true;
                }
            }
        }

        if (newCanvases.length > 0 || localSandboxes.length > 0 || (this.allCanvases.length > 0 && isLoadMore)) {
            if (!isLoadMore) {
                this.allCanvases = localSandboxes.concat(newCanvases);
            } else {
                this.allCanvases = this.allCanvases.concat(newCanvases);
            }
            this.renderCanvases(this.contentArea, this.allCanvases, isLoadMore);
        } else if (isError && !isLoadMore) {
            this.showError(this.contentArea, (res && res.message) ? res.message : window.__('err_load_canvases'));
        } else if (!isLoadMore) {
            if (currentTag === 'sandbox') {
                const emptyHtml = `
                    <div class="component-empty-state" data-ref="empty-state-rendered">
                        <span class="material-symbols-rounded component-empty-state-icon">science</span>
                        <p class="component-empty-state-text">No tienes lienzos sandbox creados. ¡Crea uno nuevo para empezar a diseñar sin conexión!</p>
                        <div class="component-empty-state-actions">
                            <button class="component-button component-button--h36 component-button--brand component-button--rounded-pill" data-action="openCreateSandboxModal">
                                <span class="material-symbols-rounded">add_box</span>
                                <span>Crear Primer Sandbox</span>
                            </button>
                        </div>
                    </div>
                `;
                this.contentArea.innerHTML = emptyHtml;
            } else {
                const msgEmpty = window.__ ? window.__('msg_home_empty') : 'No hay lienzos disponibles por el momento.';
                const btnLabel = window.__ ? window.__('btn_create_experience') : 'Crear Nuevo Lienzo';
                const emptyHtml = `
                    <div class="component-empty-state" data-ref="empty-state-rendered">
                        <span class="material-symbols-rounded component-empty-state-icon">dashboard_customize</span>
                        <p class="component-empty-state-text">${msgEmpty}</p>
                        <div class="component-empty-state-actions">
                            <div class="component-button component-button--h36 component-button--rounded-pill" data-nav="${this.basePath}/canvases/create">
                                <span class="material-symbols-rounded">add_box</span>
                                <span>${btnLabel}</span>
                            </div>
                        </div>
                    </div>
                `;
                this.contentArea.innerHTML = emptyHtml;
            }
        }
        
        if (this.contentArea) {
            const skeletons = this.contentArea.querySelectorAll('.infinite-scroll-skeleton');
            skeletons.forEach(s => s.remove());
        }
        
        if (newCanvases.length < limit) {
            this.hasMore = false;
        }
        this.currentOffset += newCanvases.length;
        this.isLoadingMore = false;

        this.reinitializeUI();
        this.setupInfiniteScroll();
    }

    setupInfiniteScroll() {
        if (!this.hasMore || !this.contentArea) return;
        
        if (this.observer) {
            this.observer.disconnect();
        }
        
        const cards = this.contentArea.querySelectorAll('.virtual-card-container, .component-card');
        if (cards.length === 0) return;
        
        const lastCard = cards[cards.length - 1];
        
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.observer.disconnect();
                this.loadCanvases(true);
            }
        }, { rootMargin: '200px' });
        
        this.observer.observe(lastCard);
    }

    showError(container, message) {
        if (container) {
            container.innerHTML = CardTemplates.emptyState(message, 'error');
        }
    }

    renderCanvases(container, canvases, isLoadMore = false) {
        if (!container) return;
        
        let grid = container.querySelector('.component-grid');
        
        if (!isLoadMore || !grid) {
            container.innerHTML = `<div class="component-grid" data-ref="home-all-canvases"></div>`;
            grid = container.querySelector('.component-grid');
            if (this.virtualObserver) {
                this.virtualObserver.disconnect();
                this.virtualObserver.initObserver(); // Reset observer state
            }
        }
        
        const fragment = document.createDocumentFragment();
        
        // Solo iteramos sobre los canvas que recién llegaron si es load more
        const itemsToRender = isLoadMore ? canvases.slice(this.currentOffset - canvases.length) : canvases;
        
        itemsToRender.forEach(canvas => {
            const wrapper = document.createElement('div');
            // La clase se añade en observe() internamente
            this.virtualObserver.observe(wrapper, canvas);
            fragment.appendChild(wrapper);
        });
        
        grid.appendChild(fragment);
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
        const sessionId = urlParams.get('session_id');
        if (urlParams.get('checkout') === 'success' && sessionId) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            for (let i = 0; i < 5; i++) {
                try {
                    const result = await this.api.post(ApiRoutes.Stripe.GetSubscriptionStatus, { session_id: sessionId }, this.abortController.signal);
                    if (result && result.success && result.data && (result.data.status === 'active' || result.data.tier > 0)) {
                        window.appUserTier = result.data.tier;
                        window.dispatchEvent(new CustomEvent('subscription-updated', { detail: result.data }));
                        if (window.modalSystem) {
                            window.modalSystem.show('purchaseSuccessModal', { ...result.data, item_type: 'subscription' });
                        }
                        break;
                    }
                } catch (e) {
                    
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    async openCreateSandboxModal() {
        if (!window.modalSystem) return;

        // Comprobar si es la primera vez (onboarding)
        const hasOnboarded = localStorage.getItem('rosaura_sandbox_onboarded') === 'true';

        // Cargar lista actual de sandboxes
        let currentList = [];
        try {
            const listJson = localStorage.getItem('rosaura_sandboxes_list');
            if (listJson) currentList = JSON.parse(listJson);
        } catch (e) {}

        // Cargar configuraciones (incluyendo thumbnail) para cada sandbox
        let detailedSandboxesList = [];
        try {
            const DesignSandboxDbModule = await import('../design/DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
            detailedSandboxesList = await Promise.all(currentList.map(async (sb) => {
                let thumb = null;
                let width = 64;
                let height = 64;
                let palette = 'default';
                let cooldownBatch = 100;
                try {
                    const settings = await DesignSandboxDb.getSettings(sb.uuid);
                    if (settings) {
                        thumb = settings.thumbnail || null;
                        width = settings.width || 64;
                        height = settings.height || 64;
                        palette = settings.paletteId || 'default';
                        cooldownBatch = settings.cooldownBatch || 100;
                    }
                } catch (err) {}
                return {
                    uuid: sb.uuid,
                    name: sb.name,
                    width: width,
                    height: height,
                    palette: palette,
                    cooldownBatch: cooldownBatch,
                    thumbnail: thumb
                };
            }));
        } catch (err) {
            console.error('Error precargando detalles de sandboxes:', err);
            detailedSandboxesList = currentList.map(sb => ({
                uuid: sb.uuid,
                name: sb.name,
                width: 64,
                height: 64,
                palette: 'default',
                cooldownBatch: 100,
                thumbnail: null
            }));
        }

        // Fetch templates
        let templates = [];
        try {
            const resTemplates = await fetch(`${this.basePath}/assets/config/canvas_templates.json`);
            if (resTemplates.ok) {
                templates = await resTemplates.json();
            }
        } catch (e) {
            console.error('Error cargando plantillas de lienzo:', e);
        }
        this.canvasTemplates = templates;
        this.selectedSandboxTemplateId = "";

        // Mostrar el modal unificado
        const res = await window.modalSystem.show('sandboxLobbyModal', {
            hasOnboarded: hasOnboarded,
            sandboxes: detailedSandboxesList
        });

        if (res && res.confirmed && res.data) {
            const action = res.data.sandbox_action;

            if (action === 'play_existing') {
                const selectedUuid = res.data.selected_sandbox_uuid;
                if (!selectedUuid) {
                    showMessage('Por favor selecciona un mundo para jugar', 'error');
                    return;
                }
                // Redirigir al sandbox seleccionado en una nueva pestaña
                window.open(`${this.basePath}/design/sandbox/${selectedUuid}`, '_blank');
            } else if (action === 'create_new') {
                // Comprobar límite de 10 sandboxes
                if (currentList.length >= 10) {
                    showMessage('Has alcanzado el límite máximo de 10 lienzos sandbox locales.', 'error');
                    return;
                }

                const name = res.data.sandbox_name ? res.data.sandbox_name.trim() : '';
                const width = parseInt(res.data.sandbox_width, 10) || 64;
                const height = parseInt(res.data.sandbox_height, 10) || 64;
                const cooldownBatch = parseInt(res.data.sandbox_cooldown_batch, 10) || 100;
                const palette = res.data.sandbox_palette || 'default';

                if (!name) {
                    showMessage('El nombre del lienzo es obligatorio', 'error');
                    return;
                }

                // Generar UUID único
                const uuid = this.generateUuid();

                // Guardar en la lista en localStorage
                const newSandbox = {
                    uuid: uuid,
                    name: name,
                    size: width, // mantenemos compatibilidad con el esquema original
                    palette: palette,
                    createdAt: Date.now()
                };
                currentList.push(newSandbox);
                localStorage.setItem('rosaura_sandboxes_list', JSON.stringify(currentList));

                // Guardar configuración inicial en IndexedDB
                try {
                    const DesignSandboxDbModule = await import('../design/DesignSandboxDb.js');
                    const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
                    await DesignSandboxDb.saveSettings({
                        name: name,
                        width: width,
                        height: height,
                        paletteId: palette,
                        cooldownBatch: cooldownBatch
                    }, uuid);

                    const templateId = res.data.sandbox_template_id || '';
                    if (templateId && this.canvasTemplates) {
                        const template = this.canvasTemplates.find(t => t.id === templateId);
                        if (template) {
                            const sizeStr = `${width}x${height}`;
                            const relativeImgPath = template.image_paths[sizeStr];
                            if (relativeImgPath) {
                                try {
                                    await this.prepaintSandboxWithTemplate(uuid, relativeImgPath, width, height);
                                } catch (err) {
                                    console.error('Error pre-pintando lienzo con plantilla:', err);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error saving sandbox settings to IndexedDB:', e);
                }

                showMessage('Lienzo Sandbox creado con éxito', 'success');

                // Recargar feed para mostrar el nuevo canvas
                this.loadCanvases();

                // Redirigir al nuevo sandbox creado
                window.open(`${this.basePath}/design/sandbox/${uuid}`, '_blank');
            }
        }
    }

    getSandboxSelectedSize() {
        const widthInput = document.getElementById('sandbox_width');
        const heightInput = document.getElementById('sandbox_height');
        if (widthInput && heightInput) {
            return `${widthInput.value}x${heightInput.value}`;
        }
        return '64x64';
    }

    updateSandboxTemplatesGrid(size) {
        const trigger = document.getElementById('sandbox_template_dropdown_trigger');
        const triggerText = document.getElementById('sandbox_text_template');
        const listContainer = document.getElementById('sandbox_canvas_templates_list');
        const hiddenInput = document.getElementById('sandbox_template_id');

        if (!trigger || !listContainer) return;

        const templates = this.canvasTemplates || [];
        
        // Filter templates compatible with current size
        const availableTemplates = templates.filter(tpl => tpl.sizes.includes(size));
        
        // If current template is not compatible with new size, reset it
        const selectedTpl = templates.find(t => t.id === this.selectedSandboxTemplateId);
        if (selectedTpl && !selectedTpl.sizes.includes(size)) {
            this.selectedSandboxTemplateId = "";
            if (hiddenInput) hiddenInput.value = "";
        }

        if (availableTemplates.length === 0) {
            triggerText.textContent = 'Sin plantillas disponibles';
            trigger.classList.add('disabled-interaction');
            listContainer.innerHTML = '';
        } else {
            trigger.classList.remove('disabled-interaction');

            let html = '';
            
            // Add default (Lienzo Vacío) option
            const isNoneActive = !this.selectedSandboxTemplateId ? 'active' : '';
            html += `
                <div class="component-menu-link ${isNoneActive}" data-action="selectSandboxTemplate" data-template-id="" data-label="Lienzo Vacío">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_free</span></div>
                    <div class="component-menu-link-text"><span>Lienzo Vacío</span></div>
                </div>
            `;
            
            availableTemplates.forEach(tpl => {
                const isActive = this.selectedSandboxTemplateId === tpl.id ? 'active' : '';
                const name = window.__ ? window.__(tpl.name_key) : tpl.id;
                
                html += `
                    <div class="component-menu-link ${isActive}" data-action="selectSandboxTemplate" data-template-id="${tpl.id}" data-label="${name}">
                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">crop_free</span></div>
                        <div class="component-menu-link-text"><span>${name}</span></div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = html;
            
            const currentSelected = availableTemplates.find(t => t.id === this.selectedSandboxTemplateId);
            if (currentSelected) {
                triggerText.textContent = window.__ ? window.__(currentSelected.name_key) : currentSelected.id;
            } else {
                triggerText.textContent = 'Seleccionar plantilla';
            }
        }
    }

    async prepaintSandboxWithTemplate(uuid, relativeImgPath, width, height) {
        const DesignSandboxDbModule = await import('../design/DesignSandboxDb.js');
        const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

        const img = new Image();
        img.src = this.basePath + relativeImgPath;
        
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load template image: ' + img.src));
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, width, height).data;
        
        const chunkSize = 512;
        const numCols = Math.ceil(width / chunkSize);
        const numRows = Math.ceil(height / chunkSize);

        for (let cy = 0; cy < numRows; cy++) {
            for (let cx = 0; cx < numCols; cx++) {
                const chunkW = Math.min(chunkSize, width - cx * chunkSize);
                const chunkH = Math.min(chunkSize, height - cy * chunkSize);
                
                const chunkBytes = new Uint8Array(chunkW * chunkH * 4);
                
                for (let y = 0; y < chunkH; y++) {
                    const globalY = cy * chunkSize + y;
                    const srcOffset = (globalY * width + (cx * chunkSize)) * 4;
                    const destOffset = y * chunkW * 4;
                    
                    for (let i = 0; i < chunkW * 4; i++) {
                        chunkBytes[destOffset + i] = imgData[srcOffset + i];
                    }
                }
                
                const key = `${cx},${cy}`;
                const base64 = await DesignSandboxDb.compressAndEncode(chunkBytes);
                await DesignSandboxDb.saveChunk(key, base64, uuid);
            }
        }
    }

    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async syncOfflineSandboxes() {
        const activeUserId = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
        if (!activeUserId) return;

        try {
            let localList = [];
            try {
                const listJson = localStorage.getItem('rosaura_sandboxes_list');
                if (listJson) {
                    localList = JSON.parse(listJson);
                }
            } catch (e) {
                console.error('[Lobby Sync] Failed to parse local sandbox list', e);
            }

            const sandboxesToSync = localList.map(sb => ({
                uuid: sb.uuid,
                name: sb.name || 'Sandbox',
                width: parseInt(sb.size || sb.width || 64, 10),
                height: parseInt(sb.size || sb.height || 64, 10),
                palette: sb.palette || 'default',
                cooldownBatch: parseInt(sb.cooldownBatch || sb.cooldown_batch || 100, 10)
            }));

            console.log('[Lobby Sync] Syncing sandboxes list with cloud...', sandboxesToSync);
            const response = await this.api.post('sandbox.sync_list', { sandboxes: sandboxesToSync });

            if (response && response.success && response.sandboxes) {
                const cloudList = response.sandboxes;
                const DesignSandboxDbModule = await import('../design/DesignSandboxDb.js');
                const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                const updatedLocalList = [];

                for (const cloudSb of cloudList) {
                    const localMatch = localList.find(s => s.uuid === cloudSb.uuid);
                    
                    if (!localMatch) {
                        try {
                            console.log('[Lobby Sync] Downloading sandbox state for:', cloudSb.uuid);
                            const stateRes = await this.api.post('sandbox.get_state', { uuid: cloudSb.uuid });
                            if (stateRes && stateRes.success && stateRes.settings) {
                                await DesignSandboxDb.saveSettings(stateRes.settings, cloudSb.uuid);
                                if (stateRes.chunks) {
                                    for (const [key, base64Data] of Object.entries(stateRes.chunks)) {
                                        await DesignSandboxDb.saveChunk(key, base64Data, cloudSb.uuid);
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('[Lobby Sync] Failed to download state for sandbox:', cloudSb.uuid, err);
                        }
                    }

                    updatedLocalList.push({
                        uuid: cloudSb.uuid,
                        name: cloudSb.name,
                        size: cloudSb.width,
                        width: cloudSb.width,
                        height: cloudSb.height,
                        palette: cloudSb.palette,
                        cooldownBatch: cloudSb.cooldownBatch,
                        createdAt: localMatch ? (localMatch.createdAt || Date.now()) : Date.now()
                    });
                }

                localStorage.setItem('rosaura_sandboxes_list', JSON.stringify(updatedLocalList));
                console.log('[Lobby Sync] Sandboxes list synced successfully with server.');
            }
        } catch (e) {
            console.warn('[Lobby Sync] Failed to synchronize sandbox list with the server:', e);
        }
    }
}

export { HomeController };