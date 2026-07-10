<?php

namespace App\Core\Interfaces;

interface MiddlewareInterface {
    public function handle(array $input, array $params = []): bool;
}
?>