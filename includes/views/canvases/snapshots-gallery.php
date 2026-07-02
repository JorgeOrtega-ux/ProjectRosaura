<?php
// includes/views/canvases/snapshots-gallery.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$uuid = $_GET['uuid'] ?? null;
$snapshots = [];
$canvasName = __('default_canvas_name');
$error = false;
$errorMessage = '';
$errorIcon = 'error';

$appUrl = defined('APP_URL') ? APP_URL : '';
$fallbackImg = $appUrl . '/assets/img/fallbacks/canvas-default.png';

if ($uuid) {
    try {
        $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);

        $stmt = $db->prepare('SELECT id, name, privacy, owner_id FROM ' . DB::TBL_CANVASES . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute([':uuid' => $uuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas) {
            $error = true;
            $errorMessage = __('err_canvas_not_found') ?: 'El lienzo especificado no existe o fue eliminado.';
        } else {
            $canvasName = $canvas['name'];
            $isAuthorized = true;

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE) {
                $userId = $_SESSION['user_id'] ?? null;
                $isOwner = ($canvas['owner_id'] == $userId);
                $isMember = false;

                if ($userId && !$isOwner) {
                    $memberStmt = $db->prepare('SELECT role FROM canvas_members WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1');
                    $memberStmt->execute([':canvas_id' => $canvas['id'], ':user_id' => $userId]);
                    $isMember = (bool) $memberStmt->fetch(PDO::FETCH_ASSOC);
                }

                $isPrivileged = isset($_SESSION['user_permissions']) && in_array('access_admin_panel', $_SESSION['user_permissions']);

                if (!$isOwner && !$isMember && !$isPrivileged) {
                    $isAuthorized = false;
                    $error = true;
                    $errorMessage = __('err_unauthorized') ?: 'No tienes los permisos necesarios para ver el historial de este lienzo privado.';
                    $errorIcon = 'lock';
                }
            }

            if ($isAuthorized) {
                $stmtHist = $db->prepare('
                    SELECT id, file_path, snapshot_uuid, created_at
                    FROM canvas_snapshots_history
                    WHERE canvas_id = :canvas_id
                    ORDER BY created_at DESC
                ');
                $stmtHist->execute([':canvas_id' => $canvas['id']]);
                $history = $stmtHist->fetchAll(PDO::FETCH_ASSOC);

                foreach ($history as $item) {
                    $imageUrl = $item['file_path'];
                    if (!str_starts_with($imageUrl, '/')) {
                        $imageUrl = '/' . $imageUrl;
                    }
                    $snapshots[] = [
                        'id' => $item['id'],
                        'url' => $imageUrl,
                        'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                        'snapshot_uuid' => $item['snapshot_uuid'],
                    ];
                }
            }
        }
    } catch (Exception $e) {
        $error = true;
        $errorMessage = __('err_load_snapshots') ?: 'Ocurrió un error al cargar la información desde el servidor.';
    }
} else {
    $error = true;
    $errorMessage = __('err_canvas_uuid_missing') ?: 'Falta el identificador del lienzo en la solicitud.';
}

$galleryTitle = str_replace('{name}', $canvasName, __('snapshots_gallery_title'));
if ($error) {
    $galleryTitle = __('snapshots_gallery_title_error');
}
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

        <div class="component-bottom" style="padding: 0;" data-ref="dynamic-content-area">
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
                        <div class="component-snapshot-card">
                            <img src="<?php echo $imageUrl; ?>"
                                 alt="<?php echo $nameLabel; ?>"
                                 class="component-snapshot-card__image"
                                 loading="lazy"
                                 decoding="async"
                                 onerror="this.src='<?php echo htmlspecialchars($fallbackImg); ?>'">
                            <div class="component-snapshot-badge">
                                <span class="material-symbols-rounded">history</span>
                                <?php echo $dateLabel; ?>
                            </div>
                            <div data-nav="<?php echo $viewUrl; ?>" class="component-snapshot-link">
                                <h3 class="component-snapshot-title"><?php echo $nameLabel; ?></h3>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>
