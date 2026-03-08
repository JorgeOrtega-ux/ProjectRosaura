<?php
// includes/views/app/channel-edit-profile.php
global $container;

// Asegurar que el usuario esté logueado para ver esta vista
if (!isset($_SESSION['user_id'])) {
    echo '<p class="component-empty-state">Acceso denegado. Por favor, inicia sesión.</p>';
    exit;
}

// Obtener datos reales de la BD
$userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
$currentUser = $userRepo->findById($_SESSION['user_id']);

$currentDescription = $currentUser['channel_description'] ?? '';
$currentIdentifier = $currentUser['channel_identifier'] ?? $currentUser['username'];
$currentContact = $currentUser['channel_contact_email'] ?? '';
?>

<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div>
                <h1 class="component-page-title">Editar perfil del canal</h1>
                <p class="component-page-description">Personaliza cómo se muestra tu canal a los demás usuarios.</p>
            </div>
            <div>
                <button id="btn-publish-profile-changes" class="component-button component-button--dark" style="padding: 10px 20px; font-weight: bold;">Publicar cambios</button>
            </div>
        </div>

        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Descripción</h2>
                        <p class="component-card__description">Cuéntales a los usuarios de qué se trata tu canal.</p>
                        <div class="component-card__form-area" style="margin-top: 10px;">
                            <textarea id="channelDescriptionInput" class="component-input-field" placeholder="Escribe aquí la descripción de tu canal..." maxlength="1000" rows="5"><?php echo htmlspecialchars($currentDescription); ?></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stateful">
                
                <div class="active component-state-box" data-state="identifier-view">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Identificador</h2>
                            <p class="component-card__description">Crea un identificador único agregando letras y números.</p>
                            <span class="component-display-value" data-ref="display-identifier"><?php echo !empty($currentIdentifier) ? '@' . htmlspecialchars($currentIdentifier) : ''; ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="toggleLocalEdit" data-target="identifier">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="identifier-edit">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Identificador</h2>
                            <p class="component-card__description">Crea un identificador único agregando letras y números.</p>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="text" id="channelIdentifierInput" data-ref="input-identifier" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($currentIdentifier); ?>" placeholder="Ingresa tu identificador">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="cancelLocalEdit" data-target="identifier">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveLocalEdit" data-target="identifier">Guardar</button>
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
                            <span class="component-display-value" data-ref="display-contact"><?php echo htmlspecialchars($currentContact); ?></span>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch">
                        <button type="button" class="component-button component-button--h34" data-action="toggleLocalEdit" data-target="contact">Editar</button>
                    </div>
                </div>

                <div class="disabled component-state-box" data-state="contact-edit">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Información de contacto</h2>
                            <p class="component-card__description">Ingresa una dirección de correo electrónico para que los usuarios sepan cómo comunicarse contigo si tienen preguntas empresariales. Es posible que se incluya esta dirección en la sección "Acerca de" del canal y que sea visible para los usuarios.</p>
                            <div class="component-edit-row">
                                <div class="component-input-group component-input-group--h34">
                                    <input type="email" id="channelContactInput" data-ref="input-contact" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($currentContact); ?>" placeholder="tu-correo@empresa.com">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="cancelLocalEdit" data-target="contact">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveLocalEdit" data-target="contact">Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>
</div>