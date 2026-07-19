export const SkeletonTemplates = {
    get(type) {
        switch (type) {
            case 'layout-grid':
                return this.gridSkeleton();
            case 'homeCanvasGrid':
                return this.gridCardsSkeleton();
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
                        <div class="component-skeleton component-skeleton--title component-skeleton--centered"></div>
                        <div class="component-skeleton component-skeleton--text-medium component-skeleton--centered"></div>
                    </div>
                    <div class="component-card--grouped">
                        <div class="component-skeleton component-skeleton--h45"></div>
                        <div class="component-skeleton component-skeleton--h45"></div>
                        <div class="component-skeleton component-skeleton--h45"></div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    gridSkeleton() {
        let cards = '';
        for (let i = 0; i < 12; i++) {
            cards += `
            <div class="component-skeleton component-skeleton--card"></div>`;
        }
        
        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding">
                
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--title"></div>
                    </div>
                    
                    <div class="component-top-right">
                        <div class="component-actions active">
                            <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                                <div class="component-skeleton component-skeleton--h40"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-bottom" data-ref="dynamic-content-area">
                    <div class="component-grid" data-ref="home-all-canvases">
                        ${cards}
                    </div>
                </div>
                
            </div>
        </div>`;
    },

    gridCardsSkeleton() {
        let cards = '';
        for (let i = 0; i < 12; i++) {
            cards += `
            <div class="component-skeleton component-skeleton--card"></div>`;
        }
        return cards;
    }
};