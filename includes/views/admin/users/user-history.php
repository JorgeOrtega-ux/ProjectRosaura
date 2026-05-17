<?php
// includes/views/admin/users/user-history.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\ModerationRepository;
use App\Core\Repositories\ProfileLogRepository;

$targetUserId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($targetUserId <= 0) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$db = new DatabaseManager();
$userRepo = new UserRepository($db);
$modRepo = new ModerationRepository($db);
$profileLogRepo = new ProfileLogRepository($db);

$user = $userRepo->findById($targetUserId);
if (!$user) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$modLogs = $modRepo->getKardex($targetUserId);
$profileLogs = $profileLogRepo->getLogsByUserId($targetUserId);

// Anexar logs de ediciones hechas por el propio usuario (Perfil)
foreach ($profileLogs as $pl) {
    $modLogs[] = [
        'created_at' => $pl['created_at'],
        'action_type' => 'profile_' . $pl['change_type'],
        'reason' => __('lbl_data') . ': ' . $pl['change_type'] . ' | ' . __('lbl_prev_value') . ': ' . ($pl['old_value'] ?? __('lbl_na')) . ' | ' . __('lbl_new_value') . ': ' . ($pl['new_value'] ?? __('lbl_na')),
        'admin_username' => __('lbl_user_action'),
        'admin_profile_picture' => $user['profile_picture'] ?? null,
        'admin_role' => 'user',
        'admin_role_color' => $user['role_color'] ?? '{"type":"solid","colors":["#808080"]}'
    ];
}

// Ordenar por fecha descendente
usort($modLogs, function($a, $b) {
    return strtotime($b['created_at']) - strtotime($a['created_at']);
});
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_user_history_title'); ?></h1>
            </div>
        </div>

        <div class="component-bottom">
            <div class="component-table-wrapper" data-ref="history-table-container">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('table_header_date'); ?></th>
                            <th><?php echo __('table_header_action'); ?></th>
                            <th><?php echo __('table_header_details'); ?></th>
                            <th><?php echo __('table_header_admin'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="history-table-body">
                        <?php if (empty($modLogs)): ?>
                        <tr>
                            <td colspan="4" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">history</span>
                                    <p class="component-empty-state-text"><?php echo __('admin_history_empty'); ?></p>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($modLogs as $log): 
                                $adminPic = !empty($log['admin_profile_picture']) 
                                    ? (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($log['admin_profile_picture'], '/') 
                                    : (defined('APP_URL') ? APP_URL : '') . '/public/assets/img/fallbacks/avatar-default.png';
                                
                                $adminName = !empty($log['admin_username']) ? $log['admin_username'] : __('lbl_system');
                                
                                $dStr = strtotime($log['created_at']);
                                $dateStr = $dStr ? date('d/m/Y H:i', $dStr) : $log['created_at'];

                                $actionText = __('action_updated');
                                $actionIcon = 'info';
                                
                                switch($log['action_type']) {
                                    case 'suspended': $actionIcon = 'block'; $actionText = __('action_suspended'); break;
                                    case 'unsuspended': $actionIcon = 'lock_open'; $actionText = __('action_unsuspended'); break;
                                    case 'deleted': $actionIcon = 'person_off'; $actionText = __('action_deleted'); break;
                                    case 'restored': $actionIcon = 'settings_backup_restore'; $actionText = __('action_restored'); break;
                                    case 'role_changed': $actionIcon = 'admin_panel_settings'; $actionText = __('action_role_changed'); break;
                                    case 'profile_updated': $actionIcon = 'manage_accounts'; $actionText = __('action_profile_updated'); break;
                                    case 'profile_username': $actionIcon = 'badge'; $actionText = __('action_profile_username'); break;
                                    case 'profile_email': $actionIcon = 'mail'; $actionText = __('action_profile_email'); break;
                                    case 'profile_avatar': $actionIcon = 'account_circle'; $actionText = __('action_profile_avatar'); break;
                                    case 'profile_preferences': $actionIcon = 'tune'; $actionText = __('action_profile_preferences'); break;
                                }

                                // -------------------------------------------------------------
                                // LÓGICA CORREGIDA PARA PARSEAR EL JSON DE COLOR
                                // -------------------------------------------------------------
                                $roleColorJson = $log['admin_role_color'] ?? '{"type":"solid","colors":["#808080"]}';
                                $colorData = json_decode($roleColorJson, true);
                                $activeBgCss = '#808080';
                                
                                if (is_array($colorData) && !empty($colorData['colors'])) {
                                    // Esta función extrae el color ya sea si viene directo como texto o dentro de 'hex'
                                    $extractColor = function($item) {
                                        return is_array($item) ? ($item['hex'] ?? '#808080') : $item;
                                    };

                                    $c1 = $extractColor($colorData['colors'][0]);

                                    if (isset($colorData['type']) && $colorData['type'] === 'gradient' && count($colorData['colors']) >= 2) {
                                        $c2 = $extractColor($colorData['colors'][1]);
                                        $angle = $colorData['angle'] ?? 90;
                                        $activeBgCss = "linear-gradient({$angle}deg, {$c1}, {$c2})";
                                    } else {
                                        $activeBgCss = $c1;
                                    }
                                }

                                $adminBadgeIcon = 'admin_panel_settings';
                                if ($adminName === __('lbl_user_action') || ($log['admin_role'] ?? '') === 'user') {
                                    $adminBadgeIcon = 'person';
                                } elseif ($adminName === __('lbl_system')) {
                                    $adminBadgeIcon = 'smart_toy';
                                    $activeBgCss = '#6c757d'; // Color default del sistema si no hay rol
                                }
                            ?>
                            <tr class="component-table-row">
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span><?php echo $dateStr; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded"><?php echo $actionIcon; ?></span>
                                        <span><?php echo $actionText; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="td-details-content text-sm">
                                        <?php if (!empty($log['reason'])): ?>
                                            <div><strong><?php echo __('lbl_reason'); ?>:</strong> <?php echo htmlspecialchars($log['reason']); ?></div>
                                        <?php endif; ?>
                                        <?php if (!empty($log['end_date'])): 
                                            $expStr = strtotime($log['end_date']);
                                            $formatExp = $expStr ? date('d/m/Y H:i', $expStr) : $log['end_date'];
                                        ?>
                                            <div><strong><?php echo __('lbl_expires'); ?>:</strong> <?php echo $formatExp; ?></div>
                                        <?php endif; ?>
                                        <?php if (empty($log['reason']) && empty($log['end_date'])): ?>
                                            <span style="color: var(--text-muted);"><?php echo __('lbl_no_details'); ?></span>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile role-dynamic component-avatar--static-sm" style="--active-role-bg: <?php echo htmlspecialchars($activeBgCss, ENT_QUOTES, 'UTF-8'); ?>;">
                                            <img src="<?php echo htmlspecialchars($adminPic); ?>" alt="<?php echo __('alt_avatar'); ?>">
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded"><?php echo $adminBadgeIcon; ?></span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($adminName); ?></span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>