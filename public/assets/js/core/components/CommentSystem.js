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
        this.limit = 10;
        this.currentSort = 'recent';
        this.isLoading = false;
        this.hasMore = true;
        this.repliesState = {}; 
        this.commentsListEl = null;
        this.loadMoreBtn = null;
        this.boundClickHandler = this.handleGlobalClick.bind(this);
    }

    async init() {
        console.log('[CommentSystem] 🚀 Ejecutando init()...');
        this.renderLayout();
        this.setupMainInput();
        this.setupFilterDropdown();
        this.container.addEventListener('click', this.boundClickHandler);
        
        console.log('[CommentSystem] ⏳ Llamando a loadComments() desde init()...');
        await this.loadComments();
        console.log('[CommentSystem] ✅ init() completado.');
    }

    renderLayout() {
        console.log('[CommentSystem] 🎨 Renderizando layout base...');
        
        const headerProfileImg = document.querySelector('.component-button--profile img');
        const currentUserAvatarSrc = headerProfileImg ? headerProfileImg.src : `${window.AppBasePath || ''}/public/assets/images/default-avatar.png`;

        this.container.innerHTML = `
            <div class="component-comments" style="margin-top: 0;">
                
                <div class="component-comments-top">
                    <div class="component-toolbar-title">Comentarios</div>
                    <div class="component-dropdown-wrapper" style="width: auto; position: relative;">
                        <button class="component-button component-button--icon component-button--h40 mobile-search-btn" id="btn-comments-filter" title="Filtrar">
                            <span class="material-symbols-rounded">sort</span>
                        </button>
                        <div class="component-module component-module--dropdown component-module--dropdown-fixed disabled" id="dropdown-comments-filter" style="right: 0; left: auto; top: calc(100% + 5px);">
                            <div class="component-menu component-menu--w265">
                                <div class="component-menu-list">
                                    <a class="component-menu-link sort-option active" data-sort="recent">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">schedule</span></div>
                                        <div class="component-menu-link-text"><span>Más recientes</span></div>
                                    </a>
                                    <a class="component-menu-link sort-option" data-sort="relevant">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">thumb_up</span></div>
                                        <div class="component-menu-link-text"><span>Más relevantes</span></div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="component-comments-center">
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

                <div class="component-comments-bottom">
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
                    
                    const emptyState = this.commentsListEl.querySelector('.component-comments-empty');
                    if (emptyState) {
                        emptyState.remove();
                    }

                    const newCommentHtml = this.createCommentHtml(result.data, false);
                    this.commentsListEl.insertAdjacentHTML('afterbegin', newCommentHtml);
                } else {
                    console.warn('[CommentSystem] ⚠️ Error lógico al crear comentario:', result);
                    if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                        window.appInstance.showToast(result?.error || result?.message || 'Error al enviar el comentario.', 'error');
                    } else {
                        alert(result?.error || result?.message || 'Error al enviar el comentario.');
                    }
                }
            } catch (e) {
                console.error('[CommentSystem] ❌ Excepción capturada en btnSubmit:', e);
            } finally {
                btnSubmit.disabled = input.value.trim().length === 0;
            }
        });
    }

    setupFilterDropdown() {
        const btnFilter = this.container.querySelector('#btn-comments-filter');
        const dropdownFilter = this.container.querySelector('#dropdown-comments-filter');
        const sortOptions = this.container.querySelectorAll('.sort-option');

        btnFilter.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownFilter.classList.toggle('disabled');
            dropdownFilter.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownFilter.classList.contains('disabled') && !btnFilter.contains(e.target) && !dropdownFilter.contains(e.target)) {
                dropdownFilter.classList.add('disabled');
                dropdownFilter.classList.remove('active');
            }
        });

        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                sortOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                const selectedSort = option.dataset.sort;
                dropdownFilter.classList.add('disabled');
                dropdownFilter.classList.remove('active');

                if (this.currentSort !== selectedSort) {
                    console.log(`[CommentSystem] 🔄 Cambiando filtro a: ${selectedSort}`);
                    this.currentSort = selectedSort;
                    this.offset = 0;
                    this.hasMore = true;
                    this.commentsListEl.innerHTML = ''; 
                    this.loadComments();
                }
            });
        });
    }

    async loadComments() {
        if (this.isLoading || !this.hasMore) {
            console.log('[CommentSystem] 🛑 Ignorando loadComments. isLoading:', this.isLoading, 'hasMore:', this.hasMore);
            return;
        }
        
        console.log(`[CommentSystem] 🔄 Cargando comentarios... (Sort: ${this.currentSort})`);
        this.isLoading = true;
        
        const loader = this.container.querySelector('#comments-loading');
        loader.style.display = 'block';
        this.loadMoreBtn.style.display = 'none';

        try {
            const payload = {
                video_id: this.videoId,
                offset: this.offset,
                limit: this.limit,
                sort: this.currentSort
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
        const replyCount = parseInt(comment.reply_count) || 0;

        let repliesHtml = '';
        if (!isReply) {
            repliesHtml = `
                <div class="component-comment-replies-container">
                    <div class="component-comment-replies-list" id="replies-list-${comment.id}"></div>
                    <div class="component-comment-replies-actions" style="${replyCount === 0 ? 'display: none;' : ''}">
                        ${replyCount > 0 ? `
                            <button class="component-comment-btn-action btn-show-replies" data-id="${comment.id}" data-total="${replyCount}">
                                <span class="material-symbols-rounded">expand_more</span>
                                Mostrar ${replyCount} respuestas
                            </button>
                        ` : ''}
                        <button class="component-comment-btn-action btn-hide-replies" data-id="${comment.id}" style="display: none;">
                            <span class="material-symbols-rounded">expand_less</span>
                            Ocultar respuestas
                        </button>
                    </div>
                </div>
            `;
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
                <div class="component-comment-reply-form-container" id="reply-form-${comment.id}"></div>
                ${repliesHtml}
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

        const btnCancelReply = e.target.closest('.btn-cancel-reply');
        if (btnCancelReply) {
            const commentId = btnCancelReply.dataset.id;
            const formContainer = document.getElementById(`reply-form-${commentId}`);
            if (formContainer) formContainer.innerHTML = '';
            return;
        }

        const btnSubmitReply = e.target.closest('.btn-submit-reply');
        if (btnSubmitReply) {
            this.submitReply(btnSubmitReply.dataset.id);
            return;
        }

        const btnShowReplies = e.target.closest('.btn-show-replies');
        if (btnShowReplies) {
            this.loadReplies(btnShowReplies.dataset.id);
            return;
        }

        const btnHideReplies = e.target.closest('.btn-hide-replies');
        if (btnHideReplies) {
            this.hideReplies(btnHideReplies.dataset.id);
            return;
        }
    }

    async handleReactionOptimistic(btnElement, type) {
        const commentId = btnElement.dataset.id;
        console.log(`[CommentSystem] 👍 Reacción disparada. ID: ${commentId}, Tipo: ${type}`);
        
        const thread = btnElement.closest('.component-comment-thread') || btnElement.closest('.component-comment-main');
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
            if (isLikeAction) {
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
            } else {
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
            }
            countSpan.innerText = wasLiked ? (isLikeAction ? currentLikes + 1 : currentLikes) : (isLikeAction ? currentLikes - 1 : currentLikes);
            
            if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                window.appInstance.showToast(error.message || 'Error al reaccionar.', 'error');
            } else {
                alert(error.message || 'Debes iniciar sesión para reaccionar.');
            }
        }
    }

    showReplyForm(commentId) {
        console.log(`[CommentSystem] 💬 Abriendo formulario de respuesta para comentario: ${commentId}`);
        const container = document.getElementById(`reply-form-${commentId}`);
        if (!container) return;

        if (container.innerHTML.trim() !== '') {
            container.innerHTML = '';
            return;
        }

        const currentUserAvatarSrc = document.getElementById('comments-current-user-avatar')?.src || `${window.AppBasePath || ''}/public/assets/images/default-avatar.png`;

        container.innerHTML = `
            <div class="component-comments-input-area is-reply" style="margin-left: 56px; margin-top: 8px;">
                <img class="component-comment-avatar" src="${currentUserAvatarSrc}" alt="Usuario">
                <div class="component-comments-input-wrapper">
                    <textarea id="input-reply-${commentId}" class="component-comments-textarea" placeholder="Añade una respuesta..." rows="1"></textarea>
                    <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
                        <button class="component-btn-secondary btn-cancel-reply" data-id="${commentId}" style="padding: 6px 16px;">Cancelar</button>
                        <button class="component-btn-send btn-submit-reply" data-id="${commentId}" disabled title="Enviar respuesta">
                            <span class="material-symbols-rounded">send</span>
                        </button>
                    </div>
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

    async loadReplies(commentId) {
        if (!this.repliesState[commentId]) {
            this.repliesState[commentId] = { offset: 0, limit: 10 };
        }
        
        const state = this.repliesState[commentId];
        const btnShow = document.querySelector(`.btn-show-replies[data-id="${commentId}"]`);
        const btnHide = document.querySelector(`.btn-hide-replies[data-id="${commentId}"]`);
        const listEl = document.getElementById(`replies-list-${commentId}`);

        try {
            const originalText = btnShow.innerHTML;
            btnShow.innerHTML = `<span class="material-symbols-rounded">hourglass_empty</span>Cargando...`;
            btnShow.disabled = true;

            const payload = { video_id: this.videoId, parent_id: commentId, offset: state.offset, limit: state.limit };
            const result = await this.api.post(ApiRoutes.Comments.Get, payload);

            if (result && result.success) {
                const replies = result.data;
                let html = '';
                replies.forEach(reply => {
                    html += this.createCommentHtml(reply, true);
                });
                listEl.insertAdjacentHTML('beforeend', html);
                
                state.offset += replies.length;
                const totalReplies = parseInt(btnShow.dataset.total || '0');

                if (state.offset >= totalReplies || replies.length < state.limit) {
                    btnShow.style.display = 'none';
                    btnHide.style.display = 'inline-flex';
                } else {
                    btnShow.innerHTML = `<span class="material-symbols-rounded">expand_more</span>Mostrar más respuestas`;
                    btnShow.disabled = false;
                    btnHide.style.display = 'inline-flex';
                }
            }
        } catch(e) {
            console.error('[CommentSystem] ❌ Error cargando respuestas:', e);
            btnShow.innerHTML = originalText;
            btnShow.disabled = false;
        }
    }

    hideReplies(commentId) {
        const listEl = document.getElementById(`replies-list-${commentId}`);
        const btnShow = document.querySelector(`.btn-show-replies[data-id="${commentId}"]`);
        const btnHide = document.querySelector(`.btn-hide-replies[data-id="${commentId}"]`);
        
        listEl.innerHTML = '';
        if (this.repliesState[commentId]) {
            this.repliesState[commentId].offset = 0;
        }

        btnHide.style.display = 'none';
        btnShow.style.display = 'inline-flex';
        btnShow.innerHTML = `<span class="material-symbols-rounded">expand_more</span>Mostrar ${btnShow.dataset.total} respuestas`;
        btnShow.disabled = false;
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

                const listEl = document.getElementById(`replies-list-${parentId}`);
                const newReplyHtml = this.createCommentHtml(result.data, true);
                listEl.insertAdjacentHTML('beforeend', newReplyHtml);

                const actionsContainer = document.querySelector(`.component-comment-replies-actions[style*="display: none"]`);
                if (actionsContainer) actionsContainer.style.display = 'block';

                const btnShow = document.querySelector(`.btn-show-replies[data-id="${parentId}"]`);
                if (btnShow) {
                    const currentTotal = parseInt(btnShow.dataset.total || '0') + 1;
                    btnShow.dataset.total = currentTotal;
                    if (btnShow.innerHTML.includes('Mostrar') && !btnShow.innerHTML.includes('más')) {
                        btnShow.innerHTML = `<span class="material-symbols-rounded">expand_more</span>Mostrar ${currentTotal} respuestas`;
                    }
                }

            } else {
                console.warn('[CommentSystem] ⚠️ Error lógico al responder:', result);
                if (window.appInstance && typeof window.appInstance.showToast === 'function') {
                    window.appInstance.showToast(result?.error || result?.message || 'Error al enviar la respuesta.', 'error');
                } else {
                    alert(result?.error || result?.message || 'Error al enviar la respuesta.');
                }
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