import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { PerksRegistry } from './PerksRegistry.js';
import { DesignInteractionsInput } from './DesignInteractionsInput.js';
import { DesignInteractionsOwner } from './DesignInteractionsOwner.js';
import { DesignInteractionsPlacing } from './DesignInteractionsPlacing.js';

const DesignInteractionsBase = {
    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('click', this.handleClickBound);
        window.addEventListener('resize', this.handleResizeBound);

        if (this.canvas && this.canvas.parentElement && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.resizeAnimationFrame) cancelAnimationFrame(this.resizeAnimationFrame);
                this.resizeAnimationFrame = requestAnimationFrame(() => {
                    if (typeof this.handleResize === 'function') {
                        this.handleResize();
                    }
                });
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.handleTouchEndBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }
    },

    handleClick(e) {
        const btnSandboxSettings = e.target.closest('[data-action="openSandboxSettingsModal"]');
        if (btnSandboxSettings) {
            e.preventDefault();
            this.openSandboxSettingsModal();
            return;
        }

        const btnSyncSandbox = e.target.closest('[data-action="syncSandboxCloud"]');
        if (btnSyncSandbox) {
            e.preventDefault();
            this.syncSandboxCloud();
            return;
        }

        if (this.isSandbox) {
            const btnToggleDropdown = e.target.closest('[data-action="toggleDropdown"]');
            if (btnToggleDropdown) {
                e.preventDefault();
                this.toggleModalDropdown(btnToggleDropdown);
                return;
            }

            const btnSelectValue = e.target.closest('[data-action="selectValue"]');
            if (btnSelectValue) {
                e.preventDefault();
                this.selectModalDropdownValue(btnSelectValue);
                return;
            }

            const btnAdjust = e.target.closest('[data-action="adjustSandboxCooldownBatch"]');
            if (btnAdjust) {
                e.preventDefault();
                const step = parseInt(btnAdjust.getAttribute('data-step'), 10);
                const min = parseInt(btnAdjust.getAttribute('data-min') || '1', 10);
                const max = parseInt(btnAdjust.getAttribute('data-max') || '1000', 10);
                
                const valEl = document.getElementById('sandbox_cooldown_batch_val');
                const inputEl = document.getElementById('sandbox_cooldown_batch');
                if (valEl && inputEl) {
                    let curVal = parseInt(valEl.getAttribute('data-val') || '100', 10);
                    let newVal = curVal + step;
                    if (newVal < min) newVal = min;
                    if (newVal > max) newVal = max;
                    
                    valEl.setAttribute('data-val', newVal);
                    valEl.textContent = newVal;
                    inputEl.value = newVal;
                }
                return;
            }
        }
        
        if (typeof this.handleTemplateModals === 'function' && this.handleTemplateModals(e)) {
            return; 
        }

        const btnPerks = e.target.closest('[data-action="togglePerksInventory"]');
        if (btnPerks) {
            e.preventDefault();
            this.showInventoryPerks = !this.showInventoryPerks;
            if (this.showInventoryPerks) {
                btnPerks.classList.add('active');
                if (this.showOwnerTools) {
                    this.showOwnerTools = false;
                    const btnOwnerTools = document.querySelector('[data-action="toggleOwnerTools"]');
                    if (btnOwnerTools) btnOwnerTools.classList.remove('active');
                }
                if (!this.inventoryPerks) {
                    this.loadUserPerks();
                } else {
                    this.updatePerkBadges();
                }
            } else {
                btnPerks.classList.remove('active');
                this.updatePerkBadges();
            }
            return;
        }

        const btnActivatePerk = e.target.closest('[data-action="activatePerk"]');
        if (btnActivatePerk) {
            e.preventDefault();
            if (typeof this.activatePerk === 'function') {
                this.activatePerk(btnActivatePerk.getAttribute('data-perk-id'), btnActivatePerk);
            }
            return;
        }

        const btnOwnerTools = e.target.closest('[data-action="toggleOwnerTools"]');
        if (btnOwnerTools) {
            e.preventDefault();
            this.showOwnerTools = !this.showOwnerTools;
            if (this.showOwnerTools) {
                btnOwnerTools.classList.add('active');
                if (this.showInventoryPerks) {
                    this.showInventoryPerks = false;
                    const btnPerksElement = document.querySelector('[data-action="togglePerksInventory"]');
                    if (btnPerksElement) btnPerksElement.classList.remove('active');
                }
            } else {
                btnOwnerTools.classList.remove('active');
            }
            if (typeof this.updatePerkBadges === 'function') {
                this.updatePerkBadges();
            }
            return;
        }

        const btnOwnerEraser = e.target.closest('[data-action="toggleOwnerEraser"]');
        if (btnOwnerEraser) {
            e.preventDefault();
            this.toggleOwnerEraser();
            return;
        }

        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');

        if (btnJoin || btnReqAccess) {
            e.preventDefault();
            if (typeof this.handleAccessRequest === 'function') {
                this.handleAccessRequest(btnJoin || btnReqAccess);
            }
            return;
        }

        const imgAdd = e.target.closest('[data-action="addTemplateToCanvas"]');
        if (imgAdd) {
            e.preventDefault();
            if (this.isResetLocked || this.isResizeLocked) {
                showMessage(__('err_canvas_locked'), 'warning');
                return;
            }
            const url = imgAdd.getAttribute('data-url');
            if (typeof this.addTemplateFromLibrary === 'function') {
                this.addTemplateFromLibrary(url);
            }
            return;
        }

        const btnDelServer = e.target.closest('[data-action="deleteServerTemplate"]');
        if (btnDelServer) {
            e.preventDefault();
            e.stopPropagation(); 
            const id = btnDelServer.getAttribute('data-id');
            if (typeof this.deleteServerTemplate === 'function') {
                this.deleteServerTemplate(id);
            }
            return;
        }

        const btnUpload = e.target.closest('[data-action="uploadTemplateFile"]');
        if (btnUpload && this.fileInput) {
            e.preventDefault();
            this.fileInput.click();
            return;
        }

        const cardTemplate = e.target.closest('[data-template-id]');
        if (cardTemplate && !e.target.closest('.component-template-action-btn')) {
            const id = cardTemplate.getAttribute('data-template-id');
            if (this.liveShareStatus === 'spectator' && this.liveTemplateId === id) {
                showMessage(__('err_cannot_edit_live'), 'warning');
                return;
            }
            if (typeof this.toggleTemplate === 'function') {
                this.toggleTemplate(id);
            }
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.preventDefault();
            if (typeof this.toggleTemplateLock === 'function') {
                this.toggleTemplateLock();
            }
            return;
        }

        const btnUnlockTop = e.target.closest('[data-action="unlockTemplateTop"]');
        if (btnUnlockTop) {
            e.preventDefault();
            if (typeof this.unlockTemplateTop === 'function') {
                this.unlockTemplateTop();
            }
            return;
        }

        const btnRotate = e.target.closest('[data-action="rotateTemplate"]');
        if (btnRotate) {
            e.preventDefault();
            if (typeof this.rotateTemplate === 'function') {
                this.rotateTemplate();
            }
            return;
        }

        const btnInject = e.target.closest('[data-action="injectTemplate"]');
        if (btnInject) {
            e.preventDefault();
            if (typeof this.injectTemplate === 'function') {
                this.injectTemplate();
            }
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.preventDefault();
            if (typeof this.deleteTemplate === 'function') {
                this.deleteTemplate();
            }
            return;
        }

        const btnPlace = e.target.closest('[data-ref="pixel-action-btn"]');
        if (btnPlace) {
            e.preventDefault();
            this.placePixels();
            return;
        }

        const btnColor = e.target.closest('[data-action="selectColor"]');
        if (btnColor) {
            e.preventDefault();
            this.currentColor = btnColor.getAttribute('data-color') || '#000000';
            
            document.querySelectorAll('.component-color-btn').forEach(btn => btn.classList.remove('active'));
            btnColor.classList.add('active');

            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            }
            
            this.requestRender();
            return;
        }
    },

    toggleModalDropdown(triggerBtn) {
        if (triggerBtn.classList.contains('disabled-interaction')) return;
        const targetId = triggerBtn.getAttribute('data-target');
        const targetDropdown = document.querySelector(`[data-module="${targetId}"]`);
        
        document.querySelectorAll('.component-module--dropdown:not(.disabled)').forEach(el => {
            if (el !== targetDropdown) {
                el.classList.remove('active');
                el.classList.add('disabled');
            }
        });

        if (targetDropdown) {
            if (targetDropdown.classList.contains('disabled')) {
                targetDropdown.classList.remove('disabled');
                targetDropdown.classList.add('active');
            } else {
                targetDropdown.classList.remove('active');
                targetDropdown.classList.add('disabled');
            }
        }
    },

    selectModalDropdownValue(optionBtn) {
        const type = optionBtn.getAttribute('data-type');
        const value = optionBtn.getAttribute('data-value');
        const label = optionBtn.getAttribute('data-label');
        const icon = optionBtn.getAttribute('data-icon');

        if (type === 'size') {
            const widthInput = document.getElementById('sandbox_width');
            const heightInput = document.getElementById('sandbox_height');
            if (widthInput && heightInput) {
                if (value !== 'custom') {
                    const [w, h] = value.split('x').map(Number);
                    widthInput.value = w;
                    heightInput.value = h;
                }
            }
        } else if (type === 'palette') {
            const paletteInput = document.getElementById('sandbox_palette');
            if (paletteInput) {
                paletteInput.value = value;
            }
        }

        const menu = optionBtn.closest('.component-menu-list');
        if (menu) {
            menu.querySelectorAll('.component-menu-link').forEach(el => el.classList.remove('active'));
            optionBtn.classList.add('active');
        }

        const dropdownWrapper = optionBtn.closest('.component-dropdown-wrapper');
        if (dropdownWrapper) {
            const triggerText = dropdownWrapper.querySelector('.component-dropdown-text');
            if (triggerText) {
                triggerText.textContent = label;
            }
            const triggerIcon = dropdownWrapper.querySelector('.component-dropdown-trigger span:first-child');
            if (triggerIcon && icon) {
                triggerIcon.textContent = icon;
            }
            const targetModule = dropdownWrapper.querySelector('.component-module--dropdown');
            if (targetModule) {
                targetModule.classList.remove('active');
                targetModule.classList.add('disabled');
            }
        }
    }
};

export const DesignInteractions = Object.assign(
    {},
    DesignInteractionsBase,
    DesignInteractionsInput,
    DesignInteractionsOwner,
    DesignInteractionsPlacing
);