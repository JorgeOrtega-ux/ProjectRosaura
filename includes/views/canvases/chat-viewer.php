<?php
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$canvasUuid = $_GET['canvas'] ?? '';
$msgIdRaw = $_GET['msg'] ?? '';
$msgId = (int)$msgIdRaw;
$isPending = (strpos($msgIdRaw, 'pending_') === 0);
$idx = (int)($_GET['idx'] ?? 0);

$hasAccess = false;
$attachments = [];
$errorMsg = null;

global $sessionManager;
$userId = $sessionManager && $sessionManager->isLoggedIn() ? $sessionManager->getActiveAccountId() : null;

if ($userId && !empty($canvasUuid) && ($msgId > 0 || $isPending)) {
    try {
        $dbManager = new DatabaseManager();
        $pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        
        $stmt = $pdo->prepare("SELECT id, privacy, owner_id FROM " . DB::TBL_CANVASES . " WHERE uuid = ?");
        $stmt->execute([$canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($canvas) {
            $canvasId = (int)$canvas['id'];
            if ($canvas['privacy'] !== 'private' || $canvas['owner_id'] == $userId) {
                $hasAccess = true;
            } else {
                $stmt = $pdo->prepare("SELECT id FROM canvas_user_roles WHERE canvas_id = ? AND user_id = ? LIMIT 1");
                $stmt->execute([$canvasId, $userId]);
                if ($stmt->fetch()) {
                    $hasAccess = true;
                }
            }
        }
        
        if ($hasAccess) {
            if ($isPending) {
                $attachments = [];
            } else {
                $stmt = $pdo->prepare("SELECT attachments FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
                $stmt->execute([$msgId, $canvasId]);
                $msg = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($msg && !empty($msg['attachments'])) {
                    $decoded = is_string($msg['attachments']) ? json_decode($msg['attachments'], true) : $msg['attachments'];
                    if (is_array($decoded)) {
                        foreach ($decoded as $att) {
                            if (strpos($att, '/public/') === 0) {
                                $attachments[] = $att;
                            } else {
                                $attachments[] = '/api/index.php?route=chat.attachment&canvas_uuid=' . $canvasUuid . '&file=' . urlencode(basename($att));
                            }
                        }
                    }
                } else {
                    $errorMsg = __('err_msg_no_attachments');
                }
            }
        } else {
            $errorMsg = __('err_no_permission_images');
        }
    } catch (\Exception $e) {
        $errorMsg = __('err_load_image');
    }
} else {
    $errorMsg = __('err_invalid_params');
}

$totalImages = count($attachments);
if ($idx < 0 || $idx >= $totalImages) $idx = 0;
$attachmentsJson = json_encode($attachments);
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
                    <button class="component-inline-control__btn <?php echo $idx === 0 ? 'disabled-interaction' : ''; ?>" id="cv-btn-prev">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>
                </div>
                <div class="component-inline-control__center" id="cv-counter"><?php echo ($idx + 1) . ' / ' . max(1, $totalImages); ?></div>
                <div class="component-inline-control__group">
                    <button class="component-inline-control__btn <?php echo ($idx === $totalImages - 1 || $isPending) ? 'disabled-interaction' : ''; ?>" id="cv-btn-next">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
            </div>
            
            <button class="component-button component-button--icon component-button--h40" id="cv-btn-download" data-tooltip="<?php echo htmlspecialchars(__('lbl_download_template')); ?>" data-position="bottom">
                <span class="material-symbols-rounded">download</span>
            </button>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="component-bottom">
        <?php if ($errorMsg): ?>
            <div><?php echo htmlspecialchars($errorMsg); ?></div>
        <?php elseif ($totalImages > 0 || $isPending): ?>
            <div class="component-image-viewer-container">
                <img id="cv-main-image" class="component-image-viewer-image" src="<?php echo $totalImages > 0 ? htmlspecialchars($attachments[$idx]) : ''; ?>">
            </div>
        <?php else: ?>
            <div><?php echo __('lbl_no_images'); ?></div>
        <?php endif; ?>
    </div>
</div>
