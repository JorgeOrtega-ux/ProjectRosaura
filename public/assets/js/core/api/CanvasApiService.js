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

    async getMembers(canvasUuidOrId, page = 1) {
        return await this.post(ApiRoutes.Canvases.GetMembers, { canvas_uuid: canvasUuidOrId, page: page });
    }

    async getMemberRoleData(canvasUuid, targetUserUuid) {
        return await this.post(ApiRoutes.Canvases.GetMemberRoleData, { canvas_uuid: canvasUuid, target_user_uuid: targetUserUuid });
    }

    async assignMemberRole(canvasId, targetUserId, roles) {
        return await this.post(ApiRoutes.Canvases.AssignMemberRole, { canvas_id: canvasId, target_user_id: targetUserId, roles: roles });
    }

    async removeMember(canvasId, targetUserId) {
        return await this.post(ApiRoutes.Canvases.RemoveMember, { canvas_id: canvasId, target_user_id: targetUserId });
    }

    async approveCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.ApproveRequest, { request_id: requestId });
    }

    async rejectCanvasRequest(requestId) {
        return await this.post(ApiRoutes.Canvases.RejectRequest, { request_id: requestId });
    }
}
