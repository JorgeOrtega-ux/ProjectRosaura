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

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="rejectSelectedRequests" data-tooltip="<?php echo __('tooltip_reject_request'); ?>" data-position="bottom">
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
                                <tr class="component-table-row clickable" data-action="selectRequest" data-request-id="<?php echo htmlspecialchars($req['id']); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person</span>
                                                <span><?php echo !empty($req['username']) ? htmlspecialchars($req['username']) : __('lbl_user') . ' #' . htmlspecialchars($req['user_id']); ?></span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">calendar_today</span>
                                            <span><?php echo htmlspecialchars(date('d/m/Y', strtotime($req['created_at']))); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm component-badge--warning">
                                            <span class="material-symbols-rounded">pending</span>
                                            <span><?php echo __('status_pending'); ?></span>
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