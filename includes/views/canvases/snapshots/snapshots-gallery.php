<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\System\SubscriptionPlanConstants;

$canvasService = new CanvasViewService();
$galleryData = $canvasService->getSnapshotsGalleryData($_GET['uuid'] ?? null);

$uuid = $galleryData['uuid'];
$snapshots = $galleryData['snapshots'];
$canvasName = $galleryData['canvasName'];
$galleryTitle = $galleryData['galleryTitle'];
$error = $galleryData['error'];
$errorMessage = $galleryData['errorMessage'];
$errorIcon = $galleryData['errorIcon'];
$fallbackImg = $galleryData['fallbackImg'];
$isAuthorized = $galleryData['isAuthorized'] ?? false;
$isOwner = $galleryData['isOwner'] ?? false;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$isPrivileged = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPermissions);

$userTier = (int)($_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? 0);
$isAdFree = SubscriptionPlanConstants::hasFeature($userTier, 'no_ads');

$promoCatalog = $galleryData['promoCatalog'] ?? [];
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">

        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title" data-ref="gallery-title"><?php echo htmlspecialchars($galleryTitle); ?></h1>
            </div>

            <div class="component-top-right">
                <div class="component-actions active"></div>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area">
            <?php if ($error): ?>
                <div class="component-empty-state" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon"><?php echo htmlspecialchars($errorIcon); ?></span>
                    <p class="component-empty-state-text"><?php echo htmlspecialchars($errorMessage); ?></p>
                </div>
            <?php elseif (empty($snapshots)): ?>
                <div class="component-empty-state" data-ref="empty-state-rendered">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text"><?php echo __('empty_capturas_gallery'); ?></p>
                </div>
            <?php else: ?>
                <div class="component-grid" data-ref="gallery-grid">
                    <?php 
                    $realCount = 0;
                    $promoIdx = 0;
                    foreach ($snapshots as $snapshot): 
                        $realCount++;
                        $imageUrl = htmlspecialchars($snapshot['url']);
                        $viewUrl = $appUrl . '/snapshot/view/' . htmlspecialchars($snapshot['snapshot_uuid']);
                        $dateLabel = htmlspecialchars($snapshot['date']);
                        $nameLabel = htmlspecialchars($canvasName);
                    ?>
                        <div class="component-gallery-card">
                            <img src="<?php echo $imageUrl; ?>" 
                                 alt="<?php echo __('alt_captura'); ?>" 
                                 class="component-gallery-card__image image-lazy-fade" 
                                 loading="lazy" 
                                 decoding="async"
                                 onload="this.classList.add('image-loaded')"
                                 onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">
                            <div class="component-gallery-badges-container">
                                <div class="component-badge component-badge--glass">
                                    <span class="material-symbols-rounded">history</span>
                                    <span><?php echo $dateLabel; ?></span>
                                    <span class="component-badge-divider">|</span>
                                    <span class="material-symbols-rounded">favorite</span>
                                    <span><?php echo (int)($snapshot['likes_count'] ?? 0); ?></span>
                                </div>
                                <?php if ($snapshot['privacy'] === 'private'): ?>
                                <div class="component-badge component-badge--danger">
                                    <span class="material-symbols-rounded">lock</span>
                                    <span><?php echo __('canvas_privacy_private'); ?></span>
                                </div>
                                <?php endif; ?>
                            </div>
                            <div data-nav="<?php echo $viewUrl; ?>" class="component-gallery-link">
                                <h3 class="component-gallery-title"><?php echo $nameLabel; ?></h3>
                            </div>

                            <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                                <div class="component-gallery-actions">
                                    <?php if (!empty($_SESSION['user_id'])): ?>
                                    <?php $isLikedClass = $snapshot['user_liked'] ? 'is-favorite' : ''; ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo $isLikedClass; ?>" data-action="toggleSnapshotLike" data-id="<?php echo $snapshot['snapshot_uuid']; ?>">
                                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                                    </button>
                                    <?php endif; ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleModule" data-target="snapshot-menu-<?php echo $snapshot['id']; ?>">
                                        <span class="material-symbols-rounded">more_vert</span>
                                    </button>
                                </div>
                                
                                <div class="component-module component-module--dropdown disabled" data-module="snapshot-menu-<?php echo $snapshot['id']; ?>">
                                    <div class="component-menu component-menu--w265">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list">
                                            <button type="button" class="component-menu-link" data-action="openSnapshotNewTab" data-uuid="<?php echo $snapshot['snapshot_uuid']; ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">open_in_new</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('open_in_new_tab'); ?></span></div>
                                            </button>
                                            <button type="button" class="component-menu-link" data-action="copySnapshotLink" data-uuid="<?php echo $snapshot['snapshot_uuid']; ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">content_copy</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('copy_link'); ?></span></div>
                                            </button>
                                            
                                            <?php if ($isAuthorized && ($isOwner || $isPrivileged)): ?>
                                            <button type="button" class="component-menu-link" data-action="toggleSnapshotPrivacy" data-id="<?php echo $snapshot['snapshot_uuid']; ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded"><?php echo $snapshot['privacy'] === 'public' ? 'visibility_off' : 'visibility'; ?></span></div>
                                                <div class="component-menu-link-text"><span class="privacy-text"><?php echo $snapshot['privacy'] === 'public' ? __('make_private') : __('make_public'); ?></span></div>
                                            </button>
                                            
                                            <button type="button" class="component-menu-link" data-action="deleteSnapshot" data-id="<?php echo $snapshot['snapshot_uuid']; ?>" data-card-id="<?php echo $snapshot['id']; ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('delete_captura'); ?></span></div>
                                            </button>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <?php if (!$isAdFree && !empty($promoCatalog) && ($realCount % 2 === 0)): 
                            $promo = $promoCatalog[$promoIdx % count($promoCatalog)];
                            $promoIdx++;
                            $sponsorName = htmlspecialchars($promo['sponsor'] ?? 'Patrocinado');
                            $description = htmlspecialchars($promo['description'] ?? $promo['title'] ?? '');
                            $mediaList = $promo['media'] ?? [];
                            $hasMultiple = count($mediaList) > 1;
                            $promoUuid = htmlspecialchars($promo['uuid'] ?? $promo['id'] ?? '');
                            $targetUrl = !empty($promo['url']) ? $promo['url'] : ($appUrl . '/upgrade');
                            $isExternal = (str_starts_with($targetUrl, 'http://') || str_starts_with($targetUrl, 'https://'));
                            $linkActionAttr = $isExternal 
                                ? 'data-action="openPromoLink" data-target-url="' . htmlspecialchars($targetUrl) . '" data-is-external="true"' 
                                : 'data-action="openPromoLink" data-target-url="' . htmlspecialchars($targetUrl) . '" data-is-external="false" data-nav="' . htmlspecialchars($targetUrl) . '"';
                        ?>
                            <div class="component-gallery-card component-gallery-card--featured" data-card-role="promo" data-promo-id="<?php echo $promoUuid; ?>">
                                <div class="component-gallery-media-track">
                                    <?php foreach ($mediaList as $mIdx => $mItem): 
                                        $isFirst = ($mIdx === 0);
                                        $activeClass = $isFirst ? 'active image-loaded' : '';
                                        $rawUrl = $mItem['url'] ?? '';
                                        if (!empty($rawUrl) && !str_starts_with($rawUrl, 'http://') && !str_starts_with($rawUrl, 'https://') && !empty($appUrl)) {
                                            if (!str_starts_with($rawUrl, $appUrl)) {
                                                $rawUrl = rtrim($appUrl, '/') . (str_starts_with($rawUrl, '/') ? '' : '/') . $rawUrl;
                                            }
                                        }
                                        $mUrl = htmlspecialchars($rawUrl);
                                        if (($mItem['type'] ?? '') === 'video'): ?>
                                            <video src="<?php echo $mUrl; ?>" 
                                                   class="component-gallery-card__image component-gallery-media-item component-gallery-card__video <?php echo $activeClass; ?>" 
                                                   muted 
                                                   playsinline 
                                                   loop 
                                                   preload="metadata" 
                                                   data-media-index="<?php echo $mIdx; ?>"></video>
                                        <?php else: ?>
                                            <img src="<?php echo $mUrl; ?>" 
                                                 alt="<?php echo $sponsorName; ?>" 
                                                 class="component-gallery-card__image component-gallery-media-item <?php echo $activeClass; ?>" 
                                                 loading="lazy" 
                                                 decoding="async" 
                                                 onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png';" 
                                                 data-media-index="<?php echo $mIdx; ?>">
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </div>

                                <div class="component-badge component-badge--glass component-badge--absolute-tl">
                                    <span class="material-symbols-rounded component-icon--14">verified</span>
                                    <span><?php echo __('sponsored', 'Patrocinado'); ?></span>
                                </div>

                                <div class="component-badge component-badge--glass component-badge--absolute-tr">
                                    <span class="material-symbols-rounded component-icon--14">business</span>
                                    <span><?php echo $sponsorName; ?></span>
                                </div>

                                <?php if ($hasMultiple): ?>
                                    <div class="component-gallery-dots">
                                        <?php foreach ($mediaList as $dIdx => $dItem): ?>
                                            <span class="component-gallery-dot <?php echo $dIdx === 0 ? 'active' : ''; ?>" data-index="<?php echo $dIdx; ?>"></span>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>

                                <div class="component-gallery-link" <?php echo $linkActionAttr; ?>>
                                    <h3 class="component-gallery-title"><?php echo $description; ?></h3>
                                </div>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>
