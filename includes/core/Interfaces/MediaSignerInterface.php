<?php
// includes/core/Interfaces/MediaSignerInterface.php

namespace App\Core\Interfaces;

interface MediaSignerInterface {
    /**
     * Genera un token HMAC único para un video específico.
     *
     * @param string $videoUuid El identificador único del video.
     * @param int $expires Tiempo de expiración en formato Timestamp (Unix).
     * @param string $ipAddress La dirección IP del cliente que solicita el video.
     * @return string El token generado.
     */
    public function generateToken(string $videoUuid, int $expires, string $ipAddress): string;

    /**
     * Valida si un token proporcionado es auténtico y no ha expirado.
     *
     * @param string $videoUuid El identificador único del video.
     * @param int $expires Tiempo de expiración en formato Timestamp (Unix).
     * @param string $ipAddress La dirección IP del cliente.
     * @param string $providedToken El token a validar.
     * @return bool True si es válido, False en caso contrario.
     */
    public function validateToken(string $videoUuid, int $expires, string $ipAddress, string $providedToken): bool;
}
?>