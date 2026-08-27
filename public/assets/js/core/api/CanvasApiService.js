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

    async listInvites(canvasTarget) {
        return await this.post(ApiRoutes.Canvases.ListInvites, { canvas_id: canvasTarget, canvas_uuid: canvasTarget });
    }

    async generateInvite(canvasTarget, role, maxUses = null, expiresAt = null) {
        return await this.post(ApiRoutes.Canvases.GenerateInvite, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            role: role,
            max_uses: maxUses,
            expires_at: expiresAt
        });
    }

    async revokeInvite(canvasTarget, inviteId) {
        return await this.post(ApiRoutes.Canvases.RevokeInvite, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            invite_id: inviteId
        });
    }

    async getRoles(canvasTarget) {
        return await this.post(ApiRoutes.Canvases.GetRoles, { canvas_id: canvasTarget, canvas_uuid: canvasTarget });
    }

    async getPermissions(canvasTarget) {
        return await this.post(ApiRoutes.Canvases.GetPermissions, { canvas_id: canvasTarget, canvas_uuid: canvasTarget });
    }

    async createRole(canvasTarget, name, permissions = [], weight = 10) {
        return await this.post(ApiRoutes.Canvases.CreateRole, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            name: name,
            permissions: permissions,
            weight: weight
        });
    }

    async updateRole(canvasTarget, roleId, name, permissions = null, weight = 10) {
        return await this.post(ApiRoutes.Canvases.UpdateRole, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            role_id: roleId,
            name: name,
            permissions: permissions,
            weight: weight
        });
    }

    async updateRolePermissions(canvasTarget, roleId, permissions = []) {
        return await this.post(ApiRoutes.Canvases.UpdateRolePermissions, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            role_id: roleId,
            permissions: permissions
        });
    }

    async deleteRole(canvasTarget, roleId) {
        return await this.post(ApiRoutes.Canvases.DeleteRole, {
            canvas_id: canvasTarget,
            canvas_uuid: canvasTarget,
            role_id: roleId
        });
    }

    async getSanctions(canvasTarget, page = 1) {
        return await this.post(ApiRoutes.Canvases.GetSanctions, {
            canvas_uuid: canvasTarget,
            canvas_id: canvasTarget,
            page: page
        });
    }

    async updateSanction(payload, signal = null) {
        return await this.post(ApiRoutes.Canvases.UpdateChatRestriction, payload, signal);
    }
}
