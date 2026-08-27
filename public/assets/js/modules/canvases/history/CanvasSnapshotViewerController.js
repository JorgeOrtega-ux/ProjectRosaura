import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../core/utils/uiUtils.js';
import { ModalTemplates } from '../../../core/components/ModalTemplates.js';

class CanvasSnapshotViewerController {
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
        this.timelapseSpeed = 1;
        this.timelapseSelectedModalSpeed = 1;
        this.timelapseAnimId = null;
        this.timelapseLastTimestamp = 0;
        this.savedSnapshotImage = null;
        this.savedBoardDimensions = { width: 2000, height: 1000 };
        this.selectedExportType = 'image';
        this.selectedImageFormat = 'png';
        this.selectedVideoDuration = 30;
        this.selectedVideoQuality = '1080p';

        this.timelapsePlayerEl = null;
        this.btnTimelapseModal = null;
        this.timelapseControlsGroup = null;
        this.timelapseStatusBadge = null;
        this.timelapseProgressBadge = null;
        this.timelapseStatusText = null;
        this.timelapsePulse = null;
        this.timelapsePixelCount = null;
        this.timelapsePlayIcon = null;
        this.timelapseSpeedText = null;
        this.timelapseLoadPromise = null;

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
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.abortController = null;
    }

    async init() {
        this.abortController = new AbortController();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.timelapseAnimId) {
            cancelAnimationFrame(this.timelapseAnimId);
            this.timelapseAnimId = null;
        }

        if (window.modalSystem && typeof window.modalSystem.registerTemplates === 'function') {
            window.modalSystem.registerTemplates(ModalTemplates);
        }

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.savedSnapshotImage = null;
        this.timelapseEvents = [];
        this.timelapseTotal = 0;
        this.timelapseCurrentIndex = 0;
        this.isTimelapseActive = false;
        this.isTimelapsePlaying = false;
        this.timelapseLoadPromise = null;

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
        
        this.btnTimelapseModal = document.querySelector('[data-ref="btn-timelapse-modal"]');
        this.timelapseControlsGroup = document.querySelector('[data-ref="timelapse-controls-group"]');
        this.timelapseStatusBadge = document.querySelector('[data-ref="timelapse-status-badge"]');
        this.timelapseProgressBadge = document.querySelector('[data-ref="timelapse-progress-badge"]');

        this.timelapseStatusText = document.querySelector('[data-ref="timelapse-status-text"]');
        this.timelapsePulse = document.querySelector('[data-ref="timelapse-pulse"]');
        this.timelapsePixelCount = document.querySelector('[data-ref="timelapse-pixel-count"]');
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
        this.preloadTimelapse();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
        }
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        window.removeEventListener('resize', this.handleResizeBound);

        document.removeEventListener('touchstart', this.handleTouchStartBound);
        document.removeEventListener('touchmove', this.handleTouchMoveBound);
        document.removeEventListener('touchend', this.handleTouchEndBound);

        document.removeEventListener('click', this.handleGlobalClickBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);

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
        document.addEventListener('keydown', this.handleKeyDownBound);
    }

    handleGlobalClick(e) {
        const btnToggleGrid = e.target.closest('[data-action="toggleSnapshotGrid"]');
        if (btnToggleGrid) {
            this.showGrid = !this.showGrid;
            btnToggleGrid.classList.toggle('active', this.showGrid);
            this.requestRender();
            return;
        }

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

        const btnOpenDownloadModal = e.target.closest('[data-action="openSnapshotDownloadModal"]');
        if (btnOpenDownloadModal) {
            this.openSnapshotDownloadModal(btnOpenDownloadModal);
            return;
        }

        const btnOpenVideoModal = e.target.closest('[data-action="openTimelapseVideoExportModal"]');
        if (btnOpenVideoModal) {
            this.selectedExportType = 'video';
            this.openSnapshotDownloadModal(btnOpenVideoModal);
            return;
        }

        const btnDownloadLegacy = e.target.closest('[data-action="downloadSnapshotHighRes"]');
        if (btnDownloadLegacy) {
            this.selectedExportType = 'image';
            this.openSnapshotDownloadModal(btnDownloadLegacy);
            return;
        }

        const btnSelectExportType = e.target.closest('[data-action="selectSnapshotExportType"]');
        if (btnSelectExportType) {
            this.handleSelectSnapshotExportType(btnSelectExportType);
            return;
        }

        const btnSelectImgFormat = e.target.closest('[data-action="selectSnapshotImageFormat"]');
        if (btnSelectImgFormat) {
            this.handleSelectSnapshotImageFormat(btnSelectImgFormat);
            return;
        }

        const btnSelectVideoDur = e.target.closest('[data-action="selectSnapshotVideoDuration"]');
        if (btnSelectVideoDur) {
            this.handleSelectSnapshotVideoDuration(btnSelectVideoDur);
            return;
        }

        const btnSelectVideoQuality = e.target.closest('[data-action="selectSnapshotVideoQuality"]');
        if (btnSelectVideoQuality) {
            this.handleSelectSnapshotVideoQuality(btnSelectVideoQuality);
            return;
        }

        const btnConfirmSnapshotDownload = e.target.closest('[data-action="confirmExecuteSnapshotDownload"]');
        if (btnConfirmSnapshotDownload) {
            this.confirmExecuteSnapshotDownload(btnConfirmSnapshotDownload);
            return;
        }

        const btnLegacyConfirmExportVideo = e.target.closest('[data-action="confirmExportTimelapseVideo"]');
        if (btnLegacyConfirmExportVideo) {
            this.confirmExportTimelapseVideo(btnLegacyConfirmExportVideo);
            return;
        }
    }

    handleKeyDown(e) {
        if (!this.isTimelapseActive) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            this.togglePlayTimelapse();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.stepForwardTimelapse();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.stepBackwardTimelapse();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            this.restartTimelapse();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.closeTimelapse();
        }
    }

    async openTimelapseModal(btnTrigger = null) {
        if (this.isTimelapseActive) {
            this.togglePlayTimelapse();
            return;
        }

        if (window.modalSystem) {
            window.modalSystem.show('timelapseSettingsModal');
        } else {
            await this.startTimelapse(this.timelapseSpeed, btnTrigger);
        }
    }

    handleSpeedSelectionInModal(btn) {
        const speedVal = parseFloat(btn.getAttribute('data-speed'));
        if (isNaN(speedVal)) return;

        this.timelapseSelectedModalSpeed = speedVal;
    }

    async confirmStartTimelapse() {
        if (window.modalSystem) {
            window.modalSystem.closeCurrent();
        }

        const btnTrigger = document.querySelector('[data-ref="btn-timelapse-modal"]');
        await this.startTimelapse(this.timelapseSpeed, btnTrigger);
    }

    openSnapshotDownloadModal(btnTrigger = null) {
        if (window.modalSystem) {
            if (typeof window.modalSystem.registerTemplates === 'function') {
                window.modalSystem.registerTemplates(ModalTemplates);
            }
            window.modalSystem.show('snapshotDownloadModal', {
                type: this.selectedExportType,
                format: this.selectedImageFormat,
                duration: this.selectedVideoDuration,
                quality: this.selectedVideoQuality
            });
        } else {
            if (this.selectedExportType === 'image') {
                this.downloadSnapshotImage(this.selectedImageFormat);
            } else {
                this.exportTimelapseVideo(this.selectedVideoDuration, this.selectedVideoQuality);
            }
        }
    }

    openTimelapseVideoExportModal(btnTrigger = null) {
        this.selectedExportType = 'video';
        this.openSnapshotDownloadModal(btnTrigger);
    }

    handleSelectSnapshotExportType(btn) {
        if (btn.hasAttribute('data-requires-premium') || btn.classList.contains('premium-locked')) {
            const reqTier = parseInt(btn.getAttribute('data-required-tier') || '1', 10);
            if (window.modalSystem) {
                window.modalSystem.show('upgradePlansModal', { initialTier: reqTier });
            } else if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                window.spaRouter.navigate('/upgrade');
            }
            return;
        }

        const val = btn.getAttribute('data-value') || 'image';
        const icon = btn.getAttribute('data-icon') || (val === 'video' ? 'movie' : 'image');
        const text = btn.getAttribute('data-text') || (val === 'video' ? 'Video Timelapse' : 'Imagen');
        this.selectedExportType = val;

        const modal = btn.closest('.component-modal-container') || document;
        const trigger = modal.querySelector('[data-ref="snapshot_export_type"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const triggerText = trigger.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = text;
            const triggerIcon = trigger.querySelector('.material-symbols-rounded:first-child');
            if (triggerIcon) triggerIcon.textContent = icon;
        }

        const imageGroup = modal.querySelector('[data-ref="snapshot-image-options-group"]');
        const videoDurGroup = modal.querySelector('[data-ref="snapshot-video-duration-group"]');
        const videoQualGroup = modal.querySelector('[data-ref="snapshot-video-quality-group"]');

        if (imageGroup) imageGroup.classList.toggle('disabled', val !== 'image');
        if (videoDurGroup) videoDurGroup.classList.toggle('disabled', val !== 'video');
        if (videoQualGroup) videoQualGroup.classList.toggle('disabled', val !== 'video');

        const headerIcon = modal.querySelector('[data-ref="snapshot-download-header-icon"]');
        if (headerIcon) {
            headerIcon.textContent = (val === 'video') ? 'movie' : 'download';
        }

        const menuList = btn.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('[data-action="selectSnapshotExportType"]').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
        }

        this.closeModuleElement(btn);
    }

    handleSelectSnapshotImageFormat(btn) {
        const val = btn.getAttribute('data-value') || 'png';
        const icon = btn.getAttribute('data-icon') || 'image';
        const text = btn.getAttribute('data-text') || 'PNG';
        this.selectedImageFormat = val;

        const modal = btn.closest('.component-modal-container') || document;
        const trigger = modal.querySelector('[data-ref="snapshot_image_format"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const triggerText = trigger.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = text;
            const triggerIcon = trigger.querySelector('.material-symbols-rounded:first-child');
            if (triggerIcon) triggerIcon.textContent = icon;
        }

        const menuList = btn.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('[data-action="selectSnapshotImageFormat"]').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
        }

        this.closeModuleElement(btn);
    }

    handleSelectSnapshotVideoDuration(btn) {
        const val = parseInt(btn.getAttribute('data-value') || btn.getAttribute('data-duration'), 10) || 30;
        const icon = btn.getAttribute('data-icon') || (val === 15 ? 'speed' : (val === 60 ? 'hourglass_bottom' : 'timer'));
        const text = btn.getAttribute('data-text') || `${val}s`;
        this.selectedVideoDuration = val;

        const modal = btn.closest('.component-modal-container') || document;
        const trigger = modal.querySelector('[data-ref="snapshot_video_duration"]');
        if (trigger) {
            trigger.setAttribute('data-value', String(val));
            const triggerText = trigger.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = text;
            const triggerIcon = trigger.querySelector('.material-symbols-rounded:first-child');
            if (triggerIcon) triggerIcon.textContent = icon;
        }

        const menuList = btn.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('[data-action="selectSnapshotVideoDuration"]').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
        }

        this.closeModuleElement(btn);
    }

    handleSelectSnapshotVideoQuality(btn) {
        const val = btn.getAttribute('data-value') || '1080p';
        const icon = btn.getAttribute('data-icon') || (val === '720p' ? 'hd' : (val === '4k' ? 'video_file' : 'high_quality'));
        const text = btn.getAttribute('data-text') || val;
        this.selectedVideoQuality = val;

        const modal = btn.closest('.component-modal-container') || document;
        const trigger = modal.querySelector('[data-ref="snapshot_video_quality"]');
        if (trigger) {
            trigger.setAttribute('data-value', val);
            const triggerText = trigger.querySelector('.component-dropdown-text');
            if (triggerText) triggerText.textContent = text;
            const triggerIcon = trigger.querySelector('.material-symbols-rounded:first-child');
            if (triggerIcon) triggerIcon.textContent = icon;
        }

        const menuList = btn.closest('.component-menu-list');
        if (menuList) {
            menuList.querySelectorAll('[data-action="selectSnapshotVideoQuality"]').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
        }

        this.closeModuleElement(btn);
    }

    closeModuleElement(targetEl) {
        const module = targetEl ? targetEl.closest('.component-module') : null;
        if (module) {
            if (window.appInstance && typeof window.appInstance.closeModule === 'function') {
                window.appInstance.closeModule(module);
            } else {
                module.classList.replace('active', 'disabled');
            }
        }
    }

    selectTimelapseVideoDuration(btn) {
        this.handleSelectSnapshotVideoDuration(btn);
    }

    async confirmExportTimelapseVideo(btn = null) {
        if (btn) setButtonLoading(btn);
        const duration = this.selectedVideoDuration || 30;
        const quality = this.selectedVideoQuality || '1080p';
        await this.exportTimelapseVideo(duration, quality, btn);
    }

    async confirmExecuteSnapshotDownload(btn = null) {
        if (btn) setButtonLoading(btn);

        const modal = btn ? btn.closest('.component-modal-container') : document;
        const typeTrigger = modal?.querySelector('[data-ref="snapshot_export_type"]');
        const type = typeTrigger ? typeTrigger.getAttribute('data-value') : this.selectedExportType;

        if (type === 'video') {
            const durTrigger = modal?.querySelector('[data-ref="snapshot_video_duration"]');
            const duration = durTrigger ? parseInt(durTrigger.getAttribute('data-value'), 10) : this.selectedVideoDuration;
            const qualityTrigger = modal?.querySelector('[data-ref="snapshot_video_quality"]');
            const quality = qualityTrigger ? qualityTrigger.getAttribute('data-value') : this.selectedVideoQuality;

            await this.exportTimelapseVideo(duration, quality, btn);
        } else {
            const formatTrigger = modal?.querySelector('[data-ref="snapshot_image_format"]');
            const format = formatTrigger ? formatTrigger.getAttribute('data-value') : this.selectedImageFormat;

            await this.downloadSnapshotImage(format, btn);
        }
    }

    async exportTimelapseVideo(duration = 30, quality = '1080p', btn = null) {
        showMessage(window.__('msg_generating_timelapse_video'), 'info');

        try {
            const endpoint = ApiRoutes.Canvases.ExportSnapshotTimelapseVideo;
            const response = await this.api.post(endpoint, {
                id: this.snapshotId,
                duration: duration,
                quality: quality
            });

            if (response && response.success && response.data && response.data.url) {
                if (window.modalSystem) {
                    window.modalSystem.closeCurrent();
                }

                const filename = response.data.filename || `timelapse_${this.snapshotId}_${duration}s_${quality}.mp4`;
                await this.triggerFileDownload(response.data.url, filename);

                showMessage(window.__('msg_timelapse_video_ready'), 'success');
            } else if (response && response.status === 'processing') {
                await this.pollVideoReadiness(duration, quality, btn);
                return;
            } else {
                showMessage(response?.message || window.__('err_server'), 'error');
            }
        } catch (e) {
            showMessage(window.__('err_server'), 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    }

    async pollVideoReadiness(duration, quality = '1080p', btn = null) {
        const endpoint = ApiRoutes.Canvases.ExportSnapshotTimelapseVideo;
        let attempts = 0;
        const maxAttempts = 40;
        if (this._timelapsePollTimeout) clearTimeout(this._timelapsePollTimeout);
        this._isTimelapsePolling = true;

        const checkReadiness = async () => {
            if (!this._isTimelapsePolling) return;
            attempts++;

            try {
                const response = await this.api.post(endpoint, {
                    id: this.snapshotId,
                    duration: duration,
                    quality: quality
                }, this.abortController?.signal);

                if (!this._isTimelapsePolling) return;

                if (response && response.success && response.data && response.data.url) {
                    this._isTimelapsePolling = false;
                    if (window.modalSystem) {
                        window.modalSystem.closeCurrent();
                    }
                    if (btn) restoreButton(btn);

                    const filename = response.data.filename || `timelapse_${this.snapshotId}_${duration}s_${quality}.mp4`;
                    await this.triggerFileDownload(response.data.url, filename);

                    showMessage(window.__('msg_timelapse_video_ready'), 'success');
                    return;
                } else if (attempts >= maxAttempts) {
                    this._isTimelapsePolling = false;
                    if (btn) restoreButton(btn);
                    showMessage(window.__('err_server'), 'warning');
                    return;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (attempts >= maxAttempts) {
                    this._isTimelapsePolling = false;
                    if (btn) restoreButton(btn);
                    return;
                }
            }

            if (this._isTimelapsePolling) {
                this._timelapsePollTimeout = setTimeout(checkReadiness, 2000);
            }
        };

        this._timelapsePollTimeout = setTimeout(checkReadiness, 2000);
    }

    async triggerFileDownload(url, filename) {
        try {
            const fetchUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
            const res = await fetch(fetchUrl, { cache: 'no-store', signal: this.abortController?.signal });
            if (!res.ok) throw new Error('Fetch failed');
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        } catch (e) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    preloadTimelapse() {
        if (this.timelapseEvents.length > 0 || this.timelapseLoadPromise) return;

        this.timelapseLoadPromise = (async () => {
            try {
                const endpoint = ApiRoutes.Canvases.GetSnapshotTimelapse;
                const response = await this.api.post(endpoint, { id: this.snapshotId });
                if (response && response.success && response.data && response.data.events && response.data.events.length > 0) {
                    this.timelapseEvents = response.data.events;
                    this.timelapseTotal = this.timelapseEvents.length;
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            } finally {
                this.timelapseLoadPromise = null;
            }
        })();
    }

    async startTimelapse(speed = 1, btnTrigger = null) {
        this.timelapseSpeed = speed;

        if (this.timelapseEvents.length === 0) {
            if (btnTrigger) setButtonLoading(btnTrigger);

            if (this.timelapseLoadPromise) {
                await this.timelapseLoadPromise;
            } else {
                this.preloadTimelapse();
                if (this.timelapseLoadPromise) {
                    await this.timelapseLoadPromise;
                }
            }

            if (btnTrigger) restoreButton(btnTrigger);

            if (this.timelapseEvents.length === 0) {
                const fallbackMsg = window.__ ? window.__('msg_no_timelapse_data') : 'No timelapse data recorded for this snapshot.';
                showMessage(fallbackMsg, 'info');
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

        if (this.btnTimelapseModal) {
            this.btnTimelapseModal.classList.add('disabled');
        }
        if (this.timelapseControlsGroup) {
            this.timelapseControlsGroup.classList.remove('disabled');
        }
        if (this.timelapseStatusBadge) {
            this.timelapseStatusBadge.classList.remove('disabled');
        }
        if (this.timelapseProgressBadge) {
            this.timelapseProgressBadge.classList.remove('disabled');
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
            this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_playing') : 'Reproduciendo';
        }
        if (this.timelapsePulse) {
            this.timelapsePulse.classList.remove('paused', 'finished');
        }

        const btnPlay = document.querySelector('[data-ref="btn-timelapse-play"]');
        if (btnPlay) {
            btnPlay.classList.add('active');
            btnPlay.setAttribute('data-tooltip', window.__ ? window.__('lbl_timelapse_pause') : 'Pausar');
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
            this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_paused') : 'Pausado';
        }
        if (this.timelapsePulse) {
            this.timelapsePulse.classList.remove('finished');
            this.timelapsePulse.classList.add('paused');
        }

        const btnPlay = document.querySelector('[data-ref="btn-timelapse-play"]');
        if (btnPlay) {
            btnPlay.classList.remove('active');
            btnPlay.setAttribute('data-tooltip', window.__ ? window.__('lbl_timelapse_play') : 'Reproducir');
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
                this.timelapseStatusText.textContent = window.__ ? window.__('lbl_timelapse_finished') : 'Completado';
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
                this.offscreenCanvas.width = evt.w;
                this.offscreenCanvas.height = evt.h;
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
            const percent = this.timelapseTotal > 0 ? Math.round((this.timelapseCurrentIndex / this.timelapseTotal) * 100) : 0;
            this.timelapsePixelCount.textContent = `${formattedCurrent} / ${formattedTotal} px (${percent}%)`;
        }
    }

    closeTimelapse() {
        this.pauseTimelapse();
        this.isTimelapseActive = false;

        if (this.timelapseControlsGroup) {
            this.timelapseControlsGroup.classList.add('disabled');
        }
        if (this.btnTimelapseModal) {
            this.btnTimelapseModal.classList.remove('disabled');
        }
        if (this.timelapseStatusBadge) {
            this.timelapseStatusBadge.classList.add('disabled');
        }
        if (this.timelapseProgressBadge) {
            this.timelapseProgressBadge.classList.add('disabled');
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
        return this.openSnapshotDownloadModal();
    }

    async downloadSnapshotImage(format = 'png', btn = null) {
        const fmt = (format || 'png').toLowerCase();
        const filename = `snapshot_${this.snapshotId || 'rosaura'}.${fmt}`;

        if (!this.offscreenCanvas || this.boardWidth <= 0 || this.boardHeight <= 0) {
            await this.fallbackDownloadImage(fmt, filename, btn);
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

            if (fmt === 'pdf') {
                exportCanvas.toBlob(async (jpegBlob) => {
                    if (btn) restoreButton(btn);
                    if (window.modalSystem) window.modalSystem.closeCurrent();

                    if (!jpegBlob) {
                        await this.fallbackDownloadImage(fmt, filename, btn);
                        return;
                    }
                    const arrayBuffer = await jpegBlob.arrayBuffer();
                    const jpegBytes = new Uint8Array(arrayBuffer);
                    const pdfBlob = this.buildPdfFromJpeg(jpegBytes, exportCanvas.width, exportCanvas.height);
                    
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                    
                    showMessage(window.__ ? window.__('msg_image_download_ready') : '¡Imagen descargada correctamente!', 'success');
                }, 'image/jpeg', 0.98);
            } else {
                const mimeType = (fmt === 'jpg' || fmt === 'jpeg') ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');
                const quality = (mimeType === 'image/jpeg' || mimeType === 'image/webp') ? 0.95 : undefined;

                exportCanvas.toBlob((blob) => {
                    if (btn) restoreButton(btn);
                    if (window.modalSystem) window.modalSystem.closeCurrent();

                    if (!blob) {
                        this.fallbackDownloadImage(fmt, filename, btn);
                        return;
                    }
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

                    showMessage(window.__ ? window.__('msg_image_download_ready') : '¡Imagen descargada correctamente!', 'success');
                }, mimeType, quality);
            }
        } catch (e) {
            if (btn) restoreButton(btn);
            await this.fallbackDownloadImage(fmt, filename, btn);
        }
    }

    buildPdfFromJpeg(jpegBytes, widthPx, heightPx) {
        const ptWidth = Number((widthPx * 0.75).toFixed(2));
        const ptHeight = Number((heightPx * 0.75).toFixed(2));

        let pdf = `%PDF-1.4\n`;
        const offsets = [];

        offsets[1] = pdf.length;
        pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

        offsets[2] = pdf.length;
        pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;

        offsets[3] = pdf.length;
        pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`;

        const contentStream = `q\n${ptWidth} 0 0 ${ptHeight} 0 0 cm\n/Im1 Do\nQ\n`;
        offsets[4] = pdf.length;
        pdf += `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

        const imageHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
        const imageFooter = `\nendstream\nendobj\n`;

        const enc = new TextEncoder();
        const part1 = enc.encode(pdf);
        offsets[5] = part1.length;
        const part2Header = enc.encode(imageHeader);
        const part2Footer = enc.encode(imageFooter);

        const endImageOffset = part1.length + part2Header.length + jpegBytes.length + part2Footer.length;
        
        let xref = `xref\n0 6\n0000000000 65535 f \n`;
        for (let i = 1; i <= 5; i++) {
            xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
        }

        const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${endImageOffset}\n%%EOF\n`;
        const trailerBytes = enc.encode(xref + trailer);

        return new Blob([part1, part2Header, jpegBytes, part2Footer, trailerBytes], { type: 'application/pdf' });
    }

    async fallbackDownloadImage(format = 'png', filename = '', btnDownload = null) {
        const fmt = (format || 'png').toLowerCase();
        const fname = filename || `snapshot_${this.snapshotId || 'rosaura'}.${fmt}`;
        if (!this.originalImageUrl) {
            if (btnDownload) restoreButton(btnDownload);
            return;
        }
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    if (fmt === 'pdf') {
                        canvas.toBlob(async (jpegBlob) => {
                            if (btnDownload) restoreButton(btnDownload);
                            if (window.modalSystem) window.modalSystem.closeCurrent();
                            if (!jpegBlob) {
                                this.directDownloadUrl(this.originalImageUrl, fname, btnDownload);
                                return;
                            }
                            const arrayBuffer = await jpegBlob.arrayBuffer();
                            const jpegBytes = new Uint8Array(arrayBuffer);
                            const pdfBlob = this.buildPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            this.triggerBlobDownload(blobUrl, fname);
                            showMessage(window.__ ? window.__('msg_image_download_ready') : '¡Imagen descargada correctamente!', 'success');
                        }, 'image/jpeg', 0.98);
                    } else {
                        const mimeType = (fmt === 'jpg' || fmt === 'jpeg') ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');
                        const quality = (mimeType === 'image/jpeg' || mimeType === 'image/webp') ? 0.95 : undefined;
                        canvas.toBlob((blob) => {
                            if (btnDownload) restoreButton(btnDownload);
                            if (window.modalSystem) window.modalSystem.closeCurrent();
                            if (!blob) {
                                this.directDownloadUrl(this.originalImageUrl, fname, btnDownload);
                                return;
                            }
                            const blobUrl = URL.createObjectURL(blob);
                            this.triggerBlobDownload(blobUrl, fname);
                            showMessage(window.__ ? window.__('msg_image_download_ready') : '¡Imagen descargada correctamente!', 'success');
                        }, mimeType, quality);
                    }
                } catch (err) {
                    this.directDownloadUrl(this.originalImageUrl, fname, btnDownload);
                }
            };
            img.onerror = () => {
                this.directDownloadUrl(this.originalImageUrl, fname, btnDownload);
            };
            img.src = this.originalImageUrl;
        } catch (e) {
            this.directDownloadUrl(this.originalImageUrl, fname, btnDownload);
        }
    }

    triggerBlobDownload(blobUrl, filename) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }

    directDownloadUrl(url, filename, btn = null) {
        if (btn) restoreButton(btn);
        if (window.modalSystem) window.modalSystem.closeCurrent();
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async fallbackDownload(btnDownload = null) {
        await this.fallbackDownloadImage('png', `snapshot_${this.snapshotId || 'rosaura'}.png`, btnDownload);
    }

    async loadSnapshotData() {
        try {
            const endpoint = ApiRoutes.Canvases.GetSnapshotDetail;
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

export { CanvasSnapshotViewerController };