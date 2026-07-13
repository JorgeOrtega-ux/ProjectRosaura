<?php

use App\Config\Database\DatabaseManager;
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
            $errorMessage = __('err_canvas_not_found');
        } else {
            $canvasName = $canvas['name'];
            $isAuthorized = true;

            $userId = $_SESSION['user_id'] ?? null;
            $isOwner = ($canvas['owner_id'] == $userId);
            $isPrivileged = isset($_SESSION['user_permissions']) && in_array('access_admin_panel', $_SESSION['user_permissions']);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE) {
                $isMember = false;

                if ($userId && !$isOwner) {
                    $memberStmt = $db->prepare('SELECT role FROM canvas_members WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1');
                    $memberStmt->execute([':canvas_id' => $canvas['id'], ':user_id' => $userId]);
                    $isMember = (bool) $memberStmt->fetch(PDO::FETCH_ASSOC);
                }

                if (!$isOwner && !$isMember && !$isPrivileged) {
                    $isAuthorized = false;
                    $error = true;
                    $errorMessage = __('err_unauthorized');
                    $errorIcon = 'lock';
                }
            }

            if ($isAuthorized) {
                $userIdParam = $_SESSION['user_id'] ?? 0;
                $privacyCondition = '';
                if (!$isOwner && !$isPrivileged) {
                    $privacyCondition = ' AND s.privacy = \'public\'';
                }

                $stmtHist = $db->prepare('
                    SELECT s.id, s.file_path, s.snapshot_uuid, s.created_at, s.privacy,
                           (SELECT COUNT(*) FROM canvas_snapshots_likes l WHERE l.snapshot_id = s.id) as likes_count,
                           (SELECT COUNT(*) FROM canvas_snapshots_likes l WHERE l.snapshot_id = s.id AND l.user_id = :user_id) as user_liked
                    FROM canvas_snapshots_history s
                    WHERE s.canvas_id = :canvas_id' . $privacyCondition . '
                    ORDER BY s.created_at DESC
                ');
                $stmtHist->execute([':canvas_id' => $canvas['id'], ':user_id' => $userIdParam]);
                $history = $stmtHist->fetchAll(PDO::FETCH_ASSOC);

                foreach ($history as $item) {
                    $imageUrl = $item['file_path'];
                    $imageUrl = \App\Core\Helpers\Utils::getS3PublicUrl($imageUrl);
                    $snapshots[] = [
                        'id' => $item['id'],
                        'url' => $imageUrl,
                        'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                        'snapshot_uuid' => $item['snapshot_uuid'],
                        'privacy' => $item['privacy'],
                        'likes_count' => $item['likes_count'],
                        'user_liked' => $item['user_liked'] > 0
                    ];
                }
            }
        }
    } catch (Exception $e) {
        $error = true;
        $errorMessage = __('err_load_snapshots');
    }
} else {
    $error = true;
    $errorMessage = __('err_canvas_uuid_missing');
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
                                 alt="<?php echo $nameLabel; ?>"
                                 class="component-gallery-card__image"
                                 loading="lazy"
                                 decoding="async"
                                 onerror="this.src='<?php echo htmlspecialchars($fallbackImg); ?>'">
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
                                    <span>Privado</span>
                                </div>
                                <?php endif; ?>
                            </div>
                            <div data-nav="<?php echo $viewUrl; ?>" class="component-gallery-link">
                                <h3 class="component-gallery-title"><?php echo $nameLabel; ?></h3>
                            </div>

                            <div class="component-gallery-actions-wrapper component-dropdown-wrapper">
                                <div class="component-gallery-actions">
                                    <?php $isLikedClass = $snapshot['user_liked'] ? 'is-favorite' : ''; ?>
                                    <button type="button" class="component-button component-button--icon component-button--h32 btn-favorite <?php echo $isLikedClass; ?>" data-action="toggleSnapshotLike" data-id="<?php echo $snapshot['snapshot_uuid']; ?>">
                                        <span class="material-symbols-rounded component-icon--20">favorite</span>
                                    </button>
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
                                            
                                            <button type="button" class="component-menu-link component-text-notice--danger" data-action="deleteSnapshot" data-id="<?php echo $snapshot['snapshot_uuid']; ?>" data-card-id="<?php echo $snapshot['id']; ?>">
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
