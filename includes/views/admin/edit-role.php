<?php
// includes/views/admin/edit-role.php
if (session_status() === PHP_SESSION_NONE) session_start();

$currentUserRole = $_SESSION['user_role'] ?? 'user';
$isFounder = ($currentUserRole === 'founder');
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('admin_manage_role_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_manage_role_desc'); ?></p>
        </div>

        <div data-ref="admin-role-loader">
            <div class="component-spinner component-spinner--centered"></div>
        </div>

        <div data-ref="admin-role-form" class="disabled">
            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content">
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_assign_role_title'); ?></h2>
                            <p class="component-card__description" data-ref="admin-role-desc"><?php echo __('admin_assign_role_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--start">
                        <div class="component-dropdown-wrapper">
                            <div class="component-dropdown-trigger" data-action="adminToggleModuleRole">
                                <span class="material-symbols-rounded">admin_panel_settings</span>
                                <span class="component-dropdown-text" data-ref="admin-role-text"><?php echo __('loading_text'); ?></span>
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
                                                <input type="text" placeholder="<?php echo __('search_role_placeholder'); ?>">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        
                                        <?php if ($isFounder): ?>
                                            <div class="component-menu-link disabled-interaction" data-action="adminSetRole" data-value="founder" title="<?php echo __('role_founder_db_only'); ?>">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">local_police</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('role_founder'); ?></span></div>
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                            </div>
                                            <div class="component-menu-link" data-action="adminSetRole" data-value="administrator">
                                                <div class="component-menu-link-icon"><span class="material-symbols-rounded">shield_person</span></div>
                                                <div class="component-menu-link-text"><span><?php echo __('role_admin'); ?></span></div>
                                            </div>
                                        <?php endif; ?>
                                        
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="moderator">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">gavel</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('role_moderator'); ?></span></div>
                                        </div>
                                        <div class="component-menu-link" data-action="adminSetRole" data-value="user">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">person</span></div>
                                            <div class="component-menu-link-text"><span><?php echo __('role_user'); ?></span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div data-ref="admin-role-password-area" class="disabled">
                <div class="component-card--grouped">
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full component-card__content--start">
                            
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">lock</span>
                            </div>

                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_verify_identity_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_verify_identity_role_desc'); ?> <b data-ref="admin-role-preview"></b>.</p>
                                
                                <div class="component-card__form-area">
                                    <div class="component-input-group">
                                        <input type="password" data-ref="admin_role_confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                        <label class="component-input-label"><?php echo __('lbl_current_password'); ?></label>
                                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <button class="component-button component-button--h36" data-action="cancelRoleUpdate"><?php echo __('btn_cancel'); ?></button>
                            <button class="component-button component-button--h36 component-button--dark" data-action="submitRoleUpdate"><?php echo __('btn_verify_execute'); ?></button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>