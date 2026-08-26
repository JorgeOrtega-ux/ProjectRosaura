import { showMessage, setButtonLoading, restoreButton, closeDropdown } from '../../../../core/utils/uiUtils.js';
import { AnimationExporter } from '../../../../core/utils/AnimationExporter.js';

export const InteractionLayers = {
    layers: [],
    activeLayerId: null,
    frames: [],
    activeFrameId: null,
    isPlayingAnimation: false,
    animationFps: 12,
    showOnionSkin: false,
    carouselMode: 'layers',
    isLayersPanelOpen: false,
    isLayersCarouselOpen: false,

    toggleUnifiedSidebar(forceState = null) {
        if (!this.isOfflineMode) return;
        const sidebar = document.querySelector('[data-ref="canvas-right-unified-sidebar"]');
        const btnToggleLayers = document.querySelector('[data-ref="btn-toggle-layers"]');
        const btnTopToggle = document.querySelector('[data-ref="btn-top-sidebar-toggle"]');
        if (!sidebar) return;

        const shouldOpen = forceState !== null ? forceState : sidebar.classList.contains('disabled');
        if (shouldOpen) {
            sidebar.classList.remove('disabled');
            if (btnToggleLayers) btnToggleLayers.classList.add('active');
            if (btnTopToggle) btnTopToggle.classList.add('active');
            this.isUnifiedSidebarOpen = true;
            this.switchUnifiedSidebarTab(this.activeSidebarTab || 'layers');
        } else {
            sidebar.classList.add('disabled');
            if (btnToggleLayers) btnToggleLayers.classList.remove('active');
            if (btnTopToggle) btnTopToggle.classList.remove('active');
            this.isUnifiedSidebarOpen = false;
        }
    },

    toggleLayersPanel() {
        this.openSidebarTab('layers');
    },

    openSidebarTab(tabName = 'tool') {
        const sidebar = document.querySelector('[data-ref="canvas-right-unified-sidebar"]');
        if (!sidebar) return;

        if (!this.isUnifiedSidebarOpen || sidebar.classList.contains('disabled')) {
            sidebar.classList.remove('disabled');
            this.isUnifiedSidebarOpen = true;
            this.switchUnifiedSidebarTab(tabName);
        } else if (this.activeSidebarTab === tabName) {
            sidebar.classList.add('disabled');
            this.isUnifiedSidebarOpen = false;
        } else {
            this.switchUnifiedSidebarTab(tabName);
        }
    },

    switchUnifiedSidebarTab(tabName = 'layers') {
        this.activeSidebarTab = tabName;
        const tabsContainer = document.querySelector('[data-ref="sidebar-tabs"]');
        if (tabsContainer) {
            tabsContainer.setAttribute('data-active-tab', tabName);
        }

        document.querySelectorAll('.canvas-sidebar-tab-btn[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        document.querySelectorAll('.canvas-sidebar-tab-content').forEach(content => {
            const isTarget = content.getAttribute('data-sidebar-tab') === tabName;
            content.classList.toggle('active', isTarget);
            content.classList.toggle('disabled', !isTarget);
        });

        if (tabName === 'tool') {
            if (typeof this.updateSidebarToolSettingsUI === 'function') {
                this.updateSidebarToolSettingsUI();
            }
        } else if (tabName === 'layers') {
            if (this.renderWorker) {
                this.renderWorker.postMessage({ type: 'GET_LAYERS_STATE' });
            }
        } else if (tabName === 'color') {
            if (typeof this.renderCustomPickedColors === 'function') this.renderCustomPickedColors();
            if (typeof this.updateDualColorSwatchesUI === 'function') this.updateDualColorSwatchesUI();
            if (typeof this.renderShadingRamps === 'function') this.renderShadingRamps(this.currentColor);
        } else if (tabName === 'minimap') {
            this.updateMinimap();
        }
    },

    setLayerOpacity(val) {
        const num = Math.max(0, Math.min(100, parseInt(val, 10) || 100));
        const valEl = document.querySelector('[data-ref="layer-opacity-val"]');
        if (valEl) valEl.textContent = `${num}%`;

        const activeLayer = this.layers ? this.layers.find(l => l.id === this.activeLayerId) : null;
        if (activeLayer) {
            activeLayer.opacity = num / 100;
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_LAYER_OPACITY',
                payload: { layerId: this.activeLayerId, opacity: num / 100 }
            });
        }
        this.requestRender();
    },

    setLayerBlendMode(mode = 'normal') {
        const activeLayer = this.layers ? this.layers.find(l => l.id === this.activeLayerId) : null;
        if (activeLayer) {
            activeLayer.blendMode = mode;
        }

        const blendNames = {
            normal: 'Normal',
            multiply: 'Multiplicar',
            screen: 'Pantalla',
            overlay: 'Superponer',
            darken: 'Oscurecer',
            lighten: 'Aclarar',
            'color-dodge': 'Sobreexponer'
        };

        const textEl = document.querySelector('[data-ref="layer-blend-text"]');
        if (textEl) {
            textEl.textContent = blendNames[mode] || mode;
        }

        document.querySelectorAll('[data-action="selectLayerBlendMode"]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-blend') === mode);
        });

        if (window.appInstance && window.appInstance.moduleManager) {
            window.appInstance.moduleManager.closeModule('moduleLayerBlendModes');
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_LAYER_BLEND_MODE',
                payload: { layerId: this.activeLayerId, blendMode: mode }
            });
        }
        this.requestRender();
    },

    toggleAlphaLock() {
        const activeLayer = this.layers ? this.layers.find(l => l.id === this.activeLayerId) : null;
        if (!activeLayer) return;

        activeLayer.alphaLocked = !activeLayer.alphaLocked;
        const btnLock = document.querySelector('[data-ref="btn-alpha-lock"]');
        if (btnLock) {
            btnLock.classList.toggle('active', !!activeLayer.alphaLocked);
            btnLock.innerHTML = `<span class="material-symbols-rounded">${activeLayer.alphaLocked ? 'lock' : 'lock_open'}</span>`;
        }

        if (this.renderWorker) {
            this.renderWorker.postMessage({
                type: 'SET_LAYER_ALPHA_LOCK',
                payload: { layerId: this.activeLayerId, alphaLocked: !!activeLayer.alphaLocked }
            });
        }

        const msg = activeLayer.alphaLocked ? 'Bloqueo Alfa activado' : 'Bloqueo Alfa desactivado';
        if (typeof showMessage === 'function') showMessage(msg, 'info');
    },

    updateMinimap() {
        const minimapCanvas = document.querySelector('[data-ref="minimap-canvas"]');
        const viewportBox = document.querySelector('[data-ref="minimap-viewport-box"]');
        const resText = document.querySelector('[data-ref="minimap-res-text"]');
        if (!minimapCanvas) return;

        if (resText) {
            resText.textContent = `${this.boardWidth || 64}x${this.boardHeight || 64} px`;
        }

        const mCtx = minimapCanvas.getContext('2d');
        if (mCtx && this.canvas) {
            mCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
            mCtx.imageSmoothingEnabled = false;
            mCtx.drawImage(this.canvas, 0, 0, minimapCanvas.width, minimapCanvas.height);
        }

        if (viewportBox && this.transform && this.canvas) {
            const scale = this.transform.scale || 1;
            const viewW = (this.canvas.width / (this.boardWidth * scale)) * 100;
            const viewH = (this.canvas.height / (this.boardHeight * scale)) * 100;
            const leftPct = ((-this.transform.x) / (this.boardWidth * scale)) * 100;
            const topPct = ((-this.transform.y) / (this.boardHeight * scale)) * 100;

            viewportBox.style.width = `${Math.min(100, Math.max(10, viewW))}%`;
            viewportBox.style.height = `${Math.min(100, Math.max(10, viewH))}%`;
            viewportBox.style.left = `${Math.max(0, Math.min(100 - parseFloat(viewportBox.style.width), leftPct))}%`;
            viewportBox.style.top = `${Math.max(0, Math.min(100 - parseFloat(viewportBox.style.height), topPct))}%`;
        }
    },

    handleReferenceImageUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.referenceImage = img;
                const previewImg = document.querySelector('[data-ref="reference-preview-img"]');
                const previewBox = document.querySelector('[data-ref="reference-preview-box"]');
                const emptyState = document.querySelector('[data-ref="reference-empty-state"]');
                const controls = document.querySelector('[data-ref="reference-controls"]');

                if (previewImg) previewImg.src = e.target.result;
                if (previewBox) previewBox.classList.remove('disabled');
                if (emptyState) emptyState.classList.add('disabled');
                if (controls) controls.classList.remove('disabled');

                if (typeof showMessage === 'function') showMessage('Imagen de referencia cargada', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    setReferenceOpacity(val) {
        const num = Math.max(0, Math.min(100, parseInt(val, 10) || 50));
        this.referenceOpacity = num / 100;
        const previewImg = document.querySelector('[data-ref="reference-preview-img"]');
        const valEl = document.querySelector('[data-ref="reference-opacity-val"]');
        if (previewImg) previewImg.style.opacity = this.referenceOpacity;
        if (valEl) valEl.textContent = `${num}%`;
    },

    clearReferenceImage() {
        this.referenceImage = null;
        const previewBox = document.querySelector('[data-ref="reference-preview-box"]');
        const emptyState = document.querySelector('[data-ref="reference-empty-state"]');
        const controls = document.querySelector('[data-ref="reference-controls"]');
        const fileInput = document.querySelector('[data-ref="reference-file-input"]');

        if (previewBox) previewBox.classList.add('disabled');
        if (emptyState) emptyState.classList.remove('disabled');
        if (controls) controls.classList.add('disabled');
        if (fileInput) fileInput.value = '';

        if (typeof showMessage === 'function') showMessage('Imagen de referencia eliminada', 'info');
    },

    toggleLayersCarousel() {
        if (!this.isOfflineMode) return;
        const carousel = document.querySelector('[data-ref="layers-bottom-carousel"]');
        const btn = document.querySelector('[data-ref="btn-footer-toggle-layers"]');
        if (!carousel) return;

        const isCurrentlyOpen = !carousel.classList.contains('disabled');
        if (isCurrentlyOpen) {
            carousel.classList.add('disabled');
            if (btn) btn.classList.remove('active');
            this.isLayersCarouselOpen = false;
        } else {
            carousel.classList.remove('disabled');
            if (btn) btn.classList.add('active');
            this.isLayersCarouselOpen = true;
            this.renderBottomCarousel();
            if (this.renderWorker) {
                this.renderWorker.postMessage({ type: 'GET_ALL_LAYER_PREVIEWS' });
                this.renderWorker.postMessage({ type: 'GET_FRAMES_STATE' });
            }
        }
        if (typeof this.handleResize === 'function') {
            this.handleResize();
        }
    },

    setCarouselMode(mode = 'layers') {
        this.carouselMode = mode;
        const footerTabs = document.querySelector('[data-ref="footer-carousel-tabs"]');
        if (footerTabs) {
            footerTabs.setAttribute('data-mode', mode);
        }
        const tabLayers = document.querySelector('[data-action="setCarouselModeLayers"]');
        const tabTimeline = document.querySelector('[data-action="setCarouselModeTimeline"]');
        if (tabLayers) tabLayers.classList.toggle('active', mode === 'layers');
        if (tabTimeline) tabTimeline.classList.toggle('active', mode === 'timeline');

        const layersControls = document.querySelector('[data-ref="footer-layers-controls"]');
        const animControls = document.querySelector('[data-ref="footer-anim-controls"]');
        if (layersControls) layersControls.classList.toggle('disabled', mode !== 'layers');
        if (animControls) animControls.classList.toggle('disabled', mode !== 'timeline');

        // Automatically open the bottom carousel when clicking tabs so cards are immediately visible
        const carousel = document.querySelector('[data-ref="layers-bottom-carousel"]');
        const btnToggleLayers = document.querySelector('[data-ref="btn-footer-toggle-layers"]');
        if (carousel && carousel.classList.contains('disabled')) {
            carousel.classList.remove('disabled');
            this.isLayersCarouselOpen = true;
            if (btnToggleLayers) btnToggleLayers.classList.add('active');
        }

        this.renderBottomCarousel();
        if (this.renderWorker) {
            if (mode === 'timeline') {
                this.renderWorker.postMessage({ type: 'GET_FRAMES_STATE' });
            } else {
                this.renderWorker.postMessage({ type: 'GET_ALL_LAYER_PREVIEWS' });
            }
        }
        if (typeof this.handleResize === 'function') {
            this.handleResize();
        }
    },

    toggleCarouselMode() {
        const nextMode = this.carouselMode === 'layers' ? 'timeline' : 'layers';
        this.setCarouselMode(nextMode);
    },

    renderBottomCarousel() {
        if (this.carouselMode === 'timeline') {
            this.renderFramesCarouselUI();
        } else {
            this.renderLayersCarouselUI();
        }
    },

    handleLayersStateChanged(payload) {
        if (!payload) return;
        this.layers = payload.layers || [];
        this.activeLayerId = payload.activeLayerId || null;
        this.renderLayersUI();
        this.renderBottomCarousel();

        const activeLayer = this.layers.find(l => l.id === this.activeLayerId);
        const nameEl = document.querySelector('[data-ref="layer-active-name"]');
        const dimEl = document.querySelector('[data-ref="layer-active-dimensions"]');
        if (nameEl && activeLayer) {
            nameEl.textContent = activeLayer.name;
        }
        if (dimEl && payload.boardWidth && payload.boardHeight) {
            dimEl.textContent = `${payload.boardWidth}x${payload.boardHeight} px`;
        }
    },

    handleFramesStateChanged(payload) {
        if (!payload) return;
        this.frames = payload.frames || [];
        this.activeFrameId = payload.activeFrameId || null;
        this.isPlayingAnimation = !!payload.isPlayingAnimation;
        this.animationFps = payload.animationFps || 12;
        this.showOnionSkin = !!payload.showOnionSkin;

        // Sync UI Buttons
        const playBtn = document.querySelector('[data-ref="btn-anim-play"]');
        if (playBtn) {
            playBtn.classList.toggle('active', this.isPlayingAnimation);
            playBtn.innerHTML = `<span class="material-symbols-rounded">${this.isPlayingAnimation ? 'pause' : 'play_arrow'}</span>`;
        }

        const fpsLabel = document.querySelector('[data-ref="anim-fps-label"]');
        if (fpsLabel) {
            fpsLabel.textContent = `${this.animationFps} FPS`;
        }

        const onionBtn = document.querySelector('[data-ref="btn-anim-onion"]');
        if (onionBtn) {
            onionBtn.classList.toggle('active', this.showOnionSkin);
        }

        const framesBadge = document.querySelector('[data-ref="footer-frames-count"]');
        if (framesBadge && this.frames.length > 0) {
            const curIdx = this.frames.findIndex(f => f.id === this.activeFrameId);
            const num = curIdx >= 0 ? curIdx + 1 : 1;
            framesBadge.textContent = `${num}/${this.frames.length}`;
        }

        this.renderBottomCarousel();
    },

    handleLayerPreviewUpdated(payload) {
        if (!payload) return;
        const previewCanvas = document.querySelector('[data-ref="layer-preview-canvas"]');
        if (previewCanvas) {
            const ctx = previewCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                if (payload.imageBitmap) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(payload.imageBitmap, 0, 0, previewCanvas.width, previewCanvas.height);
                }
            }
        }

        if (payload.imageBitmap) {
            const cardCanvases = document.querySelectorAll(`canvas[data-layer-preview-id="${payload.layerId}"]`);
            cardCanvases.forEach(c => {
                const cCtx = c.getContext('2d');
                if (cCtx) {
                    cCtx.clearRect(0, 0, c.width, c.height);
                    cCtx.imageSmoothingEnabled = false;
                    cCtx.drawImage(payload.imageBitmap, 0, 0, c.width, c.height);
                }
            });
        }

        const nameEl = document.querySelector('[data-ref="layer-active-name"]');
        if (nameEl && payload.layerName) {
            nameEl.textContent = payload.layerName;
        }
        const dimEl = document.querySelector('[data-ref="layer-active-dimensions"]');
        if (dimEl && payload.boardWidth && payload.boardHeight) {
            dimEl.textContent = `${payload.boardWidth}x${payload.boardHeight} px`;
        }
    },

    handleFrameCardPreviewUpdated(payload) {
        if (!payload || !payload.imageBitmap) return;
        const cardCanvases = document.querySelectorAll(`canvas[data-frame-preview-id="${payload.frameId}"]`);
        cardCanvases.forEach(c => {
            const cCtx = c.getContext('2d');
            if (cCtx) {
                cCtx.clearRect(0, 0, c.width, c.height);
                cCtx.imageSmoothingEnabled = false;
                cCtx.drawImage(payload.imageBitmap, 0, 0, c.width, c.height);
            }
        });
    },

    handleAnimationFrameTick(payload) {
        if (!payload) return;
        const cards = document.querySelectorAll('.canvas-design-frame-card');
        cards.forEach(card => {
            const isCurrent = card.getAttribute('data-frame-id') === payload.frameId;
            card.classList.toggle('playing-tick', isCurrent);
        });
    },

    renderFramesCarouselUI() {
        const track = document.querySelector('[data-ref="layers-carousel-track"]');
        if (!track) return;

        track.innerHTML = '';
        if (!this.frames || this.frames.length === 0) {
            this.frames = [{ id: 'frame-1', durationMs: 100 }];
            this.activeFrameId = 'frame-1';
        }

        this.frames.forEach((frame, idx) => {
            const isActive = frame.id === this.activeFrameId;

            const card = document.createElement('div');
            card.className = `canvas-design-layer-card canvas-design-frame-card ${isActive ? 'active' : ''}`;
            card.setAttribute('data-frame-id', frame.id);
            card.setAttribute('data-action', 'selectFrame');
            card.setAttribute('data-tooltip', `Fotograma ${idx + 1}`);
            card.setAttribute('data-position', 'top');
            card.draggable = true;

            // Drag & Drop events for horizontal frame reordering
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', frame.id);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('is-dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
                track.querySelectorAll('.canvas-design-frame-card').forEach(el => el.classList.remove('drag-over-left', 'drag-over-right'));
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = card.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                if (e.clientX < midX) {
                    card.classList.add('drag-over-left');
                    card.classList.remove('drag-over-right');
                } else {
                    card.classList.add('drag-over-right');
                    card.classList.remove('drag-over-left');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over-left', 'drag-over-right');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over-left', 'drag-over-right');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (!draggedId || draggedId === frame.id) return;

                const fromIdx = this.frames.findIndex(f => f.id === draggedId);
                let toIdx = this.frames.findIndex(f => f.id === frame.id);
                if (fromIdx < 0 || toIdx < 0) return;

                const rect = card.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                const isRight = e.clientX >= midX;

                const newFrames = [...this.frames];
                const [moved] = newFrames.splice(fromIdx, 1);

                let targetInsertIdx = this.frames.findIndex(f => f.id === frame.id);
                if (fromIdx < targetInsertIdx) targetInsertIdx--;
                if (isRight) targetInsertIdx++;

                targetInsertIdx = Math.max(0, Math.min(newFrames.length, targetInsertIdx));
                newFrames.splice(targetInsertIdx, 0, moved);

                this.frames = newFrames;
                this.renderFramesCarouselUI();

                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'REORDER_FRAMES',
                        payload: { order: this.frames.map(f => f.id) }
                    });
                }
            });

            // Thumbnail canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'canvas-design-layer-card__canvas';
            canvas.setAttribute('data-frame-preview-id', frame.id);
            canvas.width = 96;
            canvas.height = 96;
            card.appendChild(canvas);

            // Frame badge
            const badge = document.createElement('div');
            badge.className = 'canvas-design-layer-card__badge';
            badge.textContent = `Frame ${idx + 1}`;
            card.appendChild(badge);

            // Frame action buttons (Duplicate & Delete)
            const actions = document.createElement('div');
            actions.className = 'canvas-design-layer-card__actions';

            // Duplicate frame button
            const dupBtn = document.createElement('button');
            dupBtn.type = 'button';
            dupBtn.className = 'canvas-design-layer-card__action-btn';
            dupBtn.setAttribute('data-action', 'duplicateFrame');
            dupBtn.setAttribute('data-frame-id', frame.id);
            dupBtn.setAttribute('data-tooltip', 'Duplicar fotograma');
            dupBtn.setAttribute('data-position', 'top');
            dupBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span>';
            actions.appendChild(dupBtn);

            // Delete frame button
            if (this.frames.length > 1) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'canvas-design-layer-card__action-btn';
                delBtn.setAttribute('data-action', 'deleteFrame');
                delBtn.setAttribute('data-frame-id', frame.id);
                delBtn.setAttribute('data-tooltip', 'Eliminar fotograma');
                delBtn.setAttribute('data-position', 'top');
                delBtn.innerHTML = '<span class="material-symbols-rounded">delete</span>';
                actions.appendChild(delBtn);
            }

            card.appendChild(actions);
            track.appendChild(card);
        });

        // Add Frame Card button at the end
        const addCard = document.createElement('div');
        addCard.className = 'canvas-design-layer-card--add';
        addCard.setAttribute('data-action', 'addFrame');
        addCard.setAttribute('data-tooltip', 'Nuevo fotograma');
        addCard.setAttribute('data-position', 'top');
        addCard.innerHTML = '<span class="material-symbols-rounded">add</span>';
        track.appendChild(addCard);
    },

    renderLayersCarouselUI() {
        const track = document.querySelector('[data-ref="layers-carousel-track"]');
        if (!track) return;

        track.innerHTML = '';
        if (!this.layers || this.layers.length === 0) return;

        this.layers.forEach((layer, idx) => {
            const isActive = layer.id === this.activeLayerId;
            const isLocked = !!layer.locked;
            const isVisible = layer.visible !== false;

            const card = document.createElement('div');
            card.className = `canvas-design-layer-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${!isVisible ? 'hidden-layer' : ''}`;
            card.setAttribute('data-layer-id', layer.id);
            card.setAttribute('data-action', 'selectLayer');
            card.setAttribute('data-tooltip', `${layer.name || 'Capa ' + (idx + 1)}${isLocked ? ' (Bloqueada)' : ''}${!isVisible ? ' (Oculta)' : ''}`);
            card.setAttribute('data-position', 'top');
            card.draggable = true;

            // Drag & Drop events for horizontal reordering
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', layer.id);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('is-dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
                track.querySelectorAll('.canvas-design-layer-card').forEach(el => el.classList.remove('drag-over-left', 'drag-over-right'));
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = card.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                if (e.clientX < midX) {
                    card.classList.add('drag-over-left');
                    card.classList.remove('drag-over-right');
                } else {
                    card.classList.add('drag-over-right');
                    card.classList.remove('drag-over-left');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over-left', 'drag-over-right');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over-left', 'drag-over-right');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (!draggedId || draggedId === layer.id) return;

                const fromIdx = this.layers.findIndex(l => l.id === draggedId);
                let toIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < 0 || toIdx < 0) return;

                const rect = card.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                const isRight = e.clientX >= midX;

                const newLayers = [...this.layers];
                const [moved] = newLayers.splice(fromIdx, 1);

                let targetInsertIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < targetInsertIdx) targetInsertIdx--;
                if (isRight) targetInsertIdx++;

                targetInsertIdx = Math.max(0, Math.min(newLayers.length, targetInsertIdx));
                newLayers.splice(targetInsertIdx, 0, moved);

                this.layers = newLayers;
                this.renderLayersUI();
                this.renderLayersCarouselUI();

                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'REORDER_LAYERS',
                        payload: { order: this.layers.map(l => l.id) }
                    });
                }
            });

            // Thumbnail canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'canvas-design-layer-card__canvas';
            canvas.setAttribute('data-layer-preview-id', layer.id);
            canvas.width = 96;
            canvas.height = 96;
            card.appendChild(canvas);

            // Layer name badge
            const badge = document.createElement('div');
            badge.className = 'canvas-design-layer-card__badge';
            badge.textContent = layer.name || `Capa ${idx + 1}`;
            card.appendChild(badge);

            // Action buttons (Lock & Visibility)
            const actions = document.createElement('div');
            actions.className = 'canvas-design-layer-card__actions';

            // Lock button
            const lockBtn = document.createElement('button');
            lockBtn.type = 'button';
            lockBtn.className = `canvas-design-layer-card__action-btn canvas-design-layer-card__action-btn--lock ${isLocked ? 'active' : ''}`;
            lockBtn.setAttribute('data-action', 'toggleLayerLock');
            lockBtn.setAttribute('data-layer-id', layer.id);
            lockBtn.setAttribute('data-tooltip', isLocked ? (window.__('tooltip_layer_unlock') || 'Desbloquear') : (window.__('tooltip_layer_lock') || 'Bloquear'));
            lockBtn.setAttribute('data-position', 'top');
            lockBtn.innerHTML = `<span class="material-symbols-rounded">${isLocked ? 'lock' : 'lock_open'}</span>`;
            actions.appendChild(lockBtn);

            // Visibility / Eye button
            const visBtn = document.createElement('button');
            visBtn.type = 'button';
            visBtn.className = `canvas-design-layer-card__action-btn canvas-design-layer-card__action-btn--vis ${!isVisible ? 'hidden-btn' : ''}`;
            visBtn.setAttribute('data-action', 'toggleLayerVisibility');
            visBtn.setAttribute('data-layer-id', layer.id);
            visBtn.setAttribute('data-tooltip', isVisible ? (window.__('tooltip_layer_hide') || 'Ocultar capa (Alt+clic para aislar)') : (window.__('tooltip_layer_show') || 'Mostrar capa'));
            visBtn.setAttribute('data-position', 'top');
            visBtn.innerHTML = `<span class="material-symbols-rounded">${isVisible ? 'visibility' : 'visibility_off'}</span>`;
            actions.appendChild(visBtn);

            card.appendChild(actions);
            track.appendChild(card);
        });

        // Add Layer Card button at the end
        const addCard = document.createElement('div');
        addCard.className = 'canvas-design-layer-card--add';
        addCard.setAttribute('data-action', 'addLayer');
        addCard.setAttribute('data-tooltip', window.__('tooltip_add_layer') || 'Nueva capa');
        addCard.setAttribute('data-position', 'top');
        addCard.innerHTML = '<span class="material-symbols-rounded">add</span>';
        track.appendChild(addCard);
    },

    renderLayersUI() {
        const container = document.querySelector('[data-ref="layers-list-scroll"]');
        const footerCountEl = document.querySelector('[data-ref="footer-layers-count"]');
        if (footerCountEl && this.layers) {
            const total = this.layers.length || 1;
            const activeIndex = this.layers.findIndex(l => l.id === this.activeLayerId);
            const currentNum = activeIndex >= 0 ? (total - activeIndex) : 1;
            footerCountEl.textContent = `${currentNum}/${total}`;
        }

        if (!container) return;

        container.innerHTML = '';

        if (!this.layers || this.layers.length === 0) return;

        const activeLayer = this.layers.find(l => l.id === this.activeLayerId);
        if (activeLayer) {
            const opVal = Math.round((activeLayer.opacity !== undefined ? activeLayer.opacity : 1) * 100);
            const slider = document.querySelector('[data-ref="layer-opacity-slider"]');
            const opValEl = document.querySelector('[data-ref="layer-opacity-val"]');
            if (slider) slider.value = opVal;
            if (opValEl) opValEl.textContent = `${opVal}%`;

            const blendNames = {
                normal: 'Normal',
                multiply: 'Multiplicar',
                screen: 'Pantalla',
                overlay: 'Superponer',
                darken: 'Oscurecer',
                lighten: 'Aclarar',
                'color-dodge': 'Sobreexponer'
            };
            const curBlend = activeLayer.blendMode || 'normal';
            const blendText = document.querySelector('[data-ref="layer-blend-text"]');
            if (blendText) blendText.textContent = blendNames[curBlend] || curBlend;
            document.querySelectorAll('[data-action="selectLayerBlendMode"]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-blend') === curBlend);
            });

            const btnLock = document.querySelector('[data-ref="btn-alpha-lock"]');
            if (btnLock) {
                btnLock.classList.toggle('active', !!activeLayer.alphaLocked);
                btnLock.innerHTML = `<span class="material-symbols-rounded">${activeLayer.alphaLocked ? 'lock' : 'lock_open'}</span>`;
            }
        }

        this.layers.forEach((layer) => {
            const isActive = layer.id === this.activeLayerId;
            const isLocked = !!layer.locked;
            const isVisible = layer.visible !== false;

            const item = document.createElement('div');
            item.className = `component-layer-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
            item.setAttribute('data-layer-id', layer.id);
            item.draggable = true;

            // Drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'component-layer-item__drag';
            dragHandle.innerHTML = '<span class="material-symbols-rounded">drag_indicator</span>';

            // Drag & drop events for reordering
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', layer.id);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('is-dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('is-dragging');
                container.querySelectorAll('.component-layer-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    item.classList.add('drag-over-top');
                    item.classList.remove('drag-over-bottom');
                } else {
                    item.classList.add('drag-over-bottom');
                    item.classList.remove('drag-over-top');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (!draggedId || draggedId === layer.id) return;

                const fromIdx = this.layers.findIndex(l => l.id === draggedId);
                let toIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < 0 || toIdx < 0) return;

                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isBelow = e.clientY >= midY;

                const newLayers = [...this.layers];
                const [moved] = newLayers.splice(fromIdx, 1);
                
                let targetInsertIdx = this.layers.findIndex(l => l.id === layer.id);
                if (fromIdx < targetInsertIdx) targetInsertIdx--;
                if (isBelow) targetInsertIdx++;
                
                targetInsertIdx = Math.max(0, Math.min(newLayers.length, targetInsertIdx));
                newLayers.splice(targetInsertIdx, 0, moved);

                this.layers = newLayers;
                this.renderLayersUI();

                if (this.renderWorker) {
                    this.renderWorker.postMessage({
                        type: 'REORDER_LAYERS',
                        payload: { order: this.layers.map(l => l.id) }
                    });
                }
            });

            // Visibility toggle
            const visLabel = document.createElement('label');
            visLabel.className = 'component-layer-item__visibility';
            visLabel.setAttribute('data-tooltip', isVisible ? window.__('tooltip_layer_visibility') : window.__('tooltip_layer_visibility'));
            visLabel.setAttribute('data-position', 'top');

            const visInput = document.createElement('input');
            visInput.type = 'checkbox';
            visInput.checked = isVisible;
            visInput.setAttribute('data-action', 'toggleLayerVisibility');
            visInput.setAttribute('data-layer-id', layer.id);

            const iconVis = document.createElement('span');
            iconVis.className = 'material-symbols-rounded icon-visible';
            iconVis.textContent = 'visibility';

            const iconHid = document.createElement('span');
            iconHid.className = 'material-symbols-rounded icon-hidden';
            iconHid.textContent = 'visibility_off';

            visLabel.appendChild(visInput);
            visLabel.appendChild(iconVis);
            visLabel.appendChild(iconHid);

            // Layer content / Title
            const contentDiv = document.createElement('div');
            contentDiv.className = 'component-layer-item__content';
            contentDiv.setAttribute('data-action', 'selectLayer');
            contentDiv.setAttribute('data-layer-id', layer.id);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'component-layer-item__title';
            titleSpan.setAttribute('data-ref', 'layer-title');
            titleSpan.setAttribute('data-layer-id', layer.id);
            titleSpan.textContent = layer.name;
            titleSpan.title = layer.name;

            // Double click to rename
            titleSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                titleSpan.setAttribute('contenteditable', 'true');
                titleSpan.focus();
                const range = document.createRange();
                range.selectNodeContents(titleSpan);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });

            const finishRename = () => {
                if (titleSpan.getAttribute('contenteditable') === 'true') {
                    titleSpan.removeAttribute('contenteditable');
                    const newName = titleSpan.textContent.trim();
                    if (newName && newName !== layer.name) {
                        this.renameLayer(layer.id, newName);
                    } else {
                        titleSpan.textContent = layer.name;
                    }
                }
            };

            titleSpan.addEventListener('blur', finishRename);
            titleSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleSpan.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    titleSpan.textContent = layer.name;
                    titleSpan.removeAttribute('contenteditable');
                    titleSpan.blur();
                }
            });

            contentDiv.appendChild(titleSpan);

            // Lock button
            const lockBtn = document.createElement('button');
            lockBtn.className = `component-button component-button--icon component-button--h24 ${isLocked ? 'active' : ''}`;
            lockBtn.setAttribute('data-action', 'toggleLayerLock');
            lockBtn.setAttribute('data-layer-id', layer.id);
            lockBtn.setAttribute('data-tooltip', window.__('tooltip_layer_lock'));
            lockBtn.setAttribute('data-position', 'top');
            lockBtn.innerHTML = `<span class="material-symbols-rounded">${isLocked ? 'lock' : 'lock_open'}</span>`;

            item.appendChild(dragHandle);
            item.appendChild(visLabel);
            item.appendChild(contentDiv);
            item.appendChild(lockBtn);

            container.appendChild(item);
        });
    },

    addLayer() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const count = (this.layers ? this.layers.length : 0) + 1;
        const defaultName = `${window.__('lbl_default_layer_name') || 'Capa'} ${count}`;
        this.renderWorker.postMessage({
            type: 'ADD_LAYER',
            payload: { name: defaultName }
        });
    },

    deleteLayer(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        if (this.layers && this.layers.length <= 1) {
            showMessage(window.__('msg_layer_cannot_delete_last') || 'No se puede eliminar la única capa.', 'warning');
            return;
        }
        this.renderWorker.postMessage({
            type: 'DELETE_LAYER',
            payload: { layerId: targetId }
        });
    },

    selectLayer(layerId) {
        if (!this.isOfflineMode || !this.renderWorker || !layerId) return;
        if (this.activeLayerId === layerId) return;
        this.activeLayerId = layerId;
        this.renderWorker.postMessage({
            type: 'SELECT_LAYER',
            payload: { layerId }
        });
    },

    toggleLayerVisibility(layerId, visible = undefined) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'TOGGLE_LAYER_VISIBILITY',
            payload: { layerId: targetId, visible }
        });
    },

    isolateLayer(layerId) {
        if (!this.isOfflineMode || !this.renderWorker || !layerId) return;
        this.renderWorker.postMessage({
            type: 'ISOLATE_LAYER',
            payload: { layerId }
        });
    },

    toggleLayerLock(layerId, locked = undefined) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'TOGGLE_LAYER_LOCK',
            payload: { layerId: targetId, locked }
        });
    },

    renameLayer(layerId, name) {
        if (!this.isOfflineMode || !this.renderWorker || !name) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'RENAME_LAYER',
            payload: { layerId: targetId, name: name.trim() }
        });
    },

    moveLayerUp(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MOVE_LAYER_UP',
            payload: { layerId: targetId }
        });
    },

    moveLayerDown(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MOVE_LAYER_DOWN',
            payload: { layerId: targetId }
        });
    },

    duplicateLayer(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'DUPLICATE_LAYER',
            payload: { layerId: targetId }
        });
    },

    mergeLayerUp(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MERGE_LAYER_UP',
            payload: { layerId: targetId }
        });
    },

    mergeLayerDown(layerId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        const targetId = layerId || this.activeLayerId;
        this.renderWorker.postMessage({
            type: 'MERGE_LAYER_DOWN',
            payload: { layerId: targetId }
        });
    },

    togglePlayAnimation() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        if (this.isPlayingAnimation) {
            this.renderWorker.postMessage({ type: 'STOP_ANIMATION' });
        } else {
            this.renderWorker.postMessage({ type: 'PLAY_ANIMATION' });
        }
    },

    setAnimationFps(fps = 12) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        this.renderWorker.postMessage({
            type: 'SET_FPS',
            payload: { fps }
        });
    },

    cycleAnimationFps() {
        const presets = [1, 4, 8, 12, 24];
        const curIdx = presets.indexOf(this.animationFps || 12);
        const nextFps = curIdx >= 0 ? presets[(curIdx + 1) % presets.length] : 12;
        this.setAnimationFps(nextFps);
    },

    toggleOnionSkin() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        this.renderWorker.postMessage({
            type: 'TOGGLE_ONION_SKIN',
            payload: { enabled: !this.showOnionSkin }
        });
    },

    addFrame() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        this.renderWorker.postMessage({ type: 'ADD_FRAME' });
    },

    duplicateFrame(frameId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        this.renderWorker.postMessage({
            type: 'DUPLICATE_FRAME',
            payload: { frameId: frameId || this.activeFrameId }
        });
    },

    deleteFrame(frameId = null) {
        if (!this.isOfflineMode || !this.renderWorker) return;
        this.renderWorker.postMessage({
            type: 'DELETE_FRAME',
            payload: { frameId: frameId || this.activeFrameId }
        });
    },

    selectFrame(frameId) {
        if (!this.isOfflineMode || !this.renderWorker || !frameId) return;
        if (this.activeFrameId === frameId) return;
        this.activeFrameId = frameId;
        this.renderWorker.postMessage({
            type: 'SELECT_FRAME',
            payload: { frameId }
        });
    },

    exportAnimState: {
        format: 'gif',
        scale: 8,
        fps: 12,
        transparent: true,
        includeJson: true,
        previewTimer: null,
        frameCanvases: []
    },

    async openExportAnimationModal() {
        if (!this.isOfflineMode) return;
        if (!window.modalSystem) return;

        // Clear any previous preview loop
        if (this.exportAnimState.previewTimer) {
            clearInterval(this.exportAnimState.previewTimer);
            this.exportAnimState.previewTimer = null;
        }

        const w = this.boardWidth || 32;
        const h = this.boardHeight || 32;
        const fps = this.animationFps || 12;
        const defaultScale = w <= 32 ? 8 : (w <= 64 ? 4 : 2);

        this.exportAnimState.format = 'gif';
        this.exportAnimState.scale = defaultScale;
        this.exportAnimState.fps = fps;
        this.exportAnimState.transparent = true;
        this.exportAnimState.includeJson = true;

        // Request high-fidelity rendered bitmaps for all frames from Worker
        let framesData = null;
        if (this.renderWorker) {
            framesData = await new Promise((resolve) => {
                let tid = null;
                const handler = (e) => {
                    if (e.data?.type === 'EXPORT_FRAMES_READY') {
                        if (tid) clearTimeout(tid);
                        this.renderWorker?.removeEventListener('message', handler);
                        resolve(e.data.payload);
                    }
                };
                this.renderWorker.addEventListener('message', handler);
                this.renderWorker.postMessage({ type: 'GET_EXPORT_FRAMES' });
                tid = setTimeout(() => {
                    this.renderWorker?.removeEventListener('message', handler);
                    resolve(null);
                }, 2500);
            });
        }

        const frameCanvases = [];
        if (framesData && framesData.frames && framesData.frames.length > 0) {
            framesData.frames.forEach(fr => {
                const fc = document.createElement('canvas');
                fc.width = w;
                fc.height = h;
                const fCtx = fc.getContext('2d', { alpha: true });
                fCtx.imageSmoothingEnabled = false;
                if (fr.bitmap) {
                    fCtx.drawImage(fr.bitmap, 0, 0, w, h);
                }
                frameCanvases.push(fc);
            });
        }

        // Fallback if worker did not reply in time
        if (frameCanvases.length === 0) {
            if (this.frames && this.frames.length > 0) {
                this.frames.forEach(f => {
                    const cardCanvas = document.querySelector(`canvas[data-frame-preview-id="${f.id}"]`);
                    if (cardCanvas) {
                        const fc = document.createElement('canvas');
                        fc.width = w;
                        fc.height = h;
                        const fCtx = fc.getContext('2d', { alpha: true });
                        fCtx.imageSmoothingEnabled = false;
                        fCtx.drawImage(cardCanvas, 0, 0, w, h);
                        frameCanvases.push(fc);
                    }
                });
            }
            if (frameCanvases.length === 0 && this.canvas) {
                const fc = document.createElement('canvas');
                fc.width = w;
                fc.height = h;
                const fCtx = fc.getContext('2d', { alpha: true });
                fCtx.imageSmoothingEnabled = false;
                fCtx.drawImage(this.canvas, 0, 0, w, h);
                frameCanvases.push(fc);
            }
        }

        this.exportAnimState.frameCanvases = frameCanvases;

        await window.modalSystem.show('exportAnimationModal', {
            boardWidth: w,
            boardHeight: h,
            framesCount: frameCanvases.length,
            fps,
            defaultScale
        });
    },

    exportAnimNextStep() {
        const formatTrigger = document.querySelector('[data-ref="export-format-trigger"]');
        const format = formatTrigger?.getAttribute('data-value') || 'gif';
        this.exportAnimState.format = format;

        const step1 = document.querySelector('[data-ref="export-anim-step-1"]');
        const step2 = document.querySelector('[data-ref="export-anim-step-2"]');
        if (step1 && step2) {
            step1.classList.remove('active');
            step1.classList.add('disabled');
            step2.classList.remove('disabled');
            step2.classList.add('active');
        }

        const title = document.querySelector('[data-ref="export-step2-title"]');
        if (title) {
            title.textContent = format === 'spritesheet' ? 'Exportar Sprite Sheet' : 'Exportar GIF Animado';
        }

        const jsonWrapper = document.querySelector('[data-ref="export-json-wrapper"]');
        if (jsonWrapper) {
            if (format === 'spritesheet') jsonWrapper.classList.remove('disabled');
            else jsonWrapper.classList.add('disabled');
        }

        const label = document.querySelector('[data-ref="export-download-label"]');
        if (label) {
            label.textContent = format === 'spritesheet' ? (window.__('btn_download_spritesheet') || 'Descargar Sprite Sheet') : (window.__('btn_download_gif') || 'Descargar GIF');
        }

        this.startExportPreviewLoop();
    },

    exportAnimPrevStep() {
        if (this.exportAnimState.previewTimer) {
            clearInterval(this.exportAnimState.previewTimer);
            this.exportAnimState.previewTimer = null;
        }

        const step1 = document.querySelector('[data-ref="export-anim-step-1"]');
        const step2 = document.querySelector('[data-ref="export-anim-step-2"]');
        if (step1 && step2) {
            step2.classList.remove('active');
            step2.classList.add('disabled');
            step1.classList.remove('disabled');
            step1.classList.add('active');
        }
    },

    handleSelectExportFormatOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = linkEl.getAttribute('data-value') || 'gif';
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'gif';

        const trigger = document.querySelector('[data-ref="export-format-trigger"]');
        const labelRef = document.querySelector('[data-ref="export-format-label"]');
        const iconRef = document.querySelector('[data-ref="export-format-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        this.exportAnimState.format = val;

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    handleSelectExportScaleOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = parseInt(linkEl.getAttribute('data-value'), 10) || 1;
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'aspect_ratio';
        const resText = linkEl.getAttribute('data-res') || '';

        const trigger = document.querySelector('[data-ref="export-scale-trigger"]');
        const labelRef = document.querySelector('[data-ref="export-scale-label"]');
        const iconRef = document.querySelector('[data-ref="export-scale-icon"]');

        if (trigger) trigger.setAttribute('data-value', String(val));
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        this.exportAnimState.scale = val;

        const resEl = document.querySelector('[data-ref="export-meta-res-text"]');
        if (resEl && resText) {
            resEl.textContent = resText;
        }

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    handleSelectExportBgOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = linkEl.getAttribute('data-value') || 'transparent';
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'opacity';

        const trigger = document.querySelector('[data-ref="export-bg-trigger"]');
        const labelRef = document.querySelector('[data-ref="export-bg-label"]');
        const iconRef = document.querySelector('[data-ref="export-bg-icon"]');

        if (trigger) trigger.setAttribute('data-value', val);
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        this.exportAnimState.transparent = (val === 'transparent');

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    handleSelectExportJsonOption(linkEl) {
        if (!linkEl || linkEl.classList.contains('disabled-interaction')) return;
        const val = linkEl.getAttribute('data-value') === 'true';
        const label = linkEl.getAttribute('data-label') || '';
        const icon = linkEl.getAttribute('data-icon') || 'data_object';

        const trigger = document.querySelector('[data-ref="export-json-trigger"]');
        const labelRef = document.querySelector('[data-ref="export-json-label"]');
        const iconRef = document.querySelector('[data-ref="export-json-icon"]');

        if (trigger) trigger.setAttribute('data-value', String(val));
        if (labelRef && label) labelRef.textContent = label;
        if (iconRef && icon) iconRef.textContent = icon;

        this.exportAnimState.includeJson = val;

        const dropdown = linkEl.closest('.component-module--dropdown');
        if (dropdown && typeof closeDropdown === 'function') closeDropdown(dropdown);

        const links = linkEl.closest('.component-menu-list')?.querySelectorAll('.component-menu-link') || [];
        links.forEach(l => l.classList.toggle('active', l === linkEl));
    },

    startExportPreviewLoop() {
        if (this.exportAnimState.previewTimer) {
            clearInterval(this.exportAnimState.previewTimer);
            this.exportAnimState.previewTimer = null;
        }

        const previewCanvas = document.querySelector('[data-ref="export-preview-canvas"]');
        const frameCanvases = this.exportAnimState.frameCanvases || [];
        const w = this.boardWidth || 32;
        const h = this.boardHeight || 32;
        const fps = this.animationFps || 12;

        if (previewCanvas && frameCanvases.length > 0) {
            let pIdx = 0;
            const pCtx = previewCanvas.getContext('2d', { alpha: true });
            pCtx.imageSmoothingEnabled = false;

            const drawPreviewFrame = () => {
                if (!previewCanvas.isConnected) {
                    if (this.exportAnimState.previewTimer) {
                        clearInterval(this.exportAnimState.previewTimer);
                        this.exportAnimState.previewTimer = null;
                    }
                    return;
                }
                const target = frameCanvases[pIdx];
                if (target) {
                    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                    const scale = Math.min(previewCanvas.width / w, previewCanvas.height / h);
                    const dw = w * scale;
                    const dh = h * scale;
                    const dx = (previewCanvas.width - dw) / 2;
                    const dy = (previewCanvas.height - dh) / 2;
                    pCtx.drawImage(target, dx, dy, dw, dh);
                }
                pIdx = (pIdx + 1) % frameCanvases.length;
            };

            drawPreviewFrame();
            this.exportAnimState.previewTimer = setInterval(drawPreviewFrame, Math.round(1000 / fps));
        }
    },

    async triggerExportAnimationDownload(btn = null) {
        if (btn) setButtonLoading(btn);

        const format = this.exportAnimState.format || 'gif';
        const scaleTrigger = document.querySelector('[data-ref="export-scale-trigger"]');
        const bgTrigger = document.querySelector('[data-ref="export-bg-trigger"]');
        const jsonTrigger = document.querySelector('[data-ref="export-json-trigger"]');

        const scale = scaleTrigger ? (parseInt(scaleTrigger.getAttribute('data-value'), 10) || 1) : (this.exportAnimState.scale || 1);
        const transparent = bgTrigger ? (bgTrigger.getAttribute('data-value') === 'transparent') : (this.exportAnimState.transparent !== false);
        const includeJson = jsonTrigger ? (jsonTrigger.getAttribute('data-value') === 'true') : (this.exportAnimState.includeJson !== false);
        const fps = this.exportAnimState.fps || 12;

        const frameCanvases = this.exportAnimState.frameCanvases || [];
        const canvasName = (this.canvasName || 'animacion').toLowerCase().replace(/[^a-z0-9_-]/g, '_');

        try {
            if (format === 'gif') {
                const gifBlob = await AnimationExporter.exportToGif(frameCanvases, {
                    scale,
                    fps,
                    transparent,
                    bgColor: '#ffffff'
                });
                if (gifBlob) {
                    AnimationExporter.downloadBlob(gifBlob, `${canvasName}_${scale}x.gif`);
                    showMessage(window.__('msg_gif_exported_success') || 'GIF animado exportado con éxito', 'success');
                }
            } else if (format === 'spritesheet') {
                const result = AnimationExporter.exportToSpriteSheet(frameCanvases, {
                    scale,
                    layout: 'horizontal',
                    transparent,
                    bgColor: '#ffffff',
                    fps
                });
                if (result && result.canvas) {
                    result.canvas.toBlob((blob) => {
                        if (blob) {
                            AnimationExporter.downloadBlob(blob, `spritesheet_${canvasName}_${scale}x.png`);
                        }
                    }, 'image/png');

                    if (includeJson && result.jsonMetadata) {
                        const jsonBlob = new Blob([JSON.stringify(result.jsonMetadata, null, 2)], { type: 'application/json' });
                        AnimationExporter.downloadBlob(jsonBlob, `spritesheet_${canvasName}_${scale}x.json`);
                    }
                    showMessage(window.__('msg_spritesheet_exported_success') || 'Sprite Sheet exportado con éxito', 'success');
                }
            }

            if (window.modalSystem) {
                window.modalSystem.closeCurrent(true);
            }
        } catch (e) {
            showMessage(window.__('err_export_animation') || 'Error al exportar la animación', 'error');
        } finally {
            if (btn) restoreButton(btn);
        }
    },

    async openAutoOutlineModal() {
        if (!this.isOfflineMode || !this.renderWorker) return;
        if (!window.modalSystem) return;

        const activeL = this.layers ? this.layers.find(l => l.id === this.activeLayerId) : null;
        const layerName = activeL ? activeL.name : 'Capa Activa';

        await window.modalSystem.show('autoOutlineModal', {
            currentColor: this.currentColor || '#000000',
            layerName
        });
    },

    triggerGenerateAutoOutline() {
        if (!this.isOfflineMode || !this.renderWorker) return;

        const colorTrigger = document.querySelector('[data-ref="outline-color-trigger"]');
        const shapeTrigger = document.querySelector('[data-ref="outline-shape-trigger"]');
        const targetTrigger = document.querySelector('[data-ref="outline-target-trigger"]');

        const color = colorTrigger ? (colorTrigger.getAttribute('data-value') || '#000000') : '#000000';
        const diagonal = shapeTrigger ? (shapeTrigger.getAttribute('data-value') === 'true') : false;
        const targetMode = targetTrigger ? (targetTrigger.getAttribute('data-value') || 'new_below') : 'new_below';

        this.renderWorker.postMessage({
            type: 'GENERATE_OUTLINE',
            payload: {
                layerId: this.activeLayerId,
                color,
                diagonal,
                targetMode
            }
        });

        if (window.modalSystem) {
            window.modalSystem.closeCurrent(true);
        }
    },

    handleSelectOutlineOption(linkEl) {
        if (!linkEl) return;
        const dropdown = linkEl.closest('.component-module--dropdown');
        const wrapper = linkEl.closest('.component-dropdown-wrapper');
        if (!wrapper) return;

        const trigger = wrapper.querySelector('.component-dropdown-trigger');
        const val = linkEl.getAttribute('data-value');
        const label = linkEl.getAttribute('data-label');
        const icon = linkEl.getAttribute('data-icon');

        if (trigger) {
            trigger.setAttribute('data-value', val);
            const labelRef = trigger.querySelector('.component-dropdown-text');
            if (labelRef && label) labelRef.textContent = label;

            const iconRef = trigger.querySelector('.material-symbols-rounded:not(:last-child)');
            if (iconRef && icon) iconRef.textContent = icon;

            const swatch = trigger.querySelector('[data-ref="outline-color-swatch"]');
            if (swatch) swatch.style.backgroundColor = val;
        }

        const links = wrapper.querySelectorAll('.component-menu-link');
        links.forEach(l => l.classList.toggle('active', l === linkEl));

        if (dropdown && typeof closeDropdown === 'function') {
            closeDropdown(dropdown);
        }
    }
};
