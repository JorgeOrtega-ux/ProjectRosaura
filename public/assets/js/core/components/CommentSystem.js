// public/assets/js/core/components/CommentSystem.js

import { ApiRoutes } from '../api/ApiRoutes.js';

export class CommentSystem {
    constructor(videoId, container, api) {
        console.log('[CommentSystem] 🛠️ Inicializando constructor...');
        console.log('[CommentSystem] Video ID:', videoId);
        
        this.videoId = videoId;
        this.container = container;
        this.api = api;
        this.offset = 0;
        this.limit = 20;
        this.isLoading = false;
        this.hasMore = true;
        this.commentsListEl = null;
        this.loadMoreBtn = null;
        this.boundClickHandler = this.handleGlobalClick.bind(this);
    }

    async init() {
        console.log('[CommentSystem] 🚀 Ejecutando init()...');
        this.renderLayout();
        this.setupMainInput();
        this.container.addEventListener('click', this.boundClickHandler);
        
        console.log('[CommentSystem] ⏳ Llamando a loadComments() desde init()...');
        await this.loadComments();
        console.log('[CommentSystem] ✅ init() completado.');
    }

    renderLayout() {
        console.log('[CommentSystem] 🎨 Renderizando layout base...');
        
        // FIX: Obtener el avatar del usuario logueado dinámicamente desde el header
        const headerProfileImg = document.querySelector('.component-button--profile img');
        const currentUserAvatarSrc = headerProfileImg ? headerProfileImg.src : `${window.AppBasePath || ''}/public/assets/images/default-avatar.png`;

        this.container.innerHTML = `
            <div class="component-comments" style="margin-top: 0;">
                
                <div class="component-comments-top" style="padding: 24px;">
                    <div class="component-comments-header">
                        <h3 class="component-comments-title">Comentarios</h3>
                    </div>
                    <div class="component-comments-input-area">
                        <img class="component-comment-avatar" src="${currentUserAvatarSrc}" alt="Usuario" id="comments-current-user-avatar">
                        <div class="component-comments-input-wrapper">
                            <textarea id="main-comment-input" class="component-comments-textarea" placeholder="Añade un comentario..." rows="1"></textarea>
                            <button id="main-comment-submit" class="component-btn-send" disabled title="Enviar">
                                <span class="material-symbols-rounded">send</span>
                            </button>
                        </div>
                    </div>
                </div>

                <hr style="margin: 0; border: none; border-top: 1px solid var(--border-color);">

                <div class="component-comments-bottom" style="padding: 24px;">
                    <div id="comments-list" class="component-comments-list"></div>
                    <div id="comments-loading" style="display: none; text-align: center; padding: 20px; color: var(--text-secondary);">Cargando comentarios...</div>
                    <button id="comments-load-more" class="component-btn-secondary" style="display: none; width: 100%; margin-top: 16px;">Cargar más comentarios</button>
                </div>
                
            </div>
        `;

        this.commentsListEl = this.container.querySelector('#comments-list');
        this.loadMoreBtn = this.container.querySelector('#comments-load-more');
        
        this.loadMoreBtn.addEventListener('click', () => {
            console.log('[CommentSystem] 👆 Clic en cargar más comentarios. Offset actual:', this.offset);
            this.offset += this.limit;
            this.loadComments();
        });
    }

    setupMainInput() {
        const input = this.container.querySelector('#main-comment-input');
        const btnSubmit = this.container.querySelector('#main-comment-submit');

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
            btnSubmit.disabled = input.value.trim().length === 0;
        });

        btnSubmit.addEventListener('click', async () => {
            const content = input.value.trim();
            if (!content) return;
            
            console.log('[CommentSystem] 📝 Intentando enviar nuevo comentario:', content);
            btnSubmit.disabled = true;

            try {
                const payload = { video_id: this.videoId, content: content };
                console.log(`[CommentSystem] 📡 POST a ${ApiRoutes.Comments.Create} con payload:`, payload);
                
                const result = await this.api.post(ApiRoutes.Comments.Create, payload);
                console.log('[CommentSystem] 📥 Respuesta de crear comentario:', result);
                
                if (result && result.success && result.data) {
                    console.log('[CommentSystem] ✅ Comentario creado con éxito.');
                    input.value = '';
                    input.style.height = 'auto';
                    
                    // Remover mensaje de vacío si existe
                    const emptyState = this.commentsListEl.querySelector('.component-comments-empty');
                    if (emptyState) {
                        emptyState.remove();
                    }

                    const newCommentHtml = this.createCommentHtml(result.data, false);
                    this.commentsListEl.insertAdjacentHTML('afterbegin', newCommentHtml);
                } else {
                    console.warn('[CommentSystem] ⚠️ Error lógico al crear comentario:', result);
                    alert(result?.error || result?.message || 'Error al enviar el comentario.');
                }
            } catch (e) {
                console.error('[CommentSystem] ❌ Excepción capturada en btnSubmit:', e);
            } finally {
                btnSubmit.disabled = input.value.trim().length === 0;
            }
        });
    }

    async loadComments() {
        if (this.isLoading || !this.hasMore) {
            console.log('[CommentSystem] 🛑 Ignorando loadComments. isLoading:', this.isLoading, 'hasMore:', this.hasMore);
            return;
        }
        
        console.log('[CommentSystem] 🔄 Cargando comentarios...');
        this.isLoading = true;
        
        const loader = this.container.querySelector('#comments-loading');
        loader.style.display = 'block';
        this.loadMoreBtn.style.display = 'none';

        try {
            const payload = {
                video_id: this.videoId,
                offset: this.offset,
                limit: this.limit
            };
            console.log(`[CommentSystem] 📡 POST a ${ApiRoutes.Comments.Get} con payload:`, payload);
            
            const result = await this.api.post(ApiRoutes.Comments.Get, payload);
            console.log('[CommentSystem] 📥 Respuesta de loadComments:', result);

            if (result && result.success) {
                const comments = result.data;
                console.log(`[CommentSystem] ✅ Se recibieron ${comments.length} comentarios.`);
                
                if (comments.length < this.limit) {
                    console.log('[CommentSystem] ℹ️ No hay más comentarios por cargar.');
                    this.hasMore = false;
                }
                
                // Si estamos en la primera carga y no hay comentarios, mostrar el estado vacío
                if (this.offset === 0 && comments.length === 0) {
                    this.commentsListEl.innerHTML = `
                        <div class="component-comments-empty" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                            <span class="material-symbols-rounded" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">forum</span>
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">Aún no hay comentarios</h4>
                            <p style="margin: 0; font-size: 14px;">Sé el primero en compartir tu opinión.</p>
                        </div>
                    `;
                } else {
                    this.renderCommentsList(comments);
                }
            } else {
                console.error('[CommentSystem] ❌ Error desde el servidor al cargar:', result);
            }
        } catch (error) {
            console.error('[CommentSystem] ❌ Excepción crítica en loadComments:', error);
        } finally {
            this.isLoading = false;
            loader.style.display = 'none';
            if (this.hasMore && this.commentsListEl.querySelector('.component-comment-thread')) {
                this.loadMoreBtn.style.display = 'block';
            }
            console.log('[CommentSystem] 🏁 Finalizado loadComments.');
        }
    }

    renderCommentsList(comments) {
        let html = '';
        comments.forEach(comment => {
            html += this.createCommentHtml(comment, false);
        });
        this.commentsListEl.insertAdjacentHTML('beforeend', html);
    }

    createCommentHtml(comment, isReply = false) {
        const basePath = window.AppBasePath || '';
        const avatar = comment.profile_picture ? `${basePath}/${comment.profile_picture}` : `${basePath}/public/assets/images/default-avatar.png`;
        const username = comment.username || 'Usuario';
        const date = new Date(comment.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
        
        const isLiked = comment.user_reaction === 'like' ? 'active' : '';
        const isDisliked = comment.user_reaction === 'dislike' ? 'active' : '';

        let repliesHtml = '';
        if (!isReply && comment.replies && comment.replies.length > 0) {
            repliesHtml = `<div class="component-comment-replies">`;
            comment.replies.forEach(reply => {
                repliesHtml += this.createCommentHtml(reply, true);
            });
            repliesHtml += `</div>`;
        }

        const replyButtonHtml = !isReply ? `<button class="component-comment-btn-action btn-reply" data-id="${comment.id}">Responder</button>` : '';

        return `
            <div class="component-comment-thread ${isReply ? 'is-reply' : ''}" data-comment-id="${comment.id}">
                <div class="component-comment-main">
                    <img class="component-comment-avatar" src="${avatar}" alt="${username}">
                    <div class="component-comment-content">
                        <div class="component-comment-header">
                            <span class="component-comment-author">@${username}</span>
                            <span class="component-comment-date">${date}</span>
                        </div>
                        <div class="component-comment-text">${comment.content}</div>
                        <div class="component-comment-actions">
                            <button class="component-comment-btn-action btn-like ${isLiked}" data-id="${comment.id}">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span class="count">${comment.likes || 0}</span>
                            </button>
                            <button class="component-comment-btn-action btn-dislike ${isDisliked}" data-id="${comment.id}">
                                <span class="material-symbols-rounded">thumb_down</span>
                            </button>
                            ${replyButtonHtml}
                        </div>
                    </div>
                </div>
                ${repliesHtml}
                <div class="component-comment-reply-form-container" id="reply-form-${comment.id}"></div>
            </div>
        `;
    }

    async handleGlobalClick(e) {
        const btnLike = e.target.closest('.btn-like');
        if (btnLike) {
            this.handleReactionOptimistic(btnLike, 'like');
            return;
        }

        const btnDislike = e.target.closest('.btn-dislike');
        if (btnDislike) {
            this.handleReactionOptimistic(btnDislike, 'dislike');
            return;
        }

        const btnReply = e.target.closest('.btn-reply');
        if (btnReply) {
            this.showReplyForm(btnReply.dataset.id);
            return;
        }

        const btnSubmitReply = e.target.closest('.btn-submit-reply');
        if (btnSubmitReply) {
            this.submitReply(btnSubmitReply.dataset.id);
            return;
        }
    }

    async handleReactionOptimistic(btnElement, type) {
        const commentId = btnElement.dataset.id;
        console.log(`[CommentSystem] 👍 Reacción disparada. ID: ${commentId}, Tipo: ${type}`);
        
        const thread = btnElement.closest('.component-comment-thread');
        const btnLike = thread.querySelector('.btn-like');
        const btnDislike = thread.querySelector('.btn-dislike');
        const countSpan = btnLike.querySelector('.count');

        let currentLikes = parseInt(countSpan.innerText || '0');
        const wasLiked = btnLike.classList.contains('active');
        const wasDisliked = btnDislike.classList.contains('active');
        const isLikeAction = type === 'like';

        if (isLikeAction) {
            if (wasLiked) {
                btnLike.classList.remove('active');
                currentLikes = Math.max(0, currentLikes - 1);
            } else {
                btnLike.classList.add('active');
                btnDislike.classList.remove('active');
                currentLikes++;
            }
        } else {
            if (wasDisliked) {
                btnDislike.classList.remove('active');
            } else {
                btnDislike.classList.add('active');
                if (wasLiked) {
                    btnLike.classList.remove('active');
                    currentLikes = Math.max(0, currentLikes - 1);
                }
            }
        }
        
        countSpan.innerText = currentLikes;

        try {
            const payload = { comment_id: commentId, type: type };
            console.log(`[CommentSystem] 📡 POST a ${ApiRoutes.Comments.React} con payload:`, payload);
            
            const result = await this.api.post(ApiRoutes.Comments.React, payload);
            console.log('[CommentSystem] 📥 Respuesta de reacción:', result);

            if (!result || !result.success) {
                throw new Error(result?.error || result?.message || 'Error reaccionando');
            }
        } catch (error) {
            console.error('[CommentSystem] ❌ Falló la reacción en backend. Revirtiendo UI...', error);
            // Revertir en caso de error
            if (isLikeAction) {
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
            } else {
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
            }
            countSpan.innerText = wasLiked ? (isLikeAction ? currentLikes + 1 : currentLikes) : (isLikeAction ? currentLikes - 1 : currentLikes);
            alert(error.message || 'Debes iniciar sesión para reaccionar.');
        }
    }

    showReplyForm(commentId) {
        console.log(`[CommentSystem] 💬 Abriendo formulario de respuesta para comentario: ${commentId}`);
        const container = document.getElementById(`reply-form-${commentId}`);
        if (!container) return;

        // Esto ahora heredará la imagen correcta que seteamos en renderLayout
        const currentUserAvatarSrc = document.getElementById('comments-current-user-avatar')?.src || `${window.AppBasePath || ''}/public/assets/images/default-avatar.png`;

        container.innerHTML = `
            <div class="component-comments-input-area is-reply">
                <img class="component-comment-avatar" src="${currentUserAvatarSrc}" alt="Usuario">
                <div class="component-comments-input-wrapper">
                    <textarea id="input-reply-${commentId}" class="component-comments-textarea" placeholder="Añade una respuesta..." rows="1"></textarea>
                    <button class="component-btn-send btn-submit-reply" data-id="${commentId}" disabled title="Enviar respuesta">
                        <span class="material-symbols-rounded">send</span>
                    </button>
                </div>
            </div>
        `;
        
        const input = document.getElementById(`input-reply-${commentId}`);
        const submitBtn = container.querySelector('.btn-submit-reply');
        
        input.focus();
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
            submitBtn.disabled = input.value.trim().length === 0;
        });
    }

    async submitReply(parentId) {
        const input = document.getElementById(`input-reply-${parentId}`);
        const content = input.value.trim();
        if (!content) return;

        console.log(`[CommentSystem] 📨 Intentando enviar respuesta al comentario ${parentId}:`, content);

        const btn = document.querySelector(`.btn-submit-reply[data-id="${parentId}"]`);
        btn.disabled = true;

        try {
            const payload = { video_id: this.videoId, content: content, parent_id: parentId };
            console.log(`[CommentSystem] 📡 POST a ${ApiRoutes.Comments.Create} (Respuesta) con payload:`, payload);
            
            const result = await this.api.post(ApiRoutes.Comments.Create, payload);
            console.log('[CommentSystem] 📥 Respuesta de crear (reply):', result);
            
            if (result && result.success && result.data) {
                console.log('[CommentSystem] ✅ Respuesta creada con éxito.');
                const formContainer = document.getElementById(`reply-form-${parentId}`);
                formContainer.innerHTML = ''; 

                const thread = document.querySelector(`.component-comment-thread[data-comment-id="${parentId}"]`);
                let repliesContainer = thread.querySelector('.component-comment-replies');
                
                if (!repliesContainer) {
                    repliesContainer = document.createElement('div');
                    repliesContainer.className = 'component-comment-replies';
                    thread.insertBefore(repliesContainer, formContainer);
                }

                const newReplyHtml = this.createCommentHtml(result.data, true);
                repliesContainer.insertAdjacentHTML('beforeend', newReplyHtml);
            } else {
                console.warn('[CommentSystem] ⚠️ Error lógico al responder:', result);
                alert(result?.error || result?.message || 'Error al enviar la respuesta.');
                btn.disabled = false;
            }
        } catch (e) {
            console.error('[CommentSystem] ❌ Excepción enviando respuesta:', e);
            btn.disabled = false;
        }
    }

    destroy() {
        console.log('[CommentSystem] 🗑️ Destruyendo instancia...');
        if (this.container && this.boundClickHandler) {
            this.container.removeEventListener('click', this.boundClickHandler);
        }
        this.commentsListEl = null;
        this.container.innerHTML = '';
    }
}