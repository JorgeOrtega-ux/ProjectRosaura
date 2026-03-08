<div class="view-content component-layout-centered" style="align-items: flex-start; padding-top: 24px;">
    <div class="component-wrapper component-wrapper--full">
        
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

                <div class="carousel-viewport">
                    <div id="vertical-feed-container" class="component-video-scroll carousel-track">
                        <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                    </div>
                </div>

                <button class="component-carousel-btn component-carousel-btn--right" id="btn-scroll-right">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>

            </div>
        </div>

    </div>
</div>