export const SkeletonTemplates = {
    get(type) {
        switch (type) {
            case 'layout-grid':
                return this.gridSkeleton();
            case 'layout-table':
            case 'tableSkeleton':
                return this.tableSkeleton();
            case 'listTableSkeleton':
            case 'tableOnlySkeleton':
                return this.listTableSkeleton();
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
    },

    listTableSkeleton(rows = 6) {
        let rowItems = '';
        for (let i = 0; i < rows; i++) {
            rowItems += `
            <tr class="component-table-row">
                <td><div class="component-skeleton component-skeleton--h20 component-skeleton--pill" style="width: 140px;"></div></td>
                <td><div class="component-skeleton component-skeleton--h20 component-skeleton--pill" style="width: 100px;"></div></td>
                <td><div class="component-skeleton component-skeleton--h20 component-skeleton--pill" style="width: 90px;"></div></td>
                <td><div class="component-skeleton component-skeleton--h20 component-skeleton--pill" style="width: 80px;"></div></td>
                <td><div class="component-skeleton component-skeleton--h20 component-skeleton--pill" style="width: 110px;"></div></td>
            </tr>`;
        }

        return `
        <div class="component-table-wrapper">
            <table class="component-table">
                <thead>
                    <tr>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--pill" style="width: 100px;"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--pill" style="width: 80px;"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--pill" style="width: 70px;"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--pill" style="width: 70px;"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--pill" style="width: 90px;"></div></th>
                    </tr>
                </thead>
                <tbody>
                    ${rowItems}
                </tbody>
            </table>
        </div>`;
    },

    tableSkeleton() {
        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
                
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--title component-skeleton--pill"></div>
                    </div>
                    
                    <div class="component-top-right">
                        <div class="component-actions active">
                            <div class="component-skeleton component-skeleton--h40 component-skeleton--pill" style="width: 40px;"></div>
                            <div class="component-skeleton component-skeleton--h40 component-skeleton--pill" style="width: 40px;"></div>
                            <div class="component-skeleton component-skeleton--h40 component-skeleton--pill" style="width: 120px;"></div>
                        </div>
                    </div>
                </div>

                <div class="component-bottom">
                    ${this.listTableSkeleton()}
                </div>
                
            </div>
        </div>`;
    }
};