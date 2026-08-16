import { ApiAiProvider } from './providers/ApiAiProvider.js';
import { NullAiProvider } from './providers/NullAiProvider.js';

/**
 * AiProviderFactory — Factoría del frontend para instanciar el proveedor de IA adecuado.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * GUÍA: CÓMO CAMBIAR EL PROVEEDOR DE IA EN EL FRONTEND EN EL FUTURO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * 1. La mayoría de los cambios de proveedor (de Ollama a OpenAI, LanguageTool, etc.)
 *    se gestionan 100% en el Backend PHP cambiando la variable AI_PROVIDER en .env.
 *    El frontend seguirá utilizando `ApiAiProvider` llamando al endpoint común.
 *
 * 2. Si se desea un proveedor que interactúe directamente desde el navegador:
 *    a) Crear `NewProvider.js` en `providers/` extendiendo `AiProviderInterface`.
 *    b) Agregar la rama de selección en este método `create()`.
 *    c) Inyectar en `window.AI_CONFIG.provider` el nombre del nuevo proveedor.
 *
 * 3. Para deshabilitar la IA:
 *    Configurar `AI_ENABLED=false` en `.env`. La factoría devolverá `NullAiProvider`
 *    y el botón de mejora no se renderizará en los componentes.
 */
export class AiProviderFactory {
    /**
     * @param {ApiService|null} apiService
     * @returns {AiProviderInterface}
     */
    static create(apiService = null) {
        const config = window.AI_CONFIG || {};

        if (config.enabled === false || config.enabled === 'false' || config.provider === 'null') {
            return new NullAiProvider();
        }

        const providerType = (config.provider || 'api').toLowerCase();

        switch (providerType) {
            case 'api':
                return new ApiAiProvider(apiService);
            case 'null':
                return new NullAiProvider();
            default:
                return new NullAiProvider();
        }
    }
}
