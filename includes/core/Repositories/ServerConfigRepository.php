<?php
// includes/core/Repositories/ServerConfigRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ServerConfigRepositoryInterface;
use PDO;

class ServerConfigRepository implements ServerConfigRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function getConfig(): array {
        $stmt = $this->pdo->query("SELECT * FROM server_config LIMIT 1");
        $config = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$config) {
            // Fallback a valores por defecto en caso extremo de que la tabla esté vacía o en despliegue
            return [
                'min_password_length' => 8,
                'max_password_length' => 64,
                'min_username_length' => 3,
                'max_username_length' => 32,
                'max_avatar_size_mb' => 2,
                'username_change_cooldown_days' => 7,
                'username_change_max_attempts' => 1,
                'email_change_cooldown_days' => 7,
                'email_change_max_attempts' => 1,
                'avatar_change_cooldown_days' => 1,
                'avatar_change_max_attempts' => 3,
                'login_rate_limit_attempts' => 5,
                'login_rate_limit_minutes' => 15,
                'forgot_password_rate_limit_attempts' => 3,
                'forgot_password_rate_limit_minutes' => 30,
                
                // Configuración predeterminada Anti-Hackeo (Masivo) para Administradores
                'admin_edit_avatar_attempts' => 20,
                'admin_edit_avatar_minutes' => 30,
                
                'admin_edit_username_attempts' => 20,
                'admin_edit_username_minutes' => 30,
                
                'admin_edit_email_attempts' => 20,
                'admin_edit_email_minutes' => 30,
                
                'admin_edit_prefs_attempts' => 50,
                'admin_edit_prefs_minutes' => 30,
                
                'admin_edit_role_attempts' => 10,
                'admin_edit_role_minutes' => 30,
                
                'admin_edit_status_attempts' => 20,
                'admin_edit_status_minutes' => 30,
                
                'admin_add_note_attempts' => 30,
                'admin_add_note_minutes' => 30
            ];
        }
        
        return $config;
    }

    public function updateConfig(array $data): bool {
        $fields = [];
        $values = [];
        
        foreach ($data as $key => $val) {
            $fields[] = "$key = ?";
            $values[] = (int)$val;
        }

        if (empty($fields)) return true;

        $sql = "UPDATE server_config SET " . implode(', ', $fields) . " WHERE id = 1";
        $stmt = $this->pdo->prepare($sql);
        
        return $stmt->execute($values);
    }
}
?>