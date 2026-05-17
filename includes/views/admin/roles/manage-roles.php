<?php
// includes/views/admin/roles/manage-roles.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

// EXTRACCIÓN DE PERMISOS GRANULARES
$userPerms = $_SESSION['user_permissions'] ?? [];
$canManageRoles = in_array('manage_roles_structure', $userPerms);

// Instanciamos la conexión y obtenemos los roles usando las constantes centralizadas
$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

$tblRoles = DB::TBL_ROLES;

$stmt = $pdo->query("SELECT id, name, color, weight, is_system, created_at FROM {$tblRoles} ORDER BY id ASC");
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Leer los datos directamente desde la estructura de sesión multi-cuenta
$currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;
$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
?>
<div class="view-content" data-ref="manageRolesView" data-current-user-weight="<?php echo $currentUserWeight; ?>" data-is-superadmin="<?php echo $isSuperAdmin; ?>">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_roles_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="role-selection-actions">
                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editRole" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($isSuperAdmin): ?>
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editPermissions" data-tooltip="<?php echo __('btn_edit_permissions'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </button>
                    <?php endif; ?>

                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--danger component-button--icon component-button--h40" data-action="deleteRole" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                    <?php endif; ?>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="searchRole" data-ref="btn-toggle-search" data-tooltip="<?php echo __('btn_search'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    
                    <?php if ($canManageRoles): ?>
                    <button class="component-button component-button--primary component-button--icon component-button--h40" data-action="addRole" data-tooltip="<?php echo __('btn_add_role'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                    <?php endif; ?>
                </div>
            </div>

            <div class="component-search-toolbar disabled" data-ref="search-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="role-search-input" placeholder="<?php echo __('search_role_placeholder'); ?>">
                    </div>
                </div>
            </div>

        </div>

        <div class="component-bottom">
            <?php if ($roles && count($roles) > 0): ?>
            <div class="component-table-wrapper" data-ref="roles-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_roles_col_system_role'); ?></th>
                            <th class="text-center" data-width="120"><?php echo __('admin_roles_col_hierarchy'); ?></th>
                            <th data-width="180"><?php echo __('admin_roles_col_created_at'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="roles-table-body">
                        <?php foreach ($roles as $role): 
                            $colorData = json_decode($role['color'], true);
                            if (!$colorData || !isset($colorData['colors'])) {
                                $colorData = ['type' => 'solid', 'colors' => [['hex' => '#808080', 'stop' => 0]]];
                            }

                            $cssColorValue = '';

                            if ($colorData['type'] === 'gradient' && count($colorData['colors']) > 1) {
                                $angle = $colorData['angle'] ?? 0;
                                $prevStop = 0;
                                $stops = [];
                                foreach ($colorData['colors'] as $c) {
                                    $hex = htmlspecialchars(is_string($c) ? $c : $c['hex']);
                                    $stop = isset($c['stop']) ? $c['stop'] : (isset($c['percentage']) ? $c['percentage'] : 100);
                                    $stops[] = "{$hex} {$prevStop}% {$stop}%";
                                    $prevStop = $stop;
                                }
                                $cssColorValue = "conic-gradient(from {$angle}deg, " . implode(', ', $stops) . ")";
                            } else {
                                $cssColorValue = htmlspecialchars(is_string($colorData['colors'][0]) ? $colorData['colors'][0] : $colorData['colors'][0]['hex']);
                            }

                            $rawName = $role['name'] ?? '';
                            $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                            $translatedName = __($roleKey);
                            
                            $createdAt = explode(' ', $role['created_at'])[0];
                            $isSystemFlag = isset($role['is_system']) ? (int)$role['is_system'] : 0;
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectRoleRow" 
                            data-role-id="<?php echo $role['id']; ?>" 
                            data-role-name="<?php echo htmlspecialchars($translatedName); ?>" 
                            data-is-system="<?php echo $isSystemFlag; ?>" 
                            data-role-weight="<?php echo (int)$role['weight']; ?>"
                            style="--active-role-bg: <?php echo $cssColorValue; ?>;">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-button--profile role-dynamic component-avatar--static-sm" style="--active-role-bg: <?php echo $cssColorValue; ?>;">
                                        <img src="/public/assets/img/fallbacks/avatar-default.png" alt="<?php echo __('alt_role_avatar'); ?>">
                                    </div>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">admin_panel_settings</span>
                                        <span class="search-target font-medium"><?php echo htmlspecialchars($translatedName); ?></span>
                                    </div>
                                </div>
                            </td>
                            <td class="text-center">
                                <span class="font-mono text-medium font-13">
                                    <?php echo (int)$role['weight']; ?>
                                </span>
                            </td>
                            <td class="text-secondary"><?php echo $createdAt; ?></td>
                        </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="3" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text"><?php echo __('empty_search_roles'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="roles-empty-state">
                <span class="material-symbols-rounded empty-icon">admin_panel_settings</span>
                <h3><?php echo __('admin_roles_empty_title'); ?></h3>
                <p><?php echo __('admin_roles_empty_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>