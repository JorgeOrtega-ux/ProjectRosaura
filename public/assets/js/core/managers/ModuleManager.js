/**
 * ModuleManager — Gestiona los dropdowns, bottom sheets, y drag-to-close mobile.
 * Extrae la lógica de módulos y gesture handling de MainController.
 */
export class ModuleManager {
    constructor(config = {}) {
        this.config = {
            closeOnEsc: true,
            allowMultipleModules: false,
            ...config
        };

        this.dragState = {
            startY: 0,
            currentY: 0,
            currentDiff: 0,
            isDragging: false,
            panel: null,
            module: null
        };

        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound   = this.handlePointerUp.bind(this);
        this.handleKeyDownBound     = this.handleKeyDown.bind(this);
        this.handleResizeBound      = this.handleResize.bind(this);
    }

    get isMobile() { return window.innerWidth <= 768; }

    init() {
        document.addEventListener('pointerdown', this.handlePointerDownBound);
        document.addEventListener('pointermove', this.handlePointerMoveBound);
        document.addEventListener('pointerup',   this.handlePointerUpBound);
        document.addEventListener('pointercancel', this.handlePointerUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        window.addEventListener('resize', this.handleResizeBound);
    }

    destroy() {
        document.removeEventListener('pointerdown', this.handlePointerDownBound);
        document.removeEventListener('pointermove', this.handlePointerMoveBound);
        document.removeEventListener('pointerup',   this.handlePointerUpBound);
        document.removeEventListener('pointercancel', this.handlePointerUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        window.removeEventListener('resize', this.handleResizeBound);
    }

    // ─── Keyboard ─────────────────────────────────────────────────────────────

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.config.closeOnEsc) this.closeAllModules();
    }

    // ─── Resize ───────────────────────────────────────────────────────────────

    handleResize() {
        if (!this.isMobile) {
            document.querySelectorAll('.is-dragging').forEach(m => {
                m.classList.remove('is-dragging');
                const p = m.querySelector('.component-menu');
                if (p) p.removeAttribute('style');
            });
            this.dragState.isDragging = false;
        }
    }

    // ─── Module open/close ────────────────────────────────────────────────────

    toggle(moduleName) {
        const moduleEl = document.querySelector(`[data-module="${moduleName}"]`);
        if (!moduleEl) return;
        const isCurrentlyActive = !moduleEl.classList.contains('disabled');
        if (!this.config.allowMultipleModules && !isCurrentlyActive) this.closeAllModules();
        isCurrentlyActive ? this.close(moduleEl) : this.open(moduleEl);
    }

    open(module) {
        const mainMenu    = module.querySelector('[data-menu="main-options"]');
        const accountMenu = module.querySelector('[data-menu="account-switcher"]');

        if (mainMenu && accountMenu) {
            mainMenu.classList.remove('disabled');
            mainMenu.classList.add('active');
            accountMenu.classList.remove('active');
            accountMenu.classList.add('disabled');
        }

        module.classList.replace('disabled', 'active');
    }

    close(module) {
        module.classList.replace('active', 'disabled');
        module.querySelectorAll('.component-menu').forEach(p => p.removeAttribute('style'));

        // Reset internal menu pages to main
        const mainPage = module.querySelector('[data-menu-page="main"]');
        if (mainPage) {
            module.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
            mainPage.classList.add('active');
        }

        // Remove dynamic card dropdowns from DOM after close animation
        if (module.dataset.module?.startsWith('snapshot-menu-') || module.closest('.component-gallery-actions-wrapper')) {
            setTimeout(() => module.remove(), 250);
        }
    }

    closeAllModules() {
        document.querySelectorAll('.component-module:not(.disabled)').forEach(m => this.close(m));
    }

    /**
     * Marca módulos bottom-sheet para animaciones CSS.
     */
    markBottomSheets() {
        document.querySelectorAll('.component-module--dropdown:not(.bs-initialized)').forEach(module => {
            module.classList.add('bs-initialized');
        });
    }

    /**
     * Cierra el módulo si el click fue fuera de sus paneles.
     * Llamar desde el handler global de click del orquestador.
     * @param {MouseEvent} e
     */
    handleOutsideClick(e) {
        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(module => {
            if (this.dragState.isDragging) return;
            let clickedInside = false;
            module.querySelectorAll('.component-menu').forEach(panel => {
                if (panel.contains(e.target)) clickedInside = true;
            });
            if (!clickedInside) this.close(module);
        });
    }

    // ─── Sub-menu navigation ──────────────────────────────────────────────────

    showSubMenu(currentMenu, targetMenuName) {
        const targetMenu = document.querySelector(`[data-menu="${targetMenuName}"]`);
        if (currentMenu && targetMenu) {
            currentMenu.classList.replace('active', 'disabled');
            targetMenu.classList.replace('disabled', 'active');
        }
    }

    toggleMenuInModule(moduleName, menuName) {
        const moduleEl = document.querySelector(`[data-module="${moduleName}"]`);
        if (!moduleEl) return;

        const targetMenu = moduleEl.querySelector(`[data-ref="${menuName}"]`);
        const isModuleActive = !moduleEl.classList.contains('disabled');
        const isMenuCurrentlyActive = targetMenu && !targetMenu.classList.contains('disabled');

        if (isModuleActive && isMenuCurrentlyActive) {
            this.close(moduleEl);
        } else {
            if (!this.config.allowMultipleModules) this.closeAllModules();

            moduleEl.querySelectorAll('.component-menu').forEach(m => {
                m.classList.remove('active');
                m.classList.add('disabled');
            });

            if (targetMenu) {
                targetMenu.classList.remove('disabled');
                targetMenu.classList.add('active');
            }

            this.open(moduleEl);
        }
    }

    // ─── Drag-to-close (bottom sheets mobile) ─────────────────────────────────

    handlePointerDown(e) {
        if (!this.isMobile) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const dragHandle = e.target.closest('.pill-container');
        if (!dragHandle) return;

        const panel  = dragHandle.closest('.component-menu');
        const module = dragHandle.closest('.component-module');
        if (!panel || !module) return;

        e.preventDefault();
        e.stopPropagation();

        panel.setPointerCapture(e.pointerId);
        this.dragState.isDragging = true;
        this.dragState.startY     = e.clientY;
        this.dragState.module     = module;
        this.dragState.panel      = panel;
        module.classList.add('is-dragging');
    }

    handlePointerMove(e) {
        if (!this.dragState.isDragging) return;
        if (e.cancelable) e.preventDefault();
        const diff = e.clientY - this.dragState.startY;
        if (diff > 0) {
            this.dragState.panel.style.transform = `translateY(${diff}px)`;
            this.dragState.currentDiff = diff;
        }
    }

    handlePointerUp(e) {
        if (!this.dragState.isDragging) return;
        this.dragState.isDragging = false;

        const { module, panel, currentDiff } = this.dragState;

        module.classList.remove('is-dragging');
        if (panel.hasPointerCapture(e.pointerId)) panel.releasePointerCapture(e.pointerId);

        if (currentDiff > panel.offsetHeight * 0.40) {
            this.close(module);
        } else {
            panel.removeAttribute('style');
        }

        this.dragState.currentDiff = 0;
        this.dragState.module      = null;
        this.dragState.panel       = null;
    }
}
