// public/assets/js/core/components/VideoCardSystem.js

export class VideoCardSystem {
    constructor() {
        this.hlsInstances = new WeakMap();
        this.playPromises = new WeakMap();
    }

    init() {
        console.log('[VideoCardSystem] Inicializando sistema. Agregando eventos mouseenter/mouseleave al body.');
        document.body.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.body.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
    }

    handleMouseEnter(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        console.log('\n--- [VideoCardSystem] MOUSE ENTER DETECTADO ---');

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');
        
        if (!video) {
            console.warn('[VideoCardSystem] No se encontró el elemento <video> dentro de la tarjeta.');
            return;
        }

        console.log('[VideoCardSystem] Elemento de video encontrado:', video);

        if (!card.dataset.originalDuration && durationSpan) {
            card.dataset.originalDuration = durationSpan.textContent;
        }

        card.classList.add('component-video-card--playing');

        // CRÍTICO: Asegurar Mute
        video.muted = true;
        console.log('[VideoCardSystem] Atributo muted forzado a true. Estado actual:', video.muted);

        const videoSrc = video.getAttribute('data-src') || video.getAttribute('src');
        console.log('[VideoCardSystem] URL origen del video (src/data-src):', videoSrc);

        if (!videoSrc) {
            console.error('[VideoCardSystem] ERROR: No hay URL de video. src y data-src están vacíos.');
            return;
        }

        if (videoSrc.includes('.m3u8')) {
            console.log('[VideoCardSystem] Formato HLS (.m3u8) detectado.');

            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                console.log('[VideoCardSystem] Hls.js está soportado en este navegador.');
                let hls = this.hlsInstances.get(video);
                
                if (!hls) {
                    console.log('[VideoCardSystem] Instanciando un nuevo Hls.js para este video...');
                    hls = new Hls({
                        startLevel: -1,
                        capLevelToPlayerSize: true,
                        autoStartLoad: false,
                        debug: false // Pon esto en true si quieres ver logs internos de HLS.js
                    });
                    
                    hls.attachMedia(video);
                    
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        console.log('[VideoCardSystem] Hls.Events.MEDIA_ATTACHED: Vinculado al <video>. Cargando source...');
                        hls.loadSource(videoSrc);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                        console.log(`[VideoCardSystem] Hls.Events.MANIFEST_PARSED: Manifest listo con ${data.levels.length} calidades. Llamando a playVideo().`);
                        if (card.classList.contains('component-video-card--playing')) {
                            this.playVideo(video);
                        } else {
                            console.log('[VideoCardSystem] Reproducción abortada: El usuario quitó el mouse antes de que el manifest terminara de cargar.');
                        }
                    });

                    // Capturador de errores de HLS.js
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('[VideoCardSystem] ERROR DE HLS.JS:', data.type, data.details, 'Fatal:', data.fatal);
                    });
                    
                    this.hlsInstances.set(video, hls);
                    console.log('[VideoCardSystem] Llamando a hls.startLoad()...');
                    hls.startLoad(-1);
                } else {
                    console.log('[VideoCardSystem] Reutilizando instancia de Hls.js existente. Llamando a startLoad().');
                    hls.startLoad(-1);
                    this.playVideo(video);
                }

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                console.log('[VideoCardSystem] HLS Nativo detectado (Safari).');
                if (!video.src) video.src = videoSrc;
                this.playVideo(video);
            } else {
                console.error('[VideoCardSystem] ERROR: HLS.js no está definido y el navegador no soporta HLS nativamente.');
            }
        } else {
            console.log('[VideoCardSystem] Formato estándar (MP4) detectado.');
            if (!video.src) video.src = videoSrc;
            this.playVideo(video);
        }

        video.addEventListener('timeupdate', () => this.updateCountdown(video, durationSpan));
    }

    handleMouseLeave(e) {
        const card = e.target.closest('.component-video-card');
        if (!card) return;

        console.log('\n--- [VideoCardSystem] MOUSE LEAVE DETECTADO ---');

        const video = card.querySelector('.component-video-card__player');
        const durationSpan = card.querySelector('.component-video-card__duration');

        if (video) {
            card.classList.remove('component-video-card--playing');
            
            const playPromise = this.playPromises.get(video);
            
            if (playPromise !== undefined) {
                console.log('[VideoCardSystem] Promesa de play pendiente. Esperando resolución para pausar...');
                playPromise.then(() => {
                    console.log('[VideoCardSystem] Promesa resuelta. Pausando video exitosamente.');
                    video.pause();
                    video.currentTime = 0;
                }).catch((err) => {
                    console.warn('[VideoCardSystem] Promesa rechazada previamente, reiniciando tiempo de todos modos.');
                    video.currentTime = 0;
                });
            } else {
                console.log('[VideoCardSystem] No hay promesas pendientes. Pausando directo.');
                video.pause();
                video.currentTime = 0;
            }

            delete video.dataset.isPlaying;

            if (this.hlsInstances.has(video)) {
                console.log('[VideoCardSystem] Deteniendo carga en red de Hls.js (stopLoad).');
                const hls = this.hlsInstances.get(video);
                hls.stopLoad();
            }

            if (durationSpan && card.dataset.originalDuration) {
                durationSpan.textContent = card.dataset.originalDuration;
            }
        }
    }

    playVideo(video) {
        console.log('[VideoCardSystem] --> Ejecutando playVideo()');
        video.muted = true; 
        
        console.log(`[VideoCardSystem] Estado antes de play(): readyState=${video.readyState}, networkState=${video.networkState}`);
        
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            this.playPromises.set(video, playPromise);
            console.log('[VideoCardSystem] Promesa generada por video.play()');
            
            playPromise.then(() => {
                console.log('[VideoCardSystem] ÉXITO: video.play() funcionó. El video debe verse ahora.');
                video.dataset.isPlaying = 'true';
                
                if (!video.closest('.component-video-card--playing')) {
                    console.log('[VideoCardSystem] Aviso: Se resolvió el play pero la tarjeta ya no tiene el estado playing. Forzando pausa.');
                    video.pause();
                    video.currentTime = 0;
                }
            }).catch(error => {
                console.error(`[VideoCardSystem] FALLO en video.play(): [${error.name}] ${error.message}`);
            });
        } else {
            console.log('[VideoCardSystem] video.play() se ejecutó pero el navegador no devolvió una Promesa (navegador viejo).');
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