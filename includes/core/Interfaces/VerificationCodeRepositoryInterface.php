<?php
// includes/core/Interfaces/VerificationCodeRepositoryInterface.php

namespace App\Core\Interfaces;

interface VerificationCodeRepositoryInterface {
    /**
     * Crea un nuevo código de verificación.
     */
    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool;

    /**
     * Busca el código más reciente y válido usando el identificador (ej. email) y tipo.
     */
    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array;

    /**
     * Busca un código válido comparando directamente el código exacto y el tipo.
     */
    public function findValidByCodeAndType(string $code, string $codeType): ?array;

    /**
     * Verifica si existe algún código activo para un identificador y tipo.
     */
    public function hasActiveCode(string $identifier, string $codeType): bool;

    /**
     * Elimina un código específico por su ID.
     */
    public function deleteById(int $id): bool;

    /**
     * Elimina todos los códigos asociados a un identificador y tipo.
     */
    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool;
}
?>