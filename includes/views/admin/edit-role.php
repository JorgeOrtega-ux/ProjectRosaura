<?php
// includes/views/admin/edit-role.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card" style="position: relative;">
            <button class="component-button component-button--icon component-button--h36" data-nav="/ProjectRosaura/admin/manage-users" style="position: absolute; left: 24px; top: 24px;">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 class="component-page-title">Gestionar Rol</h1>
            <p class="component-page-description">Modifica el nivel de acceso y permisos de la cuenta.</p>
        </div>

        <div id="admin-role-loader" style="display: flex; justify-content: center; padding: 40px;">
            <div class="component-spinner"></div>
        </div>

        <div id="admin-role-form" class="disabled">
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Rol de la cuenta</h2>
                            <p class="component-card__description">Selecciona el rol que deseas asignar a este usuario en la plataforma.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModuleRole">
                                <span class="material-symbols-rounded">admin_panel_settings</span>
                                <span class="component-dropdown-text" id="admin-role-text">Cargando...</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled bs-initialized" data-module="adminModuleRole">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-header">
                                        <div class="component-search component-search--full component-search--h36">
                                            <div class="component-search-icon">
                                                <span class="material-symbols-rounded">search</span>
                                            </div>
                                            <div class="component-search-input">
                                                <input type="text" placeholder="Buscar rol...">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="founder">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">local_police</span></div>
                                            <div class="component-menu-link-text"><span>Fundador</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="administrator">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                                            <div class="component-menu-link-text"><span>Administrador</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="moderator">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                            <div class="component-menu-link-text"><span>Moderador</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="user">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                            <div class="component-menu-link-text"><span>Usuario</span></div>
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