// public/assets/js/core/components/DialogTemplates.js

export const DialogTemplates = {
    activate2FADialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.title || 'Activar autenticación'}</h2>
                <p class="component-modal-desc">${data.desc || 'Ingresa el código de 6 dígitos generado por tu aplicación de autenticación para verificar y activar la seguridad.'}</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" id="modal_2fa_code" class="component-input-field" placeholder=" " maxlength="6" autocomplete="off">
                    <label for="modal_2fa_code" class="component-input-label">Código de 6 dígitos</label>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">Activar</button>
            </div>
        `
    },

    confirmDeleteAvatar: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">Eliminar foto de perfil</h2>
                <p class="component-modal-desc">¿Estás seguro de que deseas eliminar tu foto de perfil? Esta acción restaurará el avatar por defecto y no se puede deshacer.</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">Eliminar</button>
            </div>
        `
    },
    
    loadingEmailCode: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-content--centered">
                <div class="component-card__icon-container">
                    <div class="component-spinner component-spinner--centered"></div>
                </div>
                <h2 class="component-modal-title">Enviando código...</h2>
                <p class="component-modal-desc">Por favor espera un momento mientras procesamos tu solicitud.</p>
            </div>
        `
    },
    
    verifyEmailCode: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">Busca el código que te enviamos</h2>
                <p class="component-modal-desc">Para hacer cambios en tu cuenta, primero tienes que ingresar el código que te enviamos a <b>${data.email || 'tu correo'}</b>.</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" id="modal_email_code" class="component-input-field" placeholder=" " maxlength="14">
                    <label for="modal_email_code" class="component-input-label">Código de verificación</label>
                </div>
                
                <div class="component-link-container component-link-container--start">
                    <span class="component-link-text">¿No recibiste el código?</span>
                    <span class="component-link disabled-interaction component-text-notice--muted" id="btn-dialog-resend-code">Reenviar código de verificación (60)</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">Verificar</button>
            </div>
        `
    },
    
    confirmRevokeAllDevices: {
        build: () => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">Cerrar sesiones</h2>
                <p class="component-modal-desc">Elige qué sesiones deseas cerrar. Tendrás que volver a iniciar sesión en los dispositivos cerrados.</p>
            </div>
            <div class="component-modal-body">
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-modal-action="revoke_all">Cerrar TODAS (incluso esta)</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="revoke_other">Cerrar todas EXCEPTO esta</button>
                <button class="component-button component-button--h45 component-button--full hide-on-desktop" data-modal-action="cancel">Cancelar</button>
            </div>
        `
    },

    roleForm: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.title || 'Rol'}</h2>
                <p class="component-modal-desc">Configura el nombre y el color identificador para este rol en el sistema.</p>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="text" data-ref="roleNameInput" class="component-input-field" placeholder=" " value="${data.nameValue || ''}" maxlength="50" autocomplete="off">
                    <label class="component-input-label">${data.nameLabel}</label>
                </div>
                
                <div class="component-role-color-row">
                    <p class="component-input-label" style="position: static; flex: 1;">${data.colorLabel}</p>
                    <input type="color" data-ref="roleColorInput" value="${data.colorValue || '#808080'}" class="component-role-color-preview">
                    <span class="component-role-color-text" data-ref="roleColorDisplay">${data.colorValue || '#808080'}</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${data.confirmText || 'Guardar'}</button>
            </div>
        `
    },

    editRolePermissions: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">Permisos: ${data.roleName}</h2>
                <p class="component-modal-desc">Asigna o revoca los permisos de acceso y acciones en el sistema para este rol.</p>
            </div>
            <div class="component-modal-body component-modal-body--scrollable">
                <div class="component-permissions-list">
                    ${data.permissionsListHtml}
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">Guardar permisos</button>
            </div>
        `
    },

    verifyPasswordDialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">lock</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${data.title || 'Verificar identidad'}</h2>
                    <p class="component-modal-desc">${data.desc || 'Por favor, ingresa tu contraseña actual para continuar con esta acción.'}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="password" id="modal_verify_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="modal_verify_password" class="component-input-label">Contraseña actual</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm">${data.confirmText || 'Continuar'}</button>
            </div>
        `
    },

    confirmDeleteAccountDialog: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">warning</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${data.title || 'Verificar identidad'}</h2>
                    <p class="component-modal-desc">${data.desc || 'Por favor, ingresa tu contraseña actual para continuar.'}</p>
                </div>
            </div>
            <div class="component-modal-body">
                <div class="component-input-group">
                    <input type="password" id="modal_delete_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="modal_delete_password" class="component-input-label">Contraseña</label>
                    <span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>
                </div>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 component-button--danger component-button--full" data-modal-action="confirm">Eliminar cuenta</button>
            </div>
        `
    },

    warning: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header component-modal-header--with-icon">
                <div class="component-card__icon-container component-card__icon-container--bordered">
                    <span class="material-symbols-rounded">${data.dangerBtn ? 'warning' : 'info'}</span>
                </div>
                <div class="component-modal-header-text">
                    <h2 class="component-modal-title">${data.title || 'Advertencia'}</h2>
                    <p class="component-modal-desc">${data.message || data.desc || '¿Estás seguro de continuar?'}</p>
                </div>
            </div>
            
            ${data.inputs && data.inputs.length > 0 ? `
                <div class="component-modal-body">
                    ${data.inputs.map(input => `
                        <div class="component-input-group">
                            <input type="${input.type || 'text'}" id="${input.id}" class="component-input-field ${input.type === 'password' ? 'component-input-field--with-icon' : ''}" placeholder=" " ${input.required ? 'required' : ''}>
                            <label for="${input.id}" class="component-input-label">${input.placeholder || ''}</label>
                            ${input.type === 'password' ? `<span class="material-symbols-rounded component-input-toggle" data-modal-action="togglePassword">visibility_off</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">${data.cancelText || 'Cancelar'}</button>
                <button class="component-button component-button--h45 ${data.dangerBtn ? 'component-button--danger' : 'component-button--dark'} component-button--full" data-modal-action="confirm">${data.confirmText || 'Confirmar'}</button>
            </div>
        `
    },

    confirmAction: {
        build: (data) => `
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-modal-header">
                <h2 class="component-modal-title">${data.title || 'Confirmar acción'}</h2>
                <p class="component-modal-desc">${data.desc || '¿Estás seguro de que deseas continuar con esta acción?'}</p>
            </div>
            <div class="component-modal-actions">
                <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                <button class="component-button component-button--h45 ${data.confirmClass || 'component-button--danger'} component-button--full" data-modal-action="confirm">${data.confirmText || 'Confirmar'}</button>
            </div>
        `
    },

    dynamicFormDialog: {
        build: (data) => {
            let fieldsHtml = '';
            
            if (data.fields && data.fields.length > 0) {
                fieldsHtml = '<div class="component-card--grouped component-card--flush">';
                
                data.fields.forEach((field, index) => {
                    if (field.type === 'switch') {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-card__content">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">${field.label}</h2>
                                    </div>
                                </div>
                                <div class="component-card__actions component-card__actions--end">
                                    <label class="component-toggle-switch">
                                        <input type="checkbox" id="modal_input_${field.name}" ${field.default ? 'checked' : ''}>
                                        <span class="component-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        `;
                    } else {
                        fieldsHtml += `
                            <div class="component-group-item component-group-item--wrap">
                                <div class="component-input-group">
                                    <input type="${field.type || 'text'}" id="modal_input_${field.name}" class="component-input-field" placeholder=" " value="${field.default || ''}">
                                    <label for="modal_input_${field.name}" class="component-input-label">${field.label}</label>
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
                <div class="component-modal-header">
                    <h2 class="component-modal-title">${data.title || 'Formulario'}</h2>
                    <p class="component-modal-desc">${data.desc || ''}</p>
                </div>
                <div class="component-modal-body">
                    ${fieldsHtml}
                </div>
                <div class="component-modal-actions">
                    <button class="component-button component-button--h45 hide-on-desktop" data-modal-action="cancel">Cancelar</button>
                    <button class="component-button component-button--h45 component-button--dark component-button--full" data-modal-action="confirm_dynamic_form">${data.confirmText || 'Aceptar'}</button>
                </div>
            `;
        }
    }
};