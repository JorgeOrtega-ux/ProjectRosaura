import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { showMessage } from '../../../core/utils/uiUtils.js';
import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { CanvasStorageEngine } from './utils/CanvasStorageEngine.js';

const api = new ApiService();

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
                    if (this.isSnapshotMode) {
                        showMessage(__('err_history_image_missing'), 'error');
                    } else {
                        console.warn('[DesignSetup] Failed to load canvas thumbnail:', url);
                    }
                    resolve(false);
                }
            };
        });
        img.src = url;
        return loadPromise;
    },

    async loadCanvasConfig() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        
        if (wrapper) {
            this.canvasIntId = wrapper.getAttribute('data-canvas-id');
            this.canvasId = wrapper.getAttribute('data-canvas-uuid'); 
            this.canvasPrivacy = wrapper.getAttribute('data-privacy') || 'private';
            this.canvasMode = wrapper.getAttribute('data-mode') || 'offline';
            this.isOnlineActive = wrapper.getAttribute('data-online-active') === '1';
            this.isOfflineMode = (this.canvasMode === 'offline' && !this.isOnlineActive);
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'SET_OFFLINE_MODE',
                    payload: { isOfflineMode: this.isOfflineMode }
                });
            }
            this.isLocalCanvas = wrapper.getAttribute('data-is-local') === '1' || (typeof this.canvasId === 'string' && this.canvasId.startsWith('local_')) || (typeof this.canvasIntId === 'string' && String(this.canvasIntId).startsWith('local_'));
            
            let localMeta = null;
            if (this.isLocalCanvas) {
                this.isOfflineMode = true;
                this.isOwner = true;
                this.isSpectator = false;
                this.isPrivateBlocked = false;
                this.isSubscriptionLocked = false;
                this.canvasRole = 'owner';
                
                try {
                    localMeta = await CanvasStorageEngine.getLocalCanvas(this.canvasId);
                } catch (e) {
                    localMeta = null;
                }

                if (localMeta) {
                    if (localMeta.name) {
                        this.canvasName = localMeta.name;
                        const titleEl = document.querySelector('.component-top-title');
                        if (titleEl) titleEl.textContent = localMeta.name;
                    }
                    if (localMeta.palette_id) {
                        this.canvasPaletteId = localMeta.palette_id;
                    }
                    if (localMeta.size) {
                        wrapper.setAttribute('data-size', localMeta.size);
                    }
                }
            } else {
                this.isPrivateBlocked = wrapper.getAttribute('data-is-blocked') === '1';
                this.isSubscriptionLocked = wrapper.getAttribute('data-subscription-locked') === '1';
                this.isSpectator = wrapper.getAttribute('data-is-spectator') === '1';
                this.isOwner = wrapper.getAttribute('data-is-owner') === '1';
            }
            this.canvasApproval = wrapper.getAttribute('data-approval') === '1';

            this.resetActive = wrapper.getAttribute('data-reset-active') === '1';
            this.nextResetAt = wrapper.getAttribute('data-reset-at');
            this.timerAction = wrapper.getAttribute('data-timer-action') || 'restart';

            this.resizeActive = wrapper.getAttribute('data-resize-active') === '1';
            this.nextResizeAt = wrapper.getAttribute('data-resize-at');
            this.resizeTargetSize = wrapper.getAttribute('data-resize-target') || '64x64';
            this.resizeTimerAction = wrapper.getAttribute('data-resize-timer-action') || 'restart';

            const sizeStr = (localMeta && localMeta.size) ? localMeta.size : wrapper.getAttribute('data-size');
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
            
            if (!this.canvasPaletteId) {
                this.canvasPaletteId = wrapper.getAttribute('data-palette') || 'default';
            }
            this.allowCustomColors = wrapper.getAttribute('data-allow-custom-colors') === '1';
            
            const customSection = document.querySelector('[data-ref="custom-colors-section"]');
            if (customSection) {
                if (this.isOfflineMode) {
                    customSection.classList.remove('disabled');
                    customSection.classList.add('active');
                } else {
                    customSection.classList.remove('active');
                    customSection.classList.add('disabled');
                }
            }

            if (this.isOfflineMode && typeof this.loadCustomColors === 'function') {
                this.customPickedColors = this.loadCustomColors();
            } else {
                this.customPickedColors = [];
            }

            const recentSection = document.querySelector('[data-ref="recent-colors-section"]');
            if (recentSection) {
                if (this.isOfflineMode && Array.isArray(this.customPickedColors) && this.customPickedColors.length > 0) {
                    recentSection.classList.remove('disabled');
                    recentSection.classList.add('active');
                } else {
                    recentSection.classList.remove('active');
                    recentSection.classList.add('disabled');
                }
            }

            this.setupCanvas();
            if (this.isLocalCanvas) {
                await this.hydrateCanvasState(null);
            }
            if (this.isOfflineMode && typeof this.syncOfflineToolsTier === 'function') {
                this.syncOfflineToolsTier();
            }
            this.centerBoard();
            if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.renderColorPalette(this.canvasPaletteId);
            if (this.isOfflineMode && !this.isSpectator) {
                this.interactionMode = 'offline_brush';
                const btnBrush = document.querySelector('[data-action="toggleOfflineBrush"]');
                if (btnBrush) btnBrush.classList.add('active');
            }
            if (typeof this.updateTopPropertyBar === 'function') this.updateTopPropertyBar(this.interactionMode);
            if (typeof this.updateDualColorSwatchesUI === 'function') this.updateDualColorSwatchesUI();
            if (typeof this.setupHorizontalToolsScroll === 'function') this.setupHorizontalToolsScroll();
            if (typeof this.loadStickersLibrary === 'function') {
                this.loadStickersLibrary();
            }

            if (this.resetActive && this.nextResetAt) {
                this.startResetTimer();
            }

            if (this.resizeActive && this.nextResizeAt) {
                this.startResizeTimer();
            }

            const activeLiveShareCode = wrapper.getAttribute('data-active-live-share-code');
            if (activeLiveShareCode) {
                this.liveShareStatus = 'owner';
                this.liveShareCode = activeLiveShareCode;
                this.liveTemplateId = null;

                // Store the template position data so we can restore it after WS reconnect
                try {
                    const rawData = wrapper.getAttribute('data-active-live-share-data');
                    this._restoredLiveShareData = rawData ? JSON.parse(rawData) : null;
                } catch (e) {
                    this._restoredLiveShareData = null;
                }

                const btnToggleLiveBroadcast = document.querySelector('[data-action="toggleLiveBroadcast"]');
                if (btnToggleLiveBroadcast) {
                    btnToggleLiveBroadcast.classList.add('component-color-indicator');
                    btnToggleLiveBroadcast.style.setProperty('--active-color', 'var(--color-danger, #ef4444)');
                }

                const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                if (btnOpenJoinLive) {
                    btnOpenJoinLive.classList.add('disabled-interaction');
                    btnOpenJoinLive.setAttribute('title', window.__('err_cannot_join_while_streaming'));
                }

                let badge = document.getElementById('live-share-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'component-badge';
                    badge.id = 'live-share-badge';
                    badge.innerHTML = '<span class="material-symbols-rounded">sensors</span><span>Transmisión en curso (1 en línea)</span>';
                    const badgesContainer = document.querySelector('[data-ref="badges-left"]');
                    if (badgesContainer) badgesContainer.appendChild(badge);
                }

                if (typeof this._createCodeBadge === 'function') {
                    this._createCodeBadge(this.liveShareCode);
                }
            }

            this.updateLockBadges();
            if (typeof this.initSyncChannel === 'function') {
                this.initSyncChannel();
            }
            if (!this.isOfflineMode) {
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

    async decompressIfNeeded(input) {
        if (!input) return null;
        let bytes;
        try {
            if (typeof input === 'string') {
                const binaryString = atob(input);
                bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
            } else if (input instanceof Uint8Array) {
                bytes = input;
            } else if (input instanceof ArrayBuffer) {
                bytes = new Uint8Array(input);
            } else {
                return null;
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

    async hydrateCanvasState(base64String, templateCoords = null, serverLayersData = null) {
        try {
            let layersData = null;
            let effectiveBase64 = base64String;

            if (this.isOfflineMode && this.canvasIntId) {
                // 1. Obtener o recuperar capas desde server o IndexedDB/localStorage
                if (serverLayersData && (typeof serverLayersData === 'object' || Array.isArray(serverLayersData))) {
                    layersData = serverLayersData;
                    CanvasStorageEngine.saveLayersData(this.canvasIntId, serverLayersData).catch(() => {});
                } else {
                    layersData = await CanvasStorageEngine.getLayersData(this.canvasIntId);
                }

                // 2. Extraer paleta de colores recientes
                const extractedColors = layersData?.recent_colors || layersData?.custom_colors;
                if (Array.isArray(extractedColors) && extractedColors.length > 0) {
                    this.customPickedColors = extractedColors.slice(0, 18);
                    if (typeof this.saveCustomColors === 'function') this.saveCustomColors();
                    if (typeof this.renderCustomPickedColors === 'function') this.renderCustomPickedColors();
                }

                // 3. Autorrecuperación silenciosa en caso de estado nulo o dañado
                if ((!effectiveBase64 || effectiveBase64.length < 20) && this.canvasIntId) {
                    const localState = await CanvasStorageEngine.getCanvasState(this.canvasIntId);
                    if (localState && localState.base64 && localState.base64.length > 20) {
                        effectiveBase64 = localState.base64;
                    } else {
                        const backup = await CanvasStorageEngine.getLatestValidBackup(this.canvasIntId);
                        if (backup && backup.base64) {
                            effectiveBase64 = backup.base64;
                            if (!layersData && backup.layersData) {
                                layersData = backup.layersData;
                            }
                        }
                    }
                }

                // 4. Persistir estado en IndexedDB y generar backup silencioso de inicio de sesión
                if (effectiveBase64 && this.canvasIntId) {
                    CanvasStorageEngine.saveCanvasState(this.canvasIntId, effectiveBase64, this.boardWidth, this.boardHeight).catch(() => {});
                    CanvasStorageEngine.createSilentBackup(this.canvasIntId, effectiveBase64, layersData, 'session_start').catch(() => {});
                }
            }

            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'HYDRATE_STATE',
                    payload: {
                        base64String: effectiveBase64,
                        layersData,
                        boardWidth: this.boardWidth,
                        boardHeight: this.boardHeight,
                        templateCoords
                    }
                });
                return;
            }
            const bytes = await this.decompressIfNeeded(effectiveBase64);
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
            // Hydrate server-side preloaded chunks immediately
            const startTime = performance.now();
            if (window.__PRELOADED_CHUNKS__ && Object.keys(window.__PRELOADED_CHUNKS__).length > 0) {
                Object.entries(window.__PRELOADED_CHUNKS__).forEach(([key, base64]) => {
                    const [cx, cy] = key.split(',').map(Number);
                    this.loadedChunks.add(key);
                    this.hydrateChunk(cx, cy, base64);
                });
                window.__PRELOADED_CHUNKS__ = null; // Clean up memory
            }
            this.updateVisibleChunks();
        } else if (canvasData.state_base64) {
            this.hydrateCanvasState(canvasData.state_base64, null, canvasData.layers_data || null);
        }

        try {
            const totalMs = Math.round(performance.now() - (window.__CANVAS_VIEW_START__ || performance.now()));
            const navMs = (window.performance && window.performance.timing && window.performance.timing.navigationStart)
                ? Math.round(Date.now() - window.performance.timing.navigationStart)
                : totalMs;

        } catch (e) {}
    },

    updateVisibleChunks() {
        if (!this.isProgressive || !this.canvas) return;
        if (!this.loadedChunks) this.loadedChunks = new Set();

        const chunkSize = 512;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || !this.transform || !this.transform.scale) return;

        const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
        const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
        const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
        const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

        const padding = 1;
        const minChunkX = Math.max(0, Math.floor(startX / chunkSize) - padding);
        const minChunkY = Math.max(0, Math.floor(startY / chunkSize) - padding);
        const maxChunkX = Math.min(Math.floor((this.boardWidth - 1) / chunkSize), Math.floor(Math.max(0, endX - 1) / chunkSize) + padding);
        const maxChunkY = Math.min(Math.floor((this.boardHeight - 1) / chunkSize), Math.floor(Math.max(0, endY - 1) / chunkSize) + padding);

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

        // Batch chunk requests to prevent massive payloads and blocking
        const BATCH_SIZE = 8;
        const fetchPromises = [];

        for (let i = 0; i < validKeys.length; i += BATCH_SIZE) {
            const batch = validKeys.slice(i, i + BATCH_SIZE);
            const batchStart = performance.now();
            
            fetchPromises.push((async () => {
                try {
                    const response = await api.fetchBinary('/api/go/canvases/get_chunks', {
                        canvas_id: parseInt(this.canvasIntId, 10),
                        board_w: this.boardWidth,
                        board_h: this.boardHeight,
                        chunks: batch
                    });

                    if (!response.ok) {
                        console.error(`[Rosaura App] fetchChunks -> Failed to fetch chunks batch:`, batch, `Status:`, response.status);
                        batch.forEach(k => this.loadingChunks.delete(k));
                        return;
                    }

                    const contentType = response.headers.get('Content-Type');
                    if (contentType && contentType.includes('application/octet-stream')) {
                        const buffer = await response.arrayBuffer();
                        const dataView = new DataView(buffer);
                        let offset = 0;

                        if (buffer.byteLength >= 2) {
                            const totalChunks = dataView.getUint16(offset, false);
                            offset += 2;

                            for (let idx = 0; idx < totalChunks; idx++) {
                                if (offset >= buffer.byteLength) break;
                                
                                const keyLen = dataView.getUint8(offset);
                                offset += 1;
                                
                                if (offset + keyLen > buffer.byteLength) break;
                                const keyBytes = new Uint8Array(buffer, offset, keyLen);
                                const key = new TextDecoder().decode(keyBytes);
                                offset += keyLen;

                                if (offset + 4 > buffer.byteLength) break;
                                const gzipSize = dataView.getUint32(offset, false);
                                offset += 4;

                                if (offset + gzipSize > buffer.byteLength) break;
                                const gzipBytes = new Uint8Array(buffer, offset, gzipSize).slice();
                                offset += gzipSize;

                                const [cx, cy] = key.split(',').map(Number);
                                this.loadedChunks.add(key);
                                this.loadingChunks.delete(key);
                                
                                // Hydrate this chunk
                                this.hydrateChunk(cx, cy, gzipBytes);
                            }
                        }

                        // Clean up any batch items that weren't returned
                        batch.forEach(k => {
                            if (!this.loadedChunks.has(k)) {
                                this.loadingChunks.delete(k);
                            }
                        });
                    } else {
                        // Fallback to JSON if backend returned JSON
                        const result = await response.json();
                        if (result && result.success && result.data?.chunks) {
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
                    }
                } catch (e) {
                    batch.forEach(k => this.loadingChunks.delete(k));
                }
            })());
        }

        await Promise.all(fetchPromises);
    },

    async hydrateChunk(chunkX, chunkY, chunkData) {
        if (!chunkData) return;
        if (this.renderWorker) {
            const isBinary = chunkData instanceof Uint8Array || chunkData instanceof ArrayBuffer;
            const transfer = isBinary ? [chunkData instanceof ArrayBuffer ? chunkData : chunkData.buffer] : [];
            
            this.renderWorker.postMessage({
                type: 'HYDRATE_CHUNK',
                payload: { 
                    chunkX, 
                    chunkY, 
                    chunkSize: 512, 
                    base64String: isBinary ? null : chunkData,
                    chunkData: isBinary ? chunkData : null
                }
            }, transfer);
            return;
        }

        try {
            const bytes = await this.decompressIfNeeded(chunkData);
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
        if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
        
        if (this.canvas && typeof this.canvas.transferControlToOffscreen === 'function' && typeof Worker !== 'undefined') {
            try {
                if (!this.renderWorker) {
                    const workerVersion = window.__ASSETS_VERSION__ || '2.1.' + Date.now();
                    const workerPath = `${this.basePath}/assets/js/modules/app/design/workers/CanvasRenderWorker.js?v=${workerVersion}`;
                    this.renderWorker = new Worker(workerPath);
                    
                    this.renderWorker.addEventListener('message', (e) => {
                        if (e.data?.type === 'HISTORY_CHANGED') {
                            const act = e.data.payload?.action;
                            if (act === 'undo' || act === 'redo') {
                                if (typeof this.saveOfflineCanvasState === 'function') {
                                    this.saveOfflineCanvasState(false);
                                }
                                if (typeof this.requestRender === 'function') {
                                    this.requestRender();
                                }
                            }
                        }
                        if (e.data?.type === 'PIXEL_COLOR_PICKED') {
                            const hex = e.data.payload?.hex;
                            if (hex && typeof this.selectAndAddCustomColor === 'function') {
                                this.selectAndAddCustomColor(hex);
                                if (this.interactionMode === 'offline_eyedropper' && typeof this.toggleEyedropper === 'function') {
                                    this.toggleEyedropper();
                                }
                            }
                        }
                        if (e.data?.type === 'LAYERS_STATE_CHANGED') {
                            if (typeof this.handleLayersStateChanged === 'function') {
                                this.handleLayersStateChanged(e.data.payload);
                            }
                            if (this.isOfflineMode && typeof this.saveOfflineCanvasState === 'function') {
                                this.saveOfflineCanvasState(false);
                            }
                        }
                        if (e.data?.type === 'FRAMES_STATE_CHANGED') {
                            if (typeof this.handleFramesStateChanged === 'function') {
                                this.handleFramesStateChanged(e.data.payload);
                            }
                            if (this.isOfflineMode && typeof this.saveOfflineCanvasState === 'function') {
                                this.saveOfflineCanvasState(false);
                            }
                        }
                        if (e.data?.type === 'LAYER_PREVIEW_UPDATED') {
                            if (typeof this.handleLayerPreviewUpdated === 'function') {
                                this.handleLayerPreviewUpdated(e.data.payload);
                            }
                        }
                        if (e.data?.type === 'FRAME_CARD_PREVIEW_UPDATED') {
                            if (typeof this.handleFrameCardPreviewUpdated === 'function') {
                                this.handleFrameCardPreviewUpdated(e.data.payload);
                            }
                        }
                        if (e.data?.type === 'ANIMATION_FRAME_TICK') {
                            if (typeof this.handleAnimationFrameTick === 'function') {
                                this.handleAnimationFrameTick(e.data.payload);
                            }
                        }
                        if (e.data?.type === 'SELECTION_BITMAP_EXTRACTED') {
                            if (typeof this.handleSelectionBitmapExtracted === 'function') {
                                this.handleSelectionBitmapExtracted(e.data.payload);
                            }
                        }
                        if (e.data?.type === 'SHOW_NOTICE') {
                            const msgKey = e.data.payload?.messageKey;
                            const level = e.data.payload?.level || 'info';
                            if (msgKey && typeof showMessage === 'function') {
                                showMessage(window.__(msgKey) || msgKey, level);
                            }
                        }
                    });

                    const offscreen = this.canvas.transferControlToOffscreen();
                    const dpr = window.devicePixelRatio || 1;
                    
                    this.renderWorker.postMessage({
                        type: 'INIT_CANVAS',
                        payload: {
                            canvas: offscreen,
                            boardWidth: this.boardWidth,
                            boardHeight: this.boardHeight,
                            dpr: dpr,
                            isProgressive: this.isProgressive,
                            isOfflineMode: !!this.isOfflineMode
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
        this._cachedTopBarRect = null;
        this._cachedCanvasRect = null;
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
        let rectW = rect.width;
        let rectH = rect.height;

        if (rectW <= 0 || rectH <= 0) {
            const parent = this.canvas.parentElement;
            if (parent) {
                const pRect = parent.getBoundingClientRect();
                rectW = pRect.width > 0 ? pRect.width : (window.innerWidth || 800);
                rectH = pRect.height > 0 ? pRect.height : (window.innerHeight - 120 || 600);
            } else {
                rectW = window.innerWidth || 800;
                rectH = window.innerHeight - 120 || 600;
            }
        }

        const scaleX = rectW / this.boardWidth;
        const scaleY = rectH / this.boardHeight;

        this.transform.scale = Math.min(scaleX, scaleY) * 0.9;
        
        this.transform.x = (rectW - (this.boardWidth * this.transform.scale)) / 2;
        this.transform.y = (rectH - (this.boardHeight * this.transform.scale)) / 2;

        if (typeof this.updateZoomUI === 'function') {
            this.updateZoomUI();
        }
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
    },

    setupHorizontalToolsScroll() {
        const toolbar = document.querySelector('[data-ref="offline-tools-horizontal"]');
        const btnLeft = document.querySelector('[data-action="scrollToolsLeft"]');
        const btnRight = document.querySelector('[data-action="scrollToolsRight"]');
        if (!toolbar) return;

        const updateScrollButtons = () => {
            const hasOverflow = toolbar.scrollWidth > (toolbar.clientWidth + 2);
            if (!hasOverflow) {
                if (btnLeft) btnLeft.classList.add('disabled');
                if (btnRight) btnRight.classList.add('disabled');
                return;
            }
            const isStart = toolbar.scrollLeft <= 2;
            const isEnd = toolbar.scrollLeft + toolbar.clientWidth >= toolbar.scrollWidth - 2;
            if (btnLeft) btnLeft.classList.toggle('disabled', isStart);
            if (btnRight) btnRight.classList.toggle('disabled', isEnd);
        };

        toolbar.addEventListener('scroll', updateScrollButtons, { passive: true });
        window.addEventListener('resize', updateScrollButtons, { passive: true });
        setTimeout(updateScrollButtons, 100);
    }
};