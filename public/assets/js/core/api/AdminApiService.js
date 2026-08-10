import { HttpClient } from './HttpClient.js';
import { ApiRoutes } from './ApiRoutes.js';

export class AdminApiService extends HttpClient {
    async getAllPermissions() {
        return await this.post(ApiRoutes.Admin.GetPermissions);
    }

    async getRolePermissions(roleId) {
        return await this.post(ApiRoutes.Admin.GetRolePermissions, { id: roleId });
    }

    async updateRolePermissions(roleId, permissionsArray) {
        return await this.post(ApiRoutes.Admin.UpdateRolePermissions, { id: roleId, permissions: permissionsArray });
    }

    async getDashboardMetrics(startDate, endDate) {
        return await this.post(ApiRoutes.Admin.GetDashboardMetrics, { 
            start_date: startDate, 
            end_date: endDate 
        });
    }
}
