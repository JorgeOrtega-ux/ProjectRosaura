<?php
// includes/views/admin/edit-status.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card" style="position: relative;">
            <button class="component-button component-button--icon component-button--h36" data-nav="/ProjectRosaura/admin/manage-users" style="position: absolute; left: 24px; top: 24px;">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 class="component-page-title">Gestionar Estado</h1>
            <p class="component-page-description">Administra el ciclo de vida y bloqueos independientes de la cuenta.</p>
        </div>

        <div id="admin-status-loader" style="display: flex; justify-content: center; padding: 40px;">
            <div class="component-spinner"></div>
        </div>

        <div id="admin-status-form" class="disabled">
            
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Estado de la cuenta</h2>
                            <p class="component-card__description" id="admin-status-desc">Determina si la cuenta está en uso o eliminada permanentemente.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleStatus">
                                <span class="material-symbols-rounded">account_circle</span>
                                <span class="component-dropdown-text" id="admin-status-text">Cargando...</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleStatus">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="status" data-value="active">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">check_circle</span></div>
                                            <div class="component-menu-link-text"><span>Activa</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="status" data-value="deleted">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">person_off</span></div>
                                            <div class="component-menu-link-text"><span>Eliminada</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-deleted-decision" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Eliminada por</h2>
                                <p class="component-card__description">Indica si esta cuenta fue eliminada por voluntad del usuario o administrativamente.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleDeletedBy">
                                    <span class="material-symbols-rounded">gavel</span>
                                    <span class="component-dropdown-text" id="admin-deletedBy-text">Cargando...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleDeletedBy">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedBy" data-value="user">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">person_remove</span></div>
                                                <div class="component-menu-link-text"><span>Por el usuario</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedBy" data-value="admin">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">admin_panel_settings</span></div>
                                                <div class="component-menu-link-text"><span>Administrativa</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-deleted-admin-reason" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Motivo de eliminación (Admin)</h2>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleDeletedAdminReason">
                                    <span class="material-symbols-rounded">format_list_bulleted</span>
                                    <span class="component-dropdown-text" id="admin-deletedReasonAdmin-text">Cargando...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleDeletedAdminReason">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Spam">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Spam</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Fraude o estafa">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Fraude o estafa</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Violación de políticas">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Violación de políticas</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-deleted-user-reason" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Feedback del usuario</h2>
                                <div class="component-card__form-area">
                                    <textarea id="inp_deleted_reason_user" class="component-input-field" placeholder="Razón proporcionada por el usuario..." style="border: 1px solid #00000030; border-radius: 8px; resize: vertical; min-height: 80px; padding-top: 12px;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr style="border: none; border-top: 2px dashed #00000015; margin: 32px 0;">

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Restricción de Acceso</h2>
                            <p class="component-card__description">Aplica una suspensión para bloquear el acceso sin borrar el historial.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspended">
                                <span class="material-symbols-rounded">shield</span>
                                <span class="component-dropdown-text" id="admin-isSuspended-text">Cargando...</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspended">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="isSuspended" data-value="0">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_open</span></div>
                                            <div class="component-menu-link-text"><span>Sin restricción</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="isSuspended" data-value="1">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                            <div class="component-menu-link-text"><span>Suspendida</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-suspended-type" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Tipo de Suspensión</h2>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspendedType">
                                    <span class="material-symbols-rounded">hourglass_empty</span>
                                    <span class="component-dropdown-text" id="admin-suspendedType-text">Cargando...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspendedType">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspendedType" data-value="temporary">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">timer</span></div>
                                                <div class="component-menu-link-text"><span>Temporal</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspendedType" data-value="permanent">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_clock</span></div>
                                                <div class="component-menu-link-text"><span>Permanente</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-suspended-date" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Fin de la Suspensión</h2>
                                <div class="component-card__form-area">
                                    <div class="component-input-group">
                                        <input type="datetime-local" id="inp_end_date" class="component-input-field" placeholder=" ">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="section-suspended-reason" class="disabled" style="margin-top: 16px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Motivo de la suspensión</h2>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspensionReason">
                                    <span class="material-symbols-rounded">format_list_bulleted</span>
                                    <span class="component-dropdown-text" id="admin-suspensionReason-text">Cargando...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionReason">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Multi-cuenta no permitida">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Multi-cuenta no permitida</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Comportamiento tóxico">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Comportamiento tóxico</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Violación de políticas">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Violación de políticas</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Otro">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Otro</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="admin-status-password-area" style="margin-top: 32px;">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full component-card__content--start">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">lock</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Autorizar cambios</h2>
                                <p class="component-card__description">Ingresa tu contraseña actual para guardar este nuevo esquema de acceso.</p>
                                <div class="component-card__form-area">
                                    <div class="component-input-group">
                                        <input type="password" id="admin_status_confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                        <label for="admin_status_confirm_password" class="component-input-label">Tu contraseña actual</label>
                                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button class="component-button component-button--h36" data-action="cancelStatusUpdate">Cancelar</button>
                            <button class="component-button component-button--h36 component-button--dark" data-action="submitStatusUpdate">Guardar Ajustes</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>