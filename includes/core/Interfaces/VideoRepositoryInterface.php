<?php
// includes/core/Interfaces/VideoRepositoryInterface.php

namespace App\Core\Interfaces;

interface VideoRepositoryInterface {
    public function create(int $userId, string $uuid, string $originalFilename, string $tempFilePath): int;
    public function updateStatus(int $videoId, string $status, int $progress = 0): bool;
    public function updateMetadata(int $videoId, array $data): bool;
    public function getActiveUploadsByUserId(int $userId): array;
    public function findById(int $id);
    public function findByUuid(string $uuid);
    public function delete(int $id): bool;
}
?>