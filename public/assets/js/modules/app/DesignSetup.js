// public/assets/js/modules/app/DesignSetup.js
import { getPaletteById } from './DesignPaletteUtils.js';
import { showMessage } from '../../core/utils/uiUtils.js';

export const DesignSetup = {
    loadCanvasConfigForSnapshot() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        if (wrapper) {
            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                this.boardWidth = parseInt(sizeStr, 10);
                this.boardHeight = parseInt(sizeStr, 10);
            }
        }
        this.setupCanvas();
        this.centerBoard();
        this.blockToolsForSnapshot();
        this.drawImageOnCanvas(this.snapshotImg);
    },

    blockToolsForSnapshot() {
        this.isSpectator = true;
        this.isResetLocked = true; 
        
        if (this.btnPlacePixels) this.btnPlacePixels.style.display = 'none';
        if (this.btnColorPalette) this.btnColorPalette.style.display = 'none';
    },

    drawImageOnCanvas(url) {
        const img = new Image();
        img.onload = () => {
            this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
            this.offscreenCtx.drawImage(img, 0, 0, this.boardWidth, this.boardHeight);
            this.requestRender();
        };
        img.onerror = () => {
            showMessage('El archivo de imagen histórico no está disponible.', 'error');
        };
        img.src = url;
    },

    loadCanvasConfig() {
        const wrapper = document.querySelector('[data-ref="design-wrapper"]');
        
        if (wrapper) {
            this.canvasIntId = wrapper.getAttribute('data-canvas-id');
            this.canvasPrivacy = wrapper.getAttribute('data-privacy') || 'private';
            this.canvasApproval = wrapper.getAttribute('data-approval') === '1';

            this.resetActive = wrapper.getAttribute('data-reset-active') === '1';
            this.nextResetAt = wrapper.getAttribute('data-reset-at');
            this.timerAction = wrapper.getAttribute('data-timer-action') || 'restart';

            // Nuevas variables para el resize
            this.resizeActive = wrapper.getAttribute('data-resize-active') === '1';
            this.nextResizeAt = wrapper.getAttribute('data-resize-at');
            this.resizeTargetSize = wrapper.getAttribute('data-resize-target') || '64';
            this.resizeTimerAction = wrapper.getAttribute('data-resize-timer-action') || 'restart';

            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
                this.boardWidth = parseInt(sizeStr, 10);
                this.boardHeight = parseInt(sizeStr, 10);
            }
            
            this.canvasPaletteId = wrapper.getAttribute('data-palette') || 'default';
            
            this.setupCanvas();
            this.centerBoard();
            this.renderColorPalette(this.canvasPaletteId);

            if (this.resetActive && this.nextResetAt) {
                this.startResetTimer();
            }

            // Iniciar timer de expansión si está activo
            if (this.resizeActive && this.nextResizeAt) {
                this.startResizeTimer();
            }

            this.initWebSocket();
        } else {
            this.setupCanvas();
            this.centerBoard();
            this.renderColorPalette('default');
        }
    },

    startResetTimer() {
        if (this.resetTimerInterval) clearInterval(this.resetTimerInterval);
        
        const badge = document.querySelector('[data-ref="reset-timer-badge"]');
        const text = document.querySelector('[data-ref="reset-timer-text"]');
        if (!badge || !text) return;
        
        if (this.timerAction === 'none') {
            badge.classList.add('disabled');
            return;
        }
        
        badge.classList.remove('disabled');
        
        const targetMs = new Date(this.nextResetAt.replace(' ', 'T') + 'Z').getTime();
        
        const updateTimer = () => {
            const nowMs = Date.now();
            const diffMs = targetMs - nowMs;
            
            if (diffMs <= 0) {
                text.textContent = '00:00:00';
                badge.classList.remove('danger');
                if (this.timerAction === 'stop') {
                    clearInterval(this.resetTimerInterval);
                }
                return;
            }
            
            const totalSecs = Math.floor(diffMs / 1000);
            const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSecs % 60).padStart(2, '0');
            
            text.textContent = `${hours}:${mins}:${secs}`;
            
            if (totalSecs <= 60) {
                badge.classList.add('danger');
            } else {
                badge.classList.remove('danger');
            }
        };
        
        updateTimer();
        this.resetTimerInterval = setInterval(updateTimer, 1000);
    },

    startResizeTimer() {
        if (this.resizeTimerInterval) clearInterval(this.resizeTimerInterval);
        
        const badge = document.querySelector('[data-ref="resize-timer-badge"]');
        const text = document.querySelector('[data-ref="resize-timer-text"]');
        if (!badge || !text) return;
        
        if (this.resizeTimerAction === 'none') {
            badge.classList.add('disabled');
            return;
        }
        
        badge.classList.remove('disabled');
        
        const targetMs = new Date(this.nextResizeAt.replace(' ', 'T') + 'Z').getTime();
        
        const updateTimer = () => {
            const nowMs = Date.now();
            const diffMs = targetMs - nowMs;
            
            if (diffMs <= 0) {
                text.textContent = 'Expandiendo...';
                if (this.resizeTimerAction === 'stop') {
                    clearInterval(this.resizeTimerInterval);
                    setTimeout(() => badge.classList.add('disabled'), 5000);
                }
                return;
            }
            
            const totalSecs = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSecs / 86400);
            const hours = String(Math.floor((totalSecs % 86400) / 3600)).padStart(2, '0');
            const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
            const secs = String(totalSecs % 60).padStart(2, '0');
            
            if (days > 0) {
                text.textContent = `${days}d ${hours}:${mins}:${secs}`;
            } else {
                text.textContent = `${hours}:${mins}:${secs}`;
            }
        };
        
        updateTimer();
        this.resizeTimerInterval = setInterval(updateTimer, 1000);
    },

    hydrateCanvasState(base64String) {
        try {
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const imageData = this.offscreenCtx.createImageData(this.boardWidth, this.boardHeight);
            const paletteColors = getPaletteById(this.canvasPaletteId).colors;
            
            for (let i = 0; i < bytes.length; i++) {
                const colorIndex = bytes[i];
                const dataIdx = i * 4;

                if (colorIndex === 255) {
                    imageData.data[dataIdx] = 0;     
                    imageData.data[dataIdx + 1] = 0; 
                    imageData.data[dataIdx + 2] = 0; 
                    imageData.data[dataIdx + 3] = 0; 
                } else {
                    const hex = paletteColors[colorIndex] || '#FFFFFF'; 
                    
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    
                    imageData.data[dataIdx] = r;
                    imageData.data[dataIdx + 1] = g;
                    imageData.data[dataIdx + 2] = b;
                    imageData.data[dataIdx + 3] = 255; 
                }
            }
            
            this.offscreenCtx.putImageData(imageData, 0, 0);
            this.requestRender();

        } catch (e) {
            console.error("Error hidratando el canvas base64", e);
        }
    },

    setupCanvas() {
        this.updateCanvasDimensions();

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.boardWidth;
        this.offscreenCanvas.height = this.boardHeight;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
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