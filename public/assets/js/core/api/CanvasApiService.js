import { HttpClient } from './HttpClient.js';
import { ApiRoutes } from './ApiRoutes.js';

export class CanvasApiService extends HttpClient {
    async resizeCanvas(canvasId, newSize) {
        return await this.post(ApiRoutes.Canvases.Resize, { id: canvasId, size: newSize });
    }

    async toggleFavorite(canvasId) {
        return await this.post(ApiRoutes.Canvases.ToggleFavorite, { id: canvasId });
    }

    async getPendingRequests(canvasId) {
        return await this.post(ApiRoutes.Canvases.GetPendingRequests, { canvas_id: canvasId });
    }

    async approveCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.ApproveRequest, { request_id: requestId });
    }

    async rejectCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.RejectRequest, { request_id: requestId });
    }
}
