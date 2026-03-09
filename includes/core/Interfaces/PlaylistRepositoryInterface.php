<?php
// includes/core/Interfaces/PlaylistRepositoryInterface.php

namespace App\Core\Interfaces;

interface PlaylistRepositoryInterface {
    public function create(int $userId, string $uuid, string $title, ?string $description, string $visibility, string $videoOrder): int;
    public function getAllByUserId(int $userId): array;
    public function getByIdAndUserId(int $id, int $userId): ?array;
    public function update(int $id, string $title, ?string $description, string $visibility, string $videoOrder): bool;
    public function delete(int $id): bool;
    public function getVideosByPlaylistId(int $playlistId): array;
    public function syncVideos(int $playlistId, array $videoIds): bool;
}
?>