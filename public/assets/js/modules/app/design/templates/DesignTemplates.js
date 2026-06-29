// public/assets/js/modules/app/design/templates/DesignTemplates.js
import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';

export const DesignTemplates = {
    
    // ==========================================
    // CONTROL DE MODALES VÍA DIALOGSYSTEM
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

        // 2. Abrir Modal de Transmitir
        const btnOpenStartLive = e.target.closest('[data-action="openStartLiveModal"]');
        if (btnOpenStartLive) {
            e.preventDefault();
            if (window.dialogSystem && this.activeTemplateId) {
                const tpl = this.templates.find(t => t.id === this.activeTemplateId);
                const data = {
                    isActive: this.liveShareStatus === 'owner',
                    code: this.liveShareCode || '...',
                    x: tpl.x,
                    y: tpl.y,
                    opacity: tpl.opacity
                };
                
                window.dialogSystem.show('startLiveShare', data).then(res => {
                    // Limpieza de eventos SOLO cuando el modal se cierra por completo (botón Cerrar / Fondo / Escape)
                    if (this.uiLiveInputX) this.uiLiveInputX.removeEventListener('change', this.handleLiveInputBound);
                    if (this.uiLiveInputY) this.uiLiveInputY.removeEventListener('change', this.handleLiveInputBound);
                    if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.removeEventListener('input', this.handleLiveInputBound);
                    this.uiLiveInputX = null;
                    this.uiLiveInputY = null;
                    this.uiLiveInputOpacity = null;
                });

                // Attach de listeners a los nuevos inputs creados por DialogSystem
                setTimeout(() => {
                    this.uiLiveInputX = document.querySelector('[data-ref="live-input-x"]');
                    this.uiLiveInputY = document.querySelector('[data-ref="live-input-y"]');
                    this.uiLiveInputOpacity = document.querySelector('[data-ref="live-input-opacity"]');
                    
                    if (this.uiLiveInputX) this.uiLiveInputX.addEventListener('change', this.handleLiveInputBound);
                    if (this.uiLiveInputY) this.uiLiveInputY.addEventListener('change', this.handleLiveInputBound);
                    if (this.uiLiveInputOpacity) this.uiLiveInputOpacity.addEventListener('input', this.handleLiveInputBound);
                }, 100);
            }
            return true;
        }

        // 3. Procesar clic en el Botón "Unirse" sin que el Modal se cierre automáticamente
        const btnSubmitJoinLive = e.target.closest('[data-action="submitJoinLive"]');
        if (btnSubmitJoinLive) {
            e.preventDefault();
            const input = document.querySelector('[data-ref="live-join-code-modal"]');
            
            if (input && input.value.trim() !== '') {
                const code = input.value.trim().toUpperCase();
                
                // Mostrar estado de carga en el botón
                const originalText = btnSubmitJoinLive.innerHTML;
                btnSubmitJoinLive.innerHTML = '<span class="component-spinner component-spinner--small" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Uniendo...';
                btnSubmitJoinLive.classList.add('disabled-interactive');
                
                const attemptJoin = async () => {
                    try {
                        let success = false;
                        if (typeof this.joinLiveImageSession === 'function') {
                            success = await this.joinLiveImageSession(code);
                        }
                        
                        if (success) {
                            // Cierra el modal solo si logró unirse exitosamente
                            if (window.dialogSystem) window.dialogSystem.closeCurrent(true);
                        } else {
                            // Falló, restaura el botón y deja el modal abierto
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

        // 4. Iniciar Transmisión desde dentro del Modal
        const btnStartLive = e.target.closest('[data-action="startLive"]');
        if (btnStartLive) {
            e.preventDefault();
            if (typeof this.startLiveShare === 'function') {
                const originalText = btnStartLive.innerHTML;
                btnStartLive.innerHTML = '<span class="component-spinner component-spinner--small" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Iniciando...';
                btnStartLive.classList.add('disabled-interactive');

                const attemptStart = async () => {
                    const success = await this.startLiveShare();
                    
                    if (success) {
                        const alert = document.querySelector('[data-ref="live-share-active-alert"]');
                        const codeDisplay = document.querySelector('[data-ref="live-share-code"]');
                        const btnStop = document.querySelector('[data-action="stopLive"]');
                        
                        if (alert) { alert.style.display = 'block'; alert.classList.add('active'); }
                        if (codeDisplay) codeDisplay.textContent = this.liveShareCode;
                        
                        btnStartLive.style.display = 'none';
                        if (btnStop) btnStop.style.display = 'flex';
                    }
                    
                    btnStartLive.innerHTML = originalText;
                    btnStartLive.classList.remove('disabled-interactive');
                };
                
                attemptStart();
            }
            return true;
        }

        // 5. Detener Transmisión desde dentro del Modal
        const btnStopLive = e.target.closest('[data-action="stopLive"]');
        if (btnStopLive) {
            e.preventDefault();
            if (typeof this.stopLiveShare === 'function') {
                this.stopLiveShare();
                
                // Actualizar la interfaz del modal sin cerrarlo
                const alert = document.querySelector('[data-ref="live-share-active-alert"]');
                const codeDisplay = document.querySelector('[data-ref="live-share-code"]');
                const btnStart = document.querySelector('[data-action="startLive"]');
                
                if (alert) { alert.style.display = 'none'; alert.classList.remove('active'); }
                if (codeDisplay) codeDisplay.textContent = '...';
                
                btnStopLive.style.display = 'none';
                if (btnStart) btnStart.style.display = 'flex';
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