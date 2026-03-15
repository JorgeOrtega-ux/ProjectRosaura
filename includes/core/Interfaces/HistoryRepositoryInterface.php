<?php
// includes/core/Interfaces/HistoryRepositoryInterface.php

namespace App\Core\Interfaces;

interface HistoryRepositoryInterface {
    public function getWatchHistory(int $userId, int $limit, int $offset): array;
    public function getSearchHistory(int $userId, int $limit, int $offset): array;
    public function clearWatchHistory(int $userId): bool;
    public function clearSearchHistory(int $userId): bool;
    public function removeWatchItem(int $userId, int $videoId): bool;
    public function removeSearchItem(int $userId, int $searchId): bool;
    
    // --- NUEVO MÉTODO PARA TELEMETRÍA (TOP CATEGORÍAS DEL USUARIO) ---
    public function getUserTopCategories(int $userId, int $limit = 5): array;
}
?>