/**
 * AiProviderInterface — Base abstract class for frontend AI providers.
 */
export class AiProviderInterface {
    /**
     * Mejora el texto del agente mediante corrección o traducción.
     *
     * @param {string} text           Texto a mejorar
     * @param {string} targetLanguage Código de idioma (ej: "en-US", "es-419")
     * @param {string} context        Contexto ("chat" | "ticket" | "canned")
     * @param {AbortSignal|null} signal Signal de cancelación opcional
     * @returns {Promise<string>}     Texto mejorado
     */
    async improve(text, targetLanguage = 'es-419', context = 'chat', signal = null) {
        throw new Error('AiProviderInterface.improve() must be implemented by subclass');
    }

    /**
     * Indica si el proveedor está activo y disponible para su uso en la interfaz.
     *
     * @returns {boolean}
     */
    isEnabled() {
        return true;
    }
}
