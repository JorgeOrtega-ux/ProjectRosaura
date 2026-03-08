import { ApiService } from '../../core/api/ApiServices.js';
import { StudioWebSocketManager } from './StudioWebSocketManager.js';
import { studioState } from './StudioState.js';
import { StudioUploadController } from './controllers/StudioUploadController.js';
import { StudioManageContentController } from './controllers/StudioManageContentController.js';
import { StudioEditController } from './controllers/StudioEditController.js';

export class StudioController {
    constructor() {
        if (window.AppStudioWSManager) {
            this.manager = window.AppStudioWSManager;
        } else {
            this.manager = new StudioWebSocketManager();
            window.AppStudioWSManager = this.manager;
        }

        this.api = new ApiService();
        this.state = studioState;
        
        this.init();
    }

    init() {
        this.manager.connect();
        this.manager.onMessage('progressUpdate', this.handleWsProgress.bind(this));
        
        const path = window.location.pathname;
        
        // Enrutamiento interno
        if (path.includes('/studio/uploading') || path.includes('/studio/upload')) {
            new StudioUploadController(this.api, this.state);
        } else if (path.includes('/studio/manage-content')) {
            new StudioManageContentController(this.api, this.state, this.manager);
        } else if (path.includes('/studio/edit/')) {
            new StudioEditController(this.api, this.state);
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
            
            // Disparar un evento global que cada sub-controlador escuchará para actualizar su propia UI
            window.dispatchEvent(new CustomEvent('studioVideoProgress', { 
                detail: { ...data, matchedKey }
            }));
        }
    }
}