<?php

namespace App\Core\Interfaces;

interface ServerConfigRepositoryInterface {
    public function getConfig(): array;
    public function updateConfig(array $data): bool;
}
?>