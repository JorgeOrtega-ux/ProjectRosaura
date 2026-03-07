<?php
// api/services/StudioServices.php

namespace App\Api\Services;

use App\Core\Interfaces\VideoRepositoryInterface;
use App\Core\Interfaces\TagRepositoryInterface;
use Predis\Client as RedisClient;
use Exception;

class StudioServices {
    private $videoRepo;
    private $tagRepo;
    private $redis;
    
    private $tempVideoDir = __DIR__ . '/../../storage/temp_videos/';
    private $thumbnailDir = __DIR__ . '/../../public/storage/thumbnails/';

    private $allowedVideoMimes = [
        'video/mp4',
        'video/webm',
        'video/x-matroska', 
        'video/quicktime',  
        'video/x-msvideo',  
        'video/mpeg',
        'application/mp4'   
    ];

    private $allowedVideoExtensions = [
        'mp4', 'webm', 'mkv', 'mov', 'avi', 'mpeg', 'mpg'
    ];

    public function __construct(VideoRepositoryInterface $videoRepo, TagRepositoryInterface $tagRepo, RedisClient $redis) {
        $this->videoRepo = $videoRepo;
        $this->tagRepo = $tagRepo;
        $this->redis = $redis;
        
        if (!is_dir($this->tempVideoDir)) mkdir($this->tempVideoDir, 0755, true);
        if (!is_dir($this->thumbnailDir)) mkdir($this->thumbnailDir, 0755, true);
    }

    public function getTagsByType(string $type): array {
        return $this->tagRepo->getByType($type);
    }

    private function checkLimits(int $userId, string $role) {
        $maxActive = in_array($role, ['founder', 'administrator']) ? 3 : 1;
        $maxDaily = in_array($role, ['founder', 'administrator']) ? 100 : 25;

        $activeUploads = $this->videoRepo->countProcessingUploads($userId);
        if ($activeUploads >= $maxActive) {
            throw new Exception("Has alcanzado el límite máximo de videos en proceso simultáneamente ($maxActive). Espera a que terminen de procesarse.");
        }

        $dailyUploads = $this->videoRepo->countDailyUploads($userId);
        if ($dailyUploads >= $maxDaily) {
            throw new Exception("Has alcanzado el límite de subida diario ($maxDaily videos).");
        }
    }

    private function checkFileSize(string $role, int $newBytes, ?string $existingFilePath = null) {
        $maxSize = in_array($role, ['founder', 'administrator']) ? 50 * 1024 * 1024 * 1024 : 25 * 1024 * 1024 * 1024;
        
        $currentSize = 0;
        if ($existingFilePath && file_exists($existingFilePath)) {
            $currentSize = filesize($existingFilePath);
        }

        if (($currentSize + $newBytes) > $maxSize) {
            $gbLimit = in_array($role, ['founder', 'administrator']) ? 50 : 25;
            throw new Exception("El archivo excede el límite de tamaño permitido ($gbLimit GB).");
        }
    }

    private function validateVideoMimeType(string $filePath): void {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        if (!in_array($mime, $this->allowedVideoMimes)) {
            throw new Exception("Por seguridad, el formato del archivo fue rechazado. Tipo detectado: " . $mime);
        }
    }

    private function validateVideoExtension(string $filename): string {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedVideoExtensions)) {
            throw new Exception("La extensión del archivo (.$extension) no está permitida.");
        }
        return $extension;
    }

    public function validatePreUpload(int $userId, string $role, int $totalSize): void {
        $this->checkLimits($userId, $role);
        $this->checkFileSize($role, $totalSize, null);
    }

    public function queueVideoUpload(int $userId, string $role, array $file): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir el archivo.");
        }

        $this->checkLimits($userId, $role);
        $this->checkFileSize($role, $file['size']);
        $this->validateVideoMimeType($file['tmp_name']);

        $originalFilename = basename($file['name']);
        $extension = $this->validateVideoExtension($originalFilename);

        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        
        $tempFilename = $uuid . '.' . $extension;
        $tempFilePath = $this->tempVideoDir . $tempFilename;

        if (!move_uploaded_file($file['tmp_name'], $tempFilePath)) {
            throw new Exception("No se pudo guardar el archivo de video temporal.");
        }

        $videoId = $this->videoRepo->create($userId, $uuid, $originalFilename, $tempFilePath);
        $titleWithoutExt = pathinfo($originalFilename, PATHINFO_FILENAME);
        $this->videoRepo->updateMetadata($videoId, ['title' => $titleWithoutExt]);

        $userIdentifier = $_SESSION['user_uuid'] ?? $userId;

        $jobData = json_encode([
            'video_id' => $videoId,
            'user_id' => $userIdentifier,
            'uuid' => $uuid,
            'file_path' => $tempFilePath
        ]);
        
        $this->redis->rpush('video_processing_queue', $jobData);

        return [
            'id' => $videoId,
            'uuid' => $uuid,
            'original_filename' => $originalFilename,
            'status' => 'queued',
            'progress' => 0
        ];
    }

    public function handleChunkUpload(int $userId, string $role, array $file, string $uploadId, int $chunkIndex, int $totalChunks, string $originalFilename, ?int $totalSize = null): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir el fragmento.");
        }

        if ($chunkIndex === 0 && $totalSize !== null) {
            $this->checkFileSize($role, $totalSize, null);
        }

        $extension = $this->validateVideoExtension($originalFilename);
        $this->checkLimits($userId, $role);

        $uploadId = preg_replace('/[^a-zA-Z0-9_-]/', '', $uploadId);
        if (empty($uploadId)) throw new Exception("Upload ID inválido.");

        $tempFilePath = $this->tempVideoDir . $uploadId . '.part';

        $this->checkFileSize($role, $file['size'], $tempFilePath);

        $chunkData = file_get_contents($file['tmp_name']);
        if ($chunkData === false || file_put_contents($tempFilePath, $chunkData, FILE_APPEND) === false) {
            throw new Exception("Error al escribir el fragmento en el disco.");
        }

        if ($chunkIndex === 0) {
            try {
                $this->validateVideoMimeType($tempFilePath);
            } catch (Exception $e) {
                @unlink($tempFilePath);
                throw $e;
            }
        }

        if ($chunkIndex === $totalChunks - 1) {
            $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
            
            $finalTempName = $uuid . '.' . $extension;
            $finalTempPath = $this->tempVideoDir . $finalTempName;

            rename($tempFilePath, $finalTempPath);

            $videoId = $this->videoRepo->create($userId, $uuid, $originalFilename, $finalTempPath);
            $titleWithoutExt = pathinfo($originalFilename, PATHINFO_FILENAME);
            $this->videoRepo->updateMetadata($videoId, ['title' => $titleWithoutExt]);

            $userIdentifier = $_SESSION['user_uuid'] ?? $userId;
            $jobData = json_encode([
                'video_id' => $videoId,
                'user_id' => $userIdentifier,
                'uuid' => $uuid,
                'file_path' => $finalTempPath
            ]);
            
            $this->redis->rpush('video_processing_queue', $jobData);

            return [
                'id' => $videoId,
                'uuid' => $uuid,
                'original_filename' => $originalFilename,
                'status' => 'queued',
                'progress' => 0
            ];
        }

        return [
            'chunk_index' => $chunkIndex,
            'total_chunks' => $totalChunks,
            'status' => 'chunk_uploaded'
        ];
    }

    private function getAverageColor(string $filepath): ?string {
        $mime = mime_content_type($filepath);
        $img = null;
        
        switch ($mime) {
            case 'image/jpeg': 
                $img = @imagecreatefromjpeg($filepath); 
                break;
            case 'image/png': 
                $img = @imagecreatefrompng($filepath); 
                break;
            case 'image/webp': 
                $img = @imagecreatefromwebp($filepath); 
                break;
        }
        
        if (!$img) return null;
        
        $thumb = imagecreatetruecolor(1, 1);
        imagecopyresampled($thumb, $img, 0, 0, 0, 0, 1, 1, imagesx($img), imagesy($img));
        
        $rgb = imagecolorat($thumb, 0, 0);
        $r = ($rgb >> 16) & 0xFF;
        $g = ($rgb >> 8) & 0xFF;
        $b = $rgb & 0xFF;
        
        imagedestroy($img);
        imagedestroy($thumb);
        
        return sprintf("#%02x%02x%02x", $r, $g, $b);
    }

    public function uploadThumbnail(int $userId, int $videoId, ?array $file = null, ?string $base64 = null, ?string $generatedPath = null): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        $extension = '';
        $targetPathToValidate = '';
        $isTempFile = false;
        $isGeneratedCopy = false;

        if ($generatedPath) {
            if (!preg_match('/^\/storage\/thumbnails\/generated\/[a-f0-9\-]+\/thumb_\d+\.jpg$/', $generatedPath)) {
                throw new Exception("Ruta generada inválida o formato incorrecto.");
            }
            $realPath = __DIR__ . '/../../public' . $generatedPath;
            if (!file_exists($realPath)) {
                throw new Exception("La miniatura generada ya no existe en el servidor.");
            }
            $targetPathToValidate = $realPath;
            $extension = 'jpg';
            $isGeneratedCopy = true;
        }
        else if ($base64) {
            if (preg_match('/^data:image\/(\w+);base64,/', $base64, $type)) {
                $base64Data = substr($base64, strpos($base64, ',') + 1);
                $typeStr = strtolower($type[1]);
                
                if (!in_array($typeStr, ['jpg', 'jpeg', 'png', 'webp'])) {
                    throw new Exception('Formato de imagen base64 no soportado.');
                }
                
                $extension = $typeStr === 'jpeg' ? 'jpg' : $typeStr;
                $decodedData = base64_decode(str_replace(' ', '+', $base64Data));
                
                if ($decodedData === false) {
                    throw new Exception('Fallo al decodificar la imagen base64.');
                }
                
                $targetPathToValidate = tempnam(sys_get_temp_dir(), 'rosaura_thumb_');
                file_put_contents($targetPathToValidate, $decodedData);
                $isTempFile = true;
            } else {
                throw new Exception('Formato base64 inválido.');
            }
        } 
        else if ($file && isset($file['tmp_name'])) {
            $targetPathToValidate = $file['tmp_name'];
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        } else {
            throw new Exception("No se proporcionó ninguna imagen.");
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $targetPathToValidate);
        finfo_close($finfo);

        $validImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($mime, $validImageMimes)) {
            if ($isTempFile) @unlink($targetPathToValidate);
            throw new Exception("El archivo procesado no es una imagen válida o está corrompido.");
        }

        $validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $validExtensions)) {
            if ($isTempFile) @unlink($targetPathToValidate);
            throw new Exception("Extensión de imagen inválida (.$extension).");
        }

        $filename = $video['uuid'] . '_thumb.' . $extension;
        $destination = $this->thumbnailDir . $filename;
        $publicPath = 'storage/thumbnails/' . $filename;

        if ($isGeneratedCopy) {
            if (!copy($targetPathToValidate, $destination)) {
                throw new Exception("No se pudo copiar la miniatura generada por el worker.");
            }
        } else if ($isTempFile) {
            rename($targetPathToValidate, $destination);
        } else {
            if (!move_uploaded_file($targetPathToValidate, $destination)) {
                throw new Exception("No se pudo guardar la miniatura físicamente.");
            }
        }

        $dominantColor = $this->getAverageColor($destination);
        
        $metadata = ['thumbnail_path' => $publicPath];
        if ($dominantColor) {
            $metadata['thumbnail_dominant_color'] = $dominantColor;
        }

        $this->videoRepo->updateMetadata($videoId, $metadata);
        
        $result = ['thumbnail_path' => $publicPath];
        if ($dominantColor) {
            $result['thumbnail_dominant_color'] = $dominantColor;
        }

        return $result;
    }

    // --- HELPER PRIVADO MODIFICADO PARA PROCESAR TAGS MIXTOS ---
    private function processTags(array $tagsData, string $type): array {
        $processedTags = [];
        foreach ($tagsData as $tagItem) {
            if (is_numeric($tagItem)) {
                $processedTags[] = [
                    'id' => (int) $tagItem,
                    'type' => $type
                ];
            } else if (is_string($tagItem) && trim($tagItem) !== '') {
                $processedTags[] = [
                    'name' => trim($tagItem),
                    'type' => $type
                ];
            }
        }
        return $processedTags;
    }

    public function updateVideoDetails(int $userId, int $videoId, string $title, ?string $description = null, array $models = [], array $categories = []): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        if (trim($title) === '') {
            throw new Exception("El título no puede estar vacío.");
        }

        $metadata = ['title' => trim($title)];
        if ($description !== null) {
            $metadata['description'] = trim($description);
        }

        $this->videoRepo->updateMetadata($videoId, $metadata);

        // PROCESAMIENTO MÁGICO DE TAGS MIXTOS
        $modelsData = $this->processTags($models, 'modelo');
        $categoriesData = $this->processTags($categories, 'category');
        
        $allTags = array_merge($modelsData, $categoriesData);
        $uniqueTags = [];
        
        // Evitar duplicados
        foreach ($allTags as $t) {
            $key = isset($t['id']) ? 'id_'.$t['id'] : 'name_'.strtolower($t['name']);
            $uniqueTags[$key] = $t;
        }

        $this->videoRepo->syncTags($videoId, array_values($uniqueTags));

        return ['success' => true];
    }

    public function getActiveUploads(int $userId): array {
        return $this->videoRepo->getActiveUploadsByUserId($userId);
    }
    
    public function getAllVideos(int $userId): array {
        if (method_exists($this->videoRepo, 'getAllByUserId')) {
            return $this->videoRepo->getAllByUserId($userId);
        }
        return $this->videoRepo->getActiveUploadsByUserId($userId);
    }

    public function getVideoByUuid(int $userId, string $uuid): array {
        $videos = $this->getAllVideos($userId);
        foreach ($videos as $v) {
            if ($v['uuid'] === $uuid) {
                $v['tags'] = $this->videoRepo->getVideoTags($v['id']);
                return $v;
            }
        }
        throw new Exception("Video no encontrado.");
    }

    public function publishVideo(int $userId, int $videoId, string $title, string $description, array $models = [], array $categories = [], ?array $thumbnailFile = null, ?string $generatedPath = null): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }
        
        if ($video['status'] !== 'processed') {
            throw new Exception("El video debe estar completamente procesado para publicarse. Estado actual: " . $video['status']);
        }
        
        $newThumbnailPath = null;
        if ($thumbnailFile || $generatedPath) {
            $thumbResult = $this->uploadThumbnail($userId, $videoId, $thumbnailFile, null, $generatedPath);
            $newThumbnailPath = $thumbResult['thumbnail_path'];
        }
        
        $finalThumbnail = $newThumbnailPath ?? $video['thumbnail_path'];
        if (empty($finalThumbnail)) {
            throw new Exception("Falta la miniatura del video.");
        }

        $metadata = [
            'title' => trim($title),
            'description' => trim($description)
        ];
        
        $this->videoRepo->updateMetadata($videoId, $metadata);
        $this->videoRepo->updateStatus($videoId, 'published', 100);

        // PROCESAMIENTO MÁGICO DE TAGS MIXTOS AL PUBLICAR
        $modelsData = $this->processTags($models, 'modelo');
        $categoriesData = $this->processTags($categories, 'category');
        
        $allTags = array_merge($modelsData, $categoriesData);
        $uniqueTags = [];
        
        foreach ($allTags as $t) {
            $key = isset($t['id']) ? 'id_'.$t['id'] : 'name_'.strtolower($t['name']);
            $uniqueTags[$key] = $t;
        }

        $this->videoRepo->syncTags($videoId, array_values($uniqueTags));
        
        return ['success' => true, 'status' => 'published'];
    }

    public function cancelUpload(int $userId, int $videoId): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        $this->redis->setex('cancel_video_' . $videoId, 3600, '1');

        if (!empty($video['temp_file_path']) && file_exists($video['temp_file_path'])) {
            @unlink($video['temp_file_path']);
        }

        if (!empty($video['thumbnail_path'])) {
            $thumbnailFilename = basename($video['thumbnail_path']);
            $thumbnailFilePath = $this->thumbnailDir . $thumbnailFilename;
            if (file_exists($thumbnailFilePath)) {
                @unlink($thumbnailFilePath);
            }
        }

        $hlsDir = __DIR__ . '/../../public/storage/videos/' . $video['uuid'];
        if (is_dir($hlsDir)) {
            $this->deleteDirectory($hlsDir);
        }

        $generatedThumbsDir = __DIR__ . '/../../public/storage/thumbnails/generated/' . $video['uuid'];
        if (is_dir($generatedThumbsDir)) {
            $this->deleteDirectory($generatedThumbsDir);
        }

        $this->videoRepo->delete($videoId);

        return ['success' => true];
    }

    private function deleteDirectory(string $dir): bool {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') continue;
            if (!$this->deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }
}
?>