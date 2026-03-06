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

    // Listas blancas de seguridad
    private $allowedVideoMimes = [
        'video/mp4',
        'video/webm',
        'video/x-matroska', // mkv
        'video/quicktime',  // mov
        'video/x-msvideo',  // avi
        'video/mpeg',
        'application/mp4'   // En ocasiones algunos MP4 se leen así parcialmente
    ];

    private $allowedVideoExtensions = [
        'mp4', 'webm', 'mkv', 'mov', 'avi', 'mpeg', 'mpg'
    ];

    public function __construct(VideoRepositoryInterface $videoRepo, RedisClient $redis) {
        $this->videoRepo = $videoRepo;
        $this->redis = $redis;
        
        if (!is_dir($this->tempVideoDir)) mkdir($this->tempVideoDir, 0755, true);
        if (!is_dir($this->thumbnailDir)) mkdir($this->thumbnailDir, 0755, true);
    }

    private function checkLimits(int $userId, string $role) {
        $maxActive = in_array($role, ['founder', 'administrator']) ? 3 : 1;
        $maxDaily = in_array($role, ['founder', 'administrator']) ? 100 : 25;

        // Comprobar limite de procesos activos (cola o procesando)
        $activeUploads = $this->videoRepo->countProcessingUploads($userId);
        if ($activeUploads >= $maxActive) {
            throw new Exception("Has alcanzado el límite máximo de videos en proceso simultáneamente ($maxActive). Espera a que terminen de procesarse.");
        }

        // Comprobar límite de subidas al día
        $dailyUploads = $this->videoRepo->countDailyUploads($userId);
        if ($dailyUploads >= $maxDaily) {
            throw new Exception("Has alcanzado el límite de subida diario ($maxDaily videos).");
        }
    }

    private function checkFileSize(string $role, int $newBytes, ?string $existingFilePath = null) {
        // Limites: 50GB o 25GB calculados en bytes
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

    /**
     * Valida los Magic Bytes del archivo para asegurar que sea un video real
     */
    private function validateVideoMimeType(string $filePath): void {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        if (!in_array($mime, $this->allowedVideoMimes)) {
            throw new Exception("Por seguridad, el formato del archivo fue rechazado. Tipo detectado: " . $mime);
        }
    }

    /**
     * Valida que la extensión sea explícitamente segura y corresponda a video
     */
    private function validateVideoExtension(string $filename): string {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedVideoExtensions)) {
            throw new Exception("La extensión del archivo (.$extension) no está permitida.");
        }
        return $extension;
    }

    // Método para validar todo ANTES de que el usuario envíe 1 solo byte de archivo.
    public function validatePreUpload(int $userId, string $role, int $totalSize): void {
        $this->checkLimits($userId, $role);
        $this->checkFileSize($role, $totalSize, null);
    }

    public function queueVideoUpload(int $userId, string $role, array $file): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir el archivo.");
        }

        // Aplicamos validaciones de seguridad de subida
        $this->checkLimits($userId, $role);
        $this->checkFileSize($role, $file['size']);

        // NUEVO: Validación estricta de MIME Type mediante Magic Bytes
        $this->validateVideoMimeType($file['tmp_name']);

        $originalFilename = basename($file['name']);
        
        // NUEVO: Validación de lista blanca de extensión para evitar inyección de .php, .sh, etc.
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

    // Aceptamos $totalSize para frenarlo en el primer chunk si evade el front
    public function handleChunkUpload(int $userId, string $role, array $file, string $uploadId, int $chunkIndex, int $totalChunks, string $originalFilename, ?int $totalSize = null): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error al subir el fragmento.");
        }

        // Validación extra: si es el primer fragmento y el cliente mandó el total size, abortamos de inmediato.
        if ($chunkIndex === 0 && $totalSize !== null) {
            $this->checkFileSize($role, $totalSize, null);
        }

        // Validamos explícitamente la extensión del nombre original enviado en los chunks
        $extension = $this->validateVideoExtension($originalFilename);

        // Verificamos si se pueden subir mas videos antes de procesar el fragmento
        $this->checkLimits($userId, $role);

        $uploadId = preg_replace('/[^a-zA-Z0-9_-]/', '', $uploadId);
        if (empty($uploadId)) throw new Exception("Upload ID inválido.");

        $tempFilePath = $this->tempVideoDir . $uploadId . '.part';

        // Verificamos el tamaño del archivo acumulado
        $this->checkFileSize($role, $file['size'], $tempFilePath);

        $chunkData = file_get_contents($file['tmp_name']);
        if ($chunkData === false || file_put_contents($tempFilePath, $chunkData, FILE_APPEND) === false) {
            throw new Exception("Error al escribir el fragmento en el disco.");
        }

        // NUEVO: Verificamos los Magic Bytes en el primer fragmento subido
        if ($chunkIndex === 0) {
            try {
                // Almacena suficiente del encabezado para identificar el archivo (finfo necesita leer solo los primeros bytes)
                $this->validateVideoMimeType($tempFilePath);
            } catch (Exception $e) {
                // Si el primer fragmento no es de video, abortamos y purgamos el archivo temporal
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

    public function uploadThumbnail(int $userId, int $videoId, array $file): array {
        $video = $this->videoRepo->findById($videoId);
        if (!$video || $video['user_id'] != $userId) {
            throw new Exception("Video no encontrado o no autorizado.");
        }

        // NUEVO: Validación de Magic Bytes también para la imagen
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $validImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($mime, $validImageMimes)) {
            throw new Exception("El archivo enviado no es una imagen válida o está manipulado.");
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($extension, $validExtensions)) {
            throw new Exception("Extensión de imagen inválida.");
        }

        $filename = $video['uuid'] . '_thumb.' . $extension;
        $destination = $this->thumbnailDir . $filename;
        
        $publicPath = 'storage/thumbnails/' . $filename;

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