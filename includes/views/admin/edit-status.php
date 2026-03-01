<?php
// includes/views/admin/edit-status.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">

    <div class="component-wrapper">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                        </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--h36 component-button--dark" data-action="submitStatusUpdate">Guardar cambios</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card">
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

                <div id="section-deleted-decision" class="disabled">
                    <hr class="component-divider">
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

                <div id="section-deleted-admin-reason" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Motivo de eliminación (Admin)</h2>
                                <p class="component-card__description">Selecciona la razón por la cual se está eliminando esta cuenta de forma administrativa.</p>
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
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Otro">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Otro</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-deleted-admin-custom-reason" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Especificar otro motivo (Eliminación)</h2>
                                <div class="component-card__form-area">
                                    <textarea id="inp_custom_deleted_reason_admin" class="component-input-field" placeholder="Escribe el motivo exacto..." style="border: 1px solid var(--border-color); border-radius: 8px; resize: vertical; min-height: 80px; padding-top: 12px;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-deleted-user-reason" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Feedback del usuario</h2>
                                <p class="component-card__description">A continuación se muestra el motivo proporcionado por el usuario al solicitar la eliminación.</p>
                                <div class="component-card__form-area">
                                    <textarea id="inp_deleted_reason_user" class="component-input-field" placeholder="Razón proporcionada por el usuario..." style="border: 1px solid var(--border-color); border-radius: 8px; resize: vertical; min-height: 80px; padding-top: 12px;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="component-card--grouped" style="margin-top: 16px;">
                
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Restricción de Acceso</h2>
                            <p class="component-card__description" id="admin-isSuspended-desc">Aplica una suspensión para bloquear el acceso sin borrar el historial.</p>
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
                                            <div class="component-menu-link-text"><span>Cuenta sin restricciones</span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetDropdown" data-key="isSuspended" data-value="1">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">block</span></div>
                                            <div class="component-menu-link-text"><span>Cuenta con suspensión</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-suspended-reason" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Motivo de la suspensión</h2>
                                <p class="component-card__description">Selecciona la razón principal por la cual se restringe el acceso a la plataforma.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper" style="max-width: 100%;">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspensionReason" style="max-width: 100%;">
                                    <span class="material-symbols-rounded">format_list_bulleted</span>
                                    <span class="component-dropdown-text" id="admin-suspensionReason-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Seleccionar razón de suspensión...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionReason">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Incumplimiento de los Términos y Condiciones">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Incumplimiento de los Términos y Condiciones</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">7 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Información falsa o suplantación de identidad">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Información falsa o suplantación de identidad</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">30 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Actividades ilegales">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Actividades ilegales</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">30 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Uso indebido o fraudulento del servicio">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Uso indebido o fraudulento del servicio</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">14 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Conducta abusiva o inapropiada">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Conducta abusiva o inapropiada</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">3 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Publicación de contenido prohibido">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Publicación de contenido prohibido</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">7 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Violación de propiedad intelectual">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Violación de propiedad intelectual</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">14 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Envío de spam o uso de automatización no autorizada">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Envío de spam o uso de automatización no autorizada</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">7 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Intentos de vulnerar la seguridad de la plataforma">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Intentos de vulnerar la seguridad de la plataforma</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">30 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Uso de la cuenta para fines comerciales no autorizados">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Uso de la cuenta para fines comerciales no autorizados</span></div>
                                                <div style="padding-right: 12px;"><span class="component-badge component-badge--sm" style="background: var(--bg-app); border: 1px solid var(--border-color);">14 días</span></div>
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

                <div id="section-suspended-custom-reason" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Especificar otro motivo (Suspensión)</h2>
                                <div class="component-card__form-area">
                                    <textarea id="inp_custom_suspension_reason" class="component-input-field" placeholder="Escribe la razón detallada para el usuario..." style="border: 1px solid var(--border-color); border-radius: 8px; resize: vertical; min-height: 80px; padding-top: 12px;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-suspended-type" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Tipo de Suspensión</h2>
                                <p class="component-card__description">Establece si el bloqueo tiene una duración definida o es de carácter definitivo.</p>
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
                                                <div class="component-menu-link-text"><span>Suspensión temporal</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspendedType" data-value="permanent">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock_clock</span></div>
                                                <div class="component-menu-link-text"><span>Suspensión permanente</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-suspended-duration" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Duración de la suspensión</h2>
                                <p class="component-card__description">Selecciona el tiempo que durará el bloqueo de la cuenta.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspensionDuration">
                                    <span class="material-symbols-rounded">schedule</span>
                                    <span class="component-dropdown-text" id="admin-suspensionDuration-text">Cargando...</span>
                                    <span class="material-symbols-rounded">expand_more</span>
                                </div>
                                <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionDuration">
                                    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                        <div class="pill-container"><div class="drag-handle"></div></div>
                                        <div class="component-menu-list component-menu-list--scrollable">
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="1">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>1 día</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="3">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>3 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="7">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>7 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="14">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>14 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="30">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>30 días</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="custom">
                                                <div class="component-menu-link-text" style="padding-left: 12px;"><span>Establecer tiempo manual</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="section-suspended-date" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Fin de la Suspensión</h2>
                                <p class="component-card__description">Indica la fecha y hora exacta en la que se levantará la restricción temporal.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleCalendar">
                                    <span class="material-symbols-rounded">calendar_month</span>
                                    <span class="component-dropdown-text" id="admin-endDate-text">Seleccionar fecha y hora...</span>
                                </div>
                                <?php include __DIR__ . '/../../modules/moduleCalendar.php'; ?>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
            
            <div class="component-card--grouped" style="margin-top: 16px;">
                <div id="section-admin-notes" class="disabled">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Notas de Moderación / Evidencia (Interno)</h2>
                                <p class="component-card__description">Solo visible para el equipo administrativo. Agrega enlaces, IDs de transacciones o el contexto de la decisión para mantener un historial limpio.</p>
                                <div class="component-card__form-area">
                                    <textarea id="inp_admin_notes" class="component-input-field" placeholder="Ej. Se detectaron múltiples cuentas creadas con la misma IP para evasión..." style="border: 1px solid var(--border-color); border-radius: 8px; resize: vertical; min-height: 80px; padding-top: 12px;"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="section-notify-user" class="disabled">
                    <hr class="component-divider">
                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">forward_to_inbox</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">Notificar al usuario</h2>
                                <p class="component-card__description">Se enviará un correo electrónico informando sobre la restricción y el motivo exacto.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" id="chk_notify_user" checked>
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped" style="margin-top: 16px;">
                <div class="component-group-item component-group-item--stacked">
                    
                    <div id="admin-status-warning" class="component-alert-error disabled" style="margin-bottom: 16px; text-align: left; display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                        <span class="material-symbols-rounded" style="font-size: 20px;">warning</span>
                        <div>
                            <strong>Atención:</strong> Al aplicar o modificar una suspensión o eliminación, se cerrarán inmediatamente todas las sesiones activas de este usuario.
                        </div>
                    </div>

                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">lock</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Verificar identidad</h2>
                            <p class="component-card__description">Para aplicar cambios en el estado o suspensiones, ingresa tu contraseña actual de administrador.</p>
                            
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" id="admin_status_confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                    <label for="admin_status_confirm_password" class="component-input-label">Tu contraseña actual</label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>