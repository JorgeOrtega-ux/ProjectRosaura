<?php
// includes/views/canvases/requests.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;

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

        // Consulta a nivel de servidor de las peticiones pendientes
        if ($canvasId) {
            $stmtReq = $pdo->prepare("SELECT id, user_id, status, created_at FROM canvas_access_requests WHERE canvas_id = :cid AND status = 'pending' ORDER BY created_at ASC");
            $stmtReq->execute(['cid' => $canvasId]);
            $pendingRequests = $stmtReq->fetchAll(\PDO::FETCH_ASSOC);
        }
    } catch (\Exception $e) {
        // Silenciar y atrapar error por si la base de datos o tabla no existe
    }
}

if (!$canvasId) {
    echo "<div class='view-content'><p>".__('err_invalid_canvas_id')."</p></div>";
    return;
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" style="position: relative;" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-ref="canvas-requests-container">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left" style="display: flex; align-items: center; gap: 12px;">
                <h1 class="component-top-title"><?php echo __('canvases_requests_title') ?: 'Solicitudes de Acceso al Lienzo'; ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="approveSelectedRequests" data-tooltip="<?php echo __('tooltip_approve_request') ?: 'Aceptar solicitud'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded" style="color: var(--success-color, #10b981);">check_circle</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="rejectSelectedRequests" data-tooltip="<?php echo __('tooltip_reject_request') ?: 'Rechazar solicitud'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded" style="color: var(--danger-color, #ef4444);">cancel</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectRequest" data-tooltip="<?php echo __('tooltip_cancel_selection') ?: 'Cancelar selección'; ?>" data-position="bottom">
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
                            <th><?php echo __('table_header_user') ?: 'Usuario Solicitante'; ?></th>
                            <th><?php echo __('table_header_date') ?: 'Fecha de Solicitud'; ?></th>
                            <th><?php echo __('table_header_status') ?: 'Estado'; ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="requests-table-body">
                        <?php if (empty($pendingRequests)): ?>
                            <tr class="disabled" data-ref="empty-requests-table" style="display: table-row;">
                                <td colspan="3" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">inbox</span>
                                        <p class="component-empty-state-text" data-ref="empty-state-text"><?php echo __('canvases_requests_empty') ?: 'No hay solicitudes pendientes en este momento.'; ?></p>
                                    </div>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($pendingRequests as $req): ?>
                                <tr data-request-id="<?php echo htmlspecialchars($req['id']); ?>">
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span data-user-id="<?php echo htmlspecialchars($req['user_id']); ?>">
                                                Usuario #<?php echo htmlspecialchars($req['user_id']); ?>
                                            </span>
                                        </div>
                                    </td>
                                    <td><?php echo htmlspecialchars(date('Y-m-d H:i', strtotime($req['created_at']))); ?></td>
                                    <td>
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <span class="status-badge" style="background-color: var(--warning-bg, rgba(245,158,11,0.1)); color: var(--warning-color, #f59e0b); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                                                <?php echo __('status_pending') ?: 'Pendiente'; ?>
                                            </span>
                                            <input type="checkbox" class="request-checkbox" value="<?php echo htmlspecialchars($req['id']); ?>" style="margin-left: 10px; cursor: pointer;">
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