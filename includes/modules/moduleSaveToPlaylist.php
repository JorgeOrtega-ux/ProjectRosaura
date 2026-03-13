<div class="component-surface component-surface--bottom hidden" id="surface-save-playlist">
    <div class="component-surface__overlay" id="surface-save-playlist-overlay"></div>
    <div class="component-surface__content component-playlist-modal" style="background-color: var(--bg-surface); border-radius: 16px 16px 0 0; max-width: 400px; width: 100%; margin: 0 auto;">
        
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-playlist-modal__header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-color);">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Guardar en...</h3>
            <button id="btn-close-save-playlist" style="background: none; border: none; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; padding: 0;">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        
        <div class="component-playlist-modal__body" style="padding: 12px 20px; max-height: 50vh; overflow-y: auto;">
            <div id="playlist-checkbox-container" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="component-spinner component-spinner--centered" style="margin: 20px auto;"></div>
            </div>
        </div>

        <div class="component-playlist-modal__footer" style="padding: 16px 20px; border-top: 1px solid var(--border-color);">
            <div id="btn-toggle-create-playlist" style="display: flex; align-items: center; gap: 12px; cursor: pointer; font-weight: 500; transition: color 0.2s;">
                <span class="material-symbols-rounded">add</span>
                <span>Crear nueva lista de reproducción</span>
            </div>
            
            <div id="form-create-playlist" class="hidden" style="margin-top: 20px;">
                <div class="component-input-group">
                    <input type="text" id="new-playlist-title" class="component-input-field" placeholder=" " autocomplete="off">
                    <label for="new-playlist-title" class="component-input-label">Nombre</label>
                </div>
                <div class="component-input-group" style="margin-top: 16px;">
                    <select id="new-playlist-visibility" class="component-input-field">
                        <option value="private">Privada</option>
                        <option value="unlisted">No listada</option>
                        <option value="public">Pública</option>
                    </select>
                    <label for="new-playlist-visibility" class="component-input-label">Privacidad</label>
                </div>
                <button class="component-button component-button--dark component-button--full" id="btn-submit-new-playlist" style="margin-top: 16px; height: 40px;">Crear</button>
            </div>
        </div>
    </div>
</div>

<style>
    .component-playlist-item-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: 16px;
        padding: 6px 0;
        user-select: none;
    }
    .component-playlist-item-checkbox:hover .playlist-title {
        color: var(--text-primary);
    }
    .component-playlist-item-checkbox input {
        display: none;
    }
    .component-playlist-item-checkbox .checkbox-custom {
        width: 22px;
        height: 22px;
        border: 2px solid var(--text-secondary);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s ease;
    }
    .component-playlist-item-checkbox .checkbox-custom span {
        font-size: 16px;
        color: white;
        display: none;
    }
    .component-playlist-item-checkbox input:checked + .checkbox-custom {
        background-color: var(--primary-color, #007bff);
        border-color: var(--primary-color, #007bff);
    }
    .component-playlist-item-checkbox input:checked + .checkbox-custom span {
        display: block;
    }
    .component-playlist-item-checkbox .playlist-title {
        flex-grow: 1;
        font-size: 15px;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 0.2s;
    }
    .component-playlist-item-checkbox .playlist-visibility-icon {
        font-size: 20px;
        color: var(--text-secondary);
    }
    #btn-toggle-create-playlist:hover {
        color: var(--primary-color, #007bff);
    }
</style>