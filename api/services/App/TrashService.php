<?php
namespace App\Api\Services\App;

use Exception;
use PDO;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Config\Search\TypesenseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\Logger;
use App\Core\Helpers\Utils;
use App\Core\System\SubscriptionPlanConstants;
use App\Core\System\CacheConstants;
use App\Core\System\CacheInvalidator;
use App\Core\Repositories\CanvasRepository;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\RoleRepository;
use App\Api\Services\Canvas\CanvasLockManager;

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
            $identityDb = (new DatabaseManager())->getConnection(DB::CONN_IDENTITY);
            $redisCache = new RedisCache();
            $typesenseManager = new TypesenseManager();
            $canvasRepo = new CanvasRepository(new DatabaseManager(), $typesenseManager, $redisCache);
            $cacheInvalidator = new CacheInvalidator($redisCache->getClient());

            // Consultar nivel de suscripción y límites del usuario
            $stmtUser = $identityDb->prepare("SELECT subscription_tier FROM users WHERE id = ? LIMIT 1");
            $stmtUser->execute([$userId]);
            $tier = (int)$stmtUser->fetchColumn();
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

            if ($type === 'canvas') {
                $stmt = $db->prepare("SELECT id, uuid, name, size, privacy, owner_id FROM canvases WHERE (uuid = :id OR id = :id) AND owner_id = :uid AND deleted_at IS NOT NULL LIMIT 1");
                $stmt->execute([':id' => $id, ':uid' => $userId]);
                $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$canvas) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }

                $canvasId = (int)$canvas['id'];

                // 1. Validar límite de lienzos activos del plan
                $currentCanvasCount = $canvasRepo->countUserCanvases($userId);
                if ($planLimits['max_canvases'] !== -1 && $currentCanvasCount >= $planLimits['max_canvases']) {
                    return [
                        'success' => false,
                        'message' => __('err_canvas_limit_reached') . ' (' . $planLimits['name'] . ').',
                        'error_code' => 'LIMIT_EXCEEDED'
                    ];
                }

                // 2. Validar compatibilidad de tamaño de lienzo con el nivel del usuario
                $allSizes = Utils::getCanvasSizes();
                $canvasSize = $canvas['size'] ?? '64x64';
                $requiredTier = $allSizes[$canvasSize]['tier'] ?? 0;
                if ($tier < $requiredTier) {
                    return [
                        'success' => false,
                        'message' => __('err_plan_canvas_size'),
                        'error_code' => 'UPGRADE_REQUIRED'
                    ];
                }

                // 3. Validar límite de lienzos Tier 3 (Ultra 4096)
                if ($requiredTier >= 3) {
                    $tier3Count = $canvasRepo->countUserTierCanvases($userId, 3);
                    if ($tier3Count >= 3) {
                        return [
                            'success' => false,
                            'message' => __('err_canvas_tier3_limit_reached'),
                            'error_code' => 'TIER3_LIMIT_EXCEEDED'
                        ];
                    }
                }

                // 4. Restaurar lienzo
                $stmtRest = $db->prepare("UPDATE canvases SET deleted_at = NULL WHERE id = :cid AND owner_id = :uid");
                $stmtRest->execute([':cid' => $canvasId, ':uid' => $userId]);

                // 5. Invalidar cachés
                $cacheInvalidator->canvas($canvasId);
                $cacheInvalidator->userCanvasList($userId);
                try {
                    $redisClient = $redisCache->getClient();
                    if ($redisClient) {
                        $redisClient->del(CacheConstants::PREFIX_CANVAS_COUNT . $userId);
                    }
                } catch (\Throwable $rErr) {}

                // 6. Sincronizar en Typesense
                try {
                    $client = $typesenseManager->getClient();
                    if ($client) {
                        $client->collections['canvases']->documents->upsert([
                            'id'         => (string)$canvasId,
                            'uuid'       => $canvas['uuid'],
                            'name'       => $canvas['name'],
                            'owner_id'   => (int)$userId,
                            'privacy'    => $canvas['privacy'] ?? 'private',
                            'created_at' => time()
                        ]);
                    }
                } catch (\Throwable $tsE) {}

                // 7. Evaluar bloqueo de lienzos
                try {
                    $userRepo = new UserRepository(new DatabaseManager(), new RoleRepository(new DatabaseManager(), $redisCache));
                    $lockManager = new CanvasLockManager($canvasRepo, $userRepo, new DatabaseManager(), $redisCache);
                    $lockManager->evaluateUserCanvases($userId);
                } catch (\Throwable $lmE) {}

                return ['success' => true, 'message' => __('msg_canvas_restored')];

            } elseif ($type === 'template') {
                $stmt = $db->prepare("SELECT id, file_path, file_size FROM user_templates WHERE id = :id AND user_id = :uid AND deleted_at IS NOT NULL LIMIT 1");
                $stmt->execute([':id' => (int)$id, ':uid' => $userId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$template) {
                    return ['success' => false, 'message' => __('err_item_not_found_trash')];
                }

                $templateId = (int)$template['id'];
                $fileSize = (int)($template['file_size'] ?? 0);

                // 1. Validar cuota de almacenamiento disponible
                if ($planLimits['max_storage_mb'] !== -1) {
                    $currentStorageMB = $canvasRepo->getUserStorageUsed($userId);
                    $templateSizeMB = $fileSize / (1024 * 1024);
                    if (($currentStorageMB + $templateSizeMB) > $planLimits['max_storage_mb']) {
                        return [
                            'success' => false,
                            'message' => __('err_storage_limit_exceeded'),
                            'error_code' => 'STORAGE_EXCEEDED'
                        ];
                    }
                }

                // 2. Restaurar plantilla
                $stmtRest = $db->prepare("UPDATE user_templates SET deleted_at = NULL WHERE id = :tid AND user_id = :uid");
                $stmtRest->execute([':tid' => $templateId, ':uid' => $userId]);

                // 3. Volver a sumar el tamaño al almacenamiento usado
                if ($fileSize > 0) {
                    try {
                        $stmtStorage = $identityDb->prepare("UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?");
                        $stmtStorage->execute([$fileSize, $userId]);
                        $cacheInvalidator->userStorage($userId);
                    } catch (\Throwable $stErr) {}
                }

                return ['success' => true, 'message' => __('msg_template_restored')];
            }

            return ['success' => false, 'message' => __('err_invalid_type')];
        } catch (Exception $e) {
            Logger::error('Error restoring trash item: ' . $e->getMessage(), ['user_id' => $userId, 'type' => $type, 'id' => $id]);
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

                // 2. Borrar de MySQL
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
