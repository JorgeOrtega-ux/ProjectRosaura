<div class="view-content" data-ref="canvas-join-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Unirse al lienzo</h1>
        </div>
        <div class="component-top-right">
            <button type="submit" form="form-join-canvas" id="btn-join-canvas" class="component-button component-button--h40" data-action="joinCanvas">
                <span class="material-symbols-rounded">login</span>
                <span>Unirse</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <div class="component-card--grouped">
                    <form id="form-join-canvas">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Código de invitación</h2>
                                    <p class="component-card__description">Ingresa el código de invitación que recibiste para unirte y empezar a colaborar.</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" name="code" id="join-code-input" class="component-input-field component-input-field--simple" placeholder="Ingresa tu código aquí" required autocomplete="off">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Términos y condiciones</h2>
                                <p class="component-card__description">Acepto que la plataforma no controla el contenido del lienzo y prometo no infringir las normas de la comunidad.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="join-terms-checkbox" name="terms_accepted" required form="form-join-canvas">
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>