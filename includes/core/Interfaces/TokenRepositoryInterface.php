<?php
// includes/core/Interfaces/TokenRepositoryInterface.php

namespace App\Core\Interfaces;

interface TokenRepositoryInterface {
    /**
     * Crea un nuevo token de sesión o remember_me.
     */
    public function createToken(int $userId, string $selector, string $hashedValidator, string $expiresAt, string $userAgent, string $ipAddress): bool;

    /**
     * Busca un token válido por su selector y verifica que el usuario asociado esté activo.
     */
    public function findValidTokenBySelectorAndUserId(string $selector, int $userId): ?array;

    /**
     * Busca un token válido solo por su selector (usado para AutoLogin).
     */
    public function findValidTokenBySelector(string $selector): ?array;

    /**
     * Elimina un token usando su selector.
     */
    public function deleteBySelector(string $selector): bool;

    /**
     * Elimina todos los tokens asociados a un usuario.
     */
    public function deleteAllByUserId(int $userId): bool;

    /**
     * Elimina un token por su ID primario.
     */
    public function deleteById(int $id): bool;

    /**
     * Obtiene todos los dispositivos (tokens) activos de un usuario.
     */
    public function getActiveDevicesByUserId(int $userId): array;

    /**
     * Revoca (elimina) un dispositivo específico de un usuario.
     */
    public function revokeDevice(int $tokenId, int $userId): bool;

    /**
     * Revoca todos los dispositivos de un usuario excepto el actual.
     */
    public function revokeOtherDevices(int $userId, string $currentSelector): bool;
}
?>