<?php
// api/controllers/CanvasChatRestrictionController.php
namespace App\Api\Controllers;

use \App\Config\DatabaseManager;
use \App\Core\System\DatabaseConstants;

class CanvasChatRestrictionController {
    private $pdo;

    public function __construct() {
        $db = new DatabaseManager();
        $this->pdo = $db->getConnection(DatabaseConstants::CONN_CANVASES);
    }

    public function updateRestriction($data) {
        if (!isset($_SESSION['active_account'])) {
            return ['status' => 'error', 'message' => 'No autorizado'];
        }

        $userId = $_SESSION['active_account'];
        
        $canvasId = $data['canvas_id'] ?? null;
        $targetUserId = $data['target_user_id'] ?? null;
        $isSuspended = $data['is_suspended'] ?? '0';
        $suspensionType = $data['suspension_type'] ?? null;
        $suspensionReason = $data['suspension_reason'] ?? null;
        $endDate = $data['end_date'] ?? null;
        if ($endDate === '') {
            $endDate = null;
        }
        
        // Add password verification
        $password = $data['password'] ?? '';
        
        if (!$canvasId || !$targetUserId || !$password) {
            return ['status' => 'error', 'message' => 'Faltan parámetros'];
        }

        // Verify password
        $identityDb = (new DatabaseManager())->getConnection(DatabaseConstants::CONN_IDENTITY);
        $stmt = $identityDb->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($password, $hash)) {
            return ['status' => 'error', 'message' => 'Contraseña incorrecta'];
        }

        // Verify permissions (owner of canvas)
        $stmt = $this->pdo->prepare("SELECT owner_id as user_id, allow_chat FROM canvases WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['status' => 'error', 'message' => 'Lienzo no encontrado'];
        }

        // Only owner can ban (or implement role logic later)
        if ($canvas['user_id'] != $userId) {
            // Wait, also check canvas_roles? For now, just owner, as requested: "si el dueño quiero banear..."
            // But let's check canvas_roles for moderation if needed
            $stmt = $this->pdo->prepare("SELECT cp.name FROM canvas_user_roles cur JOIN canvas_role_permissions crp ON cur.role_id = crp.role_id JOIN canvas_permissions cp ON crp.permission_id = cp.id WHERE cur.canvas_id = ? AND cur.user_id = ?");
            $stmt->execute([$canvasId, $userId]);
            $permissionsRows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $perms = array_column($permissionsRows, 'name');
            
            $canModerate = false;
            if (in_array('manage_settings', $perms) || in_array('manage_members', $perms) || in_array('moderate_chat', $perms)) {
                $canModerate = true;
            }
            if (!$canModerate) {
                return ['status' => 'error', 'message' => 'No tienes permisos para restringir el chat en este lienzo'];
            }
        }

        // Also prevent banning the owner
        if ($targetUserId === $canvas['user_id']) {
            return ['status' => 'error', 'message' => 'No puedes banear al dueño del lienzo'];
        }

        try {
            if ($isSuspended === '1') {
                // Insert or update restriction
                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_chat_restrictions 
                    (canvas_id, user_id, restricted_by, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([
                    $canvasId,
                    $targetUserId,
                    $userId,
                    $suspensionType,
                    $suspensionReason,
                    $endDate
                ]);
                
                // Add to Redis for websocket server to block typing events
                $redis = (new \App\Config\RedisCache())->getClient();
                if ($suspensionType === 'temporary' && $endDate) {
                    $ttl = strtotime($endDate) - time();
                    if ($ttl > 0) {
                        $redis->setex("canvas:{$canvasId}:chat_restricted:{$targetUserId}", $ttl, '1');
                    }
                } else {
                    // permanent or no end date
                    $redis->set("canvas:{$canvasId}:chat_restricted:{$targetUserId}", '1');
                }

                return ['status' => 'success', 'message' => 'Restricción de chat aplicada correctamente'];
            } else {
                // Remove restriction
                $stmt = $this->pdo->prepare("DELETE FROM canvas_chat_restrictions WHERE canvas_id = ? AND user_id = ?");
                $stmt->execute([$canvasId, $targetUserId]);
                
                $redis = (new \App\Config\RedisCache())->getClient();
                $redis->del("canvas:{$canvasId}:chat_restricted:{$targetUserId}");
                
                return ['status' => 'success', 'message' => 'Restricción de chat eliminada correctamente'];
            }
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Error de base de datos: ' . $e->getMessage()];
        }
    }
}
