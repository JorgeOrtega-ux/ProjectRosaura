<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageMessages = in_array('view_logs', $userPerms) || true; // Replace logic if needed

if (!$canManageMessages) {
    die("Access Denied");
}

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$db = new DatabaseManager(); 
$pdoCanvases = $db->getConnection(DB::CONN_CANVASES);
$pdoIdentity = $db->getConnection(DB::CONN_IDENTITY);

$stmtCount = $pdoCanvases->query("SELECT COUNT(*) FROM canvas_chat_messages");
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
        SELECT m.id, m.user_id, m.message, m.visibility, m.created_at, m.canvas_id
        FROM canvas_chat_messages m
        ORDER BY m.id DESC 
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch canvas names separately to avoid any JOIN issues
    if (!empty($messages)) {
        $canvasIds = array_values(array_unique(array_filter(array_column($messages, 'canvas_id'))));
        $canvasMap = [];
        if (!empty($canvasIds)) {
            $cPlaceholders = implode(',', array_fill(0, count($canvasIds), '?'));
            $cStmt = $pdoCanvases->prepare("SELECT id, name FROM canvases WHERE id IN ($cPlaceholders)");
            $cStmt->execute($canvasIds);
            while ($cRow = $cStmt->fetch(PDO::FETCH_ASSOC)) {
                $canvasMap[$cRow['id']] = $cRow['name'];
            }
        }
        foreach ($messages as &$msg) {
            $msg['canvas_name'] = $canvasMap[$msg['canvas_id']] ?? 'ID: ' . $msg['canvas_id'];
        }
        unset($msg);
    }

} catch (\PDOException $e) {
    die("Error MySQL: " . $e->getMessage());
}

try {
    $redisCache = new \App\Config\Database\RedisCache();
    $redis = $redisCache->getClient();
    if ($page === 1 && $redis) {
        $redisMessages = [];
        $rawQueue = $redis->lrange('canvas_chat_queue', 0, -1);
        if ($rawQueue) {
            foreach ($rawQueue as $item) {
                $data = json_decode($item, true);
                if ($data) {
                    $redisMessages[] = [
                        'id' => 'REDIS-' . ($data['temp_id'] ?? rand(1000,9999)),
                        'user_id' => $data['user_id'],
                        'message' => htmlspecialchars_decode($data['message'] ?? '', ENT_QUOTES),
                        'visibility' => 'visible', // Redis messages are usually visible until saved
                        'created_at' => $data['created_at'] ?? date('Y-m-d H:i:s'),
                        'canvas_id' => $data['canvas_id'] ?? 0,
                        'canvas_name' => 'ID: ' . ($data['canvas_id'] ?? 0) // Placeholder
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
        $msg['username'] = $usersMap[$uid] ?? 'Usuario Desconocido';
    }
    unset($msg);
}

$appUrl = defined('APP_URL') ? APP_URL : '';
$prevPageUrl = $page > 1 ? $appUrl . '/admin/messages?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? $appUrl . '/admin/messages?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex" data-ref="manage-messages-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title">Gestionar Mensajes</h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active" data-ref="header-default-actions">
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
        </div>

        <div class="component-bottom component-bottom--no-padding">
            <div class="component-table-container">
                <table class="component-table component-table--hoverable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Mensaje</th>
                            <th>Visibilidad</th>
                            <th>Remitente</th>
                            <th>Grupo (Lienzo)</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody data-ref="messages-tbody">
                        <?php if (empty($messages)): ?>
                        <tr>
                            <td colspan="6" class="component-table-empty">
                                <div class="component-table-empty__content">
                                    <span class="material-symbols-rounded component-table-empty__icon">chat</span>
                                    <p class="component-table-empty__text">No hay mensajes disponibles</p>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($messages as $msg): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($msg['id']); ?></td>
                                <td>
                                    <?php 
                                        $snippet = mb_substr(strip_tags($msg['message']), 0, 100);
                                        echo htmlspecialchars($snippet) . (mb_strlen($msg['message']) > 100 ? '...' : ''); 
                                    ?>
                                </td>
                                <td>
                                    <span class="component-badge component-badge--<?php echo $msg['visibility'] === 'visible' ? 'success' : ($msg['visibility'] === 'deleted' ? 'danger' : 'warning'); ?>">
                                        <?php echo htmlspecialchars($msg['visibility']); ?>
                                    </span>
                                </td>
                                <td><?php echo htmlspecialchars($msg['username']); ?></td>
                                <td><?php echo htmlspecialchars($msg['canvas_name'] ?? 'ID: '.$msg['canvas_id']); ?></td>
                                <td><?php echo htmlspecialchars(date('Y-m-d H:i', strtotime($msg['created_at']))); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
    </div>
</div>
