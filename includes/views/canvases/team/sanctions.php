<?php
use App\Api\Services\Canvas\CanvasViewService;
use App\Core\Helpers\Utils;

$canvasService = new CanvasViewService();
$sanctionsData = $canvasService->getCanvasSanctionsData($_GET['uuid'] ?? null, (int)($_GET['page'] ?? 1));

if (!empty($sanctionsData['unauthorized'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($sanctionsData);

$predefinedSuspension = [
    'reason_terms', 'reason_fake_info', 'reason_illegal', 'reason_fraud_use',
    'reason_abuse', 'reason_prohibited_content', 'reason_ip_violation',
    'reason_spam_bot', 'reason_security_breach', 'reason_unauthorized_commercial', 'reason_other'
];
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-sanctions-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_sanctions_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editSanction" data-tooltip="<?php echo htmlspecialchars(__('lbl_edit_sanction')); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">block</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="liftSanction" data-tooltip="<?php echo htmlspecialchars(__('lbl_lift_sanction')); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">lock_open</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchSanctionUser" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_member_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    
                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__center"><?php echo $page; ?></div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interaction' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="sanction-search-input" placeholder="<?php echo __('search_member_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_member'); ?></th>
                            <th><?php echo __('table_header_status'); ?></th>
                            <th><?php echo __('table_header_sanction_type'); ?></th>
                            <th><?php echo __('table_header_reason'); ?></th>
                            <th><?php echo __('table_header_expiration'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($userList)): ?>
                            <?php foreach ($userList as $item): ?>
                                <?php 
                                    $uid = $item['user_id'];
                                    $uInfo = $userDetails[$uid] ?? [];
                                    $username = !empty($uInfo['username']) ? $uInfo['username'] : __('lbl_user') . ' #' . $uid;
                                    $rawAvatar = !empty($uInfo['profile_picture']) ? $uInfo['profile_picture'] : null;
                                    $validAvatarPath = \App\Core\Helpers\Utils::getValidImage($rawAvatar, 'avatar');
                                    $avatarUrl = $appUrl . '/' . ltrim($validAvatarPath, '/');

                                    $userUuidStr = !empty($uInfo['uuid']) ? $uInfo['uuid'] : '';
                                    $subColor = !empty($uInfo['sub_bg']) ? $uInfo['sub_bg'] : 'var(--text-muted)';
                                    $isMember = $item['is_member'];
                                    $restrictions = $item['restrictions'] ?? [];
                                ?>
                                <?php if (empty($restrictions)): ?>
                                    <tr class="component-table-row" 
                                        data-action="selectSanctionRow" 
                                        data-user-id="<?php echo htmlspecialchars($uid); ?>" 
                                        data-user-uuid="<?php echo htmlspecialchars($userUuidStr); ?>"
                                        data-username="<?php echo htmlspecialchars($username); ?>"
                                        data-has-sanction="0"
                                        data-sanction-scope="chat_mute"
                                        data-suspension-type="temporary"
                                        data-suspension-reason="reason_terms"
                                        data-end-date="">
                                        <td>
                                            <div class="td-user-info">
                                                <div class="component-button--profile subscription-dynamic component-avatar--static-sm" 
                                                     data-sub-bg="<?php echo htmlspecialchars($subColor); ?>"
                                                     style="--active-subscription-bg: <?php echo htmlspecialchars($subColor); ?>;">
                                                    <img src="<?php echo htmlspecialchars($avatarUrl); ?>" alt="<?php echo __('alt_avatar'); ?>"
                                                         class="image-lazy-fade"
                                                         onload="this.classList.add('image-loaded')"
                                                         onerror="this.onerror=null; this.src='<?php echo $appUrl; ?>/public/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                                                </div>
                                                <div class="component-badge component-badge--sm">
                                                    <span class="material-symbols-rounded">person</span>
                                                    <span class="search-target"><?php echo htmlspecialchars($username); ?></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="component-badge component-badge--sm <?php echo $isMember ? '' : 'component-badge--warning'; ?>">
                                                <span class="material-symbols-rounded"><?php echo $isMember ? 'check_circle' : 'person_off'; ?></span>
                                                <span><?php echo $isMember ? __('lbl_active_member') : __('lbl_former_member'); ?></span>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">verified</span>
                                                <span><?php echo __('lbl_unrestricted'); ?></span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="search-target">-</span>
                                        </td>
                                        <td>
                                            <span>-</span>
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($restrictions as $restr): ?>
                                        <?php 
                                            $isExpired = $restr['suspension_type'] === 'temporary' && $restr['end_date'] && strtotime($restr['end_date']) <= time();
                                            $isActiveSanction = !$isExpired;
                                            $scope = $restr['sanction_scope'] ?? 'chat_mute';

                                            $reasonDisplay = in_array($restr['suspension_reason'], $predefinedSuspension) 
                                                ? __($restr['suspension_reason']) 
                                                : (!empty($restr['custom_reason']) ? $restr['custom_reason'] : $restr['suspension_reason']);
                                        ?>
                                        <tr class="component-table-row <?php echo $isExpired ? 'opacity-50' : ''; ?>" 
                                            data-action="selectSanctionRow" 
                                            data-user-id="<?php echo htmlspecialchars($uid); ?>" 
                                            data-user-uuid="<?php echo htmlspecialchars($userUuidStr); ?>"
                                            data-username="<?php echo htmlspecialchars($username); ?>"
                                            data-has-sanction="<?php echo $isActiveSanction ? '1' : '0'; ?>"
                                            data-sanction-scope="<?php echo htmlspecialchars($scope); ?>"
                                            data-suspension-type="<?php echo htmlspecialchars($restr['suspension_type'] ?? 'temporary'); ?>"
                                            data-suspension-reason="<?php echo htmlspecialchars($restr['suspension_reason'] ?? 'reason_terms'); ?>"
                                            data-end-date="<?php echo htmlspecialchars($restr['end_date'] ?? ''); ?>">
                                            <td>
                                                <div class="td-user-info">
                                                    <div class="component-button--profile subscription-dynamic component-avatar--static-sm" 
                                                         data-sub-bg="<?php echo htmlspecialchars($subColor); ?>"
                                                         style="--active-subscription-bg: <?php echo htmlspecialchars($subColor); ?>;">
                                                        <img src="<?php echo htmlspecialchars($avatarUrl); ?>" alt="<?php echo __('alt_avatar'); ?>"
                                                             class="image-lazy-fade"
                                                             onload="this.classList.add('image-loaded')"
                                                             onerror="this.onerror=null; this.src='<?php echo $appUrl; ?>/public/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                                                    </div>
                                                    <div class="component-badge component-badge--sm">
                                                        <span class="material-symbols-rounded">person</span>
                                                        <span class="search-target"><?php echo htmlspecialchars($username); ?></span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <?php if ($isActiveSanction && $scope === 'canvas_ban'): ?>
                                                    <div class="component-badge component-badge--sm component-badge--danger">
                                                        <span class="material-symbols-rounded">block</span>
                                                        <span><?php echo __('lbl_banned_member'); ?></span>
                                                    </div>
                                                <?php else: ?>
                                                    <div class="component-badge component-badge--sm <?php echo $isMember ? '' : 'component-badge--warning'; ?>">
                                                        <span class="material-symbols-rounded"><?php echo $isMember ? 'check_circle' : 'person_off'; ?></span>
                                                        <span><?php echo $isMember ? __('lbl_active_member') : __('lbl_former_member'); ?></span>
                                                    </div>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($isActiveSanction): ?>
                                                    <?php 
                                                        $scopeLabel = ($scope === 'canvas_ban') ? __('sanction_scope_canvas_ban') : __('sanction_scope_chat_mute');
                                                        $durationLabel = ($restr['suspension_type'] === 'permanent') ? __('suspension_perm') : __('suspension_temp');
                                                        $icon = ($scope === 'canvas_ban') ? 'block' : 'speaker_notes_off';
                                                    ?>
                                                    <div class="component-badge component-badge--sm component-badge--danger">
                                                        <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                                        <span><?php echo htmlspecialchars($scopeLabel) . ' (' . htmlspecialchars($durationLabel) . ')'; ?></span>
                                                    </div>
                                                <?php else: ?>
                                                    <div class="component-badge component-badge--sm component-badge--muted">
                                                        <span class="material-symbols-rounded">history</span>
                                                        <span><?php echo __('lbl_sanction_expired'); ?></span>
                                                    </div>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <span class="search-target"><?php echo htmlspecialchars($reasonDisplay); ?></span>
                                            </td>
                                            <td>
                                                <span><?php echo $restr['suspension_type'] === 'permanent' ? __('lbl_never') : ($restr['end_date'] ? date('Y-m-d H:i', strtotime($restr['end_date'])) : '-'); ?></span>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            <?php endforeach; ?>

                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="5" class="component-empty-table-cell">
                                    <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                                        'type' => 'search',
                                        'title' => __('search_empty_no_results_title'),
                                        'message' => __('empty_sanctions_search_desc')
                                    ]); ?>
                                </td>
                            </tr>
                        <?php else: ?>
                            <tr data-ref="empty-table">
                                <td colspan="5" class="component-empty-table-cell">
                                    <?php echo \App\Core\Helpers\Utils::renderEmptyState([
                                        'type' => 'sanctions',
                                        'title' => __('empty_sanctions_title'),
                                        'message' => __('empty_sanctions_desc')
                                    ]); ?>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>
