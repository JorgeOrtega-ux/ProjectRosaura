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

// Variables de los campos extendidos
$relStatus = $currentUser['relationship_status'] ?? '';
$interestedIn = $currentUser['interested_in'] ?? '';
$gender = $currentUser['gender'] ?? '';
$height = $currentUser['height'] ?? '';
$weight = $currentUser['weight'] ?? '';
$hairColor = $currentUser['hair_color'] ?? '';
$boobs = $currentUser['boobs'] ?? '';
$ethnicity = $currentUser['ethnicity'] ?? '';
$eyeColor = $currentUser['eye_color'] ?? '';
$country = $currentUser['country'] ?? '';
$tattoos = $currentUser['tattoos'] ?? 0;
$piercings = $currentUser['piercings'] ?? 0;
$interests = $currentUser['interests'] ?? '';

// Variables de Redes Sociales
$socialFb = $currentUser['social_facebook'] ?? '';
$socialYt = $currentUser['social_youtube'] ?? '';
$socialIg = $currentUser['social_instagram'] ?? '';
$socialX = $currentUser['social_x'] ?? '';
$socialOf = $currentUser['social_onlyfans'] ?? '';
$socialSc = $currentUser['social_snapchat'] ?? '';

// Arrays para mapear valores a texto
$relStatusMap = ['single' => 'Soltero/a', 'married' => 'Casado/a', 'in_a_relationship' => 'En una relación', 'complicated' => 'Es complicado', 'open_relationship' => 'Relación abierta', '' => 'No especificado'];
$interestedInMap = ['men' => 'Hombres', 'women' => 'Mujeres', 'both' => 'Hombres y Mujeres', 'other' => 'Otro', '' => 'No especificado'];
$genderMap = ['male' => 'Hombre', 'female' => 'Mujer', 'non-binary' => 'No binario', 'other' => 'Otro', '' => 'No especificado'];
$hairColorMap = ['black' => 'Negro', 'brown' => 'Castaño', 'blonde' => 'Rubio', 'red' => 'Pelirrojo', 'other' => 'Otro', '' => 'No especificado'];
$boobsMap = ['natural' => 'Naturales', 'augmented' => 'Operados/Aumentados', '' => 'No especificado'];
$ethnicityMap = ['latina' => 'Latina', 'caucasian' => 'Caucásica/Blanca', 'asian' => 'Asiática', 'black' => 'Afrodescendiente/Negra', 'mixed' => 'Mixta', 'indigenous' => 'Indígena', '' => 'No especificado'];
$eyeColorMap = ['brown' => 'Café', 'blue' => 'Azul', 'green' => 'Verde', 'hazel' => 'Miel/Avellana', 'black' => 'Negros', '' => 'No especificado'];

// Lista completa de países
$countriesMap = [
    'AF' => 'Afganistán', 'AL' => 'Albania', 'DE' => 'Alemania', 'AD' => 'Andorra', 'AO' => 'Angola', 
    'AG' => 'Antigua y Barbuda', 'SA' => 'Arabia Saudita', 'DZ' => 'Argelia', 'AR' => 'Argentina', 
    'AM' => 'Armenia', 'AU' => 'Australia', 'AT' => 'Austria', 'AZ' => 'Azerbaiyán', 'BS' => 'Bahamas', 
    'BD' => 'Bangladés', 'BB' => 'Barbados', 'BH' => 'Baréin', 'BE' => 'Bélgica', 'BZ' => 'Belice', 
    'BJ' => 'Benín', 'BY' => 'Bielorrusia', 'MM' => 'Birmania', 'BO' => 'Bolivia', 'BA' => 'Bosnia y Herzegovina', 
    'BW' => 'Botsuana', 'BR' => 'Brasil', 'BN' => 'Brunéi', 'BG' => 'Bulgaria', 'BF' => 'Burkina Faso', 
    'BI' => 'Burundi', 'BT' => 'Bután', 'CV' => 'Cabo Verde', 'KH' => 'Camboya', 'CM' => 'Camerún', 
    'CA' => 'Canadá', 'QA' => 'Catar', 'TD' => 'Chad', 'CL' => 'Chile', 'CN' => 'China', 'CY' => 'Chipre', 
    'VA' => 'Ciudad del Vaticano', 'CO' => 'Colombia', 'KM' => 'Comoras', 'KP' => 'Corea del Norte', 
    'KR' => 'Corea del Sur', 'CI' => 'Costa de Marfil', 'CR' => 'Costa Rica', 'HR' => 'Croacia', 'CU' => 'Cuba', 
    'DK' => 'Dinamarca', 'DM' => 'Dominica', 'EC' => 'Ecuador', 'EG' => 'Egipto', 'SV' => 'El Salvador', 
    'AE' => 'Emiratos Árabes Unidos', 'ER' => 'Eritrea', 'SK' => 'Eslovaquia', 'SI' => 'Eslovenia', 
    'ES' => 'España', 'US' => 'Estados Unidos', 'EE' => 'Estonia', 'ET' => 'Etiopía', 'PH' => 'Filipinas', 
    'FI' => 'Finlandia', 'FJ' => 'Fiyi', 'FR' => 'Francia', 'GA' => 'Gabón', 'GM' => 'Gambia', 'GE' => 'Georgia', 
    'GH' => 'Ghana', 'GD' => 'Granada', 'GR' => 'Grecia', 'GT' => 'Guatemala', 'GY' => 'Guyana', 'GN' => 'Guinea', 
    'GQ' => 'Guinea Ecuatorial', 'GW' => 'Guinea-Bisáu', 'HT' => 'Haití', 'HN' => 'Honduras', 'HU' => 'Hungría', 
    'IN' => 'India', 'ID' => 'Indonesia', 'IQ' => 'Irak', 'IR' => 'Irán', 'IE' => 'Irlanda', 'IS' => 'Islandia', 
    'MH' => 'Islas Marshall', 'SB' => 'Islas Salomón', 'IL' => 'Israel', 'IT' => 'Italia', 'JM' => 'Jamaica', 
    'JP' => 'Japón', 'JO' => 'Jordania', 'KZ' => 'Kazajistán', 'KE' => 'Kenia', 'KG' => 'Kirguistán', 
    'KI' => 'Kiribati', 'KW' => 'Kuwait', 'LA' => 'Laos', 'LS' => 'Lesoto', 'LV' => 'Letonia', 'LB' => 'Líbano', 
    'LR' => 'Liberia', 'LY' => 'Libia', 'LI' => 'Liechtenstein', 'LT' => 'Lituania', 'LU' => 'Luxemburgo', 
    'MG' => 'Madagascar', 'MY' => 'Malasia', 'MW' => 'Malaui', 'MV' => 'Maldivas', 'ML' => 'Malí', 
    'MT' => 'Malta', 'MA' => 'Marruecos', 'MU' => 'Mauricio', 'MR' => 'Mauritania', 'MX' => 'México', 
    'FM' => 'Micronesia', 'MD' => 'Moldavia', 'MC' => 'Mónaco', 'MN' => 'Mongolia', 'ME' => 'Montenegro', 
    'MZ' => 'Mozambique', 'NA' => 'Namibia', 'NR' => 'Nauru', 'NP' => 'Nepal', 'NI' => 'Nicaragua', 
    'NE' => 'Níger', 'NG' => 'Nigeria', 'NO' => 'Noruega', 'NZ' => 'Nueva Zelanda', 'OM' => 'Omán', 
    'NL' => 'Países Bajos', 'PK' => 'Pakistán', 'PW' => 'Palaos', 'PA' => 'Panamá', 'PG' => 'Papúa Nueva Guinea', 
    'PY' => 'Paraguay', 'PE' => 'Perú', 'PL' => 'Polonia', 'PT' => 'Portugal', 'GB' => 'Reino Unido', 
    'CF' => 'República Centroafricana', 'CZ' => 'República Checa', 'MK' => 'Macedonia del Norte', 
    'CG' => 'República del Congo', 'CD' => 'República Democrática del Congo', 'DO' => 'República Dominicana', 
    'ZA' => 'Sudáfrica', 'RW' => 'Ruanda', 'RO' => 'Rumanía', 'RU' => 'Rusia', 'WS' => 'Samoa', 
    'KN' => 'San Cristóbal y Nieves', 'SM' => 'San Marino', 'VC' => 'San Vicente y las Granadinas', 
    'LC' => 'Santa Lucía', 'ST' => 'Santo Tomé y Príncipe', 'SN' => 'Senegal', 'RS' => 'Serbia', 'SC' => 'Seychelles', 
    'SL' => 'Sierra Leona', 'SG' => 'Singapur', 'SY' => 'Siria', 'SO' => 'Somalia', 'LK' => 'Sri Lanka', 
    'SZ' => 'Suazilandia', 'SD' => 'Sudán', 'SS' => 'Sudán del Sur', 'SE' => 'Suecia', 'CH' => 'Suiza', 
    'SR' => 'Surinam', 'TH' => 'Tailandia', 'TZ' => 'Tanzania', 'TJ' => 'Tayikistán', 'TL' => 'Timor Oriental', 
    'TG' => 'Togo', 'TO' => 'Tonga', 'TT' => 'Trinidad y Tobago', 'TN' => 'Túnez', 'TM' => 'Turkmenistán', 
    'TR' => 'Turquía', 'TV' => 'Tuvalu', 'UA' => 'Ucrania', 'UG' => 'Uganda', 'UY' => 'Uruguay', 'UZ' => 'Uzbekistán', 
    'VU' => 'Vanuatu', 'VE' => 'Venezuela', 'VN' => 'Vietnam', 'YE' => 'Yemen', 'DJ' => 'Yibuti', 'ZM' => 'Zambia', 
    'ZW' => 'Zimbabue', '' => 'No especificado'
];
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
                        <h2 class="component-card__title">País de nacimiento</h2>
                        <p class="component-card__description">Indica el país donde naciste.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuCountry">
                            <span class="material-symbols-rounded">public</span>
                            <span class="component-dropdown-text" id="textCountry"><?php echo $countriesMap[$country] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuCountry">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($countriesMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $country === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelCountryInput" data-text="textCountry" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelCountryInput" value="<?php echo htmlspecialchars($country); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Etnia / Descendencia</h2>
                        <p class="component-card__description">Selecciona tu etnia o descendencia.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuEthnicity">
                            <span class="material-symbols-rounded">fingerprint</span>
                            <span class="component-dropdown-text" id="textEthnicity"><?php echo $ethnicityMap[$ethnicity] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuEthnicity">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($ethnicityMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $ethnicity === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelEthnicityInput" data-text="textEthnicity" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelEthnicityInput" value="<?php echo htmlspecialchars($ethnicity); ?>">
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Color de ojos</h2>
                        <p class="component-card__description">Elige tu color natural de ojos.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuEyeColor">
                            <span class="material-symbols-rounded">visibility</span>
                            <span class="component-dropdown-text" id="textEyeColor"><?php echo $eyeColorMap[$eyeColor] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuEyeColor">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($eyeColorMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $eyeColor === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelEyeColorInput" data-text="textEyeColor" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelEyeColorInput" value="<?php echo htmlspecialchars($eyeColor); ?>">
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
                        <h2 class="component-card__title">Pechos / Busto</h2>
                        <p class="component-card__description">Indica si son naturales o aumentados.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--start">
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleDropdown" data-target="menuBoobs">
                            <span class="material-symbols-rounded">female</span>
                            <span class="component-dropdown-text" id="textBoobs"><?php echo $boobsMap[$boobs] ?? 'No especificado'; ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="menuBoobs">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                <div class="component-menu-list component-menu-list--scrollable">
                                    <?php foreach($boobsMap as $val => $label): ?>
                                        <div class="component-menu-link <?php echo $boobs === $val ? 'active' : ''; ?>" data-action="selectOption" data-target="channelBoobsInput" data-text="textBoobs" data-value="<?php echo $val; ?>" data-label="<?php echo $label; ?>">
                                            <div class="component-menu-link-text"><span><?php echo $label; ?></span></div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <input type="hidden" id="channelBoobsInput" value="<?php echo htmlspecialchars($boobs); ?>">
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

        <br>

        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Redes Sociales</h2>
                        <p class="component-card__description">Añade enlaces a tus otras plataformas para que tus seguidores puedan encontrarte.</p>
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Facebook</h2>
                        <p class="component-card__description">Activa para vincular tu perfil o página de Facebook.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleFbInput" data-action="toggleSocial" data-target="channelFbInput" <?php echo !empty($socialFb) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelFbInput" style="display: <?php echo !empty($socialFb) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelFbInput" class="component-input-field component-input-field--simple" placeholder="https://facebook.com/tu-usuario" value="<?php echo htmlspecialchars($socialFb); ?>">
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">YouTube</h2>
                        <p class="component-card__description">Activa para vincular tu canal de YouTube.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleYtInput" data-action="toggleSocial" data-target="channelYtInput" <?php echo !empty($socialYt) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelYtInput" style="display: <?php echo !empty($socialYt) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelYtInput" class="component-input-field component-input-field--simple" placeholder="https://youtube.com/@tu-canal" value="<?php echo htmlspecialchars($socialYt); ?>">
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Instagram</h2>
                        <p class="component-card__description">Activa para vincular tu cuenta de Instagram.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleIgInput" data-action="toggleSocial" data-target="channelIgInput" <?php echo !empty($socialIg) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelIgInput" style="display: <?php echo !empty($socialIg) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelIgInput" class="component-input-field component-input-field--simple" placeholder="https://instagram.com/tu_usuario" value="<?php echo htmlspecialchars($socialIg); ?>">
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">X (Twitter)</h2>
                        <p class="component-card__description">Activa para vincular tu perfil de X.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleXInput" data-action="toggleSocial" data-target="channelXInput" <?php echo !empty($socialX) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelXInput" style="display: <?php echo !empty($socialX) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelXInput" class="component-input-field component-input-field--simple" placeholder="https://x.com/tu_usuario" value="<?php echo htmlspecialchars($socialX); ?>">
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">OnlyFans</h2>
                        <p class="component-card__description">Activa para vincular tu cuenta de OnlyFans.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleOfInput" data-action="toggleSocial" data-target="channelOfInput" <?php echo !empty($socialOf) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelOfInput" style="display: <?php echo !empty($socialOf) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelOfInput" class="component-input-field component-input-field--simple" placeholder="https://onlyfans.com/tu_usuario" value="<?php echo htmlspecialchars($socialOf); ?>">
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Snapchat</h2>
                        <p class="component-card__description">Activa para vincular tu perfil de Snapchat.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="toggleScInput" data-action="toggleSocial" data-target="channelScInput" <?php echo !empty($socialSc) ? 'checked' : ''; ?>>
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
                <div class="component-card__form-area" id="area-channelScInput" style="display: <?php echo !empty($socialSc) ? 'flex' : 'none'; ?>;">
                    <div class="component-input-group component-input-group--h34">
                        <input type="url" id="channelScInput" class="component-input-field component-input-field--simple" placeholder="https://snapchat.com/add/tu_usuario" value="<?php echo htmlspecialchars($socialSc); ?>">
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>