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
            case 'layout-list':
            case 'listSkeleton':
                return this.listSkeleton();
            case 'layout-dashboard':
            case 'adminDashboard':
                return this.adminDashboardSkeleton();
            case 'layout-auth':
            case 'authSkeleton':
                return this.authSkeleton();
            case 'layout-policy':
            case 'policySkeleton':
                return this.policySkeleton();
            case 'chatSkeleton':
                return this.chatSkeleton();
            default:
                return this.basicSkeleton();
        }
    },

    basicSkeleton() {
        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <!-- Header Card Skeleton (Centered) -->
                    <div class="component-header-card component-skeleton-header">
                        <div class="component-skeleton component-skeleton--header-title"></div>
                        <div class="component-skeleton component-skeleton--header-desc"></div>
                    </div>

                    <!-- Grouped Settings / Account Info Skeleton -->
                    <div class="component-card--grouped">
                        <!-- Item 1: Avatar / Profile row -->
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-skeleton component-skeleton--avatar-sm"></div>
                                <div class="component-card__text">
                                    <div class="component-skeleton component-skeleton--title-sm"></div>
                                    <div class="component-skeleton component-skeleton--desc-sm"></div>
                                </div>
                            </div>
                            <div class="component-card__actions">
                                <div class="component-skeleton component-skeleton--btn-sm"></div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <!-- Item 2: Setting row with icon -->
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-skeleton component-skeleton--icon-box"></div>
                                <div class="component-card__text">
                                    <div class="component-skeleton component-skeleton--title-md"></div>
                                    <div class="component-skeleton component-skeleton--desc-md"></div>
                                </div>
                            </div>
                            <div class="component-card__actions">
                                <div class="component-skeleton component-skeleton--btn-md"></div>
                            </div>
                        </div>

                        <hr class="component-divider">

                        <!-- Item 3: Setting row with icon -->
                        <div class="component-group-item">
                            <div class="component-card__content">
                                <div class="component-skeleton component-skeleton--icon-box"></div>
                                <div class="component-card__text">
                                    <div class="component-skeleton component-skeleton--title-xs"></div>
                                    <div class="component-skeleton component-skeleton--desc-xs"></div>
                                </div>
                            </div>
                            <div class="component-card__actions">
                                <div class="component-skeleton component-skeleton--btn-xs"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Second Card Block: Form / Input Skeleton -->
                    <div class="component-card--grouped">
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-skeleton component-skeleton--label-sm"></div>
                            <div class="component-skeleton component-skeleton--input-box"></div>
                        </div>

                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-skeleton component-skeleton--label-md"></div>
                            <div class="component-skeleton component-skeleton--input-box"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    adminDashboardSkeleton() {
        let statCards = '';
        for (let i = 0; i < 8; i++) {
            statCards += `
            <div class="component-skeleton-stat-card">
                <div class="component-skeleton component-skeleton--icon-box"></div>
                <div class="component-card__text">
                    <div class="component-skeleton component-skeleton--title-xs"></div>
                    <div class="component-skeleton component-skeleton--title-sm"></div>
                </div>
            </div>`;
        }

        const barClasses = [
            'component-skeleton-chart-bar--h45',
            'component-skeleton-chart-bar--h70',
            'component-skeleton-chart-bar--h85',
            'component-skeleton-chart-bar--h55',
            'component-skeleton-chart-bar--h95',
            'component-skeleton-chart-bar--h60',
            'component-skeleton-chart-bar--h80',
            'component-skeleton-chart-bar--h40'
        ];
        let chartBars = barClasses.map(c => `<div class="component-skeleton component-skeleton-chart-bar ${c}"></div>`).join('');

        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding">
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--control"></div>
                    </div>
                    <div class="component-top-right">
                        <div class="component-skeleton component-skeleton--btn-icon"></div>
                        <div class="component-skeleton component-skeleton--btn-icon"></div>
                        <div class="component-skeleton component-skeleton--btn-icon"></div>
                        <div class="component-skeleton component-skeleton--btn-icon"></div>
                    </div>
                </div>

                <div class="component-bottom component-bottom--padded">
                    <div class="component-stat-grid">
                        ${statCards}
                    </div>

                    <div class="component-skeleton-charts-grid">
                        <!-- Chart Card 1: Vertical Bar Graph Skeleton -->
                        <div class="component-skeleton-chart-box">
                            <div class="component-skeleton-chart-header">
                                <div class="component-skeleton component-skeleton--title-md"></div>
                                <div class="component-skeleton component-skeleton--control"></div>
                            </div>
                            <div class="component-skeleton-chart-body">
                                ${chartBars}
                            </div>
                        </div>

                        <!-- Chart Card 2: Horizontal Metrics Skeleton -->
                        <div class="component-skeleton-chart-box">
                            <div class="component-skeleton-chart-header">
                                <div class="component-skeleton component-skeleton--title-sm"></div>
                                <div class="component-skeleton component-skeleton--btn-icon"></div>
                            </div>
                            <div class="component-skeleton-chart-body component-skeleton-chart-body--horizontal">
                                <div class="component-skeleton component-skeleton--label-md"></div>
                                <div class="component-skeleton component-skeleton--input-box"></div>
                                <div class="component-skeleton component-skeleton--label-sm"></div>
                                <div class="component-skeleton component-skeleton--input-box"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    authSkeleton() {
        return `
        <div class="component-skeleton-auth-container">
            <div class="component-skeleton-auth-card">
                <div class="component-skeleton-header">
                    <div class="component-skeleton component-skeleton--header-title"></div>
                    <div class="component-skeleton component-skeleton--desc-sm"></div>
                </div>
                <div class="component-group-item--stacked component-group-item--full">
                    <div class="component-skeleton component-skeleton--label-sm"></div>
                    <div class="component-skeleton component-skeleton--input-box"></div>
                </div>
                <div class="component-group-item--stacked component-group-item--full">
                    <div class="component-skeleton component-skeleton--label-md"></div>
                    <div class="component-skeleton component-skeleton--input-box"></div>
                </div>
                <div class="component-skeleton component-skeleton--button-full"></div>
                <div class="component-skeleton component-skeleton--desc-xs"></div>
            </div>
        </div>`;
    },

    policySkeleton() {
        let sections = '';
        for (let i = 0; i < 4; i++) {
            sections += `
            <div class="component-skeleton-policy-block">
                <div class="component-skeleton component-skeleton--title-md"></div>
                <div class="component-skeleton component-skeleton--text"></div>
                <div class="component-skeleton component-skeleton--text-medium"></div>
                <div class="component-skeleton component-skeleton--text-short"></div>
            </div>
            ${i < 3 ? '<hr class="component-divider">' : ''}`;
        }

        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding">
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--control"></div>
                    </div>
                </div>
                <div class="component-bottom policy-container">
                    ${sections}
                </div>
            </div>
        </div>`;
    },

    listSkeleton(count = 5) {
        let items = '';
        for (let i = 0; i < count; i++) {
            items += `
            <div class="component-group-item">
                <div class="component-card__content">
                    <div class="component-skeleton component-skeleton--avatar-sm"></div>
                    <div class="component-card__text">
                        <div class="component-skeleton component-skeleton--title-sm"></div>
                        <div class="component-skeleton component-skeleton--desc-sm"></div>
                    </div>
                </div>
                <div class="component-card__actions">
                    <div class="component-skeleton component-skeleton--pill-badge"></div>
                    <div class="component-skeleton component-skeleton--btn-square"></div>
                </div>
            </div>
            ${i < count - 1 ? '<hr class="component-divider">' : ''}`;
        }

        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <div class="component-header-card component-skeleton-header">
                        <div class="component-skeleton component-skeleton--header-title"></div>
                        <div class="component-skeleton component-skeleton--header-desc"></div>
                    </div>
                    <div class="component-card--grouped">
                        ${items}
                    </div>
                </div>
            </div>
        </div>`;
    },

    gridSkeleton() {
        return `
        <div class="view-content">
            <div class="component-wrapper component-wrapper--full no-padding">
                
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--control"></div>
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
                        ${this.gridCardsSkeleton()}
                    </div>
                </div>
                
            </div>
        </div>`;
    },

    gridCardsSkeleton(count = 12) {
        let cards = '';
        for (let i = 0; i < count; i++) {
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
                <td><div class="component-badge component-badge--sm component-skeleton component-skeleton--badge component-skeleton--w140"></div></td>
                <td><div class="component-badge component-badge--sm component-skeleton component-skeleton--badge component-skeleton--w100"></div></td>
                <td><div class="component-badge component-badge--sm component-skeleton component-skeleton--badge component-skeleton--w90"></div></td>
                <td><div class="component-badge component-badge--sm component-skeleton component-skeleton--badge component-skeleton--w80"></div></td>
                <td><div class="component-badge component-badge--sm component-skeleton component-skeleton--badge component-skeleton--w110"></div></td>
            </tr>`;
        }

        return `
        <div class="component-table-wrapper">
            <table class="component-table">
                <thead>
                    <tr>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--w100"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--w80"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--w70"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--w70"></div></th>
                        <th><div class="component-skeleton component-skeleton--h16 component-skeleton--w90"></div></th>
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
            <div class="component-wrapper component-wrapper--full no-padding">
                
                <div class="component-top">
                    <div class="component-top-left">
                        <div class="component-skeleton component-skeleton--control"></div>
                    </div>
                    
                    <div class="component-top-right">
                        <div class="component-actions active">
                            <div class="component-skeleton component-skeleton--btn-icon"></div>
                            <div class="component-skeleton component-skeleton--btn-icon"></div>
                            <div class="component-skeleton component-skeleton--control"></div>
                        </div>
                    </div>
                </div>

                <div class="component-bottom">
                    ${this.listTableSkeleton()}
                </div>
                
            </div>
        </div>`;
    },

    chatSkeleton() {
        return `
        <div class="chat-skeleton-container">
            <div class="chat-skeleton-group">
                <div class="component-skeleton component-skeleton--avatar"></div>
                <div class="chat-skeleton-content">
                    <div class="component-skeleton component-skeleton--text-short"></div>
                    <div class="component-skeleton component-skeleton--h45"></div>
                </div>
            </div>
            
            <div class="chat-skeleton-group chat-skeleton-group--reverse">
                <div class="component-skeleton component-skeleton--avatar"></div>
                <div class="chat-skeleton-content chat-skeleton-content--end">
                    <div class="component-skeleton component-skeleton--text-short"></div>
                    <div class="component-skeleton component-skeleton--h100"></div>
                </div>
            </div>

            <div class="chat-skeleton-group">
                <div class="component-skeleton component-skeleton--avatar"></div>
                <div class="chat-skeleton-content">
                    <div class="component-skeleton component-skeleton--text-short"></div>
                    <div class="component-skeleton component-skeleton--h40"></div>
                </div>
            </div>

            <div class="chat-skeleton-group chat-skeleton-group--reverse">
                <div class="component-skeleton component-skeleton--avatar"></div>
                <div class="chat-skeleton-content chat-skeleton-content--end">
                    <div class="component-skeleton component-skeleton--text-short"></div>
                    <div class="component-skeleton component-skeleton--h45"></div>
                </div>
            </div>

            <div class="chat-skeleton-group">
                <div class="component-skeleton component-skeleton--avatar"></div>
                <div class="chat-skeleton-content">
                    <div class="component-skeleton component-skeleton--text-short"></div>
                    <div class="component-skeleton component-skeleton--h60"></div>
                </div>
            </div>
        </div>`;
    }
};