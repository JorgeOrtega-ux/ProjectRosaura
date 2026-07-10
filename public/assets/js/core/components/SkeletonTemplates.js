export const SkeletonTemplates = {
    get(type) {
        switch (type) {
            case 'layout-grid':
                return this.gridSkeleton();
            default:
                return this.basicSkeleton();
        }
    },

    basicSkeleton() {
        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <div class="component-header-card">
                        <div class="component-skeleton component-skeleton--title component-skeleton--centered" style="margin-bottom: 16px;"></div>
                        <div class="component-skeleton component-skeleton--text-medium component-skeleton--centered"></div>
                    </div>
                    <div class="component-card--grouped" style="padding: 24px;">
                        <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; border-radius: 8px;"></div>
                        <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; border-radius: 8px;"></div>
                        <div class="component-skeleton component-skeleton--h45" style="border-radius: 8px;"></div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    gridSkeleton() {
        let cards = '';
        for (let i = 0; i < 12; i++) {
            cards += `
            <div class="component-skeleton" style="width: 100%; aspect-ratio: 2/1; border-radius: 12px;"></div>`;
        }
        
        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding">
                
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--title" style="width: 200px;"></div>
                    </div>
                    
                    <div class="component-top-right">
                        <div class="component-actions active">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                                <div class="component-skeleton component-skeleton--h40" style="width: 40px; border-radius: 8px;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-bottom" style="padding: 0;" data-ref="dynamic-content-area">
                    <div class="component-grid" data-ref="home-all-canvases">
                        ${cards}
                    </div>
                </div>
                
            </div>
        </div>`;
    }
};