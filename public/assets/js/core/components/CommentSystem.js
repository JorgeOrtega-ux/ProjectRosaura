// public/assets/js/core/components/CommentSystem.js

import { ApiRoutes } from '../api/ApiRoutes.js';

export class CommentSystem {
    constructor(videoId, container, api) {
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
        this.renderLayout();
        this.setupMainInput();
        this.container.addEventListener('click', this.boundClickHandler);
        await this.loadComments();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="component-comments">
                <div class="component-comments-header">
                    <h3 class="component-comments-title">Comentarios</h3>
                </div>
                <div class="component-comments-input-area">
                    <img class="component-comment-avatar" src="${window.AppBasePath || ''}/public/assets/images/default-avatar.png" alt="Usuario" id="comments-current-user-avatar">
                    <div class="component-comments-input-wrapper">
                        <textarea id="main-comment-input" class="component-comments-textarea" placeholder="Añade un comentario..." rows="1"></textarea>
                        <div class="component-comments-actions" id="main-comment-actions" style="display: none;">
                            <button id="main-comment-cancel" class="component-btn-secondary">Cancelar</button>
                            <button id="main-comment-submit" class="component-btn-primary" disabled>Comentar</button>
                        </div>
                    </div>
                </div>
                <div id="comments-list" class="component-comments-list"></div>
                <div id="comments-loading" style="display: none; text-align: center; padding: 20px; color: var(--text-secondary);">Cargando comentarios...</div>
                <button id="comments-load-more" class="component-btn-secondary" style="display: none; width: 100%; margin-top: 16px;">Cargar más comentarios</button>
            </div>
        `;

        this.commentsListEl = this.container.querySelector('#comments-list');
        this.loadMoreBtn = this.container.querySelector('#comments-load-more');
        
        this.loadMoreBtn.addEventListener('click', () => {
            this.offset += this.limit;
            this.loadComments();
        });
    }

    setupMainInput() {
        const input = this.container.querySelector('#main-comment-input');
        const actions = this.container.querySelector('#main-comment-actions');
        const btnCancel = this.container.querySelector('#main-comment-cancel');
        const btnSubmit = this.container.querySelector('#main-comment-submit');

        input.addEventListener('focus', () => {
            actions.style.display = 'flex';
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
            btnSubmit.disabled = input.value.trim().length === 0;
        });

        btnCancel.addEventListener('click', () => {
            input.value = '';
            input.style.height = 'auto';
            actions.style.display = 'none';
            btnSubmit.disabled = true;
        });

        btnSubmit.addEventListener('click', async () => {
            const content = input.value.trim();
            if (!content) return;
            
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Enviando...';

            try {
                const response = await fetch((window.AppBasePath || '') + ApiRoutes.Comments.Create, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ video_id: this.videoId, content: content })
                });
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    input.value = '';
                    input.style.height = 'auto';
                    actions.style.display = 'none';
                    
                    const newCommentHtml = this.createCommentHtml(result.data, false);
                    this.commentsListEl.insertAdjacentHTML('afterbegin', newCommentHtml);
                } else {
                    alert(result.error || 'Debes iniciar sesión para comentar.');
                }
            } catch (e) {
                console.error('Error enviando comentario:', e);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Comentar';
            }
        });
    }

    async loadComments() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;
        
        const loader = this.container.querySelector('#comments-loading');
        loader.style.display = 'block';
        this.loadMoreBtn.style.display = 'none';

        try {
            const response = await fetch(`${window.AppBasePath || ''}${ApiRoutes.Comments.Get}?video_id=${this.videoId}&offset=${this.offset}&limit=${this.limit}`);
            const result = await response.json();

            if (result.success) {
                const comments = result.data;
                if (comments.length < this.limit) {
                    this.hasMore = false;
                }
                this.renderCommentsList(comments);
            }
        } catch (error) {
            console.error('Error cargando comentarios:', error);
        } finally {
            this.isLoading = false;
            loader.style.display = 'none';
            if (this.hasMore) {
                this.loadMoreBtn.style.display = 'block';
            }
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

        const btnCancelReply = e.target.closest('.btn-cancel-reply');
        if (btnCancelReply) {
            const container = document.getElementById(`reply-form-${btnCancelReply.dataset.id}`);
            if (container) container.innerHTML = '';
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
            const response = await fetch((window.AppBasePath || '') + ApiRoutes.Comments.React, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_id: commentId, type: type })
            });
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch (error) {
            if (isLikeAction) {
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
            } else {
                if (wasDisliked) btnDislike.classList.add('active'); else btnDislike.classList.remove('active');
                if (wasLiked) btnLike.classList.add('active'); else btnLike.classList.remove('active');
            }
            countSpan.innerText = wasLiked ? (isLikeAction ? currentLikes + 1 : currentLikes) : (isLikeAction ? currentLikes - 1 : currentLikes);
            alert('Debes iniciar sesión para reaccionar.');
        }
    }

    showReplyForm(commentId) {
        const container = document.getElementById(`reply-form-${commentId}`);
        if (!container) return;

        container.innerHTML = `
            <div class="component-comments-input-area is-reply">
                <div class="component-comments-input-wrapper">
                    <textarea id="input-reply-${commentId}" class="component-comments-textarea" placeholder="Añade una respuesta..." rows="1"></textarea>
                    <div class="component-comments-actions">
                        <button class="component-btn-secondary btn-cancel-reply" data-id="${commentId}">Cancelar</button>
                        <button class="component-btn-primary btn-submit-reply" data-id="${commentId}">Responder</button>
                    </div>
                </div>
            </div>
        `;
        
        const input = document.getElementById(`input-reply-${commentId}`);
        input.focus();
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
        });
    }

    async submitReply(parentId) {
        const input = document.getElementById(`input-reply-${parentId}`);
        const content = input.value.trim();
        if (!content) return;

        const btn = document.querySelector(`.btn-submit-reply[data-id="${parentId}"]`);
        btn.disabled = true;
        btn.innerText = '...';

        try {
            const response = await fetch((window.AppBasePath || '') + ApiRoutes.Comments.Create, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_id: this.videoId, content: content, parent_id: parentId })
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
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
                alert(result.error || 'Debes iniciar sesión para responder.');
                btn.disabled = false;
                btn.innerText = 'Responder';
            }
        } catch (e) {
            console.error('Error enviando respuesta:', e);
            btn.disabled = false;
            btn.innerText = 'Responder';
        }
    }

    destroy() {
        if (this.container && this.boundClickHandler) {
            this.container.removeEventListener('click', this.boundClickHandler);
        }
        this.commentsListEl = null;
        this.container.innerHTML = '';
    }
}