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

if ($canvasUuid) {
    try {
        $db = new DatabaseManager();
        $pdo = $db->getConnection(defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases');
        $stmt = $pdo->prepare("SELECT id FROM canvases WHERE uuid = :uuid LIMIT 1");
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvasId = (int)$stmt->fetchColumn();
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
                        <tr class="disabled" data-ref="empty-requests-table">
                            <td colspan="3" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">hourglass_empty</span>
                                    <p class="component-empty-state-text" data-ref="empty-state-text"><?php echo __('lbl_loading') ?: 'Cargando solicitudes...'; ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>