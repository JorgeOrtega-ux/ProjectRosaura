// public/assets/js/core/components/VideoPlayerSystem.js

import { ApiService } from '../api/ApiServices.js';

export class VideoPlayerSystem {
    constructor() {
        console.log('[VideoPlayer:Init] Construyendo sistema de reproductor avanzado con Scrubbing...');
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

        // Barra de progreso y tiempos
        this.progressArea = document.getElementById('progress-area');
        this.progressFill = document.getElementById('progress-fill');
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeCurrent = document.getElementById('time-current');
        this.timeDuration = document.getElementById('time-duration');

        // Preview Card Elements
        this.previewCard = document.getElementById('preview-card');
        this.previewSprite = document.getElementById('preview-sprite');
        this.previewTime = document.getElementById('preview-time');

        this.isTheaterMode = false;
        this.hls = null;
        this.lastVolume = 1; 
        this.currentVideoUuid = null;
        
        // Variables para Scrubbing y Sprite Sheet
        this.isDragging = false;
        this.wasPlayingBeforeDrag = false;
        this.vttData = [];
        this.spriteSheetUrl = null;
        
        this.resizeHandler = this.calculatePlayerSize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        this.bindEvents();

        setTimeout(() => this.calculatePlayerSize(), 50);
    }

    calculatePlayerSize() {
        const outerContainer = document.getElementById('watch-layout-player'); 
        const innerContainer = this.container; 
        
        if (!outerContainer || !innerContainer) return;

        if (document.fullscreenElement) {
            outerContainer.style.width = '';
            outerContainer.style.height = '';
            innerContainer.style.width = '';
            innerContainer.style.height = '';
            return;
        }

        if (window.innerWidth <= 1024) {
            outerContainer.style.width = '';
            outerContainer.style.height = '';
            innerContainer.style.width = '';
            innerContainer.style.height = '';
            return;
        }

        outerContainer.style.width = '100%';
        outerContainer.style.height = 'auto';

        let availableWidth = outerContainer.offsetWidth; 
        let maxHeight = this.isTheaterMode ? (window.innerHeight - 80) : (window.innerHeight - 120);

        let targetWidth = availableWidth;
        let targetHeight = (targetWidth * 9) / 16;

        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = (targetHeight * 16) / 9;
        }

        outerContainer.style.height = `${targetHeight}px`;
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
            if (!this.isDragging) {
                this.playPauseIcon.textContent = 'play_arrow';
                this.playPauseBtn.title = "Reproducir (k)";
                this.container.classList.add('is-paused');
            }
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
        this.video.addEventListener('timeupdate', () => {
            if (!this.isDragging) this.updateProgress();
        });

        // --- EVENTOS DE SCRUBBING (ARRASTRE PROGRESIVO) ---
        this.progressArea.addEventListener('pointerdown', (e) => this.startScrubbing(e));
        document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        document.addEventListener('pointerup', (e) => this.stopScrubbing(e));

        this.progressArea.addEventListener('pointermove', (e) => this.updatePreview(e));
        this.progressArea.addEventListener('pointerleave', () => {
            if (this.previewCard && !this.isDragging) {
                // Al salir del hover y no arrastrar, el CSS oculta, pero limpiamos estado
            }
        });
        
        this.cinemaBtn.addEventListener('click', () => this.toggleCinemaMode());
        
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsMenu();
            });
        }

        if (this.settingsMenu) {
            const menuTriggers = this.settingsMenu.querySelectorAll('[data-target]');
            menuTriggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = trigger.getAttribute('data-target');
                    this.navigateToMenu(targetId);
                });
            });

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

        document.addEventListener('click', (e) => {
            if (this.settingsMenu && this.settingsMenu.classList.contains('is-active')) {
                if (!this.settingsMenu.contains(e.target) && !this.settingsBtn.contains(e.target)) {
                    this.settingsMenu.classList.remove('is-active');
                    setTimeout(() => this.navigateToMenu('setting-menu-main'), 250);
                }
            }
        });

        if(this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.fullscreenIcon.textContent = 'fullscreen_exit';
            } else {
                this.fullscreenIcon.textContent = 'fullscreen';
                this.calculatePlayerSize(); 
            }
        });
    }

    async loadVideo(sourceIdentifier, requiresSignedToken = false) {
        if (!this.video) return;
        console.log(`[VideoPlayer:Auth] Solicitando carga de video. ID: ${sourceIdentifier}, RequiereToken: ${requiresSignedToken}`);

        this.destroyHls(); 
        this.vttData = [];
        
        if (requiresSignedToken) {
            this.currentVideoUuid = sourceIdentifier;
            try {
                const response = await this.api.getMediaToken(this.currentVideoUuid);
                
                if (response.success && response.data.stream_url) {
                    const finalUrl = (window.AppBasePath || '') + response.data.stream_url;
                    this._initStream(finalUrl);

                    // Descargar el VTT si existe
                    if (response.data.vtt_url && response.data.sprite_sheet_url) {
                        this.spriteSheetUrl = (window.AppBasePath || '') + response.data.sprite_sheet_url;
                        this.fetchVtt((window.AppBasePath || '') + response.data.vtt_url);
                    }
                } else {
                    console.error("[VideoPlayer:Auth] No se pudo firmar el video:", response.message);
                }
            } catch (error) {
                console.error("[VideoPlayer:Auth] Error en petición de token:", error);
            }
        } else {
            this._initStream(sourceIdentifier);
        }
    }

    async fetchVtt(vttUrl) {
        try {
            console.log("[VideoPlayer:VTT] Descargando y parseando coordenadas...");
            const res = await fetch(vttUrl);
            const text = await res.text();
            
            const lines = text.split('\n');
            let currentCue = {};
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('-->')) {
                    const times = lines[i].split('-->');
                    currentCue.start = this.parseVttTime(times[0]);
                    currentCue.end = this.parseVttTime(times[1]);
                } else if (lines[i].includes('#xywh=')) {
                    const match = lines[i].match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
                    if (match) {
                        currentCue.x = parseInt(match[1]);
                        currentCue.y = parseInt(match[2]);
                        currentCue.w = parseInt(match[3]);
                        currentCue.h = parseInt(match[4]);
                        this.vttData.push({...currentCue});
                        currentCue = {};
                    }
                }
            }
            console.log(`[VideoPlayer:VTT] ${this.vttData.length} coordenadas procesadas exitosamente.`);
        } catch (error) {
            console.error("[VideoPlayer:VTT] Error al obtener el archivo de previsualizaciones:", error);
        }
    }

    parseVttTime(timeStr) {
        const parts = timeStr.trim().split(':');
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) {
            h = parseInt(parts[0]);
            m = parseInt(parts[1]);
            const secParts = parts[2].split('.');
            s = parseInt(secParts[0]) + (parseInt(secParts[1] || 0) / 1000);
        } else if (parts.length === 2) {
            m = parseInt(parts[0]);
            const secParts = parts[1].split('.');
            s = parseInt(secParts[0]) + (parseInt(secParts[1] || 0) / 1000);
        }
        return (h * 3600) + (m * 60) + s;
    }

    _initStream(url) {
        let tokenStr = null;
        let expiresStr = null;
        try {
            const fakeBase = url.startsWith('http') ? '' : window.location.origin;
            const urlObj = new URL(url, fakeBase);
            tokenStr = urlObj.searchParams.get('t');
            expiresStr = urlObj.searchParams.get('e');
        } catch (e) {}

        if (url.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
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
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
            this.video.play().catch(e => console.error(e));
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

    // --- MÉTODOS DE SCRUBBING ---
    startScrubbing(e) {
        if (!this.video.duration) return;
        this.isDragging = true;
        this.progressArea.classList.add('is-dragging');
        this.wasPlayingBeforeDrag = !this.video.paused;
        this.video.pause();
        this.updateScrubPosition(e);
    }

    handlePointerMove(e) {
        if (this.isDragging) {
            this.updateScrubPosition(e);
            this.updatePreview(e);
        }
    }

    stopScrubbing(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.progressArea.classList.remove('is-dragging');
            this.updateScrubPosition(e);
            if (this.wasPlayingBeforeDrag) {
                this.video.play().catch(e => console.error(e));
            }
        }
    }

    updateScrubPosition(e) {
        const rect = this.progressArea.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        this.video.currentTime = pos * this.video.duration;
        this.progressFill.style.width = `${pos * 100}%`;
        this.progressThumb.style.left = `${pos * 100}%`;
        this.timeCurrent.textContent = this.formatTime(this.video.currentTime);
    }

    updatePreview(e) {
        if (!this.video.duration || !this.previewCard) return;

        const rect = this.progressArea.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        const timeAtCursor = pos * this.video.duration;
        
        // Mover la tarjeta físicamente
        const cardWidth = this.previewCard.offsetWidth || 172; // width + padding aproximado
        let cardX = (pos * rect.width);
        
        // Prevenir que la tarjeta se salga del reproductor por los lados
        const minX = cardWidth / 2;
        const maxX = rect.width - (cardWidth / 2);
        cardX = Math.max(minX, Math.min(maxX, cardX));
        
        this.previewCard.style.left = `${cardX}px`;
        this.previewTime.textContent = this.formatTime(timeAtCursor);

        // Buscar las coordenadas en la matriz del VTT
        if (this.vttData.length > 0 && this.previewSprite && this.spriteSheetUrl) {
            const cue = this.vttData.find(c => timeAtCursor >= c.start && timeAtCursor <= c.end) || this.vttData[0];
            
            this.previewSprite.style.backgroundImage = `url(${this.spriteSheetUrl})`;
            this.previewSprite.style.backgroundPosition = `-${cue.x}px -${cue.y}px`;
            // Aplicar tamaño exacto del corte por si varía (FFmpeg default w: 160)
            this.previewSprite.style.width = `${cue.w}px`;
            this.previewSprite.style.height = `${cue.h}px`;
        }
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

    toggleSettingsMenu() {
        if (this.settingsMenu) {
            const isActive = this.settingsMenu.classList.contains('is-active');
            if (isActive) {
                this.settingsMenu.classList.remove('is-active');
                setTimeout(() => this.navigateToMenu('setting-menu-main'), 250);
            } else {
                this.settingsMenu.classList.add('is-active');
            }
        }
    }

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