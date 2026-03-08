<?php
// includes/views/app/channel.php

$targetUsername = $_GET['username'] ?? '';
$isLoggedIn = isset($_SESSION['user_id']);

global $container;
$channelVideos = [];
$channelShorts = [];
$totalVideos = 0;
$appUrl = defined('APP_URL') ? APP_URL : '';
$subscriberCount = 0;
$isSubscribed = false;

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
    
    $channelUser = $userRepo->findByUsername($targetUsername);
    $channelExists = $channelUser ? true : false;
    
    $currentUsername = null;
    if ($isLoggedIn) {
        $currentUserData = $userRepo->findById($_SESSION['user_id']);
        $currentUsername = $currentUserData['username'] ?? null;
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
    $currentUsername = null;
}

$isOwner = false;
if ($isLoggedIn && $channelExists && $currentUsername) {
    $isOwner = (strtolower($currentUsername) === strtolower($targetUsername));
}

$avatarPath = $appUrl . '/public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png';
if ($channelExists && !empty($channelUser['profile_picture'])) {
    $avatarPath = $appUrl . '/' . ltrim($channelUser['profile_picture'], '/');
}

$displayName = $channelExists ? ($channelUser['display_name'] ?? $channelUser['username']) : $targetUsername;

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
        <p class="component-message-desc">El usuario @<?php echo htmlspecialchars($targetUsername); ?> no se encuentra en nuestra base de datos.</p>
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
                <h1 class="component-channel-title"><?php echo htmlspecialchars($displayName); ?></h1>
                
                <p class="component-channel-meta">
                    @<?php echo htmlspecialchars($channelUser['username'] ?? ''); ?> • 
                    <span id="channel-subscriber-count"><?php echo format_subscribers_count($subscriberCount); ?> suscriptores</span> • 
                    <?php echo $totalVideos; ?> videos
                </p>

                <?php if (!empty($channelDesc) || !empty($channelContact)): ?>
                    <div class="component-channel-about-preview" style="margin-top: 10px; margin-bottom: 10px; font-size: 14px; color: var(--text-secondary); max-width: 600px;">
                        <?php if (!empty($channelDesc)): ?>
                            <p style="margin-bottom: <?php echo !empty($channelContact) ? '5px' : '0'; ?>; line-height: 1.4;">
                                <?php echo nl2br(htmlspecialchars($channelDesc)); ?>
                            </p>
                        <?php endif; ?>
                        <?php if (!empty($channelContact)): ?>
                            <p style="font-weight: 500;">
                                Contacto: <a href="mailto:<?php echo htmlspecialchars($channelContact); ?>" style="color: var(--accent-color); text-decoration: none;"><?php echo htmlspecialchars($channelContact); ?></a>
                            </p>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <div class="component-channel-actions" style="margin-top: 15px;">
                    <?php if ($isOwner): ?>
                        <button class="component-btn-secondary" data-nav="<?php echo $appUrl; ?>/channel/<?php echo htmlspecialchars($channelUser['uuid'] ?? ''); ?>/editing/profile">Personalizar canal</button>
                    <?php else: ?>
                        <button id="btn-channel-subscribe" data-username="<?php echo htmlspecialchars($targetUsername); ?>" class="<?php echo $isSubscribed ? 'component-btn-secondary' : 'component-btn-primary'; ?>">
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
                                                <p class="component-video-card__user"><?php echo htmlspecialchars($displayName); ?></p>
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
                                                <p class="component-video-card__user"><?php echo htmlspecialchars($displayName); ?></p>
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

        </div>
    </div>
<?php endif; ?>