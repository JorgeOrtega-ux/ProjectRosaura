<?php
use App\Api\Services\Canvas\CanvasViewService;

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
                    <p class="component-empty-state-text"><?php echo __('empty_snapshots_gallery'); ?></p>
                </div>
            <?php else: ?>
                <div class="component-grid" data-ref="gallery-grid">
                    <?php foreach ($snapshots as $snapshot): ?>
                        <?php
                        $imageUrl = htmlspecialchars($snapshot['url']);
                        $viewUrl = $appUrl . '/snapshot/view/' . htmlspecialchars($snapshot['snapshot_uuid']);
                        $dateLabel = htmlspecialchars($snapshot['date']);
                        $nameLabel = htmlspecialchars($canvasName);
                        ?>
                        <div class="component-gallery-card">
                            <img src="<?php echo $imageUrl; ?>" 
                                 alt="<?php echo __('alt_snapshot'); ?>" 
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
                                
                                <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed disabled" data-module="snapshot-menu-<?php echo $snapshot['id']; ?>">
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
                                                <div class="component-menu-link-text"><span><?php echo __('delete_snapshot'); ?></span></div>
                                            </button>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>
