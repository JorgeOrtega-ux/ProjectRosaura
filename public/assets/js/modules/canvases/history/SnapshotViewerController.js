import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage } from '../../../core/utils/uiUtils.js';

class SnapshotViewerController {
    constructor() {
        this.api = new ApiService();
        this.snapshotId = null;

        this.canvas = null;
        this.ctx = null;
        this.boardWidth = 2000;
        this.boardHeight = 1000;
        
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredPixel = null;
        
        this.coordsText = null;

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        this.needsRender = false;
        this.animationFrameId = null;
        this.isDataLoaded = false;
        
        this.playbackSpeed = 1;
        this.pixelAccumulator = 0;
        this.showGrid = true;

        this.hasTimelapse = false;
        this.timelapseData = null;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.paletteColors = [];
        this.playAnimationFrameId = null;
        this.originalImageUrl = null;

        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.renderBound = this.render.bind(this);
    }

    async init() {
        const wrapper = document.querySelector('[data-ref="snapshot-wrapper"]');
        if (wrapper) {
            this.snapshotId = wrapper.getAttribute('data-snapshot-id');
            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                const parts = sizeStr.toLowerCase().split('x');
                this.boardWidth = parseInt(parts[0], 10);
                this.boardHeight = parts.length > 1 ? parseInt(parts[1], 10) : this.boardWidth;
            }
        } else {
            const parts = window.location.pathname.split('/');
            this.snapshotId = parts[parts.length - 1]; 
        }

        this.canvas = document.querySelector('[data-ref="snapshot-canvas"]');
        this.coordsText = document.querySelector('[data-ref="coords-text"]');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.canvas.classList.add('component-pixelated');
            this.canvas.classList.add('component-canvas-transition');
            
            this.setupCanvas();
            this.updateCanvasDimensions();
            this.centerBoard(); 
            this.isDataLoaded = true;
            this.requestRender();
            console.log('[SnapshotViewer] Canvas initialized, dimensions:', this.canvas.width, this.canvas.height);
        }

        this.bindEvents();
        await this.loadSnapshotData();
    }

    destroy() {
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        window.removeEventListener('resize', this.handleResizeBound);

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.playAnimationFrameId) cancelAnimationFrame(this.playAnimationFrameId);
    }

    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        this.canvas.addEventListener('mousemove', this.handleMouseMoveBound);
        window.addEventListener('mouseup', this.handleMouseUpBound);
        window.addEventListener('resize', this.handleResizeBound);

        this.bindTimelapseTools();
    }

    bindTimelapseTools() {
        const speedBtns = document.querySelectorAll('[data-action="adjustTimelapseSpeed"]');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stepAction = btn.getAttribute('data-step');
                
                if (stepAction === 'up') {
                    if (this.playbackSpeed < 1) this.playbackSpeed = parseFloat((this.playbackSpeed + 0.2).toFixed(1));
                    else this.playbackSpeed += 1;
                } else if (stepAction === 'down') {
                    if (this.playbackSpeed <= 1 && this.playbackSpeed > 0.2) this.playbackSpeed = parseFloat((this.playbackSpeed - 0.2).toFixed(1));
                    else if (this.playbackSpeed > 1) this.playbackSpeed -= 1;
                } else if (stepAction === 'fast_up') {
                    if (this.playbackSpeed < 1) this.playbackSpeed = 1;
                    this.playbackSpeed += 50;
                } else if (stepAction === 'fast_down') {
                    if (this.playbackSpeed > 50) this.playbackSpeed -= 50;
                    else this.playbackSpeed = 1;
                }
                
                this.playbackSpeed = Math.max(0.2, Math.min(10000, this.playbackSpeed));

                const valDisplay = document.querySelector('[data-ref="val_timelapse_speed"]');
                if (valDisplay) valDisplay.textContent = this.playbackSpeed + 'x';
            });
        });

        const btnPlayPause = document.querySelector('[data-action="toggleTimelapsePlayPause"]');
        if (btnPlayPause) {
            btnPlayPause.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
            btnPlayPause.addEventListener('click', async () => {
                
                if (!this.timelapseData) {
                    btnPlayPause.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Loading...';
                    console.time('fetchTimelapseData');
                    console.log('[SnapshotViewer] Starting fetchTimelapseData at', performance.now());
                    const ok = await this.fetchTimelapseData();
                    console.log('[SnapshotViewer] Finished fetchTimelapseData at', performance.now());
                    console.timeEnd('fetchTimelapseData');
                    if (!ok) {
                        btnPlayPause.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
                        return;
                    }
                }

                if (this.playAnimationFrameId) {
                    this.pauseTimelapse();
                    btnPlayPause.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
                } else {
                    if (this.currentFrame === 0 || (this.timelapseData && this.currentFrame >= this.timelapseData.length)) {
                        this.currentFrame = 0;
                        this.resetCanvasToBlank();
                    }
                    this.resumeTimelapse();
                    btnPlayPause.innerHTML = '<span class="material-symbols-rounded">pause</span> Pause';
                }
            });
        }

        const btnRestart = document.querySelector('[data-action="restartTimelapse"]');
        if (btnRestart) {
            btnRestart.addEventListener('click', async () => {
                this.pauseTimelapse();
                this.currentFrame = 0;
                this.resetCanvasToBlank();
                
                const bp = document.querySelector('[data-action="toggleTimelapsePlayPause"]');
                if (bp) bp.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
            });
        }
    }

    pauseTimelapse() {
        if (this.playAnimationFrameId) {
            cancelAnimationFrame(this.playAnimationFrameId);
            this.playAnimationFrameId = null;
        }
    }

    resumeTimelapse() {
        if (!this.playAnimationFrameId) {
            this.playLoop();
        }
    }

    async loadSnapshotData() {
        try {
            const endpoint = ApiRoutes.Canvases?.GetSnapshotDetail || 'canvases.get_snapshot_detail';
            const response = await this.api.post(endpoint, { id: this.snapshotId });
            
            if (response.success && response.data) {
                this.isDataLoaded = true;
                this.boardWidth = parseInt(response.data.width, 10) || 2000;
                this.boardHeight = parseInt(response.data.height, 10) || 1000;
                this.originalImageUrl = response.data.image_url;
                
                this.hasTimelapse = response.data.has_timelapse || false;
                
                await this.loadPalette(response.data.palette_id || 'default');

                this.setupCanvas();
                this.centerBoard();
                this.drawImageOnCanvas(this.originalImageUrl);

                if (this.hasTimelapse) {
                    this.initTimelapseUI();
                }
            } else {
                showMessage(response.message || __('err_load_snapshot'), 'error');
                this.setupCanvas();
                this.centerBoard();
            }
        } catch (error) {
            showMessage(__('err_connection'), 'error');
            this.setupCanvas();
            this.centerBoard();
        }
    }

    async loadPalette(paletteId) {
        try {
            let basePath = window.AppBasePath || '';
            const res = await fetch(`${basePath}/public/assets/data/palettes.json`);
            if (res.ok) {
                const data = await res.json();
                this.paletteColors = data[paletteId]?.colors || data['default']?.colors || [];
            } else {
                console.warn('[SnapshotViewer] Failed to load palette.json', res.status);
            }
        } catch(e) {
            console.error('[SnapshotViewer] Error loading palette:', e);
        }
    }

    initTimelapseUI() {
        const btnPlay = document.getElementById('tl-btn-play');
        if (!btnPlay) return;
        
        btnPlay.classList.remove('disabled'); btnPlay.classList.add('active'); 

        const btnToggleGrid = document.getElementById('tl-btn-toggle-grid');
        if (btnToggleGrid) {
            btnToggleGrid.addEventListener('click', () => {
                this.showGrid = !this.showGrid;
                if (this.showGrid) {
                    btnToggleGrid.classList.add('active');
                } else {
                    btnToggleGrid.classList.remove('active');
                }
                this.requestRender();
            });
        }
    }

    async fetchTimelapseData() {
        try {
            const endpoint = ApiRoutes.Canvases?.GetSnapshotTimelapse || 'canvases.get_snapshot_timelapse';
            const response = await this.api.downloadText(endpoint, { id: this.snapshotId });

            if (!response.success) {
                showMessage(response.message || __('err_download_timelapse'), "error");
                return false;
            }

            const text = response.data;
            this.timelapseData = text.trim().split('\n');

            return true;
        } catch(e) {
            showMessage(__('err_load_timelapse'), "error");
            return false;
        }
    }

    resetCanvasToBlank() {
        this.offscreenCtx.fillStyle = '#FFFFFF';
        this.offscreenCtx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
        this.updateStatsBadge();
    }

    updateStatsBadge() {
        const badge = document.getElementById('tl-stats-badge');
        const textEl = document.getElementById('tl-stats-text');
        
        if (!badge || !textEl || !this.timelapseData) {
            if (badge) badge.style.opacity = '0';
            return;
        }

        if (this.currentFrame === 0) {
            badge.style.opacity = '0';
        } else {
            badge.style.opacity = '1';
            const total = this.timelapseData.length;
            const pct = Math.round((this.currentFrame / total) * 100);
            
            // If JSON has timestamps (e.g. `t`), we could calculate elapsed time here.
            // For now, we show Pixels / Total and Percentage.
            textEl.textContent = `${this.currentFrame.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
        }
    }

    playLoop() {
        try {
            if (!this.timelapseData || this.currentFrame >= this.timelapseData.length) {
                this.playAnimationFrameId = null;
                
                const btnPlayPause = document.querySelector('[data-action="toggleTimelapsePlayPause"]');
                if (btnPlayPause) btnPlayPause.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
                
                if (this.timelapseData && this.currentFrame >= this.timelapseData.length) {
                    this.currentFrame = 0;
                }

                return;
            }

            this.pixelAccumulator += this.playbackSpeed;
            const pixelsToDraw = Math.floor(this.pixelAccumulator);
            this.pixelAccumulator -= pixelsToDraw;

            for (let i = 0; i < pixelsToDraw; i++) {
                if (this.currentFrame >= this.timelapseData.length) break;
                
                const rawLine = this.timelapseData[this.currentFrame];
                if (rawLine) {
                    try {
                        const frame = JSON.parse(rawLine);
                        this.drawSinglePixel(frame);
                    } catch(e) {}
                }
                this.currentFrame++;
            }
            
            this.updateStatsBadge();
            this.requestRender();

            this.playAnimationFrameId = requestAnimationFrame(() => this.playLoop());
        } catch (e) {
            console.error('[SnapshotViewer] Error in playLoop:', e);
            this.playAnimationFrameId = null;
            const btnPlayPause = document.querySelector('[data-action="toggleTimelapsePlayPause"]');
            if (btnPlayPause) btnPlayPause.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Play';
        }
    }

    drawSinglePixel(pixel) {
        if (!pixel) return;
        
        const colorIndex = parseInt(pixel.c, 10);
        let colorHex = '#FFFFFF';
        
        if (colorIndex !== 255 && this.paletteColors[colorIndex]) {
            colorHex = this.paletteColors[colorIndex].hex || this.paletteColors[colorIndex];
        }

        if (this.currentFrame < 5 || this.currentFrame % 500 === 0) {
            console.log(`[SnapshotViewer] drawSinglePixel frame=${this.currentFrame} x=${pixel.x} y=${pixel.y} c=${pixel.c} mappedHex=${colorHex}`);
        }

        this.offscreenCtx.fillStyle = colorHex;
        this.offscreenCtx.fillRect(parseInt(pixel.x, 10), parseInt(pixel.y, 10), 1, 1);
    }

    setupCanvas() {
        this.updateCanvasDimensions();
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.boardWidth;
        this.offscreenCanvas.height = this.boardHeight;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }

    drawImageOnCanvas(url) {
        const img = new Image();
        img.onload = () => {
            this.offscreenCtx.imageSmoothingEnabled = false; 
            this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
            this.offscreenCtx.drawImage(img, 0, 0, this.boardWidth, this.boardHeight);
            this.requestRender();
        };
        img.onerror = () => {
            showMessage(__('err_snapshot_image_unavailable'), 'error');
        };
        img.src = url;
    }

    updateCanvasDimensions() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        const newWidth = rect.width * dpr;
        const newHeight = rect.height * dpr;
        
        if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.canvas.style.width = `${rect.width}px`;
            this.canvas.style.height = `${rect.height}px`;
        }
    }

    centerBoard() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.boardWidth;
        const scaleY = rect.height / this.boardHeight;
        this.transform.scale = Math.min(scaleX, scaleY) * 0.9; 
        
        this.transform.x = (rect.width - (this.boardWidth * this.transform.scale)) / 2;
        this.transform.y = (rect.height - (this.boardHeight * this.transform.scale)) / 2;
    }

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

    handleWheel(e) {
        const target = e.target.closest('[data-ref="snapshot-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(delta * zoomIntensity);

        let newScale = this.transform.scale * zoomFactor;
        newScale = Math.max(0.05, Math.min(newScale, 40)); 

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.limitBounds();
        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    }

    handleMouseDown(e) {
        const target = e.target.closest('[data-ref="snapshot-canvas"]');
        if (!target) return;

        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.canvas.classList.add('component-cursor-grabbing');
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            
            this.limitBounds();
            this.calculateHoverPixel(e.clientX, e.clientY);
            this.requestRender();
            return;
        }

        const target = e.target.closest('[data-ref="snapshot-canvas"]');
        if (target) {
            this.canvas.classList.add('component-cursor-grab');
            this.calculateHoverPixel(e.clientX, e.clientY);
        } else if (this.hoveredPixel !== null) {
            this.hoveredPixel = null;
            if (this.coordsText) this.coordsText.textContent = '- , -';
            this.requestRender();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('component-cursor-grabbing');
        }
        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    }

    getBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const boardX = Math.floor((mouseX - this.transform.x) / this.transform.scale);
        const boardY = Math.floor((mouseY - this.transform.y) / this.transform.scale);

        if (boardX >= 0 && boardX < this.boardWidth && boardY >= 0 && boardY < this.boardHeight) {
            return { x: boardX, y: boardY };
        }
        return null;
    }

    calculateHoverPixel(clientX, clientY) {
        const newHover = this.getBoardCoords(clientX, clientY);
        const currentHoverStr = this.hoveredPixel ? `${this.hoveredPixel.x},${this.hoveredPixel.y}` : 'null';
        const newHoverStr = newHover ? `${newHover.x},${newHover.y}` : 'null';

        if (currentHoverStr !== newHoverStr) {
            this.hoveredPixel = newHover;
            this.requestRender();
        }

        if (this.coordsText) {
            if (newHover) {
                this.coordsText.textContent = `${newHover.x} , ${newHover.y}`;
            } else {
                this.coordsText.textContent = '- , -';
            }
        }
    }

    handleResize() {
        this.updateCanvasDimensions();
        this.limitBounds();
        this.requestRender();
    }

    isDarkMode() {
        const html = document.documentElement;
        const body = document.body;
        return html.classList.contains('dark-theme') || 
               html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               body.classList.contains('dark-theme') || 
               body.classList.contains('dark') || 
               body.getAttribute('data-theme') === 'dark';
    }

    requestRender() {
        if (!this.needsRender) {
            this.needsRender = true;
            this.animationFrameId = requestAnimationFrame(this.renderBound);
        }
    }

    render() {
        this.needsRender = false;
        if (!this.ctx || !this.canvas) return;

        const isDark = this.isDarkMode();
        const bgColor = isDark ? '#0e0e11' : '#f5f5fa'; 
        const gridColor = 'rgba(0, 0, 0, 0.15)'; 

        this.ctx.fillStyle = bgColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isDataLoaded) return;

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(Math.round(this.transform.x), Math.round(this.transform.y));        
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        if (this.offscreenCanvas) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        if (this.transform.scale > 4 && this.showGrid) {
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeStyle = gridColor; 
            this.ctx.beginPath();
            
            const rect = this.canvas.getBoundingClientRect();
            
            const startX = Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
            const startY = Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
            const endX = Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
            const endY = Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

            for (let x = startX; x <= endX; x++) {
                this.ctx.moveTo(x, startY);
                this.ctx.lineTo(x, endY);
            }
            for (let y = startY; y <= endY; y++) {
                this.ctx.moveTo(startX, y);
                this.ctx.lineTo(endX, y);
            }
            this.ctx.stroke();
        }

        if (this.hoveredPixel) {
            this.ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeRect(this.hoveredPixel.x, this.hoveredPixel.y, 1, 1);
        }

        this.ctx.restore();
    }
}

export { SnapshotViewerController };