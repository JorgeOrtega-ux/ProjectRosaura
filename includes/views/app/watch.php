<div class="view-content" style="padding: 0;"> 
    <div class="watch-layout" id="watch-layout-container">
        
        <div class="watch-layout__player" id="watch-layout-player">
            <div class="component-video-player is-paused" id="video-player-container">
                <video id="main-video-player" class="component-video-player__video" playsinline></video>
                
                <div class="component-video-player__controls" id="player-controls">
                    <div class="component-video-player__progress-area" id="progress-area">
                        <div class="component-video-player__progress-bar">
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
                            
                            <div class="component-video-player__control-box">
                                <button class="component-video-player__btn" id="btn-settings" title="Configuración">
                                    <span class="material-symbols-rounded">settings</span>
                                </button>
                                <button class="component-video-player__btn" id="btn-cinema" title="Modo cine (t)">
                                    <span class="material-symbols-rounded" id="icon-cinema">crop_16_9</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="watch-layout__info">
            
            <h1 class="watch-info-title" id="watch-video-title">[Cargando Título...]</h1>
            
            <div class="watch-info-row">
                <div class="watch-info-left">
                    <img id="watch-channel-avatar" class="watch-avatar" src="" alt="Avatar del Canal">
                    <div class="watch-channel-details">
                        <span id="watch-channel-name" class="watch-channel-name">Cargando Canal...</span>
                        <span id="watch-channel-subs" class="watch-channel-subs">-- suscriptores</span>
                    </div>
                </div>

                <div class="watch-info-right">
                    <button id="watch-btn-subscribe" class="watch-btn watch-btn-subscribe">Suscribirse</button>
                    
                    <div class="watch-action-group">
                        <button class="watch-btn watch-btn-action" title="Me gusta">
                            <span class="material-symbols-rounded">thumb_up</span>
                            <span id="watch-like-count">--</span>
                        </button>
                        <div class="watch-action-divider"></div>
                        <button class="watch-btn watch-btn-action" title="No me gusta">
                            <span class="material-symbols-rounded">thumb_down</span>
                        </button>
                    </div>

                    <button class="watch-btn watch-btn-action" title="Compartir">
                        <span class="material-symbols-rounded">share</span> Compartir
                    </button>
                    
                    <button class="watch-btn watch-btn-action" title="Descargar">
                        <span class="material-symbols-rounded">download</span> Descargar
                    </button>

                    <button class="watch-btn watch-btn-action" title="Guardar">
                        <span class="material-symbols-rounded">bookmark</span> Guardar
                    </button>
                </div>
            </div>

            <div class="watch-details-box">
                <div class="watch-details-meta">
                    <span id="watch-video-views" class="watch-meta-highlight">--- visualizaciones</span> 
                    <span id="watch-video-date" class="watch-meta-highlight" style="margin-left: 8px;">---</span>
                </div>

                <div class="watch-info-description">
                    <p id="watch-video-description" class="watch-info-desc-text">
                        [Cargando...]
                    </p>
                </div>
            </div>

            <div class="watch-details-box" style="margin-top: 12px;">
                <div class="watch-details-meta" style="margin-bottom: 12px;" id="watch-models-categories-header">
                    <span class="watch-meta-highlight">Modelos y Categorías</span>
                </div>
                <div class="watch-info-tags-list" id="watch-video-tags-container">
                    <span class="watch-tag-item" style="opacity: 0.5;">Cargando...</span>
                </div>

                <div id="watch-custom-tags-section" style="display: none;">
                    <div class="watch-tags-divider" id="watch-tags-divider" style="height: 1px; background-color: rgba(150, 150, 150, 0.2); margin: 16px 0;"></div>
                    <div class="watch-details-meta" style="margin-bottom: 12px;">
                        <span class="watch-meta-highlight">Etiquetas Personalizadas</span>
                    </div>
                    <div class="watch-info-tags-list" id="watch-video-custom-tags-container">
                        </div>
                </div>
            </div>

        </div>

        <div class="watch-layout__comments">
            <h2 class="watch-placeholder-title">Comentarios</h2>
            <p class="watch-placeholder-text">Caja para comentar y la lista infinita de comentarios...</p>
        </div>

        <div class="watch-layout__recommended">
            <h2 class="watch-placeholder-title">Videos Recomendados</h2>
            <p class="watch-placeholder-text">Lista infinita de videos sugeridos...</p>
        </div>

    </div>
</div>