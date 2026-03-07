// public/assets/js/core/components/DialogTemplates.js

export const DialogTemplates = {
    // --- NUEVAS PLANTILLAS DE ESTADOS GENERALES ---
    success: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <div class="component-card__icon-container" style="color: var(--status-success, #28a745); margin-bottom: 15px;">
                    <span class="material-symbols-rounded" style="font-size: 48px;">check_circle</span>
                </div>
                <h2 class="component-dialog-title">${data.title || 'Éxito'}</h2>
                <p class="component-dialog-desc">${data.message || 'La operación se realizó correctamente.'}</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Aceptar</button>
            </div>
        `
    },
    error: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <div class="component-card__icon-container" style="color: var(--status-danger, #dc3545); margin-bottom: 15px;">
                    <span class="material-symbols-rounded" style="font-size: 48px;">error</span>
                </div>
                <h2 class="component-dialog-title">${data.title || 'Error'}</h2>
                <p class="component-dialog-desc">${data.message || 'Ha ocurrido un error inesperado.'}</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Aceptar</button>
            </div>
        `
    },
    warning: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <div class="component-card__icon-container" style="color: var(--status-warning, #ffc107); margin-bottom: 15px;">
                    <span class="material-symbols-rounded" style="font-size: 48px;">warning</span>
                </div>
                <h2 class="component-dialog-title">${data.title || 'Advertencia'}</h2>
                <p class="component-dialog-desc">${data.message || '¿Estás seguro de que deseas continuar?'}</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Continuar</button>
            </div>
        `
    },

    confirm: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">${data.title || 'Confirmar acción'}</h2>
                <p class="component-dialog-desc">${data.message || '¿Estás seguro de que deseas realizar esta acción? No se podrá deshacer.'}</p>
            </div>
            <div class="component-dialog-actions" style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="component-button component-button--h45 component-button--light component-button--full" data-dialog-action="cancel">${data.cancelText || 'Cancelar'}</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">${data.confirmText || 'Confirmar'}</button>
            </div>
        `
    },

    // --- NUEVA PLANTILLA DE VISTA PREVIA DE BANNER ---
    bannerPreviewTemplate: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Personaliza tu banner</h2>
                <p class="component-dialog-desc" style="font-size: 13px; color: #aaa; margin-top: 8px;">Ajusta el recuadro para definir cómo se verá tu banner en distintos dispositivos. Para los mejores resultados, usa una imagen de 2048 × 1152 píxeles como mínimo y 6 MB como máximo.</p>
            </div>
            <div class="component-dialog-body" style="margin-top: 16px;">
                
                <div class="banner-crop-layout">
                    <div class="banner-crop-wrapper">
                        <img src="${data.imageUrl}" class="banner-crop-image" id="bannerCropImage" />
                        
                        <div class="crop-mask crop-mask-top"></div>
                        <div class="crop-mask crop-mask-bottom"></div>
                        <div class="crop-mask crop-mask-left"></div>
                        <div class="crop-mask crop-mask-right"></div>
                        
                        <div class="banner-crop-box" id="bannerCropBox">
                            <div class="crop-safe-mobile">
                                <span class="crop-label">Visible en todos los dispositivos</span>
                            </div>
                            <div class="crop-safe-desktop">
                                <span class="crop-label">Visible en computadoras</span>
                            </div>
                            <span class="crop-label crop-label-tv">Visible en TV</span>
                            
                            <div class="crop-handle handle-nw" data-handle="nw"></div>
                            <div class="crop-handle handle-ne" data-handle="ne"></div>
                            <div class="crop-handle handle-sw" data-handle="sw"></div>
                            <div class="crop-handle handle-se" data-handle="se"></div>
                        </div>
                    </div>
                </div>

            </div>
            <div class="component-dialog-actions" style="margin-top: 24px;">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Aplicar y guardar</button>
            </div>
        `
    },

    // --- TUS PLANTILLAS ORIGINALES ---
    confirmDeleteAvatar: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Eliminar foto de perfil</h2>
                <p class="component-dialog-desc">¿Estás seguro de que deseas eliminar tu foto de perfil? Esta acción restaurará el avatar por defecto y no se puede deshacer.</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Eliminar</button>
            </div>
        `
    },
    loadingEmailCode: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header component-dialog-content--centered">
                <div class="component-card__icon-container">
                    <div class="component-spinner component-spinner--centered"></div>
                </div>
                <h2 class="component-dialog-title">Enviando código...</h2>
                <p class="component-dialog-desc">Por favor espera un momento mientras procesamos tu solicitud.</p>
            </div>
        `
    },
    verifyEmailCode: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Busca el código que te enviamos</h2>
                <p class="component-dialog-desc">Para hacer cambios en tu cuenta, primero tienes que ingresar el código que te enviamos a <b>${data.email || 'tu correo'}</b>.</p>
            </div>
            <div class="component-dialog-body">
                <div class="component-input-group">
                    <input type="text" id="dialog_email_code" class="component-input-field" placeholder=" " maxlength="14">
                    <label for="dialog_email_code" class="component-input-label">Código de verificación</label>
                </div>
                
                <div class="component-link-container component-link-container--start">
                    <span class="component-link-text">¿No recibiste el código?</span>
                    <span class="component-link disabled-interaction component-text-notice--muted" id="btn-dialog-resend-code">Reenviar código de verificación (60)</span>
                </div>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Verificar</button>
            </div>
        `
    },
    confirmRevokeAllDevices: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Cerrar sesiones</h2>
                <p class="component-dialog-desc">Elige qué sesiones deseas cerrar. Tendrás que volver a iniciar sesión en los dispositivos cerrados.</p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-dialog-action="revoke_all">Cerrar TODAS (incluso esta)</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="revoke_other">Cerrar todas EXCEPTO esta</button>
                <button class="component-button component-button--h45 component-button--full hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
            </div>
        `
    }
};