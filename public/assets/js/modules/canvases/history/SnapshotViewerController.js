import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiServices.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';

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

        this.isPinching = false;
        this.initialPinchDistance = 0;
        this.initialScale = 1;

        this.isTimelapseActive = false;
        this.isTimelapsePlaying = false;
        this.timelapseEvents = [];
        this.timelapseTotal = 0;
        this.timelapseCurrentIndex = 0;
        this.timelapseSpeed = 5;
        this.timelapseSelectedModalSpeed = 5;
        this.timelapseAnimId = null;
        this.timelapseLastTimestamp = 0;
        this.savedSnapshotImage = null;
        this.savedBoardDimensions = { width: 2000, height: 1000 };

        this.timelapsePlayerEl = null;
        this.timelapseStatusText = null;
        this.timelapsePulse = null;
        this.timelapsePixelCount = null;
        this.timelapseScrubber = null;
        this.timelapsePlayIcon = null;
        this.timelapseSpeedText = null;

        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.renderBound = this.render.bind(this);

        this.handleTouchStartBound = this.handleTouchStart.bind(this);
        this.handleTouchMoveBound = this.handleTouchMove.bind(this);
        this.handleTouchEndBound = this.handleTouchEnd.bind(this);

        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.handleScrubberInputBound = this.handleScrubberInput.bind(this);
    }

    async init() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.timelapseAnimId) {
            cancelAnimationFrame(this.timelapseAnimId);
            this.timelapseAnimId = null;
        }

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.savedSnapshotImage = null;
        this.timelapseEvents = [];
        this.timelapseTotal = 0;
        this.timelapseCurrentIndex = 0;
        this.isTimelapseActive = false;
        this.isTimelapsePlaying = false;

        const wrapper = document.querySelector('[data-ref="snapshot-wrapper"]');
        if (wrapper) {
            this.snapshotId = wrapper.getAttribute('data-snapshot-id');
            const sizeStr = wrapper.getAttribute('data-size');
            if (sizeStr) {
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
        
        this.timelapsePlayerEl = document.querySelector('[data-ref="timelapse-player"]');
        this.timelapseStatusText = document.querySelector('[data-ref="timelapse-status-text"]');
        this.timelapsePulse = document.querySelector('[data-ref="timelapse-pulse"]');
        this.timelapsePixelCount = document.querySelector('[data-ref="timelapse-pixel-count"]');
        this.timelapseScrubber = document.querySelector('[data-ref="timelapse-scrubber"]');
        this.timelapsePlayIcon = document.querySelector('[data-ref="timelapse-play-icon"]');
        this.timelapseSpeedText = document.querySelector('[data-ref="timelapse-speed-text"]');

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
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        window.removeEventListener('resize', this.handleResizeBound);

        document.removeEventListener('touchstart', this.handleTouchStartBound);
        document.removeEventListener('touchmove', this.handleTouchMoveBound);
        document.removeEventListener('touchend', this.handleTouchEndBound);

        document.removeEventListener('click', this.handleGlobalClickBound);

        if (this.timelapseScrubber) {
            this.timelapseScrubber.removeEventListener('input', this.handleScrubberInputBound);
        }

        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.timelapseAnimId) cancelAnimationFrame(this.timelapseAnimId);
    }

    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        window.addEventListener('resize', this.handleResizeBound);

        document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.handleTouchEndBound);

        document.addEventListener('click', this.handleGlobalClickBound);

        if (this.timelapseScrubber) {
            this.timelapseScrubber.addEventListener('input', this.handleScrubberInputBound);
        }

        this.bindActionTools();
    }

    bindActionTools() {
        const btnToggleGrid = document.querySelector('[data-action="toggleSnapshotGrid"]');
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

        const btnDownload = document.querySelector('[data-action="downloadSnapshotHighRes"]');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                this.downloadSnapshot();
            });
        }
    }

    handleGlobalClick(e) {
        const btnOpenModal = e.target.closest('[data-action="openTimelapseModal"]');
        if (btnOpenModal) {
            this.openTimelapseModal(btnOpenModal);
            return;
        }

        const btnSpeedSelect = e.target.closest('[data-action="selectTimelapseSpeed"]');
        if (btnSpeedSelect) {
            this.handleSpeedSelectionInModal(btnSpeedSelect);
            return;
        }

        const btnConfirmStart = e.target.closest('[data-action="confirmStartTimelapse"]');
        if (btnConfirmStart) {
            this.confirmStartTimelapse();
            return;
        }

        const btnTogglePlay = e.target.closest('[data-action="togglePlayTimelapse"]');
        if (btnTogglePlay) {
            this.togglePlayTimelapse();
            return;
        }

        const btnStepBack = e.target.closest('[data-action="stepBackwardTimelapse"]');
        if (btnStepBack) {
            this.stepBackwardTimelapse();
            return;
        }

        const btnStepForward = e.target.closest('[data-action="stepForwardTimelapse"]');
        if (btnStepForward) {
            this.stepForwardTimelapse();
            return;
        }

        const btnRestart = e.target.closest('[data-action="restartTimelapse"]');
        if (btnRestart) {
            this.restartTimelapse();
            return;
        }

        const btnCloseTimelapse = e.target.closest('[data-action="closeTimelapse"]');
        if (btnCloseTimelapse) {
            this.closeTimelapse();
            return;
        }

        const btnSpeedPill = e.target.closest('[data-action="openTimelapseSpeedMenu"]');
        if (btnSpeedPill) {
            this.cyclePlaybackSpeed();
            return;
        }
    }

    handleScrubberInput(e) {
        if (!this.isTimelapseActive || this.timelapseTotal <= 0) return;
        const percent = parseFloat(e.target.value);
        const targetIndex = Math.min(this.timelapseTotal, Math.max(0, Math.floor((percent / 100) * this.timelapseTotal)));
        this.seekTimelapse(targetIndex);
    }

    async openTimelapseModal(btnTrigger = null) {
        if (this.isTimelapseActive) {
            this.togglePlayTimelapse();
            return;
        }

        this.timelapseSelectedModalSpeed = this.timelapseSpeed;

        if (window.modalSystem) {
            window.modalSystem.show('timelapseSettingsModal', { speed: this.timelapseSpeed });
        } else {
            await this.startTimelapse(this.timelapseSpeed, btnTrigger);
        }
    }

    handleSpeedSelectionInModal(btn) {
        const speedVal = parseFloat(btn.getAttribute('data-speed'));
        if (isNaN(speedVal)) return;

        this.timelapseSelectedModalSpeed = speedVal;

        const container = document.querySelector('[data-ref="timelapse-speeds-container"]');
        if (container) {
            container.querySelectorAll('[data-action="selectTimelapseSpeed"]').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        }
    }

    async confirmStartTimelapse() {
        if (window.modalSystem) {
            window.modalSystem.closeCurrent();
        }

        const btnTrigger = document.querySelector('[data-ref="btn-timelapse-modal"]');
        await this.startTimelapse(this.timelapseSelectedModalSpeed, btnTrigger);
    }

    async startTimelapse(speed = 5, btnTrigger = null) {
        this.timelapseSpeed = speed;

        if (this.timelapseEvents.length === 0) {
            if (btnTrigger) setButtonLoading(btnTrigger);

            try {
                const endpoint = ApiRoutes.Canvases?.GetSnapshotTimelapse || 'canvases.get_snapshot_timelapse';
                const response = await this.api.post(endpoint, { id: this.snapshotId });

                if (btnTrigger) restoreButton(btnTrigger);

                if (response && response.success && response.data && response.data.events && response.data.events.length > 0) {
                    this.timelapseEvents = response.data.events;
                    this.timelapseTotal = this.timelapseEvents.length;
                } else {
                    const fallbackMsg = window.__ ? window.__('msg_no_timelapse_data') : 'No timelapse data recorded for this snapshot.';
                    showMessage((response && response.message) ? response.message : fallbackMsg, 'info');
                    return;
                }
            } catch (error) {
                if (btnTrigger) restoreButton(btnTrigger);
                const errGeneral = window.__ ? window.__('err_connection') : 'Connection error';
                showMessage(errGeneral, 'error');
                return;
            }
        }

        this.savedBoardDimensions = { width: this.boardWidth, height: this.boardHeight };

        if (!this.savedSnapshotImage && this.offscreenCanvas) {
            this.savedSnapshotImage = document.createElement('canvas');
            this.savedSnapshotImage.width = this.offscreenCanvas.width;
            this.savedSnapshotImage.height = this.offscreenCanvas.height;
            const savedCtx = this.savedSnapshotImage.getContext('2d');
            savedCtx.drawImage(this.offscreenCanvas, 0, 0);
        }

        this.isTimelapseActive = true;

        if (this.timelapsePlayerEl) {
            this.timelapsePlayerEl.classList.add('active');
        }

        this.updateSpeedUI();

        const firstEvt = this.timelapseEvents[0];
        if (firstEvt && firstEvt.type === 'init' && firstEvt.w && firstEvt.h) {
            this.boardWidth = firstEvt.w;
            this.boardHeight = firstEvt.h;
        }

        this.setupCanvas();
        this.resetCanvasToBlank();
        this.centerBoard();

        this.timelapseCurrentIndex = 0;
        this.updateTimelapseUI();

        this.playTimelapse();
    }

    resetCanvasToBlank() {
        if (!this.offscreenCanvas || !this.offscreenCtx) return;
        this.offscreenCanvas.width = this.boardWidth;
        this.offscreenCanvas.height = this.boardHeight;
        this.offscreenCtx.imageSmoothingEnabled = false;
        this.offscreenCtx.fillStyle = '#FFFFFF';
        this.offscreenCtx.fillRect(0, 0, this.boardWidth, this.boardHeight);
        this.requestRender();
    }

    playTimelapse() {
        if (!this.isTimelapseActive) return;
        this.isTimelapsePlaying = true;
        this.timelapseLastTimestamp = performance.now();

        if (this.timelapsePlayIcon) {
            this.timelapsePlayIcon.textContent = 'pause';
        }
        if (this.timelapseStatusText) {
            this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_playing') : 'Playing';
        }
        if (this.timelapsePulse) {
            this.timelapsePulse.classList.remove('paused', 'finished');
        }

        if (this.timelapseAnimId) cancelAnimationFrame(this.timelapseAnimId);
        this.timelapseAnimId = requestAnimationFrame(this.timelapseLoop.bind(this));
    }

    pauseTimelapse() {
        this.isTimelapsePlaying = false;
        if (this.timelapseAnimId) {
            cancelAnimationFrame(this.timelapseAnimId);
            this.timelapseAnimId = null;
        }

        if (this.timelapsePlayIcon) {
            this.timelapsePlayIcon.textContent = 'play_arrow';
        }
        if (this.timelapseStatusText) {
            this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_paused') : 'Paused';
        }
        if (this.timelapsePulse) {
            this.timelapsePulse.classList.remove('finished');
            this.timelapsePulse.classList.add('paused');
        }
    }

    togglePlayTimelapse() {
        if (!this.isTimelapseActive) return;

        if (this.isTimelapsePlaying) {
            this.pauseTimelapse();
        } else {
            if (this.timelapseCurrentIndex >= this.timelapseTotal) {
                this.seekTimelapse(0);
            }
            this.playTimelapse();
        }
    }

    restartTimelapse() {
        if (!this.isTimelapseActive) return;
        this.seekTimelapse(0);
        this.playTimelapse();
    }

    stepForwardTimelapse() {
        if (!this.isTimelapseActive) return;
        this.pauseTimelapse();
        if (this.timelapseCurrentIndex < this.timelapseTotal) {
            this.applyEvent(this.timelapseEvents[this.timelapseCurrentIndex]);
            this.timelapseCurrentIndex++;
            this.updateTimelapseUI();
            this.requestRender();
        }
    }

    stepBackwardTimelapse() {
        if (!this.isTimelapseActive) return;
        this.pauseTimelapse();
        if (this.timelapseCurrentIndex > 0) {
            this.seekTimelapse(this.timelapseCurrentIndex - 1);
        }
    }

    cyclePlaybackSpeed() {
        const speeds = [0.5, 1, 2, 5, 10, 25, 50, 100, 500];
        let nextIndex = 0;
        const curIdx = speeds.indexOf(this.timelapseSpeed);
        if (curIdx !== -1 && curIdx < speeds.length - 1) {
            nextIndex = curIdx + 1;
        }
        this.timelapseSpeed = speeds[nextIndex];
        this.updateSpeedUI();
    }

    updateSpeedUI() {
        if (this.timelapseSpeedText) {
            this.timelapseSpeedText.textContent = this.timelapseSpeed >= 500 ? 'Max' : `${this.timelapseSpeed}x`;
        }
    }

    seekTimelapse(targetIndex) {
        targetIndex = Math.max(0, Math.min(this.timelapseTotal, targetIndex));

        if (targetIndex < this.timelapseCurrentIndex) {
            const firstEvt = this.timelapseEvents[0];
            if (firstEvt && firstEvt.type === 'init' && firstEvt.w && firstEvt.h) {
                this.boardWidth = firstEvt.w;
                this.boardHeight = firstEvt.h;
            }
            this.setupCanvas();
            this.resetCanvasToBlank();

            for (let i = 0; i < targetIndex; i++) {
                this.applyEvent(this.timelapseEvents[i]);
            }
        } else {
            for (let i = this.timelapseCurrentIndex; i < targetIndex; i++) {
                this.applyEvent(this.timelapseEvents[i]);
            }
        }

        this.timelapseCurrentIndex = targetIndex;
        this.updateTimelapseUI();
        this.requestRender();
    }

    timelapseLoop(now) {
        if (!this.isTimelapsePlaying || !this.isTimelapseActive) return;

        const dt = Math.min(0.1, (now - this.timelapseLastTimestamp) / 1000);
        this.timelapseLastTimestamp = now;

        const baseEventsPerSec = 80;
        let eventsToProcess = Math.max(1, Math.round(baseEventsPerSec * this.timelapseSpeed * dt));

        if (this.timelapseSpeed >= 500) {
            eventsToProcess = 600;
        }

        const targetIndex = Math.min(this.timelapseTotal, this.timelapseCurrentIndex + eventsToProcess);

        for (let i = this.timelapseCurrentIndex; i < targetIndex; i++) {
            this.applyEvent(this.timelapseEvents[i]);
        }

        this.timelapseCurrentIndex = targetIndex;
        this.updateTimelapseUI();
        this.requestRender();

        if (this.timelapseCurrentIndex >= this.timelapseTotal) {
            this.pauseTimelapse();
            if (this.timelapseStatusText) {
                this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_finished') : 'Finished';
            }
            if (this.timelapsePulse) {
                this.timelapsePulse.classList.remove('paused');
                this.timelapsePulse.classList.add('finished');
            }
        } else {
            this.timelapseAnimId = requestAnimationFrame(this.timelapseLoop.bind(this));
        }
    }

    applyEvent(evt) {
        if (!evt || !this.offscreenCtx) return;

        const type = evt.type || (evt.x !== undefined ? 'pixel' : null);

        if (type === 'init') {
            if (evt.w && evt.h) {
                this.boardWidth = evt.w;
                this.boardHeight = evt.h;
                this.offscreenCanvas.width = this.boardWidth;
                this.offscreenCanvas.height = this.boardHeight;
                this.offscreenCtx.fillStyle = '#FFFFFF';
                this.offscreenCtx.fillRect(0, 0, this.boardWidth, this.boardHeight);
            }
        } else if (type === 'pixel') {
            const x = parseInt(evt.x, 10);
            const y = parseInt(evt.y, 10);
            const color = evt.c || '#000000';

            if (color === 'transparent') {
                this.offscreenCtx.fillStyle = '#FFFFFF';
            } else {
                this.offscreenCtx.fillStyle = color;
            }
            this.offscreenCtx.fillRect(x, y, 1, 1);
        } else if (type === 'clear') {
            const x1 = parseInt(evt.x1, 10);
            const y1 = parseInt(evt.y1, 10);
            const x2 = parseInt(evt.x2, 10);
            const y2 = parseInt(evt.y2, 10);
            const w = Math.max(1, x2 - x1 + 1);
            const h = Math.max(1, y2 - y1 + 1);

            this.offscreenCtx.fillStyle = '#FFFFFF';
            this.offscreenCtx.fillRect(x1, y1, w, h);
        } else if (type === 'resize') {
            const newW = parseInt(evt.w, 10);
            const newH = parseInt(evt.h, 10);
            if (newW > 0 && newH > 0 && (newW !== this.boardWidth || newH !== this.boardHeight)) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.boardWidth;
                tempCanvas.height = this.boardHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(this.offscreenCanvas, 0, 0);

                this.boardWidth = newW;
                this.boardHeight = newH;
                this.offscreenCanvas.width = newW;
                this.offscreenCanvas.height = newH;
                this.offscreenCtx.fillStyle = '#FFFFFF';
                this.offscreenCtx.fillRect(0, 0, newW, newH);
                this.offscreenCtx.drawImage(tempCanvas, 0, 0);
            }
        } else if (type === 'reset') {
            const rW = parseInt(evt.w, 10) || this.boardWidth;
            const rH = parseInt(evt.h, 10) || this.boardHeight;
            this.boardWidth = rW;
            this.boardHeight = rH;
            this.offscreenCanvas.width = rW;
            this.offscreenCanvas.height = rH;
            this.offscreenCtx.fillStyle = '#FFFFFF';
            this.offscreenCtx.fillRect(0, 0, rW, rH);
        }
    }

    updateTimelapseUI() {
        if (this.timelapsePixelCount) {
            const formattedCurrent = this.timelapseCurrentIndex.toLocaleString();
            const formattedTotal = this.timelapseTotal.toLocaleString();
            this.timelapsePixelCount.textContent = `${formattedCurrent} / ${formattedTotal} px`;
        }

        if (this.timelapseScrubber && this.timelapseTotal > 0) {
            const percent = (this.timelapseCurrentIndex / this.timelapseTotal) * 100;
            this.timelapseScrubber.value = percent.toFixed(1);
        }
    }

    closeTimelapse() {
        this.pauseTimelapse();
        this.isTimelapseActive = false;

        if (this.timelapsePlayerEl) {
            this.timelapsePlayerEl.classList.remove('active');
        }

        this.boardWidth = this.savedBoardDimensions.width;
        this.boardHeight = this.savedBoardDimensions.height;

        this.setupCanvas();

        if (this.savedSnapshotImage && this.offscreenCtx) {
            this.offscreenCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
            this.offscreenCtx.drawImage(this.savedSnapshotImage, 0, 0, this.boardWidth, this.boardHeight);
        } else if (this.originalImageUrl) {
            this.drawImageOnCanvas(this.originalImageUrl);
        }

        this.centerBoard();
        this.requestRender();
    }

    async downloadSnapshot() {
        const executeDownload = () => {
            const btnDownload = document.getElementById('tl-btn-download');
            if (btnDownload) setButtonLoading(btnDownload);

            if (!this.offscreenCanvas || this.boardWidth <= 0 || this.boardHeight <= 0) {
                this.fallbackDownload(btnDownload);
                return;
            }

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
                    if (btnDownload) restoreButton(btnDownload);
                    if (!blob) {
                        this.fallbackDownload(btnDownload);
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
                if (btnDownload) restoreButton(btnDownload);
                this.fallbackDownload(btnDownload);
            }
        };

        executeDownload();
    }

    async fallbackDownload(btnDownload = null) {
        if (!btnDownload) {
            btnDownload = document.getElementById('tl-btn-download');
        }
        if (!this.originalImageUrl) {
            if (btnDownload) restoreButton(btnDownload);
            return;
        }
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
        } finally {
            if (btnDownload) restoreButton(btnDownload);
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
                
                if (!this.savedSnapshotImage && !this.isTimelapseActive) {
                    this.savedSnapshotImage = document.createElement('canvas');
                    this.savedSnapshotImage.width = this.boardWidth;
                    this.savedSnapshotImage.height = this.boardHeight;
                    const sCtx = this.savedSnapshotImage.getContext('2d');
                    sCtx.drawImage(this.offscreenCanvas, 0, 0);
                }

                this.requestRender();
            }
        };
        img.onerror = () => {
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

        const scaleX = rectW / this.boardWidth;
        const scaleY = rectH / this.boardHeight;
        this.transform.scale = Math.min(scaleX, scaleY) * 0.9; 

        const scaledWidth = this.boardWidth * this.transform.scale;
        const scaledHeight = this.boardHeight * this.transform.scale;

        this.transform.x = (rectW - scaledWidth) / 2;
        this.transform.y = (rectH - scaledHeight) / 2;

        this.limitBounds();
        this.requestRender();
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
        const minScale = 0.05;
        newScale = Math.max(minScale, Math.min(newScale, 40)); 
        
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
        
        if (e.button === 0 || e.button === 1 || e.button === 2) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('component-cursor-grabbing');
        }
    }

    handleMouseMove(e) {
        const target = e.target.closest('[data-ref="snapshot-canvas"]');
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

        if (target) {
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

    handleTouchStart(e) {
        const target = e.target.closest('[data-ref="snapshot-canvas"]');
        if (!target) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            this.isPinching = true;
            this.isDragging = false;
            this.initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            this.initialScale = this.transform.scale;
            return;
        }

        if (e.touches.length === 1) {
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this.isDragging = true;
        }
    }

    handleTouchMove(e) {
        if (this.isPinching && e.touches.length === 2) {
            e.preventDefault(); 
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );

            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = centerX - rect.left;
            const mouseY = centerY - rect.top;

            const scaleRatio = currentDistance / this.initialPinchDistance;
            let newScale = this.initialScale * scaleRatio;
            const minScale = 0.05;
            newScale = Math.max(minScale, Math.min(newScale, 40));

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            this.limitBounds();
            this.requestRender();
            return;
        }

        if (this.isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            this.limitBounds();
            this.calculateHoverPixel(e.touches[0].clientX, e.touches[0].clientY);
            this.requestRender();
        }
    }

    handleTouchEnd(e) {
        if (this.isPinching && e.touches.length < 2) {
            this.isPinching = false;
        }
        if (this.isDragging && e.touches.length === 0) {
            this.isDragging = false;
        }
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
        const bgColor = isDark ? '#0e0e11' : '#f5f5fa'; 
        const gridColor = 'rgba(0, 0, 0, 0.15)'; 

        this.ctx.fillStyle = bgColor; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isDataLoaded) return;

        this.ctx.save();
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
        
        this.ctx.translate(this.transform.x, this.transform.y);        
        this.ctx.scale(this.transform.scale, this.transform.scale);
        
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        if (this.offscreenCanvas && this.offscreenCanvas.width > 0 && this.offscreenCanvas.height > 0) {
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
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1 / this.transform.scale;
            this.ctx.strokeRect(this.hoveredPixel.x, this.hoveredPixel.y, 1, 1);
        }

        this.ctx.restore();
    }
}

export { SnapshotViewerController };