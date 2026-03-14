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
                            <video data-src="<?php echo htmlspecialchars($videoSrc); ?>" data-uuid="<?php echo htmlspecialchars($short['uuid']); ?>" class="component-video-card__player" muted loop playsinline></video>
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