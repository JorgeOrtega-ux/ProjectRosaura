// public/assets/js/modules/app/design/templates/DesignTemplates.js
import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';

export const DesignTemplates = {
    
    // ==========================================
    // CONTROL DE MODALES VÍA DIALOGSYSTEM Y MENÚS
    // ==========================================
    handleTemplateModals(e) {
        
        // 1. Abrir Modal de Unirse
        const btnOpenJoinLive = e.target.closest('[data-action="openJoinLiveModal"]');
        if (btnOpenJoinLive) {
            e.preventDefault();
            if (window.dialogSystem) {
                window.dialogSystem.show('joinLiveShare');
            }
            return true;
        }

        // 2. Interceptar el toggle del nuevo menú y setear valores
        const btnToggleLiveMenu = e.target.closest('[data-menu-target="menu-live"]');
        if (btnToggleLiveMenu) {
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
            // Retornamos falso para permitir que ModuleMainOptions o quien maneje el menu lo despliegue visualmente
        }
        
        // 3. Interceptar click en los botones del inline-control de Live Template
        const btnAdjustLive = e.target.closest('[data-action="adjustLiveTemplate"]');
        if (btnAdjustLive && this.activeTemplateId) {
            e.preventDefault();
            const field = btnAdjustLive.getAttribute('data-field');
            let step = parseFloat(btnAdjustLive.getAttribute('data-step'));
            const min = btnAdjustLive.hasAttribute('data-min') ? parseFloat(btnAdjustLive.getAttribute('data-min')) : -Infinity;
            const max = btnAdjustLive.hasAttribute('data-max') ? parseFloat(btnAdjustLive.getAttribute('data-max')) : Infinity;
            
            const valRef = document.querySelector(`[data-ref="val_${field}"]`);
            if (valRef) {
                let currentVal = parseFloat(valRef.getAttribute('data-val'));
                let newVal = currentVal + step;
                if (newVal < min) newVal = min;
                if (newVal > max) newVal = max;
                
                if (field === 'live_opacity') {
                    newVal = Math.round(newVal * 10) / 10;
                } else {
                    newVal = Math.round(newVal);
                }
                
                valRef.setAttribute('data-val', newVal);
                valRef.textContent = field === 'live_opacity' ? `${Math.round(newVal * 100)}%` : newVal;
                
                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                if (tpl) {
                    if (field === 'live_x') tpl.x = newVal;
                    if (field === 'live_y') tpl.y = newVal;
                    if (field === 'live_opacity') tpl.opacity = newVal;
                    
                    this.requestRender();
                    if (this.liveShareStatus === 'owner' && typeof this.emitLiveImageUpdate === 'function') {
                        this.emitLiveImageUpdate();
                    }
                }
            }
            return true;
        }

        // 4. Procesar clic en el Botón "Unirse" sin que el Modal se cierre automáticamente
        const btnSubmitJoinLive = e.target.closest('[data-action="submitJoinLive"]');
        if (btnSubmitJoinLive) {
            e.preventDefault();
            const input = document.querySelector('[data-ref="live-join-code-modal"]');
            
            if (input && input.value.trim() !== '') {
                const code = input.value.trim().toUpperCase();
                
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
                        } else {
                            btnSubmitJoinLive.innerHTML = originalText;
                            btnSubmitJoinLive.classList.remove('disabled-interactive');
                        }
                    } catch (error) {
                        showMessage(error.message || 'Error al unirse', 'error');
                        btnSubmitJoinLive.innerHTML = originalText;
                        btnSubmitJoinLive.classList.remove('disabled-interactive');
                    }
                };
                
                attemptJoin();
                
            } else {
                showMessage(__('err_valid_code') || 'Código inválido', 'warning');
            }
            return true;
        }

        // 5. Iniciar Transmisión desde menú
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
                    }
                    
                    btnStartLive.innerHTML = originalText;
                    btnStartLive.classList.remove('disabled-interactive');
                };
                
                attemptStart();
            }
            return true;
        }

        // 6. Detener Transmisión desde menú
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
            }
            return true;
        }

        return false;
    },

    // ==========================================
    // LÓGICA DE PLANTILLAS Y LIBRERÍA
    // ==========================================
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

        container.innerHTML = '';
        if (templates.length === 0) {
            container.innerHTML = `<p class="component-empty-text component-empty-text--grid">${__('txt_no_templates') || 'No hay plantillas'}</p>`;
            this.updateTemplateUI();
            return;
        }

        templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'component-library-card';
            
            const img = document.createElement('img');
            img.src = tpl.file_path;
            img.alt = __('alt_saved_template') || 'Plantilla';
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

    async handleFileUpload(e) {
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const btnUpload = document.querySelector('[data-action="triggerTemplateUpload"]');
        if (btnUpload) {
            btnUpload.classList.add('disabled-interactive');
            btnUpload.innerHTML = `<span class="material-symbols-rounded icon-spin-slow">autorenew</span> Subiendo...`;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData, this.abortController.signal);
            if (response.aborted) return;

            if (response.success) {
                showMessage(__('msg_template_uploaded') || 'Plantilla subida', 'success');
                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
            }
        } catch (error) {
            showMessage(__('err_network_upload') || 'Error de red', 'error');
        } finally {
            this.fileInput.value = '';
            if (btnUpload) {
                btnUpload.classList.remove('disabled-interactive');
                btnUpload.innerHTML = `<span class="material-symbols-rounded">cloud_upload</span> Subir a mi librería`;
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
            showMessage(__('msg_template_added') || 'Plantilla agregada', 'success');
        };
        img.onerror = () => {
            showMessage(__('err_download_library_image') || 'Error al descargar imagen', 'error');
        };
        img.src = url;
    },

    async deleteServerTemplate(id) {
        const btn = document.querySelector(`[data-action="deleteServerTemplate"][data-id="${id}"]`);
        if (btn) btn.classList.add('disabled-interactive');

        try {
            const response = await this.api.post(ApiRoutes.Canvases.DeleteTemplate, { id: id }, this.abortController.signal);
            if (response.aborted) return;
            
            if (response.success) {
                showMessage(response.message, 'success');
                await this.loadUserLibrary();
            } else {
                showMessage(response.message, 'error');
                if (btn) btn.classList.remove('disabled-interactive');
            }
        } catch (error) {
            showMessage(__('err_connection') || 'Error de conexión', 'error');
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
        const btnDel = document.querySelector('[data-ref="btn-template-delete"]');
        const btnLive = document.querySelector('[data-ref="btn-start-live"]');
        const divider = document.querySelector('[data-ref="template-actions-divider"]');

        if (this.activeTemplateId) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (btnLock && btnDel && divider && btnLive && tpl) {
                btnLock.classList.remove('disabled');
                btnDel.classList.remove('disabled');
                btnLive.classList.remove('disabled');
                divider.classList.remove('disabled');
                
                const iconLock = btnLock.querySelector('.material-symbols-rounded');
                if (iconLock) {
                    iconLock.textContent = tpl.locked ? 'lock' : 'lock_open';
                }
            }
        } else {
            if (btnLock) btnLock.classList.add('disabled');
            if (btnDel) btnDel.classList.add('disabled');
            if (btnLive) btnLive.classList.add('disabled');
            if (divider) divider.classList.add('disabled');
        }
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

    deleteTemplate() {
        if (!this.activeTemplateId) return;
        this.templates = this.templates.filter(t => t.id !== this.activeTemplateId);
        this.activeTemplateId = null;
        this.updateTemplateUI();
        this.requestRender();
    },

    checkTemplateHit(ex, ey) {
        if (!this.activeTemplateId) return null;
        const tpl = this.templates.find(t => t.id === this.activeTemplateId);
        if (!tpl || tpl.locked) return null; 

        const handleSize = 16 / this.transform.scale;
        const hs = handleSize / 2;

        const corners = [
            { id: 'resize-tl', x: tpl.x, y: tpl.y },
            { id: 'resize-tr', x: tpl.x + tpl.w, y: tpl.y },
            { id: 'resize-bl', x: tpl.x, y: tpl.y + tpl.h },
            { id: 'resize-br', x: tpl.x + tpl.w, y: tpl.y + tpl.h }
        ];

        for (const c of corners) {
            if (ex >= c.x - hs && ex <= c.x + hs && ey >= c.y - hs && ey <= c.y + hs) {
                return c.id;
            }
        }

        if (ex >= tpl.x && ex <= tpl.x + tpl.w && ey >= tpl.y && ey <= tpl.y + tpl.h) {
            return 'move';
        }

        return null;
    }
};