import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';

export const DesignSetup = {
    loadCanvasConfigForSnapshot() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (wrapper) {
            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                const parts = sizeStr.toLowerCase().split('x');
                this.boardWidth = parseInt(parts[0], 10);
                this.boardHeight = parts.length > 1 ? parseInt(parts[1], 10) : this.boardWidth;
            }
        }
        this.setupCanvas();
        this.centerBoard();
        this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
        this.blockToolsForSnapshot();
        this.updateLockBadges();
        this.drawImageOnCanvas(this.snapshotImg);
    },

    blockToolsForSnapshot() {
        this.isSpectator = true;
        this.isResetLocked = true; 
        
        if (this.btnPlacePixels) this.btnPlacePixels.classList.add('disabled');
        if (this.btnColorPalette) this.btnColorPalette.classList.add('disabled');
    },

    drawImageOnCanvas(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const loadPromise = new Promise((resolve) => {
            img.onload = async () => {
                if (this.renderWorker) {
                    try {
                        const imageBitmap = await createImageBitmap(img);
                        this.renderWorker.postMessage({
                            type: 'DRAW_IMAGE_BUFFER',
                            payload: { imageBitmap }
                        }, [imageBitmap]);
                    } catch (e) {
                        console.error('[DesignSetup] drawImageOnCanvas createImageBitmap error:', e);
                    }
                } else if (this.offscreenCtx) {
                    this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
                    this.offscreenCtx.drawImage(img, 0, 0, this.boardWidth, this.boardHeight);
                    this.requestRender();
                }
                resolve(true);
            };
            img.onerror = () => {
                if (img.crossOrigin) {
                    img.crossOrigin = null;
                    img.src = url;
                } else {
                    showMessage(__('err_history_image_missing'), 'error');
                    resolve(false);
                }
            };
        });
        img.src = url;
    },

    loadCanvasConfig() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        
        if (wrapper) {
            this.canvasIntId = wrapper.getAttribute('data-canvas-id');
            this.canvasId = wrapper.getAttribute('data-canvas-uuid'); 
            this.canvasPrivacy = wrapper.getAttribute('data-privacy') || 'private';
            this.isPrivateBlocked = wrapper.getAttribute('data-is-blocked') === '1';
            this.isSubscriptionLocked = wrapper.getAttribute('data-subscription-locked') === '1';
            this.isSpectator = wrapper.getAttribute('data-is-spectator') === '1';
            this.isOwner = wrapper.getAttribute('data-is-owner') === '1';
            this.canvasApproval = wrapper.getAttribute('data-approval') === '1';

            this.resetActive = wrapper.getAttribute('data-reset-active') === '1';
            this.nextResetAt = wrapper.getAttribute('data-reset-at');
            this.timerAction = wrapper.getAttribute('data-timer-action') || 'restart';

            this.resizeActive = wrapper.getAttribute('data-resize-active') === '1';
            this.nextResizeAt = wrapper.getAttribute('data-resize-at');
            this.resizeTargetSize = wrapper.getAttribute('data-resize-target') || '64x64';
            this.resizeTimerAction = wrapper.getAttribute('data-resize-timer-action') || 'restart';

            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                const parts = sizeStr.toLowerCase().split('x');
                this.boardWidth = parseInt(parts[0], 10);
                this.boardHeight = parts.length > 1 ? parseInt(parts[1], 10) : this.boardWidth;
            } else {
                this.boardWidth = 64;
                this.boardHeight = 64;
            }
            
            const initialZoomAttr = wrapper.getAttribute('data-initial-zoom');
            this.initialZoomConfig = initialZoomAttr ? parseFloat(initialZoomAttr) : 0.5;
            
            this.canvasPaletteId = wrapper.getAttribute('data-palette') || 'default';
            
            this.setupCanvas();
            this.centerBoard();
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.renderColorPalette(this.canvasPaletteId);

            if (this.resetActive && this.nextResetAt) {
                this.startResetTimer();
            }

            if (this.resizeActive && this.nextResizeAt) {
                this.startResizeTimer();
            }

            this.updateLockBadges();
            if (!this.isSandbox) {
                this.initWebSocket();
            }
        } else {
            this.setupCanvas();
            this.centerBoard();
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.renderColorPalette('default');
            this.updateLockBadges();
        }
    },

    async initSandboxMode() {
        console.log('[Rosaura Sandbox] Initializing offline sandbox mode...');
        try {
            const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;

            const settings = await DesignSandboxDb.getSettings(this.sandboxUuid);
            if (settings) {
                this.boardWidth = parseInt(settings.width, 10) || 64;
                this.boardHeight = parseInt(settings.height, 10) || 64;
                this.canvasPaletteId = settings.paletteId || 'default';
                this.cooldownMax = parseInt(settings.cooldownBatch, 10) || 100;
                this.cooldownBalance = this.cooldownMax;
                
                // Actualizar el título de la página/lienzo
                const titleElements = document.querySelectorAll('.component-top-title');
                if (titleElements.length > 1 && settings.name) {
                    titleElements[1].textContent = settings.name;
                } else if (titleElements.length > 0 && settings.name) {
                    titleElements[0].textContent = settings.name;
                }
            } else {
                await DesignSandboxDb.saveSettings({
                    width: this.boardWidth,
                    height: this.boardHeight,
                    paletteId: this.canvasPaletteId,
                    cooldownBatch: this.cooldownMax
                }, this.sandboxUuid);
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
    },

    updateLockBadges() {
        if (this.isResetLocked) {
            this.setCanvasBadge('lock-reset', 'auto_delete', __('badge_resetting'), 'left');
        } else {
            this.removeCanvasBadge('lock-reset', 'left');
        }

        if (this.isResizeLocked) {
            this.setCanvasBadge('lock-resize', 'aspect_ratio', __('badge_expanding'), 'left');
        } else {
            this.removeCanvasBadge('lock-resize', 'left');
        }

        if (this.isInjectLocked) {
            this.setCanvasBadge('lock-inject', 'brush', __('badge_stamping'), 'left');
        } else {
            this.removeCanvasBadge('lock-inject', 'left');
        }

        if (this.isClearLocked) {
            this.setCanvasBadge('lock-clear', 'cleaning_services', 'Vaciando zona...', 'left');
        } else {
            this.removeCanvasBadge('lock-clear', 'left');
        }

        if (this.isFrozen) {
            this.setCanvasBadge('lock-freeze', 'ac_unit', 'Lienzo Congelado (Solo Lectura)', 'left');
        } else {
            this.removeCanvasBadge('lock-freeze', 'left');
        }

        if (this.isSubscriptionLocked) {
            this.setCanvasBadge('lock-premium', 'warning', __('badge_subscription_expired'), 'left');
            this.removeCanvasBadge('lock-private', 'left');
        } else if (this.isPrivateBlocked) {
            this.setCanvasBadge('lock-private', 'lock', __('badge_member_required'), 'left');
            this.removeCanvasBadge('lock-premium', 'left');
        } else {
            this.removeCanvasBadge('lock-private', 'left');
            this.removeCanvasBadge('lock-premium', 'left');
        }
    },

    startResetTimer() {
        if (this.resetTimerInterval) clearInterval(this.resetTimerInterval);
        
        if (this.timerAction === 'none') {
            this.removeCanvasBadge('reset-timer', 'right');
            return;
        }
        
        const targetMs = new Date(this.nextResetAt.replace(' ', 'T') + 'Z').getTime();
        
        const updateTimer = () => {
            const nowMs = Date.now();
            const diffMs = targetMs - nowMs;
            
            if (diffMs <= 0) {
                this.setCanvasBadge('reset-timer', 'autorenew', '00:00:00', 'right');
                if (this.timerAction === 'stop') {
                    clearInterval(this.resetTimerInterval);
                    setTimeout(() => this.removeCanvasBadge('reset-timer', 'right'), 2000);
                }
                return;
            }
            
            const totalSecs = Math.floor(diffMs / 1000);
            const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSecs % 60).padStart(2, '0');
            
            this.setCanvasBadge('reset-timer', 'autorenew', `${hours}:${mins}:${secs}`, 'right');
        };
        
        updateTimer();
        this.resetTimerInterval = setInterval(updateTimer, 1000);
    },

    startResizeTimer() {
        if (this.resizeTimerInterval) clearInterval(this.resizeTimerInterval);
        
        if (this.resizeTimerAction === 'none') {
            this.removeCanvasBadge('resize-timer', 'right');
            return;
        }
        
        const targetMs = new Date(this.nextResizeAt.replace(' ', 'T') + 'Z').getTime();
        
        const updateTimer = () => {
            const nowMs = Date.now();
            const diffMs = targetMs - nowMs;
            
            if (diffMs <= 0) {
                this.setCanvasBadge('resize-timer', 'aspect_ratio', __('badge_expanding'), 'right');
                if (this.resizeTimerAction === 'stop') {
                    clearInterval(this.resizeTimerInterval);
                    setTimeout(() => this.removeCanvasBadge('resize-timer', 'right'), 5000);
                }
                return;
            }
            
            const totalSecs = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSecs / 86400);
            const hours = String(Math.floor((totalSecs % 86400) / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSecs % 60).padStart(2, '0');
            
            let timeStr = days > 0 ? `${days}d ${hours}:${mins}:${secs}` : `${hours}:${mins}:${secs}`;
            
            this.setCanvasBadge('resize-timer', 'aspect_ratio', timeStr, 'right');
        };
        
        updateTimer();
        this.resizeTimerInterval = setInterval(updateTimer, 1000);
    },

    async decompressIfNeeded(base64String) {
        if (!base64String) return null;
        try {
            const binaryString = atob(base64String);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Check for Gzip magic bytes (0x1F, 0x8B)
            if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
                if ('DecompressionStream' in window) {
                    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
                    const decompressedBuffer = await new Response(stream).arrayBuffer();
                    bytes = new Uint8Array(decompressedBuffer);
                }
            }
            return bytes;
        } catch (err) {
            return null;
        }
    },

    async hydrateCanvasState(base64String, templateCoords = null) {
        try {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'HYDRATE_STATE',
                    payload: {
                        base64String,
                        boardWidth: this.boardWidth,
                        boardHeight: this.boardHeight,
                        templateCoords
                    }
                });
                return;
            }
            const bytes = await this.decompressIfNeeded(base64String);
            if (!bytes) return;

            const w = parseInt(this.boardWidth, 10);
            const h = parseInt(this.boardHeight, 10);
            if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
                return;
            }

            if (!this.offscreenCtx) {
                this.setupCanvas();
            }

            const imageData = this.offscreenCtx.createImageData(w, h);
            const totalBytes = Math.min(bytes.length, imageData.data.length);
            imageData.data.set(bytes.subarray(0, totalBytes));
            
            this.offscreenCtx.putImageData(imageData, 0, 0);
            this.requestRender();

        } catch (e) {
        }
    },

    async initCanvasData(canvasData, forceReload = false) {
        if (!canvasData) return;
        this.isProgressive = !!canvasData.progressive_load;
        if (!this.loadedChunks || forceReload) {
            this.loadedChunks = new Set();
        }

        if (this.isProgressive) {
            if (canvasData.thumbnail_url && !forceReload) {
                this.drawImageOnCanvas(canvasData.thumbnail_url);
            }
            this.updateVisibleChunks();
        } else if (canvasData.state_base64) {
            this.hydrateCanvasState(canvasData.state_base64);
        }
    },

    updateVisibleChunks() {
        if (!this.isProgressive || !this.canvas) return;

        const chunkSize = 512;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || !this.transform || !this.transform.scale) return;

        const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
        const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
        const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
        const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

        const minChunkX = Math.floor(startX / chunkSize);
        const minChunkY = Math.floor(startY / chunkSize);
        const maxChunkX = Math.floor(Math.max(0, endX - 1) / chunkSize);
        const maxChunkY = Math.floor(Math.max(0, endY - 1) / chunkSize);

        const chunksToFetch = [];

        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
            for (let cy = minChunkY; cy <= maxChunkY; cy++) {
                if (cx * chunkSize >= this.boardWidth || cy * chunkSize >= this.boardHeight) continue;
                const key = `${cx},${cy}`;
                if (!this.loadedChunks.has(key)) {
                    chunksToFetch.push(key);
                }
            }
        }

        if (chunksToFetch.length > 0) {
            this.fetchChunks(chunksToFetch);
        }
    },

    async fetchChunks(chunkKeys) {
        if (!chunkKeys || chunkKeys.length === 0) return;
        
        if (!this.loadingChunks) {
            this.loadingChunks = new Set();
        }
        if (!this.loadedChunks) {
            this.loadedChunks = new Set();
        }
        
        const validKeys = chunkKeys.filter(k => !this.loadedChunks.has(k) && !this.loadingChunks.has(k));
        if (validKeys.length === 0) return;
        
        validKeys.forEach(k => this.loadingChunks.add(k));

        if (this.isSandbox) {
            const DesignSandboxDbModule = await import('./DesignSandboxDb.js');
            const DesignSandboxDb = DesignSandboxDbModule.DesignSandboxDb;
            const chunkSize = 512;

            validKeys.forEach(async (key) => {
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
            });
            return;
        }

        // Batch chunk requests to prevent massive 48MB JSON payloads and blocking
        const BATCH_SIZE = 4;
        const fetchPromises = [];

        for (let i = 0; i < validKeys.length; i += BATCH_SIZE) {
            const batch = validKeys.slice(i, i + BATCH_SIZE);
            
            fetchPromises.push((async () => {
                try {
                    // Fetch directly from Nginx -> Go, bypassing PHP completely
                    const response = await fetch('/api/go/canvases/get_chunks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            canvas_id: parseInt(this.canvasIntId, 10),
                            board_w: this.boardWidth,
                            board_h: this.boardHeight,
                            chunks: batch
                        })
                    });
                    
                    if (!response.ok) {
                        batch.forEach(k => this.loadingChunks.delete(k));
                        return;
                    }
                    const result = await response.json();
                    
                    if (result && result.success && result.data?.chunks) {
                        const receivedKeys = Object.keys(result.data.chunks);

                        Object.entries(result.data.chunks).forEach(([key, base64]) => {
                            const [cx, cy] = key.split(',').map(Number);
                            this.loadedChunks.add(key);
                            this.loadingChunks.delete(key);
                            this.hydrateChunk(cx, cy, base64);
                        });

                        batch.forEach(k => {
                            if (!result.data.chunks[k]) {
                                this.loadingChunks.delete(k);
                            }
                        });
                    } else {
                        batch.forEach(k => this.loadingChunks.delete(k));
                    }
                } catch (e) {
                    batch.forEach(k => this.loadingChunks.delete(k));
                }
            })());
        }

        await Promise.all(fetchPromises);
    },

    async hydrateChunk(chunkX, chunkY, base64String) {
        if (!base64String) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'HYDRATE_CHUNK',
                payload: { chunkX, chunkY, chunkSize: 512, base64String }
            });
            return;
        }

        try {
            const bytes = await this.decompressIfNeeded(base64String);
            if (!bytes || !this.offscreenCtx) return;

            const chunkSize = 512;
            const actualW = Math.min(chunkSize, this.boardWidth - chunkX * chunkSize);
            const actualH = Math.min(chunkSize, this.boardHeight - chunkY * chunkSize);
            if (actualW <= 0 || actualH <= 0) return;

            const imageData = this.offscreenCtx.createImageData(actualW, actualH);
            const totalBytes = Math.min(bytes.length, imageData.data.length);
            imageData.data.set(bytes.subarray(0, totalBytes));

            this.offscreenCtx.putImageData(imageData, chunkX * chunkSize, chunkY * chunkSize);
            this.requestRender();
        } catch (e) {
        }
    },


    setupCanvas() {
        this.updateCanvasDimensions();
        
        if (this.canvas && typeof this.canvas.transferControlToOffscreen === 'function' && typeof Worker !== 'undefined') {
            try {
                if (!this.renderWorker) {
                    const workerPath = `${this.basePath}/assets/js/modules/app/design/workers/CanvasRenderWorker.js`;
                    this.renderWorker = new Worker(workerPath);
                    const offscreen = this.canvas.transferControlToOffscreen();
                    const dpr = window.devicePixelRatio || 1;
                    
                    this.renderWorker.postMessage({
                        type: 'INIT_CANVAS',
                        payload: {
                            canvas: offscreen,
                            boardWidth: this.boardWidth,
                            boardHeight: this.boardHeight,
                            dpr: dpr,
                            isProgressive: this.isProgressive
                        }
                    }, [offscreen]);
                } else {
                    this.renderWorker.postMessage({
                        type: 'RESIZE_BOARD',
                        payload: {
                            boardWidth: this.boardWidth,
                            boardHeight: this.boardHeight
                        }
                    });
                }
            } catch (e) {
                this.renderWorker = null;
            }
        }

        if (!this.renderWorker) {
            if (this.canvas && !this.ctx) {
                this.ctx = this.canvas.getContext('2d', { alpha: false });
            }
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCanvas.width = this.boardWidth;
            this.offscreenCanvas.height = this.boardHeight;
            this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
        }

        if (typeof this.ensureExplosionStyles === 'function') {
            this.ensureExplosionStyles();
        }
    },

    updateCanvasDimensions() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        const dpr = window.devicePixelRatio || 1;
        const newWidth = Math.floor(rect.width * dpr);
        const newHeight = Math.floor(rect.height * dpr);

        if (this._lastCanvasW === newWidth && this._lastCanvasH === newHeight && this._lastDpr === dpr) {
            return;
        }

        this._lastCanvasW = newWidth;
        this._lastCanvasH = newHeight;
        this._lastDpr = dpr;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'RESIZE',
                payload: { width: rect.width, height: rect.height, dpr: dpr }
            });
        } else {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
        }
    },

    handleResize() {
        if (!this.canvas) return;
        this.updateCanvasDimensions();
        if (typeof this.limitBounds === 'function') {
            this.limitBounds();
        }
        if (this.isProgressive && typeof this.updateVisibleChunks === 'function') {
            this.updateVisibleChunks();
        }
        if (typeof this.requestRender === 'function') {
            this.requestRender();
        }
    },

    centerBoard() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.boardWidth;
        const scaleY = rect.height / this.boardHeight;
        
        

        this.transform.scale = Math.min(scaleX, scaleY) * 0.9;
        
        this.transform.x = (rect.width - (this.boardWidth * this.transform.scale)) / 2;
        this.transform.y = (rect.height - (this.boardHeight * this.transform.scale)) / 2;
    },

    limitBounds() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) return;
        
        const scaledWidth = this.boardWidth * this.transform.scale;
        const scaledHeight = this.boardHeight * this.transform.scale;
        
        const safeMarginX = Math.min(100, scaledWidth / 2);
        const safeMarginY = Math.min(100, scaledHeight / 2);

        const minX = safeMarginX - scaledWidth;
        const maxX = rect.width - safeMarginX;
        
        const minY = safeMarginY - scaledHeight;
        const maxY = rect.height - safeMarginY;

        this.transform.x = Math.min(Math.max(this.transform.x, minX), maxX);
        this.transform.y = Math.min(Math.max(this.transform.y, minY), maxY);
    }
};