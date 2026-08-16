<?php

namespace App\Core\AI\Contracts;

interface AiProviderInterface {
    /**
     * Mejora el texto del agente: corrige ortografía, puntuación, gramática y/o traduce al idioma destino.
     *
     * @param string $text           Texto original del agente
     * @param string $targetLanguage Código de idioma destino (ej: "en-US", "es-419")
     * @param string $context        Contexto: "chat" | "ticket" | "canned"
     * @return string                Texto mejorado (o el original si no requiere cambios o falla)
     */
    public function improve(string $text, string $targetLanguage, string $context): string;

    /**
     * Verifica si el proveedor se encuentra disponible para recibir solicitudes.
     *
     * @return bool
     */
    public function isAvailable(): bool;
}
