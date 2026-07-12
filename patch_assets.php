<?php

// 1. CanvasAssetService.php
$content = file_get_contents('api/services/Canvas/CanvasAssetService.php');

$searchUpload = <<<EOT
            \$dbPath = 'public/storage/templates/' . \$fileName;
            
            \$templateId = \$this->canvasRepository->saveTemplateMetadata(\$userId, \$dbPath);

            return [
                'success' => true,
                'message' => __('msg_template_uploaded'),
                'data' => [
                    'id' => \$templateId,
                    'url' => "/" . \$dbPath
                ]
            ];
EOT;
$replaceUpload = <<<EOT
            \$dbPath = 'templates/' . \$fileName;
            
            \$templateId = \$this->canvasRepository->saveTemplateMetadata(\$userId, \$dbPath);

            return [
                'success' => true,
                'message' => __('msg_template_uploaded'),
                'data' => [
                    'id' => \$templateId,
                    'url' => \App\Core\Helpers\Utils::getS3PublicUrl(\$dbPath)
                ]
            ];
EOT;
$content = str_replace($searchUpload, $replaceUpload, $content);

$searchGet = <<<EOT
    public function getUserTemplates(int \$userId): array {
        try {
            \$templates = \$this->canvasRepository->getUserTemplates(\$userId);
            return ['success' => true, 'data' => \$templates];
EOT;
$replaceGet = <<<EOT
    public function getUserTemplates(int \$userId): array {
        try {
            \$templates = \$this->canvasRepository->getUserTemplates(\$userId);
            foreach (\$templates as &\$t) {
                \$t['url'] = \App\Core\Helpers\Utils::getS3PublicUrl(\$t['file_path']);
            }
            return ['success' => true, 'data' => \$templates];
EOT;
$content = str_replace($searchGet, $replaceGet, $content);

$searchDelete = <<<EOT
                    \$s3Key = str_replace('public/storage/', '', ltrim(\$filePath, '/'));
EOT;
$replaceDelete = <<<EOT
                    \$s3Key = preg_replace('#^/?public/storage/#', '', ltrim(\$filePath, '/'));
EOT;
$content = str_replace($searchDelete, $replaceDelete, $content);

file_put_contents('api/services/Canvas/CanvasAssetService.php', $content);
echo "CanvasAssetService.php patched.\n";

// 2. CanvasRepository.php
$content = file_get_contents('includes/core/Repositories/CanvasRepository.php');

$searchStorage = <<<EOT
    public function getUserStorageUsed(int \$userId): float {
        \$sql = "SELECT file_path FROM user_templates WHERE user_id = :user_id";
        \$stmt = \$this->db->prepare(\$sql);
        \$stmt->execute([':user_id' => \$userId]);
        \$paths = \$stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        
        \$totalBytes = 0;
        
        \$baseDir = dirname(__DIR__, 3); 
        
        foreach (\$paths as \$path) {
            \$cleanPath = ltrim(\$path, '/');
            \$relativePath = str_replace('public/storage/', 'storage/public/', \$cleanPath);
            \$physicalPath = \$baseDir . DIRECTORY_SEPARATOR . \$relativePath;
            
            if (!file_exists(\$physicalPath)) {
                Logger::error("getUserStorageUsed: Archivo no encontrado en la ruta física.", ['path_intentado' => \$physicalPath]);
                continue;
            }

            \$totalBytes += filesize(\$physicalPath);
        }
        
        return \$totalBytes / (1024 * 1024); 
    }
EOT;

$replaceStorage = <<<EOT
    public function getUserStorageUsed(int \$userId): float {
        \$sql = "SELECT file_path FROM user_templates WHERE user_id = :user_id";
        \$stmt = \$this->db->prepare(\$sql);
        \$stmt->execute([':user_id' => \$userId]);
        \$paths = \$stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        
        \$totalBytes = 0;
        \$s3Client = \App\Core\Helpers\Utils::getS3Client();
        \$bucket = \App\Core\Helpers\EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
        
        foreach (\$paths as \$path) {
            \$s3Key = preg_replace('#^/?public/storage/#', '', ltrim(\$path, '/'));
            try {
                \$head = \$s3Client->headObject([
                    'Bucket' => \$bucket,
                    'Key' => \$s3Key
                ]);
                \$totalBytes += (int)\$head['ContentLength'];
            } catch (\Exception \$e) {
                // Ignore missing files on S3
            }
        }
        
        return \$totalBytes / (1024 * 1024); 
    }
EOT;

$content = str_replace($searchStorage, $replaceStorage, $content);
file_put_contents('includes/core/Repositories/CanvasRepository.php', $content);
echo "CanvasRepository.php patched.\n";

