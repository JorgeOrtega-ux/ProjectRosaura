// public/assets/js/core/dialog-templates.js

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