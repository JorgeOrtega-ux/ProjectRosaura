import { AiProviderFactory } from './AiProviderFactory.js';

/**
 * AiImprover — Controlador de interfaz de alto nivel para la mejora de mensajes con IA.
 * Proporciona el botón interactivo "✨ Mejorar", manejo de estados (normal, loading, success, error/fallback)
 * y tiempos de espera visuales sin bloquear la experiencia del agente.
 */
export class AiImprover {
    constructor(apiService = null) {
        this.provider = AiProviderFactory.create(apiService);
        this._attachedElements = new Map(); // targetElement => state object
    }

    /**
     * Asocia el botón "✨ Mejorar" a un campo de entrada (input o textarea).
     *
     * @param {HTMLElement} targetElement Campo donde el agente escribe
     * @param {string} targetLanguage    Idioma del usuario (ej: "en-US", "es-419")
     * @param {string} context           "chat" | "ticket" | "canned"
     * @returns {HTMLElement|null}       Elemento botón creado o existente
     */
    attachButton(targetElement, targetLanguage = 'es-419', context = 'chat') {
        if (!targetElement || !this.provider.isEnabled()) {
            return null;
        }

        // Si ya está asociado a este elemento, actualizar configuración
        if (this._attachedElements.has(targetElement)) {
            const existingState = this._attachedElements.get(targetElement);
            existingState.targetLanguage = targetLanguage;
            existingState.context = context;
            this._updateButtonVisibility(targetElement);
            return existingState.button;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'component-button component-ai-improve-btn active';
        button.setAttribute('data-action', 'aiImproveText');
        button.setAttribute('data-tooltip', (window.__ && window.__('btn_ai_improve') !== 'btn_ai_improve') ? window.__('btn_ai_improve') : 'Mejorar mensaje con IA');
        button.setAttribute('data-position', 'top');

        const labelImprove = (window.__ && window.__('btn_ai_improve') !== 'btn_ai_improve') ? window.__('btn_ai_improve') : '✨ Mejorar';
        button.innerHTML = `<span class="material-symbols-rounded">auto_fix_high</span><span class="component-ai-improve-btn__text">${labelImprove}</span>`;

        // Colocación estratégica según el contexto
        this._insertButtonIntoDom(targetElement, button, context);

        const inputHandler = () => {
            this._updateButtonVisibility(targetElement);
        };

        const clickHandler = async (e) => {
            // En chat, permitimos que el evento suba para que el controlador gestione el toggle de auto-mejora
            if (context !== 'chat') {
                e.preventDefault();
                await this._handleImproveClick(targetElement);
            }
        };

        targetElement.addEventListener('input', inputHandler);
        button.addEventListener('click', clickHandler);

        const state = {
            targetElement,
            button,
            inputHandler,
            clickHandler,
            targetLanguage,
            context,
            isProcessing: false,
            isAllowed: true
        };

        this._attachedElements.set(targetElement, state);
        this._updateButtonVisibility(targetElement);

        return button;
    }

    /**
     * Desasocia y elimina el botón de la interfaz.
     *
     * @param {HTMLElement} targetElement
     */
    detachButton(targetElement) {
        if (!targetElement || !this._attachedElements.has(targetElement)) {
            return;
        }

        const state = this._attachedElements.get(targetElement);
        targetElement.removeEventListener('input', state.inputHandler);

        if (state.button) {
            state.button.removeEventListener('click', state.clickHandler);
            const parentWrapper = state.button.closest('.component-ai-improve-wrapper');
            if (parentWrapper) {
                parentWrapper.remove();
            } else {
                state.button.remove();
            }
        }

        this._attachedElements.delete(targetElement);
    }

    /**
     * Actualiza el idioma destino de un elemento asociado.
     *
     * @param {HTMLElement} targetElement
     * @param {string} targetLanguage
     */
    setLanguage(targetElement, targetLanguage) {
        if (!targetElement || !this._attachedElements.has(targetElement)) {
            return;
        }
        const state = this._attachedElements.get(targetElement);
        state.targetLanguage = targetLanguage || 'es-419';
    }

    /**
     * Permite ocultar o mostrar el botón condicionalmente (ej. notas internas).
     *
     * @param {HTMLElement} targetElement
     * @param {boolean} isAllowed
     */
    setVisibility(targetElement, isAllowed) {
        if (!targetElement || !this._attachedElements.has(targetElement)) {
            return;
        }
        const state = this._attachedElements.get(targetElement);
        state.isAllowed = !!isAllowed;
        this._updateButtonVisibility(targetElement);
    }

    /**
     * Inserta el botón en la posición DOM óptima según el tipo de contenedor.
     */
    _insertButtonIntoDom(targetElement, button, context) {
        // En Live Chat y Chat Flotante: dentro del contenedor de búsqueda/input del footer
        if (context === 'chat' || targetElement.closest('.component-search-input')) {
            const searchInputWrapper = targetElement.closest('.component-search-input');
            const sendBtn = searchInputWrapper ? searchInputWrapper.querySelector('[data-ref="admin-chat-btn-send"], [data-ref="admin-support-floating-send-btn"], [data-action="sendAdminChatMessage"], [data-action="sendAdminFloatingChatMessage"]') : null;
            if (searchInputWrapper) {
                if (sendBtn) {
                    searchInputWrapper.insertBefore(button, sendBtn);
                } else {
                    searchInputWrapper.appendChild(button);
                }
                return;
            }
        }

        // En Textareas (Tickets, Canned Responses)
        const parentGroup = targetElement.closest('.component-input-group, .component-card__actions');
        if (parentGroup) {
            parentGroup.style.position = 'relative';
            let wrapper = parentGroup.querySelector('.component-ai-improve-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'component-ai-improve-wrapper';
                parentGroup.appendChild(wrapper);
            }
            wrapper.appendChild(button);
            return;
        }

        // Fallback: insertar inmediatamente después del targetElement
        const wrapper = document.createElement('div');
        wrapper.className = 'component-ai-improve-wrapper';
        if (targetElement.parentNode) {
            targetElement.parentNode.style.position = 'relative';
        }
        wrapper.appendChild(button);
        targetElement.parentNode.insertBefore(wrapper, targetElement.nextSibling);
    }

    /**
     * Actualiza la visibilidad del botón en base al modo permitido y longitud del texto.
     */
    _updateButtonVisibility(targetElement) {
        const state = this._attachedElements.get(targetElement);
        if (!state || !state.button) return;

        if (state.isProcessing) return;

        // Ocultar solo si está explícitamente deshabilitado (ej. notas internas)
        if (!state.isAllowed) {
            state.button.classList.remove('active');
            state.button.classList.add('disabled');
            return;
        }

        state.button.classList.remove('disabled');
        state.button.classList.add('active');

        const text = (targetElement.value || '').trim();
        if (text.length === 0) {
            state.button.classList.add('is-empty');
        } else {
            state.button.classList.remove('is-empty');
        }
    }

    /**
     * Ejecuta el flujo de mejora con IA al hacer click en el botón.
     */
    async _handleImproveClick(targetElement) {
        const state = this._attachedElements.get(targetElement);
        if (!state || state.isProcessing) return;

        const currentText = (targetElement.value || '').trim();
        if (currentText.length < 2) {
            targetElement.focus();
            return;
        }

        state.isProcessing = true;
        const btn = state.button;

        // Estado visual LOADING
        btn.classList.add('component-ai-improve-btn--loading', 'disabled-interaction');
        btn.disabled = true;
        targetElement.readOnly = true;

        const labelProcessing = (window.__ && window.__('lbl_ai_processing') !== 'lbl_ai_processing') ? window.__('lbl_ai_processing') : 'Procesando...';
        btn.innerHTML = `<div class="component-spinner component-spinner--h14"></div><span class="component-ai-improve-btn__text">${labelProcessing}</span>`;

        // Timeout visual de 12 segundos
        const abortController = new AbortController();
        const timeoutTimer = setTimeout(() => {
            abortController.abort();
        }, 12000);

        try {
            const improvedText = await this.provider.improve(
                currentText,
                state.targetLanguage || 'es-419',
                state.context || 'chat',
                abortController.signal
            );

            clearTimeout(timeoutTimer);

            if (improvedText && improvedText.trim() !== '') {
                targetElement.value = improvedText;

                // Disparar eventos para actualizar cualquier auto-resize o listener de formulario
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                targetElement.dispatchEvent(new Event('change', { bubbles: true }));

                // Pequeño flash visual de éxito (borde verde por 1.5s)
                targetElement.classList.add('ai-improve-flash-success');
                setTimeout(() => {
                    targetElement.classList.remove('ai-improve-flash-success');
                }, 1500);
            }

            this._restoreButtonNormal(state);
        } catch (error) {
            clearTimeout(timeoutTimer);
            this._showButtonError(state);
        } finally {
            targetElement.readOnly = false;
            state.isProcessing = false;
        }
    }

    /**
     * Restaura el botón al estado normal.
     */
    _restoreButtonNormal(state) {
        if (!state || !state.button) return;
        const btn = state.button;
        btn.classList.remove('component-ai-improve-btn--loading', 'component-ai-improve-btn--error', 'disabled-interaction');
        btn.disabled = false;

        const labelImprove = (window.__ && window.__('btn_ai_improve') !== 'btn_ai_improve') ? window.__('btn_ai_improve') : '✨ Mejorar';
        btn.innerHTML = `<span class="material-symbols-rounded">auto_fix_high</span><span class="component-ai-improve-btn__text">${labelImprove}</span>`;

        this._updateButtonVisibility(state.targetElement);
    }

    /**
     * Muestra estado de error temporal (2 segundos) si la IA falla o no responde.
     */
    _showButtonError(state) {
        if (!state || !state.button) return;
        const btn = state.button;

        btn.classList.remove('component-ai-improve-btn--loading');
        btn.classList.add('component-ai-improve-btn--error', 'disabled-interaction');
        btn.disabled = true;

        const labelUnavailable = (window.__ && window.__('err_ai_unavailable') !== 'err_ai_unavailable') ? window.__('err_ai_unavailable') : '⚠ IA no disponible';
        btn.innerHTML = `<span class="material-symbols-rounded">warning</span><span class="component-ai-improve-btn__text">${labelUnavailable}</span>`;

        setTimeout(() => {
            if (this._attachedElements.has(state.targetElement)) {
                this._restoreButtonNormal(state);
            }
        }, 2000);
    }
}
