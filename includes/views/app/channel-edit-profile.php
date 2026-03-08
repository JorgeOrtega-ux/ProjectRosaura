<?php
// includes/views/app/channel-edit-profile.php

// Asegurar que el usuario esté logueado para ver esta vista
if (!isset($_SESSION['user_id'])) {
    echo '<p class="component-empty-state">Acceso denegado. Por favor, inicia sesión.</p>';
    exit;
}

// Variables temporales (Estas podrías llenarlas desde tu base de datos)
$currentUsername = $_SESSION['username'] ?? 'Usuario-Actual';
$currentEmail = $_SESSION['email'] ?? 'correo@ejemplo.com';
$currentDescription = ''; // O traerla de la BD
?>

<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title">Editar perfil del canal</h1>
            <p class="component-page-description">Personaliza cómo se muestra tu canal a los demás usuarios.</p>
        </div>

        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Descripción</h2>
                        <p class="component-card__description">Cuéntales a los usuarios de qué se trata tu canal.</p>
                        <div class="component-card__form-area">
                            <textarea id="channelDescriptionInput" class="component-input-field" placeholder="Escribe aquí la descripción de tu canal..." maxlength="1000" rows="5"><?php echo htmlspecialchars($currentDescription); ?></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="username-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Identificador</h2>
                            <p class="component-card__description">Crea un identificador único agregando letras y números.</p>
                            <span class="component-display-value" data-ref="display-username">@<?php echo htmlspecialchars($currentUsername); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="username-edit">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Identificador</h2>
                            <p class="component-card__description">Crea un identificador único agregando letras y números.</p>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" data-ref="input-username" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($currentUsername); ?>" data-original-value="<?php echo htmlspecialchars($currentUsername); ?>" placeholder="Ingresa tu identificador">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="username">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveUsername">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="contact-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Información de contacto</h2>
                            <p class="component-card__description">Ingresa una dirección de correo electrónico para que los usuarios sepan cómo comunicarse contigo si tienen preguntas empresariales. Es posible que se incluya esta dirección en la sección "Acerca de" del canal y que sea visible para los usuarios.</p>
                            <span class="component-display-value" data-ref="display-contact"><?php echo htmlspecialchars($currentEmail); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="contact">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="contact-edit">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Información de contacto</h2>
                            <p class="component-card__description">Ingresa una dirección de correo electrónico para que los usuarios sepan cómo comunicarse contigo si tienen preguntas empresariales. Es posible que se incluya esta dirección en la sección "Acerca de" del canal y que sea visible para los usuarios.</p>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="email" data-ref="input-contact" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($currentEmail); ?>" data-original-value="<?php echo htmlspecialchars($currentEmail); ?>" placeholder="tu-correo@empresa.com">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="contact">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveContact">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>
</div>