import { AiProviderInterface } from '../AiProviderInterface.js';

export class NullAiProvider extends AiProviderInterface {
    /**
     * Proveedor nulo para testing o cuando la IA está desactivada.
     * Devuelve el texto original sin procesar.
     *
     * @param {string} text
     * @returns {Promise<string>}
     */
    async improve(text) {
        return text || '';
    }

    isEnabled() {
        return false;
    }
}
