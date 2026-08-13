<?php

namespace App\Core\Interfaces;

interface SupportRepositoryInterface {
    public function createTicket(array $data): string;
    public function findByUuid(string $uuid): ?array;
    public function getTicketsByUser(int $userId, int $limit = 20, int $offset = 0): array;
}
