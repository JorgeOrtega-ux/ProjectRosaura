<?php
// api/controllers/AdminController.php

namespace App\Api\Controllers;

use App\Api\Services\AdminServices;

class AdminController extends BaseController {
    
    private $adminServices;

    public function __construct(AdminServices $adminServices) {
        $this->adminServices = $adminServices;
    }

    private function requirePermission($permission) {
        if (method_exists($this->adminServices, 'requirePermission')) {
            $this->adminServices->requirePermission($permission);
        }
    }

    public function get_user($input) {
        try { 
            $this->requirePermission('view_users');
            $safeInput = ['target_user_id' => $input['target_user_id'] ?? null];
            return $this->respond($this->adminServices->getUser($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_avatar($input) {
        try { 
            $this->requirePermission('edit_users');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                '_files' => $input['_files'] ?? null
            ];
            return $this->respond($this->adminServices->updateAvatar($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_avatar($input) {
        try { 
            $this->requirePermission('edit_users');
            $safeInput = ['target_user_id' => $input['target_user_id'] ?? null];
            return $this->respond($this->adminServices->deleteAvatar($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_username($input) {
        try { 
            $this->requirePermission('edit_users');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'username' => $input['username'] ?? null,
                'password' => $input['password'] ?? null
            ];
            return $this->respond($this->adminServices->updateUsername($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_email($input) {
        try { 
            $this->requirePermission('edit_users');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'email' => $input['email'] ?? null,
                'password' => $input['password'] ?? null
            ];
            return $this->respond($this->adminServices->updateEmail($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_preference($input) {
        try { 
            $this->requirePermission('edit_users');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'key' => $input['key'] ?? null,
                'value' => $input['value'] ?? null
            ];
            return $this->respond($this->adminServices->updatePreference($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_role($input) {
        try { 
            $this->requirePermission('assign_roles');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'roles' => $input['roles'] ?? null,
                'password' => $input['password'] ?? null
            ];
            return $this->respond($this->adminServices->updateRoles($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_users($input) {
        try { 
            $this->requirePermission('delete_users');
            $safeInput = [
                'user_ids' => $input['user_ids'] ?? [],
                'password' => $input['password'] ?? null
            ];
            return $this->respond($this->adminServices->deleteUsers($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_suspension($input) {
        try { 
            $this->requirePermission('moderate_users');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'password' => $input['password'] ?? null,
                'is_suspended' => $input['is_suspended'] ?? null,
                'suspension_type' => $input['suspension_type'] ?? null,
                'suspension_reason' => $input['suspension_reason'] ?? null,
                'end_date' => $input['end_date'] ?? null,
                'notify_user' => $input['notify_user'] ?? null
            ];
            return $this->respond($this->adminServices->updateSuspension($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    // OPTIMIZADO: Ahora acepta los parámetros de paginación para enviarlos al Service
    public function get_moderation_kardex($input) {
        try { 
            $this->requirePermission('view_kardex');
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'page' => $input['page'] ?? 1,
                'limit' => $input['limit'] ?? 10
            ];
            return $this->respond($this->adminServices->getModerationKardex($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_roles() {
        try { 
            $this->requirePermission('view_roles');
            return $this->respond($this->adminServices->getRoles()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_role($input) {
        try { 
            $this->requirePermission('manage_roles_structure');
            $safeInput = [
                'name' => $input['name'] ?? null,
                'color_type' => $input['color_type'] ?? null,
                'angle' => $input['angle'] ?? null,
                'colors' => $input['colors'] ?? null,
                'weight' => $input['weight'] ?? null
            ];
            return $this->respond($this->adminServices->createRole($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function edit_role($input) {
        try { 
            $this->requirePermission('manage_roles_structure');
            $safeInput = [
                'id' => $input['id'] ?? null,
                'name' => $input['name'] ?? null,
                'color_type' => $input['color_type'] ?? null,
                'angle' => $input['angle'] ?? null,
                'colors' => $input['colors'] ?? null,
                'weight' => $input['weight'] ?? null
            ];
            return $this->respond($this->adminServices->editRole($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_role($input) {
        try { 
            $this->requirePermission('manage_roles_structure');
            $safeInput = ['id' => $input['id'] ?? null];
            return $this->respond($this->adminServices->deleteRole($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_permissions() {
        try { 
            $this->requirePermission('manage_roles_structure');
            return $this->respond($this->adminServices->getPermissionsList()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_role_permissions($input) {
        try { 
            $this->requirePermission('manage_roles_structure');
            $safeInput = ['id' => $input['id'] ?? null];
            return $this->respond($this->adminServices->getRolePermissions($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_role_permissions($input) {
        try { 
            $this->requirePermission('manage_roles_structure');
            $safeInput = [
                'id' => $input['id'] ?? null,
                'permissions' => $input['permissions'] ?? null
            ];
            return $this->respond($this->adminServices->updateRolePermissions($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_server_config() {
        try { 
            $this->requirePermission('manage_server_config');
            return $this->respond($this->adminServices->getServerConfig()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_server_config($input) {
        try { 
            $this->requirePermission('manage_server_config');
            $safeInput = [
                'config' => $input['config'] ?? null,
                'password' => $input['password'] ?? null
            ];
            return $this->respond($this->adminServices->updateServerConfig($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function flush_sessions($input) {
        try { 
            $this->requirePermission('perform_system_maintenance');
            $safeInput = ['password' => $input['password'] ?? null];
            return $this->respond($this->adminServices->flushSessions($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function clear_cache($input) {
        try { 
            $this->requirePermission('perform_system_maintenance');
            $safeInput = ['password' => $input['password'] ?? null];
            return $this->respond($this->adminServices->clearSystemCache($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function reset_rate_limits($input) {
        try { 
            $this->requirePermission('perform_system_maintenance');
            $safeInput = ['password' => $input['password'] ?? null];
            return $this->respond($this->adminServices->resetRateLimits($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function toggle_panic_mode($input) {
        try { 
            $this->requirePermission('perform_system_maintenance');
            $safeInput = [
                'password' => $input['password'] ?? null,
                'is_active' => $input['is_active'] ?? null
            ];
            return $this->respond($this->adminServices->togglePanicMode($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_backup($input = []) {
        try { 
            $this->requirePermission('create_backups');
            return $this->respond($this->adminServices->createBackup($input)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function backup_status($input) {
        try { 
            $this->requirePermission('create_backups');
            $safeInput = ['job_id' => $input['job_id'] ?? null];
            return $this->respond($this->adminServices->backupStatus($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    } 

    public function restore_backup($input) {
        try { 
            $this->requirePermission('restore_backups');
            $safeInput = [
                'backup_id' => $input['backup_id'] ?? null,
                'password' => $input['password'] ?? null
            ];
            if (empty($safeInput['backup_id']) || empty($safeInput['password'])) {
                return $this->respond(['success' => false, 'message_key' => 'validation.missing_fields']);
            }
            return $this->respond($this->adminServices->restoreBackup($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_backup_schema() {
        try { 
            $this->requirePermission('create_backups');
            return $this->respond($this->adminServices->getBackupSchema()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_custom_backup($input = []) {
        try { 
            $this->requirePermission('create_backups');
            $safeInput = [
                'schema' => $input['schema'] ?? null,
                'modules' => $input['modules'] ?? null
            ];
            return $this->respond($this->adminServices->createCustomBackup($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function read_logs($input) {
        try { 
            $this->requirePermission('view_logs');
            $safeInput = ['files' => $input['files'] ?? null];
            return $this->respond($this->adminServices->readLogs($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function check_worker_status() {
        try { 
            $this->requirePermission('view_logs');
            return $this->respond($this->adminServices->checkWorkerStatus()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_admin_translations() {
        try {
            $this->requirePermission('access_admin_panel');
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }

        $lang = $_COOKIE['pr_language'] ?? 'es-419';
        $lang = preg_replace('/[^a-zA-Z0-9\-]/', '', $lang);
        
        $file = ROOT_PATH . '/translations/' . $lang . '/admin.json';
        if (file_exists($file)) {
            $json = file_get_contents($file);
            $data = json_decode($json, true) ?: [];
            return $this->respond(['success' => true, 'data' => $data]);
        }
        return $this->respond(['success' => false, 'message' => 'Admin translations not found']);
    }

    // --- NUEVO MÉTODO PARA DASHBOARD METRICS ---
    public function get_dashboard_metrics($input) {
        try {
            $this->requirePermission('access_admin_panel');
            $safeInput = [
                'start_date' => $input['start_date'] ?? null,
                'end_date' => $input['end_date'] ?? null
            ];
            return $this->respond($this->adminServices->getDashboardMetrics($safeInput));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
?>