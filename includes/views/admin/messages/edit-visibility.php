<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageMessages = in_array('view_logs', $userPerms) || true;

if (!$canManageMessages) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/messages");
    exit;
}

$messageUuid = $_GET['uuid'] ?? null;
if (!$messageUuid) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/messages");
    exit;
}

$db = new DatabaseManager();
$pdoCanvases = $db->getConnection(DB::CONN_CANVASES);

$stmt = $pdoCanvases->prepare("SELECT id, uuid, message, attachments, canvas_id, visibility, deleted_by, delete_reason FROM canvas_chat_messages WHERE uuid = :uuid");
$stmt->execute([':uuid' => $messageUuid]);
$messageData = $stmt->fetch(\PDO::FETCH_ASSOC);

if (!$messageData) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/messages");
    exit;
}

$canvasUuid = '';
if (!empty($messageData['canvas_id'])) {
    $cStmt = $pdoCanvases->prepare("SELECT uuid FROM canvases WHERE id = :id");
    $cStmt->execute([':id' => $messageData['canvas_id']]);
    $canvasRow = $cStmt->fetch(\PDO::FETCH_ASSOC);
    $canvasUuid = $canvasRow['uuid'] ?? '';
}

$rawAttachments = $messageData['attachments'] ?? null;
$attachCount = 0;
if (!empty($rawAttachments)) {
    $decodedAttachments = is_string($rawAttachments) ? json_decode($rawAttachments, true) : $rawAttachments;
    $attachCount = is_array($decodedAttachments) ? count($decodedAttachments) : 0;
}

$visibility = $messageData['visibility'] ?? 'visible';
$deletedBy = $messageData['deleted_by'] ?? '';
$deleteReason = $messageData['delete_reason'] ?? '';

$initialState = [
    'visibility' => $visibility,
    'deletedBy' => $deletedBy,
    'deleteReason' => $deleteReason
];
$initialStateJson = htmlspecialchars(json_encode($initialState), ENT_QUOTES, 'UTF-8');

$visibilityLabels = [
    'visible' => __('msg_visibility_visible'),
    'under_review' => __('msg_visibility_under_review'),
    'deleted' => __('msg_visibility_deleted')
];
$deletedByLabels = [
    'user' => __('msg_deleted_by_user'),
    'admin' => __('msg_deleted_by_admin')
];

$displayTexts = [
    'visibility' => $visibilityLabels[$visibility] ?? $visibilityLabels['visible'],
    'deletedBy' => !empty($deletedBy) && isset($deletedByLabels[$deletedBy]) ? $deletedByLabels[$deletedBy] : __('dropdown_select_deleted_by')
];

$vis = [
    'deleted_by' => 'disabled',
    'delete_reason' => 'disabled'
];

if ($visibility === 'deleted') {
    $vis['deleted_by'] = '';
    if ($deletedBy === 'admin') {
        $vis['delete_reason'] = '';
    }
}
?>
<div class="view-content" data-message-uuid="<?php echo htmlspecialchars($messageUuid); ?>" data-initial-state="<?php echo $initialStateJson; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_msg_visibility_title'); ?> #<?php echo substr($messageUuid, 0, 8); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40 disabled-interaction" data-action="submitVisibilityUpdate" data-ref="btn-save-visibility" data-tooltip="<?php echo __('tooltip_save_visibility'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-setup-container active">
                    
                    <div class="component-card--grouped">

                        <!-- Message Content Preview -->
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content component-card__content--full">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_msg_content_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_msg_content_desc'); ?></p>
                                    <?php 
                                        $textContent = trim(strip_tags($messageData['message'] ?? ''));
                                        if (!empty($textContent)): 
                                    ?>
                                    <div class="component-card__form-area">
                                        <div class="component-input-field component-input-field--readonly"><?php echo htmlspecialchars(mb_substr($textContent, 0, 300)); ?><?php echo mb_strlen($textContent) > 300 ? '...' : ''; ?></div>
                                    </div>
                                    <?php endif; ?>
                                    <?php if ($attachCount > 0): ?>
                                    <div class="component-card__form-area">
                                        <?php 
                                            $appUrl = defined('APP_URL') ? APP_URL : '';
                                            $viewerUrl = $appUrl . '/canvases/chat-viewer?canvas=' . urlencode($canvasUuid) . '&msg=' . urlencode($messageData['id']) . '&idx=0';
                                        ?>
                                        <a class="component-table-inline-icon" data-nav="<?php echo htmlspecialchars($viewerUrl); ?>">
                                            <span class="material-symbols-rounded">image</span> <?php echo $attachCount; ?> <?php echo $attachCount === 1 ? __('admin_msg_attachment_singular') : __('admin_msg_attachment_plural'); ?>
                                        </a>
                                    </div>
                                    <?php endif; ?>
                                    <?php if (empty($textContent) && $attachCount === 0): ?>
                                    <div class="component-card__form-area">
                                        <span class="component-text-notice--muted"><?php echo __('admin_msg_empty'); ?></span>
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <!-- Visibility Status Dropdown -->
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_msg_visibility_status_title'); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_msg_visibility_status_desc'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleVisibilityStatus">
                                        <span class="material-symbols-rounded">visibility</span>
                                        <span class="component-dropdown-text" data-ref="admin-visibility-text"><?php echo $displayTexts['visibility']; ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleVisibilityStatus">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="visibility" data-value="visible">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('msg_visibility_visible'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="visibility" data-value="under_review">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">pending</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('msg_visibility_under_review'); ?></span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="visibility" data-value="deleted">
                                                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">delete</span></div>
                                                    <div class="component-menu-link-text"><span><?php echo __('msg_visibility_deleted'); ?></span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Deleted By Dropdown (only when visibility=deleted) -->
                        <div class="<?php echo $vis['deleted_by']; ?>" data-ref="section-deleted-by">
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_msg_deleted_by_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_msg_deleted_by_desc'); ?></p>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--start">
                                    <div class="component-dropdown-wrapper">
                                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleDeletedBy">
                                            <span class="material-symbols-rounded">person</span>
                                            <span class="component-dropdown-text" data-ref="admin-deletedBy-text"><?php echo $displayTexts['deletedBy']; ?></span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleDeletedBy">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedBy" data-value="user">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('msg_deleted_by_user'); ?></span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedBy" data-value="admin">
                                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                                                        <div class="component-menu-link-text"><span><?php echo __('msg_deleted_by_admin'); ?></span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Delete Reason (only when visibility=deleted AND deleted_by=admin) -->
                        <div class="<?php echo $vis['delete_reason']; ?>" data-ref="section-delete-reason">
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title"><?php echo __('admin_msg_delete_reason_title'); ?></h2>
                                        <p class="component-card__description"><?php echo __('admin_msg_delete_reason_desc'); ?></p>
                                        <div class="component-card__form-area">
                                            <textarea class="component-input-field" data-ref="inp_delete_reason" placeholder="<?php echo __('ph_delete_reason'); ?>"><?php echo htmlspecialchars($deleteReason, ENT_QUOTES, 'UTF-8'); ?></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    </div>
</div>
