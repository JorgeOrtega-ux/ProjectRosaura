<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$invitesData = $canvasService->getCanvasInvitesData($_GET['uuid'] ?? null);

if (!empty($invitesData['error'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($invitesData);
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-invites-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('lbl_invites_management'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="copySelectedInvite" data-tooltip="<?php echo htmlspecialchars(__('lbl_copy_code')); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">content_copy</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="revokeSelectedInvites" data-tooltip="<?php echo htmlspecialchars(__('lbl_revoke_selection')); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete_forever</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button data-nav="<?php echo htmlspecialchars($appUrl); ?>/canvases/manage/invites/generate/<?php echo htmlspecialchars($canvasUuid); ?>" class="component-button component-button--icon component-button--h40" data-tooltip="<?php echo htmlspecialchars(__('lbl_generate_invite')); ?>" data-position="bottom">
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
                            <th><?php echo __('lbl_code'); ?></th>
                            <th><?php echo __('lbl_role'); ?></th>
                            <th><?php echo __('lbl_uses'); ?></th>
                            <th><?php echo __('lbl_expiration'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($invites): ?>
                            <?php foreach ($invites as $invite): ?>
                                <?php 
                                    $isExpired = $invite['expires_at'] && strtotime($invite['expires_at']) <= time();
                                    $isMaxed = $invite['max_uses'] !== null && $invite['uses_count'] >= $invite['max_uses'];
                                    $statusClass = ($isExpired || $isMaxed) ? 'component-badge--muted' : 'component-badge--success';
                                ?>
                                <tr class="component-table-row <?php echo ($isExpired || $isMaxed) ? 'disabled' : ''; ?>" data-action="selectInvite" data-invite-id="<?php echo htmlspecialchars($invite['id']); ?>" data-invite-code="<?php echo htmlspecialchars($invite['code']); ?>">
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">key</span>
                                            <span ><?php echo htmlspecialchars($invite['code']); ?></span>
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
                                            <span><?php echo $invite['expires_at'] ? date('d/m/Y H:i', strtotime($invite['expires_at'])) : __('lbl_never'); ?></span>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <div class="component-empty-state-badge">
                                            <span class="material-symbols-rounded">link_off</span>
                                        </div>
                                        <p class="component-empty-state-text"><?php echo __('empty_no_active_invites'); ?></p>
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


