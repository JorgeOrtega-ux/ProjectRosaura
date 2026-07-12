<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;
$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$connNameIdentity = defined('App\Core\System\DatabaseConstants::CONN_IDENTITY') ? App\Core\System\DatabaseConstants::CONN_IDENTITY : 'identity';

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
    echo "<div class='view-content'><p>".__('err_unauthorized_or_missing_id')."</p></div>";
    return;
}

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$tblMembers = 'canvas_members'; 

$members = [];
$totalMembers = 0;
$userDetails = [];
try {
    $stmtCount = $pdoCanvases->prepare("SELECT COUNT(*) FROM {$tblMembers} WHERE canvas_id = :cid");
    $stmtCount->execute(['cid' => $canvasId]);
    $totalMembers = (int)$stmtCount->fetchColumn();
    $stmt = $pdoCanvases->prepare("
        SELECT user_id, joined_at 
        FROM {$tblMembers} 
        WHERE canvas_id = :cid 
        ORDER BY joined_at DESC 
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute(['cid' => $canvasId]);
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $memberRoles = [];
    if (!empty($members)) {
        $userIds = array_column($members, 'user_id');
        $inQuery = implode(',', array_fill(0, count($userIds), '?'));
        
        $stmtRoles = $pdoCanvases->prepare("
            SELECT cur.user_id, r.name, r.is_system, r.weight
            FROM canvas_user_roles cur
            JOIN canvas_roles r ON cur.role_id = r.id
            WHERE cur.canvas_id = ? AND cur.user_id IN ($inQuery)
            ORDER BY r.weight DESC, r.name ASC
        ");
        $params = array_merge([$canvasId], $userIds);
        $stmtRoles->execute($params);
        
        while ($row = $stmtRoles->fetch(PDO::FETCH_ASSOC)) {
            $memberRoles[$row['user_id']][] = $row;
        }
    }

} catch (\Exception $e) {
    $members = [];
    $memberRoles = [];
}
if (!empty($members)) {
    try {
        $userIds = array_column($members, 'user_id');
        $pdoIdentity = $db->getConnection($connNameIdentity);
        
        $inQuery = implode(',', array_fill(0, count($userIds), '?'));
        $stmtUsers = $pdoIdentity->prepare("SELECT id, uuid, username, profile_picture FROM users WHERE id IN ($inQuery)");
        $stmtUsers->execute($userIds);
        
        while ($row = $stmtUsers->fetch(PDO::FETCH_ASSOC)) {
            $userDetails[$row['id']] = $row;
        }
    } catch (\Exception $e) {
    }
}

$totalPages = ceil($totalMembers / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/canvases/members/' . $canvasUuid . '?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/canvases/members/' . $canvasUuid . '?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-members-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvases_members_title') ?: 'Miembros del Lienzo'; ?></h1>
            </div>
            
            <div class="component-top-right">
                
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="changeMemberRole" data-tooltip="<?php echo __('tooltip_change_role') ?: 'Cambiar rol'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">manage_accounts</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="removeMember" data-tooltip="<?php echo __('tooltip_remove_member') ?: 'Expulsar miembro'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">person_remove</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectMember" data-tooltip="<?php echo __('tooltip_cancel_selection') ?: 'Cancelar selección'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo $appUrl; ?>/canvases/manage/requests/<?php echo htmlspecialchars($canvasUuid); ?>" data-tooltip="<?php echo __('tooltip_view_requests') ?: 'Solicitudes de acceso'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">front_hand</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="searchMember" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_member_placeholder') ?: 'Buscar miembro'; ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-inline-control" data-ref="pagination-container" data-tooltip="<?php echo __('pagination_tooltip', ['page' => $page, 'total' => $totalPages]) ?: "Página $page de $totalPages"; ?>" data-position="bottom">
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interactive' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                <span class="material-symbols-rounded">chevron_left</span>
                            </button>
                        </div>
                        <div class="component-inline-control__group">
                            <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interactive' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
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
                        <input type="text" data-ref="member-search-input" placeholder="<?php echo __('search_member_placeholder') ?: 'Buscar por nombre o ID...'; ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_member') ?: 'Usuario'; ?></th>
                            <th><?php echo __('table_header_role') ?: 'Rol en Lienzo'; ?></th>
                            <th><?php echo __('table_header_joined') ?: 'Fecha de Unión'; ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($members): ?>
                            <?php foreach ($members as $member): ?>
                                <?php 
                                    $uInfo = $userDetails[$member['user_id']] ?? [];
                                    $username = !empty($uInfo['username']) ? $uInfo['username'] : 'Usuario #' . $member['user_id'];
                                    $avatar = !empty($uInfo['profile_picture']) ? $uInfo['profile_picture'] : $appUrl . '/public/assets/img/fallbacks/avatar-default.png';
                                    $userUuidStr = !empty($uInfo['uuid']) ? $uInfo['uuid'] : '';
                                    $mRoles = $memberRoles[$member['user_id']] ?? [];
                                    $primaryRoleName = !empty($mRoles) ? $mRoles[0]['name'] : '';
                                    $roleColor = ($primaryRoleName === 'SuperAdministrator' || $primaryRoleName === 'Administrator') ? '#dc3545' : '#6b7280';
                                ?>
                                <tr class="component-table-row" data-action="selectMember" data-member-id="<?php echo htmlspecialchars($member['user_id']); ?>" data-member-uuid="<?php echo htmlspecialchars($userUuidStr); ?>">
                                    <td>
                                        <div class="td-user-info">
                                            <div class="component-button--profile role-dynamic component-avatar--static-sm" data-role-bg="<?php echo $roleColor; ?>">
                                                <img src="<?php echo htmlspecialchars($avatar); ?>" alt="alt_avatar">
                                            </div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded">person</span>
                                                <span class="search-target font-medium"><?php echo htmlspecialchars($username); ?></span>
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
                                                <span class="search-target">Sin rol</span>
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
                                            
                                            $primaryName = $primaryRole['is_system'] ? (__('role_' . strtolower($primaryRole['name'])) ?: ucfirst($primaryRole['name'])) : htmlspecialchars($primaryRole['name']);
                                        ?>
                                        <div>
                                            <div class="component-badge component-badge--sm">
                                                <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                                <span class="search-target font-bold" data-role-original-name="<?php echo htmlspecialchars($primaryRole['name']); ?>"><?php echo $primaryName; ?></span>
                                            </div>
                                            
                                            <?php if (count($mRoles) > 1): 
                                                $otherRolesNames = [];
                                                foreach (array_slice($mRoles, 1) as $r) {
                                                    $rName = $r['is_system'] ? (__('role_' . strtolower($r['name'])) ?: ucfirst($r['name'])) : htmlspecialchars($r['name']);
                                                    $otherRolesNames[] = $rName;
                                                }
                                                $tooltipText = implode(', ', $otherRolesNames);
                                            ?>
                                                <div class="component-badge component-badge--sm" data-tooltip="<?php echo htmlspecialchars($tooltipText); ?>" data-position="bottom">
                                                    <span class="font-bold">+<?php echo count($mRoles) - 1; ?></span>
                                                </div>
                                                
                                                <?php foreach (array_slice($mRoles, 1) as $r): 
                                                    $rName = $r['is_system'] ? (__('role_' . strtolower($r['name'])) ?: ucfirst($r['name'])) : htmlspecialchars($r['name']);
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
                                        <p class="component-empty-state-text"><?php echo __('empty_search_members') ?: 'No se encontraron miembros que coincidan con tu búsqueda.'; ?></p>
                                    </div>
                                </td>
                            </tr>

                        <?php else: ?>
                            <tr>
                                <td colspan="3" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">group_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_members_system') ?: 'No hay miembros registrados en este lienzo aún.'; ?></p>
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