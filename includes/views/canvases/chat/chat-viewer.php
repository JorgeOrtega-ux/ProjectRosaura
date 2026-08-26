<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$chatViewerData = $canvasService->getCanvasChatViewerData($_GET['canvas'] ?? '', $_GET['msg'] ?? '', (int)($_GET['idx'] ?? 0));

extract($chatViewerData);
?>

<div class="view-content" data-ref="chat-viewer-wrapper" data-images='<?php echo htmlspecialchars($attachmentsJson, ENT_QUOTES); ?>' data-idx="<?php echo $idx; ?>">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('lbl_image_viewer'); ?></h1>
        </div>
        <div class="component-top-center"></div>
        <div class="component-top-right">
            <?php if ($totalImages > 0 || $isPending): ?>
            <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo htmlspecialchars(__('lbl_pagination')); ?>" data-position="bottom">
                <div class="component-inline-control__group">
                    <button class="component-inline-control__btn <?php echo $idx === 0 ? 'disabled-interaction' : ''; ?>" data-action="prevImage" data-ref="cv-btn-prev">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>
                </div>
                <div class="component-inline-control__center" data-ref="cv-counter"><?php echo ($idx + 1) . ' / ' . max(1, $totalImages); ?></div>
                <div class="component-inline-control__group">
                    <button class="component-inline-control__btn <?php echo ($idx === $totalImages - 1 || $isPending) ? 'disabled-interaction' : ''; ?>" data-action="nextImage" data-ref="cv-btn-next">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
            </div>
            
            <button class="component-button component-button--icon component-button--h40" data-action="downloadImage" data-ref="cv-btn-download" data-tooltip="<?php echo htmlspecialchars(__('lbl_download_template')); ?>" data-position="bottom">
                <span class="material-symbols-rounded">download</span>
            </button>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="component-bottom">
        <?php if ($errorMsg): ?>
            <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                'type' => 'error',
                'title' => __('error_title') ?? 'Error',
                'message' => $errorMsg
            ]); ?>
        <?php elseif ($totalImages > 0 || $isPending): ?>
            <div class="component-image-viewer-container">
                <img data-ref="cv-main-image" class="component-image-viewer-image image-lazy-fade" src="<?php echo $totalImages > 0 ? htmlspecialchars($attachments[$idx]) : ''; ?>"
                     onload="this.classList.add('image-loaded')"
                     onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/assets/img/fallbacks/canvas-default.png'; this.classList.add('image-loaded');">
            </div>
        <?php else: ?>
            <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                'type' => 'snapshots',
                'title' => __('lbl_no_images_title'),
                'message' => __('lbl_no_images_desc') ?? __('lbl_no_images')
            ]); ?>
        <?php endif; ?>
    </div>
</div>
