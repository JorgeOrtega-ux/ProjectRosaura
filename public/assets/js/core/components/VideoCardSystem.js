export class VideoCardSystem {
    constructor() {
        this.hlsInstances = new WeakMap();
        this.playPromises = new WeakMap();
        this.hoverTimers = new WeakMap(); // Almacena los temporizadores para evitar el autoplay instantáneo
        this.hoverDelay = 550; // Milisegundos de espera antes de iniciar la carga/reproducción
    }

    init() {
        document.body.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.body.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
    }

    handleMouseEnter(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');
        
        if (!video) return;

        // Si por alguna razón ya había un temporizador corriendo para esta tarjeta, lo limpiamos
        if (this.hoverTimers.has(card)) {
            clearTimeout(this.hoverTimers.get(card));
        }

        // Iniciamos el temporizador. La reproducción solo arrancará si el mouse se mantiene el tiempo definido.
        const timerId = setTimeout(() => {
            this.startPlayback(card, video, durationSpan);
        }, this.hoverDelay);

        this.hoverTimers.set(card, timerId);
    }

    // Nueva función que encapsula la lógica pesada
    startPlayback(card, video, durationSpan) {
        if (!card.dataset.originalDuration && durationSpan) {
            card.dataset.originalDuration = durationSpan.textContent;
        }

        card.classList.add('component-video-card--playing');
        video.muted = true; // El muted debe ser absoluto para autoplay

        const videoSrc = video.getAttribute('data-src') || video.getAttribute('src');
        if (!videoSrc) return;

        if (videoSrc.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                let hls = this.hlsInstances.get(video);
                
                if (!hls) {
                    hls = new Hls({
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        autoStartLoad: false // Crítico: Evita cargar hasta que lo indiquemos
                    });
                    
                    this.hlsInstances.set(video, hls);
                    
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        hls.loadSource(videoSrc);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        // Solo inicia la descarga y reproducción si el mouse SIGUE sobre la tarjeta
                        if (card.classList.contains('component-video-card--playing')) {
                            hls.startLoad(-1);
                            this.playVideo(video);
                        }
                    });

                    // Auto-recuperación de errores para evitar frames congelados
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    hls.destroy();
                                    this.hlsInstances.delete(video);
                                    break;
                            }
                        }
                    });

                    hls.attachMedia(video);
                } else {
                    // Si ya existe la instancia, reanudamos la carga de red y reproducimos
                    hls.startLoad(-1);
                    this.playVideo(video);
                }

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                if (!video.src) video.src = videoSrc;
                this.playVideo(video);
            }
        } else {
            if (!video.src) video.src = videoSrc;
            this.playVideo(video);
        }

        // CORRECCIÓN: Usar ontimeupdate en lugar de addEventListener evita 
        // asignar un nuevo event listener cada vez que se hace hover en la misma tarjeta
        video.ontimeupdate = () => this.updateCountdown(video, durationSpan);
    }

    handleMouseLeave(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        // Cancelamos inmediatamente el temporizador si existe. 
        // Si el usuario sacó el mouse antes de los 550ms, la función startPlayback NUNCA se ejecuta.
        if (this.hoverTimers.has(card)) {
            clearTimeout(this.hoverTimers.get(card));
            this.hoverTimers.delete(card);
        }

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');

        if (video) {
            card.classList.remove('component-video-card--playing');
            
            const playPromise = this.playPromises.get(video);
            
            const stopAndReset = () => {
                video.pause();
                video.currentTime = 0;
            };

            if (playPromise !== undefined) {
                playPromise.then(stopAndReset).catch(stopAndReset);
            } else {
                stopAndReset();
            }

            delete video.dataset.isPlaying;

            // Detenemos el consumo de red del Worker de HLS
            if (this.hlsInstances.has(video)) {
                const hls = this.hlsInstances.get(video);
                hls.stopLoad();
            }

            if (durationSpan && card.dataset.originalDuration) {
                durationSpan.textContent = card.dataset.originalDuration;
            }
        }
    }

    playVideo(video) {
        video.muted = true; 
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            this.playPromises.set(video, playPromise);
            playPromise.then(() => {
                video.dataset.isPlaying = 'true';
                // Medida de seguridad adicional
                if (!video.closest('.component-video-card--playing')) {
                    video.pause();
                    video.currentTime = 0;
                }
            }).catch(error => {
                console.warn(`[VideoCardSystem] Autoplay prevenido o interrumpido: ${error.message}`);
            });
        }
    }

    updateCountdown(video, durationSpan) {
        if (!durationSpan || !video.duration || !isFinite(video.duration)) return;
        const timeLeft = video.duration - video.currentTime;
        if (timeLeft < 0) return;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        durationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}