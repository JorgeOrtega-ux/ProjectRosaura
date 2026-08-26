import { showMessage, hexToHsv, hsvToHex, bindDragToScroll, initCarouselScroll } from '../../../../core/utils/uiUtils.js';

export const InteractionEvents = {
    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
        window.addEventListener('blur', this.handleMouseUpBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('input', this.handleInputBound);
        document.addEventListener('change', this.handleInputBound);
        window.addEventListener('resize', this.handleResizeBound);

        // Bind carousel scroll & navigation arrows for top property bar (horizontal)
        const topBarWrapper = document.querySelector('[data-ref="canvas-top-property-bar-wrapper"]');
        if (topBarWrapper) {
            this.topBarCarouselController = initCarouselScroll(topBarWrapper, false);
        } else {
            const topPropertyBar = document.querySelector('[data-ref="canvas-top-property-bar"]');
            if (topPropertyBar) {
                bindDragToScroll(topPropertyBar, false);
                topPropertyBar.addEventListener('wheel', (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        topPropertyBar.scrollLeft += e.deltaY;
                    }
                }, { passive: false });
            }
        }

        // Bind carousel scroll & navigation arrows for bottom horizontal tools toolbar (horizontal)
        const horizontalToolsWrapper = document.querySelector('[data-ref="canvas-horizontal-tools-wrapper"]');
        if (horizontalToolsWrapper) {
            this.horizontalToolsCarouselController = initCarouselScroll(horizontalToolsWrapper, false);
        } else {
            const horizontalToolsToolbar = document.querySelector('.canvas-design-toolbar-horizontal');
            if (horizontalToolsToolbar) {
                bindDragToScroll(horizontalToolsToolbar, false);
            }
        }

        const topDesignToolbar = document.querySelector('.canvas-design-toolbar');
        if (topDesignToolbar) {
            bindDragToScroll(topDesignToolbar, false);
            topDesignToolbar.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    topDesignToolbar.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }

        if (this.canvas && this.canvas.parentElement && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.resizeAnimationFrame) cancelAnimationFrame(this.resizeAnimationFrame);
                this.resizeAnimationFrame = requestAnimationFrame(() => {
                    if (typeof this.handleResize === 'function') {
                        this.handleResize();
                    }
                });
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
        document.addEventListener('touchend', this.handleTouchEndBound);

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileUploadBound);
        }

        this.handleBeforeUnloadBound = () => {
            if (this.isOfflineMode && this._offlineDirty && typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(true);
            }
        };
        window.addEventListener('beforeunload', this.handleBeforeUnloadBound);
        window.addEventListener('pagehide', this.handleBeforeUnloadBound);
    },

    handleClick(e) {
        const btnTogglePopover = e.target.closest('[data-action="togglePropertyPopover"]');
        if (btnTogglePopover) {
            e.preventDefault();
            e.stopPropagation();
            const wrapper = btnTogglePopover.closest('.property-bar-popover-wrapper');
            const menu = wrapper ? wrapper.querySelector('.property-bar-popover-menu') : null;
            if (menu) {
                const isOpen = !menu.classList.contains('disabled');
                document.querySelectorAll('.property-bar-popover-menu').forEach(m => m.classList.add('disabled'));
                if (!isOpen) {
                    menu.classList.remove('disabled');
                }
            }
            return;
        }

        if (!e.target.closest('.property-bar-popover-wrapper')) {
            document.querySelectorAll('.property-bar-popover-menu').forEach(m => m.classList.add('disabled'));
        }

        const btnApplyCustom = e.target.closest('[data-action="applyCustomColor"]');
        if (btnApplyCustom) {
            e.preventDefault();
            const picker = btnApplyCustom.closest('[data-ref="customColorPicker"]') || document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                let h = Math.max(0, Math.min(360, parseFloat(picker.dataset.h) || 0));
                let s = Math.max(0, Math.min(100, parseFloat(picker.dataset.s) || 0));
                let v = Math.max(0, Math.min(100, parseFloat(picker.dataset.v) || 0));
                const hex = hsvToHex(h, s, v);
                this.selectAndAddCustomColor(hex);
            }
            return;
        }

        const btnToggleCustomPicker = e.target.closest('[data-action="toggleModule"][data-target="moduleCustomColorPicker"]');
        if (btnToggleCustomPicker) {
            const picker = document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                const currentHex = this.currentColor || '#FF0000';
                const hsv = hexToHsv(currentHex);
                picker.dataset.h = hsv.h;
                picker.dataset.s = hsv.s;
                picker.dataset.v = hsv.v;
                this.updateCustomPickerUI(picker);
            }
        }

        const btnEyedropper = e.target.closest('[data-action="toggleEyedropper"]');
        if (btnEyedropper) {
            e.preventDefault();
            this.toggleEyedropper();
            return;
        }

        const btnSaveOffline = e.target.closest('[data-action="manualSaveOffline"]');
        if (btnSaveOffline) {
            e.preventDefault();
            if (typeof this.manualSaveOffline === 'function') {
                this.manualSaveOffline(btnSaveOffline);
            } else if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(true);
            }
            return;
        }

        const btnSelectBlend = e.target.closest('[data-action="selectLayerBlendMode"]');
        if (btnSelectBlend) {
            e.preventDefault();
            const mode = btnSelectBlend.getAttribute('data-blend') || 'normal';
            if (typeof this.setLayerBlendMode === 'function') {
                this.setLayerBlendMode(mode);
            }
            return;
        }

        const btnToggleOnline = e.target.closest('[data-action="toggleOnlineMode"]');
        if (btnToggleOnline) {
            e.preventDefault();
            const targetAction = this.isOfflineMode ? 'activate' : 'deactivate';
            if (typeof this.toggleOnlineMode === 'function') {
                this.toggleOnlineMode(targetAction, btnToggleOnline);
            }
            return;
        }

        const btnExternalPromo = e.target.closest('[data-action="openExternalPromo"]');
        if (btnExternalPromo) {
            e.preventDefault();
            const targetUrl = btnExternalPromo.getAttribute('data-target-url');
            if (targetUrl) {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }
        
        if (typeof this.handleTemplateModals === 'function' && this.handleTemplateModals(e)) {
            return; 
        }

        const btnToggleStickers = e.target.closest('[data-menu-target="menu-stickers"]');
        if (btnToggleStickers) {
            if (typeof this.loadStickersLibrary === 'function') {
                this.loadStickersLibrary();
            }
        }

        const btnToggleLayers = e.target.closest('[data-action="toggleLayersPanel"]');
        if (btnToggleLayers) {
            e.preventDefault();
            if (typeof this.toggleLayersPanel === 'function') {
                this.toggleLayersPanel();
            }
            return;
        }

        const btnToggleLayersCarousel = e.target.closest('[data-action="toggleLayersCarousel"]');
        if (btnToggleLayersCarousel) {
            e.preventDefault();
            if (typeof this.toggleLayersCarousel === 'function') {
                this.toggleLayersCarousel();
            }
            return;
        }

        const btnSetCarouselModeLayers = e.target.closest('[data-action="setCarouselModeLayers"]');
        if (btnSetCarouselModeLayers) {
            e.preventDefault();
            if (typeof this.setCarouselMode === 'function') {
                this.setCarouselMode('layers');
            }
            return;
        }

        const btnSetCarouselModeTimeline = e.target.closest('[data-action="setCarouselModeTimeline"]');
        if (btnSetCarouselModeTimeline) {
            e.preventDefault();
            if (typeof this.setCarouselMode === 'function') {
                this.setCarouselMode('timeline');
            }
            return;
        }

        const btnTogglePlayAnim = e.target.closest('[data-action="togglePlayAnimation"]');
        if (btnTogglePlayAnim) {
            e.preventDefault();
            if (typeof this.togglePlayAnimation === 'function') {
                this.togglePlayAnimation();
            }
            return;
        }

        const btnCycleFps = e.target.closest('[data-action="cycleAnimationFps"]');
        if (btnCycleFps) {
            e.preventDefault();
            if (typeof this.cycleAnimationFps === 'function') {
                this.cycleAnimationFps();
            }
            return;
        }

        const btnToggleOnion = e.target.closest('[data-action="toggleOnionSkin"]');
        if (btnToggleOnion) {
            e.preventDefault();
            if (typeof this.toggleOnionSkin === 'function') {
                this.toggleOnionSkin();
            }
            return;
        }

        const btnAddFrame = e.target.closest('[data-action="addFrame"]');
        if (btnAddFrame) {
            e.preventDefault();
            if (typeof this.addFrame === 'function') {
                this.addFrame();
            }
            return;
        }

        const btnDuplicateFrame = e.target.closest('[data-action="duplicateFrame"]');
        if (btnDuplicateFrame) {
            e.preventDefault();
            e.stopPropagation();
            const frameId = btnDuplicateFrame.getAttribute('data-frame-id');
            if (typeof this.duplicateFrame === 'function') {
                this.duplicateFrame(frameId);
            }
            return;
        }

        const btnDeleteFrame = e.target.closest('[data-action="deleteFrame"]');
        if (btnDeleteFrame) {
            e.preventDefault();
            e.stopPropagation();
            const frameId = btnDeleteFrame.getAttribute('data-frame-id');
            if (typeof this.deleteFrame === 'function') {
                this.deleteFrame(frameId);
            }
            return;
        }

        const btnOpenExportAnim = e.target.closest('[data-action="openExportAnimationModal"]');
        if (btnOpenExportAnim) {
            e.preventDefault();
            if (typeof this.openExportAnimationModal === 'function') {
                this.openExportAnimationModal();
            }
            return;
        }

        const btnExportAnimNext = e.target.closest('[data-action="exportAnimNextStep"]');
        if (btnExportAnimNext) {
            e.preventDefault();
            if (typeof this.exportAnimNextStep === 'function') {
                this.exportAnimNextStep();
            }
            return;
        }

        const btnExportAnimPrev = e.target.closest('[data-action="exportAnimPrevStep"]');
        if (btnExportAnimPrev) {
            e.preventDefault();
            if (typeof this.exportAnimPrevStep === 'function') {
                this.exportAnimPrevStep();
            }
            return;
        }

        const btnSelectExportFormatOpt = e.target.closest('[data-action="selectExportAnimFormatOption"]');
        if (btnSelectExportFormatOpt) {
            e.preventDefault();
            if (typeof this.handleSelectExportFormatOption === 'function') {
                this.handleSelectExportFormatOption(btnSelectExportFormatOpt);
            }
            return;
        }

        const btnSelectExportScaleOpt = e.target.closest('[data-action="selectExportAnimScaleOption"]');
        if (btnSelectExportScaleOpt) {
            e.preventDefault();
            if (typeof this.handleSelectExportScaleOption === 'function') {
                this.handleSelectExportScaleOption(btnSelectExportScaleOpt);
            }
            return;
        }

        const btnSelectExportBgOpt = e.target.closest('[data-action="selectExportAnimBgOption"]');
        if (btnSelectExportBgOpt) {
            e.preventDefault();
            if (typeof this.handleSelectExportBgOption === 'function') {
                this.handleSelectExportBgOption(btnSelectExportBgOpt);
            }
            return;
        }

        const btnSelectExportJsonOpt = e.target.closest('[data-action="selectExportAnimJsonOption"]');
        if (btnSelectExportJsonOpt) {
            e.preventDefault();
            if (typeof this.handleSelectExportJsonOption === 'function') {
                this.handleSelectExportJsonOption(btnSelectExportJsonOpt);
            }
            return;
        }

        const btnTriggerExportDownload = e.target.closest('[data-action="triggerExportAnimationDownload"]');
        if (btnTriggerExportDownload) {
            e.preventDefault();
            if (typeof this.triggerExportAnimationDownload === 'function') {
                this.triggerExportAnimationDownload(btnTriggerExportDownload);
            }
            return;
        }

        const btnSelectFrame = e.target.closest('[data-action="selectFrame"]');
        if (btnSelectFrame) {
            e.preventDefault();
            const frameId = btnSelectFrame.getAttribute('data-frame-id');
            if (frameId && typeof this.selectFrame === 'function') {
                this.selectFrame(frameId);
            }
            return;
        }

        const btnAddLayer = e.target.closest('[data-action="addLayer"]');
        if (btnAddLayer) {
            e.preventDefault();
            if (typeof this.addLayer === 'function') {
                this.addLayer();
            }
            return;
        }

        const btnDeleteLayer = e.target.closest('[data-action="deleteLayer"]');
        if (btnDeleteLayer) {
            e.preventDefault();
            const layerId = btnDeleteLayer.getAttribute('data-layer-id');
            if (typeof this.deleteLayer === 'function') {
                this.deleteLayer(layerId);
            }
            return;
        }

        const btnMoveLayerUp = e.target.closest('[data-action="moveLayerUp"]');
        if (btnMoveLayerUp) {
            e.preventDefault();
            const layerId = btnMoveLayerUp.getAttribute('data-layer-id');
            if (typeof this.moveLayerUp === 'function') {
                this.moveLayerUp(layerId);
            }
            return;
        }

        const btnMoveLayerDown = e.target.closest('[data-action="moveLayerDown"]');
        if (btnMoveLayerDown) {
            e.preventDefault();
            const layerId = btnMoveLayerDown.getAttribute('data-layer-id');
            if (typeof this.moveLayerDown === 'function') {
                this.moveLayerDown(layerId);
            }
            return;
        }

        const btnDuplicateLayer = e.target.closest('[data-action="duplicateLayer"]');
        if (btnDuplicateLayer) {
            e.preventDefault();
            const layerId = btnDuplicateLayer.getAttribute('data-layer-id');
            if (typeof this.duplicateLayer === 'function') {
                this.duplicateLayer(layerId);
            }
            return;
        }

        const btnMergeLayerUp = e.target.closest('[data-action="mergeLayerUp"]');
        if (btnMergeLayerUp) {
            e.preventDefault();
            const layerId = btnMergeLayerUp.getAttribute('data-layer-id');
            if (typeof this.mergeLayerUp === 'function') {
                this.mergeLayerUp(layerId);
            }
            return;
        }

        const btnMergeLayerDown = e.target.closest('[data-action="mergeLayerDown"]');
        if (btnMergeLayerDown) {
            e.preventDefault();
            const layerId = btnMergeLayerDown.getAttribute('data-layer-id');
            if (typeof this.mergeLayerDown === 'function') {
                this.mergeLayerDown(layerId);
            }
            return;
        }

        const btnToggleLayerLock = e.target.closest('[data-action="toggleLayerLock"]');
        if (btnToggleLayerLock) {
            e.preventDefault();
            e.stopPropagation();
            const layerId = btnToggleLayerLock.getAttribute('data-layer-id');
            if (typeof this.toggleLayerLock === 'function') {
                this.toggleLayerLock(layerId);
            }
            return;
        }

        const inputToggleLayerVis = e.target.closest('[data-action="toggleLayerVisibility"]');
        if (inputToggleLayerVis) {
            e.preventDefault();
            e.stopPropagation();
            const layerId = inputToggleLayerVis.getAttribute('data-layer-id');
            if (e.altKey && typeof this.isolateLayer === 'function') {
                this.isolateLayer(layerId);
            } else if (typeof this.toggleLayerVisibility === 'function') {
                const isCheckbox = inputToggleLayerVis.tagName === 'INPUT' && inputToggleLayerVis.type === 'checkbox';
                const visVal = isCheckbox ? inputToggleLayerVis.checked : undefined;
                this.toggleLayerVisibility(layerId, visVal);
            }
            return;
        }

        const layerSelectTarget = e.target.closest('[data-action="selectLayer"]');
        if (layerSelectTarget) {
            e.preventDefault();
            const layerId = layerSelectTarget.getAttribute('data-layer-id');
            if (layerId && typeof this.selectLayer === 'function') {
                this.selectLayer(layerId);
            }
            return;
        }

        const btnOpenOfflineResize = e.target.closest('[data-action="openOfflineResizeModal"]');
        if (btnOpenOfflineResize) {
            e.preventDefault();
            if (typeof this.openOfflineResizeModal === 'function') {
                this.openOfflineResizeModal();
            }
            return;
        }

        const btnOpenOfflineReset = e.target.closest('[data-action="openOfflineResetModal"]');
        if (btnOpenOfflineReset) {
            e.preventDefault();
            if (typeof this.openOfflineResetModal === 'function') {
                this.openOfflineResetModal();
            }
            return;
        }

        const btnGenerateOfflineSnapshot = e.target.closest('[data-action="generateOfflineSnapshot"]');
        if (btnGenerateOfflineSnapshot) {
            e.preventDefault();
            if (typeof this.generateOfflineSnapshot === 'function') {
                this.generateOfflineSnapshot(btnGenerateOfflineSnapshot);
            }
            return;
        }

        const btnOpenAutoOutline = e.target.closest('[data-action="openAutoOutlineModal"]');
        if (btnOpenAutoOutline) {
            e.preventDefault();
            if (typeof this.openAutoOutlineModal === 'function') {
                this.openAutoOutlineModal();
            }
            return;
        }

        const btnTriggerAutoOutline = e.target.closest('[data-action="triggerGenerateAutoOutline"]');
        if (btnTriggerAutoOutline) {
            e.preventDefault();
            if (typeof this.triggerGenerateAutoOutline === 'function') {
                this.triggerGenerateAutoOutline();
            }
            return;
        }

        const outlineOptionLink = e.target.closest('[data-action="selectOutlineColorOption"], [data-action="selectOutlineShapeOption"], [data-action="selectOutlineTargetOption"]');
        if (outlineOptionLink) {
            e.preventDefault();
            if (typeof this.handleSelectOutlineOption === 'function') {
                this.handleSelectOutlineOption(outlineOptionLink);
            }
            return;
        }

        const btnToggleSeamless = e.target.closest('[data-action="toggleSeamlessTile"]');
        if (btnToggleSeamless) {
            e.preventDefault();
            if (typeof this.toggleSeamlessTile === 'function') {
                this.toggleSeamlessTile();
            }
            return;
        }

        const btnShiftTileOffset = e.target.closest('[data-action="shiftTileOffset"]');
        if (btnShiftTileOffset) {
            e.preventDefault();
            if (typeof this.shiftTileOffset === 'function') {
                this.shiftTileOffset();
            }
            return;
        }

        const btnSelectRamp = e.target.closest('[data-action="selectRampColor"]');
        if (btnSelectRamp) {
            e.preventDefault();
            const hex = btnSelectRamp.getAttribute('data-color');
            if (hex && typeof this.selectRampColor === 'function') {
                this.selectRampColor(hex);
            }
            return;
        }

        const btnSetRampPreset = e.target.closest('[data-action="setRampPreset"]');
        if (btnSetRampPreset) {
            e.preventDefault();
            const preset = btnSetRampPreset.getAttribute('data-preset');
            if (preset && typeof this.setRampPreset === 'function') {
                this.setRampPreset(preset);
            }
            return;
        }

        const btnCancelSchedResize = e.target.closest('[data-action="cancelScheduledResize"]');
        if (btnCancelSchedResize) {
            e.preventDefault();
            if (typeof this.cancelScheduledResize === 'function') {
                this.cancelScheduledResize(btnCancelSchedResize);
            }
            return;
        }

        const btnZoomIn = e.target.closest('[data-action="zoomInStep"]');
        if (btnZoomIn) {
            e.preventDefault();
            this.stepZoom(1);
            return;
        }

        const btnZoomOut = e.target.closest('[data-action="zoomOutStep"]');
        if (btnZoomOut) {
            e.preventDefault();
            this.stepZoom(-1);
            return;
        }

        const btnResetZoom = e.target.closest('[data-action="resetZoomFit"]');
        if (btnResetZoom) {
            e.preventDefault();
            if (Math.abs((this.transform?.scale || 1) - 1.0) < 0.05) {
                if (typeof this.centerBoard === 'function') {
                    this.centerBoard();
                    this.requestRender();
                }
            } else {
                this.resetZoomToScale(1.0);
            }
            return;
        }

        const btnShortcuts = e.target.closest('[data-action="openShortcutsHelp"]');
        if (btnShortcuts) {
            e.preventDefault();
            if (typeof this.openShortcutsHelpModal === 'function') {
                this.openShortcutsHelpModal();
            } else if (window.modalSystem) {
                window.modalSystem.show('shortcutsModal', {});
            }
            return;
        }

        const btnRescheduleResize = e.target.closest('[data-action="rescheduleOfflineResize"]');
        if (btnRescheduleResize) {
            e.preventDefault();
            if (typeof this.rescheduleOfflineResize === 'function') {
                this.rescheduleOfflineResize();
            }
            return;
        }

        const btnBackToActiveResize = e.target.closest('[data-action="backToActiveResizeStep"]');
        if (btnBackToActiveResize) {
            e.preventDefault();
            if (typeof this.backToActiveResizeStep === 'function') {
                this.backToActiveResizeStep();
            }
            return;
        }

        const btnCancelSchedReset = e.target.closest('[data-action="cancelScheduledReset"]');
        if (btnCancelSchedReset) {
            e.preventDefault();
            if (typeof this.cancelScheduledReset === 'function') {
                this.cancelScheduledReset(btnCancelSchedReset);
            }
            return;
        }

        const btnRescheduleReset = e.target.closest('[data-action="rescheduleOfflineReset"]');
        if (btnRescheduleReset) {
            e.preventDefault();
            if (typeof this.rescheduleOfflineReset === 'function') {
                this.rescheduleOfflineReset();
            }
            return;
        }

        const btnBackToActiveReset = e.target.closest('[data-action="backToActiveResetStep"]');
        if (btnBackToActiveReset) {
            e.preventDefault();
            if (typeof this.backToActiveResetStep === 'function') {
                this.backToActiveResetStep();
            }
            return;
        }

        const btnSelectResizeTypeOption = e.target.closest('[data-action="selectResizeTypeOption"]') || e.target.closest('[data-action="selectResizeType"]');
        if (btnSelectResizeTypeOption) {
            e.preventDefault();
            if (typeof this.handleSelectResizeTypeOption === 'function') {
                this.handleSelectResizeTypeOption(btnSelectResizeTypeOption);
            } else if (typeof this.handleSelectResizeType === 'function') {
                this.handleSelectResizeType(btnSelectResizeTypeOption);
            }
            return;
        }

        const btnSelectResetTypeOption = e.target.closest('[data-action="selectResetTypeOption"]') || e.target.closest('[data-action="selectResetType"]');
        if (btnSelectResetTypeOption) {
            e.preventDefault();
            if (typeof this.handleSelectResetTypeOption === 'function') {
                this.handleSelectResetTypeOption(btnSelectResetTypeOption);
            } else if (typeof this.handleSelectResetType === 'function') {
                this.handleSelectResetType(btnSelectResetTypeOption);
            }
            return;
        }

        const btnOfflineResizeNext = e.target.closest('[data-action="offlineResizeNextStep"]');
        if (btnOfflineResizeNext) {
            e.preventDefault();
            if (typeof this.handleOfflineResizeStep === 'function') {
                this.handleOfflineResizeStep('next');
            }
            return;
        }

        const btnOfflineResizePrev = e.target.closest('[data-action="offlineResizePrevStep"]');
        if (btnOfflineResizePrev) {
            e.preventDefault();
            if (typeof this.handleOfflineResizeStep === 'function') {
                this.handleOfflineResizeStep('prev');
            }
            return;
        }

        const btnSelectOfflineResizeSize = e.target.closest('[data-action="selectOfflineResizeSize"]');
        if (btnSelectOfflineResizeSize) {
            e.preventDefault();
            if (typeof this.handleOfflineResizeSizeSelect === 'function') {
                this.handleOfflineResizeSizeSelect(btnSelectOfflineResizeSize);
            }
            return;
        }

        const btnSelectScheduledResizeSize = e.target.closest('[data-action="selectScheduledResizeSize"]');
        if (btnSelectScheduledResizeSize) {
            e.preventDefault();
            if (typeof this.handleScheduledResizeSizeSelect === 'function') {
                this.handleScheduledResizeSizeSelect(btnSelectScheduledResizeSize);
            }
            return;
        }

        const toggleSchedResize = e.target.closest('[data-action="toggleScheduledResizeSection"]');
        if (toggleSchedResize) {
            if (typeof this.toggleScheduledResizeSection === 'function') {
                this.toggleScheduledResizeSection(toggleSchedResize);
            }
        }

        const toggleSchedReset = e.target.closest('[data-action="toggleScheduledResetSection"]');
        if (toggleSchedReset) {
            if (typeof this.toggleScheduledResetSection === 'function') {
                this.toggleScheduledResetSection(toggleSchedReset);
            }
        }

        const btnSubmitOfflineResizeUnified = e.target.closest('[data-action="submitOfflineResizeUnified"]');
        if (btnSubmitOfflineResizeUnified) {
            e.preventDefault();
            if (typeof this.executeOfflineResizeUnified === 'function') {
                this.executeOfflineResizeUnified(btnSubmitOfflineResizeUnified);
            }
            return;
        }

        const btnSubmitOfflineResize = e.target.closest('[data-action="submitOfflineResize"]');
        if (btnSubmitOfflineResize) {
            e.preventDefault();
            if (typeof this.executeOfflineResize === 'function') {
                this.executeOfflineResize(btnSubmitOfflineResize);
            }
            return;
        }

        const btnSubmitScheduledResize = e.target.closest('[data-action="submitScheduledResize"]');
        if (btnSubmitScheduledResize) {
            e.preventDefault();
            if (typeof this.executeScheduledResize === 'function') {
                this.executeScheduledResize(btnSubmitScheduledResize);
            }
            return;
        }

        const btnOfflineResetNext = e.target.closest('[data-action="offlineResetNextStep"]');
        if (btnOfflineResetNext) {
            e.preventDefault();
            if (typeof this.handleOfflineResetStep === 'function') {
                this.handleOfflineResetStep('next');
            }
            return;
        }

        const btnOfflineResetPrev = e.target.closest('[data-action="offlineResetPrevStep"]');
        if (btnOfflineResetPrev) {
            e.preventDefault();
            if (typeof this.handleOfflineResetStep === 'function') {
                this.handleOfflineResetStep('prev');
            }
            return;
        }

        const btnSubmitOfflineResetUnified = e.target.closest('[data-action="submitOfflineResetUnified"]');
        if (btnSubmitOfflineResetUnified) {
            e.preventDefault();
            if (typeof this.executeOfflineResetUnified === 'function') {
                this.executeOfflineResetUnified(btnSubmitOfflineResetUnified);
            }
            return;
        }

        const btnSubmitOfflineReset = e.target.closest('[data-action="submitOfflineReset"]');
        if (btnSubmitOfflineReset) {
            e.preventDefault();
            if (typeof this.executeOfflineReset === 'function') {
                this.executeOfflineReset(btnSubmitOfflineReset);
            }
            return;
        }

        const btnSubmitScheduledReset = e.target.closest('[data-action="submitScheduledReset"]');
        if (btnSubmitScheduledReset) {
            e.preventDefault();
            if (typeof this.executeScheduledReset === 'function') {
                this.executeScheduledReset(btnSubmitScheduledReset);
            }
            return;
        }

        const btnOwnerTools = e.target.closest('[data-action="toggleOwnerTools"]');
        if (btnOwnerTools) {
            e.preventDefault();
            this.showOwnerTools = !this.showOwnerTools;
            if (this.showOwnerTools) {
                btnOwnerTools.classList.add('active');
            } else {
                btnOwnerTools.classList.remove('active');
            }
            if (typeof this.updateOwnerBadges === 'function') {
                this.updateOwnerBadges();
            }
            return;
        }

        const btnOwnerEraser = e.target.closest('[data-action="toggleOwnerEraser"]');
        if (btnOwnerEraser) {
            e.preventDefault();
            this.toggleOwnerEraser();
            return;
        }

        const btnOfflineMirror = e.target.closest('[data-action="toggleOfflineMirror"]');
        if (btnOfflineMirror) {
            e.preventDefault();
            this.toggleOfflineMirror();
            return;
        }

        const btnClearArea = e.target.closest('[data-action="executeOwnerClearArea"]');
        if (btnClearArea) {
            e.preventDefault();
            this.executeOwnerClearArea();
            return;
        }

        const btnCancelEraser = e.target.closest('[data-action="cancelOwnerEraser"]');
        if (btnCancelEraser) {
            e.preventDefault();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.updateSelectionUI();
            if (typeof this.updateOwnerEraserFloatingToolbar === 'function') {
                this.updateOwnerEraserFloatingToolbar();
            }
            this.requestRender();
            return;
        }

        const btnOfflineMoveArea = e.target.closest('[data-action="toggleOfflineMoveArea"]');
        if (btnOfflineMoveArea) {
            e.preventDefault();
            this.toggleOfflineMoveArea();
            return;
        }

        const btnConfirmMove = e.target.closest('[data-action="commitMoveArea"]') || e.target.closest('[data-action="confirmMoveArea"]');
        if (btnConfirmMove) {
            e.preventDefault();
            this.commitMoveArea();
            return;
        }

        const btnCancelMove = e.target.closest('[data-action="cancelMoveArea"]');
        if (btnCancelMove) {
            e.preventDefault();
            this.cancelMoveArea();
            return;
        }

        const btnFloatSelection = e.target.closest('[data-action="floatSelection"]');
        if (btnFloatSelection) {
            e.preventDefault();
            if (typeof this.floatSelection === 'function') {
                this.floatSelection(false);
            }
            return;
        }

        const btnCopySelection = e.target.closest('[data-action="copySelection"]');
        if (btnCopySelection) {
            e.preventDefault();
            if (typeof this.copySelection === 'function') {
                this.copySelection();
            }
            return;
        }

        const btnCutSelection = e.target.closest('[data-action="cutSelection"]');
        if (btnCutSelection) {
            e.preventDefault();
            if (typeof this.cutSelection === 'function') {
                this.cutSelection();
            }
            return;
        }

        const btnDeleteSelection = e.target.closest('[data-action="deleteSelection"]');
        if (btnDeleteSelection) {
            e.preventDefault();
            if (typeof this.deleteSelection === 'function') {
                this.deleteSelection();
            }
            return;
        }

        const btnClearSelection = e.target.closest('[data-action="clearSelection"]');
        if (btnClearSelection) {
            e.preventDefault();
            if (typeof this.clearSelection === 'function') {
                this.clearSelection();
            }
            return;
        }

        const btnOfflineBrush = e.target.closest('[data-action="toggleOfflineBrush"]');
        if (btnOfflineBrush) {
            e.preventDefault();
            this.toggleOfflineBrush();
            return;
        }

        const btnSetBrushShape = e.target.closest('[data-action="setBrushShape"]');
        if (btnSetBrushShape) {
            e.preventDefault();
            const shape = btnSetBrushShape.getAttribute('data-brush-shape') || 'square';
            this.setBrushShape(shape, btnSetBrushShape);
            return;
        }

        const btnSetBrushSizeNew = e.target.closest('[data-action="setBrushSize"]');
        if (btnSetBrushSizeNew) {
            e.preventDefault();
            const size = parseInt(btnSetBrushSizeNew.getAttribute('data-size'), 10) || 1;
            this.setBrushSize(size, btnSetBrushSizeNew);
            return;
        }

        const btnStabilizerPreset = e.target.closest('[data-action="setStabilizerPreset"]');
        if (btnStabilizerPreset) {
            e.preventDefault();
            const stab = parseInt(btnStabilizerPreset.getAttribute('data-stabilizer'), 10) || 0;
            if (typeof this.setStabilizerRange === 'function') {
                this.setStabilizerRange(stab);
            }
            return;
        }

        const btnSpraySize = e.target.closest('[data-action="setSpraySizeRange"]');
        if (btnSpraySize) {
            e.preventDefault();
            const size = parseInt(btnSpraySize.getAttribute('data-size'), 10) || 5;
            if (typeof this.setSpraySizeRange === 'function') {
                this.setSpraySizeRange(size);
            }
            return;
        }

        const btnPixelPerfect = e.target.closest('[data-action="togglePixelPerfect"]');
        if (btnPixelPerfect) {
            e.preventDefault();
            if (typeof this.togglePixelPerfect === 'function') {
                this.togglePixelPerfect();
            }
            return;
        }

        const btnOfflineQuickShapes = e.target.closest('[data-action="toggleOfflineQuickShapes"]');
        if (btnOfflineQuickShapes) {
            e.preventDefault();
            if (typeof this.toggleOfflineQuickShapes === 'function') {
                this.toggleOfflineQuickShapes();
            }
            return;
        }

        const btnSetQuickShapeType = e.target.closest('[data-action="setQuickShapeType"]');
        if (btnSetQuickShapeType) {
            e.preventDefault();
            const shapeType = btnSetQuickShapeType.getAttribute('data-shape-type') || 'line';
            if (typeof this.setQuickShapeType === 'function') {
                this.setQuickShapeType(shapeType, btnSetQuickShapeType);
            }
            return;
        }

        const btnToggleQuickShapeFill = e.target.closest('[data-action="toggleQuickShapeFill"]');
        if (btnToggleQuickShapeFill) {
            e.preventDefault();
            if (typeof this.toggleQuickShapeFill === 'function') {
                this.toggleQuickShapeFill(btnToggleQuickShapeFill);
            }
            return;
        }

        const btnSetQuickShapeStroke = e.target.closest('[data-action="setQuickShapeStroke"]');
        if (btnSetQuickShapeStroke) {
            e.preventDefault();
            const stroke = parseInt(btnSetQuickShapeStroke.getAttribute('data-size'), 10) || 1;
            if (typeof this.setQuickShapeStroke === 'function') {
                this.setQuickShapeStroke(stroke, btnSetQuickShapeStroke);
            }
            return;
        }

        const btnSetMirrorMode = e.target.closest('[data-action="setOfflineMirrorMode"]');
        if (btnSetMirrorMode) {
            e.preventDefault();
            const axis = btnSetMirrorMode.getAttribute('data-mirror-axis') || 'x';
            if (typeof this.setOfflineMirrorMode === 'function') {
                this.setOfflineMirrorMode(axis, btnSetMirrorMode);
            }
            return;
        }

        const btnOfflineBucket = e.target.closest('[data-action="toggleOfflineBucket"]');
        if (btnOfflineBucket) {
            e.preventDefault();
            this.toggleOfflineBucket();
            return;
        }

        const btnSetBucketMode = e.target.closest('[data-action="setOfflineBucketMode"]');
        if (btnSetBucketMode) {
            e.preventDefault();
            const mode = btnSetBucketMode.getAttribute('data-bucket-mode') || 'flood';
            if (typeof this.setOfflineBucketMode === 'function') {
                this.setOfflineBucketMode(mode, btnSetBucketMode);
            }
            return;
        }

        const btnOfflineSpray = e.target.closest('[data-action="toggleOfflineSpray"]');
        if (btnOfflineSpray) {
            e.preventDefault();
            this.toggleOfflineSpray();
            return;
        }

        const btnOfflineEraser = e.target.closest('[data-action="toggleOfflineEraser"]');
        if (btnOfflineEraser) {
            e.preventDefault();
            this.toggleOfflineEraser();
            return;
        }

        const btnSetEraserMode = e.target.closest('[data-action="setOfflineEraserMode"]');
        if (btnSetEraserMode) {
            e.preventDefault();
            const mode = btnSetEraserMode.getAttribute('data-eraser-mode') || 'box';
            if (typeof this.setOfflineEraserMode === 'function') {
                this.setOfflineEraserMode(mode);
            }
            return;
        }

        const btnSetBrushSize = e.target.closest('[data-action="setBrushEraserSize"]');
        if (btnSetBrushSize) {
            e.preventDefault();
            const size = btnSetBrushSize.getAttribute('data-size') || '1';
            if (typeof this.setBrushEraserSize === 'function') {
                this.setBrushEraserSize(size);
            }
            return;
        }

        const btnSetSpraySize = e.target.closest('[data-action="setSpraySize"]');
        if (btnSetSpraySize) {
            e.preventDefault();
            const size = btnSetSpraySize.getAttribute('data-size') || '5';
            if (typeof this.setSpraySize === 'function') {
                this.setSpraySize(size);
            }
            return;
        }

        const btnToggleDither = e.target.closest('[data-action="toggleOfflineDither"]');
        if (btnToggleDither) {
            e.preventDefault();
            if (typeof this.toggleOfflineDither === 'function') {
                this.toggleOfflineDither();
            }
            return;
        }

        const btnSetDitherPattern = e.target.closest('[data-action="setDitherPattern"]');
        if (btnSetDitherPattern) {
            e.preventDefault();
            const pattern = btnSetDitherPattern.getAttribute('data-dither-pattern') || 'checker_50';
            if (typeof this.setDitherPattern === 'function') {
                this.setDitherPattern(pattern);
            }
            return;
        }

        const btnSetDitherSize = e.target.closest('[data-action="setDitherSize"]');
        if (btnSetDitherSize) {
            e.preventDefault();
            const size = btnSetDitherSize.getAttribute('data-size') || '1';
            if (typeof this.setDitherSize === 'function') {
                this.setDitherSize(size);
            }
            return;
        }

        const btnOfflineShading = e.target.closest('[data-action="toggleOfflineShading"]');
        if (btnOfflineShading) {
            e.preventDefault();
            this.toggleOfflineShading();
            return;
        }

        const btnSetShadingMode = e.target.closest('[data-action="setShadingMode"]');
        if (btnSetShadingMode) {
            e.preventDefault();
            const mode = btnSetShadingMode.getAttribute('data-shading-mode') || 'shadow';
            this.setShadingMode(mode, btnSetShadingMode);
            return;
        }

        const btnSetShadingSize = e.target.closest('[data-action="setShadingSize"]');
        if (btnSetShadingSize) {
            e.preventDefault();
            const size = parseInt(btnSetShadingSize.getAttribute('data-size'), 10) || 1;
            this.setShadingSize(size, btnSetShadingSize);
            return;
        }

        const btnTileGrid = e.target.closest('[data-action="toggleTileGrid"]');
        if (btnTileGrid) {
            e.preventDefault();
            this.toggleTileGrid();
            return;
        }

        const btnSetTileGridLevel = e.target.closest('[data-action="setTileGridLevel"]');
        if (btnSetTileGridLevel) {
            e.preventDefault();
            const size = parseInt(btnSetTileGridLevel.getAttribute('data-grid-size'), 10) || 0;
            this.setTileGridLevel(size, btnSetTileGridLevel);
            return;
        }



        const btnJoin = e.target.closest('[data-action="joinCanvasDirectly"]');
        const btnReqAccess = e.target.closest('[data-action="requestCanvasAccess"]');

        if (btnJoin || btnReqAccess) {
            e.preventDefault();
            if (typeof this.handleAccessRequest === 'function') {
                this.handleAccessRequest(btnJoin || btnReqAccess);
            }
            return;
        }

        const imgAdd = e.target.closest('[data-action="addTemplateToCanvas"]');
        if (imgAdd) {
            e.preventDefault();
            if (this.isResetLocked || this.isResizeLocked) {
                showMessage(__('err_canvas_locked'), 'warning');
                return;
            }
            const url = imgAdd.getAttribute('data-url');
            if (typeof this.addTemplateFromLibrary === 'function') {
                this.addTemplateFromLibrary(url);
            }
            return;
        }

        const btnAddSticker = e.target.closest('[data-action="addStickerToCanvas"]');
        if (btnAddSticker) {
            e.preventDefault();
            if (this.isResetLocked || this.isResizeLocked) {
                showMessage(__('err_canvas_locked'), 'warning');
                return;
            }
            const stickerId = btnAddSticker.getAttribute('data-sticker-id');
            const name = btnAddSticker.getAttribute('data-tooltip') || 'Figura';
            if (stickerId && typeof this.addStickerToCanvas === 'function') {
                this.addStickerToCanvas(stickerId, null, name);
            }
            return;
        }

        const btnFilterCat = e.target.closest('[data-action="filterStickerCategory"]');
        if (btnFilterCat) {
            e.preventDefault();
            const category = btnFilterCat.getAttribute('data-category') || 'all';
            const container = document.querySelector('[data-ref="stickers-categories"]');
            if (container) {
                container.querySelectorAll('.component-sticker-cat-pill').forEach(btn => btn.classList.remove('active'));
            }
            btnFilterCat.classList.add('active');

            const grid = document.querySelector('[data-ref="stickers-grid"]');
            if (grid) {
                const cards = grid.querySelectorAll('.component-sticker-card');
                cards.forEach(card => {
                    const cardCat = card.getAttribute('data-sticker-category');
                    if (category === 'all' || cardCat === category) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
            return;
        }

        const btnOpenShapeCategory = e.target.closest('[data-action="openShapeCategoryMenu"]');
        if (btnOpenShapeCategory) {
            e.preventDefault();
            const catKey = btnOpenShapeCategory.getAttribute('data-category');
            if (catKey) {
                const moduleEl = document.querySelector('[data-module="moduleDesignTools"]');
                if (moduleEl) {
                    moduleEl.querySelectorAll('.component-menu').forEach(m => {
                        m.classList.remove('active');
                        m.classList.add('disabled');
                    });
                    const targetMenu = moduleEl.querySelector(`[data-ref="menu-shapes-${catKey}"]`);
                    if (targetMenu) {
                        targetMenu.classList.remove('disabled');
                        targetMenu.classList.add('active');
                    }
                }
            }
            return;
        }

        const btnBackShapesMain = e.target.closest('[data-action="backToShapesMainMenu"]');
        if (btnBackShapesMain) {
            e.preventDefault();
            const moduleEl = document.querySelector('[data-module="moduleDesignTools"]');
            if (moduleEl) {
                moduleEl.querySelectorAll('.component-menu').forEach(m => {
                    m.classList.remove('active');
                    m.classList.add('disabled');
                });
                const mainMenu = moduleEl.querySelector('[data-ref="menu-shapes"]');
                if (mainMenu) {
                    mainMenu.classList.remove('disabled');
                    mainMenu.classList.add('active');
                }
            }
            return;
        }

        const btnSelectShape = e.target.closest('[data-action="selectGeometricShape"]');
        if (btnSelectShape) {
            e.preventDefault();
            const shapeId = btnSelectShape.getAttribute('data-shape-id');
            if (shapeId && typeof this.selectGeometricShape === 'function') {
                this.selectGeometricShape(shapeId, btnSelectShape);
            }
            return;
        }

        const btnSetShapeFill = e.target.closest('[data-action="setGeometricShapeFill"]');
        if (btnSetShapeFill) {
            e.preventDefault();
            const isFill = btnSetShapeFill.getAttribute('data-fill') === '1';
            if (typeof this.setGeometricShapeFill === 'function') {
                this.setGeometricShapeFill(isFill, btnSetShapeFill);
            }
            return;
        }

        const btnToggleOfflineText = e.target.closest('[data-action="toggleOfflineText"]');
        if (btnToggleOfflineText) {
            e.preventDefault();
            if (typeof this.toggleOfflineText === 'function') {
                this.toggleOfflineText();
            }
            return;
        }

        const btnCycleFont = e.target.closest('[data-action="cyclePixelFont"]');
        if (btnCycleFont) {
            e.preventDefault();
            if (typeof this.cyclePixelFont === 'function') {
                this.cyclePixelFont();
            }
            return;
        }

        const btnCycleTextScale = e.target.closest('[data-action="cyclePixelTextScale"]');
        if (btnCycleTextScale) {
            e.preventDefault();
            if (typeof this.cyclePixelTextScale === 'function') {
                this.cyclePixelTextScale();
            }
            return;
        }

        const btnSelectFont = e.target.closest('[data-action="selectPixelFont"]');
        if (btnSelectFont) {
            e.preventDefault();
            const fontId = btnSelectFont.getAttribute('data-font-id');
            if (fontId && typeof this.selectPixelFont === 'function') {
                this.selectPixelFont(fontId, btnSelectFont);
            }
            return;
        }

        const btnSetTextScale = e.target.closest('[data-action="setPixelTextScale"]');
        if (btnSetTextScale) {
            e.preventDefault();
            const scale = parseInt(btnSetTextScale.getAttribute('data-scale'), 10) || 1;
            if (typeof this.setPixelTextScale === 'function') {
                this.setPixelTextScale(scale, btnSetTextScale);
            }
            return;
        }

        const btnToggleOutline = e.target.closest('[data-action="togglePixelTextOutline"]');
        if (btnToggleOutline) {
            e.preventDefault();
            if (typeof this.togglePixelTextOutline === 'function') {
                this.togglePixelTextOutline(btnToggleOutline);
            }
            return;
        }

        const btnToggleShadow = e.target.closest('[data-action="togglePixelTextShadow"]');
        if (btnToggleShadow) {
            e.preventDefault();
            if (typeof this.togglePixelTextShadow === 'function') {
                this.togglePixelTextShadow(btnToggleShadow);
            }
            return;
        }

        const btnCommitText = e.target.closest('[data-action="commitPixelText"]');
        if (btnCommitText) {
            e.preventDefault();
            if (typeof this.commitPixelText === 'function') {
                this.commitPixelText();
            }
            return;
        }

        const btnCancelText = e.target.closest('[data-action="cancelPixelText"]');
        if (btnCancelText) {
            e.preventDefault();
            if (typeof this.cancelPixelText === 'function') {
                this.cancelPixelText();
            }
            return;
        }

        const btnDelServer = e.target.closest('[data-action="deleteServerTemplate"]');
        if (btnDelServer) {
            e.preventDefault();
            e.stopPropagation(); 
            const id = btnDelServer.getAttribute('data-id');
            if (window.modalSystem) {
                window.modalSystem.show('confirmDeleteTemplateModal', { templateId: id });
            }
            return;
        }

        const btnConfirmDel = e.target.closest('[data-action="confirmDeleteTemplate"]');
        if (btnConfirmDel) {
            e.preventDefault();
            const id = btnConfirmDel.getAttribute('data-id');
            if (typeof this.deleteServerTemplate === 'function') {
                this.deleteServerTemplate(id, btnConfirmDel);
            }
            return;
        }

        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return; 

        const btnUpload = e.target.closest('[data-action="triggerTemplateUpload"]');
        if (btnUpload && this.fileInput) {
            e.preventDefault();
            this.fileInput.click();
            return;
        }

        const cardTemplate = e.target.closest('[data-action="selectTemplate"]');
        if (cardTemplate && !e.target.closest('.component-template-action-btn')) {
            const id = cardTemplate.getAttribute('data-id');
            if (this.liveShareStatus === 'spectator' && this.liveTemplateId === id) {
                showMessage(__('info_template_live'), 'info');
                return;
            }
            if (typeof this.toggleTemplate === 'function') {
                this.toggleTemplate(id);
            }
            return;
        }

        const btnLock = e.target.closest('[data-action="toggleTemplateLock"]');
        if (btnLock) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.toggleTemplateLock === 'function') {
                this.toggleTemplateLock();
            }
            return;
        }

        const btnUnlockTop = e.target.closest('[data-action="unlockTemplateTop"]');
        if (btnUnlockTop) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.unlockTemplateTop === 'function') {
                this.unlockTemplateTop();
            }
            return;
        }
        
        const btnRotate = e.target.closest('[data-action="rotateTemplate"]');
        if (btnRotate) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.rotateTemplate === 'function') {
                this.rotateTemplate();
            }
            return;
        }

        const btnFlipH = e.target.closest('[data-action="flipTemplateH"]');
        if (btnFlipH) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.flipTemplateH === 'function') {
                this.flipTemplateH();
            }
            return;
        }

        const btnFlipV = e.target.closest('[data-action="flipTemplateV"]');
        if (btnFlipV) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.flipTemplateV === 'function') {
                this.flipTemplateV();
            }
            return;
        }

        const btnSelMode = e.target.closest('[data-action="setSelectionMode"]');
        if (btnSelMode) {
            e.preventDefault();
            e.stopPropagation();
            const mode = btnSelMode.getAttribute('data-selection-mode') || 'box';
            if (typeof this.setSelectionMode === 'function') {
                this.setSelectionMode(mode);
            }
            return;
        }

        const btnInject = e.target.closest('[data-action="injectTemplate"]');
        if (btnInject) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.injectTemplate === 'function') {
                this.injectTemplate();
            }
            return;
        }

        const btnDelete = e.target.closest('[data-action="deleteTemplate"]');
        if (btnDelete) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.deleteTemplate === 'function') {
                this.deleteTemplate();
            }
            return;
        }

        const btnPlace = e.target.closest('[data-action="placePixels"]');
        if (btnPlace) {
            e.preventDefault();
            this.placePixels();
            return;
        }

        const btnSwapColors = e.target.closest('[data-action="swapPrimarySecondaryColors"]');
        if (btnSwapColors) {
            e.preventDefault();
            this.swapPrimarySecondaryColors();
            return;
        }

        const btnResetColors = e.target.closest('[data-action="resetDefaultColors"]');
        if (btnResetColors) {
            e.preventDefault();
            this.resetDefaultColors();
            return;
        }

        const btnSelectSlot = e.target.closest('[data-action="selectActiveColorSlot"]');
        if (btnSelectSlot) {
            e.preventDefault();
            const slot = btnSelectSlot.getAttribute('data-slot') || 'primary';
            this.selectActiveColorSlot(slot);
            return;
        }

        const btnOpenToolSettings = e.target.closest('[data-action="openToolSettings"]');
        if (btnOpenToolSettings) {
            e.preventDefault();
            this.openSidebarTab('tool');
            return;
        }

        const btnOpenLayersTab = e.target.closest('[data-action="openLayersTab"]');
        if (btnOpenLayersTab) {
            e.preventDefault();
            this.openSidebarTab('layers');
            return;
        }

        const btnOpenMinimapTab = e.target.closest('[data-action="openMinimapTab"]');
        if (btnOpenMinimapTab) {
            e.preventDefault();
            this.openSidebarTab('minimap');
            return;
        }

        const btnToggleSidebar = e.target.closest('[data-action="toggleUnifiedSidebar"]');
        if (btnToggleSidebar) {
            e.preventDefault();
            this.toggleUnifiedSidebar();
            return;
        }

        const btnSwitchTab = e.target.closest('[data-action="switchSidebarTab"]');
        if (btnSwitchTab) {
            e.preventDefault();
            const tab = btnSwitchTab.getAttribute('data-tab') || 'layers';
            this.switchUnifiedSidebarTab(tab);
            return;
        }

        const btnScrollToolsLeft = e.target.closest('[data-action="scrollToolsLeft"]');
        if (btnScrollToolsLeft) {
            e.preventDefault();
            const toolbar = document.querySelector('[data-ref="offline-tools-horizontal"]');
            if (toolbar) toolbar.scrollBy({ left: -160, behavior: 'smooth' });
            return;
        }

        const btnScrollToolsRight = e.target.closest('[data-action="scrollToolsRight"]');
        if (btnScrollToolsRight) {
            e.preventDefault();
            const toolbar = document.querySelector('[data-ref="offline-tools-horizontal"]');
            if (toolbar) toolbar.scrollBy({ left: 160, behavior: 'smooth' });
            return;
        }

        const btnAlphaLock = e.target.closest('[data-action="toggleAlphaLock"]');
        if (btnAlphaLock) {
            e.preventDefault();
            this.toggleAlphaLock();
            return;
        }

        const btnMirrorAxis = e.target.closest('[data-action="toggleOfflineMirrorAxis"]');
        if (btnMirrorAxis) {
            e.preventDefault();
            const axis = btnMirrorAxis.getAttribute('data-axis') || 'x';
            this.toggleOfflineMirrorAxis(axis);
            return;
        }

        const btnTriggerRefUpload = e.target.closest('[data-action="triggerReferenceUpload"]');
        if (btnTriggerRefUpload) {
            e.preventDefault();
            const fileInput = document.querySelector('[data-ref="reference-file-input"]');
            if (fileInput) fileInput.click();
            return;
        }

        const btnClearRef = e.target.closest('[data-action="clearReferenceImage"]');
        if (btnClearRef) {
            e.preventDefault();
            this.clearReferenceImage();
            return;
        }

        const btnColor = e.target.closest('[data-action="selectColor"]');
        if (btnColor) {
            e.preventDefault();
            const hex = (btnColor.getAttribute('data-color') || '#000000').toUpperCase();
            if (this.activeColorSlot === 'secondary') {
                this.secondaryColor = hex;
            } else {
                this.primaryColor = hex;
            }
            this.currentColor = hex;
            
            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
                this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
            }
            
            this.updateDualColorSwatchesUI();
            this.updateActiveColorPreview();
            this.syncActiveColorHighlight();
            if (typeof this.renderShadingRamps === 'function') {
                this.renderShadingRamps(this.currentColor);
            }

            // Si hay una figura activa flotante en el lienzo, actualizar su color en tiempo real
            const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
            if (activeTpl && activeTpl.isShape && typeof this.refreshShapeTemplateColor === 'function') {
                this.refreshShapeTemplateColor(activeTpl, this.currentColor);
            }

            this.requestRender();
            return;
        }
    },

    handleKeyDown(e) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        // Prevent spamming when holding down a key
        if (e.repeat) return;

        // Skip shortcuts if user is typing in inputs or textareas
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;

        // Allow Ctrl+S / Cmd+S for offline saving
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            if (this.isOfflineMode) {
                e.preventDefault();
                if (typeof this.manualSaveOffline === 'function') {
                    this.manualSaveOffline();
                } else if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(true);
                }
                return;
            }
        }

        // Allow Ctrl+Z / Cmd+Z (Undo) and Ctrl+Y / Cmd+Y / Ctrl+Shift+Z (Redo) in offline mode
        if (this.isOfflineMode && (e.ctrlKey || e.metaKey) && !e.altKey) {
            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (typeof this.redo === 'function') this.redo();
                } else {
                    if (typeof this.undo === 'function') this.undo();
                }
                return;
            } else if (e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                if (typeof this.redo === 'function') this.redo();
                return;
            }

            // Selection clipboard shortcuts (only when a mask is active)
            const hasSelection = this.activeSelectionPixels && this.activeSelectionPixels.length > 0;
            if (e.key === 'c' || e.key === 'C') {
                if (hasSelection && typeof this.copySelection === 'function') {
                    e.preventDefault();
                    this.copySelection();
                    return;
                }
            } else if (e.key === 'x' || e.key === 'X') {
                if (hasSelection && typeof this.cutSelection === 'function') {
                    e.preventDefault();
                    this.cutSelection();
                    return;
                }
            } else if (e.key === 'd' || e.key === 'D') {
                if (hasSelection && typeof this.clearSelection === 'function') {
                    e.preventDefault();
                    this.clearSelection();
                    return;
                }
            }
        }

        // Atajos estándar de Zoom tipo Figma / Photoshop: Ctrl/Cmd + (+, -, 0, 1)
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '+' || e.key === '=' || e.key === 'Add') {
                e.preventDefault();
                this.stepZoom(1);
                return;
            } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
                e.preventDefault();
                this.stepZoom(-1);
                return;
            } else if (e.key === '0') {
                e.preventDefault();
                if (typeof this.centerBoard === 'function') {
                    this.centerBoard();
                    this.requestRender();
                }
                return;
            } else if (e.key === '1') {
                e.preventDefault();
                this.resetZoomToScale(1.0);
                return;
            }
        }
        
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        
        if (e.key === 'Escape') {
            if (this.isShapeDrawing) {
                this.isShapeDrawing = false;
                this.shapeStart = null;
                this.shapeCurrent = null;
                this.shapePreviewPixels = null;
                if (typeof this.requestRender === 'function') this.requestRender();
                return;
            }
            if (this.interactionMode === 'offline_shape') {
                this.deactivateGeometricShapeMode();
                return;
            }
            if (this.interactionMode === 'offline_text') {
                this.cancelPixelText();
                return;
            }
            if (this.interactionMode === 'offline_moving_area') {
                if (this.activeSelectionPixels && this.activeSelectionPixels.length > 0 && typeof this.clearSelection === 'function') {
                    this.clearSelection();
                }
                this.cancelMoveArea();
            } else if (this.interactionMode !== 'normal') {
                this.cancelInteractionMode();
            } else {
                if (this.activeSelectionPixels && this.activeSelectionPixels.length > 0 && typeof this.clearSelection === 'function') {
                    this.clearSelection();
                }
                this.isSelecting = false;
                this.selectedPixels.clear();
                this.ownerEraserBox = null;
                this.ownerEraserStep = 0;
                this.ownerEraserStart = null;
                this.updateSelectionUI();
                if (typeof this.updateOwnerBadges === 'function') this.updateOwnerBadges();
                if (typeof this.requestRender === 'function') this.requestRender();
            }
            return;
        }

        if (e.key === 'Enter') {
            if (this.interactionMode === 'offline_text') {
                e.preventDefault();
                this.commitPixelText();
                return;
            }
            if (this.interactionMode === 'offline_moving_area' && this.moveAreaBox) {
                e.preventDefault();
                this.commitMoveArea();
                return;
            }
            if (this.activeTemplateId && typeof this.injectTemplate === 'function') {
                const tpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
                if (tpl && tpl.isSelection) {
                    e.preventDefault();
                    this.injectTemplate();
                    return;
                }
            }
            if (this.isOfflineMode && this.interactionMode === 'owner_erasing' && this.ownerEraserBox) {
                e.preventDefault();
                this.executeOwnerClearArea();
                return;
            }
        }

        if (this.interactionMode === 'offline_text' && this.textPosition && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.textPosition.y = Math.max(0, this.textPosition.y - 1);
                this.updatePixelTextPreview();
                return;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.textPosition.y = Math.min((this.boardHeight || 64) - 1, this.textPosition.y + 1);
                this.updatePixelTextPreview();
                return;
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.textPosition.x = Math.max(0, this.textPosition.x - 1);
                this.updatePixelTextPreview();
                return;
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.textPosition.x = Math.min((this.boardWidth || 64) - 1, this.textPosition.x + 1);
                this.updatePixelTextPreview();
                return;
            }
        }

        const keyUpper = e.key.toUpperCase();

        if (keyUpper === 'X') {
            if (this.isOfflineMode && typeof this.swapPrimarySecondaryColors === 'function') {
                e.preventDefault();
                this.swapPrimarySecondaryColors();
            }
        } else if (keyUpper === 'D') {
            if (this.isOfflineMode && typeof this.resetDefaultColors === 'function') {
                e.preventDefault();
                this.resetDefaultColors();
            }
        } else if (keyUpper === 'L') {
            if (this.isOfflineMode && typeof this.toggleUnifiedSidebar === 'function') {
                e.preventDefault();
                this.toggleUnifiedSidebar();
            }
        } else if (keyUpper === 'M') {
            if (this.isOfflineMode && typeof this.toggleOfflineMoveArea === 'function') {
                e.preventDefault();
                this.toggleOfflineMoveArea();
                if (this.interactionMode === 'offline_moving_area' && typeof this.setSelectionMode === 'function') {
                    this.setSelectionMode('box');
                }
            }
        } else if (keyUpper === 'Q') {
            if (this.isOfflineMode) {
                e.preventDefault();
                if (this.interactionMode !== 'offline_moving_area' && typeof this.toggleOfflineMoveArea === 'function') {
                    this.toggleOfflineMoveArea();
                }
                if (typeof this.setSelectionMode === 'function') {
                    this.setSelectionMode('lasso');
                }
            }
        } else if (keyUpper === 'W') {
            if (this.isOfflineMode) {
                e.preventDefault();
                if (this.interactionMode !== 'offline_moving_area' && typeof this.toggleOfflineMoveArea === 'function') {
                    this.toggleOfflineMoveArea();
                }
                if (typeof this.setSelectionMode === 'function') {
                    this.setSelectionMode('wand');
                }
            }
        } else if (keyUpper === 'V') {
            if (this.activeTemplateId && typeof this.flipTemplateV === 'function') {
                e.preventDefault();
                this.flipTemplateV();
            } else if (this.isOfflineMode) {
                const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-shapes"]');
                if (btn && !btn.classList.contains('disabled')) {
                    e.preventDefault();
                    btn.click();
                }
            }
        } else if (keyUpper === 'Y') {
            if (this.isOfflineMode && typeof this.toggleOfflineText === 'function') {
                e.preventDefault();
                this.toggleOfflineText();
            }
        } else if (keyUpper === 'J') {
            const btn = document.querySelector('[data-action="openJoinLiveModal"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'S') {
            if (this.isOfflineMode && typeof this.toggleOfflineShading === 'function') {
                e.preventDefault();
                this.toggleOfflineShading();
            } else {
                const btn = document.querySelector('[data-action="toggleLiveBroadcast"]');
                if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
            }
        } else if (keyUpper === 'I') {
            if (typeof this.toggleEyedropper === 'function') {
                e.preventDefault();
                this.toggleEyedropper();
            }
        } else if (keyUpper === 'C') {
            const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-colors"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'T') {
            const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-templates"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'F') {
            if (this.isOfflineMode) {
                const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-stickers"]');
                if (btn && !btn.classList.contains('disabled')) { 
                    e.preventDefault(); 
                    if (typeof this.loadStickersLibrary === 'function') {
                        this.loadStickersLibrary();
                    }
                    btn.click(); 
                }
            }
        } else if (keyUpper === 'O') {
            const btn = document.querySelector('[data-action="toggleOwnerTools"]');
            if (btn && !btn.classList.contains('disabled') && !btn.classList.contains('disabled-interaction')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'E') {
            if (this.isOfflineMode && typeof this.toggleOfflineEraser === 'function') {
                e.preventDefault();
                this.toggleOfflineEraser();
            }
        } else if (keyUpper === 'G') {
            if (this.isOfflineMode && typeof this.toggleOfflineBucket === 'function') {
                e.preventDefault();
                this.toggleOfflineBucket();
            }
        } else if (keyUpper === 'A') {
            if (this.isOfflineMode && typeof this.toggleOfflineSpray === 'function') {
                e.preventDefault();
                this.toggleOfflineSpray();
            }
        } else if (keyUpper === 'D') {
            if (this.isOfflineMode && typeof this.toggleOfflineDither === 'function') {
                e.preventDefault();
                this.toggleOfflineDither();
            }
        } else if (keyUpper === 'L') {
            if (this.isOfflineMode && typeof this.toggleLayersPanel === 'function') {
                e.preventDefault();
                this.toggleLayersPanel();
            }
        } else if (keyUpper === 'H') {
            if (this.activeTemplateId && typeof this.flipTemplateH === 'function') {
                e.preventDefault();
                this.flipTemplateH();
            } else {
                const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-chat"]');
                if (btn && !btn.classList.contains('disabled') && !btn.classList.contains('disabled-interaction')) {
                    e.preventDefault();
                    btn.click();
                    setTimeout(() => {
                        const chatInput = document.querySelector('[data-ref="chat-input-message"]');
                        if (chatInput && chatInput.offsetParent !== null) {
                            chatInput.focus();
                        }
                    }, 100);
                }
            }
        } else if (keyUpper === 'U') {
            e.preventDefault();
            if (this.isOfflineMode && typeof this.toggleOfflineQuickShapes === 'function') {
                this.toggleOfflineQuickShapes();
                return;
            }
            if (this.activeTemplateId) {
                const tpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
                if (tpl && !tpl.locked) {
                    if (typeof this.toggleTemplateLock === 'function') {
                        this.toggleTemplateLock();
                        return;
                    }
                }
            }
            const btn = document.querySelector('[data-action="unlockTemplateTop"]');
            if (btn && !btn.classList.contains('disabled')) { btn.click(); }
        } else if (keyUpper === 'R') {
            if (typeof this.rotateTemplate === 'function') { e.preventDefault(); this.rotateTemplate(); }
        } else if (keyUpper === 'B') {
            e.preventDefault();
            if (this.activeTemplateId && typeof this.injectTemplate === 'function') {
                this.injectTemplate();
            } else if (this.isOfflineMode && typeof this.toggleOfflineBrush === 'function') {
                this.toggleOfflineBrush();
            }
        } else if (keyUpper === 'Z' && !e.ctrlKey && !e.metaKey) {
            if (this.isOfflineMode && typeof this.toggleTileGrid === 'function') {
                e.preventDefault();
                this.toggleTileGrid();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.activeSelectionPixels && this.activeSelectionPixels.length > 0 && typeof this.deleteSelection === 'function') {
                e.preventDefault();
                this.deleteSelection();
            } else if (this.activeTemplateId && typeof this.deleteTemplate === 'function') {
                e.preventDefault();
                this.deleteTemplate();
            } else if (this.isOfflineMode && this.interactionMode === 'owner_erasing' && this.ownerEraserBox) {
                e.preventDefault();
                this.executeOwnerClearArea();
            }
        } else if (e.key === '[' || e.key === ']') {
            if (this.isOfflineMode) {
                if (e.shiftKey || e.altKey) {
                    e.preventDefault();
                    if (typeof this.stepColorRamp === 'function') {
                        this.stepColorRamp(e.key === ']' ? 1 : -1);
                    }
                } else if (typeof this.stepActiveToolSize === 'function') {
                    e.preventDefault();
                    this.stepActiveToolSize(e.key === ']' ? 1 : -1);
                }
            }
        } else if (keyUpper === 'T' && (e.shiftKey || e.altKey)) {
            if (this.isOfflineMode && typeof this.toggleSeamlessTile === 'function') {
                e.preventDefault();
                this.toggleSeamlessTile();
            }
        } else if (keyUpper === 'O' && (e.shiftKey || e.altKey)) {
            if (this.isOfflineMode && typeof this.openAutoOutlineModal === 'function') {
                e.preventDefault();
                this.openAutoOutlineModal();
            }
        }
    },

    handleWheel(e) {
        const horizToolsToolbar = e.target.closest('.canvas-design-toolbar-horizontal');
        if (horizToolsToolbar) {
            e.preventDefault();
            horizToolsToolbar.scrollLeft += e.deltaY;
            if (this.horizontalToolsCarouselController) {
                this.horizontalToolsCarouselController.updateButtons();
            }
            return;
        }

        const topBar = e.target.closest('.canvas-top-property-bar, .canvas-design-toolbar');
        if (topBar) {
            e.preventDefault();
            topBar.scrollLeft += e.deltaY;
            if (this.topBarCarouselController) {
                this.topBarCarouselController.updateButtons();
            }
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(delta * zoomIntensity);

        const { minScale, maxScale } = this.getZoomBounds();
        let newScale = this.transform.scale * zoomFactor;
        newScale = Math.max(minScale, Math.min(newScale, maxScale));

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.isZooming = true;
        if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
        this.zoomTimeout = setTimeout(() => {
            this.isZooming = false;
            this.requestRender();
        }, 150);

        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.calculateHoverPixel(e.clientX, e.clientY);
        if (this.interactionMode === 'offline_text' && typeof this.updateFloatingTextPosition === 'function') {
            this.updateFloatingTextPosition();
        }
        if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
        this.requestRender();

        if (this.isProgressive && typeof this.updateVisibleChunks === 'function') {
            if (this.chunkThrottleTimer) clearTimeout(this.chunkThrottleTimer);
            this.chunkThrottleTimer = setTimeout(() => this.updateVisibleChunks(), 100);
        }
    },

    handleResize() {
        if (this.isResizeLocked) return;
        if (typeof this.updateCanvasDimensions === 'function') this.updateCanvasDimensions();
        if (typeof this.limitBounds === 'function') this.limitBounds();
        if (this.interactionMode === 'offline_text' && typeof this.updateFloatingTextPosition === 'function') {
            this.updateFloatingTextPosition();
        }
        if (typeof this.updateZoomUI === 'function') this.updateZoomUI();
        this.requestRender();
    },

    getZoomBounds() {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const minScale = 200 / Math.max(bw, bh);
        const maxScale = 30.0;
        return { minScale, maxScale: Math.max(minScale * 1.5, maxScale) };
    },

    updateZoomUI() {
        if (!this.transform) return;
        const { minScale, maxScale } = this.getZoomBounds();
        const currentScale = Math.max(minScale, Math.min(this.transform.scale, maxScale));
        const zoomPct = Math.round(currentScale * 100);

        const labelEl = document.querySelector('[data-ref="footer-zoom-label"]');
        const sliderEl = document.querySelector('[data-ref="footer-zoom-slider"]');

        if (labelEl) {
            labelEl.textContent = `${zoomPct}%`;
        }
        if (sliderEl && document.activeElement !== sliderEl) {
            const logRatio = Math.log(currentScale / minScale) / Math.log(maxScale / minScale);
            const sliderVal = Math.max(0, Math.min(1000, Math.round(logRatio * 1000)));
            sliderEl.value = sliderVal;
        }
    },

    stepZoom(direction = 1) {
        if (!this.transform || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const { minScale, maxScale } = this.getZoomBounds();

        const current = this.transform.scale;
        const presets = [0.1, 0.25, 0.333, 0.5, 0.667, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0, 24.0, 30.0];
        let newScale;

        if (typeof direction === 'number' && direction > 0 && direction < 2 && direction !== 1 && direction !== -1) {
            if (direction > 1) {
                newScale = presets.find(p => p > current + 0.005) || (current * direction);
            } else {
                newScale = [...presets].reverse().find(p => p < current - 0.005) || (current * direction);
            }
        } else if (direction > 0) {
            newScale = presets.find(p => p > current + 0.005) || (current * 1.25);
        } else {
            newScale = [...presets].reverse().find(p => p < current - 0.005) || (current * 0.8);
        }

        newScale = Math.max(minScale, Math.min(newScale, maxScale));
        this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;
        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.updateZoomUI();
        this.requestRender();
    },

    resetZoomToScale(scale = 1.0) {
        if (!this.transform || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const { minScale, maxScale } = this.getZoomBounds();
        const targetScale = Math.max(minScale, Math.min(scale, maxScale));
        this.transform.x = centerX - (this.boardWidth * targetScale) / 2;
        this.transform.y = centerY - (this.boardHeight * targetScale) / 2;
        this.transform.scale = targetScale;
        if (typeof this.limitBounds === 'function') this.limitBounds();
        this.updateZoomUI();
        this.requestRender();
    },

    handleInput(e) {
        if (!e.target) return;

        const isZoomSlider = e.target.matches('[data-ref="footer-zoom-slider"]');
        if (isZoomSlider) {
            const t = parseFloat(e.target.value);
            const { minScale, maxScale } = this.getZoomBounds();
            const newScale = minScale * Math.pow(maxScale / minScale, t / 1000);

            if (newScale > 0 && this.transform && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
                this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
                this.transform.scale = newScale;
                if (typeof this.limitBounds === 'function') this.limitBounds();
                const labelEl = document.querySelector('[data-ref="footer-zoom-label"]');
                if (labelEl) {
                    labelEl.textContent = `${Math.round(newScale * 100)}%`;
                }
                this.requestRender();
            }
            return;
        }

        const isCustomHexInput = e.target.matches('[data-ref="customHexInput"]');
        if (isCustomHexInput) {
            let hex = e.target.value.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
                const picker = e.target.closest('[data-ref="customColorPicker"]') || document.querySelector('[data-ref="customColorPicker"]');
                if (picker) {
                    const hsv = hexToHsv(hex);
                    picker.dataset.h = hsv.h;
                    picker.dataset.s = hsv.s;
                    picker.dataset.v = hsv.v;
                    this.updateCustomPickerUI(picker);
                }
            }
            return;
        }

        const isBrushSizeRange = e.target.matches('[data-action="setBrushSizeRange"]');
        if (isBrushSizeRange) {
            if (typeof this.setBrushSizeRange === 'function') {
                this.setBrushSizeRange(e.target.value);
            }
            return;
        }

        const isStabilizerRange = e.target.matches('[data-action="setStabilizerRange"]');
        if (isStabilizerRange) {
            if (typeof this.setStabilizerRange === 'function') {
                this.setStabilizerRange(e.target.value);
            }
            return;
        }

        const isSprayRange = e.target.matches('[data-action="setSpraySizeRange"]');
        if (isSprayRange) {
            if (typeof this.setSpraySizeRange === 'function') {
                this.setSpraySizeRange(e.target.value);
            }
            return;
        }

        const isLayerOpacity = e.target.matches('[data-action="setLayerOpacity"]');
        if (isLayerOpacity) {
            if (typeof this.setLayerOpacity === 'function') {
                this.setLayerOpacity(e.target.value);
            }
            return;
        }

        const isLayerBlend = e.target.matches('[data-action="setLayerBlendMode"]');
        if (isLayerBlend) {
            if (typeof this.setLayerBlendMode === 'function') {
                this.setLayerBlendMode(e.target.value);
            }
            return;
        }

        const isRefOpacity = e.target.matches('[data-action="setReferenceOpacity"]');
        if (isRefOpacity) {
            if (typeof this.setReferenceOpacity === 'function') {
                this.setReferenceOpacity(e.target.value);
            }
            return;
        }

        const isRefFileInput = e.target.matches('[data-ref="reference-file-input"]');
        if (isRefFileInput && e.target.files && e.target.files[0]) {
            if (typeof this.handleReferenceImageUpload === 'function') {
                this.handleReferenceImageUpload(e.target.files[0]);
            }
            return;
        }

        const isFloatingInput = e.target.matches('[data-ref="floating-text-input"]');

        if (isFloatingInput) {
            const val = e.target.value;
            if (!this.activePixelText) {
                this.activePixelText = { text: val, fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
            } else {
                this.activePixelText.text = val;
            }

            if (this.interactionMode !== 'offline_text') {
                this.activatePixelTextMode();
            } else {
                this.updatePixelTextPreview();
            }
        }
    }
};
