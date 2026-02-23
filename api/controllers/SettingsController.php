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

    // --- NUEVO: Controlador para preferencias ---
    public function update_preferences($input)
    {
        return $this->settingsServices->updatePreferences($input);
    }
}
