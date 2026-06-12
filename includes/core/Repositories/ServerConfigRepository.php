<?php
// includes/core/Repositories/ServerConfigRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use Predis\Client;
use PDO;
use PDOException;

class ServerConfigRepository implements ServerConfigRepositoryInterface {
    private $pdo;
    private $redis;

    public function __construct(DatabaseManager $db, Client $redis) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        $this->redis = $redis;
    }

    public function getConfig(): array {
        $defaultConfig = [
            // Ajustes Generales de Cuenta
            'min_password_length' => 8,
            'max_password_length' => 64,
            'min_username_length' => 3,
            'max_username_length' => 32,
            'max_avatar_size_mb' => 2,
            
            // Ajustes Generales de Accesos y Sesiones
            'session_lifetime_minutes' => 120,
            'max_active_sessions_per_user' => 3,
            'allow_registrations' => 1,
            'allowed_email_domains' => '', 
            'registration_rate_limit_attempts' => 5,
            'registration_rate_limit_minutes' => 15,
            'verification_code_expiration_minutes' => 15,
            'password_reset_expiration_minutes' => 15,

            // Ajustes de Limites para Usuarios
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
            
            // Configuración predeterminada Anti-Hackeo
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
            'admin_add_note_minutes' => 30,
            
            // Limites Base Admin Generales
            'admin_read_data_attempts' => 120,
            'admin_read_data_minutes' => 1,
            'admin_password_verify_attempts' => 5,
            'admin_password_verify_minutes' => 15,
            
            // Limites de Acciones Redis Admin
            'admin_redis_read_attempts' => 30,
            'admin_redis_read_minutes' => 1,
            'admin_redis_delete_attempts' => 100,
            'admin_redis_delete_minutes' => 1,
            'admin_flush_redis_sessions_attempts' => 5,
            'admin_flush_redis_sessions_minutes' => 5,
            
            // Limites de Backups Manuales
            'admin_backup_create_attempts' => 5,
            'admin_backup_create_minutes' => 30,
            'admin_backup_restore_attempts' => 3,
            'admin_backup_restore_minutes' => 30,
            
            // Configuración por defecto Automatización de Backups
            'auto_backup_enabled' => 0,
            'auto_backup_frequency_hours' => 24,
            'auto_backup_retention_count' => 5,
            'backup_schema_config' => '{}', 

            // Modo Mantenimiento
            'maintenance_mode' => 0
        ];

        // 1. INTENTAR LEER LA CONFIGURACIÓN DESDE REDIS
        try {
            $cachedConfig = $this->redis->get(CacheConstants::KEY_SERVER_CONFIG);
            if ($cachedConfig) {
                $decodedConfig = json_decode($cachedConfig, true);
                if (is_array($decodedConfig)) {
                    return $decodedConfig;
                }
            }
        } catch (\Exception $e) {
            Logger::error("Redis cache read failed in " . __METHOD__, ['exception' => $e]);
        }

        // 2. FALLBACK A MYSQL (Si no estaba en caché o Redis falló)
        $tblServerConfig = DB::TBL_SERVER_CONFIG;

        try {
            $stmt = $this->pdo->query("SELECT * FROM {$tblServerConfig} LIMIT 1");
            $config = $stmt->fetch(PDO::FETCH_ASSOC);

            $finalConfig = $config ?: $defaultConfig;

            // 3. GUARDAR EL RESULTADO EN REDIS PARA PRÓXIMAS CONSULTAS (TTL: 1 Semana)
            try {
                $this->redis->setex(
                    CacheConstants::KEY_SERVER_CONFIG,
                    CacheConstants::TTL_ONE_WEEK,
                    json_encode($finalConfig)
                );
            } catch (\Exception $e) {
                Logger::error("Redis cache write failed in " . __METHOD__, ['exception' => $e]);
            }

            return $finalConfig;
            
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__ . " - Returning default config", ['exception' => $e]);
            return $defaultConfig;
        }
    }

    public function updateConfig(array $data): bool {
        $tblServerConfig = DB::TBL_SERVER_CONFIG;

        try {
            $fields = [];
            $values = [];
            
            foreach ($data as $key => $val) {
                $fields[] = "$key = ?";
                if ($key === 'backup_schema_config' || $key === 'allowed_email_domains') {
                    $values[] = (string)$val;
                } else {
                    $values[] = (int)$val;
                }
            }

            if (empty($fields)) return true;

            $sql = "UPDATE {$tblServerConfig} SET " . implode(', ', $fields) . " WHERE id = 1";
            $stmt = $this->pdo->prepare($sql);
            
            $result = $stmt->execute($values);

            // 4. INVALIDAR LA CACHÉ AL ACTUALIZAR EXITOSAMENTE EN MYSQL
            if ($result) {
                try {
                    $this->redis->del(CacheConstants::KEY_SERVER_CONFIG);
                } catch (\Exception $e) {
                    Logger::error("Redis cache invalidation failed in " . __METHOD__, ['exception' => $e]);
                }
            }

            return $result;
            
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return false;
        }
    }
}
?>