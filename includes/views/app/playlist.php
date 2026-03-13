<?php
// includes/views/app/playlist.php
?>
<div class="view-content component-layout-centered playlist-page-container">
    <div class="component-wrapper component-wrapper--full">
        
        <div class="playlist-layout">
            
            <div class="playlist-sidebar">
                <div id="playlist-details-container">
                    <div class="component-spinner component-spinner--centered playlist-spinner"></div>
                </div>
            </div>

            <div class="playlist-content">
                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('Videos en esta lista'); ?></h2>
                                <p class="component-card__description" id="playlist-video-count-desc"></p>
                            </div>
                        </div>
                    </div>

                    <div id="playlist-videos-container" class="playlist-videos-wrapper" data-is-system="false">
                        <div class="component-spinner component-spinner--centered playlist-spinner"></div>
                    </div>

                </div>
            </div>

        </div>

    </div>
</div>