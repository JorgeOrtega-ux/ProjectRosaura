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

        // ========================================================
        // CAPA 2 (FALLBACK): Escáner global de miniaturas rotas (Error 404)
        // Usamos la fase de captura (true) porque los eventos 'error' no propagan (bubble)
        // ========================================================
        document.addEventListener('error', (e) => {
            // Verificamos si el elemento que falló es una imagen de una video card
            if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('component-video-card__thumbnail')) {
                const fallbackUrl = window.AppConfig?.Images?.Fallbacks?.videoThumbnail || 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible';
                
                // Evitamos un bucle infinito si por alguna razón la propia imagen de fallback falla
                if (e.target.src !== fallbackUrl) {
                    e.target.src = fallbackUrl;
                }
            }
        }, true);
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

        // SOLUCIÓN: Quitamos la adición inmediata de "component-video-card--playing" aquí.
        // Se agregará más adelante, solo cuando el video realmente tenga imagen.
        video.muted = true;

        let videoSrc = video.getAttribute('data-src') || video.getAttribute('src');
        const uuid = video.getAttribute('data-uuid');

        if (uuid && (!videoSrc || !videoSrc.includes('t='))) {
            try {
                const basePath = window.AppBasePath || '';
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                
                const response = await fetch(`${basePath}/api/index.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({ 
                        route: 'media.get_token', 
                        video_uuid: uuid 
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.data && result.data.stream_url) {
                    videoSrc = basePath + result.data.stream_url;
                    video.setAttribute('data-src', videoSrc); 
                } else {
                    console.warn('[VideoCardSystem] No se pudo obtener el stream seguro', result);
                    return;
                }
            } catch (error) {
                console.error('[VideoCardSystem] Error en red al pedir URL de streaming:', error);
                return;
            }
        }

        // Validamos si el usuario retiró el ratón durante el tiempo que tardó el fetch
        if (!this.hoverTimers.has(card)) {
            return;
        }

        if (!videoSrc) return;

        if (videoSrc.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                let hls = this.hlsInstances.get(video);
                
                if (!hls) {
                    let tokenStr = null;
                    let expiresStr = null;
                    try {
                        const fakeBase = videoSrc.startsWith('http') ? '' : window.location.origin;
                        const urlObj = new URL(videoSrc, fakeBase);
                        tokenStr = urlObj.searchParams.get('t');
                        expiresStr = urlObj.searchParams.get('e');
                    } catch (e) {}

                    hls = new Hls({
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        autoStartLoad: false,
                        xhrSetup: function(xhr, url_to_load) {
                            if (tokenStr && expiresStr && url_to_load.includes('/api/media/stream/')) {
                                try {
                                    const reqUrl = new URL(url_to_load, window.location.origin);
                                    if (!reqUrl.searchParams.has('t')) {
                                        reqUrl.searchParams.set('t', tokenStr);
                                        reqUrl.searchParams.set('e', expiresStr);
                                        xhr.open('GET', reqUrl.toString(), true);
                                    }
                                } catch (err) {}
                            }
                        }
                    });
                    
                    this.hlsInstances.set(video, hls);
                    
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        hls.loadSource(videoSrc);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        // Verificamos de nuevo antes de reproducir que el usuario siga haciendo hover
                        if (this.hoverTimers.has(card)) {
                            hls.startLoad(-1);
                            this.playVideo(video, card); // Pasamos 'card' al método
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
                        this.playVideo(video, card); // Pasamos 'card'
                    }
                }

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                if (video.src !== videoSrc) video.src = videoSrc;
                this.playVideo(video, card); // Pasamos 'card'
            }
        } else {
            if (video.src !== videoSrc) video.src = videoSrc;
            this.playVideo(video, card); // Pasamos 'card'
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
            // Esto oculta el video y vuelve a mostrar la miniatura inmediatamente
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

    // Actualizamos playVideo para que reciba la 'card' como argumento
    playVideo(video, card) {
        video.muted = true; 
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            this.playPromises.set(video, playPromise);
            playPromise.then(() => {
                video.dataset.isPlaying = 'true';
                
                // MAGIA: Solo mostramos el video visualmente (añadimos la clase) 
                // cuando el video ya cargó su primer frame Y si el mouse sigue encima
                if (this.hoverTimers.has(card)) {
                    card.classList.add('component-video-card--playing');
                } else {
                    // Si el usuario ya quitó el ratón en la fracción de segundo que tomó cargar
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