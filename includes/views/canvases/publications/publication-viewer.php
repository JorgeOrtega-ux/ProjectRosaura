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
        <div class="component-empty-state" style="padding: 80px 20px; text-align: center;">
            <span class="material-symbols-rounded" style="font-size: 64px; color: var(--text-muted);">broken_image</span>
            <h2 class="component-page-title" style="margin-top: 16px;"><?php echo __('publications.not_found'); ?></h2>
            <p class="component-page-description">La publicación que buscas no existe o ha sido eliminada.</p>
            <div style="margin-top: 24px;">
                <button type="button" class="component-button component-button--primary component-button--h38" data-nav="/">
                    <span class="material-symbols-rounded">home</span>
                    <span><?php echo __('home'); ?></span>
                </button>
            </div>
        </div>
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

    <div class="component-wrapper component-wrapper--full no-padding" data-ref="viewer-wrapper">
        
        <!-- Top Toolbar / Info -->
        <div class="component-top" style="z-index: 20;">
            <div class="component-top-left" style="display: flex; align-items: center; gap: 14px;">
                <button type="button" class="component-button component-button--icon component-button--h34" data-action="goBackOrHome" data-tooltip="<?php echo __('link_go_back'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>

                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <h1 class="component-top-title" style="font-size: 1.1rem; line-height: 1.2;"><?php echo htmlspecialchars($pubData['title']); ?></h1>
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <a href="/@<?php echo htmlspecialchars($author['identifier']); ?>" data-nav="/@<?php echo htmlspecialchars($author['identifier']); ?>" class="component-publication-author" style="gap: 6px;">
                            <img src="<?php echo htmlspecialchars($author['avatar_url']); ?>" alt="<?php echo htmlspecialchars($author['username']); ?>" class="component-publication-author__avatar" style="width: 18px; height: 18px;">
                            <span class="component-publication-author__handle" style="font-size: 0.75rem;"><?php echo htmlspecialchars($author['handle']); ?></span>
                        </a>
                        <span class="component-text-muted" style="font-size: 0.7rem;">•</span>
                        <span class="component-text-muted" style="font-size: 0.7rem;"><?php echo htmlspecialchars($dateFormatted); ?></span>
                    </div>
                </div>
            </div>

            <div class="component-top-right" style="display: flex; align-items: center; gap: 8px;">
                <?php if ($isLoggedIn): ?>
                    <button type="button" class="component-button component-button--h34 btn-favorite <?php echo $isLiked ? 'is-favorite' : ''; ?>" data-action="togglePublicationLike" data-uuid="<?php echo htmlspecialchars($pubData['uuid']); ?>">
                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                        <span data-ref="top-like-count"><?php echo number_format($pubData['likes_count']); ?></span>
                    </button>
                <?php else: ?>
                    <div class="component-badge component-badge--glass">
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
                    <button type="button" class="component-button component-button--icon component-button--h34 component-text-danger" data-action="deletePublication" data-uuid="<?php echo htmlspecialchars($pubData['uuid']); ?>" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                <?php endif; ?>
            </div>
        </div>

        <!-- Main Surface -->
        <div class="component-bottom" style="position: relative; flex: 1; overflow: hidden;">
            <canvas class="component-canvas-surface" data-ref="publication-canvas"></canvas>

            <!-- Bottom Floating Toolbar -->
            <div class="canvas-design-toolbar active" data-ref="viewer-toolbar" style="z-index: 30;">
                <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomIn" data-tooltip="<?php echo __('lbl_zoom_in'); ?>" data-position="top">
                    <span class="material-symbols-rounded">zoom_in</span>
                </button>
                <button type="button" class="component-button component-button--icon component-button--h32" data-action="zoomOut" data-tooltip="<?php echo __('lbl_zoom_out'); ?>" data-position="top">
                    <span class="material-symbols-rounded">zoom_out</span>
                </button>
                <button type="button" class="component-button component-button--icon component-button--h32" data-action="resetZoom" data-tooltip="<?php echo __('lbl_reset_zoom'); ?>" data-position="top">
                    <span class="material-symbols-rounded">center_focus_strong</span>
                </button>
                <button type="button" class="component-button component-button--icon component-button--h32 active" data-action="toggleGrid" data-tooltip="<?php echo __('dt_grid'); ?>" data-position="top">
                    <span class="material-symbols-rounded">grid_on</span>
                </button>

                <div class="component-badge-divider" style="height: 20px;"></div>

                <!-- Botón de Comentarios -->
                <button type="button" class="component-button component-button--h32" data-action="toggleCommentsDrawer" data-tooltip="<?php echo __('publications.comments'); ?>" data-position="top">
                    <span class="material-symbols-rounded">chat</span>
                    <span><?php echo __('publications.comments'); ?> (<span data-ref="toolbar-comments-count"><?php echo number_format($pubData['comments_count']); ?></span>)</span>
                </button>

                <button type="button" class="component-button component-button--icon component-button--h32" data-action="downloadArtwork" data-tooltip="<?php echo __('btn_download'); ?>" data-position="top">
                    <span class="material-symbols-rounded">download</span>
                </button>
            </div>

            <!-- Left Coordinate / Resolution Badges -->
            <div class="canvas-badges-left" data-ref="badges-left" style="z-index: 30;">
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
        </div>
    </div>

    <!-- Slide-out Comments Module Drawer -->
    <div class="component-comments-module" data-ref="comments-drawer">
        <div class="component-comments-header">
            <div class="component-comments-title">
                <span class="material-symbols-rounded">chat</span>
                <span><?php echo __('publications.comments'); ?> (<span data-ref="drawer-comments-count"><?php echo number_format($pubData['comments_count']); ?></span>)</span>
            </div>
            <button type="button" class="component-button component-button--icon component-button--h32" data-action="toggleCommentsDrawer">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>

        <div class="component-comments-list" data-ref="comments-list">
            <!-- Dynamic comments list will be rendered here -->
            <div class="component-empty-state" data-ref="comments-loading" style="padding: 40px 20px; text-align: center;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: var(--text-muted);">hourglass_top</span>
                <p class="component-text-muted" style="font-size: 0.8rem; margin-top: 8px;">Cargando comentarios...</p>
            </div>
        </div>

        <div class="component-comments-composer">
            <?php if ($isLoggedIn): ?>
                <div class="component-comments-composer__input-wrapper">
                    <textarea data-ref="input-comment" placeholder="<?php echo __('publications.write_comment'); ?>" rows="2" maxlength="1000"></textarea>
                    <button type="button" class="component-button component-button--primary component-button--icon component-button--h36" data-action="submitComment" data-tooltip="<?php echo __('publications.btn_comment'); ?>">
                        <span class="material-symbols-rounded">send</span>
                    </button>
                </div>
            <?php else: ?>
                <div style="text-align: center; padding: 6px 0;">
                    <p class="component-text-muted" style="font-size: 0.8rem; margin-bottom: 8px;">Inicia sesión para dejar un comentario.</p>
                    <button type="button" class="component-button component-button--primary component-button--full component-button--h34" data-nav="/login">
                        <span class="material-symbols-rounded">login</span>
                        <span><?php echo __('link_login'); ?></span>
                    </button>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="component-comments-module__backdrop" data-action="toggleCommentsDrawer"></div>
</div>
