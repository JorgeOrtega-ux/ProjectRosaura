<?php
namespace App\Api\Controllers;

use App\Api\Services\SettingsServices;

class SettingsController extends BaseController {
    
    private $settingsServices;

    public function __construct(SettingsServices $settingsServices) {
        $this->settingsServices = $settingsServices;
    }

    public function update_avatar($input) {
        try { return $this->settingsServices->updateAvatar($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_avatar() {
        try { return $this->settingsServices->deleteAvatar(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_username($input) {
        try { return $this->settingsServices->updateUsername($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function request_email_code() {
        try { return $this->settingsServices->requestEmailCode(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function resend_email_code() {
        try { return $this->settingsServices->resendEmailCode(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function verify_email_code($input) {
        try { return $this->settingsServices->verifyEmailCode($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_email($input) {
        try { return $this->settingsServices->updateEmail($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_preferences($input) {
        try { return $this->settingsServices->updatePreferences($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function verify_current_password($input) {
        try { return $this->settingsServices->verifyCurrentPassword($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function update_password($input) {
        try { return $this->settingsServices->updatePassword($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function delete_account($input) {
        try { return $this->settingsServices->deleteAccount($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function generate_2fa() {
        try { return $this->settingsServices->generate2faSetup(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function enable_2fa($input) {
        try { return $this->settingsServices->enable2fa($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function disable_2fa($input) {
        try { return $this->settingsServices->disable2fa($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function regenerate_recovery_codes($input) {
        try { return $this->settingsServices->regenerateRecoveryCodes($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
    
    public function get_devices() {
        try { return $this->settingsServices->getDevices(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function revoke_device($input) {
        try { return $this->settingsServices->revokeDevice($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function revoke_all_devices($input) {
        try { return $this->settingsServices->revokeAllDevices($input); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
?>