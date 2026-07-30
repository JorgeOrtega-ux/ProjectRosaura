<?php

namespace App\Api\Services\Canvas;

use Exception;
use DateTime;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\PaletteRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\Helpers\EnvLoader;
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
    private $paletteRepository;

    public function __construct(
        CanvasRepositoryInterface $canvasRepository, 
        UserRepositoryInterface $userRepository,
        PaletteRepositoryInterface $paletteRepository
    ) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
        $this->paletteRepository = $paletteRepository;
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

            $fileName = sprintf('%s_%s.%s', $userId, Utils::generateUUID(), $extension);
            
            $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = Utils::getS3Client();
            try {
                $s3Client->putObject([
                    'Bucket' => $bucket,
                    'Key'    => 'templates/' . $fileName,
                    'SourceFile' => $fileInfo['tmp_name'],
                    'ContentType' => $allowedTypes[$extension]
                ]);
            } catch (Exception $e) {
                Logger::error('Failed to upload template file to S3.', ['user_id' => $userId, 'error' => $e->getMessage()]);
                return ['success' => false, 'message' => __('err_file_write')];
            }

            $dbPath = 'public/storage/templates/' . $fileName;
            
            $templateId = $this->canvasRepository->saveTemplateMetadata($userId, $dbPath, $fileInfo['size']);

            return [
                'success' => true,
                'message' => __('msg_template_uploaded'),
                'data' => [
                    'id' => $templateId,
                    'url' => Utils::getS3PublicUrl($dbPath)
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error uploadTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function listTemplates(?int $userId = null): array {
        return $this->getUserTemplates($userId ?? 0);
    }

    public function getUserTemplates(int $userId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            if (is_array($templates)) {
                foreach ($templates as &$t) {
                    if (!empty($t['file_path'])) {
                        $t['file_path'] = Utils::getS3PublicUrl($t['file_path']);
                    }
                }
            }
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
                    $s3Key = preg_replace('#^/?public/storage/#', '', ltrim($filePath, '/'));
                    $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                    $s3Client = Utils::getS3Client();
                    try {
                        $s3Client->deleteObject([
                            'Bucket' => $bucket,
                            'Key'    => ltrim($s3Key, '/')
                        ]);
                    } catch (Exception $e) {
                        Logger::error('Failed to delete template file from S3.', ['user_id' => $userId, 'error' => $e->getMessage()]);
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
            $palettes = $this->paletteRepository->getCustomPalettes($userId);
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

            $count = $this->paletteRepository->countCustomPalettes($userId);

            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            $maxPalettes = $planLimits['max_custom_palettes'] ?? 0;

            if ($maxPalettes !== -1 && $count >= $maxPalettes) {
                return ['success' => false, 'message' => __('err_max_custom_palettes')];
            }

            $paletteKey = 'custom_' . $userId . '_' . Utils::generateUUID();

            $success = $this->paletteRepository->createCustomPalette($userId, $paletteKey, $name, $validColors);
            if ($success) {
                return ['success' => true, 'message' => __('msg_palette_created'), 'data' => ['palette_key' => $paletteKey]];
            }

            return ['success' => false, 'message' => __('err_palette_create_failed')];
        } catch (Exception $e) {
            Logger::error('Error createCustomPalette.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_palette_create_failed')];
        }
    }

    public function deleteCustomPalette(int $userId, string $paletteKey): array {
        try {
            $success = $this->paletteRepository->deleteCustomPalette($userId, $paletteKey);
            if ($success) {
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
