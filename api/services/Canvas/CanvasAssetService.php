<?php

namespace App\Api\Services\Canvas;

use Exception;
use DateTime;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Core\System\SubscriptionPlanConstants; 
use App\Config\Database\RedisCache;
use App\Config\Database\DatabaseManager;
use PDO;

class CanvasAssetService {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
}

    public function uploadTemplate(int $userId, array $fileInfo): array {
        try {
            if (!isset($fileInfo['error']) || is_array($fileInfo['error']) || $fileInfo['error'] !== UPLOAD_ERR_OK) {
                return ['success' => false, 'message' => __('err_file_upload')];
            }
            
            $maxSize = 5 * 1024 * 1024;
            if ($fileInfo['size'] > $maxSize) {
                return ['success' => false, 'message' => __('err_file_too_large')];
            }

            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $ext = $finfo->file($fileInfo['tmp_name']);
            $allowedTypes = [
                'jpg' => 'image/jpeg',
                'png' => 'image/png',
                'webp' => 'image/webp'
            ];
            
            $extension = array_search($ext, $allowedTypes, true);
            if ($extension === false) {
                return ['success' => false, 'message' => __('err_invalid_image_format')];
            }

            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            
            if ($planLimits['max_storage_mb'] !== -1) {
                $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
                $newFileMB = $fileInfo['size'] / (1024 * 1024);
                
                if (($currentStorageMB + $newFileMB) > $planLimits['max_storage_mb']) {
                    return ['success' => false, 'message' => __('err_storage_limit_exceeded')];
                }
            }

            $uploadDir = dirname(__DIR__, 3) . '/storage/public/templates/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $fileName = sprintf('%s_%s.%s', $userId, Utils::generateUUID(), $extension);
            $destination = $uploadDir . $fileName;

            if (!move_uploaded_file($fileInfo['tmp_name'], $destination)) {
                Logger::error('Fallo al mover el archivo de plantilla al File System.', ['user_id' => $userId]);
                return ['success' => false, 'message' => __('err_file_write')];
            }

            $dbPath = 'public/storage/templates/' . $fileName;
            
            $templateId = $this->canvasRepository->saveTemplateMetadata($userId, $dbPath);

            return [
                'success' => true,
                'message' => __('msg_template_uploaded'),
                'data' => [
                    'id' => $templateId,
                    'url' => "/" . $dbPath
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error uploadTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getUserTemplates(int $userId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            return ['success' => true, 'data' => $templates];
        } catch (Exception $e) {
            Logger::error('Error getUserTemplates.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteTemplate(int $userId, int $templateId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            $filePath = null;
            
            foreach($templates as $t) {
                if ((int)$t['id'] === $templateId) {
                    $filePath = $t['file_path'];
                    break;
                }
            }

            $deleted = $this->canvasRepository->deleteTemplate($templateId, $userId);
            
            if ($deleted) {
                if ($filePath) {
                    $physicalPath = dirname(__DIR__, 3) . '/' . str_replace('public/storage/', 'storage/public/', ltrim($filePath, '/'));
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath); 
                    }
                }
                return ['success' => true, 'message' => __('msg_template_deleted')];
            }
            return ['success' => false, 'message' => __('err_template_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleteTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getCustomPalettes(int $userId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("SELECT id, palette_key, name, colors FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            
            $palettes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($palettes as &$p) {
                $p['colors'] = json_decode($p['colors'], true);
            }

            return ['success' => true, 'data' => $palettes];
        } catch (Exception $e) {
            Logger::error('Error getCustomPalettes.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_get_palettes_failed')];
        }
    }

    public function createCustomPalette(int $userId, string $name, array $colors): array {
        try {
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            if (!SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                return ['success' => false, 'message' => __('err_plan_custom_palettes')];
            }

            $validColors = [];
            foreach ($colors as $c) {
                if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $c)) {
                    $validColors[] = strtoupper($c);
                }
            }
            if (count($validColors) < 4) {
                return ['success' => false, 'message' => __('err_palette_min_colors')];
            }
            $validColors = array_slice($validColors, 0, 36);

            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            $count = (int)$stmt->fetchColumn();

            if ($count >= 5) {
                return ['success' => false, 'message' => __('err_max_custom_palettes')];
            }

            $paletteKey = 'custom_' . $userId . '_' . Utils::generateUUID();

            $stmt = $pdo->prepare("INSERT INTO custom_palettes (user_id, palette_key, name, colors) VALUES (:user_id, :palette_key, :name, :colors)");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey,
                ':name' => $name,
                ':colors' => json_encode($validColors)
            ]);

            return ['success' => true, 'message' => __('msg_palette_created'), 'data' => ['palette_key' => $paletteKey]];
        } catch (Exception $e) {
            Logger::error('Error createCustomPalette.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_palette_create_failed')];
        }
    }

    public function deleteCustomPalette(int $userId, string $paletteKey): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("DELETE FROM custom_palettes WHERE user_id = :user_id AND palette_key = :palette_key");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey
            ]);

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => __('msg_palette_deleted')];
            }
            return ['success' => false, 'message' => __('err_palette_not_found')];
        } catch (Exception $e) {
            Logger::error('Error deleteCustomPalette.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_palette_delete_failed')];
        }
    }

    public function toggleFavorite(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $result = $this->canvasRepository->toggleFavorite($userId, $canvasId);

            return [
                'success' => true, 
                'message' => __('msg_favorites_updated'),
                'data' => [
                    'action' => $result['action'],
                    'favorites_count' => $result['favorites_count']
                ]
            ];
            
        } catch (Exception $e) {
            Logger::error('Error toggling favorite.', [
                'user_id' => $userId, 
                'canvas_id' => $canvasId, 
                'error' => $e->getMessage()
            ]);
            
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
