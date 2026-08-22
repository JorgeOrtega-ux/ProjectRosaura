import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { CanvasSyncChannel } from '../../../core/services/CanvasSyncChannel.js';
import { generateShapePixels } from './utils/GeometricShapesUtils.js';
import { renderPixelText } from './utils/PixelTextUtils.js';
import { getPixelFont } from './data/PixelFontsData.js';
import { getPaletteById } from './utils/DesignPaletteUtils.js';
import { PerksRegistry } from './PerksRegistry.js';
import { showMessage, hexToHsv, hsvToHex, getEventCoords } from '../../../core/utils/uiUtils.js';
import { soundManager } from './SoundManager.js';

function colorToAbgr(color) {
    if (!color || color === 'transparent') return 0;
    let hex = color.replace('#', '');
    let r = 0, g = 0, b = 0, a = 255;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 8) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
        a = parseInt(hex.substring(6, 8), 16);
    }
    return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function abgrToHex(val) {
    const r = val & 0xFF;
    const g = (val >> 8) & 0xFF;
    const b = (val >> 16) & 0xFF;
    const a = (val >> 24) & 0xFF;
    if (a === 255) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
}

function getBresenhamLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let currX = x0;
    let currY = y0;

    while (true) {
        points.push({ x: currX, y: currY });
        if (currX === x1 && currY === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            currX += sx;
        }
        if (e2 < dx) {
            err += dx;
            currY += sy;
        }
    }
    return points;
}

export const DesignInteractions = {
    bindEvents() {
        document.addEventListener('wheel', this.handleWheelBound, { passive: false });
        document.addEventListener('mousedown', this.handleMouseDownBound);
        document.addEventListener('mousemove', this.handleMouseMoveBound);
        document.addEventListener('mouseup', this.handleMouseUpBound);
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

    getMaxBalance() {
        if (this.isOfflineMode) return Infinity;
        if (this.interactionMode === 'owner_erasing') return Infinity;
        if (this.perkNoCooldown) return Infinity;
        if (this.interactionMode === 'placing_mines') return 10;
        if (this.interactionMode === 'bombing') {
            return typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
        }
        return Math.floor(this.cooldownBalance);
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
            if (typeof this.updatePerkBadges === 'function') {
                this.updatePerkBadges();
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
            const img = btnAddSticker.querySelector('img');
            const dataUrl = img ? img.src : null;
            const name = btnAddSticker.getAttribute('data-tooltip') || 'Figura';
            if (stickerId && typeof this.addStickerToCanvas === 'function') {
                this.addStickerToCanvas(stickerId, dataUrl, name);
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
                if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
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
            if (this.isOfflineMode) {
                const btn = document.querySelector('[data-action="toggleMenuInModule"][data-menu-target="menu-text"]');
                if (btn && !btn.classList.contains('disabled')) {
                    e.preventDefault();
                    btn.click();
                }
            }
        } else if (keyUpper === 'J') {
            const btn = document.querySelector('[data-action="openJoinLiveModal"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
        } else if (keyUpper === 'S') {
            const btn = document.querySelector('[data-action="toggleLiveBroadcast"]');
            if (btn && !btn.classList.contains('disabled')) { e.preventDefault(); btn.click(); }
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
        } else if (keyUpper === 'S') {
            if (this.isOfflineMode && typeof this.toggleOfflineShading === 'function') {
                e.preventDefault();
                this.toggleOfflineShading();
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

    handleMouseDown(e) {
        const svArea = e.target.closest('[data-action="dragCustomSV"]');
        if (svArea) {
            this.isDraggingCustomPicker = 'sv';
            this.updateCustomColorFromEvent(e, svArea);
            if (e.cancelable) e.preventDefault();
            return;
        }
        const hueArea = e.target.closest('[data-action="dragCustomHue"]');
        if (hueArea) {
            this.isDraggingCustomPicker = 'hue';
            this.updateCustomColorFromEvent(e, hueArea);
            if (e.cancelable) e.preventDefault();
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        const exact = this.getExactBoardCoords(e.clientX, e.clientY);
        if (!exact) return;

        const isOperationalLocked = !!(this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked || (this.isFrozen && !this.isOwner));

        if (this.interactionMode === 'offline_eyedropper' && !this.isSpectator && !isOperationalLocked) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PICK_PIXEL_COLOR',
                        payload: { x: coords.x, y: coords.y }
                    });
                } else if (this.offscreenCtx) {
                    const img = this.offscreenCtx.getImageData(coords.x, coords.y, 1, 1);
                    const val = new Uint32Array(img.data.buffer)[0];
                    const hex = (val === 0) ? '#FFFFFF' : abgrToHex(val);
                    this.selectAndAddCustomColor(hex);
                    this.toggleEyedropper();
                }
            }
            return;
        }



        if (this.activeTemplateId && !this.isSpectator && !isOperationalLocked) {
            const handleHit = typeof this.checkTemplateHandleHit === 'function' ? this.checkTemplateHandleHit(exact.x, exact.y) : null;
            if (handleHit) {
                e.preventDefault();
                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                if (!tpl || tpl.locked) return;
                
                this.templateInteraction = {
                    type: 'resize-' + handleHit,
                    startX: exact.x,
                    startY: exact.y,
                    origX: tpl.x,
                    origY: tpl.y,
                    origW: tpl.w,
                    origH: tpl.h,
                    origAngle: tpl.angle || 0
                };
                return;
            }
        }

        if (e.shiftKey || e.button === 1 || this.isSpectator || isOperationalLocked) {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.canvas.classList.add('component-cursor-grabbing');
            return;
        }

        if (this.activeTemplateId && typeof this.checkTemplateHit === 'function') {
            let hit = this.checkTemplateHit(exact.x, exact.y);
            
            if (hit === 'move') {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    showMessage(__('err_only_owner_moves'), 'warning');
                    return;
                }

                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                this.templateInteraction = {
                    type: hit,
                    startX: exact.x,
                    startY: exact.y,
                    origX: tpl.x,
                    origY: tpl.y,
                    origW: tpl.w,
                    origH: tpl.h,
                    origAngle: tpl.angle || 0
                };
                return; 
            }
        }

        const coords = this.getBoardCoords(e.clientX, e.clientY);
        if (coords) {
            if (this.interactionMode === 'offline_moving_area') {
                const box = this.moveAreaBox;
                if (this.moveAreaStep === 2 && box) {
                    const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
                    const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
                    const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
                    const curY2 = Math.max(box.y1, box.y2) + (box.dy || 0);

                    if (coords.x >= curX1 && coords.x <= curX2 && coords.y >= curY1 && coords.y <= curY2) {
                        this.moveAreaStep = 3;
                        this.moveAreaDragAnchor = {
                            startX: coords.x,
                            startY: coords.y,
                            initialDx: box.dx || 0,
                            initialDy: box.dy || 0
                        };
                        this.selectMoveArea(box.x1, box.y1, box.x2, box.y2, box.dx || 0, box.dy || 0, 3);
                        this.canvas.classList.add('component-cursor-grabbing');
                        return;
                    }
                }

                this.moveAreaStep = 1;
                this.moveAreaStart = { x: coords.x, y: coords.y };
                this.selectMoveArea(coords.x, coords.y, coords.x, coords.y, 0, 0, 1);
                return;
            }

            if (this.interactionMode === 'offline_spray') {
                this.startSpray(coords.x, coords.y);
                return;
            }

            if (this.interactionMode === 'offline_bucket') {
                this.executeOfflineBucket(coords.x, coords.y);
                return;
            }

            if (this.interactionMode === 'offline_eraser_brush') {
                this.isBrushErasing = true;
                this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                this.applyBrushEraseAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_dither') {
                this.isDitherPainting = true;
                this.ditherLastCoords = { x: coords.x, y: coords.y };
                this.applyDitherAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_shading') {
                this.isShadingPainting = true;
                this.shadingLastCoords = { x: coords.x, y: coords.y };
                this.shadingTouchedInStroke = new Set();
                this.applyShadingAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_brush' || (this.isOfflineMode && this.interactionMode === 'normal' && (this.brushSize > 1 || this.brushShape !== 'square'))) {
                this.isBrushPainting = true;
                this.brushLastCoords = { x: coords.x, y: coords.y };
                this.applyBrushAt(coords.x, coords.y, true);
                return;
            }

            if (this.interactionMode === 'offline_shape') {
                this.isShapeDrawing = true;
                this.shapeStart = { x: coords.x, y: coords.y };
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
                return;
            }

            if (this.interactionMode === 'offline_text') {
                const box = this.textPreviewBox;
                if (box && coords.x >= box.minX && coords.x <= box.maxX && coords.y >= box.minY && coords.y <= box.maxY) {
                    this.isTextDragging = true;
                    this.textDragStart = {
                        offsetX: coords.x - (this.textPosition ? this.textPosition.x : box.originX),
                        offsetY: coords.y - (this.textPosition ? this.textPosition.y : box.originY)
                    };
                } else {
                    this.textPosition = { x: coords.x, y: coords.y };
                    this.updatePixelTextPreview();
                    const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                    if (floatingInput) {
                        floatingInput.focus();
                    }
                }
                return;
            }

            if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
                const bw = this.boardWidth || 64;
                const offset = (coords.y * bw) + coords.x;
                
                if (this.interactionMode === 'owner_protecting' && (this.ownerEraserStep === 0 || this.ownerEraserStep === 2)) {
                    const area = this.protectedAreas ? this.protectedAreas.find(a => coords.x >= a.x1 && coords.x <= a.x2 && coords.y >= a.y1 && coords.y <= a.y2) : null;
                    if (area) {
                        const count = (area.x2 - area.x1 + 1) * (area.y2 - area.y1 + 1);
                        window.modalSystem.show('confirmUnprotectAreaModal', { count }).then(res => {
                            const actStr = (typeof res === 'string') ? res : (res?.action || null);
                            if (actStr === 'unprotect') {
                                this.executeOwnerUnprotectArea(area.x1, area.y1, area.x2, area.y2);
                            }
                        });
                        return;
                    }
                }

                if (this.ownerEraserStep === 0 || this.ownerEraserStep === 2) {
                    this.ownerEraserStep = 1;
                    this.ownerEraserStart = { x: coords.x, y: coords.y };
                    this.selectOwnerArea(coords.x, coords.y, coords.x, coords.y, false);
                    if (typeof showMessage === 'function') {
                        showMessage(`Esquina 1 fijada en (${coords.x}, ${coords.y}). Mueve el cursor y haz clic de nuevo para fijar la zona.`, 'info');
                    }
                } else if (this.ownerEraserStep === 1) {
                    this.ownerEraserStep = 2;
                    this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, coords.x, coords.y, false);
                    if (typeof showMessage === 'function') {
                        let areaSize = 0;
                        if (this.ownerEraserBox) {
                            areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
                        }
                        const actionWord = this.interactionMode === 'owner_erasing' ? 'Vaciar zona' : 'Bloquear zona';
                        showMessage(`Zona fijada (${areaSize} px). Haz clic en '${actionWord}' abajo para confirmar.`, 'success');
                    }
                }
                return;
            }

            const bw = this.boardWidth || 64;
            const key = (coords.y << 16) | coords.x;
            const symX = bw - 1 - coords.x;
            const symKey = (coords.y << 16) | symX;
            const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;

            if (this.selectedPixels.has(key)) {
                this.selectionMode = 'remove';
                this.selectedPixels.delete(key);
                if (hasSym) this.selectedPixels.delete(symKey);
            } else {
                this.selectionMode = 'add';
                const maxBalance = this.getMaxBalance();
                if (this.selectedPixels.size < maxBalance) {
                    this.selectedPixels.add(key);
                    if (hasSym && this.selectedPixels.size < maxBalance) {
                        this.selectedPixels.add(symKey);
                    }
                } else {
                    showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
                }
            }
            this.isSelecting = true;
            this.updateSelectionUI();
            this.requestRender();
        }
    },

    handleMouseMove(e) {
        if (this.isDraggingCustomPicker) {
            const picker = document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                if (this.isDraggingCustomPicker === 'sv') {
                    const svArea = picker.querySelector('[data-action="dragCustomSV"]');
                    if (svArea) this.updateCustomColorFromEvent(e, svArea);
                } else if (this.isDraggingCustomPicker === 'hue') {
                    const hueArea = picker.querySelector('[data-action="dragCustomHue"]');
                    if (hueArea) this.updateCustomColorFromEvent(e, hueArea);
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_moving_area') {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                if (this.moveAreaStep === 1 && this.moveAreaStart) {
                    this.selectMoveArea(this.moveAreaStart.x, this.moveAreaStart.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
                if (this.moveAreaStep === 3 && this.moveAreaDragAnchor && this.moveAreaBox) {
                    const dx = this.moveAreaDragAnchor.initialDx + (coords.x - this.moveAreaDragAnchor.startX);
                    const dy = this.moveAreaDragAnchor.initialDy + (coords.y - this.moveAreaDragAnchor.startY);
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, dx, dy, 3);
                    return;
                }
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                this.updateSpray(coords.x, coords.y);
            }
            return;
        }

        if (this.interactionMode === 'offline_eraser_brush' && this.isBrushErasing) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.brushEraserLastCoords) {
                if (coords.x !== this.brushEraserLastCoords.x || coords.y !== this.brushEraserLastCoords.y) {
                    const line = getBresenhamLine(this.brushEraserLastCoords.x, this.brushEraserLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyBrushEraseAt(line[i].x, line[i].y, false);
                    }
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_dither' && this.isDitherPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.ditherLastCoords) {
                if (coords.x !== this.ditherLastCoords.x || coords.y !== this.ditherLastCoords.y) {
                    const line = getBresenhamLine(this.ditherLastCoords.x, this.ditherLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyDitherAt(line[i].x, line[i].y, false);
                    }
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shading' && this.isShadingPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.shadingLastCoords) {
                if (coords.x !== this.shadingLastCoords.x || coords.y !== this.shadingLastCoords.y) {
                    const line = getBresenhamLine(this.shadingLastCoords.x, this.shadingLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyShadingAt(line[i].x, line[i].y, false);
                    }
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.isBrushPainting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords && this.brushLastCoords) {
                if (coords.x !== this.brushLastCoords.x || coords.y !== this.brushLastCoords.y) {
                    const line = getBresenhamLine(this.brushLastCoords.x, this.brushLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyBrushAt(line[i].x, line[i].y, false);
                    }
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing && this.shapeStart) {
            let coords = this.getBoardCoords(e.clientX, e.clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords && (!this.shapeCurrent || coords.x !== this.shapeCurrent.x || coords.y !== this.shapeCurrent.y)) {
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
            }
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging && this.textDragStart) {
            let coords = this.getBoardCoords(e.clientX, e.clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                const newX = Math.max(0, coords.x - this.textDragStart.offsetX);
                const newY = Math.max(0, coords.y - this.textDragStart.offsetY);
                if (!this.textPosition || this.textPosition.x !== newX || this.textPosition.y !== newY) {
                    this.textPosition = { x: newX, y: newY };
                    this.updatePixelTextPreview();
                }
            }
            return;
        }

        if ((this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') && this.ownerEraserStep === 1 && this.ownerEraserStart) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, coords.x, coords.y, false);
            }
            return;
        }
        
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            
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
            return;
        }

        if (this.templateInteraction) {
            const exact = this.getExactBoardCoords(e.clientX, e.clientY);
            if (!exact) return;

            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            const dx = exact.x - this.templateInteraction.startX;
            const dy = exact.y - this.templateInteraction.startY;

            if (this.templateInteraction.type === 'move') {
                let newX = Math.round(this.templateInteraction.origX + dx);
                let newY = Math.round(this.templateInteraction.origY + dy);
                
                const angleRad = (tpl.angle || 0) * Math.PI / 180;
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);
                
                const w2 = tpl.w / 2;
                const h2 = tpl.h / 2;
                
                const corners = [
                    { x: -w2, y: -h2 },
                    { x: w2, y: -h2 },
                    { x: -w2, y: h2 },
                    { x: w2, y: h2 }
                ];
                
                let minRx = Infinity, maxRx = -Infinity;
                let minRy = Infinity, maxRy = -Infinity;
                
                for (let c of corners) {
                    const rx = c.x * cosA - c.y * sinA;
                    const ry = c.x * sinA + c.y * cosA;
                    if (rx < minRx) minRx = rx;
                    if (rx > maxRx) maxRx = rx;
                    if (ry < minRy) minRy = ry;
                    if (ry > maxRy) maxRy = ry;
                }
                
                const minX = Math.round(-w2 - minRx);
                const maxX = Math.round(this.boardWidth - w2 - maxRx);
                const minY = Math.round(-h2 - minRy);
                const maxY = Math.round(this.boardHeight - h2 - maxRy);
                
                newX = Math.max(minX, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));
                
                tpl.x = newX;
                tpl.y = newY;
            } else {
                const aspect = this.templateInteraction.origW / this.templateInteraction.origH;
                const angleRad = (this.templateInteraction.origAngle || 0) * Math.PI / 180;
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);

                // 1. Determine anchor's local coordinates relative to center
                let localAnchorX, localAnchorY;
                let signX = 1, signY = 1;
                
                if (this.templateInteraction.type === 'resize-br') {
                    localAnchorX = -this.templateInteraction.origW / 2;
                    localAnchorY = -this.templateInteraction.origH / 2;
                    signX = 1; signY = 1;
                } else if (this.templateInteraction.type === 'resize-tl') {
                    localAnchorX = this.templateInteraction.origW / 2;
                    localAnchorY = this.templateInteraction.origH / 2;
                    signX = -1; signY = -1;
                } else if (this.templateInteraction.type === 'resize-tr') {
                    localAnchorX = -this.templateInteraction.origW / 2;
                    localAnchorY = this.templateInteraction.origH / 2;
                    signX = 1; signY = -1;
                } else if (this.templateInteraction.type === 'resize-bl') {
                    localAnchorX = this.templateInteraction.origW / 2;
                    localAnchorY = -this.templateInteraction.origH / 2;
                    signX = -1; signY = 1;
                }

                // 2. Calculate anchor's board coordinates
                const origCx = this.templateInteraction.origX + this.templateInteraction.origW / 2;
                const origCy = this.templateInteraction.origY + this.templateInteraction.origH / 2;
                const anchorBoardX = origCx + localAnchorX * cosA - localAnchorY * sinA;
                const anchorBoardY = origCy + localAnchorX * sinA + localAnchorY * cosA;

                // 3. Inverse rotate mouse position around the anchor board coordinate
                const dxAnchor = exact.x - anchorBoardX;
                const dyAnchor = exact.y - anchorBoardY;
                const cosInv = Math.cos(-angleRad);
                const sinInv = Math.sin(-angleRad);
                const mouseUnrotatedX = dxAnchor * cosInv - dyAnchor * sinInv;
                const mouseUnrotatedY = dxAnchor * sinInv + dyAnchor * cosInv;

                // 4. Calculate proposed width and height
                const proposedW_X = mouseUnrotatedX * signX;
                const proposedW_Y = (mouseUnrotatedY * signY) * aspect;
                let newW = Math.max(proposedW_X, proposedW_Y);

                // 5. Apply limits and round to even
                newW = Math.max(20, newW);
                
                // Calculate strict maxW to prevent visual bounds from escaping the board
                let strictMaxW = Infinity;
                const normAnchorX = localAnchorX / this.templateInteraction.origW;
                const normAnchorY = localAnchorY / this.templateInteraction.origW;

                const cornerNorms = [
                    { nx: -0.5, ny: -0.5 / aspect },
                    { nx: 0.5, ny: -0.5 / aspect },
                    { nx: -0.5, ny: 0.5 / aspect },
                    { nx: 0.5, ny: 0.5 / aspect }
                ];

                for (let cn of cornerNorms) {
                    const diffX = cn.nx - normAnchorX;
                    const diffY = cn.ny - normAnchorY;
                    const kX = diffX * cosA - diffY * sinA;
                    const kY = diffX * sinA + diffY * cosA;

                    if (kX > 0.0001) strictMaxW = Math.min(strictMaxW, (this.boardWidth - anchorBoardX) / kX);
                    else if (kX < -0.0001) strictMaxW = Math.min(strictMaxW, -anchorBoardX / kX);

                    if (kY > 0.0001) strictMaxW = Math.min(strictMaxW, (this.boardHeight - anchorBoardY) / kY);
                    else if (kY < -0.0001) strictMaxW = Math.min(strictMaxW, -anchorBoardY / kY);
                }

                newW = Math.min(newW, strictMaxW);
                
                const MAX_TEMPLATE_SIZE = Math.max(this.boardWidth || 4096, this.boardHeight || 4096);
                newW = Math.min(newW, MAX_TEMPLATE_SIZE);
                
                newW = Math.round(newW / 2) * 2;
                let newH = Math.round(newW / aspect);
                
                if (newH > MAX_TEMPLATE_SIZE) {
                    newH = MAX_TEMPLATE_SIZE;
                    newW = Math.round(newH * aspect);
                    newW = Math.round(newW / 2) * 2;
                    newH = Math.round(newH / 2) * 2;
                } else {
                    newH = Math.round(newH / 2) * 2;
                }

                // 6. Calculate new center to keep anchor stationary
                let newLocalAnchorX = localAnchorX < 0 ? -newW / 2 : newW / 2;
                let newLocalAnchorY = localAnchorY < 0 ? -newH / 2 : newH / 2;

                const newCx = anchorBoardX - (newLocalAnchorX * cosA - newLocalAnchorY * sinA);
                const newCy = anchorBoardY - (newLocalAnchorX * sinA + newLocalAnchorY * cosA);

                tpl.w = newW;
                tpl.h = newH;
                tpl.x = Math.round(newCx - newW / 2);
                tpl.y = Math.round(newCy - newH / 2);
            }

            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (this.uiLiveInputX) {
                    this.uiLiveInputX.setAttribute('data-value', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-value', tpl.y);
                    this.uiLiveInputY.textContent = tpl.y;
                }
            }

            this.requestRender();
            return; 
        }

        if (this.isOwnerSelecting) {
            if (!this.isOwnerDragActive && this.ownerEraserStart) {
                if (this.selectedPixels.size === 0) {
                    this.selectOwnerArea(this.ownerEraserStart.x, this.ownerEraserStart.y, this.ownerEraserStart.x, this.ownerEraserStart.y, false);
                }
            }
            this.isOwnerSelecting = false;
            this.isOwnerDragActive = false;
        }

        if (this.isSelecting) {
            const coords = this.getBoardCoords(e.clientX, e.clientY);
            if (coords) {
                const bw = this.boardWidth || 64;
                const key = (coords.y << 16) | coords.x;
                const symX = bw - 1 - coords.x;
                const symKey = (coords.y << 16) | symX;
                const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;
                const sizeBefore = this.selectedPixels.size;
                
                if (this.selectionMode === 'add') {
                    const maxBalance = this.getMaxBalance();
                    if (this.selectedPixels.size < maxBalance) {
                        this.selectedPixels.add(key);
                        if (hasSym && this.selectedPixels.size < maxBalance) {
                            this.selectedPixels.add(symKey);
                        }
                    }
                } else {
                    this.selectedPixels.delete(key);
                    if (hasSym) this.selectedPixels.delete(symKey);
                }
                
                if (this.selectedPixels.size !== sizeBefore) {
                    this.updateSelectionUI();
                    this.requestRender();
                }
            }
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (target) {
            const exact = this.getExactBoardCoords(e.clientX, e.clientY);
            let hit = null;
            if (exact && !this.isSpectator && !this.isResetLocked) {
                if (typeof this.checkTemplateHandleHit === 'function') {
                    hit = this.checkTemplateHandleHit(exact.x, exact.y);
                    if (hit) hit = 'resize-' + hit;
                }
                if (!hit && typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
            }
            
            if (hit) {
                if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw', 'component-cursor-pointer');
                } else {
                    this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw', 'component-cursor-pointer');
                    
                    let visualHit = hit;
                    if (hit && hit.startsWith('resize-')) {
                        let angle = 0;
                        if (this.activeTemplateId) {
                            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                            if (tpl && tpl.angle) angle = (tpl.angle % 360 + 360) % 360;
                        }
                        const corners = ['tl', 'tr', 'br', 'bl'];
                        const corner = hit.split('-')[1];
                        const index = corners.indexOf(corner);
                        if (index !== -1) {
                            const steps = Math.floor((angle + 45) / 90);
                            const visualIndex = (index + steps) % 4;
                            visualHit = 'resize-' + corners[visualIndex];
                        }
                    }

                    if (hit === 'move') this.canvas.classList.add('component-cursor-move');
                    else if (visualHit === 'resize-tl' || visualHit === 'resize-br') this.canvas.classList.add('component-cursor-nwse');
                    else if (visualHit === 'resize-tr' || visualHit === 'resize-bl') this.canvas.classList.add('component-cursor-nesw');
                }
                
                if (this.hoveredPixel !== null) {
                    this.hoveredPixel = null;
                    this._selectionBitmaskDirty = true;
                    this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
                    this.requestRender();
                }
                return;
            } else {
                this.canvas.classList.remove('component-cursor-move', 'component-cursor-nwse', 'component-cursor-nesw');
                if (this.isDragging) {
                    this.canvas.classList.add('component-cursor-grabbing');
                } else {
                    this.canvas.classList.remove('component-cursor-grabbing');
                }
            }
            
            this.calculateHoverPixel(e.clientX, e.clientY);
        } else if (this.hoveredPixel !== null) {
            this.hoveredPixel = null;
            this._selectionBitmaskDirty = true;
            this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            this.requestRender();
        }
    },

    handleMouseUp(e) {
        if (this.isDraggingCustomPicker) {
            this.isDraggingCustomPicker = false;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging) {
            this.isTextDragging = false;
            this.textDragStart = null;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing) {
            this.commitShapeDrawing();
        }

        if (this.interactionMode === 'offline_moving_area') {
            if (this.moveAreaStep === 1 && this.moveAreaBox) {
                this.moveAreaStep = 2;
                this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                return;
            }
            if (this.moveAreaStep === 3 && this.moveAreaBox) {
                this.canvas.classList.remove('component-cursor-grabbing');
                const dx = this.moveAreaBox.dx || 0;
                const dy = this.moveAreaBox.dy || 0;
                if (dx !== 0 || dy !== 0) {
                    this.commitMoveArea();
                } else {
                    this.moveAreaStep = 2;
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                }
                return;
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            this.stopSpray();
        }

        if (this.isBrushErasing) {
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isDitherPainting) {
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isShadingPainting) {
            this.isShadingPainting = false;
            this.shadingLastCoords = null;
            if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.isBrushPainting) {
            this.isBrushPainting = false;
            this.brushLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
        }

        if (this.recentDragMode) {
            this.saveRecentColor(false);
            this.recentDragMode = null;
            this.recentDragArea = null;
            return;
        }

        if (this.templateInteraction) {
            this.templateInteraction = null;
            this.requestRender();
            
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (typeof this.emitLiveImageUpdate === 'function') {
                    this.emitLiveImageUpdate();
                }
            }

            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.classList.remove('component-cursor-grabbing');
        }
        
        if (this.isSelecting) {
            this.isSelecting = false;
        }

        this.calculateHoverPixel(e.clientX, e.clientY);
        this.requestRender();
    },

    handleTouchStart(e) {
        const svArea = e.target.closest('[data-action="dragCustomSV"]');
        const hueArea = e.target.closest('[data-action="dragCustomHue"]');
        if (svArea || hueArea) {
            this.isDraggingCustomPicker = svArea ? 'sv' : 'hue';
            this.updateCustomColorFromEvent(e.touches[0], svArea || hueArea);
            e.preventDefault();
            return;
        }

        const target = e.target.closest('[data-ref="design-canvas"]');
        if (!target) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            this.isPinching = true;
            this.isDragging = false;
            this.templateInteraction = null;
            this.initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            this.initialScale = this.transform.scale;
            return;
        }

        if (e.touches.length === 1) {
            
            this.touchStartTime = Date.now();
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            const isOperationalLocked = !!(this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked || (this.isFrozen && !this.isOwner));

            if (this.interactionMode === 'offline_eyedropper' && !this.isSpectator && !isOperationalLocked) {
                e.preventDefault();
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    if (this.renderWorker) {
                        this.renderWorker.postMessage({
                            type: 'PICK_PIXEL_COLOR',
                            payload: { x: coords.x, y: coords.y }
                        });
                    } else if (this.offscreenCtx) {
                        const img = this.offscreenCtx.getImageData(coords.x, coords.y, 1, 1);
                        const val = new Uint32Array(img.data.buffer)[0];
                        const hex = (val === 0) ? '#FFFFFF' : abgrToHex(val);
                        this.selectAndAddCustomColor(hex);
                        this.toggleEyedropper();
                    }
                }
                return;
            }

            if (this.interactionMode === 'offline_moving_area' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    const box = this.moveAreaBox;
                    if (this.moveAreaStep === 2 && box) {
                        const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
                        const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
                        const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
                        const curY2 = Math.max(box.y1, box.y2) + (box.dy || 0);

                        if (coords.x >= curX1 && coords.x <= curX2 && coords.y >= curY1 && coords.y <= curY2) {
                            e.preventDefault();
                            this.moveAreaStep = 3;
                            this.moveAreaDragAnchor = {
                                startX: coords.x,
                                startY: coords.y,
                                initialDx: box.dx || 0,
                                initialDy: box.dy || 0
                            };
                            this.selectMoveArea(box.x1, box.y1, box.x2, box.y2, box.dx || 0, box.dy || 0, 3);
                            return;
                        }
                    }

                    e.preventDefault();
                    this.moveAreaStep = 1;
                    this.moveAreaStart = { x: coords.x, y: coords.y };
                    this.selectMoveArea(coords.x, coords.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
            }

            if (this.interactionMode === 'offline_spray' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.startSpray(coords.x, coords.y);
                    return;
                }
            }

            if (this.interactionMode === 'offline_eraser_brush' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isBrushErasing = true;
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                    this.applyBrushEraseAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_dither' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isDitherPainting = true;
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                    this.applyDitherAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_shading' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isShadingPainting = true;
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                    this.shadingTouchedInStroke = new Set();
                    this.applyShadingAt(coords.x, coords.y, true);
                    return;
                }
            }

            if ((this.interactionMode === 'offline_brush' || (this.isOfflineMode && this.interactionMode === 'normal' && (this.brushSize > 1 || this.brushShape !== 'square'))) && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isBrushPainting = true;
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                    this.applyBrushAt(coords.x, coords.y, true);
                    return;
                }
            }

            if (this.interactionMode === 'offline_shape' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    this.isShapeDrawing = true;
                    this.shapeStart = { x: coords.x, y: coords.y };
                    this.shapeCurrent = { x: coords.x, y: coords.y };
                    this.updateShapePreview();
                    return;
                }
            }

            if (this.interactionMode === 'offline_text' && !this.isSpectator && !isOperationalLocked) {
                const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                if (coords) {
                    e.preventDefault();
                    const box = this.textPreviewBox;
                    if (box && coords.x >= box.minX && coords.x <= box.maxX && coords.y >= box.minY && coords.y <= box.maxY) {
                        this.isTextDragging = true;
                        this.textDragStart = {
                            offsetX: coords.x - (this.textPosition ? this.textPosition.x : box.originX),
                            offsetY: coords.y - (this.textPosition ? this.textPosition.y : box.originY)
                        };
                    } else {
                        this.textPosition = { x: coords.x, y: coords.y };
                        this.updatePixelTextPreview();
                        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                        if (floatingInput) {
                            floatingInput.focus();
                        }
                    }
                    return;
                }
            }

            const exact = this.getExactBoardCoords(this.touchStartX, this.touchStartY);
            if (exact && !this.isSpectator && !isOperationalLocked) {
                let hit = null;
                if (typeof this.checkTemplateHit === 'function') {
                    hit = this.checkTemplateHit(exact.x, exact.y);
                }
                
                if (hit) {
                    e.preventDefault(); 
                    if (this.liveShareStatus === 'spectator' && this.liveTemplateId === this.activeTemplateId) {
                        showMessage(__('err_only_owner_moves'), 'warning');
                        return;
                    }
                    const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                    this.templateInteraction = {
                        type: hit,
                        startX: exact.x,
                        startY: exact.y,
                        origX: tpl.x,
                        origY: tpl.y,
                        origW: tpl.w,
                        origH: tpl.h
                    };
                    return;
                }
            }

            this.isDragging = true;
            this.touchHasMoved = false;
        }
    },

    handleTouchMove(e) {
        if (this.interactionMode === 'offline_moving_area' && e.touches.length === 1) {
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords) {
                if (this.moveAreaStep === 1 && this.moveAreaStart) {
                    e.preventDefault();
                    this.selectMoveArea(this.moveAreaStart.x, this.moveAreaStart.y, coords.x, coords.y, 0, 0, 1);
                    return;
                }
                if (this.moveAreaStep === 3 && this.moveAreaDragAnchor && this.moveAreaBox) {
                    e.preventDefault();
                    const dx = this.moveAreaDragAnchor.initialDx + (coords.x - this.moveAreaDragAnchor.startX);
                    const dy = this.moveAreaDragAnchor.initialDy + (coords.y - this.moveAreaDragAnchor.startY);
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, dx, dy, 3);
                    return;
                }
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords) {
                this.updateSpray(coords.x, coords.y);
            }
            return;
        }

        if (this.interactionMode === 'offline_eraser_brush' && this.isBrushErasing && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.brushEraserLastCoords) {
                if (coords.x !== this.brushEraserLastCoords.x || coords.y !== this.brushEraserLastCoords.y) {
                    const line = getBresenhamLine(this.brushEraserLastCoords.x, this.brushEraserLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyBrushEraseAt(line[i].x, line[i].y, false);
                    }
                    this.brushEraserLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_dither' && this.isDitherPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.ditherLastCoords) {
                if (coords.x !== this.ditherLastCoords.x || coords.y !== this.ditherLastCoords.y) {
                    const line = getBresenhamLine(this.ditherLastCoords.x, this.ditherLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyDitherAt(line[i].x, line[i].y, false);
                    }
                    this.ditherLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shading' && this.isShadingPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.shadingLastCoords) {
                if (coords.x !== this.shadingLastCoords.x || coords.y !== this.shadingLastCoords.y) {
                    const line = getBresenhamLine(this.shadingLastCoords.x, this.shadingLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyShadingAt(line[i].x, line[i].y, false);
                    }
                    this.shadingLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.isBrushPainting && e.touches.length === 1) {
            e.preventDefault();
            const coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (coords && this.brushLastCoords) {
                if (coords.x !== this.brushLastCoords.x || coords.y !== this.brushLastCoords.y) {
                    const line = getBresenhamLine(this.brushLastCoords.x, this.brushLastCoords.y, coords.x, coords.y);
                    for (let i = 1; i < line.length; i++) {
                        this.applyBrushAt(line[i].x, line[i].y, false);
                    }
                    this.brushLastCoords = { x: coords.x, y: coords.y };
                }
            }
            return;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing && this.shapeStart && e.touches.length === 1) {
            e.preventDefault();
            let coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.touches[0].clientX - rect.left;
                const mouseY = e.touches[0].clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords && (!this.shapeCurrent || coords.x !== this.shapeCurrent.x || coords.y !== this.shapeCurrent.y)) {
                this.shapeCurrent = { x: coords.x, y: coords.y };
                this.updateShapePreview();
            }
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging && this.textDragStart && e.touches.length === 1) {
            e.preventDefault();
            let coords = this.getBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!coords && this.canvas) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.touches[0].clientX - rect.left;
                const mouseY = e.touches[0].clientY - rect.top;
                const bw = this.boardWidth || 64;
                const bh = this.boardHeight || 64;
                const boardX = Math.max(0, Math.min(bw - 1, Math.floor((mouseX - this.transform.x) / this.transform.scale)));
                const boardY = Math.max(0, Math.min(bh - 1, Math.floor((mouseY - this.transform.y) / this.transform.scale)));
                coords = { x: boardX, y: boardY };
            }
            if (coords) {
                const newX = Math.max(0, coords.x - this.textDragStart.offsetX);
                const newY = Math.max(0, coords.y - this.textDragStart.offsetY);
                if (!this.textPosition || this.textPosition.x !== newX || this.textPosition.y !== newY) {
                    this.textPosition = { x: newX, y: newY };
                    this.updatePixelTextPreview();
                }
            }
            return;
        }

        if (this.isDraggingCustomPicker && e.touches && e.touches.length > 0) {
            const picker = document.querySelector('[data-ref="customColorPicker"]');
            if (picker) {
                if (this.isDraggingCustomPicker === 'sv') {
                    const svArea = picker.querySelector('[data-action="dragCustomSV"]');
                    if (svArea) this.updateCustomColorFromEvent(e.touches[0], svArea);
                } else if (this.isDraggingCustomPicker === 'hue') {
                    const hueArea = picker.querySelector('[data-action="dragCustomHue"]');
                    if (hueArea) this.updateCustomColorFromEvent(e.touches[0], hueArea);
                }
            }
            e.preventDefault();
            return;
        }

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
            const minScale = 200 / Math.max(this.boardWidth || 1000, this.boardHeight || 1000);
            newScale = Math.max(minScale, Math.min(newScale, 40));

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            if (typeof this.limitBounds === 'function') this.limitBounds();
            this.requestRender();
            return;
        }

        if (this.templateInteraction && e.touches.length === 1) {
            e.preventDefault();
            const exact = this.getExactBoardCoords(e.touches[0].clientX, e.touches[0].clientY);
            if (!exact) return;

            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            const dx = exact.x - this.templateInteraction.startX;
            const dy = exact.y - this.templateInteraction.startY;

            if (this.templateInteraction.type === 'move') {
                let newX = Math.round(this.templateInteraction.origX + dx);
                let newY = Math.round(this.templateInteraction.origY + dy);
                newX = Math.max(0, Math.min(newX, this.boardWidth - tpl.w));
                newY = Math.max(0, Math.min(newY, this.boardHeight - tpl.h));
                tpl.x = newX;
                tpl.y = newY;
            } else if (this.templateInteraction.type === 'rotate') {
                const cx = this.templateInteraction.origX + (this.templateInteraction.origW / 2);
                const cy = this.templateInteraction.origY + (this.templateInteraction.origH / 2);
                
                const dxCenter = exact.x - cx;
                const dyCenter = exact.y - cy;
                
                let angle = Math.atan2(dyCenter, dxCenter) * (180 / Math.PI);
                angle += 90; 
                
                if (angle < 0) angle += 360;
                
                tpl.angle = Math.round(angle);
            } else {
                const aspect = this.templateInteraction.origW / this.templateInteraction.origH;
                const MAX_TEMPLATE_SIZE = Math.max(this.boardWidth || 4096, this.boardHeight || 4096);
                let newW, newH;
                
                const enforceLimits = (w) => {
                    w = Math.min(w, MAX_TEMPLATE_SIZE);
                    let h = w / aspect;
                    if (h > MAX_TEMPLATE_SIZE) {
                        h = MAX_TEMPLATE_SIZE;
                        w = h * aspect;
                    }
                    return { w: Math.round(w), h: Math.round(h) };
                };
                
                if (this.templateInteraction.type === 'resize-br') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                } else if (this.templateInteraction.type === 'resize-tl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - sizes.w;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - sizes.h;
                } else if (this.templateInteraction.type === 'resize-tr') {
                    newW = Math.round(this.templateInteraction.origW + dx);
                    let maxW = this.boardWidth - this.templateInteraction.origX;
                    let maxW_H = (this.templateInteraction.origY + this.templateInteraction.origH) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.y = this.templateInteraction.origY + this.templateInteraction.origH - sizes.h;
                } else if (this.templateInteraction.type === 'resize-bl') {
                    newW = Math.round(this.templateInteraction.origW - dx);
                    let maxW = this.templateInteraction.origX + this.templateInteraction.origW;
                    let maxW_H = (this.boardHeight - this.templateInteraction.origY) * aspect;
                    newW = Math.max(20, Math.min(newW, maxW, maxW_H));
                    const sizes = enforceLimits(newW);
                    tpl.w = sizes.w; tpl.h = sizes.h;
                    tpl.x = this.templateInteraction.origX + this.templateInteraction.origW - sizes.w;
                }
            }

            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (this.uiLiveInputX) {
                    this.uiLiveInputX.setAttribute('data-value', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                }
                if (this.uiLiveInputY) {
                    this.uiLiveInputY.setAttribute('data-value', tpl.y);
                    this.uiLiveInputY.textContent = tpl.y;
                }
            }
            this.requestRender();
            return;
        }

        if (this.isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - this.lastMouse.x;
            const dy = e.touches[0].clientY - this.lastMouse.y;

            if (!this.touchHasMoved) {
                const totalDist = Math.hypot(e.touches[0].clientX - this.touchStartX, e.touches[0].clientY - this.touchStartY);
                if (totalDist > 8) {
                    this.touchHasMoved = true;
                }
            }

            if (this.touchHasMoved) {
                e.preventDefault(); 
                this.transform.x += dx;
                this.transform.y += dy;
                this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                
                if (typeof this.limitBounds === 'function') this.limitBounds();
                if (this.interactionMode === 'offline_text' && typeof this.updateFloatingTextPosition === 'function') {
                    this.updateFloatingTextPosition();
                }
                this.requestRender();
            }
        }
    },

    handleTouchEnd(e) {
        if (this.isDraggingCustomPicker) {
            this.isDraggingCustomPicker = false;
            return;
        }

        if (this.interactionMode === 'offline_text' && this.isTextDragging) {
            this.isTextDragging = false;
            this.textDragStart = null;
        }

        if (this.interactionMode === 'offline_shape' && this.isShapeDrawing) {
            this.commitShapeDrawing();
            return;
        }

        if (this.interactionMode === 'offline_moving_area') {
            if (this.moveAreaStep === 1 && this.moveAreaBox) {
                this.moveAreaStep = 2;
                this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                return;
            }
            if (this.moveAreaStep === 3 && this.moveAreaBox) {
                const dx = this.moveAreaBox.dx || 0;
                const dy = this.moveAreaBox.dy || 0;
                if (dx !== 0 || dy !== 0) {
                    this.commitMoveArea();
                } else {
                    this.moveAreaStep = 2;
                    this.selectMoveArea(this.moveAreaBox.x1, this.moveAreaBox.y1, this.moveAreaBox.x2, this.moveAreaBox.y2, 0, 0, 2);
                }
                return;
            }
        }

        if (this.interactionMode === 'offline_spray' && this.isSpraying) {
            this.stopSpray();
            return;
        }

        if (this.isBrushErasing) {
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isDitherPainting) {
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isShadingPainting) {
            this.isShadingPainting = false;
            this.shadingLastCoords = null;
            if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isBrushPainting) {
            this.isBrushPainting = false;
            this.brushLastCoords = null;
            if (this.isOfflineMode) {
                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'PUSH_PIXELS',
                        payload: { pixels: [], strokePhase: 'end' }
                    });
                }
                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
            }
            return;
        }

        if (this.isPinching) {
            if (e.touches.length < 2) {
                this.isPinching = false;
                this.isDragging = false; 
            }
            return;
        }

        if (this.templateInteraction) {
            this.templateInteraction = null;
            this.requestRender();
            if (this.liveShareStatus === 'owner' && this.activeTemplateId === this.liveTemplateId) {
                if (typeof this.emitLiveImageUpdate === 'function') {
                    this.emitLiveImageUpdate();
                }
            }
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;

            const touchDuration = Date.now() - this.touchStartTime;
            if (!this.touchHasMoved && touchDuration < 300) {
                
                if (!this.isSpectator && !this.isResetLocked && !this.isResizeLocked) {
                    const coords = this.getBoardCoords(this.touchStartX, this.touchStartY);
                    if (coords) {
                        if (this.interactionMode === 'offline_bucket') {
                            this.executeOfflineBucket(coords.x, coords.y);
                            return;
                        }

                        const bw = this.boardWidth || 64;
                        const key = (coords.y << 16) | coords.x;
                        const symX = bw - 1 - coords.x;
                        const symKey = (coords.y << 16) | symX;
                        const hasSym = this.isMirrorMode && symX >= 0 && symX < bw && symX !== coords.x;

                        if (this.selectedPixels.has(key)) {
                            this.selectionMode = 'remove';
                            this.selectedPixels.delete(key);
                            if (hasSym) this.selectedPixels.delete(symKey);
                        } else {
                            this.selectionMode = 'add';
                            const maxBalance = this.getMaxBalance();
                            if (this.selectedPixels.size < maxBalance) {
                                this.selectedPixels.add(key);
                                if (hasSym && this.selectedPixels.size < maxBalance) {
                                    this.selectedPixels.add(symKey);
                                }
                            } else {
                                showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
                            }
                        }
                        this.updateSelectionUI();

                        this.hoveredPixel = coords;
                        this._selectionBitmaskDirty = true;
                        this.setCanvasBadge('coords', 'my_location', `${coords.x} , ${coords.y}`, 'left');
                        
                        this.requestRender();
                    }
                }
            }
        }
    },

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
    },

    getExactBoardCoords(clientX, clientY) {
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        return {
            x: (mouseX - this.transform.x) / this.transform.scale,
            y: (mouseY - this.transform.y) / this.transform.scale
        };
    },

    calculateHoverPixel(clientX, clientY) {
        const newHover = this.getBoardCoords(clientX, clientY);
        const hasHoveredPixel = !!this.hoveredPixel;
        const hasNewHover = !!newHover;
        
        let changed = false;
        if (hasHoveredPixel !== hasNewHover) {
            changed = true;
        } else if (hasHoveredPixel && hasNewHover) {
            if (this.hoveredPixel.x !== newHover.x || this.hoveredPixel.y !== newHover.y) {
                changed = true;
            }
        }

        if (changed) {
            this.hoveredPixel = newHover;
            this._selectionBitmaskDirty = true;
            this.requestRender();
            if (newHover) {
                this.setCanvasBadge('coords', 'my_location', `${newHover.x} , ${newHover.y}`, 'left');
            } else {
                this.setCanvasBadge('coords', 'my_location', '- , -', 'left');
            }
        }
    },

    updateSelectionUI() {
        if (!this.btnPlacePixels || !this.txtPlacePixels) return;

        if (this.interactionMode === 'owner_erasing' || this.interactionMode === 'owner_protecting') {
                        this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
            if (this.interactionMode === 'owner_protecting') {
                this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');
            }
            
            let areaSize = 0;
            if (this.ownerEraserBox) {
                areaSize = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            }

            if (this.ownerEraserBox && this.ownerEraserStep === 2) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                this.txtPlacePixels.textContent = this.interactionMode === 'owner_erasing' ? `Vaciar zona (${areaSize} px)` : `Modificar protección (${areaSize} px)`;
            } else if (this.ownerEraserStep === 1) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Definiendo zona (${areaSize} px)...`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Haz clic en el lienzo';
            }
            return;
        }

        if (this.interactionMode === 'placing_mines') {
                        this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--success');

            const count = this.selectedPixels.size;
            if (count > 0 && count <= 10) {
                this.btnPlacePixels.classList.remove('disabled-interaction');
                this.txtPlacePixels.textContent = `Colocar minas (${count}/10)`;
            } else if (count > 10) {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = `Máx 10 minas`;
            } else {
                this.btnPlacePixels.classList.add('disabled-interaction');
                this.txtPlacePixels.textContent = 'Selecciona píxeles';
            }
            return;
        }

        let maxBalance = this.getMaxBalance();
        
        if (this.interactionMode === 'bombing') {
                        this.btnPlacePixels.classList.replace('component-button--success', 'component-button--danger');
        } else {
            this.btnPlacePixels.classList.remove('component-button--success');
            this.btnPlacePixels.classList.remove('component-button--danger');
        }

        if (this.selectedPixels.size > 0 && this.selectedPixels.size <= maxBalance) {
            this.btnPlacePixels.classList.remove('disabled-interaction');
            if (this.interactionMode === 'bombing') {
                this.txtPlacePixels.textContent = PerksRegistry.getBombButtonLabel(this.activeBomb);
            } else {
                this.txtPlacePixels.textContent = window.__('btn_place_pixels');
            }
        } else {
            this.btnPlacePixels.classList.add('disabled-interaction');
            if (this.selectedPixels.size > maxBalance) {
                this.txtPlacePixels.textContent = (__('lbl_max_pixels')).replace(':max', maxBalance === Infinity ? '∞' : maxBalance);
            } else {
                this.txtPlacePixels.textContent = __('btn_select_pixels');
            }
        }
    },

    placePixels() {
        if ((this.selectedPixels.size === 0 && this.interactionMode !== 'owner_erasing' && this.interactionMode !== 'owner_protecting') || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'placing_mines') {
            if (this.selectedPixels.size === 0 || this.selectedPixels.size > 10) return;
            const pixels = Array.from(this.selectedPixels).map(key => {
                return { x: key & 0xffff, y: key >> 16 };
            });
            this.executePlaceMines(pixels);
            return;
        }

        if (this.interactionMode === 'owner_erasing') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            window.modalSystem.show('confirmClearAreaModal', { count }).then(result => {
                if (result && result.confirmed) {
                    this.executeOwnerClearArea();
                }
            });
            return;
        }

        if (this.interactionMode === 'owner_protecting') {
            if (!this.ownerEraserBox) return;
            const count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
            window.modalSystem.show('confirmProtectAreaModal', { count }).then(result => {
                const actStr = (typeof result === 'string') ? result : (result?.action || (result?.confirmed ? 'protect' : null));
                if (actStr === 'protect' || actStr === 'unprotect') {
                    this.executeOwnerProtectArea(actStr === 'protect');
                }
            });
            return;
        }


        let maxBalance = this.getMaxBalance();

        if (this.selectedPixels.size > maxBalance) {
            showMessage(__('err_pixel_limit')?.replace(':limit', maxBalance === Infinity ? '∞' : maxBalance), 'warning');
            return;
        }

        if (this.interactionMode === 'bombing') {
            const requiredTargets = typeof PerksRegistry !== 'undefined' ? PerksRegistry.getTargetCount(this.activeBomb) : 1;
            if (this.selectedPixels.size < requiredTargets) {
                const msgKey = requiredTargets > 1 ? 'msg_select_targets_count' : 'msg_select_target';
                const msgText = (typeof window.__ === 'function' ? window.__(msgKey) : null)?.replace(':count', requiredTargets) || `Selecciona ${requiredTargets} objetivo(s)`;
                if (typeof showMessage === 'function') showMessage(msgText, 'warning');
                return;
            }
            const targets = Array.from(this.selectedPixels).map(key => ({
                x: key & 0xFFFF,
                y: key >> 16
            }));
            const usedPerk = this.activeBomb;
            const perkConfig = typeof PerksRegistry !== 'undefined' ? PerksRegistry.get(usedPerk) : null;
            const durationSecs = parseInt(perkConfig?.warning_seconds || 3, 10);
            const perkRadius = typeof PerksRegistry !== 'undefined' 
                ? PerksRegistry.getExplosionRadius(usedPerk, this.boardWidth, this.boardHeight) 
                : 10;


            if (typeof this.showPreparingPerkBadge === 'function' && usedPerk) {
                this.showPreparingPerkBadge(usedPerk, usedPerk);
            }

            const cooldownMs = (durationSecs + 1) * 1000;
            if (typeof this.setGlobalPerkCooldown === 'function') {
                this.setGlobalPerkCooldown(cooldownMs);
            }

            if (this.wsManager) {
                this.wsManager.send({
                    type: 'bomb_pixel',
                    targets: targets,
                    x: targets[0]?.x ?? 0,
                    y: targets[0]?.y ?? 0,
                    perk: usedPerk,
                    width: this.boardWidth,
                    userId: window.activeUserId || null
                });
            }
            this.interactionMode = 'normal';
            this.activeBomb = null;
            this.perkBombReady = null;
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            return;
        }

        // Se envía el color hexadecimal directamente
        let colorHex = this.currentColor;

        let validPixels = [];
        let hitProtected = false;
        
        this.selectedPixels.forEach(key => {
            const x = key & 0xFFFF;
            const y = key >> 16;
            const offset = (y * this.boardWidth) + x;

            if (this.protectedPixels && this.protectedPixels.has(offset)) {
                if (!this.isOwner) {
                    hitProtected = true;
                    return;
                }
            }
            validPixels.push({ key, x, y, offset });
        });
        
        if (hitProtected) {
            if (!this.lastProtectedToastTime || (Date.now() - this.lastProtectedToastTime > 2000)) {
                showMessage(__('err_pixel_protected'), 'warning');
                this.lastProtectedToastTime = Date.now();
            }
        }

        if (validPixels.length === 0) {
            this.selectedPixels.clear();
            this.updateSelectionUI();
            this.requestRender();
            return;
        }

        if (this.renderWorker) {
            const pixelsToPush = validPixels.map(p => ({
                x: p.x,
                y: p.y,
                color: this.currentColor
            }));
            this.renderWorker.postMessage({ type: 'PUSH_PIXELS', payload: { pixels: pixelsToPush } });
        } else if (this.offscreenCtx) {
            if (this.isOfflineMode) {
                if (!this.undoStack) this.undoStack = [];
                const diffs = [];
                validPixels.forEach(p => {
                    const img = this.offscreenCtx.getImageData(p.x, p.y, 1, 1);
                    const prevVal = new Uint32Array(img.data.buffer)[0];
                    const nextVal = colorToAbgr(this.currentColor);
                    if (prevVal !== nextVal) {
                        diffs.push({ x: p.x, y: p.y, prev: prevVal, next: nextVal });
                    }
                });
                if (diffs.length > 0) {
                    this.undoStack.push({ type: 'pixels', diffs });
                    this.redoStack = [];
                    if (this.undoStack.length > 50) this.undoStack.shift();
                }
            }
            validPixels.forEach(p => {
                this.offscreenCtx.fillStyle = this.currentColor;
                this.offscreenCtx.clearRect(p.x, p.y, 1, 1);
                this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
            });
        }
        
        if (this.wsManager && validPixels.length > 0) {
            const parseColorToRgba = (color) => {
                if (!color || color === 'transparent') {
                    return { r: 0, g: 0, b: 0, a: 0 };
                }
                let hex = color.replace('#', '');
                let r = 0, g = 0, b = 0, a = 255;
                if (hex.length === 3) {
                    r = parseInt(hex[0] + hex[0], 16);
                    g = parseInt(hex[1] + hex[1], 16);
                    b = parseInt(hex[2] + hex[2], 16);
                } else if (hex.length === 6) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                } else if (hex.length === 8) {
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                    a = parseInt(hex.substring(6, 8), 16);
                }
                return { r, g, b, a };
            };

            if (validPixels.length === 1) {
                const p = validPixels[0];
                const buffer = new ArrayBuffer(9);
                const view = new DataView(buffer);
                view.setUint8(0, 1); // 1 = pixel opCode
                view.setUint16(1, p.x, false);
                view.setUint16(3, p.y, false);
                
                const rgba = parseColorToRgba(colorHex);
                view.setUint8(5, rgba.r);
                view.setUint8(6, rgba.g);
                view.setUint8(7, rgba.b);
                view.setUint8(8, rgba.a);

                this.wsManager.send(buffer);
            } else {
                const buffer = new ArrayBuffer(7 + 4 * validPixels.length);
                const view = new DataView(buffer);
                
                view.setUint8(0, 3); // 3 = batch_pixels opCode
                view.setUint16(1, validPixels.length, false);
                
                const rgba = parseColorToRgba(colorHex);
                view.setUint8(3, rgba.r);
                view.setUint8(4, rgba.g);
                view.setUint8(5, rgba.b);
                view.setUint8(6, rgba.a);
                
                let offset = 7;
                for (let idx = 0; idx < validPixels.length; idx++) {
                    view.setUint16(offset, validPixels[idx].x, false);
                    view.setUint16(offset + 2, validPixels[idx].y, false);
                    offset += 4;
                }
                this.wsManager.send(buffer);
            }
        }

        if (this.isOfflineMode) {
            try {
                CanvasSyncChannel.broadcast({
                    type: 'local_offline_stroke',
                    canvasId: this.canvasIntId,
                    canvasUuid: this.canvasId,
                    pixels: validPixels,
                    color: this.currentColor
                });
            } catch (e) {}
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.selectedPixels.clear();
            this.updateSelectionUI();
            if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
            this.requestRender();
            return;
        }

        if (this.interactionMode === 'normal') {
            if (!this.perkNoCooldown) {
                this.cooldownBalance -= validPixels.length;
            }
            
            if (this.cooldownBalance < this.cooldownMax && this.cooldownNextIn <= 0) {
                this.cooldownNextIn = this.cooldownSec;
                this.lastSyncTime = Date.now();
            }
            showMessage(__('msg_pixels_placed'), 'success');
        }

        this.selectedPixels.clear();
        
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    setGlobalPerkCooldown(cooldownMs) {
        this.perkGlobalCooldownUntil = Date.now() + cooldownMs;
        
        if (!document.getElementById('perk-cooldown-style')) {
            const style = document.createElement('style');
            style.id = 'perk-cooldown-style';
            style.textContent = `
                .disable-interaction, .disabled-interaction {
                    pointer-events: none !important;
                    opacity: 0.35 !important;
                    cursor: not-allowed !important;
                    filter: grayscale(0.8) !important;
                    transition: opacity 0.3s ease, filter 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        if (typeof this.updatePerkBadges === 'function') {
            this.updatePerkBadges();
        }

        setTimeout(() => {
            if (typeof this.updatePerkBadges === 'function') {
                this.updatePerkBadges();
            }
        }, cooldownMs);
    },

    cancelInteractionMode() {
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.activeBomb = null;
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.cancelMoveArea === 'function') this.cancelMoveArea(true);
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (btnEraser) btnEraser.classList.remove('active');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        if (btnBucket) btnBucket.classList.remove('active');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        if (btnSpray) btnSpray.classList.remove('active');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        if (btnDither) btnDither.classList.remove('active');
        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnShapes) btnShapes.classList.remove('active');
        const shapesGrid = document.querySelector('[data-ref="shapes-grid"]');
        if (shapesGrid) {
            shapesGrid.querySelectorAll('.component-shape-card').forEach(c => c.classList.remove('active'));
        }
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.remove('active');
        const floatingTextEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (floatingTextEl) floatingTextEl.classList.add('disabled');
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;
        this.isTextDragging = false;
        this.textDragStart = null;

        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;
        this.isBrushPainting = false;
        this.brushLastCoords = null;
        this.isShadingPainting = false;
        this.shadingLastCoords = null;
        if (this.shadingTouchedInStroke) this.shadingTouchedInStroke.clear();
        const btnBrush = document.querySelector('[data-action="toggleOfflineBrush"]');
        if (btnBrush) btnBrush.classList.remove('active');
        const btnShading = document.querySelector('[data-action="toggleOfflineShading"]');
        if (btnShading) btnShading.classList.remove('active');
        const btnEyedropper = document.querySelector('[data-action="toggleEyedropper"]');
        if (btnEyedropper) btnEyedropper.classList.remove('active');
        if (this.canvas) this.canvas.classList.remove('component-cursor-eyedropper');
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        if (typeof this.requestRender === 'function') this.requestRender();
        showMessage(window.__('special_mode_deactivated'), 'info');
    },

    toggleEyedropper() {
        if (this.interactionMode === 'offline_eyedropper') {
            this.interactionMode = 'normal';
            const btn = document.querySelector('[data-action="toggleEyedropper"]');
            if (btn) btn.classList.remove('active');
            if (this.canvas) this.canvas.classList.remove('component-cursor-eyedropper');
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_eyedropper';
            const btn = document.querySelector('[data-action="toggleEyedropper"]');
            if (btn) btn.classList.add('active');
            if (this.canvas) this.canvas.classList.add('component-cursor-eyedropper');
        }
        this.requestRender();
    },

    toggleOfflineBrush() {
        const btnBrush = document.querySelector('[data-action="toggleOfflineBrush"]');
        if (this.interactionMode === 'offline_brush') {
            this.interactionMode = 'normal';
            if (btnBrush) btnBrush.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_brush';
            if (btnBrush) btnBrush.classList.add('active');
            this.openSubtoolbar('brush');
            this.openBrushSizeToolbar('brush');
        }
        this.requestRender();
    },

    setBrushShape(shape = 'square', targetEl = null) {
        this.brushShape = shape;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setBrushShape"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-brush-shape') === shape));
        }
        const shapeNames = { square: 'Cuadrado', circle: 'Redondo', slash: 'Diagonal' };
        if (typeof showMessage === 'function') {
            showMessage(`Forma de pincel: ${shapeNames[shape] || shape}`, 'info');
        }
        this.requestRender();
    },

    setBrushSize(size = 1, targetEl = null) {
        this.brushSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setBrushSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.brushSize));
        }
        if (typeof showMessage === 'function') {
            showMessage(`Tamaño de pincel: ${this.brushSize}x${this.brushSize} px`, 'info');
        }
        this.requestRender();
    },

    toggleOfflineShading() {
        const btnShading = document.querySelector('[data-action="toggleOfflineShading"]');
        if (this.interactionMode === 'offline_shading') {
            this.interactionMode = 'normal';
            if (btnShading) btnShading.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
        } else {
            if (typeof this.cancelInteractionMode === 'function') {
                this.cancelInteractionMode();
            }
            this.interactionMode = 'offline_shading';
            if (btnShading) btnShading.classList.add('active');
            this.openSubtoolbar('shading');
            this.openBrushSizeToolbar('shading');
            showMessage(window.__('msg_shading_on') || 'Modo Sombreado activado. Pinta sobre píxeles para dar luces o sombras.', 'info');
        }
        this.requestRender();
    },

    setShadingMode(mode = 'shadow', targetEl = null) {
        this.shadingMode = mode;
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            const btns = subtoolbar.querySelectorAll('[data-action="setShadingMode"]');
            btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-shading-mode') === mode));
        }
        const label = mode === 'highlight' ? 'Iluminar (+8%)' : 'Sombrear (-8%)';
        if (typeof showMessage === 'function') {
            showMessage(`Pincel de Sombreado: ${label}`, 'info');
        }
    },

    setShadingSize(size = 1, targetEl = null) {
        this.shadingSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setShadingSize"]');
            btns.forEach(b => b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === this.shadingSize));
        }
        if (typeof showMessage === 'function') {
            showMessage(`Pincel de Sombreado: ${this.shadingSize}x${this.shadingSize} px`, 'info');
        }
    },

    toggleTileGrid() {
        const modes = [0, 8, 16, 32];
        const current = this.tileGridSize || 0;
        const nextIdx = (modes.indexOf(current) + 1) % modes.length;
        this.tileGridSize = modes[nextIdx];

        const btn = document.querySelector('[data-action="toggleTileGrid"]');
        if (btn) {
            btn.classList.toggle('active', this.tileGridSize > 0);
        }

        if (this.tileGridSize === 0) {
            showMessage(window.__('msg_tile_grid_off') || 'Cuadrícula de Tiles desactivada', 'info');
        } else {
            const tpl = window.__('msg_tile_grid_on') || 'Cuadrícula de Tiles: :size x :size px';
            const msg = tpl.replace(/:size/g, this.tileGridSize);
            showMessage(msg, 'success');
        }
        this.requestRender();
    },

    getBrushOffsets(size = 1, shape = 'square') {
        const offsets = [];
        if (size <= 1) {
            return [{ dx: 0, dy: 0 }];
        }
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        if (shape === 'circle') {
            if (size === 2) {
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        offsets.push({ dx, dy });
                    }
                }
            } else if (size % 2 === 1) {
                const r = (size - 1) / 2;
                const maxDistSq = r * r + 0.45;
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (dx * dx + dy * dy <= maxDistSq) {
                            offsets.push({ dx, dy });
                        }
                    }
                }
            } else {
                const half = size / 2;
                const maxDistSq = (half - 0.5) * (half - 0.5) + (half - 0.85);
                for (let dy = -half; dy < half; dy++) {
                    for (let dx = -half; dx < half; dx++) {
                        const cx = dx + 0.5;
                        const cy = dy + 0.5;
                        if (cx * cx + cy * cy <= maxDistSq) {
                            offsets.push({ dx, dy });
                        }
                    }
                }
            }
        } else if (shape === 'slash') {
            for (let i = -half1; i <= half2; i++) {
                offsets.push({ dx: i, dy: -i });
            }
        } else {
            for (let dy = -half1; dy <= half2; dy++) {
                for (let dx = -half1; dx <= half2; dx++) {
                    offsets.push({ dx, dy });
                }
            }
        }
        return offsets.length > 0 ? offsets : [{ dx: 0, dy: 0 }];
    },

    applyBrushAt(cx, cy, isStart = false) {
        const size = this.brushSize || 1;
        const shape = this.brushShape || 'square';
        const color = this.currentColor || '#000000';
        const offsets = this.getBrushOffsets(size, shape);
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToPaint = [];
        const seen = new Set();

        offsets.forEach(off => {
            const px = cx + off.dx;
            const py = cy + off.dy;
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const k = (py << 16) | px;
                if (!seen.has(k)) {
                    seen.add(k);
                    pixelsToPaint.push({ x: px, y: py, color });
                }
            }
            if (this.isMirrorMode) {
                const symX = bw - 1 - (cx + off.dx);
                const py = cy + off.dy;
                if (symX >= 0 && symX < bw && py >= 0 && py < bh) {
                    const k = (py << 16) | symX;
                    if (!seen.has(k)) {
                        seen.add(k);
                        pixelsToPaint.push({ x: symX, y: py, color });
                    }
                }
            }
        });

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    applyShadingAt(cx, cy, isStart = false) {
        const size = this.shadingSize || 1;
        const mode = this.shadingMode || 'shadow';
        const offsets = this.getBrushOffsets(size, 'square');
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const pixelsToPaint = [];
        if (!this.shadingTouchedInStroke) this.shadingTouchedInStroke = new Set();

        const processCoord = (px, py) => {
            if (px < 0 || px >= bw || py < 0 || py >= bh) return;
            const key = (py << 16) | px;
            if (this.shadingTouchedInStroke.has(key)) return;
            this.shadingTouchedInStroke.add(key);

            let currentHex = '#FFFFFF';
            if (this.offscreenCtx) {
                const img = this.offscreenCtx.getImageData(px, py, 1, 1);
                const val = new Uint32Array(img.data.buffer)[0];
                if (val !== 0) {
                    currentHex = abgrToHex(val);
                }
            }

            const hsv = hexToHsv(currentHex);
            let h = hsv.h;
            let s = hsv.s;
            let v = hsv.v;

            if (mode === 'highlight') {
                v = Math.min(100, v + 8);
                if (v >= 96) {
                    s = Math.max(0, s - 8);
                }
            } else {
                v = Math.max(0, v - 8);
                if (v <= 20) {
                    s = Math.min(100, s + 4);
                }
            }

            const newHex = hsvToHex(h, s, v);
            pixelsToPaint.push({ x: px, y: py, color: newHex });
        };

        offsets.forEach(off => {
            processCoord(cx + off.dx, cy + off.dy);
            if (this.isMirrorMode) {
                const symX = bw - 1 - (cx + off.dx);
                processCoord(symX, cy + off.dy);
            }
        });

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillStyle = p.color;
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
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

    ensureExplosionStyles() {
        // Estilos integrados en components.css (.nuclear-shake y .canvas-flash-overlay)
    },

    triggerExplosionEffect(cx, cy, r, perkId) {
        if (!this.explosions) this.explosions = [];
        this.explosions.push({
            x: cx,
            y: cy,
            maxRadius: r,
            perkId: perkId,
            startTime: Date.now(),
            duration: PerksRegistry.getExplosionDuration(perkId)
        });
        
        this.ensureExplosionStyles();

        if (perkId === 'orbital_cannon_1') {
            const ball = document.querySelector('.orbital-cannon-charge-ball');
            if (ball) ball.remove();
        }

        if (PerksRegistry.hasScreenShake(perkId)) {
            if (this.canvas) {
                this.canvas.classList.add('nuclear-shake');
                setTimeout(() => {
                    this.canvas.classList.remove('nuclear-shake');
                }, PerksRegistry.getShakeDuration(perkId));
            }
        }
        
        if (PerksRegistry.hasScreenFlash(perkId)) {
            const flashMs = PerksRegistry.getFlashDuration(perkId);
            const flash = document.createElement('div');
            flash.style.position = 'fixed';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw';
            flash.style.height = '100vh';
            flash.style.backgroundColor = perkId === 'supernova_blast' ? '#fef08a' : 'white';
            flash.style.zIndex = '999999';
            flash.style.pointerEvents = 'none';
            flash.style.transition = `opacity ${flashMs / 1000}s ease-out`;
            document.body.appendChild(flash);
            void flash.offsetHeight;
            flash.style.opacity = '0';
            setTimeout(() => {
                if (flash.parentNode) flash.parentNode.removeChild(flash);
            }, flashMs + 100);
        }
        
        if (!this.renderWorker && !this.isExplosionLoopRunning) {
            this.isExplosionLoopRunning = true;
            const loop = () => {
                if (this.explosions && this.explosions.length > 0) {
                    this.explosions = this.explosions.filter(exp => (Date.now() - exp.startTime) < exp.duration);
                    this.requestRender();
                    requestAnimationFrame(loop);
                } else {
                    this.isExplosionLoopRunning = false;
                }
            };
            requestAnimationFrame(loop);
        }
    },

    // handleNuclearWarning gestionado por DesignNetwork.js


    updatePerkBadges() {
        const badgesRight = document.querySelector('[data-ref="badges-right"]');
        if (!badgesRight) return;

        // Clear only non-timer badges to prevent layout shifting/disappearing of scheduled events
        Array.from(badgesRight.children).forEach(badge => {
            const badgeId = badge.getAttribute('data-badge-id');
            if (badgeId !== 'reset-timer' && badgeId !== 'resize-timer') {
                badge.remove();
            }
        });
        const isGlobalCooldown = !!(this.perkGlobalCooldownUntil && Date.now() < this.perkGlobalCooldownUntil);

        const PERK_ORDER = PerksRegistry.getDisplayOrder();
        let renderedInventoryCount = 0;

        PERK_ORDER.forEach(perkId => {
            let isActive = false;
            let activeHtml = '';
            let isToggledOn = false;
            let icon = PerksRegistry.getIcon(perkId);
            let clickHandler = null;

            if (PerksRegistry.isBomb(perkId) && perkId !== 'mines_1') {
                isActive = (this.activeBomb === perkId && this.interactionMode === 'bombing');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-danger">${icon}</span><span>${titleText}</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.activeBomb = null;
                        this.perkBombReady = null;
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                    };
                }
            } else if (perkId === 'mines_1') {
                isActive = (this.interactionMode === 'placing_mines');
                
                if (isActive) {
                    isToggledOn = true;
                    const titleText = PerksRegistry.getLabel(perkId);
                    activeHtml = `<span class="material-symbols-rounded component-text-success">${icon}</span><span>${titleText}</span>`;
                    clickHandler = () => {
                        this.interactionMode = 'normal';
                        this.selectedPixels.clear();
                        this.updateSelectionUI();
                        this.updatePerkBadges();
                        this.syncMinesToWorker();
                        this.requestRender();
                    };
                }
            }

            if (isActive) {
                const badge = document.createElement('div');
                badge.className = 'component-badge';
                badge.style.cursor = 'pointer';
                badge.innerHTML = activeHtml;
                if (isGlobalCooldown) {
                    badge.classList.add('disable-interaction');
                }
                if (isToggledOn) {
                    if (PerksRegistry.isBomb(perkId)) {
                        badge.style.border = '1px solid var(--color-error)';
                        badge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    } else {
                        badge.style.border = '1px solid var(--color-success)';
                        badge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                    }
                }
                if (clickHandler) badge.addEventListener('click', clickHandler);
                badgesRight.appendChild(badge);
            }
        });

        if (this.isOwner) {
            const now = Date.now();
            const clearCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.clear && this.ownerCooldowns.clear > now ? Math.ceil((this.ownerCooldowns.clear - now) / 1000) : 0;
            const protectCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.protect && this.ownerCooldowns.protect > now ? Math.ceil((this.ownerCooldowns.protect - now) / 1000) : 0;
            const freezeCooldownLeft = this.ownerCooldowns && this.ownerCooldowns.freeze && this.ownerCooldowns.freeze > now ? Math.ceil((this.ownerCooldowns.freeze - now) / 1000) : 0;

            if (!this.isOfflineMode && (this.showOwnerTools || this.interactionMode === 'owner_erasing')) {
                const isToggledOn = (this.interactionMode === 'owner_erasing');
                const colorClass = isToggledOn ? 'component-text-danger' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-error)';
                    badgeEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }
                const label = window.__('badge_owner_eraser') || 'Borrador';
                if (clearCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">cleaning_services</span><span>${label} (${clearCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">cleaning_services</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (clearCooldownLeft > 0) return;
                    this.toggleOwnerEraser();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (!this.isOfflineMode && (this.showOwnerTools || this.isFrozen)) {
                const isToggledOn = this.isFrozen;
                const colorClass = isToggledOn ? 'component-text-warning' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-freeze-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-warning)';
                    badgeEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                }
                const label = isToggledOn ? (window.__('badge_owner_unfreeze') || 'Descongelar Actividad') : (window.__('badge_owner_freeze') || 'Congelar Actividad');
                if (freezeCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">ac_unit</span><span>${label} (${freezeCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">ac_unit</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (freezeCooldownLeft > 0) return;
                    this.toggleOwnerFreeze();
                });
                badgesRight.appendChild(badgeEl);
            }

            if (!this.isOfflineMode && (this.showOwnerTools || this.interactionMode === 'owner_protecting')) {
                const isToggledOn = (this.interactionMode === 'owner_protecting');
                const colorClass = isToggledOn ? 'component-text-success' : '';
                const badgeEl = document.createElement('div');
                badgeEl.className = 'component-badge component-badge--clickable owner-tool-badge owner-protect-badge';
                badgeEl.style.cursor = 'pointer';
                if (isToggledOn) {
                    badgeEl.style.border = '1px solid var(--color-success)';
                    badgeEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }
                const label = window.__('badge_owner_protect') || 'Protección Administrativa';
                if (protectCooldownLeft > 0) {
                    badgeEl.classList.add('disable-interaction');
                    badgeEl.innerHTML = `<span class="material-symbols-rounded">admin_panel_settings</span><span>${label} (${protectCooldownLeft}s)</span>`;
                } else {
                    badgeEl.innerHTML = `<span class="material-symbols-rounded ${colorClass}">admin_panel_settings</span><span>${label}</span>`;
                }
                badgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (protectCooldownLeft > 0) return;
                    this.toggleOwnerProtecting();
                });
                badgesRight.appendChild(badgeEl);
            }
        }
    },

    toggleOwnerEraser() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (this.interactionMode === 'owner_erasing') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnEraser) btnEraser.classList.remove('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off'), 'info');
        } else {
            this.interactionMode = 'owner_erasing';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnEraser) btnEraser.classList.add('active');
            if (typeof showMessage === 'function') showMessage('Modo Borrador de Lienzo activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    toggleOfflineMirror() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        this.isMirrorMode = !this.isMirrorMode;
        const btnMirror = document.querySelector('[data-action="toggleOfflineMirror"]');
        if (btnMirror) {
            if (this.isMirrorMode) {
                btnMirror.classList.add('active');
            } else {
                btnMirror.classList.remove('active');
            }
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MIRROR_MODE',
                payload: { isMirrorMode: this.isMirrorMode }
            });
        }

        if (typeof showMessage === 'function') {
            showMessage(
                this.isMirrorMode 
                    ? (window.__('msg_mirror_mode_on') || 'Modo Espejo activado. Dibuja para pintar en ambos lados a la vez.')
                    : (window.__('msg_mirror_mode_off') || 'Modo Espejo desactivado.'),
                'info'
            );
        }

        this.requestRender();
    },

    openSubtoolbar(name) {
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (!subtoolbar) return;
        subtoolbar.classList.remove('disabled');
        subtoolbar.classList.add('active');

        const groups = subtoolbar.querySelectorAll('.canvas-design-subtoolbar-group');
        groups.forEach(g => {
            if (g.getAttribute('data-subtoolbar') === name) {
                g.classList.remove('disabled');
            } else {
                g.classList.add('disabled');
            }
        });
        this.activeSubtoolbar = name;
    },

    closeSubtoolbar() {
        const subtoolbar = document.querySelector('[data-ref="offline-subtoolbar-vertical"]');
        if (subtoolbar) {
            subtoolbar.classList.remove('active');
            subtoolbar.classList.add('disabled');
            const groups = subtoolbar.querySelectorAll('.canvas-design-subtoolbar-group');
            groups.forEach(g => g.classList.add('disabled'));
        }
        this.activeSubtoolbar = null;
        this.closeBrushSizeToolbar();
    },

    openBrushSizeToolbar(forTool = 'eraser') {
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (!toolbar) return;
        toolbar.classList.remove('disabled');
        toolbar.classList.add('active');

        const groups = toolbar.querySelectorAll('.canvas-design-sizes-group');
        groups.forEach(g => {
            if (g.getAttribute('data-sizes-for') === forTool) {
                g.classList.remove('disabled');
                g.classList.add('active');
            } else {
                g.classList.remove('active');
                g.classList.add('disabled');
            }
        });

        if (forTool === 'eraser') {
            const btns = toolbar.querySelectorAll('[data-action="setBrushEraserSize"]');
            const currentSize = this.brushEraserSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'dither') {
            const btns = toolbar.querySelectorAll('[data-action="setDitherSize"]');
            const currentSize = this.ditherSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'brush') {
            const btns = toolbar.querySelectorAll('[data-action="setBrushSize"]');
            const currentSize = this.brushSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        } else if (forTool === 'shading') {
            const btns = toolbar.querySelectorAll('[data-action="setShadingSize"]');
            const currentSize = this.shadingSize || 1;
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == currentSize);
            });
        }
    },

    closeBrushSizeToolbar() {
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            toolbar.classList.remove('active');
            toolbar.classList.add('disabled');
        }
    },

    setBrushEraserSize(size) {
        this.brushEraserSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setBrushEraserSize"]');
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == this.brushEraserSize);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Tamaño de borrador: ${this.brushEraserSize}x${this.brushEraserSize} px`, 'info');
        }
    },

    toggleOfflineEraser() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        const isEraserActive = (this.interactionMode === 'owner_erasing' || this.interactionMode === 'offline_eraser_brush');

        if (isEraserActive) {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.isBrushErasing = false;
            this.brushEraserLastCoords = null;
            if (btnEraser) btnEraser.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_eraser_mode_off') || 'Modo borrador desactivado.', 'info');
        } else {
            const currentMode = this.offlineEraserMode || 'box';
            this.setOfflineEraserMode(currentMode);
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    setOfflineEraserMode(mode) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        this.offlineEraserMode = mode;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        const btnBox = document.querySelector('[data-ref="btn-eraser-mode-box"]');
        const btnBrush = document.querySelector('[data-ref="btn-eraser-mode-brush"]');
        if (btnBox) btnBox.classList.toggle('active', mode === 'box');
        if (btnBrush) btnBrush.classList.toggle('active', mode === 'brush');
        if (btnEraser) btnEraser.classList.add('active');

        this.activeBomb = null;
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.isBrushErasing = false;
        this.brushEraserLastCoords = null;

        if (mode === 'box') {
            this.interactionMode = 'owner_erasing';
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') {
                showMessage('Borrador de Selección / Área activado. Haz clic en la primera esquina para definir la zona.', 'info');
            }
        } else {
            this.interactionMode = 'offline_eraser_brush';
            this.openBrushSizeToolbar('eraser');
            if (typeof showMessage === 'function') {
                showMessage(`Borrador de Pincel Continuo (${this.brushEraserSize || 1}x${this.brushEraserSize || 1} px) activado. Haz clic y arrastra sobre el lienzo para borrar.`, 'info');
            }
        }

        this.openSubtoolbar('eraser');
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    applyBrushEraseAt(cx, cy, isStart = false) {
        const size = this.brushEraserSize || 1;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        const minX = Math.max(0, cx - half1);
        const maxX = Math.min((this.boardWidth || 64) - 1, cx + half2);
        const minY = Math.max(0, cy - half1);
        const maxY = Math.min((this.boardHeight || 64) - 1, cy + half2);

        if (minX > maxX || minY > maxY) return;

        const pixelsToErase = [];
        const bw = this.boardWidth || 64;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                pixelsToErase.push({ x, y, color: 'transparent' });
                if (this.isMirrorMode) {
                    const symX = bw - 1 - x;
                    if (symX >= 0 && symX < bw && symX !== x) {
                        pixelsToErase.push({ x: symX, y, color: 'transparent' });
                    }
                }
            }
        }

        if (pixelsToErase.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToErase,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                const w = maxX - minX + 1;
                const h = maxY - minY + 1;
                this.offscreenCtx.clearRect(minX, minY, w, h);
                if (this.isMirrorMode) {
                    const symMinX = bw - 1 - maxX;
                    this.offscreenCtx.clearRect(symMinX, minY, w, h);
                }
            }
        }
    },

    toggleOfflineBucket() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_bucket') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            if (btnBucket) btnBucket.classList.remove('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_bucket_mode_off') || 'Modo Bote de Pintura desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_bucket';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnBucket) btnBucket.classList.add('active');
            if (typeof showMessage === 'function') showMessage(window.__('msg_bucket_mode_on') || 'Modo Bote de Pintura activado. Haz clic en una zona para rellenar.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    toggleOfflineSpray() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_spray') {
            this.stopSpray();
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            if (btnSpray) btnSpray.classList.remove('active');
            this.closeSubtoolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_off') || 'Modo Spray desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_spray';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (btnSpray) btnSpray.classList.add('active');
            this.openSubtoolbar('spray');
            const currentSpraySize = this.sprayRadius || 5;
            const sprayGroup = document.querySelector('[data-subtoolbar="spray"]');
            if (sprayGroup) {
                const btns = sprayGroup.querySelectorAll('[data-action="setSpraySize"]');
                btns.forEach(btn => {
                    const val = btn.getAttribute('data-size');
                    btn.classList.toggle('active', val == currentSpraySize);
                });
            }
            if (typeof showMessage === 'function') showMessage(window.__('msg_spray_mode_on') || 'Modo Spray activado. Mantén presionado y arrastra para pintar.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    setSpraySize(size) {
        const s = parseInt(size, 10) || 5;
        this.sprayRadius = s;
        this.sprayDensity = Math.max(3, Math.round(s * 1.5));
        const group = document.querySelector('[data-subtoolbar="spray"]');
        if (group) {
            const btns = group.querySelectorAll('[data-action="setSpraySize"]');
            btns.forEach(btn => {
                const val = btn.getAttribute('data-size');
                btn.classList.toggle('active', val == s);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Spray ajustado a radio de ${s} px`, 'info');
        }
    },

    toggleOfflineDither() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');

        if (btnEraser) btnEraser.classList.remove('active');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);

        if (this.interactionMode === 'offline_dither') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (btnDither) btnDither.classList.remove('active');
            this.closeSubtoolbar();
            this.closeBrushSizeToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_off') || 'Modo Dithering desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_dither';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.isDitherPainting = false;
            this.ditherLastCoords = null;
            if (btnDither) btnDither.classList.add('active');

            this.openSubtoolbar('dither');
            this.openBrushSizeToolbar('dither');

            const currentPattern = this.ditherPattern || 'checker_50';
            this.setDitherPattern(currentPattern, false);

            if (typeof showMessage === 'function') showMessage(window.__('msg_dither_mode_on') || 'Modo Dithering activado. Pinta sombras y texturas retro.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    setDitherPattern(pattern, notify = true) {
        this.ditherPattern = pattern || 'checker_50';
        const group = document.querySelector('[data-subtoolbar="dither"]');
        if (group) {
            const btns = group.querySelectorAll('[data-action="setDitherPattern"]');
            btns.forEach(btn => {
                const p = btn.getAttribute('data-dither-pattern');
                btn.classList.toggle('active', p === this.ditherPattern);
            });
        }
        if (notify && typeof showMessage === 'function') {
            const names = {
                'checker_50': 'Ajedrez 50%',
                'dots_25': 'Puntos 25%',
                'dots_75': 'Densidad 75%',
                'diag_lines': 'Líneas Diagonales',
                'h_lines': 'Scanlines Horizontales'
            };
            showMessage(`Trama seleccionada: ${names[pattern] || pattern}`, 'info');
        }
    },

    setDitherSize(size) {
        this.ditherSize = parseInt(size, 10) || 1;
        const toolbar = document.querySelector('[data-ref="brush-size-toolbar"]');
        if (toolbar) {
            const btns = toolbar.querySelectorAll('[data-action="setDitherSize"]');
            btns.forEach(btn => {
                const s = btn.getAttribute('data-size');
                btn.classList.toggle('active', s == this.ditherSize);
            });
        }
        if (typeof showMessage === 'function') {
            showMessage(`Brocha de dithering: ${this.ditherSize}x${this.ditherSize} px`, 'info');
        }
    },

    isDitherPixel(x, y, pattern = 'checker_50') {
        switch (pattern) {
            case 'checker_50':
                return (x + y) % 2 === 0;
            case 'dots_25':
                return (x % 2 === 0 && y % 2 === 0);
            case 'dots_75':
                return !(x % 2 === 1 && y % 2 === 1);
            case 'diag_lines':
                return ((x + y) % 3 === 0);
            case 'h_lines':
                return (y % 2 === 0);
            default:
                return (x + y) % 2 === 0;
        }
    },

    applyDitherAt(cx, cy, isStart = false) {
        const size = this.ditherSize || 1;
        const pattern = this.ditherPattern || 'checker_50';
        const color = this.currentColor;
        const half1 = Math.floor((size - 1) / 2);
        const half2 = Math.floor(size / 2);

        const minX = Math.max(0, cx - half1);
        const maxX = Math.min((this.boardWidth || 64) - 1, cx + half2);
        const minY = Math.max(0, cy - half1);
        const maxY = Math.min((this.boardHeight || 64) - 1, cy + half2);

        if (minX > maxX || minY > maxY) return;

        const pixelsToPaint = [];
        const bw = this.boardWidth || 64;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (this.isDitherPixel(x, y, pattern)) {
                    pixelsToPaint.push({ x, y, color });
                }
                if (this.isMirrorMode) {
                    const symX = bw - 1 - x;
                    if (symX >= 0 && symX < bw && symX !== x) {
                        if (this.isDitherPixel(symX, y, pattern)) {
                            pixelsToPaint.push({ x: symX, y, color });
                        }
                    }
                }
            }
        }

        if (pixelsToPaint.length === 0) return;

        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPaint,
                        strokePhase: isStart ? 'start' : 'step'
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = color;
                pixelsToPaint.forEach(p => {
                    this.offscreenCtx.fillRect(p.x, p.y, 1, 1);
                });
            }
        }
    },

    selectGeometricShape(shapeId, targetEl) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (!this.activeGeometricShape) {
            this.activeGeometricShape = { shape: shapeId, fill: false, strokeWidth: 1 };
        } else {
            this.activeGeometricShape.shape = shapeId;
        }

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();

        this.interactionMode = 'offline_shape';
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.selectedPixels.clear();

        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnShapes) btnShapes.classList.add('active');

        const grid = document.querySelector('[data-ref="shapes-grid"]');
        if (grid) {
            grid.querySelectorAll('.component-shape-card').forEach(c => {
                const cId = c.getAttribute('data-shape-id');
                c.classList.toggle('active', cId === shapeId);
            });
        }

        const shapeNames = {
            'line': __('shape_line'),
            'rectangle': __('shape_rectangle'),
            'circle': __('shape_circle'),
            'triangle': __('shape_triangle'),
            'diamond': __('shape_diamond')
        };
        const sName = shapeNames[shapeId] || shapeId;
        showMessage(__('msg_shape_selected').replace(':shape', sName), 'info');

        this.updateShapeCardSVGs();
        this.updateSelectionUI();
        this.requestRender();
    },

    setGeometricShapeFill(isFill, targetEl) {
        if (!this.activeGeometricShape) {
            this.activeGeometricShape = { shape: 'rectangle', fill: !!isFill, strokeWidth: 1 };
        } else {
            this.activeGeometricShape.fill = !!isFill;
        }

        const bar = document.querySelector('[data-ref="shape-modes"]');
        if (bar) {
            bar.querySelectorAll('.component-shape-mode-pill').forEach(btn => {
                const f = btn.getAttribute('data-fill') === '1';
                btn.classList.toggle('active', f === isFill);
            });
        }

        this.updateShapeCardSVGs();
        if (this.isShapeDrawing) {
            this.updateShapePreview();
        }
    },

    updateShapeCardSVGs() {
        const isFill = !!this.activeGeometricShape?.fill;
        const grid = document.querySelector('[data-ref="shapes-grid"]');
        if (!grid) return;

        grid.querySelectorAll('.component-shape-card').forEach(card => {
            const supportsFill = card.getAttribute('data-supports-fill') === '1';
            const img = card.querySelector('img');
            if (img) {
                const outlineUrl = card.getAttribute('data-svg-outline');
                const fillUrl = card.getAttribute('data-svg-fill');
                if (isFill && supportsFill && fillUrl) {
                    img.src = fillUrl;
                } else if (outlineUrl) {
                    img.src = outlineUrl;
                }
            }
        });
    },

    deactivateGeometricShapeMode() {
        this.interactionMode = 'normal';
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;
        this.selectedPixels.clear();

        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnShapes) btnShapes.classList.remove('active');

        const grid = document.querySelector('[data-ref="shapes-grid"]');
        if (grid) {
            grid.querySelectorAll('.component-shape-card').forEach(c => c.classList.remove('active'));
        }

        showMessage(__('msg_shape_mode_off'), 'info');
        this.updateSelectionUI();
        this.requestRender();
    },

    updateShapePreview() {
        if (!this.isShapeDrawing || !this.shapeStart || !this.shapeCurrent) {
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const shapeType = this.activeGeometricShape?.shape || 'line';
        const isFill = !!this.activeGeometricShape?.fill;
        const strokeWidth = this.activeGeometricShape?.strokeWidth || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const x0 = this.shapeStart.x;
        const y0 = this.shapeStart.y;
        const x1 = this.shapeCurrent.x;
        const y1 = this.shapeCurrent.y;

        const points = generateShapePixels(shapeType, x0, y0, x1, y1, isFill, strokeWidth, bw, bh);

        const previewKeys = [];
        const seen = new Set();

        const addKey = (px, py) => {
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const key = (py << 16) | (px & 0xFFFF);
                if (!seen.has(key)) {
                    seen.add(key);
                    previewKeys.push(key);
                }
            }
        };

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            addKey(p.x, p.y);
            if (this.isMirrorMode) {
                const symX = bw - 1 - p.x;
                if (symX >= 0 && symX < bw && symX !== p.x) {
                    addKey(symX, p.y);
                }
            }
        }

        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;

        this.shapePreviewBox = {
            shape: shapeType,
            x0, y0, x1, y1,
            minX, minY, maxX, maxY,
            w, h,
            isFill,
            strokeWidth
        };

        this.shapePreviewPixels = previewKeys;
        this.setCanvasBadge('coords', 'shapes', `${w} × ${h} px`, 'left');
        this.requestRender();
    },

    commitShapeDrawing() {
        if (!this.isShapeDrawing || !this.shapeStart) {
            this.isShapeDrawing = false;
            this.shapeStart = null;
            this.shapeCurrent = null;
            this.shapePreviewPixels = null;
            this.shapePreviewBox = null;
            this.requestRender();
            return;
        }

        const start = this.shapeStart;
        const current = this.shapeCurrent || this.shapeStart;
        this.isShapeDrawing = false;
        this.shapeStart = null;
        this.shapeCurrent = null;
        this.shapePreviewPixels = null;
        this.shapePreviewBox = null;

        const shapeType = this.activeGeometricShape?.shape || 'line';
        const isFill = !!this.activeGeometricShape?.fill;
        const strokeWidth = this.activeGeometricShape?.strokeWidth || 1;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const points = generateShapePixels(shapeType, start.x, start.y, current.x, current.y, isFill, strokeWidth, bw, bh);
        if (!points || points.length === 0) {
            this.setCanvasBadge('coords', 'my_location', `${current.x} , ${current.y}`, 'left');
            this.requestRender();
            return;
        }

        const pixelsToPush = [];
        const seen = new Set();

        const addPixel = (px, py) => {
            if (px >= 0 && px < bw && py >= 0 && py < bh) {
                const key = (py << 16) | (px & 0xFFFF);
                if (!seen.has(key)) {
                    seen.add(key);
                    pixelsToPush.push({ x: px, y: py, color: this.currentColor });
                }
            }
        };

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            addPixel(p.x, p.y);
            if (this.isMirrorMode) {
                const symX = bw - 1 - p.x;
                if (symX >= 0 && symX < bw && symX !== p.x) {
                    addPixel(symX, p.y);
                }
            }
        }

        if (pixelsToPush.length > 0 && this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPush
                    }
                });
            }
            if (this.offscreenCtx) {
                this.offscreenCtx.fillStyle = this.currentColor;
                for (let i = 0; i < pixelsToPush.length; i++) {
                    const pt = pixelsToPush[i];
                    this.offscreenCtx.fillRect(pt.x, pt.y, 1, 1);
                }
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        }

        this.setCanvasBadge('coords', 'my_location', `${current.x} , ${current.y}`, 'left');
        this.requestRender();
    },

    activatePixelTextMode() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');
        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        const btnShapes = document.querySelector('[data-ref="btn-offline-shapes"]');
        if (btnBucket) btnBucket.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (btnMoveArea) btnMoveArea.classList.remove('active');
        if (btnShapes) btnShapes.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        if (this.interactionMode === 'offline_moving_area') this.cancelMoveArea(true);
        if (typeof this.closeSubtoolbar === 'function') this.closeSubtoolbar();

        this.interactionMode = 'offline_text';
        this.selectedPixels.clear();

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.add('active');

        if (!this.activePixelText) {
            this.activePixelText = {
                text: '',
                fontId: 'arcade_5x7',
                scale: 1,
                letterSpacing: 1,
                lineSpacing: 2,
                hasOutline: false,
                hasShadow: false
            };
        }

        if (!this.textPosition) {
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            this.textPosition = {
                x: Math.max(0, Math.floor(bw / 4)),
                y: Math.max(0, Math.floor(bh / 3))
            };
        }

        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
        const menuInput = document.querySelector('[data-ref="text-menu-input"]');
        if (floatingInput && this.activePixelText.text) {
            floatingInput.value = this.activePixelText.text;
        }
        if (menuInput && this.activePixelText.text) {
            menuInput.value = this.activePixelText.text;
        }

        if (floatingEl) {
            floatingEl.classList.remove('disabled');
            this.updateFloatingTextPosition();
        }

        showMessage(__('msg_text_selected'), 'info');
        this.updateSelectionUI();
        this.updatePixelTextPreview();
    },

    deactivatePixelTextMode() {
        this.interactionMode = 'normal';
        this.textPreviewPixels = null;
        this.textPreviewShadow = null;
        this.textPreviewOutline = null;
        this.textPreviewBox = null;
        this.isTextDragging = false;
        this.textDragStart = null;
        this.selectedPixels.clear();

        const btnText = document.querySelector('[data-ref="btn-offline-text"]');
        if (btnText) btnText.classList.remove('active');

        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (floatingEl) floatingEl.classList.add('disabled');

        showMessage(__('msg_text_mode_off'), 'info');
        this.updateSelectionUI();
        this.requestRender();
    },

    selectPixelFont(fontId, targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId, scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        } else {
            this.activePixelText.fontId = fontId;
        }

        const grid = document.querySelector('[data-ref="fonts-grid"]');
        if (grid) {
            grid.querySelectorAll('.component-font-card').forEach(c => {
                const cId = c.getAttribute('data-font-id');
                c.classList.toggle('active', cId === fontId);
            });
        }

        this.updatePixelTextPreview();
    },

    setPixelTextScale(scale, targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
        } else {
            this.activePixelText.scale = scale;
        }

        const bar = document.querySelector('[data-ref="text-scale-bar"]');
        if (bar) {
            bar.querySelectorAll('.component-shape-mode-pill').forEach(btn => {
                const s = parseInt(btn.getAttribute('data-scale'), 10) || 1;
                btn.classList.toggle('active', s === scale);
            });
        }

        this.updatePixelTextPreview();
    },

    togglePixelTextOutline(targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: true, hasShadow: false };
        } else {
            this.activePixelText.hasOutline = !this.activePixelText.hasOutline;
        }

        const btnOutline = document.querySelector('[data-ref="btn-text-outline"]');
        if (btnOutline) {
            btnOutline.classList.toggle('active', !!this.activePixelText.hasOutline);
        }

        this.updatePixelTextPreview();
    },

    togglePixelTextShadow(targetEl) {
        if (!this.activePixelText) {
            this.activePixelText = { text: '', fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: true };
        } else {
            this.activePixelText.hasShadow = !this.activePixelText.hasShadow;
        }

        const btnShadow = document.querySelector('[data-ref="btn-text-shadow"]');
        if (btnShadow) {
            btnShadow.classList.toggle('active', !!this.activePixelText.hasShadow);
        }

        this.updatePixelTextPreview();
    },

    updateFloatingTextPosition() {
        const floatingEl = document.querySelector('[data-ref="canvas-floating-text"]');
        if (!floatingEl || !this.canvas || !this.textPosition) return;

        const rect = this.canvas.getBoundingClientRect();
        const screenX = rect.left + this.transform.x + (this.textPosition.x * this.transform.scale);
        const screenY = rect.top + this.transform.y + (this.textPosition.y * this.transform.scale) - 38;

        floatingEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 240, screenX))}px`;
        floatingEl.style.top = `${Math.max(60, Math.min(window.innerHeight - 50, screenY))}px`;
    },

    updatePixelTextPreview() {
        if (this.interactionMode !== 'offline_text') return;

        const text = this.activePixelText?.text || '';
        const fontId = this.activePixelText?.fontId || 'arcade_5x7';
        const scale = this.activePixelText?.scale || 1;
        const letterSpacing = this.activePixelText?.letterSpacing || 1;
        const lineSpacing = this.activePixelText?.lineSpacing || 2;
        const hasOutline = !!this.activePixelText?.hasOutline;
        const hasShadow = !!this.activePixelText?.hasShadow;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        if (!this.textPosition) {
            this.textPosition = {
                x: Math.max(0, Math.floor(bw / 4)),
                y: Math.max(0, Math.floor(bh / 3))
            };
        }

        if (!text || text.trim().length === 0) {
            this.textPreviewPixels = null;
            this.textPreviewShadow = null;
            this.textPreviewOutline = null;
            this.textPreviewBox = {
                minX: this.textPosition.x,
                minY: this.textPosition.y,
                maxX: this.textPosition.x + 8,
                maxY: this.textPosition.y + 8,
                w: 8,
                h: 8,
                originX: this.textPosition.x,
                originY: this.textPosition.y
            };
            this.updateFloatingTextPosition();
            this.requestRender();
            return;
        }

        const result = renderPixelText({
            text,
            fontId,
            scale,
            letterSpacing,
            lineSpacing,
            hasOutline,
            hasShadow,
            originX: this.textPosition.x,
            originY: this.textPosition.y,
            boardW: bw,
            boardH: bh
        });

        const toKeyList = (pts) => {
            const keys = [];
            const seen = new Set();
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                if (pt.x >= 0 && pt.x < bw && pt.y >= 0 && pt.y < bh) {
                    const key = (pt.y << 16) | (pt.x & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        keys.push(key);
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - pt.x;
                        if (symX >= 0 && symX < bw && symX !== pt.x) {
                            const symKey = (pt.y << 16) | (symX & 0xFFFF);
                            if (!seen.has(symKey)) {
                                seen.add(symKey);
                                keys.push(symKey);
                            }
                        }
                    }
                }
            }
            return keys;
        };

        this.textPreviewPixels = toKeyList(result.points);
        this.textPreviewShadow = toKeyList(result.shadowPoints);
        this.textPreviewOutline = toKeyList(result.outlinePoints);
        this.textPreviewBox = {
            ...result.bounds,
            originX: this.textPosition.x,
            originY: this.textPosition.y
        };

        this.updateFloatingTextPosition();
        this.setCanvasBadge('coords', 'title', `${result.bounds.w} × ${result.bounds.h} px`, 'left');
        this.requestRender();
    },

    commitPixelText() {
        if (this.interactionMode !== 'offline_text' || !this.activePixelText) return;

        const text = this.activePixelText.text || '';
        if (!text || text.trim().length === 0) {
            this.deactivatePixelTextMode();
            return;
        }

        const fontId = this.activePixelText.fontId || 'arcade_5x7';
        const scale = this.activePixelText.scale || 1;
        const letterSpacing = this.activePixelText.letterSpacing || 1;
        const lineSpacing = this.activePixelText.lineSpacing || 2;
        const hasOutline = !!this.activePixelText.hasOutline;
        const hasShadow = !!this.activePixelText.hasShadow;
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const origin = this.textPosition || { x: 0, y: 0 };

        const result = renderPixelText({
            text,
            fontId,
            scale,
            letterSpacing,
            lineSpacing,
            hasOutline,
            hasShadow,
            originX: origin.x,
            originY: origin.y,
            boardW: bw,
            boardH: bh
        });

        const pixelsToPush = [];
        const seen = new Set();

        const addPoints = (pts, col) => {
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                if (pt.x >= 0 && pt.x < bw && pt.y >= 0 && pt.y < bh) {
                    const key = (pt.y << 16) | (pt.x & 0xFFFF);
                    if (!seen.has(key)) {
                        seen.add(key);
                        pixelsToPush.push({ x: pt.x, y: pt.y, color: col });
                    }
                    if (this.isMirrorMode) {
                        const symX = bw - 1 - pt.x;
                        if (symX >= 0 && symX < bw && symX !== pt.x) {
                            const symKey = (pt.y << 16) | (symX & 0xFFFF);
                            if (!seen.has(symKey)) {
                                seen.add(symKey);
                                pixelsToPush.push({ x: symX, y: pt.y, color: col });
                            }
                        }
                    }
                }
            }
        };

        if (hasShadow) {
            addPoints(result.shadowPoints, '#000000');
        }
        if (hasOutline) {
            addPoints(result.outlinePoints, '#000000');
        }
        addPoints(result.points, this.currentColor);

        if (pixelsToPush.length > 0 && this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'PUSH_PIXELS',
                    payload: {
                        pixels: pixelsToPush
                    }
                });
            }
            if (this.offscreenCtx) {
                for (let i = 0; i < pixelsToPush.length; i++) {
                    const pt = pixelsToPush[i];
                    this.offscreenCtx.fillStyle = pt.color;
                    this.offscreenCtx.fillRect(pt.x, pt.y, 1, 1);
                }
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        }

        showMessage(__('msg_text_stamped'), 'success');
        this.deactivatePixelTextMode();
    },

    cancelPixelText() {
        this.deactivatePixelTextMode();
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

        const isMenuInput = e.target.matches('[data-ref="text-menu-input"]');
        const isFloatingInput = e.target.matches('[data-ref="floating-text-input"]');

        if (isMenuInput || isFloatingInput) {
            const val = e.target.value;
            if (!this.activePixelText) {
                this.activePixelText = { text: val, fontId: 'arcade_5x7', scale: 1, letterSpacing: 1, lineSpacing: 2, hasOutline: false, hasShadow: false };
            } else {
                this.activePixelText.text = val;
            }

            if (isMenuInput) {
                const floatingInput = document.querySelector('[data-ref="floating-text-input"]');
                if (floatingInput && floatingInput !== e.target) floatingInput.value = val;
            } else if (isFloatingInput) {
                const menuInput = document.querySelector('[data-ref="text-menu-input"]');
                if (menuInput && menuInput !== e.target) menuInput.value = val;
            }

            if (this.interactionMode !== 'offline_text') {
                this.activatePixelTextMode();
            } else {
                this.updatePixelTextPreview();
            }
        }
    },

    toggleOfflineMoveArea() {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
        const btnBucket = document.querySelector('[data-action="toggleOfflineBucket"]');
        const btnSpray = document.querySelector('[data-action="toggleOfflineSpray"]');
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        const btnDither = document.querySelector('[data-action="toggleOfflineDither"]');

        if (btnBucket) btnBucket.classList.remove('active');
        if (btnSpray) btnSpray.classList.remove('active');
        if (btnEraser) btnEraser.classList.remove('active');
        if (btnDither) btnDither.classList.remove('active');
        if (typeof this.stopSpray === 'function') this.stopSpray();
        this.closeSubtoolbar();
        this.isDitherPainting = false;
        this.ditherLastCoords = null;

        if (this.interactionMode === 'offline_moving_area') {
            this.cancelMoveArea(false);
            if (typeof showMessage === 'function') showMessage('Modo mover selección desactivado.', 'info');
        } else {
            this.interactionMode = 'offline_moving_area';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            this.moveAreaBox = null;
            this.moveAreaStep = 0;
            this.moveAreaStart = null;
            this.moveAreaDragAnchor = null;
            if (btnMoveArea) btnMoveArea.classList.add('active');
            this.updateMoveAreaFloatingToolbar();
            if (typeof showMessage === 'function') showMessage(window.__('msg_move_area_on') || 'Modo Mover activado. Selecciona un área para moverla.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    selectMoveArea(x1, y1, x2, y2, dx = 0, dy = 0, state = 1) {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;
        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(bw - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(bh - 1, Math.max(y1, y2));

        this.moveAreaBox = { x1: minX, y1: minY, x2: maxX, y2: maxY, dx, dy, state };

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MOVE_AREA',
                payload: { moveAreaBox: this.moveAreaBox }
            });
        }

        this.updateMoveAreaFloatingToolbar();
        this.requestRender();
    },

    updateMoveAreaFloatingToolbar() {
        const tb = document.querySelector('[data-ref="move-area-floating-toolbar"]');
        if (!tb) return;

        if (this.interactionMode === 'offline_moving_area' && this.moveAreaBox && this.moveAreaStep >= 2) {
            const box = this.moveAreaBox;
            const curX1 = Math.min(box.x1, box.x2) + (box.dx || 0);
            const curX2 = Math.max(box.x1, box.x2) + (box.dx || 0);
            const curY1 = Math.min(box.y1, box.y2) + (box.dy || 0);
            const centerX = ((curX1 + curX2 + 1) / 2) * this.transform.scale + this.transform.x;
            const topY = curY1 * this.transform.scale + this.transform.y - 44;

            tb.style.position = 'absolute';
            tb.style.left = '0px';
            tb.style.top = '0px';
            tb.style.transform = `translate3d(calc(${Math.round(centerX)}px - 50%), ${Math.round(topY)}px, 0)`;
            tb.style.display = 'flex';
            tb.style.zIndex = '60';
        } else {
            tb.style.display = 'none';
        }
    },

    commitMoveArea() {
        if (!this.moveAreaBox) return;
        const { x1, y1, x2, y2, dx = 0, dy = 0 } = this.moveAreaBox;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'COMMIT_MOVE_AREA',
                payload: { x1, y1, x2, y2, dx, dy }
            });
        }

        this.moveAreaBox = null;
        this.moveAreaStep = 0;
        this.moveAreaStart = null;
        this.moveAreaDragAnchor = null;
        this.updateMoveAreaFloatingToolbar();
        this.canvas.classList.remove('component-cursor-grabbing');

        if (typeof showMessage === 'function') {
            showMessage(window.__('msg_move_area_applied') || 'Área movida con éxito.', 'success');
        }
        if (typeof this.saveOfflineCanvasState === 'function') {
            this.saveOfflineCanvasState(false);
        }
        this.requestRender();
    },

    cancelMoveArea(keepMode = false) {
        this.moveAreaBox = null;
        this.moveAreaStep = 0;
        this.moveAreaStart = null;
        this.moveAreaDragAnchor = null;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_MOVE_AREA',
                payload: { moveAreaBox: null }
            });
        }

        this.updateMoveAreaFloatingToolbar();
        this.canvas.classList.remove('component-cursor-grabbing');

        if (!keepMode) {
            this.interactionMode = 'normal';
            const btnMoveArea = document.querySelector('[data-action="toggleOfflineMoveArea"]');
            if (btnMoveArea) btnMoveArea.classList.remove('active');
        }

        this.requestRender();
    },

    startSpray(x, y) {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        this.isSpraying = true;
        this.sprayCenter = { x, y };

        this.fireSprayBurst(x, y);

        if (this.sprayTimer) clearInterval(this.sprayTimer);
        this.sprayTimer = setInterval(() => {
            if (this.isSpraying && this.sprayCenter) {
                this.fireSprayBurst(this.sprayCenter.x, this.sprayCenter.y);
            }
        }, 35);
    },

    updateSpray(x, y) {
        if (!this.isSpraying) return;
        this.sprayCenter = { x, y };
        this.fireSprayBurst(x, y);
    },

    fireSprayBurst(centerX, centerY) {
        const radius = this.sprayRadius || 5;
        const density = this.sprayDensity || Math.max(3, Math.round(radius * 1.5));

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SPRAY_BURST',
                payload: {
                    centerX,
                    centerY,
                    radius,
                    density,
                    color: this.currentColor
                }
            });
        } else if (this.offscreenCtx) {
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            if (!this._sprayDiffsMap) this._sprayDiffsMap = new Map();

            for (let i = 0; i < density; i++) {
                const theta = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * radius;
                const px = Math.round(centerX + r * Math.cos(theta));
                const py = Math.round(centerY + r * Math.sin(theta));

                if (px >= 0 && px < bw && py >= 0 && py < bh) {
                    const idx = py * bw + px;
                    const img = this.offscreenCtx.getImageData(px, py, 1, 1);
                    const prevVal = new Uint32Array(img.data.buffer)[0];
                    const nextVal = colorToAbgr(this.currentColor);
                    if (prevVal !== nextVal) {
                        if (!this._sprayDiffsMap.has(idx)) {
                            this._sprayDiffsMap.set(idx, { x: px, y: py, prev: prevVal, next: nextVal });
                        }
                        this.offscreenCtx.fillStyle = this.currentColor;
                        this.offscreenCtx.clearRect(px, py, 1, 1);
                        this.offscreenCtx.fillRect(px, py, 1, 1);
                    }
                }
            }
            this.requestRender();
        }
    },

    stopSpray() {
        if (!this.isSpraying && !this.sprayTimer) return;
        this.isSpraying = false;
        if (this.sprayTimer) {
            clearInterval(this.sprayTimer);
            this.sprayTimer = null;
        }
        this.sprayCenter = null;

        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'SPRAY_END' });
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.offscreenCtx && this._sprayDiffsMap) {
            if (this._sprayDiffsMap.size > 0 && this.undoStack) {
                const diffs = Array.from(this._sprayDiffsMap.values());
                this.undoStack.push({ type: 'spray', diffs });
                this.redoStack = [];
                if (this.undoStack.length > 50) this.undoStack.shift();
            }
            this._sprayDiffsMap = null;
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
        }
    },

    executeOfflineBucket(startX, startY) {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (startX < 0 || startX >= this.boardWidth || startY < 0 || startY >= this.boardHeight) return;

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'FLOOD_FILL',
                payload: {
                    startX,
                    startY,
                    color: this.currentColor
                }
            });
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.offscreenCtx) {
            const bw = this.boardWidth || 64;
            const bh = this.boardHeight || 64;
            const imgData = this.offscreenCtx.getImageData(0, 0, bw, bh);
            const buf32 = new Uint32Array(imgData.data.buffer);
            const startIdx = startY * bw + startX;
            const targetColor = buf32[startIdx];
            const fillColor = colorToAbgr(this.currentColor);

            if (targetColor !== fillColor) {
                const total = bw * bh;
                const queue = new Int32Array(total);
                let head = 0;
                let tail = 0;
                const diffs = [];

                buf32[startIdx] = fillColor;
                diffs.push({ x: startX, y: startY, prev: targetColor, next: fillColor });
                queue[tail++] = startIdx;

                while (head < tail) {
                    const idx = queue[head++];
                    const cx = idx % bw;
                    const cy = (idx / bw) | 0;

                    if (cx > 0) {
                        const nIdx = idx - 1;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx - 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cx < bw - 1) {
                        const nIdx = idx + 1;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx + 1, y: cy, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cy > 0) {
                        const nIdx = idx - bw;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx, y: cy - 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                    if (cy < bh - 1) {
                        const nIdx = idx + bw;
                        if (buf32[nIdx] === targetColor) {
                            buf32[nIdx] = fillColor;
                            diffs.push({ x: cx, y: cy + 1, prev: targetColor, next: fillColor });
                            queue[tail++] = nIdx;
                        }
                    }
                }

                this.offscreenCtx.putImageData(imgData, 0, 0);

                if (this.undoStack && diffs.length > 0) {
                    this.undoStack.push({ type: 'flood_fill', diffs });
                    this.redoStack = [];
                    if (this.undoStack.length > 50) this.undoStack.shift();
                }

                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }
                this.requestRender();
            }
        }
    },

    undo() {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'UNDO' });
        } else if (this.offscreenCtx && this.undoStack && this.undoStack.length > 0) {
            const action = this.undoStack.pop();
            const diffs = action.diffs;
            if (!this.redoStack) this.redoStack = [];
            for (let i = 0; i < diffs.length; i++) {
                const d = diffs[i];
                if (d.prev === 0) {
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                } else {
                    const hex = abgrToHex(d.prev);
                    this.offscreenCtx.fillStyle = hex;
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                    this.offscreenCtx.fillRect(d.x, d.y, 1, 1);
                }
            }
            this.redoStack.push(action);
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
            if (typeof showMessage === 'function') showMessage(window.__('msg_undo') || 'Acción deshecha', 'info');
        }
    },

    redo() {
        if (!this.isOfflineMode || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;
        if (this.renderWorker) {
            this.renderWorker.postMessage({ type: 'REDO' });
        } else if (this.offscreenCtx && this.redoStack && this.redoStack.length > 0) {
            const action = this.redoStack.pop();
            const diffs = action.diffs;
            if (!this.undoStack) this.undoStack = [];
            for (let i = 0; i < diffs.length; i++) {
                const d = diffs[i];
                if (d.next === 0) {
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                } else {
                    const hex = abgrToHex(d.next);
                    this.offscreenCtx.fillStyle = hex;
                    this.offscreenCtx.clearRect(d.x, d.y, 1, 1);
                    this.offscreenCtx.fillRect(d.x, d.y, 1, 1);
                }
            }
            this.undoStack.push(action);
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
            this.requestRender();
            if (typeof showMessage === 'function') showMessage(window.__('msg_redo') || 'Acción rehecha', 'info');
        }
    },

    selectOwnerArea(x1, y1, x2, y2, append = false) {
        const bw = this.boardWidth || 64;
        const bh = this.boardHeight || 64;

        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(bw - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(bh - 1, Math.max(y1, y2));

        if (!append) {
            this.selectedPixels.clear();
        }

        // Optimization: Do NOT populate this.selectedPixels.
        // It freezes the browser for large selections. 
        // We only use ownerEraserBox.
        this.ownerEraserBox = { x1: minX, y1: minY, x2: maxX, y2: maxY };
        this.updateSelectionUI();
        // Throttle render during drag to avoid lag on large canvases (4096+)
        if (!this._areaSelectRenderPending) {
            this._areaSelectRenderPending = true;
            requestAnimationFrame(() => {
                this._areaSelectRenderPending = false;
                this.requestRender();
            });
        }
    },

    executeOwnerClearArea() {
        if (!this.ownerEraserBox) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.clear && this.ownerCooldowns.clear > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.clear - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Borrador en cooldown. Espera ${secondsLeft} segundos.`, 'warning');
            }
            return;
        }

        const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;
        const count = (maxX - minX + 1) * (maxY - minY + 1);
        const cooldownMs = Math.min(60000, 5000 + Math.floor(count / 100));

        // 2. Broadcast via WebSocket server or clear locally in offline mode
        if (this.isOfflineMode) {
            if (this.renderWorker) {
                this.renderWorker.postMessage({
                    type: 'CLEAR_AREA',
                    payload: { x1: minX, y1: minY, x2: maxX, y2: maxY }
                });
            }
            if (this.offscreenCtx) {
                const w = Math.max(1, maxX - minX + 1);
                const h = Math.max(1, maxY - minY + 1);
                if (this.undoStack) {
                    const imgData = this.offscreenCtx.getImageData(minX, minY, w, h);
                    const bytes32 = new Uint32Array(imgData.data.buffer);
                    const diffs = [];
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const val = bytes32[y * w + x];
                            if (val !== 0) {
                                diffs.push({ x: minX + x, y: minY + y, prev: val, next: 0 });
                            }
                        }
                    }
                    if (diffs.length > 0) {
                        this.undoStack.push({ type: 'clear', diffs });
                        this.redoStack = [];
                        if (this.undoStack.length > 50) this.undoStack.shift();
                    }
                }
                this.offscreenCtx.clearRect(minX, minY, w, h);
            }
            if (typeof this.saveOfflineCanvasState === 'function') {
                this.saveOfflineCanvasState(false);
            }
        } else if (this.wsManager) {
            this.wsManager.send({
                type: 'clear_area',
                x1: minX,
                y1: minY,
                x2: maxX,
                y2: maxY,
                width: this.boardWidth || 64,
                canvasId: this.canvasIntId
            });
        }

        if (!this.isOfflineMode) {
            if (!this.ownerCooldowns) this.ownerCooldowns = {};
            this.ownerCooldowns.clear = Date.now() + cooldownMs;
            this.startOwnerCooldownTimer();
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        const btnEraser = document.querySelector('[data-action="toggleOfflineEraser"]');
        if (btnEraser) btnEraser.classList.remove('active');
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
        if (typeof showMessage === 'function') showMessage('Zona vaciada con éxito', 'success');
    },

    toggleOwnerFreeze() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.freeze && this.ownerCooldowns.freeze > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.freeze - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Congelación de lienzo en cooldown. Espera ${secondsLeft} segundos.`, 'warning');
            }
            return;
        }

        const nextFrozen = !this.isFrozen;
        if (this.wsManager) {
            this.wsManager.send({
                type: "toggle_freeze",
                frozen: nextFrozen
            });
        }

        if (!this.ownerCooldowns) this.ownerCooldowns = {};
        this.ownerCooldowns.freeze = Date.now() + 5000;
        this.startOwnerCooldownTimer();
    },

    toggleOwnerProtecting() {
        if (!this.isOwner || this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        if (this.interactionMode === 'owner_protecting') {
            this.interactionMode = 'normal';
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas desactivado', 'info');
        } else {
            this.interactionMode = 'owner_protecting';
            this.activeBomb = null;
            this.selectedPixels.clear();
            this.ownerEraserBox = null;
            this.ownerEraserStep = 0;
            this.ownerEraserStart = null;
            if (typeof showMessage === 'function') showMessage('Modo Protector de Zonas activado. Haz clic en la primera esquina para definir la zona.', 'info');
        }
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerProtectArea(protect = true, offsets = null) {
        if (!this.ownerEraserBox && (!offsets || offsets.length === 0)) return;

        const now = Date.now();
        if (this.ownerCooldowns && this.ownerCooldowns.protect && this.ownerCooldowns.protect > now) {
            const secondsLeft = Math.ceil((this.ownerCooldowns.protect - now) / 1000);
            if (typeof showMessage === 'function') {
                showMessage(`Protección de zona en cooldown. Espera ${secondsLeft} segundos.`, 'warning');
            }
            return;
        }

        let count = 0;
        if (offsets && offsets.length > 0) {
            count = offsets.length;
        } else if (this.ownerEraserBox) {
            count = (this.ownerEraserBox.x2 - this.ownerEraserBox.x1 + 1) * (this.ownerEraserBox.y2 - this.ownerEraserBox.y1 + 1);
        }
        const cooldownMs = Math.min(30000, 5000 + Math.floor((count * 5) / 100));

        if (this.wsManager) {
            const payload = {
                type: "protect_area",
                protect: protect
            };
            if (offsets && offsets.length > 0) {
                payload.offsets = offsets;
            } else if (this.ownerEraserBox) {
                const { x1: minX, y1: minY, x2: maxX, y2: maxY } = this.ownerEraserBox;
                payload.x1 = minX;
                payload.y1 = minY;
                payload.x2 = maxX;
                payload.y2 = maxY;
                payload.width = this.boardWidth || 64;
            }
            this.wsManager.send(payload);
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;

        if (!this.ownerCooldowns) this.ownerCooldowns = {};
        this.ownerCooldowns.protect = Date.now() + cooldownMs;
        this.startOwnerCooldownTimer();

        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.requestRender();
    },

    executeOwnerUnprotectArea(x1, y1, x2, y2) {
        if (this.wsManager) {
            this.wsManager.send({
                type: "protect_area",
                protect: false,
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                width: this.boardWidth || 64
            });
        }
        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.ownerEraserBox = null;
        this.ownerEraserStep = 0;
        this.ownerEraserStart = null;
        this.updateSelectionUI();
        this.requestRender();
    },

    executePlaceMines(pixels) {
        if (this.wsManager && pixels.length > 0) {
            this.wsManager.send({
                type: "place_mines",
                perk: "mines_1",
                pixels: pixels
            });
        }

        this.interactionMode = 'normal';
        this.selectedPixels.clear();
        this.updateSelectionUI();
        if (typeof this.updatePerkBadges === 'function') this.updatePerkBadges();
        this.syncMinesToWorker();
        this.requestRender();
    },

    toggleMyProtectionsHighlight() {
        this.showMyProtectionsHighlight = !this.showMyProtectionsHighlight;
        if (typeof showMessage === 'function') {
            if (this.showMyProtectionsHighlight) {
                showMessage('Mostrando tus zonas protegidas', 'info');
            } else {
                showMessage('Ocultando tus zonas protegidas', 'info');
            }
        }
        this.updatePerkBadges();
        if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
        this.requestRender();
    },

    updateMyProtectionsTimer() {
        if (!this.myProtectedExpiries || Object.keys(this.myProtectedExpiries).length === 0) {
            if (this.myProtectionsTimerLabel) {
                this.myProtectionsTimerLabel.textContent = '';
            }
            return;
        }

        const nowSecs = Math.floor(Date.now() / 1000);
        let minExpiry = Infinity;
        let hasExpiredAny = false;

        for (const off in this.myProtectedExpiries) {
            const exp = this.myProtectedExpiries[off];
            if (exp <= nowSecs) {
                if (this.myProtectedPixels) this.myProtectedPixels.delete(parseInt(off, 10));
                delete this.myProtectedExpiries[off];
                hasExpiredAny = true;
            } else if (exp < minExpiry) {
                minExpiry = exp;
            }
        }

        if (hasExpiredAny) {
            this.updatePerkBadges();
            if (typeof this.syncProtectedPixelsToWorker === 'function') this.syncProtectedPixelsToWorker();
            this.requestRender();
        }

        if (minExpiry === Infinity) {
            if (this.myProtectionsTimerLabel) this.myProtectionsTimerLabel.textContent = '';
            return;
        }

        const diff = minExpiry - nowSecs;
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');

        const timeStr = ` - ${hrs}:${mins}:${secs}`;
        if (this.myProtectionsTimerLabel) {
            this.myProtectionsTimerLabel.textContent = timeStr;
        }
    },

    getContiguousProtectedRegion(startX, startY) {
        const w = this.boardWidth || 64;
        const h = this.boardHeight || 64;
        const startOffset = (startY * w) + startX;
        
        const hasOffset = (off) => {
            if (!this.protectedPixels) return false;
            return this.protectedPixels.has(off) || this.protectedPixels.has(String(off));
        };

        if (!hasOffset(startOffset)) {
            return [];
        }

        const visited = new Set();
        const queue = [];
        
        queue.push({ x: startX, y: startY, offset: startOffset });
        visited.add(startOffset);

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            
            const neighbors = [
                { x: curr.x + 1, y: curr.y },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
                    const nOffset = (n.y * w) + n.x;
                    if (hasOffset(nOffset) && !visited.has(nOffset)) {
                        visited.add(nOffset);
                        queue.push({ x: n.x, y: n.y, offset: nOffset });
                    }
                }
            }
        }

        return Array.from(visited);
    },

    startOwnerCooldownTimer() {
        if (this.ownerCooldownTimerInterval) return;
        this.ownerCooldownTimerInterval = setInterval(() => {
            let active = false;
            const now = Date.now();
            if (this.ownerCooldowns) {
                for (const tool in this.ownerCooldowns) {
                    if (this.ownerCooldowns[tool] > now) {
                        active = true;
                    }
                }
            }
            if (active) {
                this.updatePerkBadges();
            } else {
                clearInterval(this.ownerCooldownTimerInterval);
                this.ownerCooldownTimerInterval = null;
                this.updatePerkBadges();
            }
        }, 1000);
    },

    loadCustomColors() {
        try {
            const key = this.canvasId ? `rosaura_custom_colors_${this.canvasId}` : 'rosaura_offline_custom_colors';
            const saved = localStorage.getItem(key) || localStorage.getItem('rosaura_offline_custom_colors');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.slice(0, 18);
            }
        } catch (e) {
            console.warn('Failed to load custom colors from localStorage:', e);
        }
        return [];
    },

    saveCustomColors() {
        try {
            const key = this.canvasId ? `rosaura_custom_colors_${this.canvasId}` : 'rosaura_offline_custom_colors';
            if (Array.isArray(this.customPickedColors)) {
                localStorage.setItem(key, JSON.stringify(this.customPickedColors.slice(0, 18)));
                localStorage.setItem('rosaura_offline_custom_colors', JSON.stringify(this.customPickedColors.slice(0, 18)));
            }
        } catch (e) {
            console.warn('Failed to save custom colors to localStorage:', e);
        }
    },

    selectAndAddCustomColor(hex) {
        if (!hex || typeof hex !== 'string') return;
        hex = hex.trim().toUpperCase();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-F]{6}$/i.test(hex) && !/^#[0-9A-F]{3}$/i.test(hex)) return;

        if (!Array.isArray(this.customPickedColors)) {
            this.customPickedColors = [];
        }

        const idx = this.customPickedColors.indexOf(hex);
        if (idx > -1) {
            this.customPickedColors.splice(idx, 1);
        }
        this.customPickedColors.unshift(hex);
        if (this.customPickedColors.length > 18) {
            this.customPickedColors = this.customPickedColors.slice(0, 18);
        }

        this.saveCustomColors();

        this.currentColor = hex;
        if (this.btnColorPalette) {
            this.btnColorPalette.style.setProperty('--active-color', this.currentColor);
            this.applyColorBorderStyle(this.btnColorPalette, this.currentColor);
        }

        this.renderCustomPickedColors();
        this.updateActiveColorPreview();
        this.syncActiveColorHighlight();
        this.requestRender();

        if (window.ModuleManager && typeof window.ModuleManager.close === 'function') {
            window.ModuleManager.close('moduleCustomColorPicker');
        }
    },

    updateCustomPickerUI(pickerNode) {
        if (!pickerNode) pickerNode = document.querySelector('[data-ref="customColorPicker"]');
        if (!pickerNode) return;

        let h = Math.max(0, Math.min(360, parseFloat(pickerNode.dataset.h) || 0));
        let s = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.s) || 0));
        let v = Math.max(0, Math.min(100, parseFloat(pickerNode.dataset.v) || 0));
        const hex = hsvToHex(h, s, v);

        const svArea = pickerNode.querySelector('[data-action="dragCustomSV"]');
        if (svArea) svArea.style.backgroundColor = `hsl(${h}, 100%, 50%)`;

        const svThumb = pickerNode.querySelector('[data-ref="customSvThumb"]');
        if (svThumb) {
            svThumb.style.left = `${s}%`;
            svThumb.style.top = `${100 - v}%`;
        }

        const hueThumb = pickerNode.querySelector('[data-ref="customHueThumb"]');
        if (hueThumb) hueThumb.style.left = `${(h / 360) * 100}%`;

        const hexInput = pickerNode.querySelector('[data-ref="customHexInput"]');
        if (hexInput && document.activeElement !== hexInput) {
            hexInput.value = hex;
        }

        const hexInputPreview = pickerNode.querySelector('[data-ref="customHexInputPreview"]');
        if (hexInputPreview) {
            hexInputPreview.style.backgroundColor = hex;
        }
    },

    updateCustomColorFromEvent(e, container) {
        if (!container) return;
        const pickerNode = container.closest('[data-ref="customColorPicker"]');
        if (!pickerNode) return;

        const rect = container.getBoundingClientRect();
        const coords = getEventCoords(e);
        let x = Math.max(0, Math.min(coords.clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(coords.clientY - rect.top, rect.height));

        if (this.isDraggingCustomPicker === 'sv') {
            pickerNode.dataset.s = (x / rect.width) * 100;
            pickerNode.dataset.v = 100 - ((y / rect.height) * 100);
        } else if (this.isDraggingCustomPicker === 'hue') {
            pickerNode.dataset.h = (x / rect.width) * 360;
        }

        this.updateCustomPickerUI(pickerNode);
    },
}