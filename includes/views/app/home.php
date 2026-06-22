<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="purchase-history-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('home_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                </div>
            </div>
        </div>

        <div class="component-bottom">
            
            <div class="component-grid" id="home-public-canvases">
                
                <?php for($i = 0; $i < 8; $i++): ?>
                    <div class="component-snapshot-card skeleton-card" style="pointer-events: none;">
                        <div class="component-snapshot-card__image skeleton-block" style="background: var(--skeleton-bg, #e2e8f0); height: 160px; border-radius: 8px; width: 100%;"></div>
                        <div class="component-snapshot-link" style="margin-top: 12px;">
                            <div class="skeleton-text" style="background: var(--skeleton-bg, #e2e8f0); height: 20px; border-radius: 4px; width: 70%;"></div>
                        </div>
                    </div>
                <?php endfor; ?>

            </div>
            
        </div>

    </div>
</div>