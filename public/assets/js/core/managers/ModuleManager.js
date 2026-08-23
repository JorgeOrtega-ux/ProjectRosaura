export class ModuleManager {
    constructor(config = {}) {
        this.config = {
            closeOnEsc: true,
            allowMultipleModules: false,
            ...config
        };

        this.activeEngines = new Map();

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

    get isMobile() { return window.innerWidth <= 768 || window.innerHeight <= 550; }

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

        this.activeEngines.forEach((engine, mod) => {
            this._detachEngine(mod);
        });
        this.activeEngines.clear();
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.config.closeOnEsc) {
            const hasActiveModal = document.querySelector('.component-modal-overlay.active, .chat-image-viewer-overlay.active, .modal-container .component-modal-box');
            if (hasActiveModal) return;

            this.closeAllModules();
        }
    }

    handleResize() {
        if (this.isMobile) {
            this.activeEngines.forEach((engine, mod) => {
                this._detachEngine(mod);
            });
            this.activeEngines.clear();

            document.querySelectorAll('.is-dragging').forEach(m => {
                m.classList.remove('is-dragging');
                const p = m.querySelector('.component-menu');
                if (p) p.removeAttribute('style');
            });
            this.dragState.isDragging = false;
        } else {
            const activeDropdowns = document.querySelectorAll('.component-module--dropdown:not(.disabled)');
            activeDropdowns.forEach(mod => {
                if (!this.activeEngines.has(mod)) {
                    this._attachEngine(mod);
                } else {
                    const engine = this.activeEngines.get(mod);
                    if (engine && typeof engine.update === 'function') {
                        engine.update();
                    }
                }
            });
        }
    }

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

    toggle(moduleTarget, triggerEl = null) {
        const moduleEl = this.resolveModule(moduleTarget, triggerEl);
        if (!moduleEl) return;

        const isCurrentlyActive = !moduleEl.classList.contains('disabled');
        if (isCurrentlyActive) {
            this.close(moduleEl);
            return;
        }

        const ancestors = [];
        let parent = moduleEl.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('component-module')) {
                ancestors.push(parent);
            }
            parent = parent.parentElement;
        }

        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        activeModules.forEach(activeMod => {
            if (activeMod === moduleEl) return;
            if (ancestors.includes(activeMod)) return;
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

        this._attachEngine(module, triggerEl);
    }

    close(module) {
        this._detachEngine(module);

        module.classList.remove('active');
        module.classList.add('disabled');
        module.querySelectorAll('.component-menu').forEach(p => p.removeAttribute('style'));

        module.querySelectorAll('.component-module:not(.disabled)').forEach(child => this.close(child));

        const mainPage = module.querySelector('[data-menu-page="main"]');
        if (mainPage) {
            module.querySelectorAll('.component-menu-page').forEach(p => p.classList.remove('active'));
            mainPage.classList.add('active');
        }

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

    markBottomSheets() {
        document.querySelectorAll('.component-module--dropdown:not(.bs-initialized)').forEach(module => {
            module.classList.add('bs-initialized');
        });
    }

    handleOutsideClick(e) {
        if (this.dragState.isDragging) return;

        const activeModules = document.querySelectorAll('.component-module:not(.disabled)');
        if (activeModules.length === 0) return;

        activeModules.forEach(module => {

            if (this.isMobile && (module.classList.contains('component-module--dropdown') || module.classList.contains('component-module--sidebar-responsive'))) {
                const clickedMenu = e.target.closest('.component-menu');
                if (clickedMenu && module.contains(clickedMenu)) {
                    return;
                }
                this.close(module);
                return;
            }

            if (module.contains(e.target)) return;

            const moduleName = module.getAttribute('data-module');
            if (moduleName) {
                const trigger = e.target.closest(`[data-action="toggleModule"][data-target="${moduleName}"], [data-target="${moduleName}"]`);
                if (trigger) return;
            }

            const wrapper = module.closest('.component-dropdown-wrapper');
            if (wrapper && wrapper.contains(e.target)) {
                const trigger = wrapper.querySelector('.component-dropdown-trigger');
                if (trigger && trigger.contains(e.target)) return;
            }

            this.close(module);
        });
    }

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

    _attachEngine(module, triggerEl = null) {
        if (this.isMobile || typeof window.UiEngine === 'undefined') return;
        if (!module || !module.classList.contains('component-module--dropdown')) return;

        let referenceEl = triggerEl;
        if (!referenceEl) {
            const wrapper = module.closest('.component-dropdown-wrapper');
            if (wrapper) {
                referenceEl = wrapper.querySelector('.component-dropdown-trigger, [data-action="toggleModule"], [data-action="toggleDropdown"], [data-action="toggleDynamicMenu"]');
            }
            if (!referenceEl && module.dataset.module) {
                referenceEl = document.querySelector(`[data-action="toggleModule"][data-target="${module.dataset.module}"], [data-target="${module.dataset.module}"]`);
            }
        }

        if (!referenceEl) return;

        this._detachEngine(module);

        let rawPos = referenceEl.getAttribute('data-dropdown-position') || module.getAttribute('data-dropdown-position') || referenceEl.getAttribute('data-position') || module.getAttribute('data-position');
        const isEndAligned = referenceEl.closest('.component-top-right, .header-right, .component-card__actions--end, .component-gallery-actions, .chat-msg-actions, .component-actions');
        let preferredPlacement;
        if (rawPos && rawPos !== 'bottom' && rawPos !== 'top') {
            const placementMap = {
                'left': 'left-start',
                'right': 'right-start'
            };
            preferredPlacement = placementMap[rawPos] || rawPos;
        } else if (rawPos === 'top') {
            preferredPlacement = isEndAligned ? 'top-end' : 'top-start';
        } else {
            preferredPlacement = isEndAligned ? 'bottom-end' : 'bottom-start';
        }

        const engine = window.UiEngine.createEngine(referenceEl, module, {
            placement: preferredPlacement,
            strategy: 'absolute',
            modifiers: [
                {
                    name: 'offset',
                    options: {
                        offset: [0, 6]
                    }
                },
                {
                    name: 'flip',
                    enabled: true,
                    options: {
                        fallbackPlacements: ['top-end', 'bottom-end', 'top-start', 'bottom-start', 'top', 'bottom']
                    }
                },
                {
                    name: 'preventOverflow',
                    enabled: true,
                    options: {
                        boundary: 'viewport',
                        padding: 8
                    }
                },
                {
                    name: 'computeStyles',
                    options: {
                        gpuAcceleration: false,
                        adaptive: false
                    }
                }
            ]
        });

        this.activeEngines.set(module, engine);
        engine.update();
        requestAnimationFrame(() => {
            if (this.activeEngines.has(module)) {
                engine.update();
            }
        });
    }

    _detachEngine(module) {
        if (!module) return;

        if (this.activeEngines.has(module)) {
            const engine = this.activeEngines.get(module);
            if (engine && typeof engine.destroy === 'function') {
                engine.destroy();
            }
            this.activeEngines.delete(module);
        }

        module.removeAttribute('data-ui-placement');
        module.style.removeProperty('position');
        module.style.removeProperty('top');
        module.style.removeProperty('left');
        module.style.removeProperty('bottom');
        module.style.removeProperty('right');
        module.style.removeProperty('transform');
        module.style.removeProperty('margin');
    }
}
