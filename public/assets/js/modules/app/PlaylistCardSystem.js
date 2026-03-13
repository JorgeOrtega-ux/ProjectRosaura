// public/assets/js/core/components/PlaylistCardSystem.js

export class PlaylistCardSystem {
    
    static resolveThumbUrl(pathOrUrl) {
        const basePath = window.AppBasePath || '';
        if (!pathOrUrl) return `${basePath}/public/assets/images/default-thumb.png`;
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
        }
        return playlist.title || 'Lista sin título';
    }

    static createCard(playlistData) {
        const basePath = window.AppBasePath || '';
        
        const uuid = playlistData.uuid || '';
        const title = this.getTranslatedTitle(playlistData);
        const videoCount = playlistData.video_count || 0;
        const visibility = playlistData.visibility || 'private';
        const isSystem = playlistData.isSystem || playlistData.type !== 'custom';
        
        const thumbSrc = this.resolveThumbUrl(playlistData.thumbnail_url || playlistData.thumbnail_path);
        
        // Si es la de sistema (Watch Later), usamos el alias 'WL' para que el router sepa qué hacer.
        // Si no, usamos su UUID normal.
        const routingParam = (isSystem && playlistData.type === 'watch_later') ? 'WL' : uuid;
        
        const watchUrl = `${basePath}/playlist?list=${routingParam}`;
        
        let visibilityIcon = 'public';
        if (visibility === 'private' || isSystem) visibilityIcon = 'lock';
        else if (visibility === 'unlisted') visibilityIcon = 'link';

        const systemBadgeHTML = isSystem 
            ? `<div class="component-playlist-card__badge-system"><span class="material-symbols-rounded">push_pin</span></div>` 
            : '';

        return `
            <a href="${watchUrl}" class="component-playlist-card" onclick="event.preventDefault(); window.spaRouter.navigate('${watchUrl}');">
                <div class="component-playlist-card__thumbnail-container">
                    <img src="${thumbSrc}" alt="Miniatura de ${title}" class="component-playlist-card__img" loading="lazy">
                    <div class="component-playlist-card__overlay">
                        <div class="component-playlist-card__overlay-content">
                            <span class="material-symbols-rounded component-playlist-card__icon-play">play_arrow</span>
                            <span class="component-playlist-card__play-text">${__('playlist_play_all', 'Reproducir todo')}</span>
                        </div>
                    </div>
                    <div class="component-playlist-card__count-badge">
                        <span class="material-symbols-rounded">playlist_play</span>
                        ${videoCount} videos
                    </div>
                    ${systemBadgeHTML}
                </div>
                <div class="component-playlist-card__info">
                    <h3 class="component-playlist-card__title" title="${title}">${title}</h3>
                    <div class="component-playlist-card__meta">
                        <span class="material-symbols-rounded component-playlist-card__visibility" title="${visibility}">${visibilityIcon}</span>
                        <span class="component-playlist-card__count">${__('playlist_view_full', 'Ver lista completa')}</span>
                    </div>
                </div>
            </a>
        `;
    }
}