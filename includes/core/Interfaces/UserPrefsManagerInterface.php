<?php
// includes/core/Interfaces/UserPrefsManagerInterface.php

namespace App\Core\Interfaces;

interface UserPrefsManagerInterface {
    /**
     * Asegura que el usuario tenga preferencias predeterminadas creadas en la base de datos.
     * @param int $userId
     * @return array
     */
    public function ensureDefaultPreferences($userId);
}
?>