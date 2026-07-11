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
                    $errorMsg = "El mensaje no tiene imágenes adjuntas.";
                }
            }
        } else {
            $errorMsg = "No tienes permiso para ver estas imágenes.";
        }
    } catch (\Exception $e) {
        $errorMsg = "Error al cargar la imagen.";
    }
} else {
    $errorMsg = "Parámetros inválidos.";
}

$totalImages = count($attachments);
if ($idx < 0 || $idx >= $totalImages) $idx = 0;
$attachmentsJson = json_encode($attachments);
?>

<div class="view-content" data-ref="chat-viewer-wrapper" data-images='<?php echo htmlspecialchars($attachmentsJson, ENT_QUOTES); ?>' data-idx="<?php echo $idx; ?>">
    <div class="component-top" style="align-items: center;">
        <div class="component-top-left">
            <h1 class="component-top-title">Visor de imágenes</h1>
        </div>
        <div class="component-top-center"></div>
        <div class="component-top-right" style="display: flex; gap: 8px;">
            <?php if ($totalImages > 0 || $isPending): ?>
            <div class="component-inline-control" data-ref="pagination-container" data-tooltip="Paginación" data-position="bottom">
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
            
            <button class="component-button component-button--icon component-button--h40" id="cv-btn-download" data-tooltip="Descargar plantilla" data-position="bottom">
                <span class="material-symbols-rounded">download</span>
            </button>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="component-bottom" style="display: flex; justify-content: center; align-items: center; background: var(--bg-secondary); border-radius: 12px; overflow: hidden; height: calc(100vh - 120px);">
        <?php if ($errorMsg): ?>
            <div style="color: var(--danger-color); padding: 20px;"><?php echo htmlspecialchars($errorMsg); ?></div>
        <?php elseif ($totalImages > 0 || $isPending): ?>
            <img id="cv-main-image" src="<?php echo $totalImages > 0 ? htmlspecialchars($attachments[$idx]) : ''; ?>" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        <?php else: ?>
            <div style="color: var(--text-secondary); padding: 20px;">No hay imágenes para mostrar.</div>
        <?php endif; ?>
    </div>
</div>
