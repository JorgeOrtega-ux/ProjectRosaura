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