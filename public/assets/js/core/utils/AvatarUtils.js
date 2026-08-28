/**
 * AvatarUtils.js
 * Fuente Única de Verdad (SSOT) para la resolución, renderizado y fallbacks
 * de fotos de perfil, avatares dinámicos SVG, bordes de roles y suscripción en ProjectRosaura.
 */

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function base64UrlEncode(str) {
    try {
        const utf8Bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binary += String.fromCharCode(utf8Bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } catch (e) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}

export const AvatarUtils = {
    /**
     * Genera la URL del avatar SVG determinista con inicial y color calculado
     * idéntico al backend en api/avatar/avatar.php.
     * 
     * @param {string} name - Nombre o inicial del usuario
     * @param {string|number} [seed=''] - Semilla (email o ID) para color consistente
     * @returns {string} URL absoluta/relativa al endpoint de avatar
     */
    generateDefaultAvatarUrl(name = 'U', seed = '') {
        const basePath = window.AppBasePath || '';
        const cleanName = String(name || 'U').trim();
        let payload = cleanName || 'U';
        if (seed !== null && seed !== undefined && String(seed).trim() !== '') {
            payload += ':' + String(seed).trim();
        }
        const token = base64UrlEncode(`RosauraUser:${payload}`);
        return `${basePath}/avatar/${token}`;
    },

    /**
     * Extrae el nombre de usuario de cualquier estructura de datos de usuario.
     * 
     * @param {object|string} user - Objeto de usuario o nombre directo
     * @param {string} [fallback='Usuario'] - Fallback en caso de no encontrarse
     * @returns {string}
     */
    getDisplayName(user, fallback = 'Usuario') {
        if (!user) return fallback;
        if (typeof user === 'string') return user.trim() || fallback;
        return user.username || 
               user.user_name || 
               user.name || 
               user.actor_username || 
               user.admin_username || 
               user.displayName || 
               (user.id ? `Usuario #${user.id}` : fallback);
    },

    /**
     * Resuelve la URL real y válida del avatar a partir de cualquier objeto o string.
     * Si la imagen no está definida o es un fallback roto antiguo, genera el SVG correspondiente.
     * 
     * @param {object|string} userOrUrl - Objeto de usuario o URL directa
     * @param {string} [fallbackName=''] - Nombre para calcular inicial si no viene en user
     * @param {string|number} [fallbackSeed=''] - Semilla para el color
     * @returns {string} URL limpia y válida
     */
    getAvatarUrl(userOrUrl, fallbackName = '', fallbackSeed = '') {
        const basePath = window.AppBasePath || '';

        if (!userOrUrl) {
            return this.generateDefaultAvatarUrl(fallbackName || 'U', fallbackSeed);
        }

        let rawUrl = '';
        let resolvedName = fallbackName;
        let resolvedSeed = fallbackSeed;

        if (typeof userOrUrl === 'object') {
            rawUrl = userOrUrl.avatar || 
                     userOrUrl.avatar_url || 
                     userOrUrl.profile_picture || 
                     userOrUrl.user_pic || 
                     userOrUrl.actor_avatar || 
                     userOrUrl.admin_profile_picture || 
                     '';
            resolvedName = this.getDisplayName(userOrUrl, fallbackName);
            resolvedSeed = userOrUrl.email || userOrUrl.id || userOrUrl.uuid || userOrUrl.user_id || fallbackSeed;
        } else if (typeof userOrUrl === 'string') {
            rawUrl = userOrUrl.trim();
        }

        if (!rawUrl) {
            return this.generateDefaultAvatarUrl(resolvedName || 'U', resolvedSeed);
        }

        // Si es una URL completa externa o data URL
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
            return rawUrl;
        }

        // Limpiar prefijos erróneos repetidos como /public/avatar/... o /public/assets/...
        if (rawUrl.includes('/public/avatar/')) {
            rawUrl = rawUrl.replace('/public/avatar/', '/avatar/');
        }

        // Si es un token de avatar
        if (rawUrl.startsWith('/avatar/') || rawUrl.startsWith('avatar/')) {
            const cleanAvatar = '/' + rawUrl.replace(/^\/+/, '');
            // Si es el token genérico antiguo "RosauraUser:U", regenerar con el nombre real
            if (cleanAvatar.includes('Um9zYXVyYVVzZXI6VQ') && resolvedName && resolvedName !== 'U' && resolvedName !== 'Usuario') {
                return this.generateDefaultAvatarUrl(resolvedName, resolvedSeed);
            }
            return `${basePath}${cleanAvatar}`;
        }

        // Si es una imagen en assets
        if (rawUrl.includes('assets/img/fallbacks/avatar-default.png')) {
            return this.generateDefaultAvatarUrl(resolvedName || 'U', resolvedSeed);
        }

        if (rawUrl.startsWith('/assets/') || rawUrl.startsWith('assets/')) {
            const cleanAsset = '/' + rawUrl.replace(/^\/+/, '');
            return `${basePath}${cleanAsset}`;
        }

        // Si es una ruta relativa de S3
        if (rawUrl.startsWith('profilePictures/') || rawUrl.startsWith('uploaded/') || rawUrl.startsWith('thumbnails/')) {
            return `${basePath}/${rawUrl.replace(/^\/+/, '')}`;
        }

        return rawUrl;
    },

    /**
     * Calcula las propiedades de borde (suscripción dinámica, color de usuario o rol).
     * 
     * @param {object|string} userOrColor - Objeto de usuario o color CSS directo
     * @returns {object} { hasBorder, borderBg, className, style, subBg, isDynamic }
     */
    getRoleBorder(userOrColor) {
        if (!userOrColor) {
            return {
                hasBorder: false,
                borderBg: '',
                className: '',
                style: '',
                subBg: '',
                isDynamic: false
            };
        }

        let subBg = '';
        let userColor = '';

        if (typeof userOrColor === 'string') {
            subBg = userOrColor;
        } else if (typeof userOrColor === 'object') {
            subBg = userOrColor.sub_bg || 
                    userOrColor.subBg || 
                    userOrColor.subscription_bg || 
                    userOrColor.subscription_color || 
                    '';
            
            // Si es un JSON de color de suscripción
            if (typeof subBg === 'string' && subBg.startsWith('{')) {
                try {
                    const parsed = JSON.parse(subBg);
                    if (parsed.type === 'gradient' && Array.isArray(parsed.colors) && parsed.colors.length > 1) {
                        const angle = parsed.angle || 0;
                        const stops = parsed.colors.map(c => typeof c === 'string' ? c : (c.hex || '#000000')).join(', ');
                        subBg = `linear-gradient(${angle}deg, ${stops})`;
                    } else if (parsed.colors && parsed.colors[0]) {
                        subBg = typeof parsed.colors[0] === 'string' ? parsed.colors[0] : (parsed.colors[0].hex || '');
                    }
                } catch (e) {}
            }

            userColor = userOrColor.userColor || userOrColor.color || userOrColor.role_color || '';
        }

        if (subBg && subBg !== 'transparent' && subBg !== 'none') {
            return {
                hasBorder: true,
                borderBg: subBg,
                className: 'subscription-dynamic',
                style: `--active-subscription-bg: ${subBg};`,
                subBg: subBg,
                isDynamic: true
            };
        }

        if (userColor && userColor !== 'transparent' && userColor !== 'none') {
            return {
                hasBorder: true,
                borderBg: userColor,
                className: '',
                style: `box-shadow: 0 0 0 2px ${userColor};`,
                subBg: '',
                userColor: userColor,
                isDynamic: false
            };
        }

        return {
            hasBorder: false,
            borderBg: '',
            className: '',
            style: '',
            subBg: '',
            isDynamic: false
        };
    },

    /**
     * Renderiza el HTML completo y estandarizado para un botón o contenedor de avatar.
     * 
     * @param {object|string} user - Objeto de usuario
     * @param {object} [options={}] - Opciones de renderizado
     * @returns {string} HTML seguro
     */
    renderAvatarHTML(user, options = {}) {
        const name = this.getDisplayName(user, options.fallbackName || 'Usuario');
        const seed = (typeof user === 'object' && user) ? (user.email || user.id || user.uuid || '') : '';
        const avatarUrl = this.getAvatarUrl(user, name, seed);
        const border = this.getRoleBorder(user);

        const isButton = options.isButton !== false; // default true
        const sizeClass = options.sizeClass || ''; // e.g. 'component-avatar--36', 'component-avatar--40', 'component-avatar--static-sm'
        const customClasses = options.className || '';
        const tag = isButton ? 'button' : 'div';
        const typeAttr = isButton ? 'type="button"' : '';
        
        let classList = isButton ? 'component-button component-button--profile' : 'component-avatar';
        if (sizeClass) classList += ` ${sizeClass}`;
        if (border.className) classList += ` ${border.className}`;
        if (customClasses) classList += ` ${customClasses}`;

        let attrs = '';
        if (border.subBg) attrs += ` data-sub-bg="${escapeHTML(border.subBg)}"`;
        if (border.style) attrs += ` style="${escapeHTML(border.style)}"`;
        if (options.tooltip) attrs += ` data-tooltip="${escapeHTML(options.tooltip)}" data-position="${options.tooltipPosition || 'bottom'}"`;
        if (options.action) attrs += ` data-action="${escapeHTML(options.action)}"`;
        if (options.extraAttrs) attrs += ` ${options.extraAttrs}`;

        const fallbackUrl = this.generateDefaultAvatarUrl(name, seed);

        return `
            <${tag} ${typeAttr} class="${classList.trim()}" ${attrs.trim()}>
                <img src="${escapeHTML(avatarUrl)}" 
                     alt="${escapeHTML(name)}" 
                     decoding="async" 
                     class="image-lazy-fade image-loaded" 
                     onerror="this.onerror=null; this.src='${escapeHTML(fallbackUrl)}';">
            </${tag}>
        `.trim();
    },

    /**
     * Manejador estándar para eventos onerror de imágenes de avatar en línea.
     * 
     * @param {HTMLImageElement} img - Elemento de imagen
     * @param {string} [name='U'] - Nombre de usuario
     * @param {string|number} [seed=''] - Semilla
     */
    handleImageError(img, name = 'U', seed = '') {
        if (!img) return;
        img.onerror = null;
        img.src = this.generateDefaultAvatarUrl(name, seed);
    }
};

// Exportar globalmente para scripts tradicionales y SPA
if (typeof window !== 'undefined') {
    window.AvatarUtils = AvatarUtils;
    window.UserAvatarUtils = AvatarUtils;
}
