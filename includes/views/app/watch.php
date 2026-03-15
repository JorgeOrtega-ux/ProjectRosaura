<div class="view-content watch-view-content"> 
    <div class="watch-layout" id="watch-layout-container">
        
        <div class="watch-layout__player" id="watch-layout-player">
            
            <div class="component-video-ambient-wrapper" id="ambient-wrapper">
                <canvas id="ambient-lighting-canvas" class="component-video-ambient-canvas"></canvas>
            </div>

            <div class="component-video-player is-paused" id="video-player-container">
                <video id="main-video-player" class="component-video-player__video" playsinline preload="metadata"></video>
                
                <div class="component-video-player__spinner" id="player-spinner" style="display: none;">
                    <div class="component-video-player__css-spinner"></div>
                </div>
                
                <div class="component-video-player__controls" id="player-controls">
                    <div class="component-video-player__progress-area" id="progress-area">
                        <div class="component-player-preview-card" id="preview-card">
                            <div class="component-player-sprite-container" id="preview-sprite"></div>
                            <div class="component-player-preview-time" id="preview-time">0:00</div>
                        </div>

                        <div class="component-video-player__progress-bar">
                            <div class="component-video-player__progress-buffer" id="progress-buffer"></div>
                            <div class="component-video-player__progress-fill" id="progress-fill"></div>
                            <div class="component-video-player__progress-thumb" id="progress-thumb"></div>
                        </div>
                    </div>

                    <div class="component-video-player__controls-row">
                        <div class="component-video-player__controls-group component-video-player__controls-left">
                            
                            <div class="component-video-player__control-box">
                                <button class="component-video-player__btn" id="btn-play-pause" title="Reproducir (k)">
                                    <span class="material-symbols-rounded" id="icon-play-pause">play_arrow</span>
                                </button>
                            </div>
                            
                            <div class="component-video-player__control-box component-video-player__volume-container" id="volume-container">
                                <button class="component-video-player__btn" id="btn-mute" title="Silenciar (m)">
                                    <span class="material-symbols-rounded" id="icon-mute">volume_up</span>
                                </button>
                                <div class="component-video-player__volume-slider-wrapper">
                                    <input type="range" id="volume-slider" class="component-video-player__volume-slider" min="0" max="1" step="0.05" value="1">
                                </div>
                            </div>

                            <div class="component-video-player__control-box component-video-player__time-box">
                                <div class="component-video-player__time">
                                    <span id="time-current">0:00</span>
                                    <span class="component-video-player__time-separator">/</span>
                                    <span id="time-duration">0:00</span>
                                </div>
                            </div>

                        </div>

                        <div class="component-video-player__controls-group component-video-player__controls-right">
                            
                            <div class="component-video-player__settings-module module" id="player-settings-menu">
                                
                                <div class="component-menu is-active" id="setting-menu-main">
                                    <div class="component-menu__item" data-target="setting-menu-quality">
                                        <div class="component-menu__item-left">
                                            <span class="material-symbols-rounded">tune</span>
                                            <span>Calidad</span>
                                        </div>
                                        <div class="component-menu__item-right">
                                            <span id="quality-status">Automática</span>
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </div>
                                    </div>
                                    <div class="component-menu__item" data-target="setting-menu-lighting">
                                        <div class="component-menu__item-left">
                                            <span class="material-symbols-rounded">lightbulb</span>
                                            <span>Iluminación cinematográfica</span>
                                        </div>
                                        <div class="component-menu__item-right">
                                            <span id="lighting-status">Activado</span>
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </div>
                                    </div>
                                    <div class="component-menu__item" data-target="setting-menu-speed">
                                        <div class="component-menu__item-left">
                                            <span class="material-symbols-rounded">speed</span>
                                            <span>Velocidad</span>
                                        </div>
                                        <div class="component-menu__item-right">
                                            <span id="speed-status">Normal</span>
                                            <span class="material-symbols-rounded">chevron_right</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu" id="setting-menu-quality">
                                    <div class="component-menu__header" data-target="setting-menu-main">
                                        <span class="material-symbols-rounded">arrow_back</span>
                                        <span>Calidad</span>
                                    </div>
                                    <div class="component-menu__content" id="quality-menu-content">
                                        <div class="component-menu__item is-selected" data-level="-1">
                                            <span class="material-symbols-rounded component-menu__check">check</span>
                                            <span>Automática</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu" id="setting-menu-lighting">
                                    <div class="component-menu__header" data-target="setting-menu-main">
                                        <span class="material-symbols-rounded">arrow_back</span>
                                        <span>Iluminación cinematográfica</span>
                                    </div>
                                    <div class="component-menu__content">
                                        <div class="component-menu__item is-selected" data-ambient="1">
                                            <span class="material-symbols-rounded component-menu__check">check</span>
                                            <span>Activado</span>
                                        </div>
                                        <div class="component-menu__item" data-ambient="0">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>Desactivado</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="component-menu" id="setting-menu-speed">
                                    <div class="component-menu__header" data-target="setting-menu-main">
                                        <span class="material-symbols-rounded">arrow_back</span>
                                        <span>Velocidad de reproducción</span>
                                    </div>
                                    <div class="component-menu__content" id="speed-menu-content">
                                        <div class="component-menu__item" data-speed="0.25">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>0.25</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="0.5">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>0.5</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="0.75">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>0.75</span>
                                        </div>
                                        <div class="component-menu__item is-selected" data-speed="1">
                                            <span class="material-symbols-rounded component-menu__check">check</span>
                                            <span>Normal</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="1.25">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>1.25</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="1.50">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>1.50</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="1.75">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>1.75</span>
                                        </div>
                                        <div class="component-menu__item" data-speed="2">
                                            <span class="material-symbols-rounded component-menu__check"></span>
                                            <span>2</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <div class="component-video-player__control-box">
                                <button class="component-video-player__btn" id="btn-settings" title="Configuración">
                                    <span class="material-symbols-rounded">settings</span>
                                </button>
                                <button class="component-video-player__btn" id="btn-cinema" title="Modo cine (t)">
                                    <span class="material-symbols-rounded" id="icon-cinema">crop_16_9</span>
                                </button>
                                <button class="component-video-player__btn" id="btn-fullscreen" title="Pantalla completa (f)">
                                    <span class="material-symbols-rounded" id="icon-fullscreen">fullscreen</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="watch-layout__bottom-content">
            <div class="watch-layout__info">
                
                <div class="watch-title-container">
                    <h1 class="watch-info-title" id="watch-video-title">[Cargando Título...]</h1>
                    <div id="watch-translation-badge-container" class="hidden">
                        <button id="watch-translation-toggle" class="component-button component-button--rounded component-button--h30" title="Cambiar idioma del título">
                            <span class="material-symbols-rounded" style="font-size: 16px;">g_translate</span>
                            <span id="watch-translation-text">Traducido</span>
                        </button>
                    </div>
                </div>
                
                <div class="watch-info-row">
                    <div class="watch-info-left">
                        <img id="watch-channel-avatar" class="watch-avatar" src="" alt="Avatar del Canal">
                        <div class="watch-channel-details">
                            <span id="watch-channel-name" class="watch-channel-name">Cargando Canal...</span>
                            <span id="watch-channel-subs" class="watch-channel-subs">-- suscriptores</span>
                        </div>
                    </div>

                    <div class="watch-info-right">
                        <button id="watch-btn-subscribe" class="component-button component-button--dark component-button--rounded component-button--h36">
                            Suscribirse
                        </button>
                        
                        <div class="component-button-group component-button-group--h36">
                            <button id="watch-btn-like" class="component-button component-button--h36" title="Me gusta">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span id="watch-like-count">--</span>
                            </button>
                            <div class="component-button-divider"></div>
                            <button id="watch-btn-dislike" class="component-button component-button--icon component-button--h36" title="No me gusta">
                                <span class="material-symbols-rounded">thumb_down</span>
                            </button>
                        </div>

                        <button class="component-button component-button--rounded component-button--h36" title="Compartir">
                            <span class="material-symbols-rounded">share</span> Compartir
                        </button>
                        
                        <button class="component-button component-button--rounded component-button--h36" title="Descargar">
                            <span class="material-symbols-rounded">download</span> Descargar
                        </button>

                        <div class="watch-save-wrapper">
                            <button id="watch-btn-save" class="component-button component-button--rounded component-button--h36" title="Guardar">
                                <span class="material-symbols-rounded">playlist_add</span> Guardar
                            </button>
                            <?php 
                            // SE INCLUYE EL MÓDULO DROPDOWN AQUI MISMO PARA EL POSICIONAMIENTO
                            require_once __DIR__ . '/../../modules/moduleSaveToPlaylist.php'; 
                            ?>
                        </div>
                    </div>
                </div>

                <div class="watch-details-container">
                    <div class="watch-details-box">
                        <div class="watch-details-meta" style="display: flex; align-items: center;">
                            <span id="watch-video-views" class="watch-meta-highlight">--- visualizaciones</span> 
                            <span class="watch-meta-separator" style="margin: 0 8px; font-weight: bold; font-size: 16px;">&bull;</span>
                            <span id="watch-video-date" class="watch-meta-highlight">---</span>
                        </div>

                        <div class="watch-info-description">
                            <p id="watch-video-description" class="watch-info-desc-text">
                                [Cargando...]
                            </p>
                        </div>
                    </div>

                    <div class="watch-details-box">
                        <div class="watch-details-meta" id="watch-models-categories-header">
                            <span class="watch-meta-highlight">Modelos y Categorías</span>
                        </div>
                        <div class="component-badge-list" id="watch-video-tags-container">
                            <span class="component-badge component-badge--sm" style="opacity: 0.5;">Cargando...</span>
                        </div>
                    </div>

                    <div id="watch-custom-tags-section" class="watch-details-box hidden">
                        <div class="watch-details-meta">
                            <span class="watch-meta-highlight">Etiquetas</span>
                        </div>
                        <div class="component-badge-list" id="watch-video-custom-tags-container">
                            <span class="component-badge component-badge--sm" style="opacity: 0.5;">Cargando...</span>
                        </div>
                    </div>
                </div>

            </div>

            <div class="watch-layout__comments">
                <section id="video-comments-section">
                    </section>
            </div>
        </div>

        <div class="watch-layout__recommended">
            
            <div id="watch-playlist-panel" class="watch-playlist-panel hidden">
                <div class="watch-playlist-header">
                    <div class="watch-playlist-header-info">
                        <h2 id="watch-playlist-title" class="watch-playlist-title">Lista de reproducción</h2>
                        <span id="watch-playlist-count">- / -</span>
                    </div>
                    <button id="watch-playlist-toggle" class="watch-playlist-toggle-btn" title="Expandir/Contraer">
                        <span class="material-symbols-rounded">expand_more</span>
                    </button>
                </div>
                <div id="watch-playlist-items" class="watch-playlist-items">
                </div>
            </div>

            <div class="watch-recommended-section">
                <h2 class="watch-placeholder-title">Videos Recomendados</h2>
                <div id="watch-recommended-videos" class="watch-recommended-list">
                    <p class="watch-placeholder-text">Cargando sugerencias...</p>
                </div>
            </div>

        </div>

    </div>
</div>