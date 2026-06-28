// public/assets/js/modules/app/DesignController.js
import { ApiService } from '../../../core/api/ApiServices.js';

// Importar Mixins
import { DesignSetup } from './DesignSetup.js';
import { DesignNetwork } from './DesignNetwork.js';
import { DesignTemplates } from './templates/DesignTemplates.js';
import { DesignInteractions } from './DesignInteractions.js';
import { DesignRender } from './DesignRender.js';

class DesignController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.wsManager = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        this.canvasId = urlParams.get('id');
        
        this.snapshotUuid = urlParams.get('snapshot');
        this.snapshotImg = urlParams.get('img');
        this.isSnapshotMode = !!(this.snapshotUuid && this.snapshotImg);

        this.canvas = null;
        this.ctx = null;
        this.boardWidth = 2000;
        this.boardHeight = 1000;
        this.canvasPaletteId = 'default';
        
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredPixel = null;
        
        this.selectedPixels = new Set();
        this.isSelecting = false;
        this.selectionMode = 'add';
        this.btnPlacePixels = null;
        this.txtPlacePixels = null;
        
        this.btnColorPalette = null;
        this.fileInput = null;

        this.templates = [];
        this.activeTemplateId = null;
        this.templateInteraction = null;

        this.currentColor = '#000000';

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        this.needsRender = false;
        this.animationFrameId = null;
        
        this.isSpectator = false;
        this.isPrivateBlocked = false;
        this.canvasIntId = null;
        this.canvasPrivacy = 'private';
        this.canvasApproval = false;

        this.timelapseActive = false;
        this.resetActive = false;
        this.nextResetAt = null;
        this.timerAction = 'restart';
        this.resetTimerInterval = null;
        
        this.isResetLocked = false; 
        this.isResizeLocked = false;

        // --- SISTEMA DE COOLDOWN LOCAL ---
        this.cooldownBalance = 5;
        this.cooldownMax = 5;
        this.cooldownSec = 10;
        this.cooldownNextIn = 0;
        this.lastSyncTime = Date.now();
        this.cooldownLoopId = null;

        this.uiCooldownCounter = null;
        this.uiCooldownTimer = null;
        this.uiCooldownBadge = null;

        // --- SISTEMA DE LIVE SHARE ---
        this.liveShareStatus = 'none'; // 'none' | 'owner' | 'spectator'
        this.liveShareCode = null;
        this.liveTemplateId = null;
        this.uiLiveControls = null;
        this.uiLiveCode = null;
        this.uiLiveInputX = null;
        this.uiLiveInputY = null;
        this.uiLiveInputOpacity = null;
        this.uiLiveJoinCode = null;
        
        this.handleLiveInputBound = this.handleLiveInput.bind(this);
        // ------------------------------------

        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleFileUploadBound = this.handleFileUpload.bind(this);
        this.renderBound = this.render.bind(this);
    }

    setCanvasBadge(id, icon, text, position = 'left') {
        const container = document.querySelector(`[data-ref="badges-${position}"]`);
        if (!container) return;

        let badge = container.querySelector(`[data-badge-id="${id}"]`);
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'component-badge';
            badge.setAttribute('data-badge-id', id);
            container.appendChild(badge);
        }

        const iconClass = icon.includes('spin') ? 'icon-spin-slow' : '';
        const iconName = icon.replace('icon-spin-slow', '').trim();

        badge.innerHTML = `
            <span class="material-symbols-rounded ${iconClass}">${iconName}</span>
            <span>${text}</span>
        `;
    }

    removeCanvasBadge(id, position = 'left') {
        const container = document.querySelector(`[data-ref="badges-${position}"]`);
        if (!container) return;
        
        const badge = container.querySelector(`[data-badge-id="${id}"]`);
        if (badge) {
            badge.remove();
        }
    }

    init() {
        this.abortController = new AbortController();
        
        this.canvas = document.querySelector('[data-ref="design-canvas"]');
        this.btnPlacePixels = document.querySelector('[data-ref="pixel-action-btn"]');
        this.txtPlacePixels = document.querySelector('[data-ref="pixel-action-text"]');
        this.btnColorPalette = document.querySelector('[data-ref="btn-color-palette"]');
        this.fileInput = document.querySelector('[data-ref="template-file-input"]');
        
        this.uiCooldownCounter = document.querySelector('[data-ref="cooldown-counter"]');
        this.uiCooldownTimer = document.querySelector('[data-ref="cooldown-timer"]');
        this.uiCooldownBadge = document.querySelector('[data-ref="cooldown-badge"]');

        // Mapeo UI Modo En Vivo
        this.uiLiveControls = document.querySelector('[data-ref="live-controls"]');
        this.uiLiveCode = document.querySelector('[data-ref="live-share-code"]');
        this.uiLiveInputX = document.querySelector('[data-ref="live-input-x"]');
        this.uiLiveInputY = document.querySelector('[data-ref="live-input-y"]');
        this.uiLiveInputOpacity = document.querySelector('[data-ref="live-input-opacity"]');
        this.uiLiveJoinCode = document.querySelector('[data-ref="live-join-code"]');

        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.canvas.style.imageRendering = 'pixelated';
            this.canvas.style.transition = 'filter 0.4s ease, opacity 0.4s ease'; // Transición suave para el blur
        }

        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (wrapper) {
            this.cooldownMax = parseInt(wrapper.getAttribute('data-cooldown-batch'), 10) || 5;
            this.cooldownSec = parseInt(wrapper.getAttribute('data-cooldown-seconds'), 10) || 10;
            this.cooldownBalance = this.cooldownMax;
        }

        this.bindEvents();
        this.applyPremiumLocks(); 
        
        if (this.isSnapshotMode) {
            this.loadCanvasConfigForSnapshot();
        } else {
            this.loadCanvasConfig();
            this.checkCanvasAccess();
            
            const uid = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
            if (uid) {
                this.loadUserLibrary();
            }
            
            this.startCooldownLoop();
        }
    }

    applyPremiumLocks() {
        const tier = (window.APP_USER && window.APP_USER.subscription_tier !== undefined) 
            ? window.APP_USER.subscription_tier 
            : 0;

        if (tier < 1) { // Básico
            const liveShareMenuBtn = document.querySelector('[data-menu-target="tool-liveshare-menu"]');
            if (liveShareMenuBtn) {
                liveShareMenuBtn.classList.add('disabled-interactive');
                liveShareMenuBtn.style.opacity = '0.5';
                liveShareMenuBtn.setAttribute('data-tooltip', 'Compartir en vivo requiere plan Pro o Advanced 🔒');
                if (!liveShareMenuBtn.querySelector('.icon-lock')) {
                    const lock = document.createElement('span');
                    lock.className = 'material-symbols-rounded icon-lock';
                    lock.textContent = 'lock';
                    lock.style.cssText = 'position: absolute; bottom: 0; right: 0; font-size: 12px; color: #FFA500; background: #222; border-radius: 50%; padding: 2px;';
                    liveShareMenuBtn.appendChild(lock);
                    liveShareMenuBtn.style.position = 'relative';
                }
            }
        }
    }

    startCooldownLoop() {
        if (this.cooldownLoopId) cancelAnimationFrame(this.cooldownLoopId);
        
        const tick = () => {
            if (!this.isSpectator && !this.isSnapshotMode && !this.isResizeLocked) {
                if (this.cooldownSec > 0 && this.cooldownBalance < this.cooldownMax) {
                    const elapsed = (Date.now() - this.lastSyncTime) / 1000;
                    let remaining = this.cooldownNextIn - elapsed;
                    
                    if (remaining <= 0) {
                        let extraTime = Math.abs(remaining);
                        let recoveredPixels = 1 + Math.floor(extraTime / this.cooldownSec);

                        this.cooldownBalance = Math.min(this.cooldownMax, this.cooldownBalance + recoveredPixels);

                        if (this.cooldownBalance < this.cooldownMax) {
                            this.cooldownNextIn = this.cooldownSec - (extraTime % this.cooldownSec);
                            this.lastSyncTime = Date.now();
                            remaining = this.cooldownNextIn;
                        } else {
                            remaining = 0;
                            this.cooldownNextIn = 0;
                        }
                        this.updateSelectionUI();
                    }
                    
                    if (this.uiCooldownTimer) {
                        this.uiCooldownTimer.textContent = remaining > 0 ? `${Math.ceil(remaining)}s` : '0s';
                    }
                } else if (this.uiCooldownTimer) {
                    this.uiCooldownTimer.textContent = '0s';
                }

                if (this.uiCooldownCounter) {
                    this.uiCooldownCounter.textContent = `${Math.floor(this.cooldownBalance)}/${this.cooldownMax}`;
                }
            }
            this.cooldownLoopId = requestAnimationFrame(tick);
        };
        this.cooldownLoopId = requestAnimationFrame(tick);
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.wsManager) this.wsManager.disconnect();
        
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('resize', this.handleResizeBound);
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileUploadBound);
        }

        if (this.uiLiveInputX) this.uiLiveInputX.removeEventListener('change', this.handleLiveInputBound);
        if (this.uiLiveInputY) this.uiLiveInputY.removeEventListener('change', this.handleLiveInputBound);
        if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.removeEventListener('input', this.handleLiveInputBound);

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.cooldownLoopId) {
            cancelAnimationFrame(this.cooldownLoopId);
        }

        if (this.resetTimerInterval) {
            clearInterval(this.resetTimerInterval);
        }
    }
}

// Inyección de los sub-módulos en el prototipo principal
Object.assign(
    DesignController.prototype,
    DesignSetup,
    DesignNetwork,
    DesignTemplates,
    DesignInteractions,
    DesignRender
);

export { DesignController };