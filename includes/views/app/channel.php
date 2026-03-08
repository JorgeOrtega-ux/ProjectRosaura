<?php
// includes/views/app/channel.php

// Capturamos exclusivamente el identificador del router
$targetIdentifier = $_GET['identifier'] ?? '';
$targetIdentifier = ltrim($targetIdentifier, '@'); // Limpiamos la arroba si viene en la URL

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
                <h1 class="component-channel-title" style="display: flex; align-items: center; gap: 6px;">
                    <?php echo htmlspecialchars($displayName); ?>
                    <?php if ($channelExists && isset($channelUser['channel_verified']) && $channelUser['channel_verified'] == 1): ?>
                        <span class="material-symbols-rounded" style="font-size: 22px; color: var(--text-secondary, #aaaaaa);" title="Canal Verificado">check_circle</span>
                    <?php endif; ?>
                </h1>
                
                <p class="component-channel-meta">
                    @<?php echo htmlspecialchars($displayIdentifier); ?> • 
                    <span id="channel-subscriber-count"><?php echo format_subscribers_count($subscriberCount); ?> suscriptores</span> • 
                    <?php echo $totalVideos; ?> videos
                </p>

                <?php if (!empty($channelDesc) || !empty($channelContact)): ?>
                    <div class="component-channel-about-preview" style="margin-top: 10px; margin-bottom: 10px; font-size: 14px; color: var(--text-secondary); max-width: 600px;">
                        <?php if (!empty($channelDesc)): ?>
                            <p style="margin-bottom: <?php echo !empty($channelContact) ? '5px' : '0'; ?>; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                                <?php echo nl2br(htmlspecialchars($channelDesc)); ?>
                            </p>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <div class="component-channel-actions" style="margin-top: 15px;">
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
            <div class="component-channel-tab is-active" data-target="section-principal">Principal</div>
            <div class="component-channel-tab" data-target="section-videos">Videos</div>
            <div class="component-channel-tab" data-target="section-shorts">Shorts</div>
            <div class="component-channel-tab" data-target="section-about">Acerca de</div>
        </div>

        <div class="component-channel-content">
            
            <div class="component-channel-content-section is-active" id="section-principal">
                <div class="component-feed-section">
                    <div class="component-feed-header">
                        <h2 class="component-feed-title">Para ti (Subidas recientes)</h2>
                    </div>
                    <div class="component-feed-body">
                        <?php if (empty($channelVideos) && empty($channelShorts)): ?>
                            <p class="component-empty-state">Este canal aún no tiene contenido publicado.</p>
                        <?php else: ?>
                            <div class="component-video-grid">
                                <?php foreach(array_slice($channelVideos, 0, 8) as $video): 
                                    $thumbSrc = !empty($video['thumbnail_path']) ? $appUrl . '/' . ltrim($video['thumbnail_path'], '/') : '';
                                    $videoSrc = !empty($video['hls_path']) ? $appUrl . '/' . ltrim($video['hls_path'], '/') : $appUrl . '/public/storage/videos/' . $video['uuid'] . '/master.m3u8';
                                ?>
                                    <div class="component-video-card" style="--local-dominant-color: <?php echo htmlspecialchars($video['thumbnail_dominant_color'] ?? '#272727'); ?>;" data-nav="<?php echo $appUrl; ?>/watch/<?php echo htmlspecialchars($video['uuid']); ?>">
                                        <div class="component-video-card__top">
                                            <img src="<?php echo htmlspecialchars($thumbSrc); ?>" alt="Miniatura de <?php echo htmlspecialchars($video['title']); ?>" class="component-video-card__thumbnail" loading="lazy">
                                            <video data-src="<?php echo htmlspecialchars($videoSrc); ?>" class="component-video-card__player" muted loop playsinline></video>
                                            <span class="component-video-card__duration"><?php echo format_duration($video['duration']); ?></span>
                                        </div>
                                        <div class="component-video-card__bottom">
                                            <div class="component-video-card__avatar">
                                                <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Perfil de <?php echo htmlspecialchars($displayName); ?>" loading="lazy">
                                            </div>
                                            <div class="component-video-card__info">
                                                <h3 class="component-video-card__title" title="<?php echo htmlspecialchars($video['title']); ?>"><?php echo htmlspecialchars($video['title']); ?></h3>
                                                <p class="component-video-card__user" style="display: flex; align-items: center; gap: 4px;">
                                                    <?php echo htmlspecialchars($displayName); ?>
                                                    <?php if (isset($channelUser['channel_verified']) && $channelUser['channel_verified'] == 1): ?>
                                                        <span class="material-symbols-rounded" style="font-size: 14px; color: var(--text-secondary, #aaaaaa);" title="Verificado">check_circle</span>
                                                    <?php endif; ?>
                                                </p>
                                                <p class="component-video-card__meta"><?php echo $video['views'] ?? 0; ?> vistas • <?php echo time_elapsed_string($video['created_at']); ?></p>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="component-channel-content-section" id="section-videos">
                <div class="component-feed-section">
                    <div class="component-feed-header">
                        <h2 class="component-feed-title">Videos subidos</h2>
                    </div>
                    <div class="component-feed-body">
                        <?php if (empty($channelVideos)): ?>
                            <p class="component-empty-state">No hay videos horizontales disponibles.</p>
                        <?php else: ?>
                            <div class="component-video-grid">
                                <?php foreach($channelVideos as $video): 
                                    $thumbSrc = !empty($video['thumbnail_path']) ? $appUrl . '/' . ltrim($video['thumbnail_path'], '/') : '';
                                    $videoSrc = !empty($video['hls_path']) ? $appUrl . '/' . ltrim($video['hls_path'], '/') : $appUrl . '/public/storage/videos/' . $video['uuid'] . '/master.m3u8';
                                ?>
                                    <div class="component-video-card" style="--local-dominant-color: <?php echo htmlspecialchars($video['thumbnail_dominant_color'] ?? '#272727'); ?>;" data-nav="<?php echo $appUrl; ?>/watch/<?php echo htmlspecialchars($video['uuid']); ?>">
                                        <div class="component-video-card__top">
                                            <img src="<?php echo htmlspecialchars($thumbSrc); ?>" alt="Miniatura de <?php echo htmlspecialchars($video['title']); ?>" class="component-video-card__thumbnail" loading="lazy">
                                            <video data-src="<?php echo htmlspecialchars($videoSrc); ?>" class="component-video-card__player" muted loop playsinline></video>
                                            <span class="component-video-card__duration"><?php echo format_duration($video['duration']); ?></span>
                                        </div>
                                        <div class="component-video-card__bottom">
                                            <div class="component-video-card__avatar">
                                                <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Perfil de <?php echo htmlspecialchars($displayName); ?>" loading="lazy">
                                            </div>
                                            <div class="component-video-card__info">
                                                <h3 class="component-video-card__title" title="<?php echo htmlspecialchars($video['title']); ?>"><?php echo htmlspecialchars($video['title']); ?></h3>
                                                <p class="component-video-card__user" style="display: flex; align-items: center; gap: 4px;">
                                                    <?php echo htmlspecialchars($displayName); ?>
                                                    <?php if (isset($channelUser['channel_verified']) && $channelUser['channel_verified'] == 1): ?>
                                                        <span class="material-symbols-rounded" style="font-size: 14px; color: var(--text-secondary, #aaaaaa);" title="Verificado">check_circle</span>
                                                    <?php endif; ?>
                                                </p>
                                                <p class="component-video-card__meta"><?php echo $video['views'] ?? 0; ?> vistas • <?php echo time_elapsed_string($video['created_at']); ?></p>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="component-channel-content-section" id="section-shorts">
                <div class="component-feed-section">
                    <div class="component-feed-header">
                        <h2 class="component-feed-title">Shorts</h2>
                    </div>
                    <div class="component-feed-body">
                        <?php if (empty($channelShorts)): ?>
                            <p class="component-empty-state">No hay shorts disponibles.</p>
                        <?php else: ?>
                            <div class="component-shorts-grid">
                                <?php foreach($channelShorts as $short): 
                                    $thumbSrc = !empty($short['thumbnail_path']) ? $appUrl . '/' . ltrim($short['thumbnail_path'], '/') : '';
                                    $videoSrc = !empty($short['hls_path']) ? $appUrl . '/' . ltrim($short['hls_path'], '/') : $appUrl . '/public/storage/videos/' . $short['uuid'] . '/master.m3u8';
                                ?>
                                    <div class="component-video-card component-video-card--vertical" style="--local-dominant-color: <?php echo htmlspecialchars($short['thumbnail_dominant_color'] ?? '#272727'); ?>;" data-nav="<?php echo $appUrl; ?>/shorts/<?php echo htmlspecialchars($short['uuid']); ?>">
                                        <div class="component-video-card__top">
                                            <img src="<?php echo htmlspecialchars($thumbSrc); ?>" alt="Miniatura de <?php echo htmlspecialchars($short['title']); ?>" class="component-video-card__thumbnail" loading="lazy">
                                            <video data-src="<?php echo htmlspecialchars($videoSrc); ?>" class="component-video-card__player" muted loop playsinline></video>
                                            <span class="component-video-card__duration"><?php echo format_duration($short['duration']); ?></span>
                                        </div>
                                        <div class="component-video-card__bottom">
                                            <div class="component-video-card__info">
                                                <h3 class="component-video-card__title" title="<?php echo htmlspecialchars($short['title']); ?>"><?php echo htmlspecialchars($short['title']); ?></h3>
                                                <p class="component-video-card__meta"><?php echo $short['views'] ?? 0; ?> vistas</p>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div class="component-channel-content-section" id="section-about">
                <div class="component-feed-section">
                    <div class="component-about-layout">
                        
                        <div class="component-about-main">
                            
                            <h2 class="component-feed-title component-about-title">Descripción</h2>
                            <div class="component-about-card">
                                <p class="component-about-text" style="margin-bottom: 12px; font-size: 1.1rem; color: var(--text-primary);"><strong>Acerca de <?php echo htmlspecialchars($displayName); ?></strong></p>
                                <p class="component-about-text"><?php echo !empty($channelDesc) ? nl2br(htmlspecialchars($channelDesc)) : 'Este canal no ha proporcionado una descripción todavía.'; ?></p>
                            </div>

                            <?php if (!empty($channelUser['interests'])): ?>
                                <h2 class="component-feed-title component-about-title">Intereses y Pasatiempos</h2>
                                <div class="component-about-card">
                                    <p class="component-about-text"><?php echo nl2br(htmlspecialchars($channelUser['interests'])); ?></p>
                                </div>
                            <?php endif; ?>

                            <h2 class="component-feed-title component-about-title">Detalles Personales</h2>
                            <div class="component-about-details-grid">
                                <?php 
                                $details = [
                                    'Estado de relación' => $relStatusMap[$channelUser['relationship_status'] ?? ''] ?? 'No especificado',
                                    'Interesado en' => $interestedInMap[$channelUser['interested_in'] ?? ''] ?? 'No especificado',
                                    'Género' => $genderMap[$channelUser['gender'] ?? ''] ?? 'No especificado',
                                    'Color de cabello' => $hairColorMap[$channelUser['hair_color'] ?? ''] ?? 'No especificado',
                                    'Estatura' => !empty($channelUser['height']) ? htmlspecialchars($channelUser['height']) . ' m' : 'No especificado',
                                    'Peso' => !empty($channelUser['weight']) ? htmlspecialchars($channelUser['weight']) . ' kg' : 'No especificado',
                                    'Tatuajes' => !empty($channelUser['tattoos']) ? 'Sí' : 'No',
                                    'Perforaciones' => !empty($channelUser['piercings']) ? 'Sí' : 'No',
                                ];
                                
                                $hasAnyDetail = false;
                                foreach($details as $label => $value) {
                                    if ($value !== 'No especificado' && $value !== '0.00 m' && $value !== '0.00 kg' && $value !== '') {
                                        $hasAnyDetail = true;
                                        echo '
                                        <div class="component-about-detail-item">
                                            <span class="component-about-detail-label">' . $label . '</span>
                                            <span class="component-about-detail-value">' . $value . '</span>
                                        </div>';
                                    }
                                }

                                if (!$hasAnyDetail): ?>
                                    <div class="component-about-card component-empty-state" style="grid-column: 1 / -1;">
                                        No hay detalles personales especificados.
                                    </div>
                                <?php endif; ?>
                            </div>

                        </div>

                        <div class="component-about-sidebar">
                            
                            <h2 class="component-feed-title component-about-title">Estadísticas</h2>
                            <div class="component-about-card">
                                <ul class="component-about-list">
                                    <li class="component-about-list-item">
                                        <span class="material-symbols-rounded component-about-list-icon">calendar_today</span>
                                        <span>Se unió el <?php echo date('d M Y', strtotime($channelUser['created_at'])); ?></span>
                                    </li>
                                    <li class="component-about-list-item">
                                        <span class="material-symbols-rounded component-about-list-icon">visibility</span>
                                        <span><?php echo $totalVideos; ?> videos publicados</span>
                                    </li>
                                    <li class="component-about-list-item">
                                        <span class="material-symbols-rounded component-about-list-icon">bar_chart</span>
                                        <span>75,432 visualizaciones</span>
                                    </li>
                                </ul>
                            </div>

                            <?php 
                            $socials = [
                                'Facebook' => ['url' => $channelUser['social_facebook'] ?? '', 'icon' => 'public'], // Uso public como fallback de icono
                                'YouTube' => ['url' => $channelUser['social_youtube'] ?? '', 'icon' => 'smart_display'],
                                'Instagram' => ['url' => $channelUser['social_instagram'] ?? '', 'icon' => 'photo_camera'],
                                'X (Twitter)' => ['url' => $channelUser['social_x'] ?? '', 'icon' => 'alternate_email'],
                                'OnlyFans' => ['url' => $channelUser['social_onlyfans'] ?? '', 'icon' => 'lock_person'],
                                'Snapchat' => ['url' => $channelUser['social_snapchat'] ?? '', 'icon' => 'chat_bubble']
                            ];
                            $hasSocials = array_filter($socials, function($s) { return !empty($s['url']); });
                            
                            if (!empty($hasSocials)):
                            ?>
                                <h2 class="component-feed-title component-about-title">Vínculos</h2>
                                <div class="component-about-socials">
                                    <?php foreach($hasSocials as $name => $data): ?>
                                        <a href="<?php echo htmlspecialchars($data['url']); ?>" target="_blank" rel="noopener noreferrer" class="component-about-social-link">
                                            <span class="material-symbols-rounded component-about-social-icon"><?php echo $data['icon']; ?></span>
                                            <span class="component-about-social-text"><?php echo $name; ?></span>
                                        </a>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($channelContact)): ?>
                                <h2 class="component-feed-title component-about-title">Contacto</h2>
                                <div class="component-about-card">
                                    <p class="component-about-contact-text">Para consultas comerciales u otros asuntos:</p>
                                    <div style="display: flex; align-items: center; gap: 12px; padding: 15px; border: 1px solid #00000020; border-radius: 12px; background-color: #f9f9f9;">
                                        <span class="material-symbols-rounded component-about-list-icon" style="color: var(--text-secondary);">mail</span>
                                        <a href="mailto:<?php echo htmlspecialchars($channelContact); ?>" style="color: var(--text-primary); text-decoration: none; font-size: 15px; font-weight: 500; word-break: break-all;"><?php echo htmlspecialchars($channelContact); ?></a>
                                    </div>
                                </div>
                            <?php endif; ?>

                        </div>
                    </div>
                </div>
            </div>
            </div>
    </div>
<?php endif; ?>