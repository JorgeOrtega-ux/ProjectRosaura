<?php
// includes/views/studio/manage-content-playlist.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions">
                        <button class="component-button component-button--primary" data-tooltip="<?php echo __('studio_tooltip_new_playlist'); ?>">
                            <span class="material-symbols-rounded">playlist_add</span>
                            <span><?php echo __('studio_btn_new_playlist'); ?></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-table-wrapper">
                    <table class="component-table component-table--media">
                        <thead>
                            <tr>
                                <th><?php echo __('studio_th_playlist'); ?></th>
                                <th><?php echo __('studio_th_type'); ?></th>
                                <th><?php echo __('studio_th_status_visibility'); ?></th>
                                <th><?php echo __('studio_th_last_update'); ?></th>
                                <th><?php echo __('studio_th_video_count'); ?></th>
                                <th><?php echo __('studio_th_views'); ?></th>
                            </tr>
                        </thead>
                        <tbody id="managePlaylistTableBody">
                            <tr>
                                <td colspan="6" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">playlist_play</span>
                                        <p class="component-empty-state-text"><?php echo __('studio_empty_playlists'); ?></p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
</div>