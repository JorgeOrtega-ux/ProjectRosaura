<?php

namespace App\Core\Repositories;

use PDO;
use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

class CanvasRepository implements CanvasRepositoryInterface {
    private $db;

    public function __construct(DatabaseManager $databaseManager) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
    }

    private function appendSnapshotUrl(array $canvas): array {
        if (!isset($canvas['id'])) {
            return $canvas;
        }
        
        $snapshotPath = "/assets/img/snapshots/canvas_" . $canvas['id'] . ".png";
        $physicalPath = dirname(__DIR__, 3) . '/public' . $snapshotPath;
        
        if (file_exists($physicalPath)) {
            $timestamp = filemtime($physicalPath);
            $canvas['snapshot_url'] = $snapshotPath . "?v=" . $timestamp;
        } else {
            $canvas['snapshot_url'] = null;
        }
        
        return $canvas;
    }

    public function create(array $canvasData): int {
        $sql = "INSERT INTO " . DB::TBL_CANVASES . " 
                (uuid, owner_id, name, description, privacy, requires_approval, size, palette_id, max_participants, cooldown_pixels_batch, cooldown_seconds, scope_type, scope_ref_1, scope_ref_2, scope_ref_3) 
                VALUES (:uuid, :owner_id, :name, :description, :privacy, :requires_approval, :size, :palette_id, :max_participants, :cooldown_pixels_batch, :cooldown_seconds, :scope_type, :scope_ref_1, :scope_ref_2, :scope_ref_3)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uuid'                  => $canvasData['uuid'],
            ':owner_id'              => $canvasData['owner_id'],
            ':name'                  => $canvasData['name'],
            ':description'           => $canvasData['description'],
            ':privacy'               => $canvasData['privacy'],
            ':requires_approval'     => $canvasData['requires_approval'],
            ':size'                  => $canvasData['size'],
            ':palette_id'            => $canvasData['palette_id'],
            ':max_participants'      => $canvasData['max_participants'],
            ':cooldown_pixels_batch' => $canvasData['cooldown_pixels_batch'],
            ':cooldown_seconds'      => $canvasData['cooldown_seconds'],
            ':scope_type'            => $canvasData['scope_type'] ?? 'personal',
            ':scope_ref_1'           => $canvasData['scope_ref_1'] ?? null,
            ':scope_ref_2'           => $canvasData['scope_ref_2'] ?? null,
            ':scope_ref_3'           => $canvasData['scope_ref_3'] ?? null
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function addMember(int $canvasId, int $userId, string $role): bool {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_MEMBERS . " 
                (canvas_id, user_id, role) 
                VALUES (:canvas_id, :user_id, :role)
                ON DUPLICATE KEY UPDATE role = :update_role";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'   => $canvasId,
            ':user_id'     => $userId,
            ':role'        => $role,
            ':update_role' => $role
        ]);
    }

    // --- MÉTODOS PARA HOME / EXPLORA ---

    public function getPublicCanvases(int $limit = 20): array {
        $sql = "SELECT id, uuid, name, owner_id, scope_type 
                FROM " . DB::TBL_CANVASES . " 
                WHERE privacy = 'public' AND scope_type = 'personal'
                ORDER BY created_at DESC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function getOfficialCanvases(): array {
        $sql = "SELECT id, uuid, name, description, size, palette_id, scope_type, scope_ref_1, scope_ref_2, scope_ref_3 
                FROM " . DB::TBL_CANVASES . " 
                WHERE owner_id IS NULL AND scope_type != 'personal'
                ORDER BY created_at DESC";
                
        $stmt = $this->db->query($sql);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    // --- MÉTODOS PARA GESTIÓN (MANAGE) ---

    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array {
        $sql = "SELECT id, uuid, name, description, privacy, requires_approval, size, palette_id, max_participants, cooldown_pixels_batch, cooldown_seconds, created_at, scope_type 
                FROM " . DB::TBL_CANVASES . " 
                WHERE owner_id = :oid 
                ORDER BY id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':oid', $ownerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function countUserCanvases(int $ownerId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = :oid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':oid' => $ownerId]);
        return (int)$stmt->fetchColumn();
    }

    public function deleteCanvases(array $canvasIds, int $ownerId): bool {
        if (empty($canvasIds)) {
            return false;
        }

        $placeholders = implode(',', array_fill(0, count($canvasIds), '?'));
        
        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE id IN ($placeholders) AND owner_id = ?";
        $stmt = $this->db->prepare($sql);
        
        $params = array_merge($canvasIds, [$ownerId]);
        return $stmt->execute($params);
    }

    // --- MÉTODOS PARA EDICIÓN (EDIT) ---

    public function getByIdAndOwner(int $id, int $ownerId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE id = :id AND owner_id = :owner_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $id, 
            ':owner_id' => $ownerId
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $this->appendSnapshotUrl($result) : null;
    }

    public function getById(int $id): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $this->appendSnapshotUrl($result) : null;
    }

    public function getByScopeHash(string $hash): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE scope_hash = :hash LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':hash' => $hash]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateCanvasData(int $id, array $data): bool {
        $sql = "UPDATE " . DB::TBL_CANVASES . " 
                SET name = :name, 
                    description = :description, 
                    privacy = :privacy, 
                    requires_approval = :requires_approval,
                    palette_id = :palette_id,
                    max_participants = :max_participants,
                    cooldown_pixels_batch = :cooldown_pixels_batch,
                    cooldown_seconds = :cooldown_seconds
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':name'                  => $data['name'],
            ':description'           => $data['description'],
            ':privacy'               => $data['privacy'],
            ':requires_approval'     => $data['requires_approval'],
            ':palette_id'            => $data['palette_id'],
            ':max_participants'      => $data['max_participants'],
            ':cooldown_pixels_batch' => $data['cooldown_pixels_batch'],
            ':cooldown_seconds'      => $data['cooldown_seconds'],
            ':id'                    => $id
        ]);
    }

    // --- MÉTODOS PARA APROBACIONES DE ACCESO ---

    public function createAccessRequest(int $canvasId, int $userId): bool {
        $sql = "INSERT INTO canvas_access_requests (canvas_id, user_id, status) 
                VALUES (:canvas_id, :user_id, 'pending')
                ON DUPLICATE KEY UPDATE status = 'pending', updated_at = CURRENT_TIMESTAMP";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId
        ]);
    }

    public function getAccessRequest(int $canvasId, int $userId): ?array {
        $sql = "SELECT * FROM canvas_access_requests WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function getRequestById(int $requestId): ?array {
        $sql = "SELECT * FROM canvas_access_requests WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $requestId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateRequestStatus(int $requestId, string $status): bool {
        $sql = "UPDATE canvas_access_requests SET status = :status WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':status' => $status, ':id' => $requestId]);
    }

    public function getPendingRequests(int $canvasId): array {
        $sql = "SELECT * FROM canvas_access_requests WHERE canvas_id = :canvas_id AND status = 'pending' ORDER BY created_at ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getMemberRole(int $canvasId, int $userId): ?string {
        $sql = "SELECT role FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
        $result = $stmt->fetchColumn();
        return $result ?: null;
    }

    public function updateMemberRole(int $canvasId, int $userId, string $role): bool {
        $sql = "UPDATE " . DB::TBL_CANVAS_MEMBERS . " SET role = :role WHERE canvas_id = :canvas_id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':role' => $role,
            ':canvas_id' => $canvasId,
            ':user_id' => $userId
        ]);
    }

    // --- NUEVOS MÉTODOS PARA ELIMINAR / SALIR DE LIENZO ÚNICO ---

    public function getCanvasByUuid(string $uuid): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function deleteCanvasByUuid(string $uuid): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':uuid' => $uuid]);
    }

    public function removeMember(int $canvasId, int $userId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = :canvas_id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
    }

    // ==========================================
    // PERSISTENCIA DE LIENZOS (BLOB / SNAPSHOTS)
    // ==========================================

    public function getSnapshot(int $canvasId): ?string {
        $sql = "SELECT snapshot_data FROM canvas_snapshots WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $result = $stmt->fetchColumn();
        return $result ? @gzuncompress($result) : null;
    }

    public function saveSnapshot(int $canvasId, string $snapshotData): bool {
        $compressed = gzcompress($snapshotData);
        
        $sql = "INSERT INTO canvas_snapshots (canvas_id, snapshot_data) 
                VALUES (:canvas_id, :data)
                ON DUPLICATE KEY UPDATE snapshot_data = :update_data, last_updated = CURRENT_TIMESTAMP";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'   => $canvasId,
            ':data'        => $compressed,
            ':update_data' => $compressed
        ]);
    }

    public function clearCanvasData(int $canvasId): bool {
        $sql = "DELETE FROM canvas_snapshots WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':canvas_id' => $canvasId]);
    }

    // ==========================================
    // REINICIOS PROGRAMADOS
    // ==========================================

    public function getResetSettings(int $canvasId): ?array {
        $sql = "SELECT * FROM canvas_reset_settings WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateResetSettings(int $canvasId, array $settings): bool {
        $sql = "INSERT INTO canvas_reset_settings 
                (canvas_id, is_active, next_reset_at, take_snapshot, timer_action)
                VALUES 
                (:canvas_id, :is_active, :next_reset_at, :take_snapshot, :timer_action)
                ON DUPLICATE KEY UPDATE 
                is_active = :upd_is_active,
                next_reset_at = :upd_next_reset_at,
                take_snapshot = :upd_take_snapshot,
                timer_action = :upd_timer_action";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'         => $canvasId,
            ':is_active'         => $settings['is_active'],
            ':next_reset_at'     => $settings['next_reset_at'],
            ':take_snapshot'     => $settings['take_snapshot'],
            ':timer_action'      => $settings['timer_action'],
            
            ':upd_is_active'     => $settings['is_active'],
            ':upd_next_reset_at' => $settings['next_reset_at'],
            ':upd_take_snapshot' => $settings['take_snapshot'],
            ':upd_timer_action'  => $settings['timer_action']
        ]);
    }

    // ==========================================
    // NUEVOS MÉTODOS PARA GALERÍA HISTÓRICA Y VISUALIZADOR
    // ==========================================

    public function getSnapshotByUuid(string $uuid): ?array {
        $sql = "SELECT h.*, c.name as canvas_name, c.uuid as original_canvas_uuid, c.size, c.palette_id
                FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " h
                INNER JOIN " . DB::TBL_CANVASES . " c ON h.canvas_id = c.id
                WHERE h.snapshot_uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function getSnapshotsByCanvasId(int $canvasId): array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " 
                WHERE canvas_id = :canvas_id 
                ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getSnapshotsHistoryByUuid(string $uuid): array {
        $sql = "SELECT h.id, h.snapshot_uuid, h.file_path, h.created_at 
                FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " h
                INNER JOIN " . DB::TBL_CANVASES . " c ON h.canvas_id = c.id
                WHERE c.uuid = :uuid
                ORDER BY h.created_at DESC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    // ==========================================
    // LIBRERÍA DE PLANTILLAS DE USUARIO
    // ==========================================

    public function saveTemplateMetadata(int $userId, string $filePath): int {
        $sql = "INSERT INTO user_templates (user_id, file_path) 
                VALUES (:user_id, :file_path)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id'   => $userId,
            ':file_path' => $filePath
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function getUserTemplates(int $userId): array {
        $sql = "SELECT id, user_id, file_path, created_at 
                FROM user_templates 
                WHERE user_id = :user_id 
                ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function deleteTemplate(int $templateId, int $userId): bool {
        $sql = "DELETE FROM user_templates 
                WHERE id = :id AND user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id'      => $templateId,
            ':user_id' => $userId
        ]);
    }
}
?>