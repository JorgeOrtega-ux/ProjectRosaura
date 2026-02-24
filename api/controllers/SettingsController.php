<?php
// api/controllers/SettingsController.php

namespace App\Api\Controllers;

use App\Api\Services\SettingsServices;

class SettingsController
{
    private $settingsServices;

    public function __construct()
    {
        $this->settingsServices = new SettingsServices();
    }

    public function update_avatar($input)
    {
        return $this->settingsServices->updateAvatar($input);
    }
    public function delete_avatar()
    {
        return $this->settingsServices->deleteAvatar();
    }
    public function update_username($input)
    {
        return $this->settingsServices->updateUsername($input);
    }
    public function request_email_code()
    {
        return $this->settingsServices->requestEmailCode();
    }
    public function verify_email_code($input)
    {
        return $this->settingsServices->verifyEmailCode($input);
    }
    public function update_email($input)
    {
        return $this->settingsServices->updateEmail($input);
    }
    public function update_preferences($input)
    {
        return $this->settingsServices->updatePreferences($input);
    }

    public function verify_current_password($input)
    {
        return $this->settingsServices->verifyCurrentPassword($input);
    }
    public function update_password($input)
    {
        return $this->settingsServices->updatePassword($input);
    }

    // --- NUEVOS: Controladores 2FA ---
    public function generate_2fa()
    {
        return $this->settingsServices->generate2faSetup();
    }
    public function enable_2fa($input)
    {
        return $this->settingsServices->enable2fa($input);
    }
    public function disable_2fa($input)
    {
        return $this->settingsServices->disable2fa($input);
    }
    public function regenerate_recovery_codes($input)
    {
        return $this->settingsServices->regenerateRecoveryCodes($input);
    }
}