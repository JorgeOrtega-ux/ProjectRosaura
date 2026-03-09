<?php
// includes/core/Interfaces/PlaylistRepositoryInterface.php

namespace App\Core\Interfaces;

interface PlaylistRepositoryInterface {
    public function create(int $userId, string $uuid, string $title, ?string $description, string $visibility, string $videoOrder): int;
    public function getAllByUserId(int $userId): array;
}
?>