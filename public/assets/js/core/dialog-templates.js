// public/assets/js/core/dialog-templates.js

export const DialogTemplates = {
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
            <div class="component-dialog-header" style="align-items: center; text-align: center; padding: 16px 0;">
                <div class="component-spinner" style="width: 44px; height: 44px; border-width: 4px; margin-bottom: 16px;"></div>
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
                    <span class="component-link" id="btn-dialog-resend-code" style="pointer-events: none; color: #999999;">Reenviar código de verificación (60)</span>
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
                <h2 class="component-dialog-title">Cerrar todas las sesiones</h2>
                <p class="component-dialog-desc">¿Estás seguro de que deseas cerrar sesión en todos los demás dispositivos? Tendrás que volver a iniciar sesión en ellos.</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-dialog-action="confirm">Cerrar todas</button>
            </div>
        `
    }
};