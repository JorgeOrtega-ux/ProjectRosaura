// public/assets/js/modules/app/WatchController.js

import { ApiService } from '../../core/api/ApiServices.js';
import { VideoPlayerSystem } from '../../core/components/VideoPlayerSystem.js';
import { DialogSystem } from '../../core/components/DialogSystem.js';
import { CommentSystem } from '../../core/components/CommentSystem.js';

export class WatchController {
    constructor() {
        this.container = document.querySelector('.view-content');
        this.api = new ApiService();
        this.dialog = new DialogSystem();
        this.playerSystem = null;
        this.commentSystem = null;
        this.viewRegistered = false;
        
        // Intervalos
        this.checkPlayerInterval = null;
        this.telemetryVideoCheckInterval = null;
        this.telemetryInterval = null;
        
        // Modal/Dropdown State
        this.playlistModalSetupDone = false;
    }

    async init() {
        const urlPath = window.location.pathname;
        const pathSegments = urlPath.split('/').filter(segment => segment.length > 0);
        
        // CORRECCIÓN CRÍTICA: Buscar el UUID sin importar si la ruta es /watch/ o /shorts/
        const videoId = pathSegments[pathSegments.length - 1];

        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list'); 

        // Validamos que el ID parezca un UUID (formato básico) para evitar falsos positivos
        if (!videoId || videoId.length < 30) {
            this.showError404('Identificador de video no proporcionado o inválido.');
            return;
        }

        this.playerSystem = new VideoPlayerSystem();

        try {
            const response = await this.api.post('app.get_video_details', { video_uuid: videoId });

            if (response && response.success) {
                this.renderRealData(response.data, playlistId);
                
                if (videoId) {
                    const dbVideoId = response.data.id; 
                    
                    this.playerSystem.loadVideo(videoId, true, dbVideoId);
                    this.setupViewTracker(videoId);
                    
                    // ---> AÑADIDO: INICIAR RASTREADOR DE TELEMETRÍA <---
                    this.setupTelemetryTracker(videoId);
                    
                    this.setupInteractions(videoId, response.data);
                    this.setupSubscription(response.data);
                    
                    this.setupSaveInteraction(dbVideoId);

                    this.api.getVideoHeatmap(dbVideoId).then(res => {
                        if (res && res.success && res.data) {
                            this.playerSystem.renderHeatmap(res.data);
                        }
                    });

                    // Carga de Comentarios
                    if (dbVideoId) {
                        let commentsSection = document.getElementById('video-comments-section');
                        if (!commentsSection) {
                            const detailsBox = document.querySelector('.watch-details-box');
                            if (detailsBox) {
                                commentsSection = document.createElement('section');
                                commentsSection.id = 'video-comments-section';
                                commentsSection.style.marginTop = '24px';
                                detailsBox.parentNode.insertBefore(commentsSection, detailsBox.nextSibling);
                            }
                        }
                        
                        if (commentsSection) {
                            const allowComments = (response.data.allow_comments !== undefined) ? Number(response.data.allow_comments) : 1;
                            
                            if (allowComments === 1) {
                                this.commentSystem = new CommentSystem(dbVideoId, commentsSection, this.api);
                                this.commentSystem.init();
                            } else {
                                commentsSection.innerHTML = `
                                    <div style="text-align: center; padding: 40px 20px; background-color: var(--bg-hover); border-radius: 8px;">
                                        <span class="material-symbols-rounded" style="font-size: 32px; color: var(--text-secondary); margin-bottom: 8px; display: block;">comments_disabled</span>
                                        <p style="color: var(--text-secondary); margin: 0; font-size: 14px;">Los comentarios están desactivados para este video.</p>
                                    </div>
                                `;
                            }
                        }
                    }
                }

                if (playlistId) {
                    this.loadPlaylistData(playlistId, videoId);
                }

                this.loadRecommendedVideos(response.data.id);

            } else {
                this.showError404(response.message || 'El video que buscas no existe o es privado.');
            }
        } catch (error) {
            console.error('[WatchController] Error fetching video:', error);
            this.showError404('Ocurrió un error de red al intentar cargar el video.');
        }
    }

    // ---> NUEVA FUNCIÓN AÑADIDA: TELEMETRÍA <---
    setupTelemetryTracker(videoUuid) {
        // Buscamos el video de forma segura por si tarda en montar el DOM HLS
        this.telemetryVideoCheckInterval = setInterval(() => {
            const videoEl = document.querySelector('video');
            if (videoEl) {
                clearInterval(this.telemetryVideoCheckInterval);
                
                // Enviar un ping de telemetría a Redis cada 10 segundos
                this.telemetryInterval = setInterval(() => {
                    // Solo enviar datos reales de visualización activa
                    if (!videoEl.paused && videoEl.currentTime > 0) {
                        const watchTime = videoEl.currentTime;
                        const duration = videoEl.duration || 0;
                        const percentage = duration > 0 ? (watchTime / duration) * 100 : 0;
                        
                        // Enviar al controlador PHP silenciosamente
                        this.api.sendTelemetryPing(videoUuid, watchTime, percentage).catch(err => {
                            console.error('[Telemetría] Error al reportar ping:', err);
                        });
                    }
                }, 10000); 
            }
        }, 1000);
    }

    setupViewTracker(videoUuid) {
        this.viewRegistered = false;
        
        this.checkPlayerInterval = setInterval(() => {
            const videoEl = document.querySelector('video');
            if (videoEl) {
                clearInterval(this.checkPlayerInterval);
                
                videoEl.addEventListener('timeupdate', () => {
                    if (!this.viewRegistered && !videoEl.paused && videoEl.currentTime >= 5) {
                        this.viewRegistered = true;
                        this.api.postView(videoUuid).then(res => {
                            if (res.success && res.message !== 'Visita ignorada (Rate Limit)') {
                                const viewsEl = document.getElementById('watch-video-views');
                                if (viewsEl) {
                                    const currentText = viewsEl.innerText;
                                    const numberStr = currentText.replace(/[^\d]/g, '');
                                    if(numberStr) {
                                        const newViews = parseInt(numberStr) + 1;
                                        viewsEl.innerText = `${newViews.toLocaleString('es-MX')} visualizaciones`;
                                    }
                                }
                            }
                        }).catch(err => console.error("Error registrando visita:", err));
                    }
                });
            }
        }, 1000);
    }

    setupInteractions(videoUuid, data) {
        const btnLike = document.getElementById('watch-btn-like');
        const btnDislike = document.getElementById('watch-btn-dislike');
        const likeCountEl = document.getElementById('watch-like-count');
        
        if (!btnLike || !btnDislike) return;

        const initialInteraction = data.user_interaction;
        if (initialInteraction === 'like') btnLike.classList.add('active');
        if (initialInteraction === 'dislike') btnDislike.classList.add('active');

        const handleInteraction = async (type) => {
            const isLike = type === 'like';
            const primaryBtn = isLike ? btnLike : btnDislike;
            const secondaryBtn = isLike ? btnDislike : btnLike;
            
            const wasActive = primaryBtn.classList.contains('active');
            const secondaryWasActive = secondaryBtn.classList.contains('active');

            if (wasActive) {
                primaryBtn.classList.remove('active');
                if (isLike && likeCountEl) {
                    let current = parseInt(likeCountEl.innerText.replace(/,/g, '') || '0');
                    likeCountEl.innerText = Math.max(0, current - 1).toLocaleString('es-MX');
                }
            } else {
                primaryBtn.classList.add('active');
                secondaryBtn.classList.remove('active');
                
                if (isLike && likeCountEl) {
                    let current = parseInt(likeCountEl.innerText.replace(/,/g, '') || '0');
                    likeCountEl.innerText = (current + 1).toLocaleString('es-MX');
                } else if (!isLike && secondaryWasActive && likeCountEl) {
                    let current = parseInt(likeCountEl.innerText.replace(/,/g, '') || '0');
                    likeCountEl.innerText = Math.max(0, current - 1).toLocaleString('es-MX');
                }
            }

            const response = await this.api.postLike(videoUuid, type);
            
            if (!response.success) {
                if (response.message.includes('iniciar sesión') || response.message.includes('No autorizado')) {
                    if (window.router) window.router.navigate('/login');
                    else window.location.href = (window.AppBasePath || '') + '/login';
                    return;
                }
                
                this.dialog.show('error', { title: 'Aviso', message: response.message });
                
                if (wasActive) primaryBtn.classList.add('active');
                else primaryBtn.classList.remove('active');
                
                if (secondaryWasActive) secondaryBtn.classList.add('active');
                else secondaryBtn.classList.remove('active');
                
                if (likeCountEl && data.likes !== undefined) likeCountEl.innerText = parseInt(data.likes).toLocaleString('es-MX');
            } else {
                if (likeCountEl) likeCountEl.innerText = response.likes.toLocaleString('es-MX');
                primaryBtn.classList.toggle('active', response.interaction === type);
                secondaryBtn.classList.toggle('active', response.interaction === (isLike ? 'dislike' : 'like'));
            }
        };

        btnLike.addEventListener('click', () => handleInteraction('like'));
        btnDislike.addEventListener('click', () => handleInteraction('dislike'));
    }

    setupSaveInteraction(dbVideoId) {
        const btnSave = document.getElementById('watch-btn-save');
        const moduleDropdown = document.getElementById('module-save-playlist');
        
        if (!btnSave || !moduleDropdown) return;

        btnSave.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            
            const isVisible = moduleDropdown.style.display === 'flex';
            
            if (isVisible) {
                this.closeSaveModule(moduleDropdown);
            } else {
                moduleDropdown.style.display = 'flex';
                await this.renderPlaylistCheckboxes(dbVideoId);
                
                if (!this.playlistModalSetupDone) {
                    this.bindPlaylistModalEvents(moduleDropdown);
                    this.playlistModalSetupDone = true;
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (moduleDropdown.style.display === 'flex' && !moduleDropdown.contains(e.target) && !btnSave.contains(e.target)) {
                this.closeSaveModule(moduleDropdown);
            }
        });
    }

    closeSaveModule(moduleDropdown) {
        if (!moduleDropdown) return;
        moduleDropdown.style.display = 'none';
    }

    bindPlaylistModalEvents(moduleDropdown) {
        const closeBtn = document.getElementById('btn-close-save-playlist');
        const goToCreateBtn = document.getElementById('btn-go-to-create-playlist');

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSaveModule(moduleDropdown);
            });
        }

        if (goToCreateBtn) {
            goToCreateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeSaveModule(moduleDropdown);
                if (window.router) {
                    window.router.navigate('/studio'); 
                } else {
                    window.location.href = (window.AppBasePath || '') + '/studio';
                }
            });
        }
    }

    async renderPlaylistCheckboxes(dbVideoId) {
        const container = document.getElementById('playlist-checkbox-container');
        if (!container) return;

        container.innerHTML = '<div class="component-spinner component-spinner--centered" style="margin: 20px auto;"></div>';

        const res = await this.api.getPlaylistsForVideo(dbVideoId);
        
        if (!res.success) {
            if (res.code === 401 || (res.message && res.message.includes('No autorizado'))) {
                const moduleDropdown = document.getElementById('module-save-playlist');
                this.closeSaveModule(moduleDropdown);
                
                if (window.router) window.router.navigate('/login');
                else window.location.href = (window.AppBasePath || '') + '/login';
            } else {
                container.innerHTML = `<p style="color: var(--status-danger); padding: 15px;">${res.message}</p>`;
            }
            return;
        }

        if (!res.data || res.data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 15px;">Aún no tienes listas de reproducción.</p>';
            return;
        }

        let html = '';
        res.data.forEach(pl => {
            const isChecked = pl.has_video == 1 ? 'checked' : '';
            const isSystem = pl.type !== 'custom';
            
            let title = pl.title;
            if (isSystem && pl.type === 'watch_later') {
                title = window.AppSystem?.Translator?.get('system_playlist_watch_later') || 'Ver más tarde';
            }
            
            const icon = (pl.visibility === 'private' || isSystem) ? 'lock' : (pl.visibility === 'unlisted' ? 'link' : 'public');
            const toggleUuid = (isSystem && pl.type === 'watch_later') ? 'WL' : pl.uuid;
            
            html += `
                <label class="component-playlist-item-checkbox">
                    <input type="checkbox" class="playlist-toggle-cb" data-uuid="${toggleUuid}" ${isChecked}>
                    <div class="checkbox-custom">
                        <span class="material-symbols-rounded">check</span>
                    </div>
                    <span class="playlist-title" title="${title}">${title}</span>
                    <span class="material-symbols-rounded playlist-visibility-icon">${icon}</span>
                </label>
            `;
        });

        container.innerHTML = html;

        const checkboxes = container.querySelectorAll('.playlist-toggle-cb');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', async (e) => {
                e.stopPropagation();
                const plUuid = cb.getAttribute('data-uuid');
                const isChecked = cb.checked;
                
                const toggleRes = await this.api.toggleVideoInPlaylist(plUuid, dbVideoId);
                
                if (!toggleRes.success) {
                    cb.checked = !isChecked; 
                    this.dialog.show('error', { title: 'Error', message: toggleRes.message });
                }
            });
        });
    }

    setupSubscription(data) {
        const subBtn = document.getElementById('watch-btn-subscribe');
        if (!subBtn) return;

        const newBtn = subBtn.cloneNode(true);
        subBtn.parentNode.replaceChild(newBtn, subBtn);

        const channelIdentifier = data.channel_identifier || (data.author && data.author.channel_identifier);
        
        newBtn.addEventListener('click', async () => {
            if (!channelIdentifier) return;

            const isCurrentlySubscribed = newBtn.innerText.trim().toLowerCase() === 'suscrito';
            const originalText = newBtn.innerText;
            
            if (isCurrentlySubscribed) {
                newBtn.innerText = 'Suscribirse';
                newBtn.classList.remove('component-btn-secondary');
                newBtn.classList.add('component-btn-primary');
            } else {
                newBtn.innerText = 'Suscrito';
                newBtn.classList.remove('component-btn-primary');
                newBtn.classList.add('component-btn-secondary');
            }

            const response = await this.api.postSubscribe(channelIdentifier);

            if (!response.success) {
                newBtn.innerText = originalText;
                if (isCurrentlySubscribed) {
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
                    newBtn.classList.remove('component-btn-secondary');
                    newBtn.classList.add('component-btn-primary');
                }

                if (response.message.includes('iniciar sesión')) {
                    if (window.router) window.router.navigate('/login');
                    else window.location.href = (window.AppBasePath || '') + '/login';
                } else {
                    this.dialog.show('error', { title: 'Aviso', message: response.message });
                }
            } else {
                newBtn.innerText = response.is_subscribed ? 'Suscrito' : 'Suscribirse';
                if (response.is_subscribed) {
                    newBtn.classList.remove('component-btn-primary');
                    newBtn.classList.add('component-btn-secondary');
                } else {
                    newBtn.classList.remove('component-btn-secondary');
                    newBtn.classList.add('component-btn-primary');
                }

                const subsCountEl = document.getElementById('watch-channel-subs');
                if (subsCountEl) {
                    let formatted = response.subscriber_count;
                    if (formatted >= 1000000) formatted = (formatted / 1000000).toFixed(1) + 'M';
                    else if (formatted >= 1000) formatted = (formatted / 1000).toFixed(1) + 'K';
                    subsCountEl.innerText = `${formatted} suscriptores`;
                }
            }
        });
    }

    async loadPlaylistData(playlistId, currentVideoId) {
        try {
            const response = await this.api.post('app.get_playlist_queue', { playlist_uuid: playlistId });
            if (response && response.success && response.data) {
                this.renderPlaylistPanel(response.data, currentVideoId, playlistId);
            }
        } catch (error) {
            console.error('[WatchController] Error fetching playlist queue:', error);
        }
    }

    renderPlaylistPanel(playlistData, currentVideoId, playlistId) {
        const panel = document.getElementById('watch-playlist-panel');
        const titleEl = document.getElementById('watch-playlist-title');
        const countEl = document.getElementById('watch-playlist-count');
        const itemsContainer = document.getElementById('watch-playlist-items');
        const header = document.querySelector('.watch-playlist-header');
        
        if (!panel || !itemsContainer) return;

        panel.style.display = 'flex';
        panel.classList.remove('hidden');

        let titleText = playlistData.title || 'Lista de reproducción';
        if (playlistData.type === 'watch_later') {
            titleText = window.AppSystem?.Translator?.get('system_playlist_watch_later') || 'Ver más tarde';
        }

        titleEl.textContent = titleText;
        
        const videos = playlistData.videos || [];
        const total = videos.length;
        let currentIndex = videos.findIndex(v => v.uuid === currentVideoId);
        let displayIndex = currentIndex !== -1 ? currentIndex + 1 : 1;

        let countTextTemplate = window.AppSystem?.Translator?.get('watch_playlist_videos_count') || '{current} de {total}';
        countEl.textContent = countTextTemplate.replace('{current}', displayIndex).replace('{total}', total);

        const fallbackVideoImg = window.AppConfig?.Images?.Fallbacks?.videoThumbnail || 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible';
        const onErrorHTML = `onerror="this.onerror=null; this.src='${fallbackVideoImg}';"`;

        const basePath = window.AppBasePath || '';

        let html = '';
        videos.forEach((video, index) => {
            const isActive = video.uuid === currentVideoId;
            const itemNumber = index + 1;
            
            const thumbnailUrl = video.thumbnail_url || video.thumbnail || fallbackVideoImg;
            const title = video.title || 'Video sin título';
            const author = video.username || (video.author && video.author.username) || 'Canal Rosaura';
            
            let duration = '00:00';
            if (video.duration_formatted) {
                duration = video.duration_formatted;
            } else if (video.duration) {
                const totalSeconds = parseInt(video.duration, 10);
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                duration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }

            const watchUrl = `${basePath}/watch/${video.uuid}?list=${playlistId}`;

            html += `
                <a href="${watchUrl}" data-nav="${watchUrl}" class="watch-playlist-item ${isActive ? 'active' : ''}" data-uuid="${video.uuid}">
                    <div class="watch-playlist-item-index">${itemNumber}</div>
                    <div class="watch-playlist-item-playing-icon">
                        <span class="material-symbols-rounded" style="font-size: 16px;">play_arrow</span>
                    </div>
                    <div class="watch-playlist-item-thumb">
                        <img src="${thumbnailUrl}" alt="${title}" ${onErrorHTML}>
                        <span class="watch-playlist-item-duration">${duration}</span>
                    </div>
                    <div class="watch-playlist-item-info">
                        <h4 class="watch-playlist-item-title" title="${title}">${title}</h4>
                        <span class="watch-playlist-item-author">${author}</span>
                    </div>
                </a>
            `;
        });

        itemsContainer.innerHTML = html;

        if (header && !header.hasAttribute('data-listener-attached')) {
            header.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
            });
            header.setAttribute('data-listener-attached', 'true');
        }

        setTimeout(() => {
            const activeItem = itemsContainer.querySelector('.watch-playlist-item.active');
            if (activeItem) {
                itemsContainer.scrollTop = activeItem.offsetTop - itemsContainer.offsetTop - 10;
            }
        }, 300);
    }

    async loadRecommendedVideos(dbVideoId) {
        try {
            const response = await this.api.post('app.get_recommendations', { video_id: dbVideoId, limit: 12 });
            
            if (response && response.success) {
                let videoList = [];
                if (Array.isArray(response.data)) videoList = response.data;

                this.renderRecommendedVideos(videoList);
            } else {
                this.renderRecommendedVideos([]);
            }
        } catch (error) {
            console.error('[WatchController] Error fetching recommended videos:', error);
            this.renderRecommendedVideos([]);
        }
    }

    renderRecommendedVideos(videos) {
        const container = document.getElementById('watch-recommended-videos');
        if (!container) return;
        if (!Array.isArray(videos)) videos = []; 

        if (videos.length === 0) {
            container.innerHTML = '<p class="watch-placeholder-text">No hay videos sugeridos disponibles por el momento.</p>';
            return;
        }

        const fallbackVideoImg = window.AppConfig?.Images?.Fallbacks?.videoThumbnail || 'https://placehold.co/1280x720/1a1a1a/e0e0e0?text=Video+No+Disponible';
        const onErrorHTML = `onerror="this.onerror=null; this.src='${fallbackVideoImg}';"`;

        const basePath = window.AppBasePath || '';

        let html = '';
        videos.forEach(video => {
            const title = video.title || 'Sin Título';
            const channelName = video.username || (video.author && video.author.username) || 'Canal Rosaura';
            const views = video.views ? parseInt(video.views).toLocaleString('es-MX') : '0';
            
            let duration = '00:00';
            if (video.duration_formatted) {
                duration = video.duration_formatted;
            } else if (video.duration) {
                const totalSeconds = parseInt(video.duration, 10);
                const m = Math.floor(totalSeconds / 60);
                const s = totalSeconds % 60;
                duration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            
            const thumbnailUrl = video.thumbnail_url || video.thumbnail || fallbackVideoImg; 
            const watchUrl = `${basePath}/watch/${video.uuid}`;
            const streamUrl = `${basePath}/api/media/stream?uuid=${video.uuid}`;

            html += `
                <a href="${watchUrl}" data-nav="${watchUrl}" class="component-video-card component-video-card--horizontal" style="display: flex !important; flex-direction: row !important; align-items: flex-start; gap: 10px; text-decoration: none; color: inherit; width: 100%; border-radius: 8px; cursor: pointer;">
                    <div class="component-video-card__thumbnail-container" style="position: relative; width: 168px; min-width: 168px; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background-color: #222; flex-shrink: 0;">
                        <img src="${thumbnailUrl}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1;" alt="${title}" ${onErrorHTML}>
                        
                        <video class="component-video-card__player" data-src="${streamUrl}" preload="none" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 2; opacity: 0; transition: opacity 0.3s;" onplay="this.style.opacity=1;" onpause="this.style.opacity=0;"></video>
                        
                        <span class="component-video-card__duration" style="position: absolute; bottom: 4px; right: 4px; background-color: rgba(0,0,0,0.8); color: white; font-size: 12px; padding: 2px 4px; border-radius: 4px; z-index: 3; font-weight: 500;">
                            ${duration}
                        </span>
                    </div>
                    
                    <div class="component-video-card__info" style="display: flex; flex-direction: column; overflow: hidden; padding-top: 2px; width: 100%;">
                        <h3 class="component-video-card__title" title="${title}" style="font-size: 14px; margin: 0 0 4px 0; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                            ${title}
                        </h3>
                        <div class="component-video-card__meta" style="font-size: 12px; color: var(--text-secondary, #AAAAAA); line-height: 1.4;">
                            <div class="component-video-card__channel" style="margin-bottom: 2px;">${channelName}</div>
                            <div class="component-video-card__views-date">${views} visualizaciones</div>
                        </div>
                    </div>
                </a>
            `;
        });

        container.innerHTML = html;
    }

    renderRealData(data, playlistId) {
        const titleEl = document.getElementById('watch-video-title');
        const transBadgeContainer = document.getElementById('watch-translation-badge-container');
        const transToggleBtn = document.getElementById('watch-translation-toggle');
        
        if (titleEl) {
            titleEl.textContent = data.title || 'Sin Título';

            if (data.is_translated && data.original_title_hidden) {
                if (transBadgeContainer) transBadgeContainer.style.display = 'block';
                
                titleEl.dataset.translatedTitle = data.title;
                titleEl.dataset.originalTitle = data.original_title_hidden;
                titleEl.dataset.showingTranslated = 'true';

                if (transToggleBtn) {
                    const newBtn = transToggleBtn.cloneNode(true);
                    transToggleBtn.parentNode.replaceChild(newBtn, transToggleBtn);
                    
                    newBtn.addEventListener('click', () => {
                        const isTranslated = titleEl.dataset.showingTranslated === 'true';
                        if (isTranslated) {
                            titleEl.textContent = titleEl.dataset.originalTitle;
                            titleEl.dataset.showingTranslated = 'false';
                            newBtn.querySelector('#watch-translation-text').textContent = 'Ver traducción';
                        } else {
                            titleEl.textContent = titleEl.dataset.translatedTitle;
                            titleEl.dataset.showingTranslated = 'true';
                            newBtn.querySelector('#watch-translation-text').textContent = 'Traducido';
                        }
                    });
                }
            } else {
                if (transBadgeContainer) transBadgeContainer.style.display = 'none';
            }
        }

        const channelNameEl = document.getElementById('watch-channel-name');
        if (channelNameEl) channelNameEl.textContent = data.channel_name || (data.author && data.author.username) || 'Canal Rosaura';
        
        const channelAvatarEl = document.getElementById('watch-channel-avatar');
        if (channelAvatarEl && data.channel_avatar) {
            channelAvatarEl.src = (window.AppBasePath || '') + '/' + data.channel_avatar;
        }

        const viewsEl = document.getElementById('watch-video-views');
        if (viewsEl) {
            viewsEl.textContent = `${(data.views || 0).toLocaleString('es-MX')} visualizaciones`;
        }

        const likesEl = document.getElementById('watch-like-count');
        if (likesEl) {
            likesEl.textContent = (data.likes || 0).toLocaleString('es-MX');
        }

        const dateEl = document.getElementById('watch-video-date');
        if (dateEl) {
            const pubDate = new Date(data.published_at || data.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = pubDate.toLocaleDateString('es-ES', options);
        }

        const descEl = document.getElementById('watch-video-description');
        if (descEl) {
            descEl.textContent = data.description || 'Este video no tiene una descripción.';
        }

        const subsCountEl = document.getElementById('watch-channel-subs');
        if (subsCountEl) {
            let formatted = data.subscriber_count || 0;
            if (formatted >= 1000000) formatted = (formatted / 1000000).toFixed(1) + 'M';
            else if (formatted >= 1000) formatted = (formatted / 1000).toFixed(1) + 'K';
            subsCountEl.textContent = `${formatted} suscriptores`;
        }

        const subBtn = document.getElementById('watch-btn-subscribe');
        if (subBtn) {
            if (data.is_subscribed) {
                subBtn.innerText = 'Suscrito';
                subBtn.classList.remove('component-btn-primary');
                subBtn.classList.add('component-btn-secondary');
            } else {
                subBtn.innerText = 'Suscribirse';
                subBtn.classList.remove('component-btn-secondary');
                subBtn.classList.add('component-btn-primary');
            }
        }

        const tagsContainer = document.getElementById('watch-video-tags-container');
        let hasModelsOrCategories = false;

        if (tagsContainer) {
            let tagsHTML = '';
            if (data.models && data.models.length > 0) {
                tagsHTML += data.models.map(m => 
                    `<span class="watch-tag-item"><span class="material-symbols-rounded">star</span> ${m.name}</span>`
                ).join('');
                hasModelsOrCategories = true;
            }
            if (data.categories && data.categories.length > 0) {
                tagsHTML += data.categories.map(c => 
                    `<span class="watch-tag-item"><span class="material-symbols-rounded">label</span> ${c.name}</span>`
                ).join('');
                hasModelsOrCategories = true;
            }

            if (tagsHTML === '') {
                tagsContainer.innerHTML = '<span class="watch-tag-item" style="opacity: 0.5;">Sin modelos ni categorías</span>';
            } else {
                tagsContainer.innerHTML = tagsHTML;
            }
        }

        const customTagsSection = document.getElementById('watch-custom-tags-section');
        const customTagsContainer = document.getElementById('watch-video-custom-tags-container');
        const tagsDivider = document.getElementById('watch-tags-divider');
        const customTags = data.tags || []; 

        if (customTagsSection && customTagsContainer) {
            if (customTags && customTags.length > 0) {
                let customTagsHTML = customTags.map(t => {
                    const tagName = (typeof t === 'object') ? t.name : t;
                    return `<span class="watch-tag-item"><span class="material-symbols-rounded">tag</span> ${tagName}</span>`;
                }).join('');

                customTagsContainer.innerHTML = customTagsHTML;
                customTagsSection.style.display = 'block';

                if (tagsDivider) tagsDivider.style.display = hasModelsOrCategories ? 'block' : 'none';
            } else {
                customTagsSection.style.display = 'none';
            }
        }

        const rawColor = data.dominant_color || data.color; 
        
        if (rawColor) {
            const primaryColor = rawColor.trim(); 
            const detailBoxes = (this.container || document).querySelectorAll('.watch-details-box');
            
            let hoverColor = 'var(--bg-hover-light)'; 
            
            if (primaryColor.startsWith('#')) {
                if (primaryColor.length === 7) hoverColor = primaryColor + '1A';
                else if (primaryColor.length === 4) {
                    const r = primaryColor[1], g = primaryColor[2], b = primaryColor[3];
                    hoverColor = `#${r}${r}${g}${g}${b}${b}1A`;
                } else if (primaryColor.length === 9) hoverColor = primaryColor.substring(0, 7) + '1A';
                else hoverColor = primaryColor;
            } else if (primaryColor.startsWith('rgb') && !primaryColor.startsWith('rgba')) {
                hoverColor = primaryColor.replace('rgb', 'rgba').replace(')', ', 0.1)');
            } else if (primaryColor.startsWith('rgba')) {
                hoverColor = primaryColor.replace(/[\d.]+\)$/, '0.1)');
            } else hoverColor = primaryColor;

            detailBoxes.forEach(box => {
                box.style.setProperty('--hover-bg-color', hoverColor);
            });
            
            const playlistHeaders = (this.container || document).querySelectorAll('.watch-playlist-header');
            playlistHeaders.forEach(header => {
                header.style.setProperty('--hover-bg-color', hoverColor);
            });
        }
    }

    showError404(message = 'El video solicitado no fue encontrado.') {
        if (window.AppRouter && typeof window.AppRouter.renderHttpError === 'function') {
            window.AppRouter.renderHttpError(404, 'Video No Encontrado', message);
        } else if (this.container) {
            this.container.innerHTML = `
                <div class="component-message-layout" style="display: flex; justify-content: center; align-items: center; min-height: 50vh;">
                    <div class="component-message-box" style="text-align: center;">
                        <div class="component-message-icon-wrapper" style="margin-bottom: 16px;">
                            <span class="material-symbols-rounded component-message-icon" style="font-size: 48px; color: var(--text-secondary);">error</span>
                        </div>
                        <h1 class="component-message-title" style="font-size: 24px; margin-bottom: 8px;">Error 404</h1>
                        <p class="component-message-desc" style="color: var(--text-secondary);">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    // Asegurarse de limpiar los nuevos intervalos al destruir la vista
    destroy() {
        if (this.checkPlayerInterval) clearInterval(this.checkPlayerInterval);
        if (this.telemetryVideoCheckInterval) clearInterval(this.telemetryVideoCheckInterval);
        if (this.telemetryInterval) clearInterval(this.telemetryInterval);
        
        if (this.playerSystem) {
            this.playerSystem.destroy();
            this.playerSystem = null;
        }
        if (this.commentSystem) {
            this.commentSystem.destroy();
            this.commentSystem = null;
        }
    }
}