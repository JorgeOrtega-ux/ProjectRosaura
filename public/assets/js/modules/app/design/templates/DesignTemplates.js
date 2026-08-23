import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage, setButtonLoading, restoreButton } from '../../../../core/utils/uiUtils.js';
import { getStickersList, getStickerById } from '../data/StickersData.js';
import { SHAPE_SVG_PATHS } from '../data/ShapeSvgPathsData.js?v=34';
import { generateShapePixels } from '../utils/GeometricShapesUtils.js?v=34';

export const DesignTemplates = {

    handleTemplateModals(e) {

        const btnOpenJoinLive = e.target.closest('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            e.preventDefault();
            if (this.liveShareStatus === 'owner') {
                showMessage(__('err_cannot_join_while_streaming'), 'warning');
                return true;
            }
            if (this.liveShareStatus === 'spectator') {
                if (window.modalSystem) {
                    window.modalSystem.show('confirmLeaveLiveShare').then(res => {
                        if (res && res.confirmed) {
                            if (typeof this.leaveLiveImageSession === 'function') {
                                this.leaveLiveImageSession();
                            }
                        }
                    });
                }
                return true;
            }
            if (window.modalSystem) {
                window.modalSystem.show('joinLiveShare');
            }
            return true;
        }
        
        const btnToggleTemplateMenu = e.target.closest('[data-menu-target="menu-templates"]');
        if (btnToggleTemplateMenu) {
            if (!this.templatesLoaded) {
                this.loadUserLibrary();
            }
        }

        const btnToggleStickersMenu = e.target.closest('[data-menu-target="menu-stickers"]');
        if (btnToggleStickersMenu) {
            if (!this.stickersLoaded) {
                this.loadStickersLibrary();
            }
        }

        const btnToggleLiveBroadcast = e.target.closest('[data-action="toggleLiveBroadcast"]');
        if (btnToggleLiveBroadcast) {
            e.preventDefault();
            e.stopPropagation();

            if (btnToggleLiveBroadcast.getAttribute('data-requires-premium') === 'true') {
                const basePath = window.AppBasePath || '';
                const targetUrl = basePath + '/upgrade';
                if (window.spaRouter && typeof window.spaRouter.navigate === 'function') {
                    window.spaRouter.navigate(targetUrl);
                } else {
                    window.location.href = targetUrl;
                }
                return true;
            }

            if (this.liveShareStatus === 'owner') {
                // Already broadcasting → confirm stop
                if (window.modalSystem) {
                    window.modalSystem.show('confirmStopBroadcast').then(res => {
                        if (res && res.confirmed) {
                            if (typeof this.stopLiveShare === 'function') {
                                this.stopLiveShare();
                            }

                            // Remove badges
                            const badge = document.getElementById('live-share-badge');
                            if (badge) badge.remove();
                            const codeBadge = document.getElementById('live-share-code-badge');
                            if (codeBadge) codeBadge.remove();

                            // Reset button styling
                            const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                            if (btnOpenJoinLive) {
                                btnOpenJoinLive.classList.remove('disabled-interaction', 'disabled');
                                btnOpenJoinLive.removeAttribute('title');
                            }

                            btnToggleLiveBroadcast.classList.remove('component-color-indicator');
                            btnToggleLiveBroadcast.style.removeProperty('--active-color');
                        }
                    });
                }
            } else {
                // Not broadcasting → confirm start
                if (window.modalSystem) {
                    window.modalSystem.show('confirmStartBroadcast', { asyncConfirm: true }).then(async (res) => {
                        if (res && res.confirmed) {
                            if (typeof this.startLiveShare === 'function') {
                                const success = await this.startLiveShare();

                                if (success) {
                                    res.success();
                                    // Disable join button
                                    const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                                    if (btnOpenJoinLive) {
                                        btnOpenJoinLive.classList.add('disabled-interaction');
                                        btnOpenJoinLive.setAttribute('title', window.__('err_cannot_join_while_streaming'));
                                    }

                                    // Style the broadcast button as active
                                    btnToggleLiveBroadcast.classList.add('component-color-indicator');
                                    btnToggleLiveBroadcast.style.setProperty('--active-color', 'var(--color-danger, #ef4444)');

                                    // Create code badge below the main badge
                                    this._createCodeBadge(this.liveShareCode);
                                } else {
                                    res.failure();
                                }
                            } else {
                                res.success();
                            }
                        }
                    });
                }
            }
            return true;
        }

        const btnSubmitJoinLive = e.target.closest('[data-action="submitJoinLive"]');
        if (btnSubmitJoinLive) {
            e.preventDefault();
            if (this.liveShareStatus === 'owner') {
                showMessage(__('err_cannot_join_while_streaming'), 'error');
                return true;
            }
            const input = document.querySelector('[data-ref="live-join-code-modal"]');
            
            if (input && input.value.trim() !== '') {
                const code = input.value.trim().toUpperCase();
                
                if (code.length !== 9) {
                    showMessage(window.__('err_code_8_chars'), 'warning');
                    return true;
                }
                
                setButtonLoading(btnSubmitJoinLive, 'Uniendo...');
                
                const attemptJoin = async () => {
                    try {
                        let success = false;
                        if (typeof this.joinLiveImageSession === 'function') {
                            success = await this.joinLiveImageSession(code);
                        }
                        
                        if (success) {
                            if (window.modalSystem) window.modalSystem.closeCurrent(true);
                            
                            const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                            if (btnOpenJoinLive) {
                                btnOpenJoinLive.classList.add('component-color-indicator');
                                btnOpenJoinLive.style.setProperty('--active-color', 'var(--color-danger, #ef4444)');
                                btnOpenJoinLive.setAttribute('data-tooltip', (typeof window.__ === 'function' ? window.__('btn_leave_broadcast', [], 'Abandonar transmisión') : 'Abandonar transmisión') + ' [J]');
                                const icon = btnOpenJoinLive.querySelector('.material-symbols-rounded');
                                if (icon) icon.textContent = 'sensors_off';
                            }
                        } else {
                            restoreButton(btnSubmitJoinLive);
                        }
                    } catch (error) {
                        showMessage(error.message || window.__('err_join'), 'error');
                        restoreButton(btnSubmitJoinLive);
                    }
                };
                
                attemptJoin();
                
            } else {
                showMessage(__('err_valid_code'), 'warning');
            }
            return true;
        }

        return false;
    },

    _createCodeBadge(code) {
        let codeBadge = document.getElementById('live-share-code-badge');
        if (codeBadge) codeBadge.remove();

        codeBadge = document.createElement('div');
        codeBadge.className = 'component-badge component-badge--info';
        codeBadge.id = 'live-share-code-badge';
        codeBadge.style.cursor = 'pointer';
        codeBadge.setAttribute('title', window.__('tooltip_click_toggle_code', []));

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-rounded';
        iconSpan.textContent = 'key';
        
        const textSpan = document.createElement('span');
        textSpan.setAttribute('data-ref', 'live-code-text');
        textSpan.textContent = `${window.__('lbl_broadcast_code', [])}: ${code}`;

        codeBadge.appendChild(iconSpan);
        codeBadge.appendChild(textSpan);

        codeBadge._codeVisible = true;
        codeBadge._code = code;

        codeBadge.addEventListener('click', () => {
            codeBadge._codeVisible = !codeBadge._codeVisible;
            const txt = codeBadge.querySelector('[data-ref="live-code-text"]');
            if (codeBadge._codeVisible) {
                txt.textContent = `${window.__('lbl_broadcast_code', [])}: ${codeBadge._code}`;
                iconSpan.textContent = 'key';
            } else {
                txt.textContent = `${window.__('lbl_broadcast_code', [])}: ••••-••••`;
                iconSpan.textContent = 'key_off';
            }
        });

        const badgesContainer = document.querySelector('[data-ref="badges-left"]');
        if (badgesContainer) badgesContainer.appendChild(codeBadge);
    },

    renderSkeletonLibraryDOM() {
        const container = document.querySelector('[data-ref="user-templates-grid"]');
        if (!container) return;
        const emptyState = container.parentNode.querySelector('[data-ref="empty-state-rendered"]');
        
        container.innerHTML = '';
        container.classList.remove('disabled'); 
        container.classList.add('active');
        if (emptyState) {
            emptyState.classList.remove('active'); 
            emptyState.classList.add('disabled');
        }
        
        for(let i=0; i<5; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'component-library-card component-skeleton';
            const imgArea = document.createElement('div');
            imgArea.className = 'component-library-card__image';
            imgArea.style.backgroundColor = 'var(--bg-surface-alt, #1c1c20)';
            imgArea.style.width = '100%';
            imgArea.style.height = '100%';
            skeleton.appendChild(imgArea);
            container.appendChild(skeleton);
        }
    },

    async fetchTemplateTokensBalance() {
        try {
            const statusRes = await this.api.post(ApiRoutes.Canvases.GetTemplateTokens, {});
            if (statusRes && statusRes.success && statusRes.tokens) {
                this.cachedTemplateTokens = statusRes.tokens.remaining_tokens;
            }
        } catch (e) {
            console.error("Error pre-fetching template tokens balance:", e);
        }
    },

    async loadUserLibrary() {
        if (this.isSpectator || this.isSnapshotMode) return;
        if (this.templatesLoaded || this.isLoadingTemplates) return;
        
        this.fetchTemplateTokensBalance();
        
        this.isLoadingTemplates = true;
        try {
            this.renderSkeletonLibraryDOM();
            
            const response = await this.api.post(ApiRoutes.Canvases.GetTemplates, {}, this.abortController.signal);
            if (response.aborted) return;

            this.templatesLoaded = true;
            if (response.success && response.data) {
                this.renderUserLibraryDOM(response.data);
            } else {
                this.renderUserLibraryDOM([]);
            }
        } catch (error) {
            this.templatesLoaded = true;
            this.renderUserLibraryDOM([]);
        } finally {
            this.isLoadingTemplates = false;
        }
    },

    renderUserLibraryDOM(templates) {
        const container = document.querySelector('[data-ref="user-templates-grid"]');
        if (!container) return;

        const emptyState = container.parentNode.querySelector('[data-ref="empty-state-rendered"]');

        container.innerHTML = '';
        this.updateTemplateCount(templates.length);

        if (templates.length === 0) {
            container.classList.remove('active'); container.classList.add('disabled');
            if (emptyState) {
                emptyState.classList.remove('disabled'); emptyState.classList.add('active');
                const emptyText = emptyState.querySelector('.component-empty-state-text');
                if (emptyText) emptyText.innerText = window.__('no_saved_templates');
            }
            this.updateTemplateUI();
            return;
        }

        container.classList.remove('disabled'); container.classList.add('active');
        if (emptyState) emptyState.classList.remove('active'); emptyState.classList.add('disabled');

        templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'component-library-card';
            
            const img = document.createElement('img');
            img.src = tpl.file_path;
            img.alt = __('alt_saved_template');
            img.className = 'component-library-card__image image-lazy-fade';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.onload = () => img.classList.add('image-loaded');
            img.onerror = () => {
                img.onerror = null;
                img.src = (window.AppBasePath || '') + '/public/assets/img/fallbacks/canvas-default.png';
                img.classList.add('image-loaded');
            };
            
            img.setAttribute('data-action', 'addTemplateToCanvas');
            img.setAttribute('data-url', tpl.file_path);

            const btnDel = document.createElement('button');
            btnDel.className = 'component-button component-button--icon component-button--danger component-library-card__delete';
            btnDel.innerHTML = '<span class="material-symbols-rounded">delete</span>';
            btnDel.setAttribute('data-action', 'deleteServerTemplate');
            btnDel.setAttribute('data-id', tpl.id);

            card.appendChild(img);
            card.appendChild(btnDel);
            container.appendChild(card);
        });

        this.updateTemplateUI();
    },

    loadStickersLibrary() {
        this.stickersLoaded = true;
        const list = getStickersList();
        this.renderStickersLibraryDOM(list);
    },

    renderStickersLibraryDOM(stickers) {
        const container = document.querySelector('[data-ref="stickers-grid"]');
        if (!container) return;

        const countSpan = document.querySelector('[data-ref="stickers-count"]');
        if (countSpan) countSpan.innerText = (stickers && stickers.length) ? stickers.length : 0;

        const emptyState = document.querySelector('[data-ref="stickers-empty-state"]');

        container.innerHTML = '';

        if (!stickers || stickers.length === 0) {
            container.classList.remove('active');
            container.classList.add('disabled');
            if (emptyState) {
                emptyState.classList.remove('disabled');
                emptyState.classList.add('active');
            }
            return;
        }

        container.classList.remove('disabled');
        container.classList.add('active');
        if (emptyState) {
            emptyState.classList.remove('active');
            emptyState.classList.add('disabled');
        }

        stickers.forEach(sticker => {
            const card = document.createElement('div');
            card.className = 'component-library-card';
            card.setAttribute('data-action', 'addStickerToCanvas');
            card.setAttribute('data-sticker-id', sticker.id);
            card.setAttribute('data-sticker-category', sticker.category || 'all');
            card.setAttribute('data-tooltip', sticker.name);
            card.setAttribute('data-position', 'top');

            const spriteEl = document.createElement('div');
            spriteEl.className = `component-sticker-sprite ${sticker.spriteClass || ''}`;
            spriteEl.setAttribute('aria-label', sticker.name);

            card.appendChild(spriteEl);
            container.appendChild(card);
        });

        this.updateTemplateUI();
    },

    async addStickerToCanvas(stickerId, fallbackDataUrl = null, fallbackName = null) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        let sticker = getStickerById(stickerId);
        if (!sticker && fallbackDataUrl) {
            sticker = {
                id: stickerId,
                name: fallbackName || 'Figura',
                dataUrl: fallbackDataUrl,
                width: 16,
                height: 16,
                sx: 0,
                sy: 0,
                sw: 16,
                sh: 16
            };
        }
        if (!sticker) return;

        const existing = this.templates.find(t => t.id === sticker.id);
        if (existing) {
            if (this.activeTemplateId !== sticker.id) {
                const targetSize = Math.max(16, Math.min(64, Math.floor(Math.min(this.boardWidth, this.boardHeight) / 3)));
                existing.w = targetSize;
                existing.h = targetSize;
                existing.x = Math.round((this.boardWidth - targetSize) / 2);
                existing.y = Math.round((this.boardHeight - targetSize) / 2);
                existing.angle = 0;
                existing.opacity = 0.8;
                existing.locked = false;
            }
            this.toggleTemplate(sticker.id);
            return;
        }

        try {
            const spriteUrl = sticker.spriteUrl || getStickersSpriteUrl();
            
            // Singleton cached sprite image
            if (!this._stickersSpriteImg || !this._stickersSpriteImg.complete || this._stickersSpriteImg.src !== spriteUrl) {
                this._stickersSpriteImg = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('Error loading stickers sprite'));
                    img.src = spriteUrl;
                });
            }

            const offCanvas = document.createElement('canvas');
            offCanvas.width = 16;
            offCanvas.height = 16;
            const offCtx = offCanvas.getContext('2d');
            offCtx.imageSmoothingEnabled = false;

            const sx = typeof sticker.sx === 'number' ? sticker.sx : 0;
            const sy = typeof sticker.sy === 'number' ? sticker.sy : 0;
            offCtx.drawImage(this._stickersSpriteImg, sx, sy, 16, 16, 0, 0, 16, 16);

            let imageBitmap = null;
            if (typeof createImageBitmap === 'function') {
                try {
                    imageBitmap = await createImageBitmap(offCanvas);
                } catch (e) {}
            }

            const stickerImg = new Image();
            stickerImg.src = offCanvas.toDataURL();

            const targetSize = Math.max(16, Math.min(64, Math.floor(Math.min(this.boardWidth, this.boardHeight) / 3)));
            const w = targetSize;
            const h = targetSize;
            const x = Math.round((this.boardWidth - w) / 2);
            const y = Math.round((this.boardHeight - h) / 2);

            this.templates.push({
                id: sticker.id,
                img: stickerImg,
                imageBitmap,
                src: stickerImg.src,
                x,
                y,
                w,
                h,
                angle: 0,
                locked: false,
                opacity: 0.8,
                isSticker: true,
                title: sticker.name
            });

            this.toggleTemplate(sticker.id);
            showMessage(window.__('msg_template_added') || 'Figura añadida al lienzo', 'success');
        } catch (err) {
            console.error('[DesignTemplates] Error adding sticker to canvas:', err);
            showMessage(window.__('err_download_library_image') || 'Error al cargar la figura', 'error');
        }
    },

    async addShapeToCanvas(shapeId, fallbackSvg = null, fallbackName = null) {
        if (this.isSpectator || this.isResetLocked || this.isResizeLocked) return;

        const pathD = SHAPE_SVG_PATHS ? SHAPE_SVG_PATHS[shapeId] : null;
        const color = this.currentColor || '#000000';
        const targetSize = Math.max(16, Math.min(128, Math.floor(Math.min(this.boardWidth, this.boardHeight) / 4)));
        const w = targetSize;
        const h = targetSize;
        const x = Math.round((this.boardWidth - w) / 2);
        const y = Math.round((this.boardHeight - h) / 2);

        // Generar bitmap exacto 1:1 en tamaño de píxeles reales (Pixel Art nítido sin difuminado ni sombras)
        const imageBitmap = await this.renderCrispShapeBitmap(shapeId, w, h, color, true, 1, fallbackSvg);

        const shapeEntry = {
            id: 'shape_' + shapeId + '_' + Date.now(),
            shapeId: shapeId,
            pathD: pathD,
            src: fallbackSvg,
            imageBitmap: imageBitmap,
            x,
            y,
            w,
            h,
            angle: 0,
            locked: false,
            opacity: 0.85,
            isSticker: true,
            isShape: true,
            color: color,
            isFill: true,
            strokeWidth: 1,
            title: fallbackName || shapeId
        };

        // Reemplazar figura activa previa no bloqueada para mantener el lienzo limpio
        this.templates = this.templates.filter(t => !t.isShape || t.locked);
        this.templates.push(shapeEntry);
        this.activeTemplateId = shapeEntry.id;
        if (typeof this.updateTemplateUI === 'function') {
            this.updateTemplateUI();
        }
        this.requestRender();
        showMessage(window.__('msg_template_added') || 'Figura añadida al lienzo', 'success');
    },

    async renderCrispShapeBitmap(shapeId, w, h, color, isFill = true, strokeWidth = 1, fallbackSvg = null) {
        const cw = Math.max(1, Math.round(w));
        const ch = Math.max(1, Math.round(h));
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cw;
        offCanvas.height = ch;
        const offCtx = offCanvas.getContext('2d');
        offCtx.imageSmoothingEnabled = false;

        const points = generateShapePixels(shapeId, 0, 0, cw - 1, ch - 1, isFill, strokeWidth, cw, ch);
        if (points && points.length > 0) {
            offCtx.fillStyle = color || '#000000';
            for (let i = 0; i < points.length; i++) {
                offCtx.fillRect(points[i].x, points[i].y, 1, 1);
            }
        } else if (fallbackSvg) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve) => {
                img.onload = () => {
                    offCtx.drawImage(img, 0, 0, cw, ch);
                    resolve();
                };
                img.onerror = resolve;
                img.src = fallbackSvg;
            });
        }

        try {
            return await createImageBitmap(offCanvas);
        } catch (e) {
            return null;
        }
    },

    async refreshShapeTemplateColor(tpl, color) {
        if (!tpl || !tpl.isShape || !tpl.shapeId) return;
        tpl.color = color;
        tpl.imageBitmap = await this.renderCrispShapeBitmap(
            tpl.shapeId,
            tpl.w,
            tpl.h,
            color,
            tpl.isFill !== false,
            tpl.strokeWidth || 1,
            tpl.src
        );
        this.requestRender();
    },

    _compressTemplateImage(file) {
        if (!file.type.startsWith('image/')) return Promise.resolve(file);

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1920;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(newFile);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
    },

    async handleFileUpload(e) {
        if (this.isSpectator || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const tier = window.appUserTier ?? 0;
        let maxMB = 10;
        if (tier === 1) maxMB = 25;
        else if (tier === 2) maxMB = 50;
        else if (tier >= 3) maxMB = 100;

        if (file.size > maxMB * 1024 * 1024) {
            showMessage(
                window.__ ? window.__('err_max_size_mb')?.replace('{mb}', maxMB) : `El archivo original supera el límite permitido de ${maxMB} MB para tu plan.`, 
                'warning'
            );
            this.fileInput.value = '';
            return;
        }

        const btnUpload = document.querySelector('[data-action="triggerTemplateUpload"]');
        if (btnUpload) {
            setButtonLoading(btnUpload);
        }

        const compressedFile = await this._compressTemplateImage(file);

        const formData = new FormData();
        formData.append('file', compressedFile);

        try {
            const response = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData, this.abortController.signal);
            if (response.aborted) return;

            if (response.success) {
                showMessage(__('msg_template_uploaded'), 'success');
                this.templatesLoaded = false;
                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            showMessage(__('err_network_upload'), 'error');
        } finally {
            this.fileInput.value = '';
            if (btnUpload) {
                restoreButton(btnUpload);
            }
        }
    },

    addTemplateFromLibrary(url) {
        const existing = this.templates.find(t => t.id === url);
        if (existing) {
            if (this.activeTemplateId !== url) {
                const targetW = this.boardWidth * 0.5;
                const targetH = this.boardHeight * 0.5;
                const scale = Math.min(targetW / (existing.img.width || 100), targetH / (existing.img.height || 100));
                existing.w = Math.round((existing.img.width || 100) * scale);
                existing.h = Math.round((existing.img.height || 100) * scale);
                existing.x = Math.round((this.boardWidth - existing.w) / 2);
                existing.y = Math.round((this.boardHeight - existing.h) / 2);
                existing.angle = 0;
                existing.opacity = 0.5;
                existing.locked = false;
            }
            this.toggleTemplate(url);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        const loadBitmap = async (imageSource) => {
            if (typeof createImageBitmap === 'function') {
                try {
                    return await createImageBitmap(imageSource);
                } catch (e) {
                }
            }
            return null;
        };

        img.onload = async () => {
            const id = url; 
            let targetW, targetH, x, y;

            targetW = this.boardWidth * 0.5;
            targetH = this.boardHeight * 0.5;
            const scale = Math.min(targetW / (img.width || 100), targetH / (img.height || 100));
            const w = Math.round((img.width || 100) * scale);
            const h = Math.round((img.height || 100) * scale);
            x = Math.round((this.boardWidth - w) / 2);
            y = Math.round((this.boardHeight - h) / 2);

            const imageBitmap = await loadBitmap(img);

            this.templates.push({
                id, img, imageBitmap,
                src: url,
                x, y, w, h,
                locked: false,
                opacity: 0.5 
            });

            this.toggleTemplate(id); 
            showMessage(__('msg_template_added'), 'success');
        };
        img.onerror = () => {
            if (img.crossOrigin) {
                img.crossOrigin = null;
                img.src = url;
                return;
            }
            showMessage(__('err_download_library_image'), 'error');
        };
        img.src = url;
    },

    async deleteServerTemplate(id, modalConfirmBtn) {
        const gridBtn = document.querySelector(`[data-ref="user-templates-grid"] [data-action="deleteServerTemplate"][data-id="${id}"]`);
        if (gridBtn) gridBtn.classList.add('disabled-interaction');

        let cancelBtn = null;
        let originalText = '';
        if (modalConfirmBtn) {
            modalConfirmBtn.classList.add('disabled-interaction');
            cancelBtn = modalConfirmBtn.parentElement ? modalConfirmBtn.parentElement.querySelector('[data-modal-action="cancel"]') : null;
            if (cancelBtn) cancelBtn.classList.add('disabled-interaction');
            
            const textSpan = modalConfirmBtn.querySelector('span');
            if (textSpan) {
                originalText = textSpan.textContent;
                textSpan.textContent = typeof window.__ === 'function' ? window.__('lbl_deleting', [], 'Eliminando...') : 'Eliminando...';
            }
        }

        let templateFilePath = null;
        if (gridBtn && gridBtn.parentElement) {
            const img = gridBtn.parentElement.querySelector('img');
            if (img) templateFilePath = img.getAttribute('data-url');
        }

        try {
            const response = await this.api.post(ApiRoutes.Canvases.DeleteTemplate, { id: id }, this.abortController.signal);
            if (response.aborted) return;
            
            if (response.success) {
                showMessage(response.message, 'success');

                if (window.modalSystem) {
                    window.modalSystem.closeCurrent(true);
                }

                if (templateFilePath) {
                    if (this.liveShareStatus === 'owner' && this.liveTemplateId === templateFilePath) {
                        if (typeof this.stopLiveShare === 'function') {
                            this.stopLiveShare();
                        }
                    }
                    if (this.templates.find(t => t.id === templateFilePath)) {
                        this.templates = this.templates.filter(t => t.id !== templateFilePath);
                        if (this.activeTemplateId === templateFilePath) {
                            this.activeTemplateId = null;
                        }
                        this.updateTemplateUI();
                        this.requestRender();
                    }
                }

                this.templatesLoaded = false;
                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
                if (gridBtn) gridBtn.classList.remove('disabled-interaction');
                if (modalConfirmBtn) {
                    modalConfirmBtn.classList.remove('disabled-interaction');
                    const textSpan = modalConfirmBtn.querySelector('span');
                    if (textSpan) textSpan.textContent = originalText;
                }
                if (cancelBtn) cancelBtn.classList.remove('disabled-interaction');
            }
        } catch (error) {
            showMessage(__('err_connection'), 'error');
            if (gridBtn) gridBtn.classList.remove('disabled-interaction');
            if (modalConfirmBtn) {
                modalConfirmBtn.classList.remove('disabled-interaction');
                const textSpan = modalConfirmBtn.querySelector('span');
                if (textSpan) textSpan.textContent = originalText;
            }
            if (cancelBtn) cancelBtn.classList.remove('disabled-interaction');
        }
    },

    updateTemplateUI() {
        const userTemplateCards = document.querySelectorAll('[data-ref="user-templates-grid"] .component-library-card');
        userTemplateCards.forEach(card => {
            const img = card.querySelector('img');
            const url = img ? img.getAttribute('data-url') : null;
            if (this.activeTemplateId && url && url === this.activeTemplateId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const stickerCards = document.querySelectorAll('[data-ref="stickers-grid"] .component-library-card');
        stickerCards.forEach(card => {
            const stickerId = card.getAttribute('data-sticker-id');
            if (this.activeTemplateId && stickerId && stickerId === this.activeTemplateId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const shapeCards = document.querySelectorAll('.component-shape-card');
        const activeTpl = this.templates ? this.templates.find(t => t.id === this.activeTemplateId) : null;
        shapeCards.forEach(card => {
            const shpId = card.getAttribute('data-shape-id');
            if (activeTpl && activeTpl.shapeId && activeTpl.shapeId === shpId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const toolbarEl = document.querySelector('[data-ref="template-floating-toolbar"]');
        const btnLock = document.querySelector('[data-ref="btn-template-lock"]');
        const btnRotate = document.querySelector('[data-ref="btn-template-rotate"]');
        const btnInject = document.querySelector('[data-ref="btn-template-inject"]');
        const btnDel = document.querySelector('[data-ref="btn-template-delete"]');
        const btnLive = document.querySelector('[data-ref="btn-start-live"]');

        const btnTopUnlock = document.querySelector('[data-ref="btn-top-unlock-template"]');
        const hasLockedTemplate = this.templates && this.templates.some(t => t.locked);
        if (btnTopUnlock) {
            if (hasLockedTemplate) {
                btnTopUnlock.classList.remove('disabled');
            } else {
                btnTopUnlock.classList.add('disabled');
            }
        }

        if (this.activeTemplateId && activeTpl) {
            if (btnLock) btnLock.classList.remove('disabled');
            if (btnRotate) btnRotate.classList.remove('disabled');
            if (btnInject) btnInject.classList.remove('disabled');
            if (btnDel) btnDel.classList.remove('disabled');
            
            if (btnLock) {
                const iconLock = btnLock.querySelector('.material-symbols-rounded');
                if (iconLock) {
                    iconLock.textContent = activeTpl.locked ? 'lock' : 'lock_open';
                }
            }
            if (toolbarEl) {
                toolbarEl.classList.remove('disabled');
                toolbarEl.classList.add('active');
            }
            this.positionTemplateToolbar();
        } else {
            if (btnLock) btnLock.classList.add('disabled');
            if (btnRotate) btnRotate.classList.add('disabled');
            if (btnInject) btnInject.classList.add('disabled');
            if (btnDel) btnDel.classList.add('disabled');
            if (toolbarEl) {
                toolbarEl.classList.remove('active');
                toolbarEl.classList.add('disabled');
            }
        }

        if (btnLive) {
            if (!btnLive.classList.contains('premium-locked')) {
                btnLive.classList.remove('disabled-interaction');
            }
        }
    },

    unlockTemplateTop() {
        if (!this.templates) return;
        let unlockedAny = false;
        this.templates.forEach(t => {
            if (t.locked) {
                t.locked = false;
                unlockedAny = true;
                this.activeTemplateId = t.id;
            }
        });
        if (unlockedAny) {
            this.updateTemplateUI();
            this.requestRender();
            if (typeof showMessage === 'function') {
                const msg = (typeof window.__ === 'function' ? window.__('msg_template_unlocked') : null) || 'Plantilla Desbloqueada';
                showMessage(msg, 'info');
            }
        }
    },

    positionTemplateToolbar() {
        const toolbarEl = document.querySelector('[data-ref="template-floating-toolbar"]');
        if (!toolbarEl) return;

        const isLockedState = !!(this.isSpectator || this.isResetLocked || this.isResizeLocked || this.isInjectLocked || this.isClearLocked);

        // Hide floating toolbar while user is actively moving, resizing, panning, or zooming
        if (!this.activeTemplateId || !this.templates || isLockedState || this.templateInteraction || this.isDragging || this.isZooming) {
            toolbarEl.classList.add('disabled');
            toolbarEl.classList.remove('active');
            return;
        }

        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl || tpl.locked || !this.canvas || !this.transform) {
            toolbarEl.classList.add('disabled');
            toolbarEl.classList.remove('active');
            return;
        }

        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvas.parentNode ? this.canvas.parentNode.getBoundingClientRect() : canvasRect;

        // Board coordinates of top-center of template image
        const tplCenterX = tpl.x + (tpl.w / 2);
        const tplTopY = tpl.y;

        // Viewport screen coordinates (matching getExactBoardCoords inverse math)
        const screenX = canvasRect.left + (tplCenterX * this.transform.scale) + this.transform.x;
        const screenY = canvasRect.top + (tplTopY * this.transform.scale) + this.transform.y;

        // DOM pixel offset relative to container (.component-bottom)
        const leftPx = screenX - containerRect.left;
        const topPx = screenY - containerRect.top - 8;

        toolbarEl.style.position = 'absolute';
        toolbarEl.style.left = `${Math.round(leftPx)}px`;
        toolbarEl.style.top = `${Math.round(topPx)}px`;
        toolbarEl.style.transform = 'translate(-50%, -100%)';
        toolbarEl.classList.remove('disabled');
        toolbarEl.classList.add('active');
    },

    updateTemplateCount(count) {
        const countEl = document.querySelector('[data-ref="template-count"]');
        if (countEl) countEl.textContent = count;
    },

    toggleTemplate(id) {
        if (this.activeTemplateId === id) {
            this.activeTemplateId = null; 
        } else {
            this.activeTemplateId = id; 
        }
        
        if (this.liveShareStatus === 'owner') {
            this.liveTemplateId = this.activeTemplateId;
            if (typeof this.emitLiveImageUpdate === 'function') {
                this.emitLiveImageUpdate();
            }
        }
        
        this.updateTemplateUI();
        this.requestRender();
    },

    toggleTemplateLock() {
        if (!this.activeTemplateId) return;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (tpl) {
            tpl.locked = !tpl.locked;
            this.updateTemplateUI();
            this.requestRender();
        }
    },

    rotateTemplate() {
        if (!this.activeTemplateId) return;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (tpl) {
            const oldCx = tpl.x + tpl.w / 2;
            const oldCy = tpl.y + tpl.h / 2;

            tpl.angle = (tpl.angle || 0) + 90;
            if (tpl.angle >= 360) {
                tpl.angle -= 360;
            }

            const angleRad = tpl.angle * Math.PI / 180;
            const cosA = Math.cos(angleRad);
            const sinA = Math.sin(angleRad);

            let w2 = tpl.w / 2;
            let h2 = tpl.h / 2;

            const getRotatedBounds = (w, h) => {
                const corners = [
                    { x: -w/2, y: -h/2 }, { x: w/2, y: -h/2 },
                    { x: -w/2, y: h/2 }, { x: w/2, y: h/2 }
                ];
                let minRx = Infinity, maxRx = -Infinity;
                let minRy = Infinity, maxRy = -Infinity;
                for (let c of corners) {
                    const rx = c.x * cosA - c.y * sinA;
                    const ry = c.x * sinA + c.y * cosA;
                    if (rx < minRx) minRx = rx;
                    if (rx > maxRx) maxRx = rx;
                    if (ry < minRy) minRy = ry;
                    if (ry > maxRy) maxRy = ry;
                }
                return { minRx, maxRx, minRy, maxRy, visualWidth: maxRx - minRx, visualHeight: maxRy - minRy };
            };

            let bounds = getRotatedBounds(tpl.w, tpl.h);

            // Shrink if too big
            if (bounds.visualWidth > this.boardWidth || bounds.visualHeight > this.boardHeight) {
                const scaleX = this.boardWidth / bounds.visualWidth;
                const scaleY = this.boardHeight / bounds.visualHeight;
                const shrinkScale = Math.min(scaleX, scaleY) * 0.99; // tiny margin
                
                const aspect = tpl.w / tpl.h;
                let newW = tpl.w * shrinkScale;
                newW = Math.round(newW / 2) * 2;
                let newH = Math.round(newW / aspect);
                newH = Math.round(newH / 2) * 2;
                
                tpl.w = newW;
                tpl.h = newH;
                bounds = getRotatedBounds(tpl.w, tpl.h);
            }

            // Restore center and clamp to board
            tpl.x = oldCx - tpl.w / 2;
            tpl.y = oldCy - tpl.h / 2;

            const minX = Math.round(-tpl.w/2 - bounds.minRx);
            const maxX = Math.round(this.boardWidth - tpl.w/2 - bounds.maxRx);
            const minY = Math.round(-tpl.h/2 - bounds.minRy);
            const maxY = Math.round(this.boardHeight - tpl.h/2 - bounds.maxRy);

            tpl.x = Math.max(minX, Math.min(tpl.x, maxX));
            tpl.y = Math.max(minY, Math.min(tpl.y, maxY));

            if (typeof this.emitLiveImageUpdate === 'function') {
                this.emitLiveImageUpdate();
            }
            if (typeof this.updateTransformerUI === 'function') {
                this.updateTransformerUI();
            }
            this.requestRender();
        }
    },

    async injectTemplate() {
        if (!this.activeTemplateId) return;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl) return;
        if (!this.canvasId) return;
        if (this.isInjectLocked || this.isResetLocked || this.isResizeLocked) return;

        // INYECCIÓN GRATUITA PARA FIGURAS Y STICKERS (Solo en modo offline / personal, 0 Tokens, sin modal)
        if (tpl.isSticker) {
            if (!this.isOfflineMode) {
                showMessage(window.__('err_stickers_offline_only') || 'Las figuras solo se pueden estampar en modo personal / offline.', 'warning');
                return;
            }

            const btn = document.querySelector('[data-ref="btn-template-inject"]');
            if (btn) setButtonLoading(btn);

            try {
                let bitmapClone = null;
                if (tpl.isShape && tpl.shapeId) {
                    bitmapClone = await this.renderCrispShapeBitmap(
                        tpl.shapeId,
                        tpl.w,
                        tpl.h,
                        tpl.color || this.currentColor,
                        tpl.isFill !== false,
                        tpl.strokeWidth || 1,
                        tpl.src
                    );
                } else if (tpl.imageBitmap) {
                    try {
                        bitmapClone = await createImageBitmap(tpl.imageBitmap);
                    } catch (e) {}
                }

                if (typeof this.setLastInjectedTemplate === 'function') {
                    let lastClone = null;
                    if (bitmapClone) {
                        try {
                            lastClone = await createImageBitmap(bitmapClone);
                        } catch (e) {}
                    }
                    this.setLastInjectedTemplate({
                        x: Math.round(tpl.x),
                        y: Math.round(tpl.y),
                        w: Math.round(tpl.w),
                        h: Math.round(tpl.h),
                        imageBitmap: lastClone
                    });
                }

                if (this.renderWorker && bitmapClone) {
                    try {
                        this.renderWorker.postMessage({
                            type: 'TRIGGER_INJECT_ANIMATION',
                            payload: {
                                templateCoords: {
                                    x: Math.round(tpl.x),
                                    y: Math.round(tpl.y),
                                    w: Math.round(tpl.w),
                                    h: Math.round(tpl.h)
                                },
                                imageBitmap: bitmapClone
                            }
                        }, [bitmapClone]);
                    } catch (bmErr) {}
                }

                if (typeof this.saveOfflineCanvasState === 'function') {
                    this.saveOfflineCanvasState(false);
                }

                this.deleteTemplate();
                this.requestRender();
                showMessage(window.__('msg_sticker_stamped') || 'Figura estampada con éxito.', 'success');
            } catch (err) {
                console.error("Error stamping sticker:", err);
                showMessage(window.__('err_stamp_failed') || 'Error al estampar figura.', 'error');
            } finally {
                if (btn) restoreButton(btn);
            }
            return;
        }

        // PLANTILLAS PERSONALIZADAS (Mantiene cobro de tokens y modal de confirmación)
        const w = tpl.w || 500;
        const h = tpl.h || 500;
        const cost = Math.max(25, Math.min(2500, Math.round((w * h) / 1000)));
        let balance = this.cachedTemplateTokens;

        if (balance === undefined) {
            try {
                const statusRes = await this.api.post(ApiRoutes.Canvases.GetTemplateTokens, {});
                if (statusRes && statusRes.success && statusRes.tokens) {
                    balance = statusRes.tokens.remaining_tokens;
                    this.cachedTemplateTokens = balance;
                }
            } catch (e) {
                console.error("Error fetching template tokens balance:", e);
                balance = 0;
            }
        }

        if (window.modalSystem) {
            const res = await window.modalSystem.show('confirmInjectTemplate', { cost: cost, balance: balance });
            if (!res.confirmed) return;
        }

        const btn = document.querySelector('[data-ref="btn-template-inject"]');
        setButtonLoading(btn);

        try {
            if (typeof this.setLastInjectedTemplate === 'function') {
                let bitmapClone = null;
                if (tpl.imageBitmap) {
                    try {
                        bitmapClone = await createImageBitmap(tpl.imageBitmap);
                    } catch (e) {
                    }
                }
                this.setLastInjectedTemplate({
                    x: Math.round(tpl.x),
                    y: Math.round(tpl.y),
                    w: tpl.w,
                    h: tpl.h,
                    imageBitmap: bitmapClone
                });
            }

            const res = await this.api.post(ApiRoutes.Canvases.InjectTemplate, {
                canvas_id: this.canvasId,
                url: tpl.src,
                x: Math.round(tpl.x),
                y: Math.round(tpl.y),
                w: Math.round(tpl.w),
                h: Math.round(tpl.h),
                angle: tpl.angle || 0
            });

            if (res && res.success) {
                if (this.cachedTemplateTokens !== undefined) {
                    this.cachedTemplateTokens = Math.max(0, this.cachedTemplateTokens - cost);
                }
                this.fetchTemplateTokensBalance();

                if (this.isOfflineMode || res.is_offline) {
                    if (this.renderWorker && tpl.imageBitmap) {
                        try {
                            const bitmapClone = await createImageBitmap(tpl.imageBitmap);
                            this.renderWorker.postMessage({
                                type: 'TRIGGER_INJECT_ANIMATION',
                                payload: {
                                    templateCoords: {
                                        x: Math.round(tpl.x),
                                        y: Math.round(tpl.y),
                                        w: Math.round(tpl.w),
                                        h: Math.round(tpl.h)
                                    },
                                    imageBitmap: bitmapClone
                                }
                            }, [bitmapClone]);
                        } catch (bmErr) {}
                    }

                    if (typeof this.saveOfflineCanvasState === 'function') {
                        this.saveOfflineCanvasState(false);
                    }

                    this.deleteTemplate();
                    this.requestRender();
                    showMessage(res?.message || __('msg_template_stamped') || 'Plantilla estampada con éxito.', 'success');
                }
            } else {
                showMessage(res?.message || __('err_stamp_failed'), 'error');
            }
        } catch (err) {
            showMessage(__('err_stamp_failed'), 'error');
        } finally {
            restoreButton(btn);
        }
    },

    deleteTemplate() {
        if (!this.activeTemplateId) return;

        // If we delete the active template and it was being live-shared, we just keep the live share active.
        // Spectators will see nothing until a new template is placed.

        const deletedId = this.activeTemplateId;
        this.templates = this.templates.filter(t => t.id !== deletedId);
        this.activeTemplateId = null;
        
        if (typeof this.emitLiveImageUpdate === 'function' && this.liveShareStatus === 'owner' && deletedId === this.liveTemplateId) {
            this.emitLiveImageUpdate();
        }

        this.updateTemplateUI();
        this.requestRender();
    },

    checkTemplateHandleHit(ex, ey) {
        if (!this.activeTemplateId) return null;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl || tpl.locked) return null;

        let px = ex;
        let py = ey;

        if (tpl.angle) {
            const cx = tpl.x + tpl.w / 2;
            const cy = tpl.y + tpl.h / 2;
            const rad = (-tpl.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            px = cos * (ex - cx) - sin * (ey - cy) + cx;
            py = sin * (ex - cx) + cos * (ey - cy) + cy;
        }

        const scale = this.transform?.scale || 1;
        const hs = 12 / scale; 

        if (Math.abs(px - tpl.x) <= hs && Math.abs(py - tpl.y) <= hs) return 'tl';
        if (Math.abs(px - (tpl.x + tpl.w)) <= hs && Math.abs(py - tpl.y) <= hs) return 'tr';
        if (Math.abs(px - tpl.x) <= hs && Math.abs(py - (tpl.y + tpl.h)) <= hs) return 'bl';
        if (Math.abs(px - (tpl.x + tpl.w)) <= hs && Math.abs(py - (tpl.y + tpl.h)) <= hs) return 'br';

        return null;
    },

    checkTemplateHit(ex, ey) {
        if (!this.activeTemplateId) return null;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl || tpl.locked) return null; 

        let px = ex;
        let py = ey;

        if (tpl.angle) {
            const cx = tpl.x + tpl.w / 2;
            const cy = tpl.y + tpl.h / 2;
            const rad = (-tpl.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            px = cos * (ex - cx) - sin * (ey - cy) + cx;
            py = sin * (ex - cx) + cos * (ey - cy) + cy;
        }

        if (px >= tpl.x && px <= tpl.x + tpl.w && py >= tpl.y && py <= tpl.y + tpl.h) {
            return 'move';
        }

        return null;
    }
};