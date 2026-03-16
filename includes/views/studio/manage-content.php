<?php
// includes/views/studio/manage-content.php
if (session_status() === PHP_SESSION_NONE) session_start();

$isCreator = $_SESSION['is_creator'] ?? 0;
$hasPermission = ($isCreator == 1);

if (!$hasPermission) {
    echo '<div class="view-content"><div class="component-wrapper component-wrapper--full no-padding"><div class="component-container" style="text-align:center; padding: 50px;"><span class="material-symbols-rounded" style="font-size: 64px; color: var(--color-error);">block</span><h1 style="margin-top:20px;">Acceso Denegado</h1><p style="opacity:0.7;">No tienes habilitado el modo de creador. No puedes administrar contenido.</p></div></div></div>';
    return;
}

// Extraemos el UUID de la URL actual para construir el enlace a la playlist
$currentUuid = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions">
                        
                        <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/manage-content/playlist/<?php echo $currentUuid; ?>" data-tooltip="<?php echo __('studio_tooltip_playlists'); ?>">
                            <span class="material-symbols-rounded">featured_play_list</span>
                        </button>
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <div class="component-dropdown-trigger disabled" id="btnQuickVisibility" data-action="toggleModule" data-target="quickVisibilityMenu" disabled>
                                <span class="material-symbols-rounded" id="quickVisibilityBtnIcon">public</span>
                                <span class="component-dropdown-text" id="quickVisibilityBtnText"><?php echo __('studio_visibility_public'); ?></span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="quickVisibilityMenu" data-module="quickVisibilityMenu">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        
                                        <div class="component-menu-link active" data-action="selectQuickVisibility" data-value="public" data-icon="public" data-text="<?php echo __('studio_visibility_public'); ?>">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('studio_visibility_public'); ?></span>
                                            </div>
                                        </div>
                                        
                                        <div class="component-menu-link" data-action="selectQuickVisibility" data-value="unlisted" data-icon="link" data-text="<?php echo __('studio_visibility_unlisted'); ?>">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('studio_visibility_unlisted'); ?></span>
                                            </div>
                                        </div>

                                        <div class="component-menu-link" data-action="selectQuickVisibility" data-value="private" data-icon="lock" data-text="<?php echo __('studio_visibility_private'); ?>">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                            <div class="component-menu-link-text">
                                                <span><?php echo __('studio_visibility_private'); ?></span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="component-button component-button--icon component-button--h40 btn-delete-video disabled" id="btnDeleteSelectedVideo" data-tooltip="<?php echo __('studio_tooltip_delete_video'); ?>" disabled>
                            <span class="material-symbols-rounded">delete</span>
                        </button>

                        <button class="component-button component-button--icon component-button--h40 disabled" id="btnEditSelectedVideo" data-tooltip="<?php echo __('studio_tooltip_edit_video'); ?>" disabled>
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        
                        <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/upload" data-tooltip="<?php echo __('studio_tooltip_upload_video'); ?>">
                            <span class="material-symbols-rounded">upload</span>
                        </button>

                    </div>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-table-wrapper">
                    <table class="component-table component-table--media">
                        <thead>
                            <tr>
                                <th><?php echo __('studio_th_video'); ?></th>
                                <th><?php echo __('studio_th_orientation'); ?></th>
                                <th><?php echo __('studio_th_status_visibility'); ?></th>
                                <th><?php echo __('studio_th_restrictions'); ?></th>
                                <th><?php echo __('studio_th_date'); ?></th>
                                <th><?php echo __('studio_th_views'); ?></th>
                                <th><?php echo __('studio_th_comments'); ?></th>
                                <th><?php echo __('studio_th_likes'); ?></th>
                            </tr>
                        </thead>
                        <tbody id="manageContentTableBody">
                            </tbody>
                    </table>

                    <template id="emptyTableTemplate">
                        <tr>
                            <td colspan="8" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">video_library</span>
                                    <p class="component-empty-state-text"><?php echo __('studio_empty_videos'); ?></p>
                                </div>
                            </td>
                        </tr>
                    </template>
                </div>
            </div>

        </div>
    </div>
</div>