<?php

use App\Api\Services\Publications\PublicationsService;
use App\Core\Helpers\Utils;

global $container;
$pubService = $container ? $container->get(PublicationsService::class) : null;

$pubId = $_GET['id'] ?? ($_GET['uuid'] ?? '');
$pubData = null;

if ($pubService && !empty($pubId)) {
    $res = $pubService->getDetail($pubId);
    if ($res['success'] && isset($res['data'])) {
        $pubData = $res['data'];
    }
}

if (!$pubData):
?>
<div class="view-content">
    <div class="component-wrapper">
        <?php echo \App\Core\Helpers\Utils::renderEmptyState([
            'type' => 'search',
            'title' => __('publications.not_found'),
            'message' => 'La publicación que buscas no existe o ha sido eliminada.',
            'actions' => '<button type="button" class="component-button component-button--primary component-button--h38" data-nav="/"><span class="material-symbols-rounded">home</span><span>' . __('home') . '</span></button>'
        ]); ?>
    </div>
</div>
<?php
return;
endif;

$author = $pubData['author'];
$isLiked = $pubData['is_liked'];
$isOwner = $pubData['is_owner'];
$isLoggedIn = !empty($_SESSION['user_id']);
$dateFormatted = date('d M Y', strtotime($pubData['created_at']));
$subBg = $author['subscription_color'] ?? 'var(--text-muted)';
?>

<div class="view-content component-publication-viewer-page" 
     data-publication-uuid="<?php echo htmlspecialchars($pubData['uuid']); ?>"
     data-image-url="<?php echo htmlspecialchars($pubData['image_url']); ?>"
     data-width="<?php echo $pubData['width']; ?>"
     data-height="<?php echo $pubData['height']; ?>">

    <div class="component-wrapper component-wrapper--full no-padding" data-ref="design-wrapper">
        
        <!-- Top Toolbar / Info -->
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo htmlspecialchars($pubData['title']); ?></h1>
            </div>

            <div class="component-top-right">
                <div class="component-actions active">
                    <?php if ($isLoggedIn): ?>
                        <button type="button" class="component-button component-button--h34 btn-favorite <?php echo $isLiked ? 'is-favorite' : ''; ?>" data-action="togglePublicationLike" data-uuid="<?php echo htmlspecialchars($pubData['uuid']); ?>" data-tooltip="<?php echo __('publications.like'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded component-icon--20">favorite</span>
                            <span data-ref="top-like-count"><?php echo number_format($pubData['likes_count']); ?></span>
                        </button>
                    <?php else: ?>
                        <div class="component-badge">
                            <span class="material-symbols-rounded component-text-accent">favorite</span>
                            <span><?php echo number_format($pubData['likes_count']); ?></span>
                        </div>
                    <?php endif; ?>

                    <button type="button" class="component-button component-button--icon component-button--h34" data-action="copyPublicationLink" data-tooltip="<?php echo __('btn_share'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">share</span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h34" data-action="downloadArtwork" data-tooltip="<?php echo __('btn_download'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">download</span>
                    </button>

                    <?php if ($isOwner): ?>
                        <button type="button" class="component-button component-button--icon component-button--h34 component-button--danger" data-action="deletePublication" data-uuid="<?php echo htmlspecialchars($pubData['uuid']); ?>" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Main Surface -->
        <div class="component-bottom">
            <canvas class="component-canvas-surface" data-ref="publication-canvas"></canvas>

            <!-- Unified Top Property Bar / Floating Toolbar -->
            <div class="component-tools-wrapper component-tools-wrapper--top component-property-bar-wrapper" data-ref="canvas-top-property-bar-wrapper">
                <div class="component-toolbar component-toolbar--horizontal component-toolbar--top component-property-bar active" data-ref="canvas-top-property-bar">
                    <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="toggleGrid" data-ref="btn-toggle-grid" data-tooltip="<?php echo __('dt_grid'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">grid_on</span>
                    </button>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleMenuInModule" data-module-target="modulePublicationComments" data-menu-target="menu-comments" data-tooltip="<?php echo __('publications.comments'); ?> [C]" data-position="bottom">
                        <span class="material-symbols-rounded">chat</span>
                    </button>

                    <div class="component-property-bar__divider"></div>

                    <button type="button" class="component-button component-button--icon component-button--h32" data-action="downloadArtwork" data-tooltip="<?php echo __('btn_download'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">download</span>
                    </button>
                </div>
            </div>

            <!-- Left Coordinate / Resolution Badges -->
            <div class="component-canvas-badges component-canvas-badges--left" data-ref="badges-left">
                <a href="/@<?php echo htmlspecialchars($author['identifier']); ?>" data-nav="/@<?php echo htmlspecialchars($author['identifier']); ?>" class="component-badge component-badge--interactive" style="text-decoration: none;">
                    <img src="<?php echo htmlspecialchars($author['avatar_url']); ?>" alt="<?php echo htmlspecialchars($author['username']); ?>" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;">
                    <span style="font-weight: 600;"><?php echo htmlspecialchars($author['handle']); ?></span>
                    <span class="component-text-muted">•</span>
                    <span class="component-text-muted"><?php echo htmlspecialchars($dateFormatted); ?></span>
                </a>

                <div class="component-badge" data-badge-id="coords">
                    <span class="material-symbols-rounded">aspect_ratio</span>
                    <span><?php echo $pubData['width']; ?> x <?php echo $pubData['height']; ?> px</span>
                </div>

                <div class="component-badge" data-badge-id="views">
                    <span class="material-symbols-rounded">visibility</span>
                    <span><?php echo number_format($pubData['views_count']); ?> <?php echo __('publications.views'); ?></span>
                </div>

                <?php if (!empty($pubData['description'])): ?>
                <div class="component-badge" style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="<?php echo htmlspecialchars($pubData['description']); ?>">
                    <span class="material-symbols-rounded">info</span>
                    <span><?php echo htmlspecialchars($pubData['description']); ?></span>
                </div>
                <?php endif; ?>
            </div>

            <div class="component-canvas-badges component-canvas-badges--right" data-ref="badges-right"></div>

            <!-- Bottom Dock / Footer -->
            <div class="component-canvas-bottom-dock" data-ref="canvas-bottom-dock">
                <div class="component-canvas-footer" data-ref="canvas-design-footer">
                    <div class="component-canvas-footer-left" data-ref="canvas-design-footer-left">
                        <button type="button" class="component-button component-button--h32" data-action="toggleMenuInModule" data-module-target="modulePublicationComments" data-menu-target="menu-comments" data-tooltip="<?php echo __('publications.comments'); ?>" data-position="top">
                            <span class="material-symbols-rounded">chat</span>
                            <span><?php echo __('publications.comments'); ?> (<span data-ref="footer-comments-count"><?php echo number_format($pubData['comments_count']); ?></span>)</span>
                        </button>
                    </div>

                    <div class="component-canvas-footer-right" data-ref="canvas-design-footer-right">
                        <!-- Zoom Controls identical to design.php -->
                        <div class="component-canvas-footer-group">
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomOutStep" data-tooltip="<?php echo __('lbl_zoom_out'); ?>" data-position="top">
                                <span class="material-symbols-rounded">remove</span>
                            </button>
                            <div class="component-canvas-footer-slider-box">
                                <input type="range" class="component-range component-range--zoom" data-ref="footer-zoom-slider" min="0" max="1000" step="1" value="400" />
                            </div>
                            <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomInStep" data-tooltip="<?php echo __('lbl_zoom_in'); ?>" data-position="top">
                                <span class="material-symbols-rounded">add</span>
                            </button>
                            <button type="button" class="component-canvas-footer-zoom-tag" data-action="resetZoomFit" data-ref="footer-zoom-label" data-tooltip="<?php echo __('lbl_reset_zoom'); ?>" data-position="top">
                                100%
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <?php require_once ROOT_PATH . '/includes/modules/modulePublicationComments.php'; ?>
</div>
