// public/assets/js/core/components/VideoPlayerSystem.js

import { ApiService } from '../api/ApiServices.js';

export class VideoPlayerSystem {
    constructor() {
        console.log('[VideoPlayer:Init] Construyendo sistema de reproductor avanzado con Scrubbing Fluido e Iluminación Cinematográfica...');
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

        // Módulo de Configuraciones y Nodos para Calidad/Velocidad
        this.settingsBtn = document.getElementById('btn-settings');
        this.settingsMenu = document.getElementById('player-settings-menu');
        
        this.qualityStatus = document.getElementById('quality-status');
        this.qualityMenuContent = document.getElementById('quality-menu-content');
        
        this.speedStatus = document.getElementById('speed-status');
        this.speedMenuContent = document.getElementById('speed-menu-content');

        // Barra de progreso y tiempos
        this.progressArea = document.getElementById('progress-area');
        this.progressFill = document.getElementById('progress-fill');
        this.progressBuffer = document.getElementById('progress-buffer');
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeCurrent = document.getElementById('time-current');
        this.timeDuration = document.getElementById('time-duration');

        // Spinner de Carga
        this.playerSpinner = document.getElementById('player-spinner');

        // Preview Card Elements
        this.previewCard = document.getElementById('preview-card');
        this.previewSprite = document.getElementById('preview-sprite');
        this.previewTime = document.getElementById('preview-time');

        // Estado del Reproductor
        this.isTheaterMode = false;
        this.hls = null;
        this.lastVolume = 1; 
        this.currentVideoUuid = null;
        this.hasRegisteredView = false; 
        
        // Variables para Scrubbing y Sprite Sheet
        this.isDragging = false;
        this.wasPlayingBeforeDrag = false;
        this.vttData = [];
        this.spriteSheetUrl = null;
        this._spriteImage = new Image(); // Objeto en memoria para dibujar en el Canvas

        // Variables de Ambient Mode
        this.ambientModeEnabled = true;
        this.ambientCanvas = null;
        this.ambientCtx = null;
        this.ambientLoopId = null;
        
        // Variables para Observer de Tema
        this.themeObserver = null;
        this.systemThemeQuery = null;
        this.systemThemeListener = null;

        // --- VARIABLES DE RETENCIÓN (HEATMAP) Y TELEMETRÍA ---
        this.dbVideoId = null;
        this.chunkViews = {}; 
        this.lastChunkIndex = -1;
        this.retentionBatchInterval = null;
        this.heatmapData = []; 
        this.heatmapMax = 0;   
        this.lastTelemetryPing = -1; 
        
        this.setupOverlay();

        this.resizeHandler = this.calculatePlayerSize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        this.bindEvents();
        this.initSpeedControl();
        this.initLightingControl();

        setTimeout(() => this.calculatePlayerSize(), 50);
    }

    setupOverlay() {
        if (!this.container) return;
        this.previewOverlay = document.createElement('div');
        this.previewOverlay.className = 'component-player-preview-overlay';
        
        // MAGIA: Usamos un Canvas puro. Se comportará exactamente igual que el tag <video>
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.className = 'component-player-preview-canvas';
        
        this.previewOverlay.appendChild(this.previewCanvas);
        this.container.insertBefore(this.previewOverlay, this.controlsContainer);
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

        const ambientWrapper = document.getElementById('ambient-wrapper');
        if (ambientWrapper) {
            ambientWrapper.style.width = `${targetWidth}px`;
            ambientWrapper.style.height = `${targetHeight}px`;
        }
    }

    bindEvents() {
        if (!this.video || !this.container) return;
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('play', () => {
            this.playPauseIcon.textContent = 'pause';
            this.playPauseBtn.title = "Pausar (k)";
            this.container.classList.remove('is-paused');
            this.hideSpinner();
        });
        this.video.addEventListener('pause', () => {
            if (!this.isDragging) {
                this.playPauseIcon.textContent = 'play_arrow';
                this.playPauseBtn.title = "Reproducir (k)";
                this.container.classList.add('is-paused');
            }
        });
        
        this.video.addEventListener('waiting', () => this.showSpinner());
        this.video.addEventListener('playing', () => this.hideSpinner());
        this.video.addEventListener('canplay', () => this.hideSpinner());
        this.video.addEventListener('loadstart', () => this.showSpinner());
        this.video.addEventListener('loadeddata', () => {
            this.hideSpinner();
            this.updateBuffer();
        });
        this.video.addEventListener('progress', () => this.updateBuffer());

        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        this.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.video.volume = value;
            this.video.muted = (value === "0");
            e.target.style.setProperty('--volume-fill', `${value * 100}%`);
        });
        
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
        this.video.addEventListener('loadedmetadata', () => {
            this.timeDuration.textContent = this.formatTime(this.video.duration);
            this.updateVolumeUI(); 
            this.updateBuffer();
        });
        
        this.video.addEventListener('timeupdate', () => {
            if (!this.isDragging) {
                this.updateProgress();
                this.updateBuffer();
                this.trackRetention(); 
                this.trackTelemetry(); 
                this.checkViewRegistration(); 
            }
        });

        this.progressArea.addEventListener('pointerdown', (e) => this.startScrubbing(e));
        document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        document.addEventListener('pointerup', (e) => this.stopScrubbing(e));

        this.progressArea.addEventListener('pointermove', (e) => {
            if (!this.isDragging) this.updateHoverPreview(e);
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
            const ambientWrapper = document.getElementById('ambient-wrapper');
            if (document.fullscreenElement) {
                this.fullscreenIcon.textContent = 'fullscreen_exit';
                if (ambientWrapper) ambientWrapper.style.visibility = 'hidden';
            } else {
                this.fullscreenIcon.textContent = 'fullscreen';
                if (ambientWrapper) ambientWrapper.style.visibility = 'visible';
                this.calculatePlayerSize(); 
            }
        });
    }

    showSpinner() {
        if (this.playerSpinner && (!this.video || this.video.readyState < 3)) {
            this.playerSpinner.style.display = 'flex';
        }
    }

    hideSpinner() {
        if (this.playerSpinner) {
            this.playerSpinner.style.display = 'none';
        }
    }

    checkViewRegistration() {
        if (!this.hasRegisteredView && this.video.currentTime > 3) {
            this.hasRegisteredView = true;
            if (this.currentVideoUuid) {
                this.api.postView(this.currentVideoUuid).catch(e => {
                    console.error("[VideoPlayer:View] Error al registrar la visita para el historial:", e);
                });
            }
        }
    }

    trackTelemetry() {
        if (!this.video.duration || this.video.paused) return;
        const currentTime = this.video.currentTime;
        const percentage = (currentTime / this.video.duration) * 100;

        const currentSecond = Math.floor(currentTime);
        if (currentSecond > 0 && currentSecond % 10 === 0 && currentSecond !== this.lastTelemetryPing) {
            this.lastTelemetryPing = currentSecond;
            console.log('%c[VideoPlayerSystem] Disparando Telemetría Nativa:', 'color: #ff00ff; font-weight: bold;', { currentTime, percentage });
            if (this.currentVideoUuid) {
                this.api.sendTelemetryPing(this.currentVideoUuid, currentTime, percentage)
                    .then(res => console.log('%c[VideoPlayerSystem] Resultado Telemetría Nativa:', 'color: #ff00ff', res))
                    .catch(e => console.warn('[VideoPlayer:Telemetry] Fallo al enviar ping', e));
            }
        }
    }

    trackRetention() {
        if (!this.video.duration || this.video.paused) return;

        const chunkIndex = Math.floor((this.video.currentTime / this.video.duration) * 100);

        if (chunkIndex >= 0 && chunkIndex < 100 && chunkIndex !== this.lastChunkIndex) {
            this.lastChunkIndex = chunkIndex;
            
            if (!this.chunkViews[chunkIndex]) {
                this.chunkViews[chunkIndex] = 0;
            }
            
            if (this.chunkViews[chunkIndex] < 5) {
                this.chunkViews[chunkIndex]++;
                console.log('%c[VideoPlayerSystem] Heatmap Chunk Capturado:', 'color: #ffaa00', { chunkIndex, count: this.chunkViews[chunkIndex] });
            }
        }
    }

    startRetentionBatcher() {
        if (this.retentionBatchInterval) clearInterval(this.retentionBatchInterval);
        
        this.retentionBatchInterval = setInterval(() => {
            this.sendRetentionData();
        }, 15000);
    }

    sendRetentionData() {
        if (!this.dbVideoId || Object.keys(this.chunkViews).length === 0) return;
        
        const dataToSend = { ...this.chunkViews };
        console.log('%c[VideoPlayerSystem] Enviando Lote Retención (Heatmap):', 'color: #ffaa00; font-weight: bold;', dataToSend);
        
        this.chunkViews = {};
        
        this.api.sendRetentionBatch(this.dbVideoId, dataToSend).then(res => {
            console.log('%c[VideoPlayerSystem] Resultado Retención (Heatmap):', 'color: #ffaa00', res);
        }).catch(e => {
            console.error("[VideoPlayer:Heatmap] Error al enviar lote de retención:", e);
        });
    }

    renderHeatmap(data) {
        this.heatmapData = data;
        this.heatmapMax = Math.max(...(data || []), 1);

        if (!this.progressArea || !Array.isArray(data) || data.length === 0) return;
        
        let canvas = this.progressArea.querySelector('.heatmap-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'heatmap-canvas';
            
            canvas.style.position = 'absolute';
            canvas.style.bottom = '100%';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '40px'; 
            canvas.style.pointerEvents = 'none'; 
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            canvas.style.transformOrigin = 'bottom';
            canvas.style.transform = 'scaleY(0.5)';
            
            this.progressArea.style.position = 'relative';
            this.progressArea.appendChild(canvas);
            
            if (this.controlsContainer) {
                this.controlsContainer.addEventListener('mouseenter', () => {
                    canvas.style.opacity = '0.8';
                    canvas.style.transform = 'scaleY(1)';
                });
                this.controlsContainer.addEventListener('mouseleave', () => {
                    canvas.style.opacity = '0';
                    canvas.style.transform = 'scaleY(0.5)';
                });
            }
        }
        
        setTimeout(() => {
            canvas.width = canvas.offsetWidth || 1000;
            canvas.height = canvas.offsetHeight || 40;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const maxVal = this.heatmapMax;
            
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            
            const step = canvas.width / (data.length - 1);
            
            for (let i = 0; i < data.length; i++) {
                const x = i * step;
                const h = (data[i] / maxVal) * (canvas.height * 0.9);
                const y = canvas.height - h;
                ctx.lineTo(x, y);
            }
            
            ctx.lineTo(canvas.width, canvas.height);
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; 
            ctx.fill();
        }, 100);
    }

    initSpeedControl() {
        if (!this.speedMenuContent) return;
        const items = this.speedMenuContent.querySelectorAll('.component-menu__item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                items.forEach(i => i.classList.remove('is-selected'));
                item.classList.add('is-selected');
                
                const speedVal = parseFloat(item.getAttribute('data-speed'));
                const speedText = item.querySelector('span:not(.component-menu__check)').textContent.trim();
                
                if (this.video) {
                    this.video.playbackRate = speedVal;
                }
                
                if (this.speedStatus) {
                    this.speedStatus.textContent = speedText;
                }
            });
        });
    }

    isLightModeActive() {
        const html = document.documentElement;
        const themeAttr = html.getAttribute('data-theme');
        const isDarkClass = html.classList.contains('dark-theme');
        const isLightClass = html.classList.contains('light-theme');
        
        if (themeAttr === 'light' || isLightClass) return true;
        if (themeAttr === 'dark' || isDarkClass) return false;
        
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    handleThemeChange() {
        const isLight = this.isLightModeActive();
        const lightingMenu = document.getElementById('setting-menu-lighting');
        const status = document.getElementById('lighting-status');
        
        if (isLight) {
            this.ambientModeEnabled = false;
            this.stopAmbientLoop();
            if (this.ambientCanvas) {
                this.ambientCanvas.style.opacity = '0';
            }
            
            if (lightingMenu) {
                const items = lightingMenu.querySelectorAll('.component-menu__item');
                items.forEach(i => {
                    i.classList.remove('is-selected');
                    const isAmbientOnBtn = i.getAttribute('data-ambient') === "1";
                    const isAmbientOffBtn = i.getAttribute('data-ambient') === "0";
                    
                    if (isAmbientOffBtn) {
                        i.classList.add('is-selected');
                    }
                    if (isAmbientOnBtn) {
                        i.style.opacity = '0.4';
                        i.style.cursor = 'not-allowed';
                    }
                });
            }
            if (status) {
                status.textContent = "No disponible (Tema Claro)";
            }
        } else {
            if (lightingMenu) {
                const items = lightingMenu.querySelectorAll('.component-menu__item');
                items.forEach(i => {
                    if (i.getAttribute('data-ambient') === "1") {
                        i.style.opacity = '1';
                        i.style.cursor = 'pointer';
                    }
                });
            }
            if (status && status.textContent.includes("Tema Claro")) {
                 status.textContent = "Desactivado"; 
            }
        }
    }

    initLightingControl() {
        const lightingMenu = document.getElementById('setting-menu-lighting');
        if (!lightingMenu) return;
        const items = lightingMenu.querySelectorAll('.component-menu__item');
        const status = document.getElementById('lighting-status');

        this.ambientCanvas = document.getElementById('ambient-lighting-canvas');
        if (this.ambientCanvas) {
            this.ambientCtx = this.ambientCanvas.getContext('2d', { alpha: false }); 
            this.ambientCanvas.width = 128;
            this.ambientCanvas.height = 72;
        }

        this.handleThemeChange();

        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
                    this.handleThemeChange();
                }
            });
        });
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

        if (window.matchMedia) {
            this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
            this.systemThemeListener = (e) => {
                if (!document.documentElement.getAttribute('data-theme')) { 
                    this.handleThemeChange();
                }
            };
            this.systemThemeQuery.addEventListener('change', this.systemThemeListener);
        }

        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const isEnabled = item.getAttribute('data-ambient') === "1";
                
                if (this.isLightModeActive() && isEnabled) {
                    return; 
                }

                items.forEach(i => i.classList.remove('is-selected'));
                item.classList.add('is-selected');
                
                this.ambientModeEnabled = isEnabled;

                if (status) {
                    status.textContent = item.querySelector('span:not(.component-menu__check)').textContent.trim();
                }

                if (this.ambientCanvas) {
                    this.ambientCanvas.style.opacity = isEnabled ? '0.8' : '0';
                    if (isEnabled) {
                        this.drawAmbientFrame();
                        if (!this.video.paused) this.startAmbientLoop();
                    } else {
                        this.stopAmbientLoop();
                    }
                }
            });
        });

        if (this.video) {
            this.video.addEventListener('play', () => this.startAmbientLoop());
            this.video.addEventListener('pause', () => this.stopAmbientLoop());
            this.video.addEventListener('seeked', () => {
                if (this.ambientModeEnabled && !this.isLightModeActive()) this.drawAmbientFrame();
            });
            this.video.addEventListener('loadeddata', () => {
                if (this.ambientModeEnabled && !this.isLightModeActive()) this.drawAmbientFrame();
            });
        }
    }

    drawAmbientFrame() {
        if (!this.ambientCanvas || !this.ambientCtx || !this.video || this.isLightModeActive()) return;
        if (this.video.readyState < 2) return; 
        
        try {
            this.ambientCtx.drawImage(this.video, 0, 0, this.ambientCanvas.width, this.ambientCanvas.height);
        } catch(e) {}
    }

    startAmbientLoop() {
        if (!this.ambientModeEnabled || this.isLightModeActive()) return;
        this.stopAmbientLoop(); 
        
        const loop = () => {
            if (this.video.paused || this.video.ended || this.isLightModeActive()) return;
            this.drawAmbientFrame();
            this.ambientLoopId = requestAnimationFrame(loop);
        };
        this.ambientLoopId = requestAnimationFrame(loop);
    }

    stopAmbientLoop() {
        if (this.ambientLoopId) {
            cancelAnimationFrame(this.ambientLoopId);
            this.ambientLoopId = null;
        }
    }

    populateQualityMenu(levels) {
        if (!this.qualityMenuContent) return;
        this.qualityMenuContent.innerHTML = '';

        const sortedLevels = levels.map((l, index) => ({...l, originalIndex: index}))
                                   .sort((a, b) => b.height - a.height);

        const seenHeights = new Set();

        sortedLevels.forEach(level => {
            if (!seenHeights.has(level.height)) {
                seenHeights.add(level.height);
                const item = document.createElement('div');
                item.className = 'component-menu__item';
                item.dataset.level = level.originalIndex;
                item.innerHTML = `<span class="material-symbols-rounded component-menu__check"></span><span>${level.height}p</span>`;
                item.addEventListener('click', (e) => this.setQuality(e, level.originalIndex));
                this.qualityMenuContent.appendChild(item);
            }
        });

        const autoItem = document.createElement('div');
        autoItem.className = 'component-menu__item is-selected';
        autoItem.dataset.level = -1; 
        autoItem.innerHTML = `<span class="material-symbols-rounded component-menu__check">check</span><span>Automática</span>`;
        autoItem.addEventListener('click', (e) => this.setQuality(e, -1));
        this.qualityMenuContent.appendChild(autoItem);
    }

    setQuality(e, levelIndex) {
        e.stopPropagation();
        if (this.hls) {
            this.hls.currentLevel = levelIndex; 
            
            const items = this.qualityMenuContent.querySelectorAll('.component-menu__item');
            items.forEach(i => i.classList.remove('is-selected'));
            e.currentTarget.classList.add('is-selected');

            if (levelIndex === -1) {
                this.updateAutoQualityDisplay(this.hls.currentLevel === -1 ? this.hls.loadLevel : this.hls.currentLevel);
            } else {
                const level = this.hls.levels[levelIndex];
                if (level && this.qualityStatus) {
                    this.qualityStatus.textContent = `${level.height}p`;
                }
            }
        }
    }

    updateAutoQualityDisplay(currentLevelIndex) {
        if (this.hls && this.hls.autoLevelEnabled) {
            const level = this.hls.levels[currentLevelIndex];
            if (level && this.qualityStatus) {
                this.qualityStatus.textContent = `Automática (${level.height}p)`;
            } else if (this.qualityStatus) {
                this.qualityStatus.textContent = 'Automática';
            }
        }
    }

    async loadVideo(sourceIdentifier, requiresSignedToken = false, dbVideoId = null) {
        if (!this.video) return;
        this.destroyHls(); 
        this.vttData = [];
        this.spriteSheetUrl = null;
        this._spriteImage.src = ''; // Limpiamos la memoria
        
        this.dbVideoId = dbVideoId;
        this.currentVideoUuid = sourceIdentifier; 
        this.hasRegisteredView = false;           
        this.chunkViews = {};
        this.lastChunkIndex = -1;
        this.lastTelemetryPing = -1;
        this.heatmapData = [];
        this.heatmapMax = 0;
        
        if (this.progressBuffer) this.progressBuffer.style.width = '0%';
        this.showSpinner();
        
        this.startRetentionBatcher();
        
        if (requiresSignedToken) {
            try {
                const response = await this.api.getMediaToken(this.currentVideoUuid);
                
                if (response.success && response.data.stream_url) {
                    const finalUrl = (window.AppBasePath || '') + response.data.stream_url;
                    this._initStream(finalUrl);

                    if (response.data.vtt_url && response.data.sprite_sheet_url) {
                        this.spriteSheetUrl = (window.AppBasePath || '') + response.data.sprite_sheet_url;
                        this.fetchVtt((window.AppBasePath || '') + response.data.vtt_url);
                    }
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
            
            // Pre-cargamos la imagen en el objeto en memoria para el Canvas
            if (this.spriteSheetUrl) {
                this._spriteImage.src = this.spriteSheetUrl;
            }
            
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
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                this.container.classList.add('is-paused');
                this.populateQualityMenu(data.levels);
            });

            this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                this.updateAutoQualityDisplay(data.level);
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
        this.sendRetentionData();
        if (this.retentionBatchInterval) clearInterval(this.retentionBatchInterval);
        
        this.destroyHls();
        this.stopAmbientLoop(); 
        
        if (this.themeObserver) {
            this.themeObserver.disconnect();
        }
        if (this.systemThemeQuery && this.systemThemeListener) {
            this.systemThemeQuery.removeEventListener('change', this.systemThemeListener);
        }

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
            const val = this.video.muted ? 0 : this.video.volume;
            this.volumeSlider.value = val;
            this.volumeSlider.style.setProperty('--volume-fill', `${val * 100}%`);
        } else {
            this.volumeSlider.style.setProperty('--volume-fill', `${this.volumeSlider.value * 100}%`);
        }
    }

    updateProgress() {
        if (!this.video.duration) return;
        const percent = (this.video.currentTime / this.video.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        this.progressThumb.style.left = `${percent}%`;
        this.timeCurrent.textContent = this.formatTime(this.video.currentTime);
    }

    updateBuffer() {
        if (!this.video.duration || !this.progressBuffer) return;
        try {
            if (this.video.buffered.length > 0) {
                let bufferedEnd = 0;
                for (let i = 0; i < this.video.buffered.length; i++) {
                    if (this.video.buffered.start(i) <= this.video.currentTime && this.video.buffered.end(i) >= this.video.currentTime) {
                        bufferedEnd = this.video.buffered.end(i);
                        break;
                    }
                }
                
                if (bufferedEnd === 0) {
                    bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
                }
                
                const percent = (bufferedEnd / this.video.duration) * 100;
                this.progressBuffer.style.width = `${percent}%`;
            }
        } catch (e) {
        }
    }

    startScrubbing(e) {
        if (!this.video.duration) return;
        this.isDragging = true;
        this.progressArea.classList.add('is-dragging');
        this.wasPlayingBeforeDrag = !this.video.paused;
        this.video.pause();
        
        this.scrubTo(e, false); 
        
        if (this.previewOverlay) this.previewOverlay.style.display = 'block';
    }

    handlePointerMove(e) {
        if (this.isDragging) {
            this.scrubTo(e, false);
        }
    }

    updateHoverPreview(e) {
        if (!this.video.duration || !this.previewCard) return;
        const rect = this.progressArea.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        const timeAtCursor = pos * this.video.duration;
        
        this.renderPreviewVisuals(pos, timeAtCursor, true);
    }

    stopScrubbing(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.progressArea.classList.remove('is-dragging');
            
            this.scrubTo(e, true); 
            
            const onSeeked = () => {
                if (this.previewOverlay && !this.isDragging) {
                    this.previewOverlay.style.display = 'none';
                }
                
                if (this.wasPlayingBeforeDrag && !this.isDragging) {
                    this.video.play().catch(err => console.error(err));
                }
                
                this.video.removeEventListener('seeked', onSeeked);
            };

            if (this.video.seeking) {
                this.video.addEventListener('seeked', onSeeked);
            } else {
                onSeeked();
            }
        }
    }

    scrubTo(e, updateVideo) {
        const rect = this.progressArea.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        
        const timeAtCursor = pos * this.video.duration;
        
        this.progressFill.style.width = `${pos * 100}%`;
        this.progressThumb.style.left = `${pos * 100}%`;
        this.timeCurrent.textContent = this.formatTime(timeAtCursor);
        
        this.renderPreviewVisuals(pos, timeAtCursor, false);
        
        if (updateVideo) {
            this.video.currentTime = timeAtCursor;
        }
    }

    renderPreviewVisuals(pos, timeAtCursor, isHoverOnly = false) {
        const rect = this.progressArea.getBoundingClientRect();
        const cardWidth = this.previewCard.offsetWidth || 172; 
        let cardX = (pos * rect.width);
        
        const minX = cardWidth / 2;
        const maxX = rect.width - (cardWidth / 2);
        cardX = Math.max(minX, Math.min(maxX, cardX));
        
        this.previewCard.style.left = `${cardX}px`;

        let isPeakMoment = false;
        
        if (this.heatmapData && this.heatmapData.length > 0 && this.heatmapMax > 1) {
            const index = Math.min(this.heatmapData.length - 1, Math.floor(pos * this.heatmapData.length));
            const currentReten = this.heatmapData[index];
            
            if (currentReten >= (this.heatmapMax * 0.85)) {
                isPeakMoment = true;
            }
        }

        if (isPeakMoment) {
            this.previewTime.textContent = `${this.formatTime(timeAtCursor)} • Momento con más reproducciones`;
            this.previewTime.classList.add('is-peak-moment');
        } else {
            this.previewTime.textContent = this.formatTime(timeAtCursor);
            this.previewTime.classList.remove('is-peak-moment');
        }

        if (this.vttData.length > 0 && this.spriteSheetUrl) {
            const cue = this.vttData.find(c => timeAtCursor >= c.start && timeAtCursor <= c.end) || this.vttData[0];
            
            // 1. Tarjeta Flotante Pequeña
            if (this.previewSprite) {
                this.previewSprite.style.backgroundImage = `url(${this.spriteSheetUrl})`;
                this.previewSprite.style.backgroundPosition = `-${cue.x}px -${cue.y}px`;
                this.previewSprite.style.width = `${cue.w}px`;
                this.previewSprite.style.height = `${cue.h}px`;
            }

            // 2. Fondo Gigante de Baja Calidad (MÁSCARA PERFECTA CON CANVAS)
            if (!isHoverOnly && this.previewCanvas && this.isDragging) {
                const ctx = this.previewCanvas.getContext('2d');
                
                // Le damos al canvas la proporción exacta del frame
                if (this.previewCanvas.width !== cue.w) this.previewCanvas.width = cue.w;
                if (this.previewCanvas.height !== cue.h) this.previewCanvas.height = cue.h;
                
                if (this._spriteImage && this._spriteImage.complete) {
                    ctx.clearRect(0, 0, cue.w, cue.h);
                    
                    // TRUCO ANTI-SANGRADO: 
                    // Recortamos 1 solo píxel exacto de los bordes del recuadro original.
                    // Esto elimina cualquier línea verde o negra que haya dejado FFmpeg 
                    // y evita que los subpíxeles sangren al escalar.
                    const crop = 1;
                    
                    ctx.drawImage(
                        this._spriteImage, 
                        cue.x + crop, cue.y + crop, cue.w - (crop * 2), cue.h - (crop * 2), // Área de extracción
                        0, 0, cue.w, cue.h // Destino final
                    );
                }
            }
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