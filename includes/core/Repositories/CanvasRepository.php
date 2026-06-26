<?php

namespace App\Core\Repositories;

use PDO;
use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Config\DatabaseManager;
use App\Config\TypesenseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;

class CanvasRepository implements CanvasRepositoryInterface {
    private $db;
    private TypesenseManager $typesenseManager;

    // ELIMINADO EL LOGGER DEL CONSTRUCTOR PARA EVITAR ERROR DEL CONTENEDOR DI
    public function __construct(DatabaseManager $databaseManager, TypesenseManager $typesenseManager) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
        $this->typesenseManager = $typesenseManager;
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

        $id = (int)$this->db->lastInsertId();

        // --- INTEGRACIÓN TYPESENSE CON TOLERANCIA A FALLOS ---
        try {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                $document = [
                    'id'         => (string)$id,
                    'uuid'       => $canvasData['uuid'],
                    'name'       => $canvasData['name'],
                    'owner_id'   => (int)$canvasData['owner_id'],
                    'privacy'    => $canvasData['privacy'],
                    'scope_type' => $canvasData['scope_type'] ?? 'personal',
                    'created_at' => time()
                ];
                $client->collections['canvases']->documents->create($document);
            }
        } catch (Exception $e) {
            Logger::error("Typesense Create Error (Canvas ID {$id}): " . $e->getMessage());
        }

        return $id;
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

    public function getPublicCanvases(int $limit = 20, ?int $currentUserId = null): array {
        $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.scope_type, 
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN canvas_favorites f ON c.id = f.canvas_id AND f.user_id = :current_user_id
                WHERE c.privacy = 'public' AND c.scope_type = 'personal'
                ORDER BY c.created_at DESC 
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':current_user_id', $currentUserId ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            return $canvas;
        }, $results);

        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function getOfficialCanvases(?int $currentUserId = null): array {
        $sql = "SELECT c.id, c.uuid, c.name, c.description, c.size, c.palette_id, c.scope_type, c.scope_ref_1, c.scope_ref_2, c.scope_ref_3,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN canvas_favorites f ON c.id = f.canvas_id AND f.user_id = :current_user_id
                WHERE c.owner_id IS NULL AND c.scope_type != 'personal'
                ORDER BY c.created_at DESC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':current_user_id', $currentUserId ?? 0, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            return $canvas;
        }, $results);

        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array {
        $sql = "SELECT c.id, c.uuid, c.name, c.description, c.privacy, c.requires_approval, c.size, c.palette_id, c.max_participants, c.cooldown_pixels_batch, c.cooldown_seconds, c.created_at, c.scope_type,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite 
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN canvas_favorites f ON c.id = f.canvas_id AND f.user_id = :oid
                WHERE c.owner_id = :oid 
                ORDER BY c.id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':oid', $ownerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            return $canvas;
        }, $results);

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
        $success = $stmt->execute($params);

        // --- INTEGRACIÓN TYPESENSE CON TOLERANCIA ---
        if ($success) {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                foreach ($canvasIds as $id) {
                    try {
                        $client->collections['canvases']->documents[(string)$id]->delete();
                    } catch (Exception $e) {
                        Logger::error("Typesense Delete Error (Canvas {$id}): " . $e->getMessage());
                    }
                }
            }
        }

        return $success;
    }

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
        $success = $stmt->execute([
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

        // --- INTEGRACIÓN TYPESENSE CON TOLERANCIA ---
        if ($success) {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                try {
                    $document = [
                        'name'    => $data['name'],
                        'privacy' => $data['privacy']
                    ];
                    $client->collections['canvases']->documents[(string)$id]->update($document);
                } catch (Exception $e) {
                    Logger::error("Typesense Update Error (Canvas ID {$id}): " . $e->getMessage());
                }
            }
        }

        return $success;
    }

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

    public function countCanvasMembers(int $canvasId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

 public function getUserStorageUsed(int $userId): float {
        $sql = "SELECT file_path FROM user_templates WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        $paths = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        
        $totalBytes = 0;
        
        // CORRECCIÓN: Calcular el directorio base real apuntando a la raíz del proyecto.
        // Si este archivo está en: includes/core/Repositories/CanvasRepository.php
        // __DIR__ es "includes/core/Repositories"
        // dirname(__DIR__, 3) debería apuntar a la raíz del proyecto.
        $baseDir = dirname(__DIR__, 3); 
        
        foreach ($paths as $path) {
            // Limpiamos la ruta que viene de la BD (ej. "public/storage/templates/...")
            $cleanPath = ltrim($path, '/');
            
            // CORRECCIÓN: En el código original reemplazabas 'public/storage/' por 'storage/public/'
            // Asegurémonos de que la ruta física final sea correcta. 
            // La estructura real es: ROOT/storage/public/templates/
            $relativePath = str_replace('public/storage/', 'storage/public/', $cleanPath);
            
            $physicalPath = $baseDir . DIRECTORY_SEPARATOR . $relativePath;
            
            // DEBUG (Opcional, puedes quitarlo después): Si falla, registra por qué
            if (!file_exists($physicalPath)) {
                Logger::error("getUserStorageUsed: Archivo no encontrado en la ruta física.", ['path_intentado' => $physicalPath]);
                continue;
            }

            $totalBytes += filesize($physicalPath);
        }
        
        // Retornar en Megabytes
        return $totalBytes / (1024 * 1024); 
    }

    public function countCanvasSnapshots(int $canvasId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

    public function getCanvasByUuid(string $uuid): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function deleteCanvasByUuid(string $uuid): bool {
        $canvas = $this->getCanvasByUuid($uuid); 

        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([':uuid' => $uuid]);

        // --- INTEGRACIÓN TYPESENSE CON TOLERANCIA ---
        if ($success && $canvas) {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                try {
                    $client->collections['canvases']->documents[(string)$canvas['id']]->delete();
                } catch (Exception $e) {
                    Logger::error("Typesense Delete UUID Error (Canvas ID {$canvas['id']}): " . $e->getMessage());
                }
            }
        }

        return $success;
    }

    public function removeMember(int $canvasId, int $userId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = :canvas_id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
    }

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

    public function toggleFavorite(int $userId, int $canvasId): array {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT 1 FROM canvas_favorites WHERE user_id = :user_id AND canvas_id = :canvas_id LIMIT 1");
            $stmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);
            $isFavorite = $stmt->fetchColumn();

            if ($isFavorite) {
                $delStmt = $this->db->prepare("DELETE FROM canvas_favorites WHERE user_id = :user_id AND canvas_id = :canvas_id");
                $delStmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);

                $updStmt = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = :canvas_id");
                $updStmt->execute([':canvas_id' => $canvasId]);

                $action = 'removed';
            } else {
                $insStmt = $this->db->prepare("INSERT INTO canvas_favorites (user_id, canvas_id) VALUES (:user_id, :canvas_id)");
                $insStmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);

                $updStmt = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET favorites_count = favorites_count + 1 WHERE id = :canvas_id");
                $updStmt->execute([':canvas_id' => $canvasId]);

                $action = 'added';
            }

            $countStmt = $this->db->prepare("SELECT favorites_count FROM " . DB::TBL_CANVASES . " WHERE id = :canvas_id");
            $countStmt->execute([':canvas_id' => $canvasId]);
            $newCount = (int)$countStmt->fetchColumn();

            $this->db->commit();

            return [
                'action' => $action,
                'favorites_count' => $newCount
            ];

        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function isFavorite(int $userId, int $canvasId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM canvas_favorites WHERE user_id = :user_id AND canvas_id = :canvas_id LIMIT 1");
        $stmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);
        return (bool)$stmt->fetchColumn();
    }
}
?>