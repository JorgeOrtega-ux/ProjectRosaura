export class VideoCardSystem {
    constructor() {
        this.hlsInstances = new WeakMap();
        this.playPromises = new WeakMap();
        this.hoverTimers = new WeakMap();
        this.hoverDelay = 550;
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

        if (this.hoverTimers.has(card)) {
            clearTimeout(this.hoverTimers.get(card));
        }

        const timerId = setTimeout(() => {
            this.startPlayback(card, video, durationSpan);
        }, this.hoverDelay);

        this.hoverTimers.set(card, timerId);
    }

    async startPlayback(card, video, durationSpan) {
        if (!card.dataset.originalDuration && durationSpan) {
            card.dataset.originalDuration = durationSpan.textContent;
        }

        card.classList.add('component-video-card--playing');
        video.muted = true;

        let videoSrc = video.getAttribute('data-src') || video.getAttribute('src');
        const uuid = video.getAttribute('data-uuid');

        // Solución al 403: Si no tenemos un enlace firmado (con token 't='), lo solicitamos al backend
        if (uuid && (!videoSrc || !videoSrc.includes('t='))) {
            try {
                const basePath = window.AppBasePath || '';
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                
                // CORRECCIÓN: La ruta correcta en route-map.php es media.get_token
                const response = await fetch(`${basePath}/api/index.php?route=media.get_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({ video_uuid: uuid })
                });
                
                const result = await response.json();
                
                if (result.success && result.data && result.data.stream_url) {
                    videoSrc = basePath + result.data.stream_url;
                    video.setAttribute('data-src', videoSrc); // Cachear el link firmado para el próximo hover
                } else {
                    console.warn('[VideoCardSystem] No se pudo obtener el stream seguro', result);
                    card.classList.remove('component-video-card--playing');
                    return;
                }
            } catch (error) {
                console.error('[VideoCardSystem] Error en red al pedir URL de streaming:', error);
                card.classList.remove('component-video-card--playing');
                return;
            }
        }

        // Verificamos si el usuario retiró el ratón mientras el fetch respondía
        if (!card.classList.contains('component-video-card--playing')) {
            return;
        }

        if (!videoSrc) return;

        if (videoSrc.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                let hls = this.hlsInstances.get(video);
                
                if (!hls) {
                    hls = new Hls({
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        autoStartLoad: false
                    });
                    
                    this.hlsInstances.set(video, hls);
                    
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        hls.loadSource(videoSrc);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (card.classList.contains('component-video-card--playing')) {
                            hls.startLoad(-1);
                            this.playVideo(video);
                        }
                    });

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
                    if (hls.url !== videoSrc) {
                        hls.loadSource(videoSrc);
                    } else {
                        hls.startLoad(-1);
                        this.playVideo(video);
                    }
                }

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                if (video.src !== videoSrc) video.src = videoSrc;
                this.playVideo(video);
            }
        } else {
            if (video.src !== videoSrc) video.src = videoSrc;
            this.playVideo(video);
        }

        video.ontimeupdate = () => this.updateCountdown(video, durationSpan);
    }

    handleMouseLeave(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

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