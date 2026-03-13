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
    public function getPlaylistWithVideosByUuid(string $uuid): ?array;
    public function getPlaylistVideosOrdered(string $uuid): array;
    
    // --- NUEVAS FIRMAS PARA EL SISTEMA "GUARDAR EN PLAYLIST" ---
    public function getUserPlaylistsWithVideoStatus(int $userId, int $videoId): array;
    public function addVideoToPlaylist(int $playlistId, int $videoId): bool;
    public function removeVideoFromPlaylist(int $playlistId, int $videoId): bool;
    public function isVideoInPlaylist(int $playlistId, int $videoId): bool;
    public function getByUuidAndUserId(string $uuid, int $userId): ?array;
}
?>