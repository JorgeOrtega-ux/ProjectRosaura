<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageMessages = in_array('view_logs', $userPerms) || true;

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
$sort = isset($_GET['sort']) ? $_GET['sort'] : 'recent';
$searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';

$db = new DatabaseManager(); 
$pdoCanvases = $db->getConnection(DB::CONN_CANVASES);
$pdoIdentity = $db->getConnection(DB::CONN_IDENTITY);

$havingClause = ($filter === 'reported') ? "HAVING report_count > 0" : "";
$orderBy = ($sort === 'most_reported') ? "report_count DESC, m.id DESC" : "m.id DESC";

$searchCondition = "";
$searchParams = [];
if ($searchQuery !== '') {
    $searchCondition = "WHERE m.message LIKE :search OR m.id = :searchId1 OR m.uuid = :searchId2";
    $searchParams[':search'] = '%' . $searchQuery . '%';
    $searchParams[':searchId1'] = $searchQuery;
    $searchParams[':searchId2'] = $searchQuery;
}

if ($filter === 'reported') {
    $stmtCount = $pdoCanvases->prepare("
        SELECT COUNT(DISTINCT m.id) 
        FROM canvas_chat_messages m
        INNER JOIN canvas_chat_reports r ON r.message_id = m.id
        {$searchCondition}
    ");
} else {
    $stmtCount = $pdoCanvases->prepare("
        SELECT COUNT(m.id) 
        FROM canvas_chat_messages m
        {$searchCondition}
    ");
}
foreach ($searchParams as $key => $val) {
    $stmtCount->bindValue($key, $val);
}
$stmtCount->execute();
$totalMessages = (int)$stmtCount->fetchColumn();

$totalPages = ceil($totalMessages / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}

$messages = [];
try {
    $stmt = $pdoCanvases->prepare("
        SELECT m.id, m.uuid, m.user_id, m.message, m.attachments, m.visibility, m.created_at, m.canvas_id,
               COUNT(r.id) AS report_count
        FROM canvas_chat_messages m
        LEFT JOIN canvas_chat_reports r ON r.message_id = m.id
        {$searchCondition}
        GROUP BY m.id, m.uuid, m.user_id, m.message, m.attachments, m.visibility, m.created_at, m.canvas_id
        {$havingClause}
        ORDER BY {$orderBy}
        LIMIT :limit OFFSET :offset
    ");
    foreach ($searchParams as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($messages)) {
        $canvasIds = array_values(array_unique(array_filter(array_column($messages, 'canvas_id'))));
        $canvasMap = [];
        if (!empty($canvasIds)) {
            $cPlaceholders = implode(',', array_fill(0, count($canvasIds), '?'));
            $cStmt = $pdoCanvases->prepare("SELECT id, uuid, name FROM canvases WHERE id IN ($cPlaceholders)");
            $cStmt->execute($canvasIds);
            while ($cRow = $cStmt->fetch(PDO::FETCH_ASSOC)) {
                $canvasMap[$cRow['id']] = ['name' => $cRow['name'], 'uuid' => $cRow['uuid']];
            }
        }
        foreach ($messages as &$msg) {
            $cData = $canvasMap[$msg['canvas_id']] ?? null;
            $msg['canvas_name'] = $cData ? $cData['name'] : 'ID: ' . $msg['canvas_id'];
            $msg['canvas_uuid'] = $cData ? $cData['uuid'] : '';
        }
        unset($msg);
    }

} catch (\PDOException $e) {
    echo "<div class='view-content'><p>Error MySQL: " . htmlspecialchars($e->getMessage()) . "</p></div>";
    return;
}

try {
    $redisCache = new \App\Config\Database\RedisCache();
    $redis = $redisCache->getClient();
    if ($page === 1 && $redis && $filter !== 'reported') {
        $redisMessages = [];
        $rawQueue = $redis->lrange('canvas_chat_queue', 0, -1);
        if ($rawQueue) {
            foreach ($rawQueue as $item) {
                $data = json_decode($item, true);
                if ($data) {
                    $redisMessages[] = [
                        'id' => 'REDIS-' . ($data['temp_id'] ?? rand(1000,9999)),
                        'uuid' => 'REDIS-' . ($data['temp_id'] ?? rand(1000,9999)),
                        'user_id' => $data['user_id'],
                        'message' => htmlspecialchars_decode($data['message'] ?? '', ENT_QUOTES),
                        'attachments' => $data['attachments'] ?? null,
                        'visibility' => 'visible',
                        'created_at' => $data['created_at'] ?? date('Y-m-d H:i:s'),
                        'canvas_id' => $data['canvas_id'] ?? 0,
                        'canvas_name' => 'ID: ' . ($data['canvas_id'] ?? 0),
                        'report_count' => 0
                    ];
                }
            }
        }
        $redisMessages = array_reverse($redisMessages);
        $messages = array_merge($redisMessages, $messages);
    }
} catch (\Exception $e) {
    // Si falla redis continuamos normal
}

if (!empty($messages)) {
    $userIds = array_values(array_unique(array_column($messages, 'user_id')));
    $placeholders = implode(',', array_fill(0, count($userIds), '?'));
    $userStmt = $pdoIdentity->prepare("SELECT id, username FROM users WHERE id IN ($placeholders)");
    $userStmt->execute($userIds);
    $usersMap = [];
    while ($row = $userStmt->fetch(\PDO::FETCH_ASSOC)) {
        $usersMap[$row['id']] = $row['username'];
    }
    
    foreach ($messages as &$msg) {
        $uid = $msg['user_id'];
        $msg['username'] = $usersMap[$uid] ?? __('user');
    }
    unset($msg);
}

$appUrl = defined('APP_URL') ? APP_URL : '';

function buildMessagesUrl($appUrl, $page, $filter, $sort, $searchQuery = '') {
    $params = ['page' => $page];
    if ($filter !== 'all') $params['filter'] = $filter;
    if ($sort !== 'recent') $params['sort'] = $sort;
    if ($searchQuery !== '') $params['q'] = $searchQuery;
    return $appUrl . '/admin/messages?' . http_build_query($params);
}

$prevPageUrl = $page > 1 ? buildMessagesUrl($appUrl, $page - 1, $filter, $sort, $searchQuery) : '#';
$nextPageUrl = $page < $totalPages ? buildMessagesUrl($appUrl, $page + 1, $filter, $sort, $searchQuery) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="manage-messages-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_manage_messages'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="header-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="viewMessageReports" data-tooltip="<?php echo __('tooltip_view_reports'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">flag</span>
                    </button>
                </div>
                <div class="component-actions active" data-ref="header-default-actions">
                    
                    <button class="component-button component-button--icon component-button--h40 <?php echo !empty($_GET['q']) ? 'has-active-filter' : ''; ?>" data-action="searchMessages" data-ref="btn-toggle-search" data-tooltip="<?php echo __('search_placeholder'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>

                    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                        <button class="component-button component-button--icon component-button--h40 <?php echo ($filter !== 'all' || $sort !== 'recent') ? 'has-active-filter' : ''; ?>" data-action="toggleModule" data-target="moduleMessageFilters" data-ref="btn-toggle-filters" data-tooltip="<?php echo __('tooltip_filters'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">tune</span>
                        </button>
                        
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleMessageFilters">
                            
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title"><?php echo __('filter_search_title'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterType">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chat</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_type'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterSort">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">sort</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_sort'); ?></span></div>
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chevron_right</span></div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterType">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_type'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <a class="component-menu-link component-menu-link--bordered <?php echo $filter === 'all' ? 'active' : ''; ?>" data-nav="<?php echo buildMessagesUrl($appUrl, 1, 'all', $sort, $searchQuery); ?>">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">chat</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_all'); ?></span></div>
                                    </a>
                                    <a class="component-menu-link component-menu-link--bordered <?php echo $filter === 'reported' ? 'active' : ''; ?>" data-nav="<?php echo buildMessagesUrl($appUrl, 1, 'reported', $sort, $searchQuery); ?>">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">report</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('filter_reported'); ?></span></div>
                                    </a>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterSort">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title"><?php echo __('filter_by_sort'); ?></span>
                                    </div>
                                </div>
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <a class="component-menu-link component-menu-link--bordered <?php echo $sort === 'recent' ? 'active' : ''; ?>" data-nav="<?php echo buildMessagesUrl($appUrl, 1, $filter, 'recent', $searchQuery); ?>">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('sort_recent'); ?></span></div>
                                    </a>
                                    <a class="component-menu-link component-menu-link--bordered <?php echo $sort === 'most_reported' ? 'active' : ''; ?>" data-nav="<?php echo buildMessagesUrl($appUrl, 1, $filter, 'most_reported', $searchQuery); ?>">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">bar_chart</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('sort_most_reported'); ?></span></div>
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>

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
                        <input type="text" data-ref="message-search-input" placeholder="<?php echo __('search_placeholder'); ?>" value="<?php echo htmlspecialchars($searchQuery); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="view-table">
                <table class="component-table component-table--hoverable">
                    <thead>
                        <tr>
                            <th><?php echo __('table_id'); ?></th>
                            <th><?php echo __('table_message'); ?></th>
                            <th><?php echo __('table_reports'); ?></th>
                            <th><?php echo __('table_visibility'); ?></th>
                            <th><?php echo __('table_sender'); ?></th>
                            <th><?php echo __('table_canvas_group'); ?></th>
                            <th><?php echo __('table_date'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="messages-tbody">
                        <?php if (empty($messages)): ?>
                        <tr>
                            <td colspan="7" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">chat</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_msg_empty_list'); ?></p>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($messages as $msg): 
                                $repCount = (int)($msg['report_count'] ?? 0);
                            ?>
                            <tr class="component-table-row" data-action="selectMessage" data-message-uuid="<?php echo htmlspecialchars($msg['uuid']); ?>" data-report-count="<?php echo $repCount; ?>">
                                <td><span class="component-badge component-badge--sm search-target"><?php echo htmlspecialchars($msg['id']); ?></span></td>
                                <td>
                                    <?php 
                                        $rawAttachments = $msg['attachments'] ?? null;
                                        $attachCount = 0;
                                        if (!empty($rawAttachments)) {
                                            $decoded = is_string($rawAttachments) ? json_decode($rawAttachments, true) : $rawAttachments;
                                            $attachCount = is_array($decoded) ? count($decoded) : 0;
                                        }
                                        $textContent = trim(strip_tags($msg['message'] ?? ''));
                                        $snippet = mb_substr($textContent, 0, 100);

                                        $badgeContent = '';
                                        if (!empty($snippet)) {
                                            $badgeContent .= htmlspecialchars($snippet) . (mb_strlen($textContent) > 100 ? '...' : '');
                                        }
                                        if ($attachCount > 0) {
                                            if (!empty($snippet)) $badgeContent .= ' ';
                                            $viewerUrl = $appUrl . '/canvases/chat-viewer?canvas=' . urlencode($msg['canvas_uuid']) . '&msg=' . urlencode($msg['id']) . '&idx=0';
                                            $badgeContent .= '<a class="component-table-inline-icon" data-nav="' . htmlspecialchars($viewerUrl) . '"><span class="material-symbols-rounded">image</span> ' . $attachCount . '</a>';
                                        }
                                        if (empty($snippet) && $attachCount === 0) {
                                            $badgeContent .= '<span >' . __('admin_msg_empty') . '</span>';
                                        }
                                        
                                        echo '<span class="component-badge component-badge--sm search-target">' . $badgeContent . '</span>';
                                    ?>
                                </td>
                                <td>
                                    <?php if ($repCount > 0): 
                                        $reportsUrl = $appUrl . '/admin/messages/reports/' . urlencode($msg['uuid']);
                                    ?>
                                        <a class="component-badge component-badge--sm component-badge--warning" data-nav="<?php echo htmlspecialchars($reportsUrl); ?>" style="cursor: pointer; text-decoration: none;">
                                            <span class="material-symbols-rounded" style="font-size: 14px; margin-right: 2px; vertical-align: middle;">flag</span>
                                            <?php echo $repCount; ?>
                                        </a>
                                    <?php else: ?>
                                        <span class="component-badge component-badge--sm component-badge--muted">0</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="component-badge component-badge--sm component-badge--<?php echo $msg['visibility'] === 'visible' ? 'success' : ($msg['visibility'] === 'deleted' ? 'danger' : 'warning'); ?>">
                                        <?php echo htmlspecialchars($msg['visibility']); ?>
                                    </span>
                                </td>
                                <td><span class="component-badge component-badge--sm search-target"><?php echo htmlspecialchars($msg['username']); ?></span></td>
                                <td><span class="component-badge component-badge--sm search-target"><?php echo htmlspecialchars($msg['canvas_name'] ?? 'ID: '.$msg['canvas_id']); ?></span></td>
                                <td><span class="component-badge component-badge--sm"><?php echo htmlspecialchars(date('Y-m-d H:i', strtotime($msg['created_at']))); ?></span></td>
                            </tr>
                            <?php endforeach; ?>

                            <tr class="disabled" data-ref="empty-search-table">
                                <td colspan="7" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                        <p class="component-empty-state-text"><?php echo __('empty_search_messages'); ?></p>
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
