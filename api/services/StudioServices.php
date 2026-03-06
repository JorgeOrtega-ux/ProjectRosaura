<?php
// api/services/StudioServices.php

namespace App\Api\Services;

use App\Core\Interfaces\VideoRepositoryInterface;
use Predis\Client as RedisClient;
use Exception;

class StudioServices {
    private $videoRepo;
    private $redis;
    
    // Rutas de almacenamiento local temporal (asegúrate de crear estas carpetas)
    private $tempVideoDir = __DIR__ . '/../../storage/temp_videos/';
    private $thumbnailDir = __DIR__ . '/../../public/storage/thumbnails/';

    public function __construct(VideoRepositoryInterface $videoRepo, RedisClient $redis) {
        $this->videoRepo = $videoRepo;
        $this->redis = $redis;
        
        // Crear directorios si no existen
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

        // Movemos el archivo a la carpeta temporal
        if (!move_uploaded_file($file['tmp_name'], $tempFilePath)) {
            throw new Exception("No se pudo guardar el archivo de video temporal.");
        }

        // 1. Guardar en Base de Datos (Estado inicial: queued)
        $videoId = $this->videoRepo->create($userId, $uuid, $originalFilename, $tempFilePath);

        // 2. Avisar a Redis (Meter a la cola)
        $jobData = json_encode([
            'video_id' => $videoId,
            'user_id' => $userId,
            'uuid' => $uuid,
            'file_path' => $tempFilePath
        ]);
        
        // Usamos lpush o rpush para que Python lo lea con blpop
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
        $publicPath = '/storage/thumbnails/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception("No se pudo guardar la miniatura.");
        }

        $this->videoRepo->updateMetadata($videoId, ['thumbnail_path' => $publicPath]);
        return ['thumbnail_path' => $publicPath];
    }

    public function updateVideoTitle(int $userId, int $videoId, string $title): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        if (trim($title) === '') {
            throw new Exception("El título no puede estar vacío.");
        }

        $this->videoRepo->updateMetadata($videoId, ['title' => trim($title)]);
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
            throw new Exception("El video debe estar completamente procesado para publicarse.");
        }
        
        if (empty($video['title']) || empty($video['thumbnail_path'])) {
            throw new Exception("Falta título o miniatura.");
        }
        
        $this->videoRepo->updateStatus($videoId, 'published', 100);
        return ['success' => true, 'status' => 'published'];
    }
}
?>