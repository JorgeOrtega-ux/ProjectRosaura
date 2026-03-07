export class VideoCardSystem {
    constructor() {
        this.hlsInstances = new WeakMap();
        this.playPromises = new WeakMap();
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

        video.addEventListener('timeupdate', () => this.updateCountdown(video, durationSpan));
    }

    handleMouseLeave(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

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