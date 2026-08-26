<?php
namespace App\Api\Controllers\Settings;

use App\Api\Controllers\BaseController;
use App\Api\Services\Settings\SettingsService;

class SettingsController extends BaseController {
    
    private $settingsServices;

    public function __construct(SettingsService $settingsServices) {
        $this->settingsServices = $settingsServices;
    }

    public function upgrade_tier($input) {
        try { 
            if (method_exists($this->settingsServices, 'upgradeTier')) {
                return $this->respond($this->settingsServices->upgradeTier($input)); 
            }
            return $this->respond(['success' => false, 'message' => __('err_billing_module_wip')]);
        }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_avatar($input) {
        try { return $this->respond($this->settingsServices->updateAvatar($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_avatar() {
        try { return $this->respond($this->settingsServices->deleteAvatar()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_username($input) {
        try { return $this->respond($this->settingsServices->updateUsername($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_identifier($input) {
        try { return $this->respond($this->settingsServices->updateIdentifier($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_banner($input) {
        try { return $this->respond($this->settingsServices->updateBanner($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_banner() {
        try { return $this->respond($this->settingsServices->deleteBanner()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_bio($input) {
        try { return $this->respond($this->settingsServices->updateBio($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function request_email_code() {
        try { return $this->respond($this->settingsServices->requestEmailCode()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function resend_email_code() {
        try { return $this->respond($this->settingsServices->resendEmailCode()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function verify_email_code($input) {
        try { return $this->respond($this->settingsServices->verifyEmailCode($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_email($input) {
        try { return $this->respond($this->settingsServices->updateEmail($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_preferences($input) {
        try { return $this->respond($this->settingsServices->updatePreferences($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function set_flag($input) {
        try { return $this->respond($this->settingsServices->setFlag($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function verify_current_password($input) {
        try { return $this->respond($this->settingsServices->verifyCurrentPassword($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_password($input) {
        try { return $this->respond($this->settingsServices->updatePassword($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_account($input) {
        try { return $this->respond($this->settingsServices->deleteAccount($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function generate_2fa() {
        try { return $this->respond($this->settingsServices->generate2faSetup()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function enable_2fa($input) {
        try { return $this->respond($this->settingsServices->enable2fa($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function disable_2fa($input) {
        try { return $this->respond($this->settingsServices->disable2fa($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function regenerate_recovery_codes($input) {
        try { return $this->respond($this->settingsServices->regenerateRecoveryCodes($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
    
    public function get_devices() {
        try { return $this->respond($this->settingsServices->getDevices()); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function revoke_device($input) {
        try { return $this->respond($this->settingsServices->revokeDevice($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function revoke_all_devices($input) {
        try { return $this->respond($this->settingsServices->revokeAllDevices($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function link_google($input) {
        try { return $this->respond($this->settingsServices->linkGoogle($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function unlink_google($input) {
        try { return $this->respond($this->settingsServices->unlinkGoogle($input)); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}