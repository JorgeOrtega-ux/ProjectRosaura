import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

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
        img.onload = async () => {
            if (this.renderWorker) {
                try {
                    const imageBitmap = await createImageBitmap(img);
                    this.renderWorker.postMessage({
                        type: 'DRAW_IMAGE_BUFFER',
                        payload: { imageBitmap }
                    }, [imageBitmap]);
                } catch (e) {
                    console.error('[DesignSetup] Error creating image bitmap for worker:', e);
                }
            } else if (this.offscreenCtx) {
                this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
                this.offscreenCtx.drawImage(img, 0, 0, this.boardWidth, this.boardHeight);
                this.requestRender();
            }
        };
        img.onerror = () => {
            showMessage(__('err_history_image_missing'), 'error');
        };
        img.src = url;
    },

    loadCanvasConfig() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        
        if (wrapper) {
            this.canvasIntId = wrapper.getAttribute('data-canvas-id');
            this.canvasId = wrapper.getAttribute('data-canvas-uuid'); 
            this.canvasPrivacy = wrapper.getAttribute('data-privacy') || 'private';
            this.isPrivateBlocked = wrapper.getAttribute('data-is-blocked') === '1';
            this.isPremiumBlocked = wrapper.getAttribute('data-premium-blocked') === '1';
            this.isSpectator = wrapper.getAttribute('data-is-spectator') === '1';
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
            this.initWebSocket();
        } else {
            this.setupCanvas();
            this.centerBoard();
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.renderColorPalette('default');
            this.updateLockBadges();
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

        if (this.isPlazmarLocked) {
            this.setCanvasBadge('lock-plazmar', 'brush', __('badge_stamping'), 'left');
        } else {
            this.removeCanvasBadge('lock-plazmar', 'left');
        }

        if (this.isPremiumBlocked) {
            this.setCanvasBadge('lock-premium', 'warning', __('badge_premium_expired'), 'left');
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
            console.error('[DesignSetup] Error decompressing canvas state:', err);
            return null;
        }
    },

    async hydrateCanvasState(base64String) {
        try {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'HYDRATE_STATE',
                    payload: {
                        base64String,
                        boardWidth: this.boardWidth,
                        boardHeight: this.boardHeight
                    }
                });
                return;
            }
            const bytes = await this.decompressIfNeeded(base64String);
            if (!bytes) return;

            const w = parseInt(this.boardWidth, 10);
            const h = parseInt(this.boardHeight, 10);
            if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
                console.error('[DesignSetup] Invalid canvas dimensions in hydrateCanvasState:', this.boardWidth, this.boardHeight);
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
            console.error('[DesignSetup] hydrateCanvasState error:', e);
        }
    },

    async hydrateChunk(chunkX, chunkY, base64String) {
        if (!this.chunks) return;
        const key = `${chunkX},${chunkY}`;
        let chunkCanvas = this.chunks.get(key);
        let ctx;
        if (!chunkCanvas) {
            chunkCanvas = document.createElement('canvas');
            chunkCanvas.width = 512;
            chunkCanvas.height = 512;
            this.chunks.set(key, chunkCanvas);
        }
        ctx = chunkCanvas.getContext('2d', { alpha: true });

        try {
            if (!base64String) {
                return;
            }
            const bytes = await this.decompressIfNeeded(base64String);
            if (!bytes) return;

            const imageData = ctx.createImageData(512, 512);
            const totalBytes = Math.min(bytes.length, imageData.data.length);
            imageData.data.set(bytes.subarray(0, totalBytes));
            
            ctx.putImageData(imageData, 0, 0);
            this.requestRender();
        } catch (e) {
            console.error('[DesignSetup] hydrateChunk error:', e);
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
                            dpr: dpr
                        }
                    }, [offscreen]);
                }
            } catch (e) {
                console.warn('[DesignSetup] Worker OffscreenCanvas initialization fallback to main thread:', e);
                this.renderWorker = null;
            }
        }

        if (!this.renderWorker) {
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
        const rect = parent.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
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
        
        const scaledWidth = this.boardWidth * this.transform.scale;
        const scaledHeight = this.boardHeight * this.transform.scale;
        
        const safeMarginX = Math.min(100, scaledWidth / 2);
        const safeMarginY = Math.min(100, scaledHeight / 2);

        const minX = safeMarginX - scaledWidth;
        const maxX = (this.canvas.width / (window.devicePixelRatio || 1)) - safeMarginX;
        
        const minY = safeMarginY - scaledHeight;
        const maxY = (this.canvas.height / (window.devicePixelRatio || 1)) - safeMarginY;

        this.transform.x = Math.min(Math.max(this.transform.x, minX), maxX);
        this.transform.y = Math.min(Math.max(this.transform.y, minY), maxY);
    }
};