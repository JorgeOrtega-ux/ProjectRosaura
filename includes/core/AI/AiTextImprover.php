<?php

namespace App\Core\AI;

use App\Core\AI\Contracts\AiProviderInterface;
use App\Core\System\Logger;

/**
 * AiTextImprover — Servicio de alto nivel para mejora y corrección de textos.
 * Los controladores y servicios de negocio interactúan exclusivamente a través de esta clase.
 *
 * Garantía Fail-Safe:
 * NUNCA lanza excepciones al invocador. Ante cualquier fallo de red, timeout o error interno del LLM,
 * devuelve automáticamente el texto original del agente marcando 'fallback' => true.
 */
class AiTextImprover {
    private AiProviderInterface $provider;

    public function __construct(?AiProviderInterface $provider = null) {
        $this->provider = $provider ?? AiProviderFactory::create();
    }

    /**
     * Procesa y mejora el texto del agente de soporte.
     *
     * @param string $text           Texto a corregir/traducir
     * @param string $targetLanguage Idioma destino (default "es-419")
     * @param string $context        Contexto de uso ("chat", "ticket", "canned")
     * @return array{success: bool, improved: string, fallback: bool, message?: string}
     */
    public function improve(string $text, string $targetLanguage = 'es-419', string $context = 'chat'): array {
        $trimmed = trim($text);

        if ($trimmed === '') {
            return [
                'success' => false,
                'message' => 'Text cannot be empty',
                'improved' => '',
                'fallback' => false
            ];
        }

        // Limitar a máximo 2000 caracteres
        if (mb_strlen($trimmed) > 2000) {
            $trimmed = mb_substr($trimmed, 0, 2000);
        }

        $validLanguage = !empty($targetLanguage) ? $targetLanguage : 'es-419';
        $validContext = in_array($context, ['chat', 'ticket', 'canned'], true) ? $context : 'chat';

        try {
            $improved = $this->provider->improve($trimmed, $validLanguage, $validContext);

            if (trim($improved) === '') {
                return [
                    'success' => true,
                    'improved' => $trimmed,
                    'fallback' => true
                ];
            }

            return [
                'success' => true,
                'improved' => $improved,
                'fallback' => false
            ];
        } catch (\Throwable $e) {
            if (class_exists('App\\Core\\System\\Logger')) {
                Logger::error("AiTextImprover execution failed: " . $e->getMessage(), [
                    'context' => $validContext,
                    'target_language' => $validLanguage,
                    'exception' => $e
                ]);
            }

            // Fallback seguro: retornar texto original
            return [
                'success' => true,
                'improved' => $trimmed,
                'fallback' => true
            ];
        }
    }

    /**
     * Verifica disponibilidad del proveedor subyacente.
     *
     * @return bool
     */
    public function isAvailable(): bool {
        try {
            return $this->provider->isAvailable();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
