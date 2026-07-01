<?php
// includes/views/canvases/snapshots-gallery.php

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$uuid = $_GET['uuid'] ?? null;
$snapshots = [];
$canvasName = 'Lienzo no encontrado';
$error = false;
$errorMessage = '';

if ($uuid) {
    try {
        $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);
        
        // 1. Obtener información del lienzo
        $stmt = $db->prepare("SELECT id, name, privacy, owner_id FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1");
        $stmt->execute([':uuid' => $uuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas) {
            $error = true;
            $errorMessage = 'El lienzo especificado no existe o fue eliminado.';
        } else {
            $canvasName = $canvas['name'];
            $isAuthorized = true;
            
            // Si el lienzo es privado, comprobamos la sesión
            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE) {
                // Instancia básica de sesión para recuperar IDs y Permisos
                $userId = $_SESSION['user_id'] ?? null; 
                $isOwner = ($canvas['owner_id'] == $userId);
                $isMember = false;
                
                // Si está logueado pero no es dueño, miramos los roles
                if ($userId && !$isOwner) {
                    $memberStmt = $db->prepare("SELECT role FROM canvas_members WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1");
                    $memberStmt->execute([':canvas_id' => $canvas['id'], ':user_id' => $userId]);
                    $member = $memberStmt->fetch(PDO::FETCH_ASSOC);
                    if ($member) {
                        $isMember = true;
                    }
                }
                
                $isPrivileged = isset($_SESSION['user_permissions']) && in_array('access_admin_panel', $_SESSION['user_permissions']);
                
                if (!$isOwner && !$isMember && !$isPrivileged) {
                    $isAuthorized = false;
                    $error = true;
                    $errorMessage = 'No tienes los permisos necesarios para ver el historial de este lienzo privado.';
                }
            }

            if ($isAuthorized) {
                // Obtener historial de capturas
                $stmtHist = $db->prepare("
                    SELECT id, file_path, snapshot_uuid, created_at 
                    FROM canvas_snapshots_history 
                    WHERE canvas_id = :canvas_id 
                    ORDER BY created_at DESC
                ");
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
                        'snapshot_uuid' => $item['snapshot_uuid']
                    ];
                }
            }
        }
    } catch (Exception $e) {
        $error = true;
        $errorMessage = 'Ocurrió un error al cargar la información desde el servidor.';
    }
} else {
    $error = true;
    $errorMessage = 'Falta el identificador del lienzo en la solicitud.';
}
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title" data-ref="gallery-title">
                    Galería de <?php echo htmlspecialchars($canvasName); ?>
                </h1>
            </div>
            
            <div class="component-top-right">
                <a href="/design/<?php echo htmlspecialchars($uuid); ?>" class="component-button component-button--h34">
                    <span class="material-symbols-rounded">arrow_back</span>
                    Regresar al Lienzo
                </a>
            </div>
        </div>

        <div class="component-bottom" data-ref="dynamic-content-area">
            <?php if ($error): ?>
                <div class="component-message-layout" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b;">
                    <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 1rem;">error</span>
                    <p><?php echo htmlspecialchars($errorMessage); ?></p>
                </div>
            <?php else: ?>
                <div class="component-grid" data-ref="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; padding: 1.5rem; overflow-y: auto;">
                    <?php if (empty($snapshots)): ?>
                        <div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">
                            <span class="material-symbols-rounded" style="font-size: 2.5rem; opacity: 0.5;">history_toggle_off</span>
                            <p style="margin-top: 1rem;">No hay capturas disponibles para este lienzo todavía.</p>
                        </div>
                    <?php else: ?>
                        <?php foreach($snapshots as $snapshot): ?>
                            <a href="/snapshot/view/<?php echo htmlspecialchars($snapshot['snapshot_uuid']); ?>" class="component-snapshot-card" style="display: flex; flex-direction: column; text-decoration: none; border: 1px solid var(--border-light, #333); border-radius: 8px; overflow: hidden; background: var(--bg-surface, #1a1a1a); transition: transform 0.2s, box-shadow 0.2s;">
                                <div class="snapshot-image" style="background-image: url('<?php echo htmlspecialchars($snapshot['url']); ?>'); background-size: cover; background-position: center; height: 180px; width: 100%; border-bottom: 1px solid var(--border-light, #333);"></div>
                                <div class="snapshot-info" style="padding: 1rem; display: flex; align-items: center; justify-content: center; color: var(--text-primary, #ddd); font-size: 0.9rem; font-weight: 500;">
                                    <span class="material-symbols-rounded" style="font-size: 1.1rem; margin-right: 0.5rem; color: var(--text-muted, #888);">calendar_today</span>
                                    <span><?php echo htmlspecialchars($snapshot['date']); ?></span>
                                </div>
                            </a>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>