/**
 * ModuleManager — Gestiona los dropdowns, sidebars, bottom sheets, navegación de submenús y drag-to-close mobile.
 * Unifica el ciclo de vida y la jerarquía de módulos (.component-module).
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
        if (e.key === 'Escape' && this.config.closeOnEsc) {
            const hasActiveModal = document.querySelector('.component-modal-overlay.active, .chat-image-viewer-overlay.active, .modal-container .component-modal-box');
            if (hasActiveModal) return;

            this.closeAllModules();
        }
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

    // ─── Module Resolution ────────────────────────────────────────────────────

    /**
     * Resuelve el elemento del módulo buscando contextualmente cerca del trigger antes de buscar globalmente.
     * @param {string|Element} moduleTarget 
     * @param {Element|null} triggerEl 
     * @returns {Element|null}
     */
    resolveModule(moduleTarget, triggerEl = null) {
        if (!moduleTarget) return null;
        if (moduleTarget instanceof Element) return moduleTarget;

        if (triggerEl && triggerEl instanceof Element) {
            const dropdownWrapper = triggerEl.closest('.component-dropdown-wrapper');
            if (dropdownWrapper) {
                const localMod = dropdownWrapper.querySelector(`[data-module="${moduleTarget}"]`);
                if (localMod) return localMod;
            }

            const modalBox = triggerEl.closest('.component-modal-box, .component-modal-wrapper');
            if (modalBox) {
                const modalMod = modalBox.querySelector(`[data-module="${moduleTarget}"]`);
                if (modalMod) return modalMod;
            }

            const parentMod = triggerEl.closest('.component-module');
            if (parentMod) {
                const childMod = parentMod.querySelector(`[data-module="${moduleTarget}"]`);
                if (childMod) return childMod;
            }

            if (triggerEl.parentElement) {
                const siblingMod = triggerEl.parentElement.querySelector(`[data-module="${moduleTarget}"]`);
                if (siblingMod) return siblingMod;
            }
        }

        return document.querySelector(`[data-module="${moduleTarget}"]`);
    }

    // ─── Module open/close (Hierarchy-Aware) ──────────────────────────────────

    toggle(moduleTarget, triggerEl = null) {
        const moduleEl = this.resolveModule(moduleTarget, triggerEl);
        if (!moduleEl) return;

        const isCurrentlyActive = !moduleEl.classList.contains('disabled');
        if (isCurrentlyActive) {
            this.close(moduleEl);
            return;
        }

        // Obtener la cadena de ancestros directos (.component-module) para no cerrarlos nunca
        const ancestors = [];
        let parent = moduleEl.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('component-module')) {
                ancestors.push(parent);
            }
            parent = parent.parentElement;
        }

        // Cerrar otros módulos activos que no sean ancestros ni el módulo actual
        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(activeMod => {
            if (activeMod === moduleEl) return;
            if (ancestors.includes(activeMod)) return; // Conservar sidebar/padre activo
            if (activeMod.contains(moduleEl)) return;
            this.close(activeMod);
        });

        this.open(moduleEl, triggerEl);
    }

    open(module, triggerEl = null) {
        const mainMenu    = module.querySelector('[data-menu="main-options"]');
        const accountMenu = module.querySelector('[data-menu="account-switcher"]');

        if (mainMenu && accountMenu) {
            mainMenu.classList.remove('disabled');
            mainMenu.classList.add('active');
            accountMenu.classList.remove('active');
            accountMenu.classList.add('disabled');
        }

        // Asegurar que al menos un menú interno esté activo si no hay ninguno
        const activeInnerMenu = module.querySelector('.component-menu.active:not(.disabled)');
        if (!activeInnerMenu) {
            const defaultMenu = module.querySelector('.component-menu[data-menu="main-options"]')
                             || module.querySelector('.component-menu[data-ref="menuMainFilters"]')
                             || module.querySelector('.component-menu:not(.disabled)')
                             || module.querySelector('.component-menu');
            if (defaultMenu) {
                defaultMenu.classList.remove('disabled');
                defaultMenu.classList.add('active');
            }
        }

        module.classList.remove('disabled');
        module.classList.add('active');
    }

    close(module) {
        module.classList.remove('active');
        module.classList.add('disabled');
        module.querySelectorAll('.component-menu').forEach(p => p.removeAttribute('style'));

        // Cerrar recursivamente cualquier submódulo hijo
        module.querySelectorAll('.component-module:not(.disabled)').forEach(child => this.close(child));

        // Reset internal menu pages to main
        const mainPage = module.querySelector('[data-menu-page="main"]');
        if (mainPage) {
            module.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
            mainPage.classList.add('active');
        }

        // Reset submenús a menú principal si existen
        const mainFilters = module.querySelector('[data-ref="menuMainFilters"], [data-menu="main-options"], [data-ref="menu-main"]');
        if (mainFilters) {
            module.querySelectorAll('.component-menu').forEach(m => {
                if (m !== mainFilters) {
                    m.classList.remove('active');
                    m.classList.add('disabled');
                }
            });
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
        }

        // Remove dynamic card dropdowns from DOM after close animation
        if (module.dataset.module?.startsWith('snapshot-menu-') || module.closest('.component-gallery-actions-wrapper') || module.classList.contains('dynamic-card-module')) {
            setTimeout(() => {
                if (module.parentNode && module.classList.contains('disabled')) {
                    module.remove();
                }
            }, 250);
        }
    }

    closeAllModules(except = null) {
        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(m => {
            if (except) {
                if (Array.isArray(except) && except.includes(m)) return;
                if (except === m || (except instanceof Element && except.contains(m))) return;
            }
            this.close(m);
        });
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
     * Cierra módulos cuando el click fue fuera de ellos de forma jerárquica y precisa.
     * @param {MouseEvent} e
     */
    handleOutsideClick(e) {
        if (this.dragState.isDragging) return;

        const isClickInsideModal = e.target.closest('.component-modal-overlay, .modal-container, .chat-image-viewer-overlay, .component-modal-box');
        if (isClickInsideModal) return;

        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        if (activeModules.length === 0) return;

        activeModules.forEach(module => {
            // 1. Click directo dentro del módulo (paneles, contenido, inputs, scrollbar, etc.)
            if (module.contains(e.target)) return;

            // 2. Click sobre el trigger que conmuta este módulo
            const moduleName = module.getAttribute('data-module');
            if (moduleName) {
                const trigger = e.target.closest(`[data-action="toggleModule"][data-target="${moduleName}"], [data-target="${moduleName}"]`);
                if (trigger) return;
            }

            // 3. Click dentro del dropdown wrapper que engloba trigger y módulo
            const wrapper = module.closest('.component-dropdown-wrapper');
            if (wrapper && wrapper.contains(e.target)) return;

            // El click fue efectivamente fuera de este módulo -> cerrar
            this.close(module);
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

    showSubMenuInModule(module, targetMenuName) {
        if (!module) return;
        const targetMenu = module.querySelector(`[data-ref="${targetMenuName}"], [data-menu="${targetMenuName}"]`);
        if (targetMenu) {
            module.querySelectorAll('.component-menu').forEach(m => {
                m.classList.remove('active');
                m.classList.add('disabled');
            });
            targetMenu.classList.remove('disabled');
            targetMenu.classList.add('active');
        }
    }

    resetToMainMenu(module) {
        if (!module) return;
        const mainFilters = module.querySelector('[data-ref="menuMainFilters"], [data-menu="main-options"], [data-ref="menu-main"]');
        if (mainFilters) {
            module.querySelectorAll('.component-menu').forEach(m => {
                if (m !== mainFilters) {
                    m.classList.remove('active');
                    m.classList.add('disabled');
                }
            });
            mainFilters.classList.remove('disabled');
            mainFilters.classList.add('active');
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
