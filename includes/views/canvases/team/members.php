<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$membersData = $canvasService->getCanvasMembersData($_GET['uuid'] ?? null, (int)($_GET['page'] ?? 1));

if (!empty($membersData['unauthorized'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($membersData);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-members-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_members_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="changeMemberRole" data-tooltip="<?php echo __('tooltip_change_role'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">manage_accounts</span>
                    </button>



                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="removeMember" data-tooltip="<?php echo __('tooltip_remove_member'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">person_remove</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $appUrl; ?>/canvases/manage/requests/<?php echo htmlspecialchars($canvasUuid); ?>" data-tooltip="<?php echo __('tooltip_view_requests'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">front_hand</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="searchMember" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_member_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]); ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
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
                        <input type="text" data-ref="member-search-input" placeholder="<?php echo __('search_member_placeholder'); ?>">
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
                            <th><?php echo __('table_header_role'); ?></th>
                            <th><?php echo __('table_header_joined'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($members): ?>
                            <?php foreach ($members as $member): ?>
                                <?php 
                                    $uInfo = $userDetails[$member['user_id']] ?? [];
                                    $username = !empty($uInfo['username']) ? $uInfo['username'] : __('lbl_user') . ' #' . $member['user_id'];
                                    $avatar = !empty($uInfo['profile_picture']) ? $uInfo['profile_picture'] : $appUrl . '/public/avatar/Um9zYXVyYVVzZXI6VQ';
                                    $userUuidStr = !empty($uInfo['uuid']) ? $uInfo['uuid'] : '';
                                    $roleColor = !empty($uInfo['role_bg']) ? $uInfo['role_bg'] : 'var(--text-muted)';
                                ?>
                                <tr class="component-table-row" data-action="selectMember" data-member-id="<?php echo htmlspecialchars($member['user_id']); ?>" data-member-uuid="<?php echo htmlspecialchars($userUuidStr); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile role-dynamic component-avatar--static-sm" data-role-bg="<?php echo $roleColor; ?>">
                                                <img src="<?php echo htmlspecialchars($avatar); ?>" alt="alt_avatar"
                                                     class="image-lazy-fade"
                                                     onload="this.classList.add('image-loaded')"
                                                     onerror="this.onerror=null; this.src='<?php echo APP_URL; ?>/public/avatar/Um9zYXVyYVVzZXI6VQ'; this.classList.add('image-loaded');">
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person</span>
                                                <span class="search-target"><?php echo htmlspecialchars($username); ?></span>
                                                <?php if ($member['user_id'] == $canvasOwnerId): ?>
                                                    <span class="material-symbols-rounded" title="<?php echo __('role_creator'); ?>">star</span>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <?php 
                                            $mRoles = $memberRoles[$member['user_id']] ?? [];
                                            if (empty($mRoles)):
                                        ?>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person_off</span>
                                                <span class="search-target"><?php echo __('lbl_no_role'); ?></span>
                                            </div>
                                        <?php else:
                                            $primaryRole = $mRoles[0];
                                            $icon = 'person';
                                            if ($primaryRole['is_system']) {
                                                if ($primaryRole['name'] === 'SuperAdministrator' || $primaryRole['name'] === 'Administrator') $icon = 'shield_person';
                                                elseif ($primaryRole['name'] === 'Moderator') $icon = 'local_police';
                                            } else {
                                                $icon = 'star';
                                            }
                                            
                                            $primaryName = $primaryRole['is_system'] ? __('role_' . strtolower($primaryRole['name'])) : htmlspecialchars($primaryRole['name']);
                                        ?>
                                        <div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                                <span class="search-target" data-role-original-name="<?php echo htmlspecialchars($primaryRole['name']); ?>"><?php echo $primaryName; ?></span>
                                            </div>
                                            
                                            <?php if (count($mRoles) > 1): 
                                                $otherRolesNames = [];
                                                foreach (array_slice($mRoles, 1) as $r) {
                                                    $rName = $r['is_system'] ? __('role_' . strtolower($r['name'])) : htmlspecialchars($r['name']);
                                                    $otherRolesNames[] = $rName;
                                                }
                                                $tooltipText = implode(', ', $otherRolesNames);
                                            ?>
                                                <div class="component-badge component-badge--sm" data-tooltip="<?php echo htmlspecialchars($tooltipText); ?>" data-position="bottom">
                                                    <span >+<?php echo count($mRoles) - 1; ?></span>
                                                </div>
                                                
                                                <?php foreach (array_slice($mRoles, 1) as $r): 
                                                    $rName = $r['is_system'] ? __('role_' . strtolower($r['name'])) : htmlspecialchars($r['name']);
                                                ?>
                                                    <span class="search-target" data-role-original-name="<?php echo htmlspecialchars($r['name']); ?>"><?php echo $rName; ?></span>
                                                <?php endforeach; ?>
                                            <?php endif; ?>
                                        </div>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">login</span>
                                            <span><?php echo date('d/m/Y', strtotime($member['joined_at'])); ?></span>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            
                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="3" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_members'); ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="3" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">group_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_members_system'); ?></p>
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