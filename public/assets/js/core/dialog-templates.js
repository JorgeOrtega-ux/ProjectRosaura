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
                <button class="component-button component-button--h45" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark" data-dialog-action="confirm">Eliminar</button>
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
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Verificar identidad</h2>
                <p class="component-dialog-desc">Hemos enviado un código a tu correo actual. Ingresa el código para poder modificar tu correo electrónico.</p>
            </div>
            <div class="component-dialog-body" style="margin-top: 16px;">
                <div class="component-input-group">
                    <input type="text" id="dialog_email_code" class="component-input-field" placeholder=" " maxlength="14">
                    <label for="dialog_email_code" class="component-input-label">Código de verificación</label>
                </div>
            </div>
            <div class="component-dialog-actions" style="margin-top: 24px;">
                <button class="component-button component-button--h45" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark" data-dialog-action="confirm">Verificar</button>
            </div>
        `
    }
};