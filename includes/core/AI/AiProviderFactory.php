<?php

namespace App\Core\AI;

use App\Core\AI\Contracts\AiProviderInterface;
use App\Core\AI\Providers\OllamaProvider;
use App\Core\AI\Providers\OpenAiProvider;
use App\Core\AI\Providers\NullProvider;
use App\Core\Helpers\EnvLoader;

/**
 * AiProviderFactory — Fábrica centralizada de proveedores de IA para el panel de soporte.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * GUÍA: CÓMO CAMBIAR EL PROVEEDOR DE IA EN EL FUTURO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * A) Cambiar a OpenAI GPT-4o / GPT-4o-mini:
 *    1. Implementar `OpenAiProvider.php` en `includes/core/AI/Providers/` (el stub ya existe).
 *    2. Agregar `OPENAI_API_KEY=sk-...` en el `.env`.
 *    3. Cambiar `AI_PROVIDER=openai` en el `.env`.
 *    4. Reiniciar los contenedores PHP si es necesario (`docker compose restart app1 app2`).
 *    5. Ningún controlador, servicio o interfaz de usuario necesita cambios.
 *
 * B) Cambiar a LanguageTool (solo corrección ortográfica sin traducción):
 *    1. Crear `LanguageToolProvider.php` en `includes/core/AI/Providers/` implementando `AiProviderInterface`.
 *    2. Agregar el servicio LanguageTool en `docker-compose.yml`.
 *    3. Registrar el caso `'languagetool' => new LanguageToolProvider()` en esta factoría.
 *    4. Cambiar `AI_PROVIDER=languagetool` en el `.env`.
 *
 * C) Deshabilitar la IA temporalmente o en entornos de prueba:
 *    1. Cambiar `AI_ENABLED=false` en el `.env`.
 *    2. La factoría devolverá automáticamente `NullProvider` sin errores y el frontend ocultará el botón de mejora.
 */
class AiProviderFactory {
    /**
     * Instancia y devuelve el proveedor de IA configurado en el entorno.
     * Si la IA está deshabilitada o el proveedor no es reconocido, retorna NullProvider (fail-safe).
     *
     * @return AiProviderInterface
     */
    public static function create(): AiProviderInterface {
        $enabled = EnvLoader::get('AI_ENABLED', 'true');
        if ($enabled === false || $enabled === 'false' || $enabled === '0') {
            return new NullProvider();
        }

        $provider = strtolower(trim((string)EnvLoader::get('AI_PROVIDER', 'ollama')));

        return match ($provider) {
            'ollama' => new OllamaProvider(),
            'openai' => new OpenAiProvider(),
            default  => new NullProvider(),
        };
    }
}
