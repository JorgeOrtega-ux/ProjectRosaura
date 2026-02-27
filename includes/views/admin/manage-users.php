<?php
// includes/views/admin/manage-users.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database;
use PDO;

$limit = 25; 
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

$db = new Database();
$pdo = $db->getConnection();

$stmtCount = $pdo->query("SELECT COUNT(*) FROM users");
$totalUsers = (int)$stmtCount->fetchColumn();

$totalPages = ceil($totalUsers / $limit);
if ($totalPages < 1) $totalPages = 1;
if ($page > $totalPages) {
    $page = $totalPages;
    $offset = ($page - 1) * $limit;
}

$stmt = $pdo->query("SELECT id, uuid, username, email, role, user_status, is_suspended, profile_picture, created_at FROM users ORDER BY id DESC LIMIT $limit OFFSET $offset");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$prevPageUrl = $page > 1 ? '/ProjectRosaura/admin/manage-users?page=' . ($page - 1) : '#';
$nextPageUrl = $page < $totalPages ? '/ProjectRosaura/admin/manage-users?page=' . ($page + 1) : '#';
?>

<div class="view-content">
    <div class="component-wrapper" data-ref="manage-users-wrapper">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active" data-ref="toolbar-default-mode">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" data-ref="toolbar-dynamic-title">
                            <?php echo __('admin_users_title'); ?>
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchUser" data-ref="btn-toggle-search" data-tooltip="Buscar" data-position="bottom">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleUserFilters" data-ref="btn-toggle-filters" data-tooltip="Filtros" data-position="bottom">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left component-module--dropdown-fixed component-module--spaced disabled" data-module="moduleUserFilters">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <span class="component-menu-header-title">Filtros de búsqueda</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--compact">
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterRoles">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">admin_panel_settings</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Rol de cuenta</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                        
                                        <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterStatus">
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">rule</span>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Estado de cuenta</span>
                                            </div>
                                            <div class="component-menu-link-icon">
                                                <span class="material-symbols-rounded">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterRoles">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por Rol</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="role" value="founder" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Fundador</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="role" value="administrator" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Administrador</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="role" value="moderator" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Moderador</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="role" value="user" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Usuario</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterStatus">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header">
                                        <div class="component-menu-header-box">
                                            <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                                <span class="material-symbols-rounded">arrow_back</span>
                                            </button>
                                            <span class="component-menu-header-title">Filtrar por Estado</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="active" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Activo</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="suspended" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Suspendido</span>
                                            </div>
                                        </label>
                                        <label class="component-menu-link component-menu-link--bordered">
                                            <div class="component-menu-link-icon">
                                                <input type="checkbox" class="filter-checkbox" data-filter-type="status" value="deleted" checked>
                                            </div>
                                            <div class="component-menu-link-text">
                                                <span>Eliminado</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                    <div class="component-toolbar-right">
                        
                       <div class="component-inline-control" data-tooltip="Página <?php echo $page; ?> de <?php echo $totalPages; ?>" data-position="bottom">
    
                            <div class="component-inline-control__group">
                                <button class="component-inline-control__btn <?php echo $page <= 1 ? 'disabled-interaction' : ''; ?>" <?php echo $page > 1 ? 'data-nav="'.$prevPageUrl.'"' : ''; ?>>
                                    <span class="material-symbols-rounded">chevron_left</span>
                                </button>
                            </div>
                            
                            <div class="component-inline-control__center">
                                <?php echo $page; ?>
                            </div>
                            
                            <div class="component-inline-control__group">
                                <button class="component-inline-control__btn <?php echo $page >= $totalPages ? 'disabled-interaction' : ''; ?>" <?php echo $page < $totalPages ? 'data-nav="'.$nextPageUrl.'"' : ''; ?>>
                                    <span class="material-symbols-rounded">chevron_right</span>
                                </button>
                            </div>
                            
                        </div>

                        <button class="component-button component-button--icon component-button--h40" data-action="toggleViewMode" data-tooltip="Cambiar vista" data-position="bottom">
                            <span class="material-symbols-rounded">table_rows</span>
                        </button>
                    </div>
                </div>

                <div class="component-toolbar-mode disabled" data-ref="toolbar-selection-mode">
                    <div class="component-toolbar-left">
                        <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUser" data-tooltip="Gestionar cuenta" data-position="bottom">
                            <span class="material-symbols-rounded">manage_accounts</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUserRole" data-tooltip="Gestionar rol" data-position="bottom">
                            <span class="material-symbols-rounded">admin_panel_settings</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-action="editSelectedUserStatus" data-tooltip="Gestionar estado" data-position="bottom">
                            <span class="material-symbols-rounded">rule</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--icon component-button--h40" data-action="deselectUser" data-tooltip="Cancelar selección" data-position="bottom">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                </div>

            </div>

            <div class="component-toolbar-secondary" data-ref="secondary-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="user-search-input" placeholder="Buscar por nombre, correo, uuid...">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card" data-ref="manage-users-header">
            <h1 class="component-page-title"><?php echo __('admin_users_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_users_desc'); ?></p>
        </div>

        <div class="component-list active" data-ref="view-cards">
            <?php if ($users): ?>
                <?php foreach ($users as $user): ?>
                    <?php 
                        $dataStatus = $user['user_status'] === 'deleted' ? 'deleted' : ($user['is_suspended'] ? 'suspended' : 'active');
                        $displayStatus = $user['user_status'] === 'deleted' ? 'Eliminado' : ($user['is_suspended'] ? 'Suspendido' : 'Activo');
                        $statusIcon = $user['user_status'] === 'deleted' ? 'person_off' : ($user['is_suspended'] ? 'block' : 'check_circle');
                    ?>
                    <div class="component-item-card user-card-item" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-role="<?php echo htmlspecialchars($user['role']); ?>" data-status="<?php echo htmlspecialchars($dataStatus); ?>">
                        <div class="component-badge-list">
                            <div class="component-button--profile role-<?php echo htmlspecialchars($user['role']); ?> component-avatar--static">
                                <img src="/ProjectRosaura/<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="Avatar">
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">person</span>
                                <span class="search-target"><?php echo htmlspecialchars($user['username']); ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">mail</span>
                                <span class="search-target"><?php echo htmlspecialchars($user['email']); ?></span>
                            </div>
                            
                            <div class="component-badge">
                                <span class="material-symbols-rounded">shield_person</span>
                                <span class="search-target"><?php echo ucfirst(htmlspecialchars($user['role'])); ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">
                                    <?php echo $statusIcon; ?>
                                </span>
                                <span class="search-target"><?php echo $displayStatus; ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">fingerprint</span>
                                <span class="search-target"><?php echo htmlspecialchars($user['uuid']); ?></span>
                            </div>

                            <div class="component-badge">
                                <span class="material-symbols-rounded">calendar_month</span>
                                <span><?php echo date('d/m/Y', strtotime($user['created_at'])); ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
                
                <div class="component-empty-state disabled" data-ref="empty-search-cards">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <p class="component-empty-state-text">No se encontraron usuarios para tu búsqueda/filtro.</p>
                </div>

            <?php else: ?>
                <div class="component-empty-state">
                    <span class="material-symbols-rounded component-empty-state-icon">group_off</span>
                    <p class="component-empty-state-text">No hay usuarios registrados en esta página.</p>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-table-wrapper disabled" data-ref="view-table">
            <table class="component-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>UUID</th>
                        <th>Registro</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($users): ?>
                        <?php foreach ($users as $user): ?>
                            <?php 
                                $dataStatus = $user['user_status'] === 'deleted' ? 'deleted' : ($user['is_suspended'] ? 'suspended' : 'active');
                                $displayStatus = $user['user_status'] === 'deleted' ? 'Eliminado' : ($user['is_suspended'] ? 'Suspendido' : 'Activo');
                                $statusIcon = $user['user_status'] === 'deleted' ? 'person_off' : ($user['is_suspended'] ? 'block' : 'check_circle');
                            ?>
                            <tr class="user-card-item" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-role="<?php echo htmlspecialchars($user['role']); ?>" data-status="<?php echo htmlspecialchars($dataStatus); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile role-<?php echo htmlspecialchars($user['role']); ?> component-avatar--static-sm">
                                            <img src="/ProjectRosaura/<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="Avatar">
                                        </div>
                                        <div class="component-badge component-badge--sm">
                                            <span class="material-symbols-rounded">person</span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($user['username']); ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">mail</span>
                                        <span class="search-target"><?php echo htmlspecialchars($user['email']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">shield_person</span>
                                        <span class="search-target"><?php echo ucfirst(htmlspecialchars($user['role'])); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">
                                            <?php echo $statusIcon; ?>
                                        </span>
                                        <span class="search-target"><?php echo $displayStatus; ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">fingerprint</span>
                                        <span class="search-target"><?php echo htmlspecialchars($user['uuid']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span><?php echo date('d/m/Y', strtotime($user['created_at'])); ?></span>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <tr class="disabled" data-ref="empty-search-table">
                            <td colspan="6" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                                    <p class="component-empty-state-text">No se encontraron usuarios para tu búsqueda/filtro.</p>
                                </div>
                            </td>
                        </tr>

                    <?php else: ?>
                        <tr>
                            <td colspan="6" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">group_off</span>
                                    <p class="component-empty-state-text">No hay usuarios registrados en esta página.</p>
                                </div>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

    </div>
</div>