// public/assets/js/core/components/VideoPlayerSystem.js

import { ApiService } from '../api/ApiServices.js';

export class VideoPlayerSystem {
    constructor() {
        console.log('[VideoPlayer:Init] Construyendo sistema de reproductor avanzado (Resize JS)...');
        this.api = new ApiService();
        
        // Contenedores y Controles
        this.container = document.getElementById('video-player-container');
        this.video = document.getElementById('main-video-player');
        this.layoutContainer = document.getElementById('watch-layout-container');
        this.controlsContainer = document.getElementById('player-controls');
        this.playPauseBtn = document.getElementById('btn-play-pause');
        this.playPauseIcon = document.getElementById('icon-play-pause');
        this.volumeContainer = document.getElementById('volume-container');
        this.muteBtn = document.getElementById('btn-mute');
        this.muteIcon = document.getElementById('icon-mute');
        this.volumeSlider = document.getElementById('volume-slider');
        this.cinemaBtn = document.getElementById('btn-cinema');
        this.cinemaIcon = document.getElementById('icon-cinema');
        
        // Pantalla Completa
        this.fullscreenBtn = document.getElementById('btn-fullscreen');
        this.fullscreenIcon = document.getElementById('icon-fullscreen');

        // Módulo de Configuraciones Escalable
        this.settingsBtn = document.getElementById('btn-settings');
        this.settingsMenu = document.getElementById('player-settings-menu');

        this.progressArea = document.getElementById('progress-area');
        this.progressFill = document.getElementById('progress-fill');
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeCurrent = document.getElementById('time-current');
        this.timeDuration = document.getElementById('time-duration');

        this.isTheaterMode = false;
        this.hls = null;
        this.lastVolume = 1; 
        this.currentVideoUuid = null;
        
        // --- EVENTO DE RESIZE MODO YOUTUBE ---
        this.resizeHandler = this.calculatePlayerSize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        this.bindEvents();

        // Calcular el tamaño inicial apenas cargue
        setTimeout(() => this.calculatePlayerSize(), 50);
    }

    // Método matemático para calcular 16:9 dinámico arreglado
    calculatePlayerSize() {
        const outerContainer = document.getElementById('watch-layout-player'); // Contenedor Negro
        const innerContainer = this.container; // Contenedor de Video y Controles
        
        if (!outerContainer || !innerContainer) return;

        // Si es pantalla completa nativa, dejamos que CSS controle el 100%
        if (document.fullscreenElement) {
            outerContainer.style.width = '';
            outerContainer.style.height = '';
            innerContainer.style.width = '';
            innerContainer.style.height = '';
            return;
        }

        // En móviles y tablets, desactivamos la matemática de JS
        if (window.innerWidth <= 1024) {
            outerContainer.style.width = '';
            outerContainer.style.height = '';
            innerContainer.style.width = '';
            innerContainer.style.height = '';
            return;
        }

        // 1. Forzar al contenedor padre a ocupar el ancho máximo disponible del grid
        outerContainer.style.width = '100%';
        outerContainer.style.height = 'auto';

        // 2. Medir el espacio de ancho REAL que nos da el grid
        let availableWidth = outerContainer.offsetWidth; 
        
        // La altura máxima para evitar scroll vertical excesivo
        let maxHeight = this.isTheaterMode ? (window.innerHeight - 80) : (window.innerHeight - 120);

        // 3. Suponer que el tamaño interno será 16:9 completo basándose en el ancho
        let targetWidth = availableWidth;
        let targetHeight = (targetWidth * 9) / 16;

        // 4. Si la altura supera el límite, ACHICAMOS el contenedor interno
        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = (targetHeight * 16) / 9;
        }

        // 5. El contenedor negro padre define su altura igual a la del video, pero conserva el width 100%
        outerContainer.style.height = `${targetHeight}px`;

        // 6. El contenedor del reproductor se ajusta al tamaño perfecto 16:9
        innerContainer.style.width = `${targetWidth}px`;
        innerContainer.style.height = `${targetHeight}px`;
    }

    bindEvents() {
        if (!this.video || !this.container) return;
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('play', () => {
            this.playPauseIcon.textContent = 'pause';
            this.playPauseBtn.title = "Pausar (k)";
            this.container.classList.remove('is-paused');
        });
        this.video.addEventListener('pause', () => {
            this.playPauseIcon.textContent = 'play_arrow';
            this.playPauseBtn.title = "Reproducir (k)";
            this.container.classList.add('is-paused');
        });
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.video.volume = value;
            this.video.muted = (value === "0");
        });
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
        this.video.addEventListener('loadedmetadata', () => {
            this.timeDuration.textContent = this.formatTime(this.video.duration);
            this.updateVolumeUI(); 
        });
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.progressArea.addEventListener('click', (e) => this.seekTo(e));
        this.cinemaBtn.addEventListener('click', () => this.toggleCinemaMode());
        
        // --- LÓGICA DEL MENÚ DE CONFIGURACIONES ESCALABLE ---
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsMenu();
            });
        }

        if (this.settingsMenu) {
            // Manejar clics en los enlaces que llevan a otros submenús o encabezados de retroceso
            const menuTriggers = this.settingsMenu.querySelectorAll('[data-target]');
            menuTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = trigger.getAttribute('data-target');
                    this.navigateToMenu(targetId);
                });
            });

            // Manejo de selecciones visuales dentro de los submenús
            const selectableItems = this.settingsMenu.querySelectorAll('.component-menu__content .component-menu__item');
            selectableItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const parentContent = item.closest('.component-menu__content');
                    if (parentContent) {
                        parentContent.querySelectorAll('.component-menu__item').forEach(i => i.classList.remove('is-selected'));
                    }
                    item.classList.add('is-selected');
                });
            });
        }

        // Cerrar menú de configuración al hacer clic en otro lugar
        document.addEventListener('click', (e) => {
            if (this.settingsMenu && this.settingsMenu.classList.contains('is-active')) {
                if (!this.settingsMenu.contains(e.target) && !this.settingsBtn.contains(e.target)) {
                    this.settingsMenu.classList.remove('is-active');
                    // Reiniciar el menú para que la próxima vez inicie desde el principal
                    setTimeout(() => this.navigateToMenu('setting-menu-main'), 250);
                }
            }
        });

        // Evento Fullscreen
        if(this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Detectar cambios de fullscreen con escape
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.fullscreenIcon.textContent = 'fullscreen_exit';
            } else {
                this.fullscreenIcon.textContent = 'fullscreen';
                this.calculatePlayerSize(); // Recalcular al salir
            }
        });
    }

    async loadVideo(sourceIdentifier, requiresSignedToken = false) {
        if (!this.video) return;
        console.log(`[VideoPlayer:Auth] Solicitando carga de video. ID: ${sourceIdentifier}, RequiereToken: ${requiresSignedToken}`);

        this.destroyHls(); 
        
        if (requiresSignedToken) {
            this.currentVideoUuid = sourceIdentifier;
            try {
                console.log('[VideoPlayer:Auth] Pidiendo token al backend...');
                const response = await this.api.getMediaToken(this.currentVideoUuid);
                
                if (response.success && response.data.stream_url) {
                    const finalUrl = (window.AppBasePath || '') + response.data.stream_url;
                    console.log(`[VideoPlayer:Auth] Token recibido. URL maestra final: ${finalUrl}`);
                    this._initStream(finalUrl);
                } else {
                    console.error("[VideoPlayer:Auth] No se pudo firmar el video:", response.message);
                }
            } catch (error) {
                console.error("[VideoPlayer:Auth] Error en petición de token:", error);
            }
        } else {
            console.log(`[VideoPlayer:Auth] Carga sin firma (Directa): ${sourceIdentifier}`);
            this._initStream(sourceIdentifier);
        }
    }

    _initStream(url) {
        console.log('[VideoPlayer:Stream] Iniciando flujo con URL:', url);
        
        let tokenStr = null;
        let expiresStr = null;
        try {
            const fakeBase = url.startsWith('http') ? '' : window.location.origin;
            const urlObj = new URL(url, fakeBase);
            tokenStr = urlObj.searchParams.get('t');
            expiresStr = urlObj.searchParams.get('e');
        } catch (e) {
            console.warn('[VideoPlayer:Stream] No se pudieron parsear los parámetros de la URL.', e);
        }

        if (url.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            console.log('[VideoPlayer:Stream] HLS.js soportado. Configurando instancia...');
            
            this.hls = new Hls({
                manifestLoadingMaxRetry: 2,
                debug: false,
                xhrSetup: function(xhr, url_to_load) {
                    if (tokenStr && expiresStr && url_to_load.includes('/api/media/stream/')) {
                        try {
                            const reqUrl = new URL(url_to_load, window.location.origin);
                            if (!reqUrl.searchParams.has('t')) {
                                reqUrl.searchParams.set('t', tokenStr);
                                reqUrl.searchParams.set('e', expiresStr);
                                const newUrl = reqUrl.toString();
                                xhr.open('GET', newUrl, true);
                            }
                        } catch (err) {}
                    }
                }
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                this.container.classList.add('is-paused');
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            if (data.response && data.response.code === 403 && this.currentVideoUuid) {
                                this.loadVideo(this.currentVideoUuid, true);
                            } else {
                                this.hls.startLoad();
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            this.hls.recoverMediaError();
                            break;
                        default:
                            this.destroyHls();
                            break;
                    }
                }
            });
        } 
        else if (this.video.canPlayType('application/vnd.apple.mpegurl') || !url.includes('.m3u8')) {
            console.log('[VideoPlayer:Stream] Reproducción nativa.');
            this.video.src = url;
            this.video.onerror = () => {
                const err = this.video.error;
                if (err && err.code === 4 && this.currentVideoUuid) { 
                    this.loadVideo(this.currentVideoUuid, true);
                }
            };
        }
    }

    destroyHls() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }

    destroy() {
        this.destroyHls();
        if (this.video) {
            this.video.pause();
            this.video.removeAttribute('src');
            this.video.load();
        }
        window.removeEventListener('resize', this.resizeHandler);
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play().catch(error => console.error("[VideoPlayer:Action] Error al reproducir:", error));
        } else {
            this.video.pause();
        }
    }

    toggleMute() {
        if (this.video.muted || this.video.volume === 0) {
            this.video.volume = this.lastVolume > 0 ? this.lastVolume : 1;
            this.video.muted = false;
        } else {
            this.lastVolume = this.video.volume;
            this.video.muted = true;
            this.video.volume = 0;
        }
    }

    updateVolumeUI() {
        if (this.video.muted || this.video.volume === 0) {
            this.muteIcon.textContent = 'volume_off';
        } else if (this.video.volume > 0.5) {
            this.muteIcon.textContent = 'volume_up';
        } else {
            this.muteIcon.textContent = 'volume_down';
        }
        if (document.activeElement !== this.volumeSlider) {
            this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
        }
    }

    updateProgress() {
        if (!this.video.duration) return;
        const percent = (this.video.currentTime / this.video.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.progressThumb.style.left = `${percent}%`;
        this.timeCurrent.textContent = this.formatTime(this.video.currentTime);
    }

    seekTo(e) {
        const rect = this.progressArea.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = Math.max(0, Math.min(1, pos)) * this.video.duration;
    }

    toggleCinemaMode() {
        if (document.fullscreenElement) return;

        this.isTheaterMode = !this.isTheaterMode;
        if (this.layoutContainer) {
            this.layoutContainer.classList.toggle('watch-layout--cinema', this.isTheaterMode);
            this.cinemaIcon.textContent = this.isTheaterMode ? 'crop_5_4' : 'crop_16_9';
        }
        
        this.calculatePlayerSize();
        setTimeout(() => this.calculatePlayerSize(), 150);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen().catch(err => console.error(err));
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) {
                this.container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // Abre o cierra el módulo flotante
    toggleSettingsMenu() {
        if (this.settingsMenu) {
            const isActive = this.settingsMenu.classList.contains('is-active');
            if (isActive) {
                this.settingsMenu.classList.remove('is-active');
                // Al cerrar, reiniciamos el módulo al menú principal en segundo plano
                setTimeout(() => this.navigateToMenu('setting-menu-main'), 250);
            } else {
                this.settingsMenu.classList.add('is-active');
            }
        }
    }

    // Gestiona la transición limpia entre submódulos internos
    navigateToMenu(menuId) {
        if (!this.settingsMenu) return;
        const allMenus = this.settingsMenu.querySelectorAll('.component-menu');
        allMenus.forEach(m => m.classList.remove('is-active'));
        
        const targetMenu = document.getElementById(menuId);
        if (targetMenu) {
            targetMenu.classList.add('is-active');
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`; 
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}