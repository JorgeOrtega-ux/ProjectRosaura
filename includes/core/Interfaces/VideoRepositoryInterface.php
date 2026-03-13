<?php
// includes/core/Interfaces/VideoRepositoryInterface.php

namespace App\Core\Interfaces;

interface VideoRepositoryInterface {
    public function create(int $userId, string $uuid, string $originalFilename, string $tempFilePath, string $originalLanguage = 'es-419'): int;
    public function updateStatus(int $videoId, string $status, int $progress = 0): bool;
    public function updateMetadata(int $videoId, array $data): bool;
    
    public function getActiveUploadsByUserId(int $userId): array;
    public function getAllByUserId(int $userId): array;
    
    public function findById(int $id);
    public function findByUuid(string $uuid);
    public function delete(int $id): bool;
    
    public function countProcessingUploads(int $userId): int;
    public function countDailyUploads(int $userId): int;

    // --- METODO AÑADIDO PARA OBTENER EL FEED POR ORIENTACIÓN ---
    public function getPublicFeed(int $limit = 20, int $offset = 0, string $orientation = 'horizontal'): array;

    // --- METODO AÑADIDO PARA OBTENER LOS VIDEOS PÚBLICOS DEL CANAL ---
    public function getChannelVideos(int $userId, string $orientation = 'horizontal'): array;

    // --- OBTENER DETALLES COMPLETOS DE UN VIDEO PÚBLICO ---
    public function getPublicVideoDetails(string $uuid): ?array;

    // --- MÉTODOS PARA SISTEMA DE TAGS ---
    public function syncTags(int $videoId, array $tags): bool;
    public function getVideoTags(int $videoId): array;

    // --- INTERACCIONES (LIKES / DISLIKES) ---
    public function toggleInteraction(int $userId, int $videoId, string $type): array;
    public function getUserInteraction(int $userId, int $videoId): ?string;

    // --- NUEVO: SISTEMA DE RETENCIÓN (HEATMAP) ---
    public function getRetentionData(int $videoId): ?array;
    public function updateRetentionData(int $videoId, array $jsonData): bool;

    // --- NUEVO: SISTEMA DE VIDEOS GUARDADOS ---
    public function isVideoSaved(int $userId, int $videoId): bool;
    
    // --- NUEVO: VERIFICACIÓN DE COMENTARIOS ---
    public function commentsAllowed(int $videoId): bool;
}
?>