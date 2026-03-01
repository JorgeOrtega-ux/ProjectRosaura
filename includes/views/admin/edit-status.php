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
                        <button class="component-button component-button--icon component-button--h40 active" data-action="switchTab" data-target="view-status-config" data-ref="tab-btn-config" data-tooltip="<?php echo __('admin_status_tab_config', ['default' => 'Configurar estado']); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">toggle_on</span>
                        </button>
                        <button class="component-button component-button--icon component-button--h40" data-action="switchTab" data-target="view-status-kardex" data-ref="tab-btn-kardex" data-tooltip="<?php echo __('admin_status_tab_kardex', ['default' => 'Kardex y Notas']); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">history</span>
                        </button>
                    </div>
                    <div class="component-toolbar-right" data-ref="toolbar-actions-config">
                        <button class="component-button component-button--icon component-button--h40 component-button--dark disabled-interaction" data-action="submitStatusUpdate" data-ref="admin-btn-save-status" data-tooltip="Guardar cambios de estado" data-position="bottom">
                            <span class="material-symbols-rounded">save</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card">
            <h1 class="component-page-title" data-ref="page-main-title">Gestionar Estado</h1>
            <p class="component-page-description" data-ref="page-main-desc">Administra el ciclo de vida y bloqueos independientes de la cuenta.</p>
        </div>

        <div data-ref="admin-status-loader">
            <div class="component-spinner"></div>
        </div>

        <div class="disabled" data-ref="admin-status-form">
            
            <div data-ref="view-status-config">
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Estado de la cuenta</h2>
                                <p class="component-card__description" data-ref="admin-status-desc">Determina si la cuenta está en uso o eliminada permanentemente.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleStatus">
                                    <span class="material-symbols-rounded">account_circle</span>
                                    <span class="component-dropdown-text" data-ref="admin-status-text">Cargando...</span>
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

                    <div class="disabled" data-ref="section-deleted-decision">
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
                                        <span class="component-dropdown-text" data-ref="admin-deletedBy-text">Cargando...</span>
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

                    <div class="disabled" data-ref="section-deleted-admin-reason">
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
                                        <span class="component-dropdown-text" data-ref="admin-deletedReasonAdmin-text">Cargando...</span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleDeletedAdminReason">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Spam">
                                                    <div class="component-menu-link-text"><span>Spam</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Fraude o estafa">
                                                    <div class="component-menu-link-text"><span>Fraude o estafa</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Violación de políticas">
                                                    <div class="component-menu-link-text"><span>Violación de políticas</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="deletedReasonAdmin" data-value="Otro">
                                                    <div class="component-menu-link-text"><span>Otro</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="disabled" data-ref="section-deleted-admin-custom-reason">
                        <hr class="component-divider">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content component-card__content--full">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Especificar otro motivo (Eliminación)</h2>
                                    <div class="component-card__form-area">
                                        <textarea class="component-input-field" data-ref="inp_custom_deleted_reason_admin" placeholder="Escribe el motivo exacto..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="disabled" data-ref="section-deleted-user-reason">
                        <hr class="component-divider">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content component-card__content--full">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Feedback del usuario</h2>
                                    <p class="component-card__description">A continuación se muestra el motivo proporcionado por el usuario al solicitar la eliminación.</p>
                                    <div class="component-card__form-area">
                                        <textarea class="component-input-field" data-ref="inp_deleted_reason_user" placeholder="Razón proporcionada por el usuario..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title">Restricción de Acceso</h2>
                                <p class="component-card__description" data-ref="admin-isSuspended-desc">Aplica una suspensión para bloquear el acceso sin borrar el historial.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-dropdown-wrapper">
                                <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspended">
                                    <span class="material-symbols-rounded">shield</span>
                                    <span class="component-dropdown-text" data-ref="admin-isSuspended-text">Cargando...</span>
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

                    <div class="disabled" data-ref="section-suspended-reason">
                        <hr class="component-divider">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">Motivo de la suspensión</h2>
                                    <p class="component-card__description">Selecciona la razón principal por la cual se restringe el acceso a la plataforma.</p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="adminToggleModule" data-target="adminModuleSuspensionReason">
                                        <span class="material-symbols-rounded">format_list_bulleted</span>
                                        <span class="component-dropdown-text" data-ref="admin-suspensionReason-text">Seleccionar razón de suspensión...</span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionReason">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list component-menu-list--scrollable">
                                                
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Incumplimiento de los Términos y Condiciones">
                                                    <div class="component-menu-link-text"><span>Incumplimiento de los Términos y Condiciones</span></div>
                                                    <div><span class="component-badge component-badge--sm">7 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Información falsa o suplantación de identidad">
                                                    <div class="component-menu-link-text"><span>Información falsa o suplantación de identidad</span></div>
                                                    <div><span class="component-badge component-badge--sm">30 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Actividades ilegales">
                                                    <div class="component-menu-link-text"><span>Actividades ilegales</span></div>
                                                    <div><span class="component-badge component-badge--sm">30 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Uso indebido o fraudulento del servicio">
                                                    <div class="component-menu-link-text"><span>Uso indebido o fraudulento del servicio</span></div>
                                                    <div><span class="component-badge component-badge--sm">14 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Conducta abusiva o inapropiada">
                                                    <div class="component-menu-link-text"><span>Conducta abusiva o inapropiada</span></div>
                                                    <div><span class="component-badge component-badge--sm">3 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Publicación de contenido prohibido">
                                                    <div class="component-menu-link-text"><span>Publicación de contenido prohibido</span></div>
                                                    <div><span class="component-badge component-badge--sm">7 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Violación de propiedad intelectual">
                                                    <div class="component-menu-link-text"><span>Violación de propiedad intelectual</span></div>
                                                    <div><span class="component-badge component-badge--sm">14 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Envío de spam o uso de automatización no autorizada">
                                                    <div class="component-menu-link-text"><span>Envío de spam o uso de automatización no autorizada</span></div>
                                                    <div><span class="component-badge component-badge--sm">7 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Intentos de vulnerar la seguridad de la plataforma">
                                                    <div class="component-menu-link-text"><span>Intentos de vulnerar la seguridad de la plataforma</span></div>
                                                    <div><span class="component-badge component-badge--sm">30 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Uso de la cuenta para fines comerciales no autorizados">
                                                    <div class="component-menu-link-text"><span>Uso de la cuenta para fines comerciales no autorizados</span></div>
                                                    <div><span class="component-badge component-badge--sm">14 días</span></div>
                                                </div>
                                                <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionReason" data-value="Otro">
                                                    <div class="component-menu-link-text"><span>Otro</span></div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="disabled" data-ref="section-suspended-custom-reason">
                            <hr class="component-divider">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Especificar otro motivo (Suspensión)</h2>
                                        <div class="component-card__form-area">
                                            <textarea class="component-input-field" data-ref="inp_custom_suspension_reason" placeholder="Escribe la razón detallada para el usuario..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="disabled" data-ref="section-suspended-type">
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
                                            <span class="component-dropdown-text" data-ref="admin-suspendedType-text">Cargando...</span>
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

                        <div class="disabled" data-ref="section-suspended-duration">
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
                                            <span class="component-dropdown-text" data-ref="admin-suspensionDuration-text">Cargando...</span>
                                            <span class="material-symbols-rounded">expand_more</span>
                                        </div>
                                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="adminModuleSuspensionDuration">
                                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                                <div class="pill-container"><div class="drag-handle"></div></div>
                                                <div class="component-menu-list component-menu-list--scrollable">
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="1">
                                                        <div class="component-menu-link-text"><span>1 día</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="3">
                                                        <div class="component-menu-link-text"><span>3 días</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="7">
                                                        <div class="component-menu-link-text"><span>7 días</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="14">
                                                        <div class="component-menu-link-text"><span>14 días</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="30">
                                                        <div class="component-menu-link-text"><span>30 días</span></div>
                                                    </div>
                                                    <div class="component-menu-link" data-action="adminSetDropdown" data-key="suspensionDuration" data-value="custom">
                                                        <div class="component-menu-link-text"><span>Establecer tiempo manual</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="disabled" data-ref="section-suspended-date">
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
                                            <span class="component-dropdown-text" data-ref="admin-endDate-text">Seleccionar fecha y hora...</span>
                                        </div>
                                        <?php include __DIR__ . '/../../modules/moduleCalendar.php'; ?>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div class="component-card--grouped disabled" data-ref="section-notify-user">
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
                                    <input type="checkbox" data-ref="chk_notify_user" checked>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="disabled" data-ref="admin-status-password-area">
                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stacked">
                                
                                <div class="component-alert-error disabled" data-ref="admin-status-warning">
                                    <span class="material-symbols-rounded">warning</span>
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
                                                <input type="password" class="component-input-field component-input-field--with-icon" data-ref="admin_status_confirm_password" placeholder=" ">
                                                <label class="component-input-label">Tu contraseña actual</label>
                                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="disabled" data-ref="view-status-kardex">
                    
                    <div class="component-card--grouped">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content component-card__content--full">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_kardex_add_title', ['default' => 'Agregar nota administrativa']); ?></h2>
                                    <p class="component-card__description"><?php echo __('admin_kardex_add_desc', ['default' => 'Añade contexto adicional, enlaces a evidencias o reportes. Esta nota no modificará el estado actual de la cuenta.']); ?></p>
                                    <div class="component-card__form-area">
                                        <textarea class="component-input-field" data-ref="inp_new_admin_note" placeholder="Escribe tu nota aquí..." maxlength="1000"></textarea>
                                        <div data-ref="admin-note-counter">0 / 1000 caracteres</div>
                                    </div>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <button class="component-button component-button--h36 component-button--dark" data-action="submitAdminNote" data-ref="btn-submit-note"><?php echo __('btn_add_note', ['default' => 'Guardar nota']); ?></button>
                            </div>
                        </div>
                    </div>

                    <div data-ref="kardex-list-container">
                        </div>

                </div>

            </div>
        </div>
    </div>
</div>