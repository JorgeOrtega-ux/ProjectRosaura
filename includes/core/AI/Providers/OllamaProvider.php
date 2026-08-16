<?php

namespace App\Core\AI\Providers;

use App\Core\AI\Contracts\AiProviderInterface;
use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;

class OllamaProvider implements AiProviderInterface {
    private string $host;
    private string $model;
    private int $timeout;

    public function __construct() {
        $this->host = rtrim((string)EnvLoader::get('AI_OLLAMA_HOST', 'http://rosaura_ollama:11434'), '/');
        $this->model = (string)EnvLoader::get('AI_OLLAMA_MODEL', 'qwen3:1.7b');
        $this->timeout = (int)EnvLoader::get('AI_TIMEOUT_SECONDS', 15);
    }

    /**
     * Mejora el texto del agente enviándolo a Ollama (Qwen3:1.7B).
     *
     * @param string $text
     * @param string $targetLanguage
     * @param string $context
     * @return string
     * @throws \RuntimeException Si falla la conexión con Ollama
     */
    public function improve(string $text, string $targetLanguage, string $context): string {
        $cleanText = trim($text);
        if ($cleanText === '') {
            return '';
        }

        $systemPrompt = $this->buildSystemPrompt($targetLanguage, $context);
        $fullPrompt = $systemPrompt . "\n\nText:\n\"" . $cleanText . "\"";

        $payload = [
            'model' => $this->model,
            'prompt' => $fullPrompt,
            'stream' => false,
            'options' => [
                'temperature' => 0.1,
                'top_p' => 0.9,
                'num_predict' => 600,
                'stop' => ['</s>', '<|end|>', '<|im_end|>', '<|endoftext|>']
            ]
        ];

        $url = $this->host . '/api/generate';
        $jsonData = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $jsonData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            throw new \RuntimeException("Ollama connection failed: " . ($curlError ?: 'unknown error'));
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException("Ollama returned HTTP {$httpCode}: " . substr((string)$response, 0, 200));
        }

        $decoded = json_decode((string)$response, true);
        if (!is_array($decoded) || !isset($decoded['response'])) {
            throw new \RuntimeException("Invalid JSON structure returned by Ollama");
        }

        $rawResponse = (string)$decoded['response'];
        $cleanedResponse = $this->cleanModelOutput($rawResponse);

        if ($cleanedResponse === '') {
            throw new \RuntimeException("Empty response received after cleaning Ollama output");
        }

        return $cleanedResponse;
    }

    /**
     * Comprueba disponibilidad de Ollama con un ping rápido a /api/tags (timeout 2s).
     *
     * @return bool
     */
    public function isAvailable(): bool {
        $url = $this->host . '/api/tags';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_NOBODY => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ($response !== false && $httpCode === 200);
    }

    /**
     * Construye el prompt según el idioma destino.
     */
    private function buildSystemPrompt(string $targetLanguage, string $context): string {
        if ($this->isSpanish($targetLanguage)) {
            return "You are a professional text corrector for a multilingual customer support team.\n" .
                   "Your ONLY task: fix spelling, grammar, accents, and punctuation errors in the text below.\n" .
                   "Rules:\n" .
                   "- Keep the EXACT same language. Do NOT translate.\n" .
                   "- Keep the EXACT same meaning and professional tone.\n" .
                   "- Preserve ALL placeholders unchanged: {client_name}, {agent_name}, {user_name}, {tracking_code}, etc.\n" .
                   "- Return ONLY the corrected text. No explanations. No quotes. No preamble.\n" .
                   "- If the text is already correct, return it exactly as-is.";
        }

        $languageName = $this->getLanguageName($targetLanguage);
        return "You are a professional translator for a customer support team.\n" .
               "Your task: fix any errors AND translate the following text to {$languageName}.\n" .
               "Rules:\n" .
               "- Produce natural, professional {$languageName} appropriate for customer support.\n" .
               "- Fix ALL spelling, grammar and punctuation errors during the process.\n" .
               "- Keep the EXACT same meaning and professional tone.\n" .
               "- Preserve ALL placeholders unchanged: {client_name}, {agent_name}, {user_name}, {tracking_code}, etc.\n" .
               "- Return ONLY the final result. No explanations. No quotes. No preamble.";
    }

    /**
     * Determina si el código de idioma corresponde a alguna variante de español.
     */
    private function isSpanish(string $langCode): bool {
        return str_starts_with(strtolower(trim($langCode)), 'es');
    }

    /**
     * Mapeo de códigos de idioma a nombres formales según los soportados en la web.
     */
    private function getLanguageName(string $code): string {
        $map = [
            'en'     => 'English',
            'en-US'  => 'English',
            'en-GB'  => 'English (UK)',
            'es'     => 'Spanish',
            'es-419' => 'Spanish',
            'es-MX'  => 'Spanish',
            'es-ES'  => 'Spanish',
            'fr'     => 'French',
            'fr-FR'  => 'French',
            'de'     => 'German',
            'de-DE'  => 'German',
            'it'     => 'Italian',
            'it-IT'  => 'Italian',
            'pt'     => 'Portuguese',
            'pt-BR'  => 'Brazilian Portuguese',
            'pt-PT'  => 'Portuguese'
        ];

        $clean = trim($code);
        $base = explode('-', $clean)[0];
        return $map[$clean] ?? $map[$base] ?? 'Spanish';
    }

    /**
     * Limpia etiquetas <think>...</think>, bloques de código markdown y comillas envolventes no deseadas.
     */
    private function cleanModelOutput(string $output): string {
        // Eliminar pensamientos generados por Qwen3 <think>...</think>
        $cleaned = preg_replace('/<think>[\s\S]*?<\/think>/i', '', $output);
        if ($cleaned === null) {
            $cleaned = $output;
        }

        $cleaned = trim($cleaned);

        // Si el modelo envolvió toda la respuesta en comillas simples o dobles, quitarlas
        if ((str_starts_with($cleaned, '"') && str_ends_with($cleaned, '"')) ||
            (str_starts_with($cleaned, "'") && str_ends_with($cleaned, "'"))) {
            $cleaned = substr($cleaned, 1, -1);
            $cleaned = trim($cleaned);
        }

        // Si el modelo devolvió bloque markdown ``` ... ```, extraer contenido interno
        if (preg_match('/^```(?:\w+)?\s*([\s\S]*?)\s*```$/i', $cleaned, $matches)) {
            $cleaned = trim($matches[1]);
        }

        return $cleaned;
    }
}
