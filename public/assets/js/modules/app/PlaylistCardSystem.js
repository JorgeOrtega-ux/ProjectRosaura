// public/assets/js/modules/app/PlaylistCardSystem.js

export class PlaylistCardSystem {
    
    static resolveThumbUrl(pathOrUrl, videoCount = -1) {
        // CAPA 1 Lógica: Si la lista existe pero tiene 0 videos, devolvemos fallback de playlist
        if (videoCount === 0) {
            return window.AppConfig?.Images?.Fallbacks?.playlistEmpty || 'https://placehold.co/1280x720/2d2d2d/a0a0a0?text=Playlist+Vacia';
        }

        const basePath = window.AppBasePath || '';
        
        // CAPA 1 Datos: Si no hay ruta enviada, asumimos playlist vacía o sin imagen
        if (!pathOrUrl) {
            return window.AppConfig?.Images?.Fallbacks?.playlistEmpty || `${basePath}/public/assets/images/default-thumb.png`;
        }
        
        if (pathOrUrl.startsWith('http')) return pathOrUrl;
        
        let cleanPath = pathOrUrl.replace(/^\//, '');
        let baseNoSlash = basePath.replace(/^\//, '');
        if (baseNoSlash && cleanPath.startsWith(baseNoSlash + '/')) {
            cleanPath = cleanPath.substring(baseNoSlash.length + 1);
        }
        return `${basePath}/${cleanPath}`;
    }

    static getTranslatedTitle(playlist) {
        if (playlist.isSystem || playlist.type !== 'custom') {
            if (playlist.type === 'watch_later') {
                return window.AppSystem?.Translator?.get('system_playlist_watch_later') || 'Ver más tarde';
            }
            if (playlist.type === 'liked_videos') {
                return window.AppSystem?.Translator?.get('menu_liked_videos') || 'Videos que me gustan';
            }
        }
        return playlist.title || 'Lista sin título';
    }

    static createCard(playlistData) {
        const basePath = window.AppBasePath || '';
        
        const uuid = playlistData.uuid || '';
        const title = this.getTranslatedTitle(playlistData);
        const videoCount = parseInt(playlistData.video_count) || 0; // Aseguramos que sea entero
        const isSystem = playlistData.isSystem || playlistData.type !== 'custom';
        
        // Pasamos el videoCount a la función de validación
        const thumbSrc = this.resolveThumbUrl(playlistData.thumbnail_url || playlistData.thumbnail_path, videoCount);
        
        // Asignación de rutas correctas dependiendo de si es de sistema o creada.
        let routingParam = uuid;
        if (isSystem) {
            if (playlistData.type === 'watch_later') routingParam = 'WL';
            else if (playlistData.type === 'liked_videos') routingParam = 'LL';
        }
        
        const playlistUrl = `${basePath}/playlist?list=${routingParam}`;
        
        // Manejo de traducciones y datos de fallback
        const textUpdated = window.AppTranslations?.['playlist_updated_ago'] || 'Actualizada hace';
        const metaText = playlistData.updated_at_human 
            ? `${textUpdated} ${playlistData.updated_at_human}` 
            : (window.AppTranslations?.['playlist_view_full'] || 'Ver lista completa');

        const userName = playlistData.user_name || playlistData.creator_name || 'ProjectRosaura';
        const userAvatar = playlistData.user_avatar || `${basePath}/public/storage/profilePictures/default/b463a327-c705-4b03-960c-7c927c3649c4.png`;
        const dominantColor = playlistData.dominant_color || '#530e17';

        // CAPA 2 (Network): Fallback string para inyectar en onerror
        const fallbackImg = window.AppConfig?.Images?.Fallbacks?.playlistEmpty || 'https://placehold.co/1280x720/2d2d2d/a0a0a0?text=Playlist+Vacia';
        const onErrorHTML = `onerror="this.onerror=null; this.src='${fallbackImg}';"`;

        return `
            <div class="component-video-card nav-item playlist-folder-style" style="--local-dominant-color: ${dominantColor}; cursor: pointer;" data-nav="${playlistUrl}" onclick="if(window.spaRouter) { event.preventDefault(); window.spaRouter.navigate('${playlistUrl}'); } else { window.location.href='${playlistUrl}'; }">
                <div class="component-video-card__top">
                    <img src="${thumbSrc}" alt="Miniatura de ${title}" class="component-video-card__thumbnail" loading="lazy" ${onErrorHTML}>
                    <span class="component-video-card__duration" style="display: flex; align-items: center; gap: 4px; padding: 4px 8px;">
                        <span class="material-symbols-rounded" style="font-size: 14px;">playlist_play</span>
                        ${videoCount} videos
                    </span>
                </div>
                <div class="component-video-card__bottom">
                    <div class="component-video-card__avatar">
                        <img src="${userAvatar}" alt="Perfil de ${userName}" loading="lazy">
                    </div>
                    <div class="component-video-card__info">
                        <h3 class="component-video-card__title" title="${title}">${title}</h3>
                        <p class="component-video-card__user">${userName}</p>
                        <p class="component-video-card__meta">${metaText}</p>
                    </div>
                </div>
            </div>
        `;
    }
}