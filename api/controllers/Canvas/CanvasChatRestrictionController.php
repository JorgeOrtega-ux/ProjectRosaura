<?php
// api/controllers/CanvasChatRestrictionController.php
namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Config\Database\DatabaseManager;
use \App\Core\System\DatabaseConstants;
use \App\Core\System\Logger;

class CanvasChatRestrictionController {
    private $pdo;

    public function __construct() {
        $db = new DatabaseManager();
        $this->pdo = $db->getConnection(DatabaseConstants::CONN_CANVASES);
    }

    public function updateRestriction($data) {
        if (!isset($_SESSION['active_account'])) {
            return ['status' => 'error', 'message' => __('err_unauthorized')];
        }

        $userId = $_SESSION['active_account'];
        
        $canvasId = $data['canvas_id'] ?? null;
        $targetUserId = $data['target_user_id'] ?? null;
        $isSuspended = $data['is_suspended'] ?? '0';
        $sanctionScope = $data['sanction_scope'] ?? 'chat_mute';
        $suspensionType = $data['suspension_type'] ?? null;
        $suspensionReason = $data['suspension_reason'] ?? null;
        $endDate = $data['end_date'] ?? null;
        if ($endDate === '') {
            $endDate = null;
        }
        
        // Add password verification
        $password = $data['password'] ?? '';
        
        if (!$canvasId || !$targetUserId || !$password) {
            return ['status' => 'error', 'message' => __('err_missing_parameters')];
        }

        // Verify password
        $identityDb = (new DatabaseManager())->getConnection(DatabaseConstants::CONN_IDENTITY);
        $stmt = $identityDb->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($password, $hash)) {
            return ['status' => 'error', 'message' => __('err_invalid_password')];
        }

        // Resolve canvas by ID or UUID
        $stmt = $this->pdo->prepare("SELECT id, owner_id as user_id, allow_chat FROM canvases WHERE id = ? OR uuid = ? LIMIT 1");
        $stmt->execute([$canvasId, $canvasId]);
        $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['status' => 'error', 'message' => __('err_canvas_not_found')];
        }
        $canvasId = (int)$canvas['id'];

        // Resolve target user by ID or UUID
        if (!is_numeric($targetUserId)) {
            $uStmt = $identityDb->prepare("SELECT id FROM users WHERE uuid = ? LIMIT 1");
            $uStmt->execute([$targetUserId]);
            $realTargetId = $uStmt->fetchColumn();
            if ($realTargetId) {
                $targetUserId = (int)$realTargetId;
            }
        } else {
            $targetUserId = (int)$targetUserId;
        }

        // Only owner can ban (or implement role logic later)
        if ($canvas['user_id'] != $userId) {
            // Wait, also check canvas_roles? For now, just owner, as requested: "si el dueÃ±o quiero banear..."
            // But let's check canvas_roles for moderation if needed
            $stmt = $this->pdo->prepare("SELECT cp.name FROM canvas_user_roles cur JOIN canvas_role_permissions crp ON cur.role_id = crp.role_id JOIN canvas_permissions cp ON crp.permission_id = cp.id WHERE cur.canvas_id = ? AND cur.user_id = ?");
            $stmt->execute([$canvasId, $userId]);
            $permissionsRows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $perms = array_column($permissionsRows, 'name');
            
            $canModerate = false;
            if (in_array(\App\Core\System\PermissionsConstants::MANAGE_SETTINGS, $perms) || in_array(\App\Core\System\PermissionsConstants::MANAGE_MEMBERS, $perms) || in_array(\App\Core\System\PermissionsConstants::MODERATE_CHAT, $perms)) {
                $canModerate = true;
            }
            if (!$canModerate) {
                return ['status' => 'error', 'message' => __('err_no_permissions')];
            }
        }

        // Also prevent banning the owner
        if ($targetUserId === $canvas['user_id']) {
            return ['status' => 'error', 'message' => __('err_cannot_ban_owner')];
        }

        try {
            if ($isSuspended === '1') {
                // If it is a canvas ban, kick the member
                if ($sanctionScope === 'canvas_ban') {
                    $canvasRepo = new \App\Core\Repositories\CanvasRepository(new DatabaseManager(), new \App\Config\Search\TypesenseManager(), new \App\Config\Database\RedisCache());
                    $canvasRepo->removeMember($canvasId, $targetUserId);
                }

                // Insert or update restriction
                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_sanctions 
                    (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    sanction_scope = VALUES(sanction_scope),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([
                    $canvasId,
                    $targetUserId,
                    $userId,
                    $sanctionScope,
                    $suspensionType,
                    $suspensionReason,
                    $endDate
                ]);
                
                // Add to Redis for websocket server
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                $ttl = 0;
                if ($suspensionType === 'temporary' && $endDate) {
                    $ttl = strtotime($endDate) - time();
                }

                if ($sanctionScope === 'canvas_ban') {
                    if ($ttl > 0) {
                        $redis->setex("canvas:{$canvasId}:canvas_banned:{$targetUserId}", $ttl, '1');
                        $redis->setex("canvas:{$canvasId}:chat_restricted:{$targetUserId}", $ttl, '1');
                    } else {
                        $redis->set("canvas:{$canvasId}:canvas_banned:{$targetUserId}", '1');
                        $redis->set("canvas:{$canvasId}:chat_restricted:{$targetUserId}", '1');
                    }
                } else {
                    if ($ttl > 0) {
                        $redis->setex("canvas:{$canvasId}:chat_restricted:{$targetUserId}", $ttl, '1');
                    } else {
                        $redis->set("canvas:{$canvasId}:chat_restricted:{$targetUserId}", '1');
                    }
                    $redis->del("canvas:{$canvasId}:canvas_banned:{$targetUserId}");
                }

                return ['status' => 'success', 'message' => __('msg_sanction_applied')];
            } else {
                // Remove restriction
                $stmt = $this->pdo->prepare("DELETE FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ?");
                $stmt->execute([$canvasId, $targetUserId]);
                
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                $redis->del("canvas:{$canvasId}:chat_restricted:{$targetUserId}");
                $redis->del("canvas:{$canvasId}:canvas_banned:{$targetUserId}");
                
                return ['status' => 'success', 'message' => __('msg_sanction_removed')];
            }
        } catch (\Exception $e) {
            Logger::error("Error de base de datos en updateRestriction: " . $e->getMessage());
            return ['status' => 'error', 'message' => __('err_internal_server_error')];
        }
    }
}
