<?php

namespace App\Core\Interfaces;

interface UserPrefsManagerInterface {
    public function ensureDefaultPreferences($userId);
    public function getPreference($userId, string $key, $default = null);
    public function getUserFlags($userId): array;
}
?>