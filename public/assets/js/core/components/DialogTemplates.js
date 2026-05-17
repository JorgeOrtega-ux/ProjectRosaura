// public/assets/js/core/components/DialogTemplates.js

export const DialogTemplates = {
    // --- NUEVO: PLANTILLA PARA ACTIVAR 2FA ---
    activate2FADialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">${data.title || 'Activar autenticación'}</h2>
                <p class="component-dialog-desc">${data.desc || 'Ingresa el código de 6 dígitos generado por tu aplicación de autenticación para verificar y activar la seguridad.'}</p>
            </div>
            <div class="component-dialog-body">
                <div class="component-input-group">
                    <input type="text" id="dialog_2fa_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off">
                    <label for="dialog_2fa_code" class="component-input-label">Código de 6 dígitos</label>
                </div>
            </div>
            <div class="component-dialog-actions" style="margin-top: 15px;">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Activar</button>
            </div>
        `
    },

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
    },

    roleForm: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">${data.title || 'Rol'}</h2>
                <p class="component-dialog-desc">Configura el nombre y el color identificador para este rol en el sistema.</p>
            </div>
            <div class="component-dialog-body">
                <div class="component-input-group">
                    <input type="text" data-ref="roleNameInput" class="component-input-field" placeholder=" " value="${data.nameValue || ''}" maxlength="50" autocomplete="off">
                    <label class="component-input-label">${data.nameLabel}</label>
                </div>
                
                <div class="component-input-group" style="margin-top: 24px;">
                    <p class="component-input-label" style="position: static; margin-bottom: 8px; font-size: 14px;">${data.colorLabel}</p>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="color" data-ref="roleColorInput" value="${data.colorValue || '#808080'}" style="width: 45px; height: 45px; border: none; border-radius: 8px; cursor: pointer; padding: 0; background: none;">
                        <span style="font-family: monospace; font-size: 16px; font-weight: 500;" data-ref="roleColorDisplay">${data.colorValue || '#808080'}</span>
                    </div>
                </div>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">${data.confirmText || 'Guardar'}</button>
            </div>
        `
    },

    editRolePermissions: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">Permisos: ${data.roleName}</h2>
                <p class="component-dialog-desc">Asigna o revoca los permisos de acceso y acciones en el sistema para este rol.</p>
            </div>
            <div class="component-dialog-body" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                <div class="permissions-list" style="display: flex; flex-direction: column; gap: 10px;">
                    ${data.permissionsListHtml}
                </div>
            </div>
            <div class="component-dialog-actions" style="margin-top: 15px;">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">Guardar permisos</button>
            </div>
        `
    },

    verifyPasswordDialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <div class="component-card__icon-container component-card__icon-container--bordered" style="margin: 0 auto 16px auto;">
                    <span class="material-symbols-rounded">lock</span>
                </div>
                <h2 class="component-dialog-title">${data.title || 'Verificar identidad'}</h2>
                <p class="component-dialog-desc">${data.desc || 'Por favor, ingresa tu contraseña actual para continuar con esta acción.'}</p>
            </div>
            <div class="component-dialog-body">
                <div class="component-input-group">
                    <input type="password" id="dialog_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="dialog_verify_password" class="component-input-label">Contraseña actual</label>
                    <span class="material-symbols-rounded component-input-toggle" data-dialog-action="togglePassword">visibility_off</span>
                </div>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm">${data.confirmText || 'Continuar'}</button>
            </div>
        `
    },

    // --- PLANTILLA: WARNING DINÁMICA ---
    warning: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <div class="component-card__icon-container component-card__icon-container--bordered" style="margin: 0 auto 16px auto;">
                    <span class="material-symbols-rounded">${data.dangerBtn ? 'warning' : 'info'}</span>
                </div>
                <h2 class="component-dialog-title">${data.title || 'Advertencia'}</h2>
                <p class="component-dialog-desc">${data.message || data.desc || '¿Estás seguro de continuar?'}</p>
            </div>
            
            ${data.inputs && data.inputs.length > 0 ? `
                <div class="component-dialog-body">
                    ${data.inputs.map(input => `
                        <div class="component-input-group">
                            <input type="${input.type || 'text'}" id="${input.id}" class="component-input-field ${input.type === 'password' ? 'component-input-field--with-icon' : ''}" placeholder=" " ${input.required ? 'required' : ''}>
                            <label for="${input.id}" class="component-input-label">${input.placeholder || ''}</label>
                            ${input.type === 'password' ? `<span class="material-symbols-rounded component-input-toggle" data-dialog-action="togglePassword">visibility_off</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">${data.cancelText || 'Cancelar'}</button>
                <button class="component-button component-button--h45 ${data.dangerBtn ? 'component-button--danger' : 'component-button--dark'} component-button--full" data-dialog-action="confirm">${data.confirmText || 'Confirmar'}</button>
            </div>
        `
    },

    // --- PLANTILLA GENÉRICA DE CONFIRMACIÓN DE ACCIONES ---
    confirmAction: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-dialog-header">
                <h2 class="component-dialog-title">${data.title || 'Confirmar acción'}</h2>
                <p class="component-dialog-desc">${data.desc || '¿Estás seguro de que deseas continuar con esta acción?'}</p>
            </div>
            <div class="component-dialog-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 ${data.confirmClass || 'component-button--danger'} component-button--full" data-dialog-action="confirm">${data.confirmText || 'Confirmar'}</button>
            </div>
        `
    },

    // --- NUEVA PLANTILLA: FORMULARIO DINÁMICO (SOPORTA SWITCHES) ---
    dynamicFormDialog: {
        build: (data) => {
            let fieldsHtml = '';
            
            if (data.fields && data.fields.length > 0) {
                fieldsHtml = '<div class="component-card--grouped" style="margin-top: 15px;">';
                
                data.fields.forEach((field, index) => {
                    if (field.type === 'switch') {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap" style="padding: 12px 16px;">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title" style="font-size: 14px;">${field.label}</h2>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" id="dialog_input_${field.name}" ${field.default ? 'checked' : ''}>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        `;
                    } else {
                        // Soporte para inputs normales de texto si se llegan a usar
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap" style="padding: 12px 16px;">
                                <div class="component-input-group" style="margin-bottom:0;">
                                    <input type="${field.type || 'text'}" id="dialog_input_${field.name}" class="component-input-field" placeholder=" " value="${field.default || ''}">
                                    <label for="dialog_input_${field.name}" class="component-input-label">${field.label}</label>
                                </div>
                            </div>
                        `;
                    }
                    
                    if (index < data.fields.length - 1) {
                        fieldsHtml += '<hr class="component-divider">';
                    }
                });
                
                fieldsHtml += '</div>';
            }

            return `
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-dialog-header">
                    <h2 class="component-dialog-title">${data.title || 'Formulario'}</h2>
                    <p class="component-dialog-desc">${data.desc || ''}</p>
                </div>
                <div class="component-dialog-body">
                    ${fieldsHtml}
                </div>
                <div class="component-dialog-actions" style="margin-top: 20px;">
                    <button class="component-button component-button--h45 hide-on-desktop" data-dialog-action="cancel">Cancelar</button>
                    <button class="component-button component-button--h45 component-button--dark component-button--full" data-dialog-action="confirm_dynamic_form">${data.confirmText || 'Aceptar'}</button>
                </div>
            `;
        }
    }
};