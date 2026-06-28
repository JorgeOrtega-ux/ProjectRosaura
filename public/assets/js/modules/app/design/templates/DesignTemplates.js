// public/assets/js/modules/app/DesignTemplates.js
import { ApiRoutes } from '../../../../core/api/ApiRoutes.js';
import { showMessage } from '../../../../core/utils/uiUtils.js';

export const DesignTemplates = {
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
            container.innerHTML = `<p class="component-empty-text component-empty-text--grid">${__('txt_no_templates')}</p>`;
            this.updateTemplateUI();
            return;
        }

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

    async handleFileUpload(e) {
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const btnUpload = document.querySelector('[data-action="triggerTemplateUpload"]');
        if (btnUpload) {
            btnUpload.classList.add('disabled-interactive');
            btnUpload.innerHTML = `<span class="material-symbols-rounded icon-spin-slow">autorenew</span> ${__('btn_uploading')}`;
        }

        const formData = new FormData();
        formData.append('file', file);

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
                btnUpload.innerHTML = `<span class="material-symbols-rounded">cloud_upload</span> ${__('btn_upload_library')}`;
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
        const btnDel = document.querySelector('[data-ref="btn-template-delete"]');
        const divider = document.querySelector('[data-ref="template-actions-divider"]');

        if (this.activeTemplateId) {
            const tpl = this.templates.find(t => t.id === this.activeTemplateId);
            if (btnLock && btnDel && divider && tpl) {
                btnLock.classList.remove('disabled');
                btnDel.classList.remove('disabled');
                divider.classList.remove('disabled');
                
                const iconLock = btnLock.querySelector('.material-symbols-rounded');
                if (iconLock) {
                    iconLock.textContent = tpl.locked ? 'lock' : 'lock_open';
                }
            }
        } else {
            if (btnLock) btnLock.classList.add('disabled');
            if (btnDel) btnDel.classList.add('disabled');
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