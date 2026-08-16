<?php

namespace App\Core\AI\Providers;

use App\Core\AI\Contracts\AiProviderInterface;
use App\Core\Helpers\EnvLoader;

/**
 * OpenAiProvider — Esqueleto listo para futura implementación de OpenAI (GPT-4o / GPT-4o-mini).
 *
 * Pasos para habilitar en el futuro:
 * 1. Agregar al archivo .env:
 *    OPENAI_API_KEY=sk-...
 *    OPENAI_MODEL=gpt-4o-mini
 * 2. Cambiar en .env:
 *    AI_PROVIDER=openai
 * 3. Implementar el método improve() llamando al endpoint:
 *    POST https://api.openai.com/v1/chat/completions
 *    Headers:
 *      Authorization: Bearer {OPENAI_API_KEY}
 *      Content-Type: application/json
 *    Body:
 *      {
 *        "model": "gpt-4o-mini",
 *        "messages": [
 *          {"role": "system", "content": "You are a professional text corrector..."},
 *          {"role": "user", "content": "Text to improve"}
 *        ],
 *        "temperature": 0.1
 *      }
 */
class OpenAiProvider implements AiProviderInterface {
    private ?string $apiKey;
    private string $model;

    public function __construct() {
        $this->apiKey = EnvLoader::get('OPENAI_API_KEY', null);
        $this->model = (string)EnvLoader::get('OPENAI_MODEL', 'gpt-4o-mini');
    }

    /**
     * @param string $text
     * @param string $targetLanguage
     * @param string $context
     * @return string
     * @throws \LogicException
     */
    public function improve(string $text, string $targetLanguage, string $context): string {
        throw new \LogicException("OpenAiProvider is not yet implemented. Please configure AI_PROVIDER=ollama in .env or implement this class.");
    }

    /**
     * @return bool
     */
    public function isAvailable(): bool {
        return !empty($this->apiKey);
    }
}
