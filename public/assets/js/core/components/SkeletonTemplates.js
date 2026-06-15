export const SkeletonTemplates = {
    get(type) {
        switch (type) {
            case 'layout-auth': return this.authBox();
            case 'layout-settings-profile': return this.settingsProfile();
            case 'layout-settings-generic': return this.settingsGeneric();
            case 'layout-admin-actions': return this.adminActions();
            case 'layout-table': return this.fullTable();
            case 'layout-form-constrained': return this.formConstrained();
            case 'layout-form-full': return this.formFullWidth();
            case 'layout-dashboard': return this.dashboardGrid();
            case 'layout-list': return this.simpleList();
            default: return this.settingsGeneric();
        }
    },

    /**
     * 1. AUTH BOX (Login, Register, Recovery)
     */
    authBox() {
        return `
        <div class="component-layout-centered">
            <div class="component-form-box">
                <div class="component-skeleton component-skeleton--h24 component-skeleton--centered" style="width: 50%; margin-bottom: 16px;"></div>
                <div class="component-skeleton component-skeleton--h14 component-skeleton--centered" style="width: 70%; margin-bottom: 16px;"></div>
                <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; margin-top: 32px; border-radius: 8px;"></div>
                <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; border-radius: 8px;"></div>
                <div class="component-skeleton component-skeleton--h45" style="margin-top: 16px; border-radius: 8px;"></div>
            </div>
        </div>`;
    },

    /**
     * 2. SETTINGS PROFILE (Tiene el layout de Avatar, usa Layout Simple sin Top ni Viewport)
     */
    settingsProfile() {
        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <div class="component-header-card">
                        <div class="component-skeleton component-skeleton--title component-skeleton--centered" style="margin-bottom: 16px;"></div>
                        <div class="component-skeleton component-skeleton--text-medium component-skeleton--centered"></div>
                    </div>
                    <div class="component-card--grouped">
                        <div class="component-group-item">
                            <div class="component-card__content" style="display:flex; gap:16px; align-items:center; flex:1;">
                                <div class="component-skeleton component-skeleton--avatar"></div>
                                <div class="component-card__text" style="width:100%;">
                                    <div class="component-skeleton component-skeleton--h20" style="width: 40%; margin-bottom: 8px;"></div>
                                    <div class="component-skeleton component-skeleton--text-medium"></div>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <div class="component-skeleton component-skeleton--button"></div>
                            </div>
                        </div>
                        <hr class="component-divider">
                        ${this._groupItemRow()}
                        <hr class="component-divider">
                        ${this._groupItemRow()}
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 3. SETTINGS GENERIC (Accesibilidad, Billing, Mantenimiento. Sin Top ni Viewport)
     */
    settingsGeneric() {
        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <div class="component-header-card">
                        <div class="component-skeleton component-skeleton--title component-skeleton--centered" style="margin-bottom: 16px;"></div>
                        <div class="component-skeleton component-skeleton--text-medium component-skeleton--centered"></div>
                    </div>
                    <div class="component-card--grouped">
                        ${this._groupItemRow()}
                        <hr class="component-divider">
                        ${this._groupItemRow()}
                        <hr class="component-divider">
                        ${this._groupItemRow()}
                    </div>
                    <div class="component-card--grouped">
                        ${this._groupItemToggle()}
                        <hr class="component-divider">
                        ${this._groupItemToggle()}
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 4. ADMIN ACTIONS (Especial para server-config.php con cabecera y viewport)
     */
    adminActions() {
        return `
        <div class="view-content">
            <div class="component-top">
                <div class="component-top-left">
                    <div class="component-skeleton component-skeleton--title"></div>
                </div>
                <div class="component-top-right">
                    <div class="component-skeleton component-skeleton--avatar-sm"></div>
                </div>
            </div>
            <div class="component-viewport">
                <div class="component-wrapper component-wrapper--full no-padding">
                    <div class="component-bottom component-bottom--padded">
                        <div class="component-card--grouped">
                            ${this._groupItemAction()}
                            <hr class="component-divider">
                            ${this._groupItemAction()}
                            <hr class="component-divider">
                            ${this._groupItemAction()}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 5. TABLE FULL WIDTH (Manage Users, Logs, Backups)
     */
    fullTable() {
        let rows = '';
        for (let i = 0; i < 8; i++) {
            rows += `<tr><td><div class="component-skeleton component-skeleton--h24"></div></td></tr>`;
        }
        return `
        <div class="view-content">
            <div class="component-top">
                <div class="component-top-left">
                    <div class="component-skeleton component-skeleton--title"></div>
                </div>
                <div class="component-top-right">
                    <div class="component-skeleton component-skeleton--h40" style="width: 200px; border-radius: 8px;"></div>
                    <div class="component-skeleton component-skeleton--avatar-sm"></div>
                </div>
            </div>
            <div class="component-viewport">
                <div class="component-wrapper component-wrapper--full no-padding">
                    <div class="component-bottom" style="height: 100%;">
                        <div class="component-table-wrapper">
                            <table class="component-table">
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 6. FORM CONSTRAINED (Edit User, Create Backup. Estructura Completa con Top)
     */
    formConstrained() {
        return `
        <div class="view-content">
            <div class="component-top">
                <div class="component-top-left">
                    <div class="component-skeleton component-skeleton--title"></div>
                </div>
                <div class="component-top-right">
                    <div class="component-skeleton component-skeleton--button"></div>
                </div>
            </div>
            <div class="component-viewport">
                <div class="component-wrapper">
                    <div class="component-bottom">
                        <div class="component-card--grouped" style="padding:24px;">
                            <div class="component-skeleton component-skeleton--title" style="margin-bottom: 16px;"></div>
                            <div class="component-skeleton component-skeleton--text-medium" style="margin-bottom: 16px;"></div>
                            
                            <div style="margin-top:24px;">
                                <div class="component-skeleton component-skeleton--h14" style="width: 20%; margin-bottom: 8px;"></div>
                                <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; border-radius: 8px;"></div>
                                
                                <div class="component-skeleton component-skeleton--h14" style="width: 20%; margin-bottom: 8px;"></div>
                                <div class="component-skeleton component-skeleton--h45" style="margin-bottom: 16px; border-radius: 8px;"></div>
                                
                                <div class="component-skeleton component-skeleton--h14" style="width: 20%; margin-bottom: 8px;"></div>
                                <div class="component-skeleton component-skeleton--card"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 7. FORM FULL WIDTH (Role Builder Permissions)
     */
    formFullWidth() {
        return `
        <div class="view-content">
            <div class="component-top">
                <div class="component-top-left">
                    <div class="component-skeleton component-skeleton--title"></div>
                </div>
                <div class="component-top-right">
                    <div class="component-skeleton component-skeleton--avatar-sm"></div>
                </div>
            </div>
            <div class="component-viewport">
                <div class="component-wrapper component-wrapper--full">
                    <div class="component-bottom">
                        <div class="component-card--grouped" style="display:flex; gap:24px; padding:24px;">
                            <div style="flex:1;">
                                <div class="component-skeleton component-skeleton--h34" style="margin-bottom: 16px;"></div>
                                <div class="component-skeleton component-skeleton--h34" style="margin-bottom: 16px;"></div>
                                <div class="component-skeleton component-skeleton--h34"></div>
                            </div>
                            <div style="flex:2;">
                                <div class="component-skeleton component-skeleton--card" style="margin-bottom: 16px;"></div>
                                <div class="component-skeleton component-skeleton--card"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 8. DASHBOARD GRID (Admin Dashboard)
     */
    dashboardGrid() {
        let statCards = '';
        for (let i = 0; i < 3; i++) {
            statCards += `
            <div class="component-card--grouped" style="padding: 20px; display: flex; align-items: center;">
                <div class="component-skeleton component-skeleton--avatar" style="width: 56px; height: 56px; margin-right: 16px;"></div>
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div class="component-skeleton component-skeleton--h14" style="width: 50%; margin-bottom: 8px;"></div>
                    <div class="component-skeleton component-skeleton--h24" style="width: 30%;"></div>
                </div>
            </div>`;
        }

        let charts = `
            <div class="component-card--grouped" style="padding: 20px;">
                <div class="component-skeleton component-skeleton--h20" style="width: 40%; margin-bottom: 16px;"></div>
                <div class="component-skeleton" style="height: 300px; border-radius: 12px;"></div>
            </div>
            <div class="component-card--grouped" style="padding: 20px;">
                <div class="component-skeleton component-skeleton--h20" style="width: 40%; margin-bottom: 16px;"></div>
                <div class="component-skeleton" style="height: 300px; border-radius: 12px;"></div>
            </div>
        `;
        
        return `
        <div class="view-content">
            <div class="component-top">
                <div class="component-top-left">
                    <div class="component-skeleton component-skeleton--title"></div>
                </div>
                <div class="component-top-right">
                    <div class="component-skeleton component-skeleton--h40" style="width: 40px; border-radius:8px; margin-right: 8px;"></div>
                    <div class="component-skeleton component-skeleton--avatar-sm" style="border-radius:8px;"></div>
                </div>
            </div>
            <div class="component-wrapper component-wrapper--full no-padding">
                <div class="component-bottom dashboard-container" style="padding: 24px;">
                    <div class="component-card--grouped" style="padding: 16px 20px; display: flex; gap: 16px; align-items: flex-end;">
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <div class="component-skeleton component-skeleton--text-short"></div>
                            <div class="component-skeleton component-skeleton--h34" style="width: 150px; border-radius: 8px;"></div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <div class="component-skeleton component-skeleton--text-short"></div>
                            <div class="component-skeleton component-skeleton--h34" style="width: 150px; border-radius: 8px;"></div>
                        </div>
                        <div style="margin-left: auto;">
                            <div class="component-skeleton component-skeleton--button"></div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                        ${statCards}
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap:20px; margin-top: 20px;">
                        ${charts}
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * 9. SIMPLE LIST (Vistas de listas de logs sencillas)
     */
    simpleList() {
        let list = '';
        for (let i = 0; i < 5; i++) {
            list += `
            <div style="display:flex; padding:16px 24px; border-bottom:1px solid var(--border-color);">
                <div class="component-skeleton component-skeleton--avatar-sm" style="margin-right: 16px;"></div>
                <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
                    <div class="component-skeleton component-skeleton--h14" style="width: 40%; margin-bottom: 8px;"></div>
                    <div class="component-skeleton component-skeleton--h14" style="width: 80%;"></div>
                </div>
            </div>`;
        }
        return `
        <div class="view-content">
            <div class="component-wrapper">
                <div class="component-bottom">
                    <div class="component-header-card">
                        <div class="component-skeleton component-skeleton--title component-skeleton--centered" style="margin-bottom: 16px;"></div>
                        <div class="component-skeleton component-skeleton--text-medium component-skeleton--centered"></div>
                    </div>
                    <div class="component-card--grouped">
                        ${list}
                    </div>
                </div>
            </div>
        </div>`;
    },

    // --- Helpers Internos ---
    
    _groupItemRow() {
        return `
        <div class="component-group-item">
            <div class="component-card__content" style="flex:1;">
                <div class="component-card__text" style="width:100%;">
                    <div class="component-skeleton component-skeleton--h20" style="width: 30%; margin-bottom: 8px;"></div>
                    <div class="component-skeleton component-skeleton--h14" style="width: 50%;"></div>
                </div>
            </div>
            <div class="component-card__actions">
                <div class="component-skeleton component-skeleton--h34" style="width: 80px; border-radius: 8px;"></div>
            </div>
        </div>`;
    },

    _groupItemToggle() {
        return `
        <div class="component-group-item component-group-item--wrap">
            <div class="component-card__content" style="flex:1;">
                <div class="component-card__text" style="width:100%;">
                    <div class="component-skeleton component-skeleton--h20" style="width: 40%; margin-bottom: 8px;"></div>
                    <div class="component-skeleton component-skeleton--h14" style="width: 70%;"></div>
                </div>
            </div>
            <div class="component-card__actions component-card__actions--end">
                <div class="component-skeleton" style="width: 44px; height: 24px; border-radius: 12px;"></div>
            </div>
        </div>`;
    },

    _groupItemAction() {
        return `
        <div class="component-group-item">
            <div class="component-card__content" style="display:flex; gap:16px; align-items:center; flex:1;">
                <div class="component-skeleton component-skeleton--avatar-sm"></div>
                <div class="component-card__text" style="width:100%;">
                    <div class="component-skeleton component-skeleton--h16" style="width: 40%; margin-bottom: 8px;"></div>
                    <div class="component-skeleton component-skeleton--h14" style="width: 80%;"></div>
                </div>
            </div>
            <div class="component-card__actions component-card__actions--end">
                <div class="component-skeleton component-skeleton--button"></div>
            </div>
        </div>`;
    }
};