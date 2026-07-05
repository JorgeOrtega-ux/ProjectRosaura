<?php
// includes/views/canvases/invites.php
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
        SELECT i.*, u.username as creator_name 
        FROM canvas_invites i
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.canvas_id = :cid 
        ORDER BY i.created_at DESC
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
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--primary" data-action="openGenerateInviteModal">
                        <span class="material-symbols-rounded">add_link</span>
                        Generar Invitación
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
                            <th>Acciones</th>
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
                                <tr class="component-table-row <?php echo ($isExpired || $isMaxed) ? 'opacity-50' : ''; ?>">
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
                                    <td>
                                        <button class="component-button component-button--icon component-button--h40" data-action="copyInviteCode" data-code="<?php echo htmlspecialchars($invite['code']); ?>" data-tooltip="Copiar código" data-position="bottom">
                                            <span class="material-symbols-rounded">content_copy</span>
                                        </button>
                                        <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="revokeInvite" data-id="<?php echo htmlspecialchars($invite['id']); ?>" data-tooltip="Revocar" data-position="bottom">
                                            <span class="material-symbols-rounded">delete_forever</span>
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="5" class="component-empty-table-cell">
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

<!-- Modal para generar invitación -->
<div class="component-modal disabled" data-ref="modal-generate-invite">
    <div class="component-modal-content" style="max-width: 500px;">
        <div class="component-modal-header">
            <h2 class="component-modal-title">Generar nueva invitación</h2>
            <button class="component-button component-button--icon" data-action="closeModal">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="component-modal-body">
            <form id="form-generate-invite" class="component-form">
                <div class="component-form-group">
                    <label class="component-label">Rol a otorgar</label>
                    <div class="component-input-container">
                        <select name="role" class="component-input" required>
                            <option value="viewer">Visualizador (Viewer)</option>
                            <option value="editor">Editor (Editor)</option>
                            <option value="admin">Administrador (Admin)</option>
                        </select>
                    </div>
                </div>
                
                <div class="component-form-group">
                    <label class="component-label">Límite de usos (Opcional)</label>
                    <div class="component-input-container">
                        <span class="material-symbols-rounded component-input-icon">group</span>
                        <input type="number" name="max_uses" class="component-input component-input--with-icon" placeholder="Ej: 5 (Dejar vacío para ilimitado)" min="1">
                    </div>
                </div>
                
                <div class="component-form-group">
                    <label class="component-label">Fecha de expiración (Opcional)</label>
                    <div class="component-input-container">
                        <span class="material-symbols-rounded component-input-icon">event</span>
                        <input type="datetime-local" name="expires_at" class="component-input component-input--with-icon">
                    </div>
                </div>
            </form>
        </div>
        <div class="component-modal-footer" style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px;">
            <button class="component-button" data-action="closeModal">Cancelar</button>
            <button class="component-button component-button--primary" data-action="submitGenerateInvite">Generar</button>
        </div>
    </div>
</div>
