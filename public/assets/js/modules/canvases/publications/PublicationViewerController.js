import { ApiRoutes } from '../../../core/api/ApiRoutes.js';
import { ApiService } from '../../../core/api/ApiService.js';
import { showMessage, setButtonLoading, restoreButton, formatNumber, escapeHTML } from '../../../core/utils/uiUtils.js';

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

    centerArtwork() {
        if (!this.canvas || !this.imageObj) return;
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
    }

    handleWheel(e) {
        e.preventDefault();
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
        const newScale = Math.max(0.2, Math.min(128, this.transform.scale * zoomFactor));

        this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

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
            const drawer = document.querySelector('[data-ref="comments-drawer"]');
            if (drawer && drawer.classList.contains('active')) {
                this.toggleCommentsDrawer();
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

        // Draw shadow and border around canvas
        ctx.fillStyle = '#18181b';
        ctx.fillRect(tx, ty, drawW, drawH);

        // Draw pixel art image
        if (this.imageObj) {
            ctx.drawImage(this.imageObj, tx, ty, drawW, drawH);
        }

        // Draw pixel grid when scale >= 10
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

    handleClick(e) {
        // Zoom controls
        if (e.target.closest('[data-action="zoomIn"]')) {
            this.zoomAtCenter(1.3);
            return;
        }
        if (e.target.closest('[data-action="zoomOut"]')) {
            this.zoomAtCenter(0.75);
            return;
        }
        if (e.target.closest('[data-action="resetZoom"]')) {
            this.centerArtwork();
            return;
        }
        if (e.target.closest('[data-action="toggleGrid"]')) {
            this.showGrid = !this.showGrid;
            const btn = e.target.closest('[data-action="toggleGrid"]');
            if (btn) btn.classList.toggle('active', this.showGrid);
            this.requestRender();
            return;
        }

        // Comments drawer
        if (e.target.closest('[data-action="toggleCommentsDrawer"]')) {
            this.toggleCommentsDrawer();
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

        // Go back
        if (e.target.closest('[data-action="goBackOrHome"]')) {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
            return;
        }
    }

    zoomAtCenter(factor) {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const centerX = (this.canvas.width / dpr) / 2;
        const centerY = (this.canvas.height / dpr) / 2;
        const newScale = Math.max(0.2, Math.min(128, this.transform.scale * factor));

        this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;
        this.requestRender();
    }

    toggleCommentsDrawer() {
        const drawer = document.querySelector('[data-ref="comments-drawer"]');
        if (!drawer) return;

        const isActive = drawer.classList.toggle('active');
        if (isActive && !this.commentsLoaded) {
            this.loadComments();
        }
    }

    async loadComments() {
        if (!this.pubUuid) return;
        const listEl = document.querySelector('[data-ref="comments-list"]');

        try {
            const res = await this.api.post(ApiRoutes.Publications.GetComments, { uuid: this.pubUuid });
            if (res && res.success) {
                this.comments = res.comments || [];
                this.commentsLoaded = true;
                this.renderCommentsList();
                this.updateCommentsCount(res.total_comments);
            }
        } catch (err) {
            if (listEl) {
                listEl.innerHTML = `
                    <div class="component-empty-state" style="padding: 30px 20px; text-align: center;">
                        <p class="component-text-danger">Error al cargar los comentarios.</p>
                    </div>
                `;
            }
        }
    }

    renderCommentsList() {
        const listEl = document.querySelector('[data-ref="comments-list"]');
        if (!listEl) return;

        if (this.comments.length === 0) {
            listEl.innerHTML = `
                <div class="component-empty-state" style="padding: 40px 20px; text-align: center;">
                    <span class="material-symbols-rounded" style="font-size: 36px; color: var(--text-muted);">chat_bubble_outline</span>
                    <p class="component-text-muted" style="font-size: 0.82rem; margin-top: 8px;">${window.__('publications.no_comments') || 'Aún no hay comentarios. ¡Sé el primero en comentar!'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.comments.forEach(c => {
            const author = c.author || {};
            const authorHandle = escapeHTML(author.handle || `@${author.identifier || 'usuario'}`);
            const authorUrl = `/@${escapeHTML(author.identifier || '')}`;
            const isOwn = !!c.is_own;

            html += `
                <div class="component-comment-item" data-comment-uuid="${escapeHTML(c.uuid)}">
                    <img src="${escapeHTML(author.avatar_url)}" alt="${escapeHTML(author.username)}" class="component-comment-avatar">
                    <div class="component-comment-body">
                        <div class="component-comment-header">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <a href="${authorUrl}" data-nav="${authorUrl}" class="component-comment-author-name">${authorHandle}</a>
                                <span class="component-comment-time">${escapeHTML(c.created_at)}</span>
                            </div>
                            ${isOwn ? `
                                <button type="button" class="component-comment-delete-btn" data-action="deleteComment" data-comment-uuid="${escapeHTML(c.uuid)}" title="${window.__('btn_delete')}">
                                    <span class="material-symbols-rounded component-icon--16">delete</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="component-comment-content">${escapeHTML(c.content)}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
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
                if (res.comment) {
                    this.comments.push(res.comment);
                    this.renderCommentsList();
                    this.updateCommentsCount(res.comments_count);

                    // Scroll to bottom
                    const listEl = document.querySelector('[data-ref="comments-list"]');
                    if (listEl) listEl.scrollTop = listEl.scrollHeight;
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
        const topEl = document.querySelector('[data-ref="toolbar-comments-count"]');
        const drawerEl = document.querySelector('[data-ref="drawer-comments-count"]');
        const formatted = formatNumber(count);
        if (topEl) topEl.textContent = formatted;
        if (drawerEl) drawerEl.textContent = formatted;
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
