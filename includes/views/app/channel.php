<?php
// includes/views/app/channel.php

// Capturamos exclusivamente el identificador del router
$targetIdentifier = $_GET['identifier'] ?? '';
$targetIdentifier = ltrim($targetIdentifier, '@'); // Limpiamos la arroba si viene en la URL

// Capturamos la pestaña actual de la URL, si no existe asume 'main'
$currentTab = $_GET['tab'] ?? 'main';
$validTabs = ['main', 'videos', 'shorts', 'about'];
if (!in_array($currentTab, $validTabs)) {
    $currentTab = 'main'; // Fallback de seguridad
}

$isLoggedIn = isset($_SESSION['user_id']);

global $container;
$channelVideos = [];
$channelShorts = [];
$totalVideos = 0;
$appUrl = defined('APP_URL') ? APP_URL : '';
$subscriberCount = 0;
$isSubscribed = false;

// Arrays de mapeo para los detalles personales
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

if (!function_exists('time_elapsed_string')) {
    function time_elapsed_string($datetime, $full = false) {
        $now = new DateTime;
        $ago = new DateTime($datetime);
        $diff = $now->diff($ago);

        $weeks = floor($diff->d / 7);
        $days = $diff->d - ($weeks * 7);

        $values = [
            'y' => $diff->y,
            'm' => $diff->m,
            'w' => $weeks,
            'd' => $days,
            'h' => $diff->h,
            'i' => $diff->i,
            's' => $diff->s,
        ];

        $string = [
            'y' => 'año', 
            'm' => 'mes', 
            'w' => 'semana',
            'd' => 'día', 
            'h' => 'hora', 
            'i' => 'minuto', 
            's' => 'segundo',
        ];

        $parts = [];
        foreach ($string as $k => $v) {
            if ($values[$k]) {
                $plural = ($values[$k] > 1 && $v !== 'mes') ? 's' : (($values[$k] > 1 && $v === 'mes') ? 'es' : '');
                $parts[] = $values[$k] . ' ' . $v . $plural;
            }
        }

        if (!$full) $parts = array_slice($parts, 0, 1);
        return $parts ? 'Hace ' . implode(', ', $parts) : 'Justo ahora';
    }
}

if (!function_exists('format_duration')) {
    function format_duration($seconds) {
        $seconds = (int)$seconds;
        $hours = floor($seconds / 3600);
        $mins = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        
        if ($hours > 0) {
            return sprintf("%02d:%02d:%02d", $hours, $mins, $secs);
        }
        return sprintf("%02d:%02d", $mins, $secs);
    }
}

if (!function_exists('format_subscribers_count')) {
    function format_subscribers_count($num) {
        if ($num >= 1000000) return round($num / 1000000, 1) . 'M';
        if ($num >= 1000) return round($num / 1000, 1) . 'K';
        return $num;
    }
}

if (isset($container)) {
    $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
    $videoRepo = $container->get(\App\Core\Interfaces\VideoRepositoryInterface::class);
    $subscriptionRepo = $container->get(\App\Core\Interfaces\SubscriptionRepositoryInterface::class);
    
    // Buscar ESTRICTAMENTE por el identificador
    $channelUser = $userRepo->findByIdentifier($targetIdentifier);
    
    $channelExists = $channelUser ? true : false;
    
    $currentUserData = null;
    if ($isLoggedIn) {
        $currentUserData = $userRepo->findById($_SESSION['user_id']);
    }

    if ($channelExists) {
        $channelVideos = $videoRepo->getChannelVideos($channelUser['id'], 'horizontal');
        $channelShorts = $videoRepo->getChannelVideos($channelUser['id'], 'vertical');
        $totalVideos = count($channelVideos) + count($channelShorts);
        
        $subscriberCount = $subscriptionRepo->getSubscriberCount($channelUser['id']);
        
        if ($isLoggedIn) {
            $isSubscribed = $subscriptionRepo->isSubscribed($_SESSION['user_id'], $channelUser['id']);
        }
    }

} else {
    $channelExists = false;
    $currentUserData = null;
}

$isOwner = false;
if ($isLoggedIn && $channelExists && $currentUserData) {
    // Es más seguro comparar por ID que por username
    $isOwner = ($currentUserData['id'] === $channelUser['id']);
}

$avatarPath = $appUrl . '/public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png';
if ($channelExists && !empty($channelUser['profile_picture'])) {
    $avatarPath = $appUrl . '/' . ltrim($channelUser['profile_picture'], '/');
}

$displayName = $channelExists ? ($channelUser['display_name'] ?? $channelUser['username']) : $targetIdentifier;

// Priorizar el identificador para la UI
$displayIdentifier = $channelExists ? (!empty($channelUser['channel_identifier']) ? $channelUser['channel_identifier'] : $channelUser['username']) : $targetIdentifier;

// Extraer descripción y contacto de la base de datos
$channelDesc = $channelExists ? ($channelUser['channel_description'] ?? '') : '';
$channelContact = $channelExists ? ($channelUser['channel_contact_email'] ?? '') : '';
?>

<?php if (!$channelExists): ?>
    <div class="component-channel-layout component-channel-not-found">
        <div class="component-message-icon-wrapper">
            <span class="material-symbols-rounded component-message-icon">error</span>
        </div>
        <h1 class="component-message-title">Este canal no existe</h1>
        <p class="component-message-desc">El usuario @<?php echo htmlspecialchars($targetIdentifier); ?> no se encuentra en nuestra base de datos.</p>
    </div>
<?php else: ?>
    <div class="component-channel-layout">
        
        <div class="component-channel-banner-container" id="channel-banner-container" style="<?php echo !empty($channelUser['banner_path']) ? 'background-image: url(' . htmlspecialchars($appUrl . '/' . ltrim($channelUser['banner_path'], '/')) . ');' : ''; ?>">
            <?php if ($isOwner): ?>
                <div class="component-channel-banner-action">
                    <button class="component-btn-secondary" id="btn-edit-banner">Editar banner</button>
                    <input type="file" id="bannerUploadInput" hidden accept="image/jpeg, image/png, image/webp">
                </div>
            <?php endif; ?>
        </div>

        <div class="component-channel-header">
            <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Avatar" class="component-channel-avatar">
            
            <div class="component-channel-info-wrapper">
                <h1 class="component-channel-title component-channel-title-wrapper">
                    <?php echo htmlspecialchars($displayName); ?>
                    <?php if ($channelExists && isset($channelUser['channel_verified']) && $channelUser['channel_verified'] == 1): ?>
                        <span class="material-symbols-rounded component-verified-badge" title="Canal Verificado">check_circle</span>
                    <?php endif; ?>
                </h1>
                
                <p class="component-channel-meta">
                    @<?php echo htmlspecialchars($displayIdentifier); ?> • 
                    <span id="channel-subscriber-count"><?php echo format_subscribers_count($subscriberCount); ?> suscriptores</span> • 
                    <?php echo $totalVideos; ?> videos
                </p>

                <?php if (!empty($channelDesc) || !empty($channelContact)): ?>
                    <div class="component-channel-about-preview">
                        <?php if (!empty($channelDesc)): ?>
                            <p class="component-channel-about-preview-text <?php echo !empty($channelContact) ? 'has-contact' : ''; ?>">
                                <?php echo nl2br(htmlspecialchars($channelDesc)); ?>
                            </p>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <div class="component-channel-actions component-channel-actions-wrapper">
                    <?php if ($isOwner): ?>
                        <button class="component-btn-secondary" data-nav="<?php echo $appUrl; ?>/channel/<?php echo htmlspecialchars($channelUser['uuid'] ?? ''); ?>/editing/profile">Personalizar canal</button>
                    <?php else: ?>
                        <button id="btn-channel-subscribe" data-identifier="<?php echo htmlspecialchars($displayIdentifier); ?>" class="<?php echo $isSubscribed ? 'component-btn-secondary' : 'component-btn-primary'; ?>">
                            <?php echo $isSubscribed ? 'Suscrito' : 'Suscribirse'; ?>
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="component-channel-tabs" id="channel-tabs-container">
            <div class="component-channel-tab <?php echo $currentTab === 'main' ? 'active' : ''; ?>" data-target="section-main" data-tab="main">Principal</div>
            <div class="component-channel-tab <?php echo $currentTab === 'videos' ? 'active' : ''; ?>" data-target="section-videos" data-tab="videos">Videos</div>
            <div class="component-channel-tab <?php echo $currentTab === 'shorts' ? 'active' : ''; ?>" data-target="section-shorts" data-tab="shorts">Shorts</div>
            <div class="component-channel-tab <?php echo $currentTab === 'about' ? 'active' : ''; ?>" data-target="section-about" data-tab="about">Acerca de</div>
        </div>

        <div class="component-channel-content">
            
            <div class="component-channel-content-section <?php echo $currentTab === 'main' ? 'active' : ''; ?>" id="section-main">
                <?php include __DIR__ . '/channel_tabs/tab-main.php'; ?>
            </div>

            <div class="component-channel-content-section <?php echo $currentTab === 'videos' ? 'active' : ''; ?>" id="section-videos">
                <?php include __DIR__ . '/channel_tabs/tab-videos.php'; ?>
            </div>

            <div class="component-channel-content-section <?php echo $currentTab === 'shorts' ? 'active' : ''; ?>" id="section-shorts">
                <?php include __DIR__ . '/channel_tabs/tab-shorts.php'; ?>
            </div>

            <div class="component-channel-content-section <?php echo $currentTab === 'about' ? 'active' : ''; ?>" id="section-about">
                <?php include __DIR__ . '/channel_tabs/tab-about.php'; ?>
            </div>

        </div>
    </div>
<?php endif; ?>