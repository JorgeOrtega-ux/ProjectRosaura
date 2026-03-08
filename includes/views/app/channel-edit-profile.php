<?php
// includes/views/app/channel-edit-profile.php
global $container;

if (!isset($_SESSION['user_id'])) {
    echo '<p class="component-empty-state">Acceso denegado. Por favor, inicia sesión.</p>';
    exit;
}

$userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
$currentUser = $userRepo->findById($_SESSION['user_id']);

$currentDescription = $currentUser['channel_description'] ?? '';
$currentIdentifier = !empty($currentUser['channel_identifier']) ? $currentUser['channel_identifier'] : $currentUser['username'];
$currentContact = $currentUser['channel_contact_email'] ?? '';

// Variables de los nuevos campos extendidos
$relStatus = $currentUser['relationship_status'] ?? '';
$interestedIn = $currentUser['interested_in'] ?? '';
$gender = $currentUser['gender'] ?? '';
$height = $currentUser['height'] ?? '';
$weight = $currentUser['weight'] ?? '';
$hairColor = $currentUser['hair_color'] ?? '';
$tattoos = $currentUser['tattoos'] ?? 0;
$piercings = $currentUser['piercings'] ?? 0;
$interests = $currentUser['interests'] ?? '';

// Arrays para mapear valores a texto
$relStatusMap = ['single' => 'Soltero/a', 'married' => 'Casado/a', 'in_a_relationship' => 'En una relación', 'complicated' => 'Es complicado', 'open_relationship' => 'Relación abierta', '' => 'No especificado'];
$interestedInMap = ['men' => 'Hombres', 'women' => 'Mujeres', 'both' => 'Hombres y Mujeres', 'other' => 'Otro', '' => 'No especificado'];
$genderMap = ['male' => 'Hombre', 'female' => 'Mujer', 'non-binary' => 'No binario', 'other' => 'Otro', '' => 'No especificado'];
$hairColorMap = ['black' => 'Negro', 'brown' => 'Castaño', 'blonde' => 'Rubio', 'red' => 'Pelirrojo', 'other' => 'Otro', '' => 'No especificado'];
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
                                    <input type="text" id="channelIdentifierInput" data-ref="input-identifier" class="component-input-field component-input-field--simple" value="<?php echo htmlspecialchars($currentIdentifier); ?>" placeholder="Ingresa tu identificador" maxlength="20">
                                </div>
                                <div class="component-card__actions component-card__actions--stretch">
                                    <button type="button" class="component-button component-button--h34" data-action="cancelLocalEdit" data-target="identifier">Cancelar</button>
                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveLocalEdit" data-target="identifier">Guardar</button>
                                </div>
                            </div>
                            <div class="identifier-status-msg component-text-small mt-1"></div>
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
                            <p class="component-card__description">Ingresa una dirección de correo electrónico para que los usuarios sepan cómo comunicarse contigo si tienen preguntas empresariales.</p>
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
                            <p class="component-card__description">Ingresa una dirección de correo electrónico para que los usuarios sepan cómo comunicarse contigo si tienen preguntas empresariales.</p>
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

            <hr class="component-divider">

            <h2 class="component-page-title mt-4 mb-2" style="font-size: 1.2rem;">Detalles Personales</h2>
            
            <div class="component-group-item component-group-item--stacked">
                 <div class="component-card__content">
                     <div class="component-card__text" style="width: 100%;">
                         
                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                             
                             <div>
                                 <label class="component-label">Estado de Relación</label>
                                 <select id="channelRelStatusInput" class="component-input-field">
                                     <?php foreach($relStatusMap as $val => $label): ?>
                                         <option value="<?php echo $val; ?>" <?php echo $relStatus === $val ? 'selected' : ''; ?>><?php echo $label; ?></option>
                                     <?php endforeach; ?>
                                 </select>
                             </div>

                             <div>
                                 <label class="component-label">Interesado en</label>
                                 <select id="channelInterestedInInput" class="component-input-field">
                                     <?php foreach($interestedInMap as $val => $label): ?>
                                         <option value="<?php echo $val; ?>" <?php echo $interestedIn === $val ? 'selected' : ''; ?>><?php echo $label; ?></option>
                                     <?php endforeach; ?>
                                 </select>
                             </div>

                             <div>
                                 <label class="component-label">Género</label>
                                 <select id="channelGenderInput" class="component-input-field">
                                     <?php foreach($genderMap as $val => $label): ?>
                                         <option value="<?php echo $val; ?>" <?php echo $gender === $val ? 'selected' : ''; ?>><?php echo $label; ?></option>
                                     <?php endforeach; ?>
                                 </select>
                             </div>

                             <div>
                                 <label class="component-label">Color de cabello</label>
                                 <select id="channelHairColorInput" class="component-input-field">
                                     <?php foreach($hairColorMap as $val => $label): ?>
                                         <option value="<?php echo $val; ?>" <?php echo $hairColor === $val ? 'selected' : ''; ?>><?php echo $label; ?></option>
                                     <?php endforeach; ?>
                                 </select>
                             </div>

                         </div>

                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                             <div>
                                 <label class="component-label">Estatura (metros)</label>
                                 <input type="number" id="channelHeightInput" class="component-input-field" step="0.01" min="1.00" max="2.50" value="<?php echo htmlspecialchars($height); ?>" placeholder="Ej: 1.75">
                             </div>
                             <div>
                                 <label class="component-label">Peso (kg)</label>
                                 <input type="number" id="channelWeightInput" class="component-input-field" step="0.1" min="30" max="250" value="<?php echo htmlspecialchars($weight); ?>" placeholder="Ej: 70.5">
                             </div>
                         </div>

                         <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                             <label style="display: flex; align-items: center; gap: 5px;">
                                 <input type="checkbox" id="channelTattoosInput" <?php echo $tattoos ? 'checked' : ''; ?>>
                                 <span>Tengo tatuajes</span>
                             </label>
                             <label style="display: flex; align-items: center; gap: 5px;">
                                 <input type="checkbox" id="channelPiercingsInput" <?php echo $piercings ? 'checked' : ''; ?>>
                                 <span>Tengo perforaciones</span>
                             </label>
                         </div>

                         <div>
                             <label class="component-label">Intereses y Pasatiempos</label>
                             <textarea id="channelInterestsInput" class="component-input-field" placeholder="¿Qué te gusta hacer en tu tiempo libre? Cine, música, deportes..." maxlength="1000" rows="4"><?php echo htmlspecialchars($interests); ?></textarea>
                         </div>

                     </div>
                 </div>
            </div>

        </div>

    </div>
</div>