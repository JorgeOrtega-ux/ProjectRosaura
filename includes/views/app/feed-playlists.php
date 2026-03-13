<?php
// includes/views/app/feed-playlists.php
?>
<div class="view-content component-layout-centered feed-playlists-container">
    <div class="component-wrapper component-wrapper--full">
        
        <div class="component-header-section" style="margin-bottom: 24px;">
            <h1 class="component-typography-h2" id="feedPlaylistsTitle"><?php echo __('Mis listas de reproducción'); ?></h1>
            <p class="component-typography-body" style="color: var(--text-secondary); margin-top: 8px;">
                <?php echo __('Aquí encontrarás todas tus listas guardadas y creadas.'); ?>
            </p>
        </div>

        <div id="feed-playlists-grid" class="component-playlist-grid">
            <div class="component-spinner component-spinner--centered" style="margin-top: 50px;"></div>
        </div>

    </div>
</div>