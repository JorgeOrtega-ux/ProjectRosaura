<?php
namespace App\Core\Interfaces;

interface PaletteRepositoryInterface {
    public function getCustomPalettes(int $userId): array;
    public function createCustomPalette(int $userId, string $paletteKey, string $name, array $colors): bool;
    public function deleteCustomPalette(int $userId, string $paletteKey): bool;
    public function countCustomPalettes(int $userId): int;
}
