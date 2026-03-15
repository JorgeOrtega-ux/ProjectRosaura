// public/assets/js/modules/studio/StudioController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { StudioWebSocketManager } from './StudioWebSocketManager.js';
import { studioState } from './StudioState.js';
import { StudioUploadController } from './controllers/StudioUploadController.js';
import { StudioManageContentController } from './controllers/StudioManageContentController.js';
import { StudioManagePlaylistController } from './controllers/StudioManagePlaylistController.js';
import { StudioEditController } from './controllers/StudioEditController.js';

export class StudioController {
    constructor() {
        if (window._studioMainControllerInstance) {
            window._studioMainControllerInstance.destroy();
        }
        window._studioMainControllerInstance = this;

        if (window.AppStudioWSManager) {
            this.manager = window.AppStudioWSManager;
        } else {
            this.manager = new StudioWebSocketManager();
            window.AppStudioWSManager = this.manager;
        }

        this.api = new ApiService();
        this.state = studioState;
        this.activeSubController = null;
        
        if (!window._studioWsProgressHandlerInitialized) {
            this.manager.onMessage('progressUpdate', (data) => {
                if (window._studioMainControllerInstance) {
                    window._studioMainControllerInstance.handleWsProgress(data);
                }
            });
            window._studioWsProgressHandlerInitialized = true;
        }

        this.handleRouteChangeBound = this.destroy.bind(this);
        window.addEventListener('routeChange', this.handleRouteChangeBound);
    }

    destroy() {
        window.removeEventListener('routeChange', this.handleRouteChangeBound);
        
        if (this.activeSubController && typeof this.activeSubController.destroy === 'function') {
            this.activeSubController.destroy();
            this.activeSubController = null;
        }

        if (window._studioMainControllerInstance === this) {
            window._studioMainControllerInstance = null;
        }
    }

    init() {
        // [BLINDAJE FRONTEND] Verificar permisos de Creador antes de cargar
        const hasPermission = window.appInstance ? window.appInstance.canUploadVideos : true;

        if (hasPermission) {
            this.manager.connect();
        } else {
            console.warn("[StudioController] Inicialización abortada: Usuario sin permisos de Creador.");
            // Si por alguna razón el RouteGuard falló, lo expulsamos violentamente a home
            if (window.spaRouter) {
                window.spaRouter.navigate(window.AppBasePath || '/');
            } else {
                window.location.href = (window.AppBasePath || '/') + '/';
            }
            return; // ABORTAR INITIALIZATION
        }
        
        if (this.activeSubController && typeof this.activeSubController.destroy === 'function') {
            this.activeSubController.destroy();
            this.activeSubController = null;
        }

        const path = window.location.pathname;
        
        // Enrutamiento interno
        if (path.includes('/studio/uploading') || path.includes('/studio/upload')) {
            this.activeSubController = new StudioUploadController(this.api, this.state);
        } else if (path.includes('/studio/manage-content/playlist')) {
            this.activeSubController = new StudioManagePlaylistController(this.api, this.state);
        } else if (path.includes('/studio/manage-content')) {
            this.activeSubController = new StudioManageContentController(this.api, this.state, this.manager);
        } else if (path.includes('/studio/edit/')) {
            this.activeSubController = new StudioEditController(this.api, this.state);
        } 
    }

    handleWsProgress(data) {
        const wsVideoIdStr = String(data.video_id);
        const wsUuidStr = String(data.uuid);
        let matchedKey = null; let videoObj = null;

        if (this.state.currentVideos.has(wsVideoIdStr)) {
            matchedKey = wsVideoIdStr; videoObj = this.state.getVideo(wsVideoIdStr);
        } else {
            for (const [key, v] of this.state.currentVideos.entries()) {
                if (String(v.uuid) === wsUuidStr || String(v.id) === wsUuidStr || String(v.id) === wsVideoIdStr) {
                    matchedKey = key; videoObj = v; break;
                }
            }
        }

        if (videoObj && matchedKey) {
            videoObj.status = data.status;
            videoObj.processing_progress = data.progress || 100;
            
            window.dispatchEvent(new CustomEvent('studioVideoProgress', { 
                detail: { ...data, matchedKey }
            }));
        }
    }
}