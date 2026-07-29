<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$reqData = $canvasService->getCanvasRequestsData($_GET['uuid'] ?? null);

if (!empty($reqData['error'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($reqData);
?>

<div class="view-content" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-ref="canvas-requests-container">
    <div class="component-wrapper component-wrapper--full no-padding">
        
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