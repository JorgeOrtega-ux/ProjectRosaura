<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo "<div class='view-content'><p>".__('err_unauthorized')."</p></div>";
    return;
}

$canvasUuid = $_GET['uuid'] ?? null;
$canvasId = null;
$pendingRequests = [];

if ($canvasUuid) {
    try {
        $db = new DatabaseManager();
        $pdo = $db->getConnection(defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');
        
        $stmt = $pdo->prepare("SELECT id FROM canvases WHERE uuid = :uuid LIMIT 1");
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvasId = (int)$stmt->fetchColumn();
        if ($canvasId) {
            $stmtReq = $pdo->prepare("SELECT id, user_id, status, created_at FROM canvas_access_requests WHERE canvas_id = :cid AND status = 'pending' ORDER BY created_at ASC");
            $stmtReq->execute(['cid' => $canvasId]);
            $pendingRequests = $stmtReq->fetchAll(\PDO::FETCH_ASSOC);
        }
    } catch (\Exception $e) {
    }
}

if (!$canvasId) {
    echo "<div class='view-content'><p>".__('err_invalid_canvas_id')."</p></div>";
    return;
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-ref="canvas-requests-container">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_requests_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="approveSelectedRequests" data-tooltip="<?php echo __('tooltip_approve_request'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">check_circle</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="rejectSelectedRequests" data-tooltip="<?php echo __('tooltip_reject_request'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">cancel</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectRequest" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_user'); ?></th>
                            <th><?php echo __('table_header_date'); ?></th>
                            <th><?php echo __('table_header_status'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="requests-table-body">
                        <?php if (empty($pendingRequests)): ?>
                            <tr data-ref="empty-requests-table">
                                <td colspan="3" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                                        <p class="component-empty-state-text" data-ref="empty-state-text"><?php echo __('canvases_requests_empty'); ?></p>
                                    </div>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($pendingRequests as $req): ?>
                                <tr data-request-id="<?php echo htmlspecialchars($req['id']); ?>">
                                    <td>
                                        <div>
                                            <span data-user-id="<?php echo htmlspecialchars($req['user_id']); ?>">
                                                <?php echo __('lbl_user'); ?> #<?php echo htmlspecialchars($req['user_id']); ?>
                                            </span>
                                        </div>
                                    </td>
                                    <td><?php echo htmlspecialchars(date('Y-m-d H:i', strtotime($req['created_at']))); ?></td>
                                    <td>
                                        <div>
                                            <span class="status-badge">
                                                <?php echo __('status_pending'); ?>
                                            </span>
                                            <input type="checkbox" class="request-checkbox" value="<?php echo htmlspecialchars($req['id']); ?>">
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>