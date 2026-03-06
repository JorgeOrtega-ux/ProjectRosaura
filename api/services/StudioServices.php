<?php
// api/services/StudioServices.php

namespace App\Api\Services;

use App\Core\Interfaces\VideoRepositoryInterface;
use Predis\Client as RedisClient;
use Exception;

class StudioServices {
    private $videoRepo;
    private $redis;
    
    private $tempVideoDir = __DIR__ . '/../../storage/temp_videos/';
    private $thumbnailDir = __DIR__ . '/../../public/storage/thumbnails/';

    public function __construct(VideoRepositoryInterface $videoRepo, RedisClient $redis) {
        $this->videoRepo = $videoRepo;
        $this->redis = $redis;
        
        if (!is_dir($this->tempVideoDir)) mkdir($this->tempVideoDir, 0755, true);
        if (!is_dir($this->thumbnailDir)) mkdir($this->thumbnailDir, 0755, true);
    }

    public function queueVideoUpload(int $userId, array $file): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir el archivo.");
        }

        $originalFilename = basename($file['name']);
        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $tempFilename = $uuid . '.' . $extension;
        $tempFilePath = $this->tempVideoDir . $tempFilename;

        if (!move_uploaded_file($file['tmp_name'], $tempFilePath)) {
            throw new Exception("No se pudo guardar el archivo de video temporal.");
        }

        $videoId = $this->videoRepo->create($userId, $uuid, $originalFilename, $tempFilePath);

        // Se asigna automáticamente el nombre del archivo como Título base en BD
        $titleWithoutExt = pathinfo($originalFilename, PATHINFO_FILENAME);
        $this->videoRepo->updateMetadata($videoId, ['title' => $titleWithoutExt]);

        // ==========================================
        // LA SOLUCIÓN: Usar el UUID de la sesión para encolar el trabajo
        // Así Python y Javascript hablarán por el mismo canal
        // ==========================================
        $userIdentifier = $_SESSION['user_uuid'] ?? $userId;

        $jobData = json_encode([
            'video_id' => $videoId,
            'user_id' => $userIdentifier, // <-- Ahora enviamos el UUID (Ej: 3b94...)
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

    public function uploadThumbnail(int $userId, int $videoId, array $file): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $validExtensions)) {
            throw new Exception("Formato de imagen inválido.");
        }

        $filename = $video['uuid'] . '_thumb.' . $extension;
        $destination = $this->thumbnailDir . $filename;
        
        // CORRECCIÓN DEL PATH: Aseguramos la ruta con prefijo /public para que 
        // concuerde si estás sirviendo la aplicación desde la carpeta raíz.
        $publicPath = '/public/storage/thumbnails/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception("No se pudo guardar la miniatura físicamente.");
        }

        $this->videoRepo->updateMetadata($videoId, ['thumbnail_path' => $publicPath]);
        return ['thumbnail_path' => $publicPath];
    }

    public function updateVideoDetails(int $userId, int $videoId, string $title, ?string $description = null): array {
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
        return ['success' => true];
    }

    public function getActiveUploads(int $userId): array {
        return $this->videoRepo->getActiveUploadsByUserId($userId);
    }
    
    public function publishVideo(int $userId, int $videoId): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }
        
        if ($video['status'] !== 'processed') {
            throw new Exception("El video debe estar completamente procesado para publicarse. Estado actual: " . $video['status']);
        }
        
        $missing = [];
        if (empty($video['title'])) $missing[] = 'título';
        if (empty($video['thumbnail_path'])) $missing[] = 'miniatura';
        
        if (!empty($missing)) {
            throw new Exception("Faltan los siguientes datos en la DB para publicar: " . implode(' y ', $missing));
        }
        
        $this->videoRepo->updateStatus($videoId, 'published', 100);
        return ['success' => true, 'status' => 'published'];
    }

    public function cancelUpload(int $userId, int $videoId): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        // 1. Notificar inmediatamente al Worker de Python para que mate el proceso FFmpeg si está activo
        $this->redis->setex('cancel_video_' . $videoId, 3600, '1');

        // 2. Eliminar el archivo de video temporal (Si aún no se procesa)
        if (!empty($video['temp_file_path']) && file_exists($video['temp_file_path'])) {
            @unlink($video['temp_file_path']);
        }

        // 3. Eliminar la miniatura física asociada
        if (!empty($video['thumbnail_path'])) {
            $thumbnailFilename = basename($video['thumbnail_path']);
            $thumbnailFilePath = $this->thumbnailDir . $thumbnailFilename;
            if (file_exists($thumbnailFilePath)) {
                @unlink($thumbnailFilePath);
            }
        }

        // 4. Eliminar los archivos procesados HLS (si ya pasó por el worker o está pasando)
        $hlsDir = __DIR__ . '/../../public/storage/videos/' . $video['uuid'];
        if (is_dir($hlsDir)) {
            $this->deleteDirectory($hlsDir);
        }

        // 5. Eliminar el registro en Base de Datos.
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