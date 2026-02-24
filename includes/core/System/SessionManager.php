<?php
// includes/core/SessionManager.php

namespace App\Core;

use App\Core\Interfaces\SessionManagerInterface;

class SessionManager implements SessionManagerInterface {
    
    public function __construct() {
        $this->start();
    }

    public function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function set(string $key, $value): void {
        $_SESSION[$key] = $value;
    }

    public function get(string $key, $default = null) {
        return $_SESSION[$key] ?? $default;
    }

    public function has(string $key): bool {
        return isset($_SESSION[$key]);
    }

    public function remove(string $key): void {
        unset($_SESSION[$key]);
    }

    public function destroy(): void {
        $this->start();
        session_unset();
        session_destroy();
    }

    public function regenerate(bool $deleteOldSession = true): bool {
        return session_regenerate_id($deleteOldSession);
    }
}
?>