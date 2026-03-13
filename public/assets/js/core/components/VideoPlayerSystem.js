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
        this.progressThumb = document.getElementById('progress-thumb');
        this.timeCurrent = document.getElementById('time-current');
        this.timeDuration = document.getElementById('time-duration');

        // Preview Card Elements
        this.previewCard = document.getElementById('preview-card');
        this.previewSprite = document.getElementById('preview-sprite');
        this.previewTime = document.getElementById('preview-time');

        // Estado del Reproductor
        this.isTheaterMode = false;
        this.hls = null;
        this.lastVolume = 1; 
        this.currentVideoUuid = null;
        this.hasRegisteredView = false; // <-- AÑADIDO PARA EL HISTORIAL
        
        // Variables para Scrubbing y Sprite Sheet
        this.isDragging = false;
        this.wasPlayingBeforeDrag = false;
        this.vttData = [];
        this.spriteSheetUrl = null;

        // Variables de Ambient Mode (Iluminación Cinematográfica)
        this.ambientModeEnabled = true;
        this.ambientCanvas = null;
        this.ambientCtx = null;
        this.ambientLoopId = null;
        
        // Variables para Observer de Tema
        this.themeObserver = null;
        this.systemThemeQuery = null;
        this.systemThemeListener = null;

        // --- VARIABLES DE RETENCIÓN (HEATMAP) ---
        this.dbVideoId = null;
        this.chunkViews = {}; // Objeto temporal para batcheo
        this.lastChunkIndex = -1;
        this.retentionBatchInterval = null;
        this.heatmapData = []; // Para uso en Scrubbing Preview
        this.heatmapMax = 0;   // Para uso en Scrubbing Preview
        
        // Inicializar Overlay Principal para Scrubbing Fluido
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
        
        this.previewOverlayImg = document.createElement('img');
        this.previewOverlay.appendChild(this.previewOverlayImg);
        
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

        // CLAVE: Sincronizar el envoltorio de la luz para que SIEMPRE coincida con el video
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
            
            // NUEVO: Sincronizar el relleno del color al arrastrar la barra
            e.target.style.setProperty('--volume-fill', `${value * 100}%`);
        });
        
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
        this.video.addEventListener('loadedmetadata', () => {
            this.timeDuration.textContent = this.formatTime(this.video.duration);
            this.updateVolumeUI(); 
        });
        
        // EVENTO PRINCIPAL: Registro de tiempo y recolección para el Heatmap y Registro de Historial
        this.video.addEventListener('timeupdate', () => {
            if (!this.isDragging) {
                this.updateProgress();
                this.trackRetention(); 
                this.checkViewRegistration(); // <-- AÑADIDO PARA DISPARAR EL HISTORIAL
            }
        });

        // --- EVENTOS DE SCRUBBING EXACTO ---
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

        // Navegación principal del menú (flechas)
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

    // --- NUEVO: DISPARADOR DEL HISTORIAL (VISITA) ---
    checkViewRegistration() {
        // Registra la vista si el video ha superado los 3 segundos de reproducción
        if (!this.hasRegisteredView && this.video.currentTime > 3) {
            this.hasRegisteredView = true;
            if (this.currentVideoUuid) {
                this.api.postView(this.currentVideoUuid).catch(e => {
                    console.error("[VideoPlayer:View] Error al registrar la visita para el historial:", e);
                });
            }
        }
    }

    // --- TRACKING DE RETENCIÓN DE VIDEO (RECOLECTOR) ---
    trackRetention() {
        if (!this.video.duration || this.video.paused) return;

        // Calculamos en qué segmento del 1% del video se encuentra (0-99)
        const chunkIndex = Math.floor((this.video.currentTime / this.video.duration) * 100);

        if (chunkIndex >= 0 && chunkIndex < 100 && chunkIndex !== this.lastChunkIndex) {
            this.lastChunkIndex = chunkIndex;
            
            if (!this.chunkViews[chunkIndex]) {
                this.chunkViews[chunkIndex] = 0;
            }
            
            // Límite Anti-Spam (Máximo 5 conteos por "chunk" en cada envío)
            if (this.chunkViews[chunkIndex] < 5) {
                this.chunkViews[chunkIndex]++;
            }
        }
    }

    startRetentionBatcher() {
        if (this.retentionBatchInterval) clearInterval(this.retentionBatchInterval);
        
        // Enviar lote cada 15 segundos
        this.retentionBatchInterval = setInterval(() => {
            this.sendRetentionData();
        }, 15000);
    }

    sendRetentionData() {
        if (!this.dbVideoId || Object.keys(this.chunkViews).length === 0) return;
        
        // Hacemos una copia profunda y vaciamos el caché local
        const dataToSend = { ...this.chunkViews };
        this.chunkViews = {};
        
        this.api.sendRetentionBatch(this.dbVideoId, dataToSend).catch(e => {
            console.error("[VideoPlayer:Heatmap] Error al enviar lote de retención:", e);
        });
    }

    // --- RENDERIZADO VISUAL DEL HEATMAP ---
    renderHeatmap(data) {
        // Guardamos los datos localmente para poder cruzarlos en el Hover (Scrubbing)
        this.heatmapData = data;
        this.heatmapMax = Math.max(...(data || []), 1);

        if (!this.progressArea || !Array.isArray(data) || data.length === 0) return;
        
        let canvas = this.progressArea.querySelector('.heatmap-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'heatmap-canvas';
            
            // Estilos incrustados para posicionamiento preciso sobre la barra
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
            
            // Interacciones Hover como en YouTube
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
        
        // Esperamos un instante para asegurarnos de que el DOM tiene dimensiones
        setTimeout(() => {
            canvas.width = canvas.offsetWidth || 1000;
            canvas.height = canvas.offsetHeight || 40;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculamos el valor máximo para escalar la gráfica
            const maxVal = this.heatmapMax;
            
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            
            const step = canvas.width / (data.length - 1);
            
            // Dibujamos la curva de montañas
            for (let i = 0; i < data.length; i++) {
                const x = i * step;
                // Ajustamos la altura (0.9 para dejar un pequeño margen superior)
                const h = (data[i] / maxVal) * (canvas.height * 0.9);
                const y = canvas.height - h;
                ctx.lineTo(x, y);
            }
            
            ctx.lineTo(canvas.width, canvas.height);
            ctx.closePath();
            
            // Color semi-transparente para la gráfica
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; 
            ctx.fill();
        }, 100);
    }

    // --- CONTROLES DE VELOCIDAD ---
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

    // --- DETECCIÓN DE TEMA (CLARO/OSCURO) ---
    isLightModeActive() {
        const html = document.documentElement;
        const themeAttr = html.getAttribute('data-theme');
        const isDarkClass = html.classList.contains('dark-theme');
        const isLightClass = html.classList.contains('light-theme');
        
        if (themeAttr === 'light' || isLightClass) return true;
        if (themeAttr === 'dark' || isDarkClass) return false;
        
        // Fallback a la preferencia del sistema
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    handleThemeChange() {
        const isLight = this.isLightModeActive();
        const lightingMenu = document.getElementById('setting-menu-lighting');
        const status = document.getElementById('lighting-status');
        
        if (isLight) {
            // Forzar apagado interno
            this.ambientModeEnabled = false;
            this.stopAmbientLoop();
            if (this.ambientCanvas) {
                this.ambientCanvas.style.opacity = '0';
            }
            
            // Actualizar la Interfaz de Usuario para reflejar el bloqueo
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
            // Restaurar visualmente si regresa a modo oscuro
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

    // --- ILUMINACIÓN CINEMATOGRÁFICA (AMBIENT MODE) ---
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

        // Evaluar estado actual al iniciar
        this.handleThemeChange();

        // 1. Observer para atributos del DOM (cuando cambia el toggle de la web)
        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class') {
                    this.handleThemeChange();
                }
            });
        });
        this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

        // 2. Listener para cambios de tema en el Sistema Operativo (si está en automático)
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
                
                // BLOQUEO TOTAL: Si está en modo claro y trata de encenderlo, abortar.
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

        // Enlazar al ciclo de vida del video
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

    // --- LÓGICA DE SELECCIÓN DE CALIDAD HLS ---
    populateQualityMenu(levels) {
        if (!this.qualityMenuContent) return;
        this.qualityMenuContent.innerHTML = '';
        
        const autoItem = document.createElement('div');
        autoItem.className = 'component-menu__item is-selected';
        autoItem.dataset.level = -1; 
        autoItem.innerHTML = `<span class="material-symbols-rounded component-menu__check">check</span><span>Automática</span>`;
        autoItem.addEventListener('click', (e) => this.setQuality(e, -1));
        this.qualityMenuContent.appendChild(autoItem);

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
        
        // --- PREPARAMOS EL HEATMAP TRACKER E HISTORIAL ---
        this.dbVideoId = dbVideoId;
        this.currentVideoUuid = sourceIdentifier; // <-- ASEGURAMOS EL UUID
        this.hasRegisteredView = false;           // <-- RESETEAMOS EL FLAG DE VISTA
        this.chunkViews = {};
        this.lastChunkIndex = -1;
        this.heatmapData = [];
        this.heatmapMax = 0;
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
        // Enviar el último lote pendiente antes de destruir
        this.sendRetentionData();
        if (this.retentionBatchInterval) clearInterval(this.retentionBatchInterval);
        
        this.destroyHls();
        this.stopAmbientLoop(); 
        
        // Limpiar observers de tema
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
        
        // Sincronizar UI del slider si el cambio vino de afuera (ej: botón mute)
        if (document.activeElement !== this.volumeSlider) {
            const val = this.video.muted ? 0 : this.video.volume;
            this.volumeSlider.value = val;
            this.volumeSlider.style.setProperty('--volume-fill', `${val * 100}%`);
        } else {
            // Asegurar que visualmente el color siempre coincida con el value
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

        // -------------------------------------------------------------
        // LÓGICA DE DETECCIÓN: "Momento con más reproducciones"
        // -------------------------------------------------------------
        let isPeakMoment = false;
        
        // Verificamos si hay datos suficientes y si el máximo tiene cierta relevancia (ej: > 1)
        if (this.heatmapData && this.heatmapData.length > 0 && this.heatmapMax > 1) {
            // Mapeamos la posición `pos` (0 a 1) al índice del arreglo de datos
            const index = Math.min(this.heatmapData.length - 1, Math.floor(pos * this.heatmapData.length));
            const currentReten = this.heatmapData[index];
            
            // Si el momento alcanza o supera el 85% del pico máximo, lo consideramos un hito
            if (currentReten >= (this.heatmapMax * 0.85)) {
                isPeakMoment = true;
            }
        }

        // Aplicamos el texto y la clase CSS según el caso
        if (isPeakMoment) {
            this.previewTime.textContent = `${this.formatTime(timeAtCursor)} • Momento con más reproducciones`;
            this.previewTime.classList.add('is-peak-moment');
        } else {
            this.previewTime.textContent = this.formatTime(timeAtCursor);
            this.previewTime.classList.remove('is-peak-moment');
        }
        // -------------------------------------------------------------

        if (this.vttData.length > 0 && this.spriteSheetUrl) {
            const cue = this.vttData.find(c => timeAtCursor >= c.start && timeAtCursor <= c.end) || this.vttData[0];
            
            if (this.previewSprite) {
                this.previewSprite.style.backgroundImage = `url(${this.spriteSheetUrl})`;
                this.previewSprite.style.backgroundPosition = `-${cue.x}px -${cue.y}px`;
                this.previewSprite.style.width = `${cue.w}px`;
                this.previewSprite.style.height = `${cue.h}px`;
            }

            if (!isHoverOnly && this.previewOverlayImg && this.isDragging) {
                if (this.previewOverlayImg.src !== this.spriteSheetUrl) {
                    this.previewOverlayImg.src = this.spriteSheetUrl;
                }
                
                const S_x = this.container.offsetWidth / cue.w;
                const S_y = this.container.offsetHeight / cue.h;
                const scale = Math.min(S_x, S_y); 
                
                const scaledW = cue.w * scale;
                const scaledH = cue.h * scale;
                const offsetX = (this.container.offsetWidth - scaledW) / 2;
                const offsetY = (this.container.offsetHeight - scaledH) / 2;

                this.previewOverlayImg.style.transformOrigin = '0 0';
                this.previewOverlayImg.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale}) translate(-${cue.x}px, -${cue.y}px)`;
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