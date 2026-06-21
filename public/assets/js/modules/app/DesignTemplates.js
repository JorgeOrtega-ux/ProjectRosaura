// public/assets/js/modules/app/DesignTemplates.js
import { ApiRoutes } from '../../core/api/ApiRoutes.js';
import { showMessage } from '../../core/utils/uiUtils.js';

export const DesignTemplates = {
    async loadUserLibrary() {
        if (this.isSpectator || this.isSnapshotMode) return;
        try {
            const response = await this.api.post(ApiRoutes.Canvases.GetTemplates, {});
            if (response.success && response.data) {
                this.renderUserLibraryDOM(response.data);
            }
        } catch (error) {
            console.error("Error al cargar la librería de plantillas:", error);
        }
    },

    renderUserLibraryDOM(templates) {
        const container = document.querySelector('[data-ref="user-templates-grid"]');
        if (!container) return;

        container.innerHTML = '';
        if (templates.length === 0) {
            container.innerHTML = '<p class="component-empty-text" style="grid-column: span 2; text-align: center; opacity: 0.5; font-size: 0.8rem; padding: 10px 0;">No tienes plantillas en tu nube.</p>';
            return;
        }

        templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'component-library-card';
            card.style.position = 'relative';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.cursor = 'pointer';
            card.style.border = '2px solid transparent';
            
            const img = document.createElement('img');
            img.src = tpl.file_path;
            img.alt = 'Plantilla guardada';
            img.style.width = '100%';
            img.style.height = '70px';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            img.setAttribute('data-action', 'addTemplateToCanvas');
            img.setAttribute('data-url', tpl.file_path);

            const btnDel = document.createElement('button');
            btnDel.className = 'component-button component-button--icon component-button--danger';
            btnDel.style.position = 'absolute';
            btnDel.style.top = '4px';
            btnDel.style.right = '4px';
            btnDel.style.width = '24px';
            btnDel.style.height = '24px';
            btnDel.style.minHeight = '24px';
            btnDel.style.padding = '0';
            btnDel.innerHTML = '<span class="material-symbols-rounded" style="font-size: 14px;">delete</span>';
            btnDel.setAttribute('data-action', 'deleteServerTemplate');
            btnDel.setAttribute('data-id', tpl.id);

            card.appendChild(img);
            card.appendChild(btnDel);
            container.appendChild(card);
        });
    },

    async handleFileUpload(e) {
        if (this.isSpectator || this.timelapseActive || this.isResetLocked) return;
        const file = e.target.files[0];
        if (!file) return;

        const btnUpload = document.querySelector('[data-action="triggerTemplateUpload"]');
        if (btnUpload) {
            btnUpload.classList.add('disabled-interactive');
            btnUpload.innerHTML = '<span class="material-symbols-rounded icon-spin-slow">autorenew</span> Subiendo...';
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await this.api.postForm(ApiRoutes.Canvases.UploadTemplate, formData);

            if (response.success) {
                showMessage('Plantilla subida a la nube exitosamente.', 'success');
                await this.loadUserLibrary();
            } else {
                showMessage(response.message || 'Error al subir la plantilla.', 'error');
            }
        } catch (error) {
            console.error("Error en ApiService:", error);
            showMessage('Error de red al intentar subir la plantilla.', 'error');
        } finally {
            this.fileInput.value = '';
            if (btnUpload) {
                btnUpload.classList.remove('disabled-interactive');
                btnUpload.innerHTML = '<span class="material-symbols-rounded">cloud_upload</span> Subir a mi librería';
            }
        }
    },

    addTemplateFromLibrary(url) {
        const img = new Image();
        img.onload = () => {
            const id = 'tpl_' + Date.now();
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

            this.renderTemplateList(); 
            this.toggleTemplate(id); 
            showMessage('Plantilla agregada al lienzo.', 'success');
        };
        img.onerror = () => {
            showMessage('Error al descargar la imagen de la librería.', 'error');
        };
        img.src = url;
    },

    async deleteServerTemplate(id) {
        const btn = document.querySelector(`[data-action="deleteServerTemplate"][data-id="${id}"]`);
        if (btn) btn.classList.add('disabled-interactive');

        try {
            const response = await this.api.post(ApiRoutes.Canvases.DeleteTemplate, { id: id });
            if (response.success) {
                showMessage(response.message, 'success');
                await this.loadUserLibrary();
            } else {
                showMessage(response.message || 'Error al eliminar', 'error');
                if (btn) btn.classList.remove('disabled-interactive');
            }
        } catch (error) {
            console.error(error);
            showMessage('Error de conexión', 'error');
            if (btn) btn.classList.remove('disabled-interactive');
        }
    },

    renderTemplateList() {
        const container = document.querySelector('[data-ref="template-list"]');
        if (!container) return;

        container.innerHTML = '';
        this.templates.forEach(tpl => {
            const card = document.createElement('div');
            card.className = `component-template-card ${this.activeTemplateId === tpl.id ? 'active' : ''}`;
            card.setAttribute('data-action', 'selectTemplate');
            card.setAttribute('data-id', tpl.id);

            const img = document.createElement('img');
            img.src = tpl.src;
            img.alt = __('alt_template');
            card.appendChild(img);

            const actions = document.createElement('div');
            actions.className = 'component-template-actions';

            const btnLock = document.createElement('button');
            btnLock.className = 'component-template-action-btn';
            btnLock.setAttribute('data-action', 'toggleTemplateLock');
            btnLock.setAttribute('title', tpl.locked ? __('title_unlock_move') : __('title_lock_paint'));

            const iconLock = document.createElement('span');
            iconLock.className = 'material-symbols-rounded';
            iconLock.textContent = tpl.locked ? 'lock' : 'lock_open';
            btnLock.appendChild(iconLock);

            const btnDel = document.createElement('button');
            btnDel.className = 'component-template-action-btn';
            btnDel.setAttribute('data-action', 'deleteTemplate');
            btnDel.setAttribute('title', __('title_delete'));

            const iconDel = document.createElement('span');
            iconDel.className = 'material-symbols-rounded';
            iconDel.textContent = 'delete';
            btnDel.appendChild(iconDel);

            actions.appendChild(btnLock);
            actions.appendChild(btnDel);

            card.appendChild(actions);
            container.appendChild(card);
        });
    },

    toggleTemplate(id) {
        if (this.activeTemplateId === id) {
            this.activeTemplateId = null;
        } else {
            this.activeTemplateId = id;
        }
        this.renderTemplateList();
        this.requestRender();
    },

    toggleLockTemplate(id) {
        const tpl = this.templates.find(t => t.id === id);
        if (tpl) {
            tpl.locked = !tpl.locked;
            this.renderTemplateList();
            this.requestRender();
        }
    },

    deleteTemplate(id) {
        this.templates = this.templates.filter(t => t.id !== id);
        if (this.activeTemplateId === id) this.activeTemplateId = null;
        this.renderTemplateList();
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