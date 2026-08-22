<?php
namespace App\Api\Controllers\Admin;

use App\Api\Controllers\BaseController;

use App\Api\Services\Admin\AdminService;
use App\Api\Services\Admin\AdminAdvertisementsService;
use App\Core\System\PermissionsConstants;

class AdminController extends BaseController {
    
    private $adminServices;
    private $adsService;

    public function __construct(AdminService $adminServices, ?AdminAdvertisementsService $adsService = null) {
        $this->adminServices = $adminServices;
        $this->adsService = $adsService;
    }

    private function requirePermission($permission) {
        if (method_exists($this->adminServices, 'requirePermission')) {
            $this->adminServices->requirePermission($permission);
        }
    }

    public function get_user($input) {
        try { 
            $this->requirePermission(PermissionsConstants::VIEW_USERS);
            $safeInput = ['target_user_id' => $input['target_user_id'] ?? null];
            return $this->respond($this->adminServices->getUser($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_user_roles($input) {
        try { 
            $this->requirePermission(PermissionsConstants::ASSIGN_ROLES);
            $targetUserUuid = $input['target_user_uuid'] ?? null;
            $adminViewService = new \App\Api\Services\Admin\AdminViewService();
            $data = $adminViewService->getEditUserRoleData($targetUserUuid);
            return $this->respond(['success' => true, 'data' => $data]); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }



    public function update_avatar($input) {
        try { 
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
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
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            $safeInput = ['target_user_id' => $input['target_user_id'] ?? null];
            return $this->respond($this->adminServices->deleteAvatar($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_username($input) {
        try { 
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'username' => $input['username'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            return $this->respond($this->adminServices->updateUsername($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_email($input) {
        try { 
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'email' => $input['email'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            return $this->respond($this->adminServices->updateEmail($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_preference($input) {
        try { 
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
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
            $this->requirePermission(PermissionsConstants::ASSIGN_ROLES);
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'roles' => $input['roles'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            return $this->respond($this->adminServices->updateRoles($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_users($input) {
        try { 
            $this->requirePermission(PermissionsConstants::DELETE_USERS);
            $safeInput = [
                'user_ids' => $input['user_ids'] ?? [],
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            return $this->respond($this->adminServices->deleteUsers($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_suspension($input) {
        try { 
            $this->requirePermission(PermissionsConstants::MODERATE_USERS);
            $safeInput = [
                'target_user_id' => $input['target_user_id'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null,
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

    public function get_moderation_kardex($input) {
        try { 
            $this->requirePermission(PermissionsConstants::VIEW_KARDEX);
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
            $this->requirePermission(PermissionsConstants::VIEW_ROLES);
            return $this->respond($this->adminServices->getRoles()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_role($input) {
        try { 
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
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
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
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
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
            $safeInput = ['id' => $input['id'] ?? null];
            return $this->respond($this->adminServices->deleteRole($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function save_subscription($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_SUBSCRIPTIONS);
            $safeInput = [
                'uuid' => $input['uuid'] ?? null,
                'name' => $input['name'] ?? null,
                'tier_level' => $input['tier_level'] ?? 1,
                'is_active' => isset($input['is_active']) ? (int)$input['is_active'] : 1,
                'color' => $input['color'] ?? null,
                'stripe_price_id_monthly' => $input['stripe_price_id_monthly'] ?? null,
                'stripe_price_id_yearly' => $input['stripe_price_id_yearly'] ?? null,
                'features' => $input['features'] ?? null
            ];
            return $this->respond($this->adminServices->saveSubscription($safeInput));
        } catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function save_subscription_color($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_SUBSCRIPTIONS);
            $safeInput = [
                'uuid' => $input['uuid'] ?? null,
                'angle' => isset($input['angle']) ? (int)$input['angle'] : 0,
                'colors' => $input['colors'] ?? []
            ];
            return $this->respond($this->adminServices->saveSubscriptionColor($safeInput));
        } catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
    public function toggle_subscription_visibility($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_SUBSCRIPTIONS);
            $safeInput = ['uuid' => $input['uuid'] ?? null];
            return $this->respond($this->adminServices->toggleSubscriptionVisibility($safeInput));
        } catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function set_subscription_popular($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_SUBSCRIPTIONS);
            $safeInput = ['uuid' => $input['uuid'] ?? null];
            return $this->respond($this->adminServices->setSubscriptionPopular($safeInput));
        } catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_subscription($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_SUBSCRIPTIONS);
            $safeInput = ['uuid' => $input['uuid'] ?? null];
            return $this->respond($this->adminServices->deleteSubscription($safeInput));
        } catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }


    public function get_permissions() {
        try { 
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
            return $this->respond($this->adminServices->getPermissionsList()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_role_permissions($input) {
        try { 
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
            $safeInput = ['id' => $input['id'] ?? null];
            return $this->respond($this->adminServices->getRolePermissions($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_role_permissions($input) {
        try { 
            $this->requirePermission(PermissionsConstants::MANAGE_ROLES_STRUCTURE);
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
            $this->requirePermission(PermissionsConstants::MANAGE_SERVER_CONFIG);
            return $this->respond($this->adminServices->getServerConfig()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_server_config($input) {
        try { 
            $this->requirePermission(PermissionsConstants::MANAGE_SERVER_CONFIG);
            $safeInput = [
                'config' => $input['config'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            return $this->respond($this->adminServices->updateServerConfig($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_backup($input = []) {
        try { 
            $this->requirePermission(PermissionsConstants::CREATE_BACKUPS);
            return $this->respond($this->adminServices->createBackup($input)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function backup_status($input) {
        try { 
            $this->requirePermission(PermissionsConstants::CREATE_BACKUPS);
            $safeInput = ['job_id' => $input['job_id'] ?? null];
            return $this->respond($this->adminServices->backupStatus($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    } 

    public function restore_backup($input) {
        try { 
            $this->requirePermission(PermissionsConstants::RESTORE_BACKUPS);
            $safeInput = [
                'backup_id' => $input['backup_id'] ?? null,
                'password' => $input['password'] ?? null,
                'credential' => $input['credential'] ?? $input['google_token'] ?? null,
                'google_token' => $input['google_token'] ?? $input['credential'] ?? null
            ];
            if (empty($safeInput['backup_id']) || (empty($safeInput['password']) && empty($safeInput['credential']))) {
                return $this->respond(['success' => false, 'message' => __('err_validation_missing_fields')]);
            }
            return $this->respond($this->adminServices->restoreBackup($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_backup_schema() {
        try { 
            $this->requirePermission(PermissionsConstants::CREATE_BACKUPS);
            return $this->respond($this->adminServices->getBackupSchema()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_custom_backup($input = []) {
        try { 
            $this->requirePermission(PermissionsConstants::CREATE_BACKUPS);
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
            $this->requirePermission(PermissionsConstants::VIEW_LOGS);
            $safeInput = ['files' => $input['files'] ?? null];
            return $this->respond($this->adminServices->readLogs($safeInput)); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function check_worker_status() {
        try { 
            $this->requirePermission(PermissionsConstants::VIEW_LOGS);
            return $this->respond($this->adminServices->checkWorkerStatus()); 
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_admin_translations() {
        try {
            $this->requirePermission(PermissionsConstants::ACCESS_ADMIN_PANEL);
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
        return $this->respond(['success' => false, 'message' => __('err_admin_translations_not_found')]);
    }

    public function get_dashboard_metrics($input) {
        try {
            $this->requirePermission(PermissionsConstants::VIEW_DASHBOARD);
            $safeInput = [
                'start_date' => $input['start_date'] ?? null,
                'end_date' => $input['end_date'] ?? null
            ];
            return $this->respond($this->adminServices->getDashboardMetrics($safeInput));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_messages() {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_CONTENT);
            $page = (int)($this->request['page'] ?? 1);
            $limit = (int)($this->request['limit'] ?? 50);
            
            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 50;

            return $this->adminServices->getAllMessages($page, $limit);
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_message_visibility($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_CONTENT);
            $data = [
                'uuid' => $input['uuid'] ?? null,
                'visibility' => $input['visibility'] ?? null,
                'deleted_by' => $input['deleted_by'] ?? null,
                'delete_reason' => $input['delete_reason'] ?? null
            ];
            return $this->respond($this->adminServices->updateMessageVisibility($data));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_message_reports($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_CONTENT);
            $uuid = $input['uuid'] ?? $this->request['uuid'] ?? null;
            return $this->respond($this->adminServices->getMessageReports($uuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_report_status($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_CONTENT);
            $data = [
                'report_id' => $input['report_id'] ?? null,
                'status' => $input['status'] ?? null
            ];
            return $this->respond($this->adminServices->updateReportStatus($data));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function send_password_reset($input) {
        try {
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            return $this->respond($this->adminServices->sendPasswordReset($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function unlock_rate_limit($input) {
        try {
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            return $this->respond($this->adminServices->unlockRateLimit($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }


    public function terminate_sessions($input) {
        try {
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            return $this->respond($this->adminServices->terminateSessions($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function disable_2fa($input) {
        try {
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            return $this->respond($this->adminServices->disable2FA($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function sync_stripe_subscription($input) {
        try { 
            $this->requirePermission(PermissionsConstants::EDIT_USERS);
            return $this->respond($this->adminServices->syncStripeSubscription($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    private function getAdsService(): AdminAdvertisementsService {
        if (!$this->adsService) {
            $dbManager = new \App\Config\Database\DatabaseManager();
            $this->adsService = new AdminAdvertisementsService($dbManager);
        }
        return $this->adsService;
    }

    public function get_ad_providers($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $query = $input['q'] ?? ($input['search'] ?? null);
            $typeFilter = $input['type'] ?? ($input['provider_type'] ?? null);
            $statusFilter = $input['status'] ?? null;
            $page = isset($input['page']) ? (int)$input['page'] : 1;
            $perPage = isset($input['per_page']) ? (int)$input['per_page'] : 25;
            return $this->respond($this->getAdsService()->getProvidersList($query, $typeFilter, $statusFilter, $page, $perPage));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_ad_provider($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            return $this->respond($this->getAdsService()->createProvider($input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_ad_provider($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $uuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->updateProvider($uuid, $input));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function toggle_ad_provider_active($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $uuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->toggleProviderActive($uuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_ad_provider($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $uuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->deleteProvider($uuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_ad_provider_details($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $uuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->getProviderDetails($uuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_provider_ads($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $providerUuid = $input['provider_uuid'] ?? '';
            return $this->respond($this->getAdsService()->getAdsForProvider($providerUuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function create_advertisement($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $providerUuid = $input['provider_uuid'] ?? '';
            $adData = $input['ad'] ?? $input;
            $resources = $input['resources'] ?? [];
            return $this->respond($this->getAdsService()->createAd($providerUuid, $adData, $resources));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_advertisement($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $adUuid = $input['uuid'] ?? '';
            $adData = $input['ad'] ?? $input;
            $resources = $input['resources'] ?? null;
            return $this->respond($this->getAdsService()->updateAd($adUuid, $adData, $resources));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function toggle_advertisement_status($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $adUuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->toggleAdStatus($adUuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_advertisement($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $adUuid = $input['uuid'] ?? '';
            return $this->respond($this->getAdsService()->deleteAd($adUuid));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function get_public_active_ads($input) {
        try {
            return $this->respond($this->getAdsService()->getPublicActiveAds());
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function record_ad_event($input) {
        try {
            $adUuid = $input['ad_uuid'] ?? '';
            $eventType = $input['event_type'] ?? 'impression';
            $userUuid = $_SESSION['user_uuid'] ?? null;
            $ipAddress = \App\Core\Helpers\Utils::getIpAddress();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            return $this->respond($this->getAdsService()->recordAdMetric($adUuid, $eventType, $userUuid, $ipAddress, $userAgent));
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function download_ad_metrics($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $adUuid = $input['ad_uuid'] ?? ($input['uuid'] ?? '');
            $period = isset($input['period']) ? (string)$input['period'] : '30';
            $this->getAdsService()->downloadAdMetricsPdf($adUuid, $period);
            exit;
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function download_general_metrics($input) {
        try {
            $this->requirePermission(PermissionsConstants::MANAGE_ADVERTISEMENTS);
            $period = isset($input['period']) ? (string)$input['period'] : '30';
            $this->getAdsService()->downloadGeneralMetricsPdf($period);
            exit;
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
