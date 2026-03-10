// public/assets/js/core/components/VideoPlayerSystem.js

import { ApiService } from '../api/ApiServices.js';

export class VideoPlayerSystem {
    constructor() {
        this.api = new ApiService();
        
        // Contenedores principales
        this.container = document.getElementById('video-player-container');
        this.video = document.getElementById('main-video-player');
        this.layoutContainer = document.getElementById('watch-layout-container');
        
        // Controles - Botones
        this.controlsContainer = document.getElementById('player-controls');
        this.playPauseBtn = document.getElementById('btn-play-pause');
        this.playPauseIcon = document.getElementById('icon-play-pause');
        
        // Controles - Volumen
        this.volumeContainer = document.getElementById('volume-container');
        this.muteBtn = document.getElementById('btn-mute');
        this.muteIcon = document.getElementById('icon-mute');
        this.volumeSlider = document.getElementById('volume-slider');
        
        // Controles - Otros
        this.cinemaBtn = document.getElementById('btn-cinema');
        this.cinemaIcon = document.getElementById('icon-cinema');
        
        // Barra de progreso y tiempo
        this.progressArea = document.getElementById('progress-area');
        this.progressFill = document.getElementById('progress-fill');
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeCurrent = document.getElementById('time-current');
        this.timeDuration = document.getElementById('time-duration');

        // Estado interno
        this.isTheaterMode = false;
        this.hls = null;
        this.lastVolume = 1; 
        this.currentVideoUuid = null; // Para poder recargar el token si falla
        
        this.bindEvents();
    }

    bindEvents() {
        if (!this.video || !this.container) return;

        // --- Eventos de Play/Pause ---
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

        // --- Eventos de Sonido y Volumen ---
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.video.volume = value;
            this.video.muted = (value === "0");
        });
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());

        // --- Eventos de Tiempo y Progreso ---
        this.video.addEventListener('loadedmetadata', () => {
            this.timeDuration.textContent = this.formatTime(this.video.duration);
            this.updateVolumeUI(); 
        });

        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.progressArea.addEventListener('click', (e) => this.seekTo(e));

        // --- Evento Modo Cine ---
        this.cinemaBtn.addEventListener('click', () => this.toggleCinemaMode());
    }

    // --- NUEVO: Proceso de carga seguro ---
    async loadVideo(sourceIdentifier, requiresSignedToken = false) {
        if (!this.video) return;

        this.destroyHls(); 
        
        if (requiresSignedToken) {
            this.currentVideoUuid = sourceIdentifier;
            try {
                // Solicitar token firmado al backend
                const response = await this.api.getMediaToken(this.currentVideoUuid);
                if (response.success && response.data.stream_url) {
                    const finalUrl = (window.AppBasePath || '') + response.data.stream_url;
                    this._initStream(finalUrl);
                } else {
                    console.error("No se pudo firmar el video:", response.message);
                }
            } catch (error) {
                console.error("Error en petición de token:", error);
            }
        } else {
            // Carga directa estática (por si tienes videos públicos o trailers no protegidos)
            this._initStream(sourceIdentifier);
        }
    }

    _initStream(url) {
        if (url.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hls = new Hls({
                // Reducimos el tiempo de reintento para actuar rápido si el token expiró
                manifestLoadingMaxRetry: 2
            });
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.container.classList.add('is-paused');
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[VideoPlayer] Error de red. Posible token expirado. Recargando...');
                            // Si falla la red (Ej. 403 Forbidden por token expirado), pedimos otro token
                            if(data.response && data.response.code === 403 && this.currentVideoUuid) {
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
            this.video.src = url;
            // Native player doesn't have an easy intercept for 403 during playback,
            // so we rely on generic error event.
            this.video.onerror = () => {
                const err = this.video.error;
                if (err && err.code === 4 && this.currentVideoUuid) { 
                    // MEDIA_ERR_SRC_NOT_SUPPORTED (a veces lanzado por 403 en Safari)
                    console.warn('[VideoPlayer] Error nativo. Recargando token...');
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
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play().catch(error => console.error("Error al reproducir:", error));
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
            this.muteBtn.title = "Activar sonido (m)";
        } else if (this.video.volume > 0.5) {
            this.muteIcon.textContent = 'volume_up';
            this.muteBtn.title = "Silenciar (m)";
        } else {
            this.muteIcon.textContent = 'volume_down';
            this.muteBtn.title = "Silenciar (m)";
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
        const cleanPos = Math.max(0, Math.min(1, pos)); 
        this.video.currentTime = cleanPos * this.video.duration;
    }

    toggleCinemaMode() {
        this.isTheaterMode = !this.isTheaterMode;
        if (this.layoutContainer) {
            this.layoutContainer.classList.toggle('watch-layout--cinema', this.isTheaterMode);
            this.cinemaIcon.textContent = this.isTheaterMode ? 'crop_5_4' : 'crop_16_9';
            this.cinemaBtn.title = this.isTheaterMode ? "Modo predeterminado (t)" : "Modo cine (t)";
        }
        window.dispatchEvent(new Event('resize'));
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