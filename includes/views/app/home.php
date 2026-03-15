<div class="component-view-layout">
            
    <div class="component-view-top" style="padding: 24px 24px 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        
        <div class="component-view-top-left">
            <div class="component-badge-list" id="home-category-badges">
                <div class="component-spinner" style="width: 20px; height: 20px;"></div>
            </div>
        </div>
        
        <div class="component-view-top-right">
            </div>

    </div>

    <div class="component-view-bottom component-layout-centered" style="align-items: flex-start; padding-top: 24px;">
        <div class="component-wrapper component-wrapper--full" style="padding: 0;">
            
            <div class="component-feed-section">
                <div class="component-feed-header">
                    <h2 class="component-feed-title"><?php echo __('Videos Recomendados'); ?></h2>
                </div>
                <div class="component-feed-body">
                    <div id="video-feed-container" class="component-video-grid">
                        <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                    </div>
                </div>
            </div>

            <div class="component-feed-section">
                <div class="component-feed-header">
                    <h2 class="component-feed-title"><?php echo __('Shorts'); ?></h2>
                </div>
                <div class="component-feed-body component-carousel-wrapper">
                    
                    <button class="component-carousel-btn component-carousel-btn--left disabled" id="btn-scroll-left">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>

                    <div class="carousel-viewport" style="overflow: hidden;">
                        <div id="vertical-feed-container" class="component-video-scroll carousel-track">
                            <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                        </div>
                    </div>

                    <button class="component-carousel-btn component-carousel-btn--right" id="btn-scroll-right">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>

                </div>
            </div>

            <div class="component-feed-section">
                <div class="component-feed-header">
                    <h2 class="component-feed-title"><?php echo __('Listas de reproducción') ?? 'Listas de reproducción'; ?></h2>
                </div>
                <div class="component-feed-body">
                    <div id="playlist-feed-container" class="component-video-grid">
                        <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>