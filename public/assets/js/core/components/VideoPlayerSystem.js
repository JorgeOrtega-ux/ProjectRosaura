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

        // Calcular el tamaño inicial apenas cargue (con leve retraso para que CSS dibuje la cuadrícula primero)
        setTimeout(() => this.calculatePlayerSize(), 50);
    }

    // Método matemático para calcular 16:9 dinámico
    calculatePlayerSize() {
        const playerWrapper = document.getElementById('watch-layout-player');
        if (!playerWrapper) return;

        // En móviles y tablets, desactivamos la matemática de JS y dejamos que el CSS actúe (es más fluido)
        if (window.innerWidth <= 1024) {
            playerWrapper.style.width = '';
            playerWrapper.style.height = '';
            playerWrapper.style.margin = '';
            return;
        }

        // 1. Reset temporal al 100% para poder medir el espacio ancho REAL que nos da el grid
        playerWrapper.style.width = '100%';
        playerWrapper.style.height = 'auto';

        // 2. Medir el espacio disponible
        let availableWidth = playerWrapper.offsetWidth; 
        
        // La altura máxima para que no tengas que hacer scroll hacia abajo para ver los controles
        let maxHeight = this.isTheaterMode ? (window.innerHeight - 80) : (window.innerHeight - 120);

        // 3. Suponer que el tamaño será 16:9 completo
        let targetWidth = availableWidth;
        let targetHeight = (targetWidth * 9) / 16;

        // 4. Si esa altura ideal se sale de nuestra pantalla, ACHICAMOS el contenedor desde los lados
        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = (targetHeight * 16) / 9;
        }

        // 5. Aplicar los tamaños matemáticos exactos en píxeles al contenedor negro
        playerWrapper.style.width = `${targetWidth}px`;
        playerWrapper.style.height = `${targetHeight}px`;

        // 6. Centramos el reproductor por si se hizo más angosto que su columna original
        playerWrapper.style.margin = '0 auto';
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
            console.log(`[VideoPlayer:Stream] Parámetros extraídos - Token: ${tokenStr ? 'SÍ' : 'NO'}, Expira: ${expiresStr}`);
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
                        } catch (err) {
                            console.error('[VideoPlayer:XHR] Error inyectando token:', err);
                        }
                    }
                }
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log(`[VideoPlayer:Event] Manifiesto parseado. Calidades disponibles: ${data.levels.length}`);
                this.container.classList.add('is-paused');
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error(`[VideoPlayer:Error] HLS lanzó error tipo: ${data.type} | Detalles: ${data.details}`);
                
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            if (data.response && data.response.code === 403 && this.currentVideoUuid) {
                                console.warn('[VideoPlayer:NetworkError] 403 Forbidden detectado. Recargando token...');
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
        this.isTheaterMode = !this.isTheaterMode;
        if (this.layoutContainer) {
            this.layoutContainer.classList.toggle('watch-layout--cinema', this.isTheaterMode);
            this.cinemaIcon.textContent = this.isTheaterMode ? 'crop_5_4' : 'crop_16_9';
        }
        
        // Recalculamos inmediatamente al cambiar el layout
        this.calculatePlayerSize();
        // Disparamos otro cálculo unos milisegundos después por si el CSS tardó en reacomodar el layout
        setTimeout(() => this.calculatePlayerSize(), 150);
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