<div class="view-content component-layout-centered" style="align-items: flex-start; padding-top: 24px;">
    <div class="component-wrapper component-wrapper--full">
        
        <div class="feed-section-wrapper">
            <div class="feed-section-top">
                <h2 class="feed-section-title"><?php echo __('Videos Recomendados'); ?></h2>
            </div>
            <div class="feed-section-bottom">
                <div id="video-feed-container" class="video-feed-grid">
                    <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                </div>
            </div>
        </div>

        <div class="feed-section-wrapper">
            <div class="feed-section-top">
                <h2 class="feed-section-title"><?php echo __('Shorts'); ?></h2>
            </div>
            <div class="feed-section-bottom relative-carousel-wrapper">
                
                <button class="carousel-nav-btn carousel-nav-btn--left disabled" id="btn-scroll-left">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>

                <div class="carousel-viewport">
                    <div id="vertical-feed-container" class="video-feed-horizontal-scroll carousel-track">
                        <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                    </div>
                </div>

                <button class="carousel-nav-btn carousel-nav-btn--right" id="btn-scroll-right">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>

            </div>
        </div>

    </div>
</div>