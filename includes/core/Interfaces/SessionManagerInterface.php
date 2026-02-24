<?php
// includes/core/Interfaces/SessionManagerInterface.php

namespace App\Core\Interfaces;

interface SessionManagerInterface {
    public function start(): void;
    public function set(string $key, $value): void;
    public function get(string $key, $default = null);
    public function has(string $key): bool;
    public function remove(string $key): void;
    public function destroy(): void;
    public function regenerate(bool $deleteOldSession = true): bool;
}
?>