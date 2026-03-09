<div class="view-content component-layout-centered" style="align-items: flex-start; padding-top: 24px;">
    <div class="component-wrapper component-wrapper--full">
        
        <div class="playlist-layout" style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start;">
            
            <div class="playlist-sidebar" style="flex: 1; min-width: 320px; max-width: 400px; background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(10px); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 80px;">
                <div id="playlist-details-container">
                    <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                </div>
            </div>

            <div class="playlist-content" style="flex: 2; min-width: 320px; display: flex; flex-direction: column; gap: 16px;">
                <h2 class="component-feed-title" style="margin-bottom: 0; font-size: 20px;"><?php echo __('Videos en esta lista'); ?></h2>
                
                <div id="playlist-videos-container" style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="component-spinner component-spinner--centered" style="margin-top: 40px;"></div>
                </div>
            </div>

        </div>

    </div>
</div>