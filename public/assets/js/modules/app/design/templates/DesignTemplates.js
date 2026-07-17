import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';

export const DesignTemplates = {

    handleTemplateModals(e) {

        const btnOpenJoinLive = e.target.closest('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            e.preventDefault();
            if (this.liveShareStatus === 'owner') {
                showMessage(__('err_cannot_join_while_streaming'), 'warning');
                return true;
            }
            if (window.dialogSystem) {
                window.dialogSystem.show('joinLiveShare');
            }
            return true;
        }

        const btnToggleLiveMenu = e.target.closest('[data-menu-target="menu-live"]');
        if (btnToggleLiveMenu) {
            if (btnToggleLiveMenu.getAttribute('data-requires-premium') === 'true') {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = (window.AppBasePath || '') + '/store';
                return true;
            }

            if (this.activeTemplateId) {
                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                if (!this.uiLiveInputX) {
                    this.uiLiveInputX = document.querySelector('[data-ref="val_live_x"]');
                    this.uiLiveInputY = document.querySelector('[data-ref="val_live_y"]');
                    this.uiLiveInputOpacity = document.querySelector('[data-ref="val_live_opacity"]');
                }

                if (this.uiLiveInputX && tpl) {
                    this.uiLiveInputX.setAttribute('data-val', tpl.x);
                    this.uiLiveInputX.textContent = tpl.x;
                    
                    this.uiLiveInputY.setAttribute('data-val', tpl.y);
                    this.uiLiveInputY.textContent = tpl.y;
                    
                    this.uiLiveInputOpacity.setAttribute('data-val', tpl.opacity);
                    this.uiLiveInputOpacity.textContent = `${Math.round(tpl.opacity * 100)}%`;
                }
            }
            
        }

        const btnAdjustLive = e.target.closest('[data-action="adjustLiveTemplate"]');
        if (btnAdjustLive && this.activeTemplateId) {
            e.preventDefault();
            const field = btnAdjustLive.getAttribute('data-field');
            let step = parseFloat(btnAdjustLive.getAttribute('data-step'));
            const min = btnAdjustLive.hasAttribute('data-min') ? parseFloat(btnAdjustLive.getAttribute('data-min')) : -Infinity;
            const max = btnAdjustLive.hasAttribute('data-max') ? parseFloat(btnAdjustLive.getAttribute('data-max')) : Infinity;
            
            const valRef = document.querySelector(`[data-ref="val_${field}"]`);
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            
            if (valRef && tpl) {
                let currentVal = parseFloat(valRef.getAttribute('data-val'));
                let newVal = currentVal + step;
                
                if (field === 'live_x') {
                    newVal = Math.round(newVal);
                    newVal = Math.max(0, Math.min(newVal, this.boardWidth - tpl.w));
                    tpl.x = newVal;
                } else if (field === 'live_y') {
                    newVal = Math.round(newVal);
                    newVal = Math.max(0, Math.min(newVal, this.boardHeight - tpl.h));
                    tpl.y = newVal;
                } else if (field === 'live_opacity') {
                    newVal = Math.round(newVal * 10) / 10;
                    if (newVal < 0.1) newVal = 0.1;
                    if (newVal > 1) newVal = 1;
                    tpl.opacity = newVal;
                }
                
                valRef.setAttribute('data-val', newVal);
                valRef.textContent = field === 'live_opacity' ? `${Math.round(newVal * 100)}%` : newVal;
                
                this.requestRender();
                if (this.liveShareStatus === 'owner' && typeof this.emitLiveImageUpdate === 'function') {
                    this.emitLiveImageUpdate();
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
                
                const originalText = btnSubmitJoinLive.innerHTML;
                btnSubmitJoinLive.innerHTML = '<span class="component-spinner component-spinner--small"></span> Uniendo...';
                btnSubmitJoinLive.classList.add('disabled-interactive');
                
                const attemptJoin = async () => {
                    try {
                        let success = false;
                        if (typeof this.joinLiveImageSession === 'function') {
                            success = await this.joinLiveImageSession(code);
                        }
                        
                        if (success) {
                            if (window.dialogSystem) window.dialogSystem.closeCurrent(true);
                            
                            const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                            if (btnOpenJoinLive) {
                                btnOpenJoinLive.classList.add('component-color-indicator');
                                btnOpenJoinLive.style.setProperty('--active-color', 'var(--color-danger, #ef4444)');
                            }
                        } else {
                            btnSubmitJoinLive.innerHTML = originalText;
                            btnSubmitJoinLive.classList.remove('disabled-interactive');
                        }
                    } catch (error) {
                        showMessage(error.message || window.__('err_join'), 'error');
                        btnSubmitJoinLive.innerHTML = originalText;
                        btnSubmitJoinLive.classList.remove('disabled-interactive');
                    }
                };
                
                attemptJoin();
                
            } else {
                showMessage(__('err_valid_code'), 'warning');
            }
            return true;
        }

        const btnStartLive = e.target.closest('[data-action="startLive"]');
        if (btnStartLive) {
            e.preventDefault();
            if (typeof this.startLiveShare === 'function') {
                const originalText = btnStartLive.innerHTML;
                btnStartLive.innerHTML = '<span class="component-spinner component-spinner--small"></span> Iniciando...';
                btnStartLive.classList.add('disabled-interactive');

                const attemptStart = async () => {
                    const success = await this.startLiveShare();
                    
                    if (success) {
                        const alert = document.querySelector('[data-ref="live-share-active-alert"]');
                        const codeDisplay = document.querySelector('[data-ref="live-share-code"]');
                        const btnStop = document.querySelector('[data-action="stopLive"]');
                        
                        if (alert) { alert.classList.remove('disabled'); alert.classList.add('active'); }
                        if (codeDisplay) codeDisplay.textContent = this.liveShareCode;
                        
                        btnStartLive.classList.add('disabled');
                        if (btnStop) btnStop.classList.remove('disabled');
                        
                        const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                        if (btnOpenJoinLive) {
                            btnOpenJoinLive.classList.add('disabled-interactive');
                            btnOpenJoinLive.setAttribute('title', window.__('err_cannot_join_while_streaming'));
                        }
                        
                        const btnToggleLiveMenu = document.querySelector('[data-menu-target="menu-live"]');
                        if (btnToggleLiveMenu) {
                            btnToggleLiveMenu.classList.add('component-color-indicator');
                            btnToggleLiveMenu.style.setProperty('--active-color', 'var(--color-danger, #ef4444)');
                        }
                    }
                    
                    btnStartLive.innerHTML = originalText;
                    btnStartLive.classList.remove('disabled-interactive');
                };
                
                attemptStart();
            }
            return true;
        }

        const btnStopLive = e.target.closest('[data-action="stopLive"]');
        if (btnStopLive) {
            e.preventDefault();
            if (typeof this.stopLiveShare === 'function') {
                this.stopLiveShare();
                
                const alert = document.querySelector('[data-ref="live-share-active-alert"]');
                const codeDisplay = document.querySelector('[data-ref="live-share-code"]');
                const btnStart = document.querySelector('[data-action="startLive"]');
                
                if (alert) { alert.classList.add('disabled'); alert.classList.remove('active'); }
                if (codeDisplay) codeDisplay.textContent = '...';
                
                btnStopLive.classList.add('disabled');
                if (btnStart) btnStart.classList.remove('disabled');

                const btnOpenJoinLive = document.querySelector('[data-action="openJoinLiveModal"]');
                if (btnOpenJoinLive) {
                    btnOpenJoinLive.classList.remove('disabled-interactive', 'disabled');
                    btnOpenJoinLive.removeAttribute('title');
                }

                const btnToggleLiveMenu = document.querySelector('[data-menu-target="menu-live"]');
                if (btnToggleLiveMenu) {
                    btnToggleLiveMenu.classList.remove('component-color-indicator');
                    btnToggleLiveMenu.style.removeProperty('--active-color');
                }
            }
            return true;
        }

        return false;
    },

    async loadUserLibrary() {
        if (this.isSpectator || this.isSnapshotMode) return;
        try {
            const response = await this.api.post(ApiRoutes.Canvases.GetTemplates, {}, this.abortController.signal);
            if (response.aborted) return;

            if (response.success && response.data) {
                this.renderUserLibraryDOM(response.data);
            }
        } catch (error) {
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
            img.className = 'component-library-card__image';
            
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
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const btnUpload = document.querySelector('[data-action="triggerTemplateUpload"]');
        if (btnUpload) {
            btnUpload.classList.add('disabled-interactive');
            btnUpload.innerHTML = `<span class="material-symbols-rounded icon-spin-slow">autorenew</span> ${window.__('uploading')}...`;
        }

        const compressedFile = await this._compressTemplateImage(file);

        const formData = new FormData();
        formData.append('file', compressedFile);

        try {
            const response = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData, this.abortController.signal);
            if (response.aborted) return;

            if (response.success) {
                showMessage(__('msg_template_uploaded'), 'success');
                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            showMessage(__('err_network_upload'), 'error');
        } finally {
            this.fileInput.value = '';
            if (btnUpload) {
                btnUpload.classList.remove('disabled-interactive');
                btnUpload.innerHTML = `<span class="material-symbols-rounded">cloud_upload</span> ${window.__('upload_to_library')}`;
            }
        }
    },

    addTemplateFromLibrary(url) {
        const existing = this.templates.find(t => t.id === url);
        if (existing) {
            this.toggleTemplate(url);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const id = url; 
            const targetW = this.boardWidth * 0.5;
            const targetH = this.boardHeight * 0.5;
            const scale = Math.min(targetW / img.width, targetH / img.height);
            
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            
            const x = Math.round((this.boardWidth - w) / 2);
            const y = Math.round((this.boardHeight - h) / 2);

            this.templates.push({
                id, img,
                src: url,
                x, y, w, h,
                locked: false,
                opacity: 0.5 
            });

            this.toggleTemplate(id); 
            showMessage(__('msg_template_added'), 'success');
        };
        img.onerror = () => {
            showMessage(__('err_download_library_image'), 'error');
        };
        img.src = url;
    },

    async deleteServerTemplate(id) {
        const btn = document.querySelector(`[data-action="deleteServerTemplate"][data-id="${id}"]`);
        if (btn) btn.classList.add('disabled-interactive');

        let templateFilePath = null;
        if (btn && btn.parentElement) {
            const img = btn.parentElement.querySelector('img');
            if (img) templateFilePath = img.getAttribute('data-url');
        }

        try {
            const response = await this.api.post(ApiRoutes.Canvases.DeleteTemplate, { id: id }, this.abortController.signal);
            if (response.aborted) return;
            
            if (response.success) {
                showMessage(response.message, 'success');

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

                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
                if (btn) btn.classList.remove('disabled-interactive');
            }
        } catch (error) {
            showMessage(__('err_connection'), 'error');
            if (btn) btn.classList.remove('disabled-interactive');
        }
    },

    updateTemplateUI() {
        const cards = document.querySelectorAll('.component-library-card');
        cards.forEach(card => {
            const img = card.querySelector('img');
            if (img && img.getAttribute('data-url') === this.activeTemplateId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const btnLock = document.querySelector('[data-ref="btn-template-lock"]');
        const btnRotate = document.querySelector('[data-ref="btn-template-rotate"]');
        const btnPlazmar = document.querySelector('[data-ref="btn-template-plazmar"]');
        const btnDel = document.querySelector('[data-ref="btn-template-delete"]');
        const btnLive = document.querySelector('[data-ref="btn-start-live"]');
        const divider = document.querySelector('[data-ref="template-actions-divider"]');

        if (this.activeTemplateId) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (tpl) {
                if (btnLock) btnLock.classList.remove('disabled');
                if (btnRotate) btnRotate.classList.remove('disabled');
                if (btnPlazmar) btnPlazmar.classList.remove('disabled');
                if (btnDel) btnDel.classList.remove('disabled');
                if (btnLive) btnLive.classList.remove('disabled');
                if (divider) divider.classList.remove('disabled');
                
                if (btnLock) {
                    const iconLock = btnLock.querySelector('.material-symbols-rounded');
                    if (iconLock) {
                        iconLock.textContent = tpl.locked ? 'lock' : 'lock_open';
                    }
                }
            }
        } else {
            if (btnLock) btnLock.classList.add('disabled');
            if (btnRotate) btnRotate.classList.add('disabled');
            if (btnPlazmar) btnPlazmar.classList.add('disabled');
            if (btnDel) btnDel.classList.add('disabled');
            if (btnLive) btnLive.classList.add('disabled');
            if (divider) divider.classList.add('disabled');
        }
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

    async plazmarTemplate() {
        if (!this.activeTemplateId) return;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl) return;

        if (!this.canvasId) return;
        
        const btn = document.querySelector('[data-ref="btn-template-plazmar"]');
        if (btn) btn.classList.add('loading');

        try {
            const res = await this.api.post(ApiRoutes.Canvases.PlazmarImagen, {
                canvas_id: this.canvasId,
                url: tpl.src,
                x: Math.round(tpl.x),
                y: Math.round(tpl.y),
                w: Math.round(tpl.w),
                h: Math.round(tpl.h),
                angle: tpl.angle || 0
            });

            if (res && res.success) {
                if (typeof showMessage === 'function') showMessage(res.message || 'Imagen plasmada correctamente', 'success');
            } else {
                if (typeof showMessage === 'function') showMessage(res?.message || 'Error al plasmar la imagen', 'error');
            }
        } catch (err) {
            console.error('Error al plasmar imagen', err);
            if (typeof showMessage === 'function') showMessage('Error al plasmar la imagen', 'error');
        } finally {
            if (btn) btn.classList.remove('loading');
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