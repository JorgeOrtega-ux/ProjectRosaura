<?php

namespace App\Core\Interfaces;

interface MonetizationRepositoryInterface {
    public function getConfig(): array;
    public function updateConfig(array $data): bool;
    public function resetConfig(): bool;

    public function getCampaigns(?string $search = null, ?string $placement = null, int $page = 1, int $perPage = 20): array;
    public function getCampaignByUuid(string $uuid): ?array;
    public function saveCampaign(array $data): array;
    public function toggleCampaignActive(string $uuid): bool;
    public function deleteCampaign(string $uuid): bool;
    public function getActiveCampaigns(): array;
}
