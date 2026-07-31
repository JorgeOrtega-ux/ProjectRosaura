import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { DesignSetup } from './DesignSetup.js';
import { DesignNetwork } from './DesignNetwork.js';
import { DesignTemplates } from './templates/DesignTemplates.js';
import { DesignInteractions } from './DesignInteractions.js';
import { DesignRender } from './DesignRender.js';
import { PerksRegistry } from './PerksRegistry.js';
import { DesignChat } from './DesignChat.js';

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
        this.interactionMode = 'normal'; 
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
        this.renderWorker = null;
        
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
        this.templatePopper = null;

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

    async init() {
        console.log('%c[Rosaura App] DesignController initializing...', 'color: #2196f3; font-weight: bold;');
        try {
            await PerksRegistry.load();
        } catch (e) {
            console.warn('[DesignController] PerksRegistry.load error:', e);
        }
        this.abortController = new AbortController();
        
        this.selectedPixels = new Set();
        this.isSelecting = false;
        this.interactionMode = 'normal';
        this.showOwnerTools = false;
        this.showInventoryPerks = false;
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
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
            
            const uuid = wrapper.getAttribute('data-canvas-uuid');
            if (uuid === 'sandbox' || (uuid && uuid.startsWith('sandbox_'))) {
                this.isSandbox = true;
                this.sandboxUuid = uuid === 'sandbox' ? 'current' : uuid.replace('sandbox_', '');
            } else {
                this.sandboxUuid = 'current';
            }
        }

        this.lastCooldownHtml = null;
        this.templatesLoaded = false;

        this.bindEvents();
        this.applyPremiumLocks(); 
        
        if (this.isSnapshotMode) {
            this.loadCanvasConfigForSnapshot();
        } else {
            if (this.isSandbox) {
                this.isProgressive = true;
                this.initWebSocket = () => {
                    console.log('[Sandbox] WebSocket bypassed.');
                };

                this.fetchChunks = async (chunkKeys) => {
                    if (!chunkKeys || chunkKeys.length === 0) return;
                    if (!this.loadingChunks) this.loadingChunks = new Set();
                    if (!this.loadedChunks) this.loadedChunks = new Set();
                    
                    const validKeys = chunkKeys.filter(k => !this.loadedChunks.has(k) && !this.loadingChunks.has(k));
                    if (validKeys.length === 0) return;
                    
                    validKeys.forEach(k => this.loadingChunks.add(k));

                    try {
                        const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                        const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
                        const chunkSize = 512;

                        for (const key of validKeys) {
                            const [cx, cy] = key.split(',').map(Number);
                            try {
                                let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                                if (!base64) {
                                    const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                                    const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);
                                    if (actualW > 0 && actualH > 0) {
                                        const emptyBytes = new Uint8Array(actualW * actualH * 4);
                                        base64 = await DesignSandboxDb.compressAndEncode(emptyBytes);
                                    }
                                }
                                if (base64) {
                                    this.hydrateChunk(cx, cy, base64);
                                    this.loadedChunks.add(key);
                                }
                            } catch (e) {
                                console.error('[Sandbox] Failed to load chunk:', key, e);
                            } finally {
                                this.loadingChunks.delete(key);
                            }
                        }
                    } catch (e) {
                        console.error('[Sandbox] Failed to load chunks in sandbox:', e);
                    }
                };

                this.loadUserPerks = () => {
                    this.inventoryPerks = [
                        { perk_id: 'pixel_misil_1', count: 999 },
                        { perk_id: 'bomba_pixel_1', count: 999 },
                        { perk_id: 'bomba_atomica_1', count: 999 },
                        { perk_id: 'bomba_racimo_1', count: 999 },
                        { perk_id: 'lluvia_meteoritos_1', count: 999 },
                        { perk_id: 'proteccion_pixeles_1', count: 999 }
                    ];
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                };

                this.activatePerk = async (perkId, btn) => {
                    if (!perkId) return;

                    if (perkId === 'proteccion_pixeles_1') {
                        if (this.interactionMode === 'user_protecting') {
                            this.interactionMode = 'normal';
                            if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles desactivado', 'info');
                        } else {
                            this.interactionMode = 'user_protecting';
                            this.activeBomb = null;
                            if (typeof showMessage === 'function') showMessage('Modo Protector de Píxeles activado. Haz clic en el lienzo para definir la primera esquina.', 'info');
                        }
                        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                        this.updateSelectionUI();
                        this.requestRender();
                        return;
                    }

                    if (PerksRegistry.isBomb(perkId)) {
                        if (this.activeBomb === perkId && this.interactionMode === 'bombing') {
                            this.perkBombReady = null;
                            this.interactionMode = 'normal';
                            this.activeBomb = null;
                        } else {
                            this.perkBombReady = perkId;
                            this.interactionMode = 'bombing';
                            this.activeBomb = perkId;
                            if (typeof showMessage === 'function') showMessage(window.__('msg_perk_equipped_select_target'), 'info');
                        }
                        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                        this.updateSelectionUI();
                        return;
                    }

                    if (perkId.includes('cooldown') || perkId.includes('no_cooldown')) {
                        this.perkNoCooldown = true;
                        this.perkNoCooldownExpires = Date.now() + 60000;
                        showMessage('Ventaja Sin Cooldown activada (60s)', 'success');
                    } else {
                        showMessage('Ventaja activada con éxito', 'success');
                    }
                    if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                    this.updateSelectionUI();
                    this.requestRender();
                };

                this.placePixels = async () => {
                    if (this.isSelecting) return;
                    if (this.selectedPixels.size === 0) return;

                    const maxBalance = this.getMaxBalance();
                    if (this.selectedPixels.size > maxBalance) {
                        showMessage('Superas el límite permitido.', 'warning');
                        return;
                    }

                    const validPixels = [];
                    this.selectedPixels.forEach(key => {
                        const x = key & 0xFFFF;
                        const y = key >> 16;
                        validPixels.push({ x, y });
                    });

                    if (validPixels.length === 0) return;

                    const usedPerk = this.activeBomb;
                    const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(usedPerk) : null;
                    const durationSecs = parseInt(perkConfig?.warning_seconds || 3, 10);
                    const perkRadius = typeof PerksRegistry !== 'undefined' 
                        ? PerksRegistry.getExplosionRadius(usedPerk, this.boardWidth, this.boardHeight) 
                        : 10;

                    if (this.interactionMode === 'bombing') {
                        const requiredTargets = typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
                        if (this.selectedPixels.size < requiredTargets) {
                            showMessage(`Selecciona ${requiredTargets} objetivo(s)`, 'warning');
                            return;
                        }

                        validPixels.forEach(tgt => {
                            const warningData = {
                                x: tgt.x,
                                y: tgt.y,
                                duration: durationSecs,
                                perk: usedPerk,
                                radius: perkRadius
                            };
                            if (typeof this.handleBombWarning === 'function') {
                                this.handleBombWarning(warningData);
                            } else if (typeof this.handleNuclearWarning === 'function') {
                                this.handleNuclearWarning(warningData);
                            }
                        });

                        setTimeout(() => {
                            if (this.renderWorker) {
                                this.renderWorker.postMessage({
                                    type: 'BOMB_PIXEL',
                                    payload: { cX: validPixels[0]?.x ?? 0, cY: validPixels[0]?.y ?? 0, r: perkRadius, perkId: usedPerk }
                                });
                            }
                            if (typeof this.triggerExplosionEffect === 'function') {
                                this.triggerExplosionEffect(validPixels[0]?.x ?? 0, validPixels[0]?.y ?? 0, perkRadius, usedPerk);
                            }
                            this.persistBombExplosion(validPixels[0]?.x ?? 0, validPixels[0]?.y ?? 0, perkRadius);
                        }, durationSecs * 1000);

                        this.interactionMode = 'normal';
                        this.activeBomb = null;
                        this.perkBombReady = null;
                        this.selectedPixels.clear();
                        this.updateSelectionUI();
                        this.requestRender();
                        return;
                    }

                    if (this.renderWorker) {
                        const pixelsToPush = validPixels.map(p => ({
                            x: p.x,
                            y: p.y,
                            color: this.interactionMode === 'normal' ? this.currentColor : 'transparent'
                        }));
                        this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
                    } else if (this.offscreenCtx) {
                        validPixels.forEach(p => {
                            if (this.interactionMode === 'normal') {
                                this.offscreenCtx.fillStyle = this.currentColor;
                                this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                                this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                            } else {
                                this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                            }
                        });
                    }

                    try {
                        const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
                        const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

                        const chunkSize = 512;
                        const chunkGroups = {};
                        
                        validPixels.forEach(p => {
                            const cx = Math.floor(p.x / chunkSize);
                            const cy = Math.floor(p.y / chunkSize);
                            const key = `${cx},${cy}`;
                            if (!chunkGroups[key]) chunkGroups[key] = [];
                            chunkGroups[key].push(p);
                        });

                        for (const [key, pixels] of Object.entries(chunkGroups)) {
                            const [cx, cy] = key.split(',').map(Number);
                            const actualW = Math.min(chunkSize, this.boardWidth - cx * chunkSize);
                            const actualH = Math.min(chunkSize, this.boardHeight - cy * chunkSize);

                            let base64 = await DesignSandboxDb.getChunk(key, this.sandboxUuid);
                            let bytes;
                            if (base64) {
                                bytes = await DesignSandboxDb.decompress(base64);
                            }
                            if (!bytes || bytes.length !== actualW * actualH * 4) {
                                bytes = new Uint8Array(actualW * actualH * 4);
                            }

                            const colorHex = this.interactionMode === 'erasing' ? '#000000' : this.currentColor;
                            const r = parseInt(colorHex.slice(1, 3), 16);
                            const g = parseInt(colorHex.slice(3, 5), 16);
                            const b = parseInt(colorHex.slice(5, 7), 16);
                            const a = this.interactionMode === 'erasing' ? 0 : 255;

                            pixels.forEach(p => {
                                const lx = p.x % chunkSize;
                                const ly = p.y % chunkSize;
                                const pixelOffset = (ly * actualW + lx) * 4;
                                if (pixelOffset >= 0 && pixelOffset + 3 < bytes.length) {
                                    bytes[pixelOffset] = r;
                                    bytes[pixelOffset + 1] = g;
                                    bytes[pixelOffset + 2] = b;
                                    bytes[pixelOffset + 3] = a;
                                }
                            });

                            const newBase64 = await DesignSandboxDb.compressAndEncode(bytes);
                            await DesignSandboxDb.saveChunk(key, newBase64, this.sandboxUuid);
                        }
                    } catch (e) {
                        console.error('[Sandbox] Error saving pixels to IndexedDB:', e);
                    }

                    showMessage('Píxeles guardados localmente', 'success');

                    this.selectedPixels.clear();
                    this.updateSelectionUI();
                    this.requestRender();
                };
            }

            this.loadCanvasConfig();
            
            if (this.isSandbox) {
                this.initSandboxMode();
            } else {
                this.checkCanvasAccess();
                
                const uid = window.activeUserId || document.querySelector('meta[name="user-id"]')?.content || null;
                if (uid) {
                    if (typeof this.loadUserPerks === 'function') {
                        this.loadUserPerks();
                    }
                }
            }
            
            this.startCooldownLoop();
            
            if (!this.isSandbox) {
                if (this.chat && typeof this.chat.destroy === 'function') {
                    this.chat.destroy();
                }
                this.chat = new DesignChat(this);
            }
        }
        console.log('%c[Rosaura App] DesignController ready!', 'color: #4caf50; font-weight: bold;');
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

                liveShareMenuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.modalSystem && typeof window.modalSystem.show === 'function') {
                        window.modalSystem.show('upgradeSubscriptionModal');
                    } else {
                        window.location.href = (window.AppBasePath || '') + '/upgrade';
                    }
                }, true); 
            }
        }
    }

    async initSandboxMode() {
        console.log('[Rosaura Sandbox] Initializing offline sandbox mode...');
        try {
            const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

            const settings = await DesignSandboxDb.getSettings();
            if (settings) {
                this.boardWidth = parseInt(settings.width, 10) || 64;
                this.boardHeight = parseInt(settings.height, 10) || 64;
                this.canvasPaletteId = settings.paletteId || 'default';
                this.cooldownMax = parseInt(settings.cooldownBatch, 10) || 100;
                this.cooldownBalance = this.cooldownMax;
            } else {
                await DesignSandboxDb.saveSettings({
                    width: this.boardWidth,
                    height: this.boardHeight,
                    paletteId: this.canvasPaletteId,
                    cooldownBatch: this.cooldownMax
                });
            }

            this.isProgressive = true;
            this.setupCanvas();
            this.centerBoard();
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.renderColorPalette(this.canvasPaletteId);

            this.loadedChunks = new Set();
            this.loadingChunks = new Set();
            this.updateVisibleChunks();
        } catch (e) {
            console.error('[Sandbox] Failed to initialize Sandbox mode:', e);
        }
    }

    startCooldownLoop() {
        if (this.cooldownLoopId) cancelAnimationFrame(this.cooldownLoopId);
        
        const tick = () => {
            if (!this.isSpectator && !this.isSnapshotMode && !this.isResizeLocked) {
                
                let remaining = 0;
                if (!this.perkNoCooldown) {
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
                } else {
                    const badgesLeft = document.querySelector('[data-ref="badges-left"]');
                    if (badgesLeft) {
                        let noCdBadge = badgesLeft.querySelector('[data-badge-id="perk-no-cooldown"]');
                        if (noCdBadge && this.perkNoCooldownExpires) {
                            const timeRem = Math.max(0, Math.ceil((this.perkNoCooldownExpires - Date.now()) / 1000));
                            if (timeRem > 0) {
                                noCdBadge.innerHTML = `<span class="material-symbols-rounded component-text-accent">bolt</span><span>Sin Cooldown (${timeRem}s)</span>`;
                            } else {
                                this.perkNoCooldown = false;
                                if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
                                this.updateSelectionUI();
                            }
                        }
                    }
                }

                if (this.uiCooldownBadge) {
                    let newHtml = '';
                    if (this.isSandbox) {
                        if (this.interactionMode === 'bombing' && this.activeBomb) {
                            const icon = PerksRegistry.getIcon(this.activeBomb);
                            const targetMax = PerksRegistry.getTargetCount(this.activeBomb);
                            const currentSel = this.selectedPixels ? this.selectedPixels.size : 0;
                            newHtml = `
                                <span class="material-symbols-rounded">${icon}</span>
                                <span>${currentSel}/${targetMax}</span>
                            `;
                        } else {
                            newHtml = `
                                <span class="material-symbols-rounded">bolt</span>
                                <span>${Math.floor(this.cooldownBalance)}/${this.cooldownMax}</span>
                            `;
                        }
                    } else if (this.interactionMode === 'bombing' && this.activeBomb) {
                        const icon = PerksRegistry.getIcon(this.activeBomb);
                        const targetMax = PerksRegistry.getTargetCount(this.activeBomb);
                        const currentSel = this.selectedPixels ? this.selectedPixels.size : 0;
                        newHtml = `
                            <span class="material-symbols-rounded">${icon}</span>
                            <span>${currentSel}/${targetMax}</span>
                        `;
                    } else if (this.isCooldownSynced) {
                        const rText = remaining > 0 ? `${Math.ceil(remaining)}s` : '0s';
                        newHtml = `
                            <span class="material-symbols-rounded">bolt</span>
                            <span>${Math.floor(this.cooldownBalance)}/${this.cooldownMax}</span>
                            <span>|</span>
                            <span class="material-symbols-rounded">timer</span>
                            <span>${rText}</span>
                        `;
                    } else {
                        newHtml = `
                            <span class="material-symbols-rounded">bolt</span>
                            <span>...</span>
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
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('resize', this.handleResizeBound);
        
        document.removeEventListener('touchstart', this.handleTouchStartBound);
        document.removeEventListener('touchmove', this.handleTouchMoveBound);
        document.removeEventListener('touchend', this.handleTouchEndBound);
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileUploadBound);
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

        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this._lastCanvasW = null;
        this._lastCanvasH = null;
        this._lastDpr = null;
        this.loadedChunks = null;
        this.pixelQueue = null;
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