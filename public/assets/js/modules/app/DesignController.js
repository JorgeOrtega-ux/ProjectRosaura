// public/assets/js/modules/app/DesignController.js
import { ApiService } from '../../core/api/ApiServices.js';

// Importar Mixins
import { DesignSetup } from './DesignSetup.js';
import { DesignNetwork } from './DesignNetwork.js';
import { DesignTemplates } from './DesignTemplates.js';
import { DesignInteractions } from './DesignInteractions.js';
import { DesignRender } from './DesignRender.js';

class DesignController {
    constructor() {
        this.api = new ApiService();
        this.basePath = window.AppBasePath || '';
        this.abortController = null;
        this.wsManager = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        this.canvasId = urlParams.get('id');
        
        // --- NUEVAS PROPIEDADES PARA MODO SNAPSHOT ---
        this.snapshotUuid = urlParams.get('snapshot');
        this.snapshotImg = urlParams.get('img');
        this.isSnapshotMode = !!(this.snapshotUuid && this.snapshotImg);

        this.canvas = null;
        this.ctx = null;
        this.boardWidth = 2000;
        this.boardHeight = 1000;
        this.canvasPaletteId = 'default';
        
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.hoveredPixel = null;
        
        this.selectedPixels = new Set();
        this.isSelecting = false;
        this.selectionMode = 'add';
        this.btnPlacePixels = null;
        this.txtPlacePixels = null;
        
        this.coordsText = null;
        this.btnColorPalette = null;
        this.fileInput = null;

        this.templates = [];
        this.activeTemplateId = null;
        this.templateInteraction = null;

        this.currentColor = '#000000';

        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        this.needsRender = false;
        this.animationFrameId = null;
        
        this.isSpectator = false;
        this.isPrivateBlocked = false;
        this.canvasIntId = null;
        this.canvasPrivacy = 'private';
        this.canvasApproval = false;

        this.timelapseActive = false;
        this.resetActive = false;
        this.nextResetAt = null;
        this.timerAction = 'restart';
        this.resetTimerInterval = null;
        this.isResetLocked = false; 

        // Los Binds se mantienen exactamente igual
        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleFileUploadBound = this.handleFileUpload.bind(this);
        this.renderBound = this.render.bind(this);
    }

    init() {
        this.abortController = new AbortController();
        
        this.canvas = document.querySelector('[data-ref="design-canvas"]');
        this.btnPlacePixels = document.querySelector('[data-ref="pixel-action-btn"]');
        this.txtPlacePixels = document.querySelector('[data-ref="pixel-action-text"]');
        this.coordsText = document.querySelector('[data-ref="coords-text"]');
        this.btnColorPalette = document.querySelector('[data-ref="btn-color-palette"]');
        this.fileInput = document.querySelector('[data-ref="template-file-input"]');
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.canvas.style.imageRendering = 'pixelated';
        }

        this.bindEvents();
        
        if (this.isSnapshotMode) {
            this.loadCanvasConfigForSnapshot();
        } else {
            this.loadCanvasConfig();
            this.checkCanvasAccess();
            this.loadUserLibrary();
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.wsManager) this.wsManager.disconnect();
        
        document.removeEventListener('wheel', this.handleWheelBound, { passive: false });
        document.removeEventListener('mousedown', this.handleMouseDownBound);
        document.removeEventListener('mousemove', this.handleMouseMoveBound);
        document.removeEventListener('mouseup', this.handleMouseUpBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('click', this.handleClickBound);
        window.removeEventListener('resize', this.handleResizeBound);
        
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileUploadBound);
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.resetTimerInterval) {
            clearInterval(this.resetTimerInterval);
        }
    }
}

// Inyección de los sub-módulos en el prototipo principal
Object.assign(
    DesignController.prototype,
    DesignSetup,
    DesignNetwork,
    DesignTemplates,
    DesignInteractions,
    DesignRender
);

export { DesignController };