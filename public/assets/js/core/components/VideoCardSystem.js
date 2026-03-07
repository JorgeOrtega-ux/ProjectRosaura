// public/assets/js/core/components/VideoCardSystem.js

export class VideoCardSystem {
    constructor() {
        // Almacena las instancias de Hls asociadas a cada elemento de video
        // Usamos WeakMap para evitar fugas de memoria cuando el router elimine la tarjeta del DOM
        this.hlsInstances = new WeakMap();
    }

    init() {
        // Delegación de eventos para la SPA
        document.body.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.body.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
    }

    handleMouseEnter(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');
        
        if (video) {
            // 1. Guardar duración original
            if (!card.dataset.originalDuration && durationSpan) {
                card.dataset.originalDuration = durationSpan.textContent;
            }

            // 2. Añadir estado visual para ocultar miniatura
            card.classList.add('component-video-card--playing');

            // 3. Obtener la fuente real (asumiendo que HomeController.js la pone en data-src o src)
            const videoSrc = video.getAttribute('data-src') || video.getAttribute('src');

            // 4. Lógica HLS.js vs Nativo
            if (videoSrc && videoSrc.includes('.m3u8')) {
                // Es un stream HLS
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    let hls = this.hlsInstances.get(video);
                    
                    if (!hls) {
                        // Instanciamos Hls optimizado
                        hls = new Hls({
                            startLevel: -1, // Selección automática de calidad
                            capLevelToPlayerSize: true, // No descargar 1080p para una miniatura de 300px
                            autoStartLoad: false // No cargar hasta que se lo digamos explícitamente
                        });
                        
                        hls.attachMedia(video);
                        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                            hls.loadSource(videoSrc);
                        });
                        
                        this.hlsInstances.set(video, hls);
                    }
                    // Le decimos a hls.js que empiece a descargar fragmentos
                    hls.startLoad(-1);
                    this.playVideo(video);

                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Soporte nativo para HLS (Safari)
                    if (!video.src) video.src = videoSrc;
                    this.playVideo(video);
                }
            } else {
                // Es un .mp4 normal u otro formato soportado
                if (!video.src && videoSrc) video.src = videoSrc;
                this.playVideo(video);
            }

            // 5. Actualizar cuenta regresiva
            video.addEventListener('timeupdate', () => this.updateCountdown(video, durationSpan));
        }
    }

    handleMouseLeave(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');

        if (video) {
            // Remover estado visual
            card.classList.remove('component-video-card--playing');
            
            // Pausar video y reiniciar tiempo
            video.pause();
            video.currentTime = 0;
            delete video.dataset.isPlaying;

            // Si es HLS.js, detenemos la carga de fragmentos en red para ahorrar ancho de banda
            if (this.hlsInstances.has(video)) {
                const hls = this.hlsInstances.get(video);
                hls.stopLoad();
            }

            // Restaurar duración original
            if (durationSpan && card.dataset.originalDuration) {
                durationSpan.textContent = card.dataset.originalDuration;
            }
        }
    }

    playVideo(video) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                video.dataset.isPlaying = 'true';
            }).catch(error => {
                // Silenciar errores comunes de "interrupción" al hacer hover muy rápido
                console.warn('[VideoCardSystem] Reproducción interrumpida u omitida.');
            });
        }
    }

    updateCountdown(video, durationSpan) {
        if (!durationSpan || !video.duration) return;

        const timeLeft = video.duration - video.currentTime;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        durationSpan.textContent = formattedTime;
    }
}