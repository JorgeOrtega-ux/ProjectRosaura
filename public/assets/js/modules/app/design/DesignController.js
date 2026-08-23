import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { CardTemplates } from '../../../core/components/CardTemplates.js';
import { PromoService } from '../../../core/services/PromoCardService.js';
import { DesignChat } from './DesignChat.js';
import { DesignInteractions } from './DesignInteractions.js?v=34';
import { DesignNetwork } from './DesignNetwork.js?v=34';
import { DesignRender } from './DesignRender.js?v=34';
import { DesignSetup } from './DesignSetup.js?v=34';
import { DesignTemplates } from './templates/DesignTemplates.js?v=34';

class DesignController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.wsManager = null;
        
        this.canvasId = null;
        this.snapshotUuid = null;
        this.snapshotImg = null;
        this.isSnapshotMode = false;

        this.canvas = null;
        this.ctx = null;
        this.boardWidth = 2000;
        this.boardHeight = 1000;
        this.canvasPaletteId = 'default';
        
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredPixel = null;
        
        this.initSelectedPixelsProxy();
        this.isSelecting = false;
        this.selectionMode = 'add';
        this.interactionMode = 'normal'; 
        this.activeGeometricShape = { shape: 'line', fill: false, strokeWidth: 1 };
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;
        this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        this.textPosition = null;
        this.isTextDragging = false;
        this.textDragStart = null;
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;
        this.btnPlacePixels = null;
        this.txtPlacePixels = null;
        
        this.btnColorPalette = null;
        this.fileInput = null;

        this.templates = [];
        this.activeTemplateId = null;
        this.templateInteraction = null;

        this.currentColor = '#000000';
        this.customPickedColors = [];

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.renderWorker = null;
        
        this.undoStack = [];
        this.redoStack = [];

        this.needsRender = false;
        this.animationFrameId = null;
        
        this.isSpectator = false;
        this.isPrivateBlocked = false;
        this.isSubscriptionLocked = false;
        this.canvasIntId = null;
        this.canvasPrivacy = 'private';
        this.canvasApproval = false;

        this.resetActive = false;
        this.nextResetAt = null;
        this.timerAction = 'restart';
        this.resetTimerInterval = null;
        
        this.isResetLocked = false; 
        this.isFrozen = false;
        this.isResizeLocked = false;
        this.isInjectLocked = false;
        this.templateEngine = null;

        this.cooldownBalance = 5;
        this.cooldownMax = 5;
        this.cooldownSec = 10;
        this.cooldownNextIn = 0;
        this.lastSyncTime = Date.now();
        this.cooldownLoopId = null;
        this.isCooldownSynced = false;

        this.uiCooldownCounter = null;
        this.uiCooldownTimer = null;
        this.uiCooldownBadge = null;

        this.liveShareStatus = 'none';
        this.liveShareCode = null;
        this.liveTemplateId = null;

        this.uiLiveInputX = null;
        this.uiLiveInputY = null;
        this.uiLiveInputOpacity = null;
        
        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
        this.handleFileUploadBound = this.handleFileUpload.bind(this);
        this.renderBound = this.render.bind(this);

        this.handleTouchStartBound = this.handleTouchStart.bind(this);
        this.handleTouchMoveBound = this.handleTouchMove.bind(this);
        this.handleTouchEndBound = this.handleTouchEnd.bind(this);
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

    initSelectedPixelsProxy() {
        this._selectedPixelsRaw = new Set();
        const self = this;
        this.selectedPixels = new Proxy(this._selectedPixelsRaw, {
            get(target, prop) {
                const value = Reflect.get(target, prop);
                if (typeof value === 'function') {
                    return function(...args) {
                        const beforeSize = target.size;
                        const res = value.apply(target, args);
                        if (prop === 'add' || prop === 'delete' || prop === 'clear') {
                            if (target.size !== beforeSize || prop === 'clear') {
                                self._selectionBitmaskDirty = true;
                            }
                        }
                        return res;
                    };
                }
                return value;
            }
        });
        this._selectionBitmaskDirty = true;
    }

    async init() {
        this._destroyed = false;
        this.abortController = new AbortController();

        const urlParams = new URLSearchParams(window.location.search);
        let idFromQuery = urlParams.get('id');
        if (!idFromQuery) {
            const pathParts = window.location.pathname.split('/');
            const designIdx = pathParts.indexOf('design');
            if (designIdx !== -1 && pathParts[designIdx + 1] && pathParts[designIdx + 1] !== 's') {
                idFromQuery = pathParts[designIdx + 1];
            }
        }
        this.canvasId = idFromQuery;
        this.snapshotUuid = urlParams.get('snapshot');
        this.snapshotImg = urlParams.get('img');
        this.isSnapshotMode = !!(this.snapshotUuid && this.snapshotImg);
        
        this.initSelectedPixelsProxy();
        this.isSelecting = false;
        this.interactionMode = 'normal';
        this.activeGeometricShape = { shape: 'line', fill: false, strokeWidth: 1 };
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.showOwnerTools = false;
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.undoStack = [];
        this.redoStack = [];
        this.templates = [];
        this.activeTemplateId = null;
        this.templateInteraction = null;
        
        this.canvas = document.querySelector('[data-ref="design-canvas"]');
        this.btnPlacePixels = document.querySelector('[data-ref="pixel-action-btn"]');
        this.txtPlacePixels = document.querySelector('[data-ref="pixel-action-text"]');
        this.btnColorPalette = document.querySelector('[data-ref="btn-color-palette"]');
        this.fileInput = document.querySelector('[data-ref="template-file-input"]');
        
        this.uiCooldownCounter = document.querySelector('[data-ref="cooldown-counter"]');
        this.uiCooldownTimer = document.querySelector('[data-ref="cooldown-timer"]');
        this.uiCooldownBadge = document.querySelector('[data-ref="cooldown-badge"]');

        if (this.canvas) {
            this.canvas.classList.add('component-pixelated');
            this.canvas.classList.add('component-canvas-transition');
        }

        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (wrapper) {
            this.cooldownMax = parseInt(wrapper.getAttribute('data-cooldown-batch'), 10) || 5;
            this.cooldownSec = parseInt(wrapper.getAttribute('data-cooldown-seconds'), 10) || 10;
            this.cooldownBalance = this.cooldownMax;
        }

        this.lastCooldownHtml = null;
        this.templatesLoaded = false;

        this.bindEvents();
        this.applyPremiumLocks(); 
        
        if (this.isSnapshotMode) {
            this.loadCanvasConfigForSnapshot();
        } else {
            this.loadCanvasConfig();
            this.checkCanvasAccess();
            
            const uid = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
            
            this.startCooldownLoop();
            
            if (this.chat && typeof this.chat.destroy === 'function') {
                this.chat.destroy();
            }
            this.chat = new DesignChat(this);
        }
        if (typeof this.updateTemplateUI === 'function') {
            this.updateTemplateUI();
        }
        if (typeof this.loadStickersLibrary === 'function') {
            this.loadStickersLibrary();
        }
        this.renderModulePromos();
    }

    async renderModulePromos() {
        if (PromoService.isExempt()) return;
        await PromoService.ensureLoaded();

        const colorsContainer = document.querySelector('[data-ref="module-promo-bottom-colors"]');
        if (colorsContainer) {
            const promoColors = PromoService.getModulePromo('colors');
            if (promoColors) {
                colorsContainer.innerHTML = CardTemplates.promoCard(promoColors, { basePath: this.basePath });
                PromoService.initCardInteractions(colorsContainer);
            }
        }

        const templatesContainer = document.querySelector('[data-ref="module-promo-bottom-templates"]');
        if (templatesContainer) {
            const promoTemplates = PromoService.getModulePromo('templates');
            if (promoTemplates) {
                templatesContainer.innerHTML = CardTemplates.promoCard(promoTemplates, { basePath: this.basePath });
                PromoService.initCardInteractions(templatesContainer);
            }
        }

        const stickersContainer = document.querySelector('[data-ref="module-promo-bottom-stickers"]');
        if (stickersContainer) {
            const promoStickers = PromoService.getModulePromo('stickers');
            if (promoStickers) {
                stickersContainer.innerHTML = CardTemplates.promoCard(promoStickers, { basePath: this.basePath });
                PromoService.initCardInteractions(stickersContainer);
            }
        }

        const shapesContainer = document.querySelector('[data-ref="module-promo-bottom-shapes"]');
        if (shapesContainer) {
            const promoShapes = PromoService.getModulePromo('shapes');
            if (promoShapes) {
                shapesContainer.innerHTML = CardTemplates.promoCard(promoShapes, { basePath: this.basePath });
                PromoService.initCardInteractions(shapesContainer);
            }
        }
    }

    applyPremiumLocks() {
        const tier = (window.APP_USER && window.APP_USER.subscription_tier !== undefined) 
            ? window.APP_USER.subscription_tier 
            : 0;

        if (tier < 1) { 
            const liveShareMenuBtn = document.querySelector('[data-module-target="moduleDesignTools"][data-menu-target="menu-live"]');
            if (liveShareMenuBtn) {
                liveShareMenuBtn.setAttribute('data-requires-premium', 'true');
                liveShareMenuBtn.removeAttribute('data-action');
                liveShareMenuBtn.removeAttribute('data-module-target');
                liveShareMenuBtn.removeAttribute('data-menu-target');

                // Determinar el tier mínimo requerido para live_share desde APP_TIERS
                let liveShareMinTier = 1;
                if (window.APP_TIERS && Array.isArray(window.APP_TIERS)) {
                    const liveShareTier = window.APP_TIERS.find(t => t.feat_live_share && parseInt(t.tier_level, 10) > 0);
                    if (liveShareTier) liveShareMinTier = parseInt(liveShareTier.tier_level, 10);
                }

                liveShareMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const basePath = window.AppBasePath || '';
                    const targetUrl = basePath + '/upgrade';
                    if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                        window.spaRouter.navigate(targetUrl);
                    } else {
                        window.location.href = targetUrl;
                    }
                }, true); 
            }
        }
    }

    startCooldownLoop() {
        if (this.cooldownLoopId) cancelAnimationFrame(this.cooldownLoopId);
        
        const tick = () => {
            if (!this.isSpectator && !this.isSnapshotMode && !this.isResizeLocked) {
                
                let remaining = 0;
                if (this.cooldownSec > 0 && this.cooldownBalance < this.cooldownMax) {
                    const elapsed = (Date.now() - this.lastSyncTime) / 1000;
                    remaining = this.cooldownNextIn - elapsed;
                    
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
                }

                if (this.uiCooldownBadge) {
                    let newHtml = '';
                    if (this.isCooldownSynced || this.cooldownBalance !== undefined) {
                        const rText = remaining > 0 ? `${Math.ceil(remaining)}s` : '0s';
                        const curBal = typeof this.cooldownBalance === 'number' ? Math.floor(this.cooldownBalance) : (this.cooldownMax || 5);
                        const maxBal = this.cooldownMax || 5;
                        newHtml = `
                            <span class="material-symbols-rounded">bolt</span>
                            <span>${curBal}/${maxBal}</span>
                            <span>|</span>
                            <span class="material-symbols-rounded">timer</span>
                            <span>${rText}</span>
                        `;
                    } else {
                        newHtml = `
                            <span class="material-symbols-rounded">bolt</span>
                            <span>${this.cooldownMax || 5}/${this.cooldownMax || 5}</span>
                            <span>|</span>
                            <span class="material-symbols-rounded">timer</span>
                            <span>0s</span>
                        `;
                    }

                    if (this.lastCooldownHtml !== newHtml) {
                        this.uiCooldownBadge.innerHTML = newHtml;
                        this.lastCooldownHtml = newHtml;
                    }
                }
            }
            this.cooldownLoopId = requestAnimationFrame(tick);
        };
        this.cooldownLoopId = requestAnimationFrame(tick);
    }

    destroy() {
        this._destroyed = true;
        if (this.wsReconnectTimeout) {
            clearTimeout(this.wsReconnectTimeout);
            this.wsReconnectTimeout = null;
        }
        if (this.chat && typeof this.chat.destroy === 'function') {
            this.chat.destroy();
            this.chat = null;
        }
        if (this.abortController) this.abortController.abort();
        if (this.wsManager) this.wsManager.disconnect();
        
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        window.removeEventListener('blur', this.handleMouseUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('input', this.handleInputBound);
        window.removeEventListener('resize', this.handleResizeBound);
        
        document.removeEventListener('touchstart', this.handleTouchStartBound);
        document.removeEventListener('touchmove', this.handleTouchMoveBound);
        document.removeEventListener('touchend', this.handleTouchEndBound);
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileUploadBound);
        }

        if (this.handleBeforeUnloadBound) {
            window.removeEventListener('beforeunload', this.handleBeforeUnloadBound);
            window.removeEventListener('pagehide', this.handleBeforeUnloadBound);
        }

        if (this.isOfflineMode && this._offlineDirty && typeof this.saveOfflineCanvasState === 'function') {
            try {
                this.saveOfflineCanvasState(true);
            } catch (e) {}
        }

        if (this._offlineSaveTimeout) {
            clearTimeout(this._offlineSaveTimeout);
            this._offlineSaveTimeout = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.resizeAnimationFrame) {
            cancelAnimationFrame(this.resizeAnimationFrame);
            this.resizeAnimationFrame = null;
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.cooldownLoopId) {
            cancelAnimationFrame(this.cooldownLoopId);
        }

        if (this.resetTimerInterval) {
            clearInterval(this.resetTimerInterval);
        }

        if (this.myProtectionsTimerInterval) {
            clearInterval(this.myProtectionsTimerInterval);
            this.myProtectionsTimerInterval = null;
        }

        if (this.renderWorker) {
            this.renderWorker.terminate();
            this.renderWorker = null;
        }

        if (typeof this._syncUnsubscribe === 'function') {
            this._syncUnsubscribe();
            this._syncUnsubscribe = null;
        }

        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this._lastCanvasW = null;
        this._lastCanvasH = null;
        this._lastDpr = null;
        this.loadedChunks = null;
        this.pixelQueue = null;
        this.activeGeometricShape = null;
        this.shapePreviewPixels = null;
    }
}

Object.assign(
    DesignController.prototype,
    DesignSetup,
    DesignNetwork,
    DesignTemplates,
    DesignInteractions,
    DesignRender
);

export { DesignController };