// public/assets/js/core/components/VideoPlayerSystem.js

export class VideoPlayerSystem {
    constructor() {
        // Contenedores principales
        this.container = document.getElementById('video-player-container');
        this.video = document.getElementById('main-video-player');
        this.layoutContainer = document.getElementById('watch-layout-container');
        
        // Controles - Botones
        this.controlsContainer = document.getElementById('player-controls');
        this.playPauseBtn = document.getElementById('btn-play-pause');
        this.playPauseIcon = document.getElementById('icon-play-pause');
        
        // Controles - Volumen (Nuevas referencias)
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
        // Guardar último volumen antes de silenciar
        this.lastVolume = 1; 
        
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

        // --- Eventos de Sonido y Volumen (Lógica Actualizada) ---
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // Manejar cambio en el slider de volumen
        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.video.volume = value;
            this.video.muted = (value === "0");
        });

        // Sincronizar UI cuando cambia el volumen del video (por slider o teclado)
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());

        // --- Eventos de Tiempo y Progreso ---
        this.video.addEventListener('loadedmetadata', () => {
            this.timeDuration.textContent = this.formatTime(this.video.duration);
            // Asegurar que el slider refleje el volumen inicial del video
            this.updateVolumeUI(); 
        });

        this.video.addEventListener('timeupdate', () => this.updateProgress());
        
        // Click en la barra para buscar (Seeking)
        this.progressArea.addEventListener('click', (e) => this.seekTo(e));

        // --- Evento Modo Cine ---
        this.cinemaBtn.addEventListener('click', () => this.toggleCinemaMode());
    }

    // --- Métodos de Carga y Destrucción ---
    loadVideo(url) {
        if (!this.video) return;

        this.destroyHls(); // Limpiar si había una instancia previa

        // Si es un archivo HLS (.m3u8) y el navegador soporta Hls.js
        if (url.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.container.classList.add('is-paused');
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('[Hls.js Fatal Error]', data);
                }
            });
        } 
        // Soporte nativo para HLS (ej. Safari) o video MP4 tradicional
        else if (this.video.canPlayType('application/vnd.apple.mpegurl') || !url.includes('.m3u8')) {
            this.video.src = url;
            // loadedmetadata event handles 'is-paused' class
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

    // --- Lógica de Reproducción ---
    togglePlay() {
        if (this.video.paused) {
            this.video.play().catch(error => console.error("Error al reproducir:", error));
        } else {
            this.video.pause();
        }
    }

    // --- Lógica de Volumen (Actualizada) ---
    toggleMute() {
        if (this.video.muted || this.video.volume === 0) {
            // Unmute: volver al último volumen guardado (o 1 si era 0)
            this.video.volume = this.lastVolume > 0 ? this.lastVolume : 1;
            this.video.muted = false;
        } else {
            // Mute: guardar volumen actual y silenciar
            this.lastVolume = this.video.volume;
            this.video.muted = true;
            this.video.volume = 0; // Opcional, pero asegura consistencia en CSS thumb
        }
    }

    updateVolumeUI() {
        // 1. Actualizar Icono
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

        // 2. Sincronizar Slider (si no es el slider el que disparó el evento)
        if (document.activeElement !== this.volumeSlider) {
            this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
        }
    }

    // --- Lógica de Progreso ---
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
        // Asegurar rango entre 0 y 1
        const cleanPos = Math.max(0, Math.min(1, pos)); 
        this.video.currentTime = cleanPos * this.video.duration;
    }

    // --- Lógica Modo Cine ---
    toggleCinemaMode() {
        this.isTheaterMode = !this.isTheaterMode;
        if (this.layoutContainer) {
            this.layoutContainer.classList.toggle('watch-layout--cinema', this.isTheaterMode);
            // Cambiar icono y tooltip
            this.cinemaIcon.textContent = this.isTheaterMode ? 'crop_5_4' : 'crop_16_9';
            this.cinemaBtn.title = this.isTheaterMode ? "Modo predeterminado (t)" : "Modo cine (t)";
        }
        // Disparar resize para ajustar otros componentes SPA si es necesario
        window.dispatchEvent(new Event('resize'));
    }

    // --- Utilidades ---
    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            // Formato H:MM:SS
            return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`; 
        }
        // Formato M:SS
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
}