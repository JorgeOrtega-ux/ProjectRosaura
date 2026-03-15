<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                
                <div class="component-view-top-left">
                    <div class="component-badge-list">
                        <button class="component-badge active" data-filter="all" style="cursor: pointer;">Todo</button>
                        <button class="component-badge" data-filter="channels" style="cursor: pointer;">Canales</button>
                        <button class="component-badge" data-filter="videos" style="cursor: pointer;">Videos</button>
                    </div>
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions" style="position: relative;">
                        <button id="search-toggle-filters" class="component-button component-button--icon component-button--h40" data-tooltip="Filtros">
                            <span class="material-symbols-rounded">tune</span>
                        </button>

                        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced" id="moduleSearchFilters" style="display: none;">
                                
                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding active" data-ref="menuMainFilters" style="display: block;">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <span class="component-menu-header-title">Opciones de filtrado</span>
                                    </div>
                                </div>
                                
                                <div class="component-menu-list component-menu-list--compact">
                                    <div class="component-menu-link component-menu-link--bordered" data-action="openFilterSubMenu" data-target="menuFilterSort">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">sort</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Organizar por</span>
                                        </div>
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding disabled" data-ref="menuFilterSort" style="display: none;">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                
                                <div class="component-menu-header">
                                    <div class="component-menu-header-box">
                                        <button class="component-button component-button--icon component-button--h30 component-button--back" data-action="backToMainFilters">
                                            <span class="material-symbols-rounded">arrow_back</span>
                                        </button>
                                        <span class="component-menu-header-title">Organizar por</span>
                                    </div>
                                </div>
                                
                                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact">
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon">
                                            <input type="radio" name="sortSearch" value="relevant" checked>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Más relevante</span>
                                        </div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon">
                                            <input type="radio" name="sortSearch" value="created_at:desc">
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Más reciente</span>
                                        </div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon">
                                            <input type="radio" name="sortSearch" value="views:desc">
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Más vistos</span>
                                        </div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon">
                                            <input type="radio" name="sortSearch" value="likes:desc">
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Mejor valorados</span>
                                        </div>
                                    </label>
                                    <label class="component-menu-link component-menu-link--bordered">
                                        <div class="component-menu-link-icon">
                                            <input type="radio" name="sortSearch" value="duration:desc">
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Más largos</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>

            </div>

            <div class="component-view-bottom" id="search-results-area" style="padding: 24px; display: flex; flex-direction: column; gap: 32px;">
                
                <div id="search-loading-state" style="padding: 64px 0;">
                    <div class="component-spinner component-spinner--centered"></div>
                    <p class="component-text-notice component-text-notice--muted" style="text-align: center; margin-top: 16px;">Buscando en la plataforma...</p>
                </div>

                <div class="component-feed-section" id="search-channels-section" style="display: none;">
                    <div class="component-feed-header" style="margin-bottom: 16px;">
                        <h2 class="component-feed-title">Canales</h2>
                    </div>
                    <div class="component-feed-body">
                        <div class="component-channel-grid-modern" id="search-channels-grid">
                        </div>
                    </div>
                </div>

                <div class="component-feed-section" id="search-videos-section" style="display: none;">
                    <div class="component-feed-header">
                        <h2 class="component-feed-title">Videos</h2>
                    </div>
                    <div class="component-feed-body">
                        <div id="search-videos-grid" class="component-video-grid">
                            </div>
                    </div>
                </div>

                <div class="component-empty-state" id="search-empty-state" style="display: none; border: none; background: transparent;">
                    <span class="material-symbols-rounded component-empty-state-icon">search_off</span>
                    <h3 style="margin: 16px 0 8px 0; color: var(--text-primary); font-size: 18px;">No encontramos nada</h3>
                    <p class="component-empty-state-text">Intenta buscando con palabras clave diferentes o revisa la ortografía.</p>
                </div>

            </div>

        </div>
    </div>
</div>