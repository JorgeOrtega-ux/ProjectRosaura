<?php
// includes/views/admin/manage-users.php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database;
use PDO;

// Obtenemos los usuarios
$db = new Database();
$pdo = $db->getConnection();
$stmt = $pdo->query("SELECT id, uuid, username, email, role, user_status, profile_picture, created_at FROM users ORDER BY id DESC LIMIT 50");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<style>
    /* === MODIFICADOR WRAPPER FULL === */
    .component-wrapper--full { max-width: 100% !important; }

    /* Bloque de estilos genéricos y reutilizables */
    .component-list { display: flex; flex-direction: column; gap: 16px; width: 100%; }

    .component-item-card {
        background-color: #ffffff;
        border: 1px solid #00000020;
        border-radius: 12px;
        padding: 16px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        cursor: pointer; 
    }
    
    .component-item-card:hover { border-color: #000000; }
    .component-item-card.selected {
        border-color: #111111;
        box-shadow: 0 0 0 1px #111111;
        background-color: #ffffff;
    }

    .component-badge-list { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

    .component-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        background-color: #ffffff;
        color: #111111;
        border: 1px solid #00000020;
        white-space: nowrap;
    }
    .component-badge .material-symbols-rounded { font-size: 16px; color: #666666; }

    /* === TOOLBAR STICKY === */
    .component-sticky-toolbar {
        position: sticky;
        top: 24px;
        width: 100%;
        max-width: 365px; 
        min-height: 50px; 
        margin: 0 auto;
        background-color: #ffffff;
        border: 1px solid #00000020;
        border-radius: 12px;
        z-index: 50;
        display: flex;
        flex-direction: column;
        padding: 4px 6px; 
    }

    .component-toolbar-primary { display: flex; width: 100%; height: 40px; position: relative; }
    .component-toolbar-mode { display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%; }
    .component-toolbar-mode.disabled { display: none !important; }
    .component-toolbar-left, .component-toolbar-right { display: flex; align-items: center; gap: 8px; }

    /* === TITULO DINÁMICO TOOLBAR === */
    .component-toolbar-title {
        display: flex;
        align-items: center;
        height: 40px;
        padding: 0 12px;
        border: 1px solid #00000020;
        border-radius: 8px;
        background-color: transparent;
        font-size: 14px;
        font-weight: 600;
        color: #111111;
        white-space: nowrap;
    }

    /* === INDICADOR DE FILTROS ACTIVOS === */
    .component-button.has-active-filter::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background-color: #111111;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-sizing: border-box;
    }

    /* === TOOLBAR SECUNDARIA === */
    .component-toolbar-secondary {
        display: none;
        position: absolute;
        top: calc(100% + 5px);
        left: 0;
        width: 100%;
        background-color: #ffffff;
        border: 1px solid #00000020;
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        z-index: 60;
    }
    .component-toolbar-secondary.active { display: block; }
    .component-toolbar-secondary .component-search { width: 100%; height: 40px; }

    /* === ESTILOS MODO TABLA === */
    .component-table-wrapper { background-color: #ffffff; border: 1px solid #00000020; border-radius: 12px; overflow-x: auto; width: 100%; }
    .component-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .component-table th, .component-table td { padding: 12px 16px; border-bottom: 1px solid #00000020; text-align: left; white-space: nowrap; color: #111111; }
    .component-table th { color: #666666; font-weight: 600; background-color: #ffffff; }
    .component-table tr:last-child td { border-bottom: none; }
    .component-table tr.user-card-item { cursor: pointer; transition: background-color 0.2s ease; }
    .component-table tr.user-card-item:hover { background-color: #fcfcfc; }
    .component-table tr.user-card-item.selected { background-color: #ffffff; }
    .component-table tr.user-card-item.selected td:first-child { box-shadow: inset 4px 0 0 0 #111111; }
    .td-user-info { display: flex; align-items: center; gap: 12px; }
</style>

<div class="view-content">
    <div class="component-wrapper" id="manage-users-wrapper">
        
        <div class="component-sticky-toolbar">
            
            <div class="component-toolbar-primary">
                <div id="toolbar-default-mode" class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                        <div class="component-toolbar-title disabled" id="toolbar-dynamic-title">
                            <?php echo __('admin_users_title'); ?>
                        </div>
                        <button class="component-button component-button--icon component-button--h40" data-action="searchUser" id="btn-toggle-search" data-tooltip="Buscar" data-position="bottom" style="position: relative;">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper" style="max-width: fit-content;">
                            <button class="component-button component-button--icon component-button--h40" data-action="toggleUserFilters" id="btn-toggle-filters" data-tooltip="Filtros" data-position="bottom" style="position: relative;">
                                <span class="material-symbols-rounded">tune</span>
                            </button>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="moduleUserFilters" style="top: calc(100% + 10px);">
                                
                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" id="menuMainFilters">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header" style="padding: 8px;">
                                        <div style="padding: 8px 12px; border: 1px solid #00000020; border-radius: 8px; display: flex; align-items: center;">
                                            <span style="font-size: 14px; font-weight: 600; color: #111;">Filtros de búsqueda</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list" style="padding: 8px; gap: 8px;">
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

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" id="menuFilterRoles">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header" style="padding: 8px;">
                                        <div style="padding: 8px 12px; border: 1px solid #00000020; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                                            <button class="component-button component-button--icon component-button--h30" data-action="backToMainFilters" style="border: none; box-shadow: none; margin-left: -6px; background: transparent;">
                                                <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
                                            </button>
                                            <span style="font-size: 14px; font-weight: 600; color: #111;">Filtrar por Rol</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable" style="padding: 8px; gap: 8px;">
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

                                <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" id="menuFilterStatus">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    
                                    <div class="component-menu-header" style="padding: 8px;">
                                        <div style="padding: 8px 12px; border: 1px solid #00000020; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                                            <button class="component-button component-button--icon component-button--h30" data-action="backToMainFilters" style="border: none; box-shadow: none; margin-left: -6px; background: transparent;">
                                                <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span>
                                            </button>
                                            <span style="font-size: 14px; font-weight: 600; color: #111;">Filtrar por Estado</span>
                                        </div>
                                    </div>
                                    
                                    <div class="component-menu-list component-menu-list--scrollable" style="padding: 8px; gap: 8px;">
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
                        <button class="component-button component-button--icon component-button--h40" data-action="toggleViewMode" data-tooltip="Cambiar vista" data-position="bottom">
                            <span class="material-symbols-rounded">table_rows</span>
                        </button>
                    </div>
                </div>

                <div id="toolbar-selection-mode" class="component-toolbar-mode disabled">
                    <div class="component-toolbar-left">
                        <button class="component-button component-button--icon component-button--h40" data-tooltip="Gestionar cuenta" data-position="bottom">
                            <span class="material-symbols-rounded">manage_accounts</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-tooltip="Gestionar rol" data-position="bottom">
                            <span class="material-symbols-rounded">admin_panel_settings</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-tooltip="Gestionar estado" data-position="bottom">
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

            <div class="component-toolbar-secondary" id="secondary-toolbar">
                <div class="component-search">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" id="user-search-input" placeholder="Buscar por nombre, correo, uuid...">
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card" id="manage-users-header">
            <h1 class="component-page-title"><?php echo __('admin_users_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_users_desc'); ?></p>
        </div>

        <div class="component-list active" id="view-cards">
            <?php if ($users): ?>
                <?php foreach ($users as $user): ?>
                    <div class="component-item-card user-card-item" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-role="<?php echo htmlspecialchars($user['role']); ?>" data-status="<?php echo htmlspecialchars($user['user_status']); ?>">
                        <div class="component-badge-list">
                            <div class="component-button--profile role-<?php echo htmlspecialchars($user['role']); ?>" style="margin: 0; cursor: default;">
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
                                    <?php echo $user['user_status'] === 'active' ? 'check_circle' : 'cancel'; ?>
                                </span>
                                <span class="search-target"><?php echo ucfirst(htmlspecialchars($user['user_status'])); ?></span>
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
                
                <div id="empty-search-cards" style="display: none; text-align: center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid #00000020;">
                    <span class="material-symbols-rounded" style="font-size: 48px; color: #ccc;">search_off</span>
                    <p style="color: #666; font-size: 15px; margin-top: 8px;">No se encontraron usuarios para tu búsqueda/filtro.</p>
                </div>

            <?php else: ?>
                <div style="text-align: center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid #00000020;">
                    <span class="material-symbols-rounded" style="font-size: 48px; color: #ccc;">group_off</span>
                    <p style="color: #666; font-size: 15px; margin-top: 8px;">No hay usuarios registrados.</p>
                </div>
            <?php endif; ?>
        </div>

        <div class="component-table-wrapper disabled" id="view-table">
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
                            <tr class="user-card-item" data-action="selectUser" data-user-id="<?php echo htmlspecialchars($user['id']); ?>" data-role="<?php echo htmlspecialchars($user['role']); ?>" data-status="<?php echo htmlspecialchars($user['user_status']); ?>">
                                <td>
                                    <div class="td-user-info">
                                        <div class="component-button--profile role-<?php echo htmlspecialchars($user['role']); ?>" style="margin: 0; cursor: default; width: 30px; height: 30px;">
                                            <img src="/ProjectRosaura/<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="Avatar">
                                        </div>
                                        <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                            <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                                            <span class="search-target font-medium"><?php echo htmlspecialchars($user['username']); ?></span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                        <span class="material-symbols-rounded" style="font-size: 14px;">mail</span>
                                        <span class="search-target"><?php echo htmlspecialchars($user['email']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                        <span class="material-symbols-rounded" style="font-size: 14px;">shield_person</span>
                                        <span class="search-target"><?php echo ucfirst(htmlspecialchars($user['role'])); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                        <span class="material-symbols-rounded" style="font-size: 14px;">
                                            <?php echo $user['user_status'] === 'active' ? 'check_circle' : 'cancel'; ?>
                                        </span>
                                        <span class="search-target"><?php echo ucfirst(htmlspecialchars($user['user_status'])); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                        <span class="material-symbols-rounded" style="font-size: 14px;">fingerprint</span>
                                        <span class="search-target"><?php echo htmlspecialchars($user['uuid']); ?></span>
                                    </div>
                                </td>
                                <td>
                                    <div class="component-badge" style="padding: 4px 10px; font-size: 12px;">
                                        <span class="material-symbols-rounded" style="font-size: 14px;">calendar_month</span>
                                        <span><?php echo date('d/m/Y', strtotime($user['created_at'])); ?></span>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        
                        <tr id="empty-search-table" style="display: none;">
                            <td colspan="6" style="text-align: center; padding: 40px; background: #fff;">
                                <span class="material-symbols-rounded" style="font-size: 48px; color: #ccc;">search_off</span>
                                <p style="color: #666; font-size: 15px; margin-top: 8px;">No se encontraron usuarios para tu búsqueda/filtro.</p>
                            </td>
                        </tr>

                    <?php else: ?>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: #666; background: #fff;">
                                <span class="material-symbols-rounded" style="font-size: 48px; color: #ccc;">group_off</span>
                                <p style="color: #666; font-size: 15px; margin-top: 8px;">No hay usuarios registrados en el sistema.</p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

    </div>
</div>