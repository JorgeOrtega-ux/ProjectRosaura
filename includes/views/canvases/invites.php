<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';

$canvasId = null;
$canvasOwnerId = null;

if ($canvasUuid) {
    try {
        $pdoCanvases = $db->getConnection($connNameCanvases);
        $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
        $stmt->execute(['uuid' => $canvasUuid]);
        $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($canvasData) {
            $canvasId = (int)$canvasData['id'];
            $canvasOwnerId = (int)$canvasData['owner_id'];
        }
    } catch (\Exception $e) {
    }
}

if (!$userId || !$canvasId) {
    echo "<div class='view-content'><p>Lienzo no encontrado o sin acceso.</p></div>";
    return;
}

$invites = [];
try {
    $stmt = $pdoCanvases->prepare("
        SELECT * 
        FROM canvas_invites 
        WHERE canvas_id = :cid 
        ORDER BY created_at DESC
    ");
    $stmt->execute(['cid' => $canvasId]);
    $invites = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" style="position: relative;">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-invites-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title">Gestión de Invitaciones</h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="copySelectedInvite" data-tooltip="Copiar código" data-position="bottom">
                        <span class="material-symbols-rounded">content_copy</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="revokeSelectedInvites" data-tooltip="Revocar selección" data-position="bottom">
                        <span class="material-symbols-rounded">delete_forever</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40" data-action="deselectInvite" data-tooltip="Cancelar selección" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button data-nav="<?php echo htmlspecialchars($appUrl); ?>/canvases/manage/invites/generate/<?php echo htmlspecialchars($canvasUuid); ?>" class="component-button component-button--icon component-button--h40 component-button--primary" data-tooltip="Generar Invitación" data-position="bottom">
                        <span class="material-symbols-rounded">add_link</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Rol</th>
                            <th>Usos</th>
                            <th>Expiración</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($invites): ?>
                            <?php foreach ($invites as $invite): ?>
                                <?php 
                                    $isExpired = $invite['expires_at'] && strtotime($invite['expires_at']) <= time();
                                    $isMaxed = $invite['max_uses'] !== null && $invite['uses_count'] >= $invite['max_uses'];
                                    $statusClass = ($isExpired || $isMaxed) ? 'text-gray-500' : 'text-green-500';
                                ?>
                                <tr class="component-table-row <?php echo ($isExpired || $isMaxed) ? 'opacity-50' : ''; ?>" data-action="selectInvite" data-invite-id="<?php echo htmlspecialchars($invite['id']); ?>" data-invite-code="<?php echo htmlspecialchars($invite['code']); ?>">
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">key</span>
                                            <span class="font-medium"><?php echo htmlspecialchars($invite['code']); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $invite['role'] === 'admin' ? 'shield' : 'person'; ?></span>
                                            <span><?php echo htmlspecialchars(ucfirst($invite['role'])); ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">group</span>
                                            <span><?php echo $invite['uses_count']; ?> / <?php echo $invite['max_uses'] ?? '∞'; ?></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm <?php echo $statusClass; ?>">
                                            <span class="material-symbols-rounded">schedule</span>
                                            <span><?php echo $invite['expires_at'] ? date('d/m/Y H:i', strtotime($invite['expires_at'])) : 'Nunca'; ?></span>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">link_off</span>
                                        <p class="component-empty-state-text">No hay invitaciones activas para este lienzo.</p>
                                    </div>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>


