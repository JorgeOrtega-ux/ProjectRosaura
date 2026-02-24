<?php
// includes/core/RateLimiter.php

namespace App\Core;

use PDO;

class RateLimiter {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function check($action, $maxAttempts, $lockoutMinutes, $customMsg = null) {
        $ip = Utils::getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit && $limit['blocked_until'] && strtotime($limit['blocked_until']) > time()) {
            $remainingMinutes = ceil((strtotime($limit['blocked_until']) - time()) / 60);
            $msg = $customMsg ? str_replace('{minutes}', $remainingMinutes, $customMsg) : "Demasiados intentos. Por seguridad, por favor espera {$remainingMinutes} minutos e inténtalo de nuevo.";
            return ['allowed' => false, 'message' => $msg];
        }
        return ['allowed' => true];
    }

    public function record($action, $maxAttempts, $lockoutMinutes) {
        $ip = Utils::getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            $attempts = ($limit['blocked_until'] && strtotime($limit['blocked_until']) <= time()) ? 1 : $limit['attempts'] + 1;
            $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $updateStmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE ip_address = ? AND action = ?");
            $updateStmt->execute([$attempts, $blockedUntil, $ip, $action]);
        } else {
            $blockedUntil = (1 >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $insertStmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, blocked_until) VALUES (?, ?, ?, ?)");
            $insertStmt->execute([$ip, $action, 1, $blockedUntil]);
        }
    }

    public function clear($action) {
        $ip = Utils::getIpAddress();
        $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
    }
}
?>