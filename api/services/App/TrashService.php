<?php
namespace App\Api\Services\App;

use Exception;
use PDO;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\Logger;
use App\Core\Helpers\Utils;

class TrashService {

    public function getTrashItems(int $userId): array {
        try {
            $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);

            // 1. Obtener lienzos en papelera
            $stmtCanvases = $db->prepare("
                SELECT id, uuid, name, size, deleted_at,
                       TIMESTAMPDIFF(DAY, deleted_at, NOW()) as days_in_trash
                FROM canvases
                WHERE owner_id = :uid AND deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
            ");
            $stmtCanvases->execute([':uid' => $userId]);
            $canvases = $stmtCanvases->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $formattedCanvases = [];
            foreach ($canvases as $c) {
                $daysLeft = max(0, 30 - (int)$c['days_in_trash']);
                $formattedCanvases[] = [
                    'id'            => $c['id'],
                    'uuid'          => $c['uuid'],
                    'name'          => $c['name'],
                    'size'          => $c['size'],
                    'type'          => 'canvas',
                    'deleted_at'    => date('d/m/Y H:i', strtotime($c['deleted_at'])),
                    'days_left'     => $daysLeft,
                    'thumbnail_url' => Utils::getS3PublicUrl("thumbnails/canvas_{$c['uuid']}.webp"),
                ];
            }

            // 2. Obtener plantillas en papelera
            $stmtTemplates = $db->prepare("
                SELECT id, file_path, file_size, deleted_at,
                       TIMESTAMPDIFF(DAY, deleted_at, NOW()) as days_in_trash
                FROM user_templates
                WHERE user_id = :uid AND deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
            ");
            $stmtTemplates->execute([':uid' => $userId]);
            $templates = $stmtTemplates->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $formattedTemplates = [];
            foreach ($templates as $t) {
                $daysLeft = max(0, 30 - (int)$t['days_in_trash']);
                $formattedTemplates[] = [
                    'id'          => $t['id'],
                    'file_path'   => $t['file_path'],
                    'file_size'   => (int)$t['file_size'],
                    'type'        => 'template',
                    'deleted_at'  => date('d/m/Y H:i', strtotime($t['deleted_at'])),
                    'days_left'   => $daysLeft,
                    'preview_url' => Utils::getS3PublicUrl($t['file_path']),
                ];
            }

            return [
                'success' => true,
                'data'    => [
                    'canvases'  => $formattedCanvases,
                    'templates' => $formattedTemplates,
                    'total'     => count($formattedCanvases) + count($formattedTemplates),
                ],
            ];
        } catch (Exception $e) {
            Logger::error('Error fetching trash items: ' . $e->getMessage(), ['user_id' => $userId]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function restoreItem(int $userId, string $type, string $id): array {
        try {
            $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);

            if ($type === 'canvas') {
                $stmt = $db->prepare("UPDATE canvases SET deleted_at = NULL WHERE (uuid = :id OR id = :id) AND owner_id = :uid AND deleted_at IS NOT NULL");
                $stmt->execute([':id' => $id, ':uid' => $userId]);
                if ($stmt->rowCount() === 0) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }
                return ['success' => true, 'message' => __('msg_canvas_restored')];

            } elseif ($type === 'template') {
                $stmt = $db->prepare("UPDATE user_templates SET deleted_at = NULL WHERE id = :id AND user_id = :uid AND deleted_at IS NOT NULL");
                $stmt->execute([':id' => (int)$id, ':uid' => $userId]);
                if ($stmt->rowCount() === 0) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }
                return ['success' => true, 'message' => __('msg_template_restored')];
            }

            return ['success' => false, 'message' => __('err_invalid_type')];
        } catch (Exception $e) {
            Logger::error('Error restoring trash item: ' . $e->getMessage());
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deletePermanently(int $userId, string $type, string $id): array {
        try {
            $db     = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);
            $s3     = Utils::getS3Client();
            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');

            if ($type === 'canvas') {
                $stmt = $db->prepare("SELECT id, uuid FROM canvases WHERE (uuid = :id OR id = :id) AND owner_id = :uid");
                $stmt->execute([':id' => $id, ':uid' => $userId]);
                $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$canvas) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }
                $canvasId   = $canvas['id'];
                $canvasUuid = $canvas['uuid'];

                // 1. Limpiar objetos en S3
                try {
                    $s3->deleteObject(['Bucket' => $bucket, 'Key' => "thumbnails/canvas_{$canvasUuid}.webp"]);
                    $s3->deleteObject(['Bucket' => $bucket, 'Key' => "active_snapshots/canvas_{$canvasId}.bin"]);
                } catch (\Throwable $s3Err) {}

                // 2. Eliminar de MySQL (cascada limpia datos relacionales)
                $stmtDel = $db->prepare("DELETE FROM canvases WHERE id = :id");
                $stmtDel->execute([':id' => $canvasId]);

                // 3. Limpiar Redis
                try {
                    $redis = (new RedisCache())->getClient();
                    $redis->del("canvas:{$canvasId}:state");
                    $redis->del("canvas:{$canvasId}:stream");
                } catch (\Throwable $rErr) {}

                return ['success' => true, 'message' => __('msg_canvas_deleted_permanently')];

            } elseif ($type === 'template') {
                $stmt = $db->prepare("SELECT id, file_path, file_size FROM user_templates WHERE id = :id AND user_id = :uid");
                $stmt->execute([':id' => (int)$id, ':uid' => $userId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$template) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }

                // 1. Borrar archivo de S3
                try {
                    $s3->deleteObject(['Bucket' => $bucket, 'Key' => ltrim($template['file_path'], '/')]);
                } catch (\Throwable $s3Err) {}

                // 2. Descontar cuota de almacenamiento
                if (!empty($template['file_size'])) {
                    try {
                        $identityDb   = (new DatabaseManager())->getConnection(DB::CONN_IDENTITY);
                        $stmtStorage  = $identityDb->prepare("UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?");
                        $stmtStorage->execute([(int)$template['file_size'], $userId]);
                    } catch (\Throwable $stErr) {}
                }

                // 3. Borrar de MySQL
                $stmtDel = $db->prepare("DELETE FROM user_templates WHERE id = :id");
                $stmtDel->execute([':id' => (int)$id]);

                return ['success' => true, 'message' => __('msg_template_deleted_permanently')];
            }

            return ['success' => false, 'message' => __('err_invalid_type')];
        } catch (Exception $e) {
            Logger::error('Error deleting permanently from trash: ' . $e->getMessage());
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function emptyUserTrash(int $userId): array {
        try {
            $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);

            // Lienzos en papelera
            $stmtC = $db->prepare("SELECT id FROM canvases WHERE owner_id = :uid AND deleted_at IS NOT NULL");
            $stmtC->execute([':uid' => $userId]);
            foreach ($stmtC->fetchAll(PDO::FETCH_ASSOC) as $c) {
                $this->deletePermanently($userId, 'canvas', (string)$c['id']);
            }

            // Plantillas en papelera
            $stmtT = $db->prepare("SELECT id FROM user_templates WHERE user_id = :uid AND deleted_at IS NOT NULL");
            $stmtT->execute([':uid' => $userId]);
            foreach ($stmtT->fetchAll(PDO::FETCH_ASSOC) as $t) {
                $this->deletePermanently($userId, 'template', (string)$t['id']);
            }

            return ['success' => true, 'message' => __('msg_trash_emptied')];
        } catch (Exception $e) {
            Logger::error('Error emptying user trash: ' . $e->getMessage());
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
