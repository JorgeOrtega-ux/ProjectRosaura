import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber, escapeHTML, updateRangeFill } from '../../../core/utils/uiUtils.js';
import { AvatarUtils } from '../../../core/utils/AvatarUtils.js';

export class PublicationViewerController {
    constructor() {
        this.api = new ApiService();
        this.pubUuid = null;
        this.imageUrl = null;
        this.boardWidth = 64;
        this.boardHeight = 64;

        this.canvas = null;
        this.ctx = null;
        this.imageObj = null;

        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.showGrid = true;
        this.needsRender = false;
        this.animId = null;

        this.commentsLoaded = false;
        this.comments = [];

        this.abortController = null;
        this.handleWheelBound = this.handleWheel.bind(this);
        this.handleMouseDownBound = this.handleMouseDown.bind(this);
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleMouseUpBound = this.handleMouseUp.bind(this);
        this.handleResizeBound = this.handleResize.bind(this);
        this.renderBound = this.render.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleInputBound = this.handleInput.bind(this);
    }

    async init() {
        this.abortController = new AbortController();
        const root = document.querySelector('.component-publication-viewer-page');
        if (!root) return;

        this.pubUuid = root.getAttribute('data-publication-uuid');
        this.imageUrl = root.getAttribute('data-image-url');
        this.boardWidth = parseInt(root.getAttribute('data-width') || '64', 10);
        this.boardHeight = parseInt(root.getAttribute('data-height') || '64', 10);

        this.canvas = document.querySelector('[data-ref="publication-canvas"]');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvas();
            await this.loadImage();
            this.centerArtwork();
            this.startRenderLoop();
        }

        this.bindEvents();
        this.updateZoomUI();
        this.loadComments();
    }

    destroy() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }

        window.removeEventListener('resize', this.handleResizeBound);
        if (this.canvas) {
            this.canvas.removeEventListener('wheel', this.handleWheelBound);
            this.canvas.removeEventListener('mousedown', this.handleMouseDownBound);
            window.removeEventListener('mousemove', this.handleMouseMoveBound);
            window.removeEventListener('mouseup', this.handleMouseUpBound);
        }
        document.removeEventListener('click', this.handleClickBound);
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('input', this.handleInputBound);
    }

    setupCanvas() {
        this.handleResize();
    }

    handleResize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        if (this.ctx) {
            this.ctx.imageSmoothingEnabled = false;
        }
        this.requestRender();
    }

    async loadImage() {
        if (!this.imageUrl) return;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.imageObj = img;
                this.boardWidth = img.naturalWidth || this.boardWidth;
                this.boardHeight = img.naturalHeight || this.boardHeight;
                this.requestRender();
                resolve();
            };
            img.onerror = () => {
                resolve();
            };
            img.src = this.imageUrl;
        });
    }

    getZoomBounds() {
        return { minScale: 0.1, maxScale: 64.0 };
    }

    centerArtwork() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const viewW = this.canvas.width / dpr;
        const viewH = this.canvas.height / dpr;

        const scaleX = (viewW * 0.7) / this.boardWidth;
        const scaleY = (viewH * 0.7) / this.boardHeight;
        const scale = Math.max(1, Math.min(scaleX, scaleY));

        this.transform.scale = Math.round(scale);
        if (this.transform.scale < 1) this.transform.scale = scale;

        this.transform.x = Math.round((viewW - this.boardWidth * this.transform.scale) / 2);
        this.transform.y = Math.round((viewH - this.boardHeight * this.transform.scale) / 2);
        this.updateZoomUI();
        this.requestRender();
    }

    bindEvents() {
        window.addEventListener('resize', this.handleResizeBound);
        if (this.canvas) {
            this.canvas.addEventListener('wheel', this.handleWheelBound, { passive: false });
            this.canvas.addEventListener('mousedown', this.handleMouseDownBound);
            window.addEventListener('mousemove', this.handleMouseMoveBound);
            window.addEventListener('mouseup', this.handleMouseUpBound);
        }
        document.addEventListener('click', this.handleClickBound);
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('input', this.handleInputBound);
    }

    handleWheel(e) {
        e.preventDefault();
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const { minScale, maxScale } = this.getZoomBounds();
        const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
        const newScale = Math.max(minScale, Math.min(maxScale, this.transform.scale * zoomFactor));

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.updateZoomUI();
        this.requestRender();
    }

    handleMouseDown(e) {
        if (e.button !== 0 && e.button !== 1) return;
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };

        this.transform.x += dx;
        this.transform.y += dy;
        this.requestRender();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            const moduleEl = document.querySelector('[data-module="modulePublicationComments"]');
            if (moduleEl && !moduleEl.classList.contains('disabled')) {
                if (window.MainController && window.MainController.moduleManager) {
                    window.MainController.moduleManager.close(moduleEl);
                } else {
                    moduleEl.classList.add('disabled');
                    moduleEl.classList.remove('active');
                }
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.matches('[data-ref="input-comment"]')) {
                e.preventDefault();
                this.submitComment();
            }
        } else if ((e.key === 'c' || e.key === 'C') && !this.isTypingContext(e)) {
            if (window.MainController && window.MainController.moduleManager) {
                window.MainController.moduleManager.toggleMenuInModule('modulePublicationComments', 'menu-comments');
            }
        } else if ((e.key === 'g' || e.key === 'G') && !this.isTypingContext(e)) {
            this.showGrid = !this.showGrid;
            const gridBtn = document.querySelector('[data-action="toggleGrid"]');
            if (gridBtn) gridBtn.classList.toggle('active', this.showGrid);
            this.requestRender();
        }
    }

    isTypingContext(e) {
        const target = e.target;
        return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    }

    handleInput(e) {
        if (!e.target) return;

        if (e.target.type === 'range') {
            updateRangeFill(e.target);
        }

        const isZoomSlider = e.target.matches('[data-ref="footer-zoom-slider"]');
        if (isZoomSlider && this.canvas) {
            const t = parseFloat(e.target.value);
            const { minScale, maxScale } = this.getZoomBounds();
            const newScale = minScale * Math.pow(maxScale / minScale, t / 1000);

            if (newScale > 0 && this.transform) {
                const rect = this.canvas.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
                this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
                this.transform.scale = newScale;
                this.updateZoomUI();
                this.requestRender();
            }
        }

        if (e.target.matches('[data-ref="input-comment"]')) {
            const textarea = e.target;
            const chatBox = textarea.closest('.component-chat-box');
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 120);
            textarea.style.height = `${newHeight}px`;
            if (chatBox) {
                if (newHeight > 30) {
                    chatBox.classList.add('is-multiline');
                } else {
                    chatBox.classList.remove('is-multiline');
                }
            }
        }
    }

    requestRender() {
        this.needsRender = true;
    }

    startRenderLoop() {
        const loop = () => {
            if (this.needsRender) {
                this.render();
                this.needsRender = false;
            }
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const ctx = this.ctx;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

        ctx.imageSmoothingEnabled = false;

        const tx = Math.round(this.transform.x);
        const ty = Math.round(this.transform.y);
        const scale = this.transform.scale;
        const drawW = this.boardWidth * scale;
        const drawH = this.boardHeight * scale;

        // Draw background base
        ctx.fillStyle = '#18181b';
        ctx.fillRect(tx, ty, drawW, drawH);

        // Draw pixel art image
        if (this.imageObj) {
            ctx.drawImage(this.imageObj, tx, ty, drawW, drawH);
        }

        // Draw pixel grid when scale >= 12
        if (this.showGrid && scale >= 12) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let x = 0; x <= this.boardWidth; x++) {
                const gx = Math.round(tx + x * scale) + 0.5;
                ctx.moveTo(gx, ty);
                ctx.lineTo(gx, ty + drawH);
            }
            for (let y = 0; y <= this.boardHeight; y++) {
                const gy = Math.round(ty + y * scale) + 0.5;
                ctx.moveTo(tx, gy);
                ctx.lineTo(tx + drawW, gy);
            }
            ctx.stroke();
        }

        // Draw outer border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 0.5, ty + 0.5, drawW, drawH);

        ctx.restore();
    }

    updateZoomUI() {
        if (!this.transform) return;
        const { minScale, maxScale } = this.getZoomBounds();
        const currentScale = Math.max(minScale, Math.min(this.transform.scale, maxScale));
        const zoomPct = Math.round(currentScale * 100);

        const labelEl = document.querySelector('[data-ref="footer-zoom-label"]');
        const sliderEl = document.querySelector('[data-ref="footer-zoom-slider"]');

        if (labelEl) {
            labelEl.textContent = `${zoomPct}%`;
        }
        if (sliderEl && document.activeElement !== sliderEl) {
            const logRatio = Math.log(currentScale / minScale) / Math.log(maxScale / minScale);
            const sliderVal = Math.max(0, Math.min(1000, Math.round(logRatio * 1000)));
            sliderEl.value = sliderVal;
            updateRangeFill(sliderEl);
        }
    }

    stepZoom(direction = 1) {
        if (!this.transform || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const { minScale, maxScale } = this.getZoomBounds();

        const current = this.transform.scale;
        const presets = [0.1, 0.25, 0.333, 0.5, 0.667, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0, 20.0, 24.0, 30.0, 40.0, 50.0, 64.0];
        let newScale;

        if (direction > 0) {
            newScale = presets.find(p => p > current + 0.005) || (current * 1.25);
        } else {
            newScale = [...presets].reverse().find(p => p < current - 0.005) || (current * 0.8);
        }

        newScale = Math.max(minScale, Math.min(newScale, maxScale));
        this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;
        this.updateZoomUI();
        this.requestRender();
    }

    resetZoomFit() {
        this.centerArtwork();
    }

    handleClick(e) {
        // Zoom In
        if (e.target.closest('[data-action="zoomInStep"]') || e.target.closest('[data-action="zoomIn"]')) {
            this.stepZoom(1);
            return;
        }

        // Zoom Out
        if (e.target.closest('[data-action="zoomOutStep"]') || e.target.closest('[data-action="zoomOut"]')) {
            this.stepZoom(-1);
            return;
        }

        // Reset Zoom
        if (e.target.closest('[data-action="resetZoomFit"]') || e.target.closest('[data-action="resetZoom"]')) {
            this.resetZoomFit();
            return;
        }

        // Toggle Grid
        const gridBtn = e.target.closest('[data-action="toggleGrid"]');
        if (gridBtn) {
            this.showGrid = !this.showGrid;
            gridBtn.classList.toggle('active', this.showGrid);
            this.requestRender();
            return;
        }

        // Submit comment
        if (e.target.closest('[data-action="submitComment"]')) {
            this.submitComment();
            return;
        }

        // Delete comment
        const delCommentBtn = e.target.closest('[data-action="deleteComment"]');
        if (delCommentBtn) {
            const commentUuid = delCommentBtn.getAttribute('data-comment-uuid');
            this.deleteComment(commentUuid, delCommentBtn);
            return;
        }

        // Like toggle
        const likeBtn = e.target.closest('[data-action="togglePublicationLike"]');
        if (likeBtn) {
            this.toggleLike(likeBtn);
            return;
        }

        // Download
        if (e.target.closest('[data-action="downloadArtwork"]')) {
            this.downloadArtwork();
            return;
        }

        // Copy link
        if (e.target.closest('[data-action="copyPublicationLink"]')) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showMessage(window.__('link_copied') || 'Enlace copiado al portapapeles', 'success');
            });
            return;
        }

        // Delete publication
        if (e.target.closest('[data-action="deletePublication"]')) {
            this.confirmDeletePublication();
            return;
        }
    }

    async loadComments() {
        if (!this.pubUuid) return;
        const loader = document.querySelector('[data-ref="comments-loader"]');
        const emptyState = document.querySelector('[data-ref="comments-empty-state"]');
        
        if (loader) loader.classList.remove('disabled');
        if (emptyState) emptyState.classList.add('disabled');

        try {
            const res = await this.api.post(ApiRoutes.Publications.GetComments, { uuid: this.pubUuid });
            if (res && res.success) {
                this.comments = res.comments || [];
                this.commentsLoaded = true;
                this.renderCommentsList();
                this.updateCommentsCount(res.total_comments);
            }
        } catch (err) {
            if (loader) loader.classList.add('disabled');
            const listEl = document.querySelector('[data-ref="comments-list"]');
            if (listEl) {
                listEl.innerHTML = CardTemplates.emptyState({
                    type: 'error',
                    title: window.__('error_loading_comments_title') || 'Error al cargar comentarios',
                    message: window.__('error_loading_comments') || 'No se pudieron cargar los comentarios.'
                });
            }
        }
    }

    renderCommentsList() {
        const listEl = document.querySelector('[data-ref="comments-list"]');
        const emptyState = document.querySelector('[data-ref="comments-empty-state"]');
        const loader = document.querySelector('[data-ref="comments-loader"]');
        if (!listEl) return;

        if (loader) loader.classList.add('disabled');

        if (this.comments.length === 0) {
            if (emptyState) emptyState.classList.remove('disabled');
            listEl.querySelectorAll('.chat-message').forEach(el => el.remove());
            return;
        }

        if (emptyState) emptyState.classList.add('disabled');

        let html = '';
        this.comments.forEach(c => {
            const author = c.author || {};
            const authorName = AvatarUtils.getDisplayName(author, 'Usuario');
            const authorHandle = escapeHTML(author.handle || `@${author.identifier || 'usuario'}`);
            const authorUrl = `/@${escapeHTML(author.identifier || '')}`;
            const authorAvatar = AvatarUtils.getAvatarUrl(author, authorName, author.id || '');
            const fallbackAvatar = AvatarUtils.generateDefaultAvatarUrl(authorName, author.id || '');
            const roleBorder = AvatarUtils.getRoleBorder(author);
            const isOwn = !!c.is_own;

            const msgDate = new Date(c.created_at);
            const timeFormatted = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateFormatted = msgDate.toLocaleDateString([], { day: '2-digit', month: 'short' });

            html += `
                <div class="chat-message ${isOwn ? 'chat-message--mine' : ''}" data-comment-uuid="${escapeHTML(c.uuid)}">
                    <a href="${authorUrl}" data-nav="${authorUrl}" class="component-button--profile ${roleBorder.className} component-avatar--static-sm" ${roleBorder.subBg ? `data-sub-bg="${escapeHTML(roleBorder.subBg)}" style="--active-subscription-bg: ${escapeHTML(roleBorder.subBg)};"` : ''} style="text-decoration: none;">
                        <img src="${escapeHTML(authorAvatar)}" class="chat-message-avatar-img image-lazy-fade" onload="this.classList.add('image-loaded')" onerror="this.onerror=null; this.src='${escapeHTML(fallbackAvatar)}'; this.classList.add('image-loaded');">
                    </a>
                    <div class="chat-message-bubble">
                        <div class="chat-message-header">
                            <div class="chat-header-title-box">
                                <a href="${authorUrl}" data-nav="${authorUrl}" class="chat-message-username" style="text-decoration: none;">${authorName}</a>
                                <span class="component-text-muted" style="font-size: 0.65rem;">•</span>
                                <span class="chat-message-time">${dateFormatted} ${timeFormatted}</span>
                            </div>
                            ${isOwn ? `
                            <div class="chat-msg-actions chat-msg-actions--ml-auto">
                                <button type="button" class="component-button component-button--icon component-button--icon-sm-ghost" data-action="deleteComment" data-comment-uuid="${escapeHTML(c.uuid)}" data-tooltip="${window.__('btn_delete') || 'Eliminar'}">
                                    <span class="material-symbols-rounded component-icon--16 component-text-danger">delete</span>
                                </button>
                            </div>
                            ` : ''}
                        </div>
                        <div class="chat-message-text">${escapeHTML(c.content)}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
        listEl.scrollTop = listEl.scrollHeight;
    }

    async submitComment() {
        const input = document.querySelector('[data-ref="input-comment"]');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        try {
            const res = await this.api.post(ApiRoutes.Publications.AddComment, {
                publication_uuid: this.pubUuid,
                content: text
            });

            if (res && res.success) {
                input.value = '';
                input.style.height = 'auto';
                const chatBox = input.closest('.component-chat-box');
                if (chatBox) chatBox.classList.remove('is-multiline');

                if (res.comment) {
                    this.comments.push(res.comment);
                    this.renderCommentsList();
                    this.updateCommentsCount(res.comments_count);
                }
            } else {
                showMessage((res && res.message) || 'Error al publicar comentario', 'error');
            }
        } catch (err) {
            showMessage('Error de conexión al comentar', 'error');
        }
    }

    async deleteComment(commentUuid, btnEl) {
        if (!commentUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Publications.DeleteComment, {
                comment_uuid: commentUuid
            });

            if (res && res.success) {
                this.comments = this.comments.filter(c => c.uuid !== commentUuid);
                this.renderCommentsList();
                this.updateCommentsCount(res.comments_count);
                showMessage(res.message || 'Comentario eliminado', 'success');
            } else {
                showMessage((res && res.message) || 'Error al eliminar comentario', 'error');
            }
        } catch (err) {
            showMessage('Error al eliminar comentario', 'error');
        }
    }

    updateCommentsCount(count) {
        const drawerEl = document.querySelector('[data-ref="drawer-comments-count"]');
        const footerEl = document.querySelector('[data-ref="footer-comments-count"]');
        const formatted = formatNumber(count);
        if (drawerEl) drawerEl.textContent = formatted;
        if (footerEl) footerEl.textContent = formatted;
    }

    async toggleLike(btnEl) {
        if (!this.pubUuid) return;

        try {
            const res = await this.api.post(ApiRoutes.Publications.ToggleLike, { uuid: this.pubUuid });
            if (res && res.success) {
                btnEl.classList.toggle('is-favorite', res.liked);
                const countEl = document.querySelector('[data-ref="top-like-count"]');
                if (countEl) countEl.textContent = formatNumber(res.likes_count);
            } else {
                if (res && res.message) showMessage(res.message, 'error');
            }
        } catch (err) {
            showMessage('Error al procesar Me Gusta', 'error');
        }
    }

    downloadArtwork() {
        if (!this.imageUrl) return;
        const link = document.createElement('a');
        link.href = this.imageUrl;
        link.download = `pixelart_${this.pubUuid}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async confirmDeletePublication() {
        if (!confirm(window.__('publications.delete_confirm') || '¿Estás seguro de que deseas eliminar esta publicación?')) {
            return;
        }

        try {
            const res = await this.api.post(ApiRoutes.Publications.DeletePublication, {
                publication_uuid: this.pubUuid
            });

            if (res && res.success) {
                showMessage(res.message || 'Publicación eliminada', 'success');
                window.location.href = '/';
            } else {
                showMessage((res && res.message) || 'Error al eliminar publicación', 'error');
            }
        } catch (err) {
            showMessage('Error al eliminar publicación', 'error');
        }
    }
}
