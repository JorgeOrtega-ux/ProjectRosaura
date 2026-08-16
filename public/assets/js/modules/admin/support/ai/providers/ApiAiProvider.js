import { AiProviderInterface } from '../AiProviderInterface.js';
import { ApiRoutes } from '../../../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../../../core/api/ApiServices.js';

export class ApiAiProvider extends AiProviderInterface {
    constructor(apiService = null) {
        super();
        this.api = apiService || new ApiService();
    }

    /**
     * Envía la solicitud al endpoint de backend para mejorar el texto.
     *
     * @param {string} text
     * @param {string} targetLanguage
     * @param {string} context
     * @param {AbortSignal|null} signal
     * @returns {Promise<string>}
     */
    async improve(text, targetLanguage = 'es-419', context = 'chat', signal = null) {
        const cleanText = (text || '').trim();
        if (!cleanText) {
            return '';
        }

        try {
            const res = await this.api.post(ApiRoutes.AdminSupport.AiImprove, {
                text: cleanText,
                target_language: targetLanguage,
                context: context
            }, signal);

            if (!res || !res.success) {
                const errorMsg = res && res.message ? res.message : 'AI_UNAVAILABLE';
                throw new Error(errorMsg);
            }

            // Si el backend devolvió fallback:true (Ollama no respondió o error interno)
            if (res.fallback === true) {
                throw new Error('AI_UNAVAILABLE');
            }

            return res.improved || cleanText;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            throw new Error(error.message || 'AI_UNAVAILABLE');
        }
    }

    isEnabled() {
        return true;
    }
}
