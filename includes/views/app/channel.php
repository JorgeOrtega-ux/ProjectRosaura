<?php
// includes/views/app/channel.php

$targetUsername = $_GET['username'] ?? '';
$isLoggedIn = isset($_SESSION['user_id']);

global $container;
$channelVideos = [];
$channelShorts = [];
$totalVideos = 0;

// Función Helper para fechas relativas (ej. "Hace 2 días")
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

// Función Helper para la duración del video (Segundos a MM:SS o HH:MM:SS)
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

if (isset($container)) {
    $userRepo = $container->get(\App\Core\Interfaces\UserRepositoryInterface::class);
    $videoRepo = $container->get(\App\Core\Interfaces\VideoRepositoryInterface::class);
    
    // 1. Obtener los datos del canal visitado
    $channelUser = $userRepo->findByUsername($targetUsername);
    $channelExists = $channelUser ? true : false;
    
    // 2. Obtener el nombre de usuario del visitante actual
    $currentUsername = null;
    if ($isLoggedIn) {
        $currentUserData = $userRepo->findById($_SESSION['user_id']);
        $currentUsername = $currentUserData['username'] ?? null;
    }

    // 3. Si existe, obtenemos sus videos reales
    if ($channelExists) {
        $channelVideos = $videoRepo->getChannelVideos($channelUser['id'], 'horizontal');
        $channelShorts = $videoRepo->getChannelVideos($channelUser['id'], 'vertical');
        $totalVideos = count($channelVideos) + count($channelShorts);
    }

} else {
    $channelExists = false;
    $currentUsername = null;
}

// Validar de forma estricta si es el dueño
$isOwner = false;
if ($isLoggedIn && $channelExists && $currentUsername) {
    $isOwner = (strtolower($currentUsername) === strtolower($targetUsername));
}

// Determinar la foto de perfil (o la por defecto)
$avatarPath = '/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png';
if ($channelExists && !empty($channelUser['profile_picture'])) {
    $avatarPath = $channelUser['profile_picture'];
}

$displayName = $channelExists ? ($channelUser['display_name'] ?? $channelUser['username']) : $targetUsername;
?>

<style>
    /* CSS Modular del Componente Channel */
    .component-channel-layout {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: inherit;
    }

    .component-channel-not-found {
        text-align: center;
        margin-top: 50px;
    }

    /* Banner */
    .component-channel-banner-container {
        position: relative;
        width: 100%;
        height: 200px;
        background-color: #333;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 24px;
    }

    .component-channel-banner-action {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    /* Header y Perfil */
    .component-channel-header {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 32px;
    }

    .component-channel-avatar {
        width: 120px;
        height: 120px;
        border-radius: 12px;
        background-color: #555;
        object-fit: cover;
    }

    .component-channel-info-wrapper {
        flex-grow: 1;
    }

    .component-channel-title {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
    }

    .component-channel-meta {
        margin: 0 0 16px 0;
        color: #aaa;
        font-size: 14px;
    }

    .component-channel-actions {
        display: flex;
        gap: 12px;
    }

    /* Botones */
    .component-btn-primary {
        background-color: #fff;
        color: #000;
        border: none;
        padding: 10px 20px;
        border-radius: 24px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    .component-btn-primary:hover { background-color: #e6e6e6; }

    .component-btn-secondary {
        background-color: #272727;
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 24px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    .component-btn-secondary:hover { background-color: #3f3f3f; }

    /* Navegación (Tabs) */
    .component-channel-tabs {
        display: flex;
        gap: 32px;
        border-bottom: 1px solid #3f3f3f;
        margin-bottom: 24px;
    }

    .component-channel-tab {
        padding: 12px 0;
        cursor: pointer;
        color: #aaa;
        border-bottom: 3px solid transparent;
        font-weight: 600;
        font-size: 16px;
        transition: color 0.2s;
    }

    .component-channel-tab:hover { color: #fff; }
    .component-channel-tab.is-active { color: #fff; border-bottom-color: #fff; }

    /* Contenedores de Secciones */
    .component-channel-content-section { display: none; }
    .component-channel-content-section.is-active { display: block; }
    .component-section-title { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
    .component-empty-state { color: #aaa; font-style: italic; }
</style>

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
        
        <div class="component-channel-banner-container">
            <?php if ($isOwner): ?>
                <div class="component-channel-banner-action">
                    <button class="component-btn-secondary">Editar banner</button>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-channel-header">
            <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Avatar" class="component-channel-avatar">
            
            <div class="component-channel-info-wrapper">
                <h1 class="component-channel-title"><?php echo htmlspecialchars($displayName); ?></h1>
                
                <p class="component-channel-meta">
                    @<?php echo htmlspecialchars($channelUser['username']); ?> • 
                    1.5M suscriptores • 
                    <?php echo $totalVideos; ?> videos
                </p>
                
                <div class="component-channel-actions">
                    <?php if ($isOwner): ?>
                        <button class="component-btn-secondary">Editar descripción</button>
                    <?php else: ?>
                        <button class="component-btn-primary">Suscribirse</button>
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
                <h2 class="component-section-title">Para ti (Subidas recientes)</h2>
                <?php if (empty($channelVideos) && empty($channelShorts)): ?>
                    <p class="component-empty-state">Este canal aún no tiene contenido publicado.</p>
                <?php else: ?>
                    <div class="video-feed-grid">
                        <?php foreach(array_slice($channelVideos, 0, 8) as $video): ?>
                            <div class="video-card component-video-card" style="--local-dominant-color: <?php echo htmlspecialchars($video['thumbnail_dominant_color'] ?? '#272727'); ?>;" onclick="window.router.navigate('/watch?v=<?php echo htmlspecialchars($video['uuid']); ?>')">
                                <div class="video-card__top" style="aspect-ratio: 16/9; position: relative; overflow: hidden;">
                                    <img src="<?php echo htmlspecialchars($video['thumbnail_path'] ?? ''); ?>" alt="Miniatura de <?php echo htmlspecialchars($video['title']); ?>" class="component-video-card__thumbnail video-card__thumbnail" loading="lazy">
                                    <video data-src="/storage/videos/<?php echo htmlspecialchars($video['uuid']); ?>/master.m3u8" class="component-video-card__player" muted loop playsinline></video>
                                    <div class="component-video-card__duration-badge">
                                        <span class="component-video-card__duration"><?php echo format_duration($video['duration']); ?></span>
                                    </div>
                                </div>
                                <div class="video-card__bottom">
                                    <div class="video-card__avatar">
                                        <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Perfil de <?php echo htmlspecialchars($displayName); ?>" loading="lazy">
                                    </div>
                                    <div class="video-card__info">
                                        <h3 class="video-card__title" title="<?php echo htmlspecialchars($video['title']); ?>"><?php echo htmlspecialchars($video['title']); ?></h3>
                                        <p class="video-card__user"><?php echo htmlspecialchars($displayName); ?></p>
                                        <p class="video-card__meta"><?php echo $video['views'] ?? 0; ?> vistas • <?php echo time_elapsed_string($video['created_at']); ?></p>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <div class="component-channel-content-section" id="section-videos">
                <h2 class="component-section-title">Videos subidos</h2>
                <?php if (empty($channelVideos)): ?>
                    <p class="component-empty-state">No hay videos horizontales disponibles.</p>
                <?php else: ?>
                    <div class="video-feed-grid">
                        <?php foreach($channelVideos as $video): ?>
                            <div class="video-card component-video-card" style="--local-dominant-color: <?php echo htmlspecialchars($video['thumbnail_dominant_color'] ?? '#272727'); ?>;" onclick="window.router.navigate('/watch?v=<?php echo htmlspecialchars($video['uuid']); ?>')">
                                <div class="video-card__top" style="aspect-ratio: 16/9; position: relative; overflow: hidden;">
                                    <img src="<?php echo htmlspecialchars($video['thumbnail_path'] ?? ''); ?>" alt="Miniatura de <?php echo htmlspecialchars($video['title']); ?>" class="component-video-card__thumbnail video-card__thumbnail" loading="lazy">
                                    <video data-src="/storage/videos/<?php echo htmlspecialchars($video['uuid']); ?>/master.m3u8" class="component-video-card__player" muted loop playsinline></video>
                                    <div class="component-video-card__duration-badge">
                                        <span class="component-video-card__duration"><?php echo format_duration($video['duration']); ?></span>
                                    </div>
                                </div>
                                <div class="video-card__bottom">
                                    <div class="video-card__avatar">
                                        <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Perfil de <?php echo htmlspecialchars($displayName); ?>" loading="lazy">
                                    </div>
                                    <div class="video-card__info">
                                        <h3 class="video-card__title" title="<?php echo htmlspecialchars($video['title']); ?>"><?php echo htmlspecialchars($video['title']); ?></h3>
                                        <p class="video-card__user"><?php echo htmlspecialchars($displayName); ?></p>
                                        <p class="video-card__meta"><?php echo $video['views'] ?? 0; ?> vistas • <?php echo time_elapsed_string($video['created_at']); ?></p>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

            <div class="component-channel-content-section" id="section-shorts">
                <h2 class="component-section-title">Shorts</h2>
                <?php if (empty($channelShorts)): ?>
                    <p class="component-empty-state">No hay shorts disponibles.</p>
                <?php else: ?>
                    <div class="video-feed-grid">
                        <?php foreach($channelShorts as $short): ?>
                            <div class="video-card component-video-card" style="--local-dominant-color: <?php echo htmlspecialchars($short['thumbnail_dominant_color'] ?? '#272727'); ?>;" onclick="window.router.navigate('/shorts/<?php echo htmlspecialchars($short['uuid']); ?>')">
                                <div class="video-card__top" style="aspect-ratio: 9/16; position: relative; overflow: hidden;">
                                    <img src="<?php echo htmlspecialchars($short['thumbnail_path'] ?? ''); ?>" alt="Miniatura de <?php echo htmlspecialchars($short['title']); ?>" class="component-video-card__thumbnail video-card__thumbnail" loading="lazy">
                                    <video data-src="/storage/videos/<?php echo htmlspecialchars($short['uuid']); ?>/master.m3u8" class="component-video-card__player" muted loop playsinline></video>
                                    <div class="component-video-card__duration-badge">
                                        <span class="component-video-card__duration"><?php echo format_duration($short['duration']); ?></span>
                                    </div>
                                </div>
                                <div class="video-card__bottom">
                                    <div class="video-card__avatar">
                                        <img src="<?php echo htmlspecialchars($avatarPath); ?>" alt="Perfil de <?php echo htmlspecialchars($displayName); ?>" loading="lazy">
                                    </div>
                                    <div class="video-card__info">
                                        <h3 class="video-card__title" title="<?php echo htmlspecialchars($short['title']); ?>"><?php echo htmlspecialchars($short['title']); ?></h3>
                                        <p class="video-card__user"><?php echo htmlspecialchars($displayName); ?></p>
                                        <p class="video-card__meta"><?php echo $short['views'] ?? 0; ?> vistas</p>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>

        </div>
    </div>
<?php endif; ?>