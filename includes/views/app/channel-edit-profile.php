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

        </div>

        <br>
        
        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Detalles Personales</h2>
                        <p class="component-card__description">Comparte información adicional sobre ti para que otros usuarios puedan conocerte mejor.</p>
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Estado de Relación</h2>
                        <p class="component-card__description">Comparte tu estado sentimental actual.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuRelStatus">
                            <span class="material-symbols-rounded">favorite</span>
                            <span class="component-dropdown-text" id="textRelStatus"><?php echo $relStatusMap[$relStatus] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuRelStatus">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($relStatusMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $relStatus === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelRelStatusInput" data-text="textRelStatus" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelRelStatusInput" value="<?php echo htmlspecialchars($relStatus); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Interesado en</h2>
                        <p class="component-card__description">Especifica en quién estás interesado.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuInterestedIn">
                            <span class="material-symbols-rounded">group</span>
                            <span class="component-dropdown-text" id="textInterestedIn"><?php echo $interestedInMap[$interestedIn] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuInterestedIn">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($interestedInMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $interestedIn === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelInterestedInInput" data-text="textInterestedIn" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelInterestedInInput" value="<?php echo htmlspecialchars($interestedIn); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Género</h2>
                        <p class="component-card__description">Selecciona con qué género te identificas.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuGender">
                            <span class="material-symbols-rounded">person</span>
                            <span class="component-dropdown-text" id="textGender"><?php echo $genderMap[$gender] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuGender">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($genderMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $gender === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelGenderInput" data-text="textGender" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelGenderInput" value="<?php echo htmlspecialchars($gender); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Color de cabello</h2>
                        <p class="component-card__description">Elige tu color de cabello actual.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuHairColor">
                            <span class="material-symbols-rounded">face</span>
                            <span class="component-dropdown-text" id="textHairColor"><?php echo $hairColorMap[$hairColor] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuHairColor">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($hairColorMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $hairColor === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelHairColorInput" data-text="textHairColor" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelHairColorInput" value="<?php echo htmlspecialchars($hairColor); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Medidas corporales</h2>
                        <p class="component-card__description">Ajusta tu estatura y peso utilizando los controles.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start" style="gap: 20px; flex-wrap: wrap;">
                    
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span class="component-label" style="font-size: 0.85rem; color: var(--text-secondary);">Estatura (metros)</span>
                        <div class="component-inline-control component-inline-control--fixed">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelHeightInput" data-step="-0.10" data-min="1.00"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelHeightInput" data-step="-0.01" data-min="1.00"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" id="display-channelHeightInput"><?php echo htmlspecialchars($height ?: '1.70'); ?></div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelHeightInput" data-step="0.01" data-max="2.50"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelHeightInput" data-step="0.10" data-max="2.50"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                        <input type="hidden" id="channelHeightInput" value="<?php echo htmlspecialchars($height ?: '1.70'); ?>">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span class="component-label" style="font-size: 0.85rem; color: var(--text-secondary);">Peso (kg)</span>
                        <div class="component-inline-control component-inline-control--fixed">
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelWeightInput" data-step="-5" data-min="30"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelWeightInput" data-step="-1" data-min="30"><span class="material-symbols-rounded">chevron_left</span></button>
                            </div>
                            <div class="component-inline-control__center" id="display-channelWeightInput"><?php echo htmlspecialchars($weight ?: '70.0'); ?></div>
                            <div class="component-inline-control__group">
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelWeightInput" data-step="1" data-max="250"><span class="material-symbols-rounded">chevron_right</span></button>
                                <button type="button" class="component-inline-control__btn" data-action="adjustNumber" data-target="channelWeightInput" data-step="5" data-max="250"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                            </div>
                        </div>
                        <input type="hidden" id="channelWeightInput" value="<?php echo htmlspecialchars($weight ?: '70.0'); ?>">
                    </div>

                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Tatuajes</h2>
                        <p class="component-card__description">Indica si tienes tatuajes visibles.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="channelTattoosInput" <?php echo $tattoos ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Perforaciones</h2>
                        <p class="component-card__description">Indica si tienes perforaciones visibles.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="channelPiercingsInput" <?php echo $piercings ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Intereses y Pasatiempos</h2>
                        <p class="component-card__description">¿Qué te gusta hacer en tu tiempo libre? Cine, música, deportes, etc.</p>
                        <div class="component-card__form-area" style="margin-top: 10px;">
                            <textarea id="channelInterestsInput" class="component-input-field" placeholder="Escribe aquí sobre tus aficiones..." maxlength="1000" rows="5"><?php echo htmlspecialchars($interests); ?></textarea>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>