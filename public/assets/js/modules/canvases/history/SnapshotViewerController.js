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
        this.showGrid = true;
        this.originalImageUrl = null;
        this.isInfinite = false;

        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.renderBound = this.render.bind(this);
    }

    async init() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.isInfinite = false;

        const wrapper = document.querySelector('[data-ref="snapshot-wrapper"]');
        if (wrapper) {
            this.snapshotId = wrapper.getAttribute('data-snapshot-id');
            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr && sizeStr.toLowerCase() !== 'infinite') {
                const parts = sizeStr.toLowerCase().split('x');
                this.boardWidth = parseInt(parts[0], 10);
                this.boardHeight = parts.length > 1 ? parseInt(parts[1], 10) : this.boardWidth;
            }
        }
        
        if (!this.snapshotId || this.snapshotId === '') {
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
        }

        this.bindEvents();
        await this.loadSnapshotData();
    }

    destroy() {
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMouseMoveBound);
        }
        window.removeEventListener('mouseup', this.handleMouseUpBound);
        window.removeEventListener('resize', this.handleResizeBound);

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }

    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        if (this.canvas) {
            this.canvas.addEventListener('mousemove', this.handleMouseMoveBound);
        }
        window.addEventListener('mouseup', this.handleMouseUpBound);
        window.addEventListener('resize', this.handleResizeBound);

        this.bindActionTools();
    }

    bindActionTools() {
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

        const btnDownload = document.getElementById('tl-btn-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                this.downloadSnapshot();
            });
        }
    }

    downloadSnapshot() {
        if (!this.offscreenCanvas || this.boardWidth <= 0 || this.boardHeight <= 0) {
            this.fallbackDownload();
            return;
        }

        const btnDownload = document.getElementById('tl-btn-download');
        if (btnDownload) btnDownload.classList.add('disabled-interactive');

        try {
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = this.boardWidth;
            exportCanvas.height = this.boardHeight;
            const expCtx = exportCanvas.getContext('2d');

            expCtx.fillStyle = '#FFFFFF';
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            expCtx.imageSmoothingEnabled = false;
            expCtx.drawImage(this.offscreenCanvas, 0, 0);

            exportCanvas.toBlob((blob) => {
                if (btnDownload) btnDownload.classList.remove('disabled-interactive');
                if (!blob) {
                    this.fallbackDownload();
                    return;
                }
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `snapshot_${this.snapshotId || 'rosaura'}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }, 'image/png');
        } catch (e) {
            if (btnDownload) btnDownload.classList.remove('disabled-interactive');
            this.fallbackDownload();
        }
    }

    async fallbackDownload() {
        if (!this.originalImageUrl) return;
        try {
            const response = await fetch(this.originalImageUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `snapshot_${this.snapshotId || 'rosaura'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (e) {
            const a = document.createElement('a');
            a.href = this.originalImageUrl;
            a.target = '_blank';
            a.download = `snapshot_${this.snapshotId || 'rosaura'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    async loadSnapshotData() {
        try {
            const endpoint = ApiRoutes.Canvases?.GetSnapshotDetail || 'canvases.get_snapshot_detail';
            const response = await this.api.post(endpoint, { id: this.snapshotId });
            
            if (response && response.success && response.data) {
                this.isDataLoaded = true;
                this.boardWidth = parseInt(response.data.width, 10);
                this.boardHeight = parseInt(response.data.height, 10);
                if (isNaN(this.boardWidth) || this.boardWidth <= 0) this.boardWidth = 2000;
                if (isNaN(this.boardHeight) || this.boardHeight <= 0) this.boardHeight = 1000;
                this.originalImageUrl = response.data.image_url;

                this.setupCanvas();
                this.centerBoard();
                if (this.originalImageUrl) {
                    this.drawImageOnCanvas(this.originalImageUrl);
                }
            } else {
                if (response && response.message) {
                    showMessage(response.message, 'error');
                }
                this.setupCanvas();
                this.centerBoard();
            }
        } catch (error) {
            showMessage(window.__ ? window.__('err_connection') : 'Connection error', 'error');
            this.setupCanvas();
            this.centerBoard();
        }
    }

    setupCanvas() {
        this.updateCanvasDimensions();
        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas');
        }
        this.offscreenCanvas.width = this.boardWidth;
        this.offscreenCanvas.height = this.boardHeight;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }

    drawImageOnCanvas(url) {
        if (!url) return;
        const img = new Image();
        img.onload = () => {
            if (this.offscreenCtx) {
                this.offscreenCtx.imageSmoothingEnabled = false; 
                this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
                this.offscreenCtx.drawImage(img, 0, 0, this.boardWidth, this.boardHeight);
                this.requestRender();
            }
        };
        img.onerror = () => {
            console.error('[SnapshotViewer] Failed to load image from URL:', url);
        };
        img.src = url;
    }

    updateCanvasDimensions() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
        
        const rectW = rect.width > 0 ? rect.width : (window.innerWidth || 800);
        const rectH = rect.height > 0 ? rect.height : (window.innerHeight - 120 || 600);

        const dpr = window.devicePixelRatio || 1;
        const newWidth = rectW * dpr;
        const newHeight = rectH * dpr;
        
        if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.canvas.style.width = `${rectW}px`;
            this.canvas.style.height = `${rectH}px`;
        }
    }

    centerBoard() {
        if (!this.canvas) return;
        
        let rect = this.canvas.getBoundingClientRect();
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
        
        if (this.isInfinite) {
            this.transform.scale = 4;
            this.transform.x = rectW / 2;
            this.transform.y = rectH / 2;
            return;
        }

        const scaleX = rectW / (this.boardWidth || 32);
        const scaleY = rectH / (this.boardHeight || 32);
        this.transform.scale = Math.min(scaleX, scaleY) * 0.9; 
        
        this.transform.x = (rectW - (this.boardWidth * this.transform.scale)) / 2;
        this.transform.y = (rectH - (this.boardHeight * this.transform.scale)) / 2;
    }

    limitBounds() {
        if (!this.canvas) return;
        if (this.isInfinite) return;
        
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
        let scaleFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
        
        const newScale = Math.min(Math.max(0.1, this.transform.scale * scaleFactor), 50);
        
        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.limitBounds();
        this.requestRender();
    }

    handleMouseDown(e) {
        const target = e.target.closest('[data-ref="snapshot-canvas"]');
        if (!target) return;
        
        if (e.button === 0 || e.button === 1 || e.button === 2) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('component-cursor-grabbing');
        }
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

        if (this.isInfinite) {
            return { x: boardX, y: boardY };
        }
        
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
        this.centerBoard();
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
        const bgColor = this.isInfinite ? '#FFFFFF' : (isDark ? '#0e0e11' : '#f5f5fa'); 
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
        
        if (!this.isInfinite) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        }

        if (this.offscreenCanvas) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        if (this.transform.scale > 4 && this.showGrid) {
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeStyle = gridColor; 
            this.ctx.beginPath();
            
            const rect = this.canvas.getBoundingClientRect();
            
            const startX = this.isInfinite ? Math.floor(-this.transform.x / this.transform.scale) : Math.max(0, Math.floor(-this.transform.x / this.transform.scale));
            const startY = this.isInfinite ? Math.floor(-this.transform.y / this.transform.scale) : Math.max(0, Math.floor(-this.transform.y / this.transform.scale));
            const endX = this.isInfinite ? Math.ceil((rect.width - this.transform.x) / this.transform.scale) : Math.min(this.boardWidth, Math.ceil((rect.width - this.transform.x) / this.transform.scale));
            const endY = this.isInfinite ? Math.ceil((rect.height - this.transform.y) / this.transform.scale) : Math.min(this.boardHeight, Math.ceil((rect.height - this.transform.y) / this.transform.scale));

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