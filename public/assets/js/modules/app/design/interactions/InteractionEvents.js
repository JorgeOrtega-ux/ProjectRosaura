import { showMessage, hexToHsv, hsvToHex } from '../../../../core/utils/uiUtils.js';

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
        window.addEventListener('resize', this.handleResizeBound);

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

        const btnOfflineMoveArea = e.target.closest('[data-action="toggleOfflineMoveArea"]');
        if (btnOfflineMoveArea) {
            e.preventDefault();
            this.toggleOfflineMoveArea();
            return;
        }

        const btnConfirmMove = e.target.closest('[data-action="confirmMoveArea"]');
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

        const btnOfflineBucket = e.target.closest('[data-action="toggleOfflineBucket"]');
        if (btnOfflineBucket) {
            e.preventDefault();
            this.toggleOfflineBucket();
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

        const btnColor = e.target.closest('[data-action="selectColor"]');
        if (btnColor) {
            e.preventDefault();
            this.currentColor = btnColor.getAttribute('data-color') || '#000000';
            
            if (this.btnColorPalette) {
                this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
                this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
            }
            
            this.updateActiveColorPreview();
            this.syncActiveColorHighlight();

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
                this.cancelMoveArea();
            } else if (this.interactionMode !== 'normal') {
                this.cancelInteractionMode();
            } else {
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
            if (this.isOfflineMode && typeof this.toggleOfflineMirror === 'function') {
                e.preventDefault();
                this.toggleOfflineMirror();
            }
        } else if (keyUpper === 'M') {
            if (this.isOfflineMode && typeof this.toggleOfflineMoveArea === 'function') {
                e.preventDefault();
                this.toggleOfflineMoveArea();
            }
        } else if (keyUpper === 'V') {
            if (this.isOfflineMode) {
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
        } else if (keyUpper === 'H') {
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
        } else if (keyUpper === 'U') {
            e.preventDefault();
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
            if (this.activeTemplateId && typeof this.deleteTemplate === 'function') {
                e.preventDefault();
                this.deleteTemplate();
            } else if (this.isOfflineMode && this.interactionMode === 'owner_erasing' && this.ownerEraserBox) {
                e.preventDefault();
                this.executeOwnerClearArea();
            }
        } else if (e.key === '[' || e.key === ']') {
            if (this.isOfflineMode && typeof this.stepActiveToolSize === 'function') {
                e.preventDefault();
                this.stepActiveToolSize(e.key === ']' ? 1 : -1);
            }
        }
    },

    handleWheel(e) {
        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;
        
        e.preventDefault(); 
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(delta * zoomIntensity);

        let newScale = this.transform.scale * zoomFactor;
        const minScale = 200 / Math.max(this.boardWidth || 1000, this.boardHeight || 1000);
        newScale = Math.max(minScale, Math.min(newScale, 40)); 

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
        this.requestRender();
    },

    handleInput(e) {
        if (!e.target) return;

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
