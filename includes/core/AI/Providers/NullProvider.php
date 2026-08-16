<?php

namespace App\Core\AI\Providers;

use App\Core\AI\Contracts\AiProviderInterface;

class NullProvider implements AiProviderInterface {
    /**
     * Devuelve el texto original sin modificaciones.
     * Útil para entornos de prueba, cuando la IA está desactivada o como fallback general.
     *
     * @param string $text
     * @param string $targetLanguage
     * @param string $context
     * @return string
     */
    public function improve(string $text, string $targetLanguage, string $context): string {
        return $text;
    }

    /**
     * NullProvider siempre reporta estar disponible.
     *
     * @return bool
     */
    public function isAvailable(): bool {
        return true;
    }
}
