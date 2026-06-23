// public/assets/js/modules/canvases/SnapshotViewerController.js

import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { ApiService } from '../../core/api/ApiServices.js';
import { showMessage } from '../../core/utils/uiUtils.js';

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

        // --- ESTADO DEL REPRODUCTOR TIMELAPSE ---
        this.hasTimelapse = false;
        this.timelapseData = null;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.playbackSpeed = 5; // Velocidad 5x mantenida por defecto
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
        } else {
            const parts = window.location.pathname.split('/');
            this.snapshotId = parts[parts.length - 1]; 
        }

        this.canvas = document.querySelector('[data-ref="snapshot-canvas"]');
        this.coordsText = document.querySelector('[data-ref="coords-text"]');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.canvas.style.imageRendering = 'pixelated';
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
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        window.addEventListener('resize', this.handleResizeBound);
    }

    async loadSnapshotData() {
        try {
            const endpoint = ApiRoutes.Canvases?.GetSnapshotDetail || 'canvases.get_snapshot_detail';
            const response = await this.api.post(endpoint, { id: this.snapshotId });
            
            if (response.success && response.data) {
                this.boardWidth = parseInt(response.data.width, 10) || 2000;
                this.boardHeight = parseInt(response.data.height, 10) || 1000;
                this.originalImageUrl = response.data.image_url;
                
                this.hasTimelapse = response.data.has_timelapse || false;
                
                // Cargar paleta de colores para decodificar JSONL
                await this.loadPalette(response.data.palette_id || 'default');

                this.setupCanvas();
                this.centerBoard();
                this.drawImageOnCanvas(this.originalImageUrl);

                if (this.hasTimelapse) {
                    this.initTimelapseUI();
                }
            } else {
                showMessage(response.message || 'Error al cargar el snapshot', 'error');
                this.setupCanvas();
                this.centerBoard();
            }
        } catch (error) {
            console.error("Error fetching snapshot data:", error);
            showMessage('Error de conexión', 'error');
            this.setupCanvas();
            this.centerBoard();
        }
    }

    async loadPalette(paletteId) {
        try {
            const res = await fetch('/public/assets/data/palettes.json');
            if (res.ok) {
                const data = await res.json();
                this.paletteColors = data[paletteId]?.colors || data['default']?.colors || [];
            }
        } catch(e) {
            console.error("Error loading palette JSON", e);
        }
    }

    // ==========================================
    // LÓGICA DEL REPRODUCTOR TIMELAPSE
    // ==========================================

    initTimelapseUI() {
        const btnPlay = document.getElementById('tl-btn-play');
        if (!btnPlay) return;
        
        btnPlay.style.display = 'flex'; // Mostramos el botón ya que hay timelapse

        btnPlay.addEventListener('click', async () => {
            // Si es la primera vez que damos play, descargamos el archivo JSONL
            if (!this.timelapseData) {
                btnPlay.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span>';
                const loaded = await this.fetchTimelapseData();
                if (!loaded) {
                    btnPlay.innerHTML = '<span class="material-symbols-rounded">play_circle</span>';
                    return;
                }
            }

            this.isPlaying = !this.isPlaying;
            btnPlay.innerHTML = this.isPlaying 
                ? '<span class="material-symbols-rounded">pause_circle</span>'
                : '<span class="material-symbols-rounded">play_circle</span>';

            if (this.isPlaying) {
                // Si estaba al 100%, reiniciar desde cero
                if (this.currentFrame >= this.timelapseData.length) {
                    this.resetCanvasToBlank();
                    this.currentFrame = 0;
                }
                this.playLoop();
            } else {
                if (this.playAnimationFrameId) cancelAnimationFrame(this.playAnimationFrameId);
            }
        });
    }

    async fetchTimelapseData() {
        try {
            const endpoint = ApiRoutes.Canvases?.GetSnapshotTimelapse || 'canvases.get_snapshot_timelapse';
            const response = await this.api.downloadText(endpoint, { id: this.snapshotId });

            if (!response.success) {
                showMessage(response.message || "Error al descargar el archivo de timelapse.", "error");
                return false;
            }

            const text = response.data;
            const lines = text.trim().split('\n');
            
            this.timelapseData = lines.map(line => {
                try { return JSON.parse(line); } catch(e) { return null; }
            }).filter(item => item !== null);

            return true;

        } catch(e) {
            console.error(e);
            showMessage("Error cargando el archivo de Timelapse", "error");
            return false;
        }
    }

    resetCanvasToBlank() {
        // Lienzo totalmente blanco puro
        this.offscreenCtx.fillStyle = '#FFFFFF';
        this.offscreenCtx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
    }

    playLoop() {
        if (!this.isPlaying) return;

        let pixelsToDraw = this.playbackSpeed;
        
        while (pixelsToDraw > 0 && this.currentFrame < this.timelapseData.length) {
            const pixel = this.timelapseData[this.currentFrame];
            this.drawSinglePixel(pixel);
            this.currentFrame++;
            pixelsToDraw--;
        }

        this.requestRender(); // Forzamos repintado del canvas principal

        if (this.currentFrame < this.timelapseData.length) {
            this.playAnimationFrameId = requestAnimationFrame(() => this.playLoop());
        } else {
            this.isPlaying = false;
            const btnPlay = document.getElementById('tl-btn-play');
            if (btnPlay) {
                btnPlay.innerHTML = '<span class="material-symbols-rounded">play_circle</span>';
            }
        }
    }

    drawSinglePixel(pixel) {
        if (!pixel) return;
        
        // Interpretar si es borrado (c: 255) o color normal
        const colorIndex = parseInt(pixel.c, 10);
        let colorHex = '#FFFFFF';
        
        if (colorIndex !== 255 && this.paletteColors[colorIndex]) {
            colorHex = this.paletteColors[colorIndex];
        }

        this.offscreenCtx.fillStyle = colorHex;
        this.offscreenCtx.fillRect(parseInt(pixel.x, 10), parseInt(pixel.y, 10), 1, 1);
    }

    // ==========================================
    // RENDERIZADO DEL VISOR PRINCIPAL
    // ==========================================

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
            showMessage('La imagen del snapshot no está disponible.', 'error');
        };
        img.src = url;
    }

    updateCanvasDimensions() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
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
        this.canvas.classList.add('cursor-grabbing');
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
            this.canvas.style.cursor = 'grab';
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
            this.canvas.classList.remove('cursor-grabbing');
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

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(Math.round(this.transform.x), Math.round(this.transform.y));        
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        if (this.transform.scale > 4) {
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

        if (this.offscreenCanvas) {
            this.ctx.drawImage(this.offscreenCanvas, 0, 0);
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