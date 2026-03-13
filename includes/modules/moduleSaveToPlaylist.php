<div class="component-module-dropdown" id="module-save-playlist" style="display: none;">
    
    <div class="component-module-dropdown__header">
        <h3>Guardar en...</h3>
        <button id="btn-close-save-playlist" title="Cerrar">
            <span class="material-symbols-rounded">close</span>
        </button>
    </div>
    
    <div class="component-module-dropdown__body">
        <div id="playlist-checkbox-container">
            <div class="component-spinner component-spinner--centered" style="margin: 20px auto;"></div>
        </div>
    </div>

    <div class="component-module-dropdown__footer">
        <div id="btn-go-to-create-playlist" class="component-module-dropdown__action">
            <span class="material-symbols-rounded">add</span>
            <span>Crear nueva lista de reproducción</span>
        </div>
    </div>

</div>

<style>
    .component-module-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 320px;
        background-color: var(--bg-surface, #212121);
        border: 1px solid var(--border-color, #3d3d3d);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        z-index: 1000;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    .component-module-dropdown__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color, #3d3d3d);
    }
    
    .component-module-dropdown__header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, #ffffff);
    }
    
    .component-module-dropdown__header button {
        background: none;
        border: none;
        color: var(--text-primary, #ffffff);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border-radius: 50%;
        transition: background-color 0.2s;
    }
    
    .component-module-dropdown__header button:hover {
        background-color: var(--bg-hover, rgba(255,255,255,0.1));
    }

    .component-module-dropdown__body {
        max-height: 250px;
        overflow-y: auto;
        padding: 8px 0;
    }

    .component-module-dropdown__footer {
        border-top: 1px solid var(--border-color, #3d3d3d);
        padding: 8px 0;
    }

    .component-module-dropdown__action {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        cursor: pointer;
        color: var(--text-primary, #ffffff);
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .component-module-dropdown__action:hover {
        background-color: var(--bg-hover, rgba(255,255,255,0.1));
    }

    /* Estilos del listado de playlists (Checkboxes) */
    .component-playlist-item-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: 16px;
        padding: 8px 16px;
        user-select: none;
        transition: background-color 0.2s;
    }
    .component-playlist-item-checkbox:hover {
        background-color: var(--bg-hover, rgba(255,255,255,0.1));
    }
    .component-playlist-item-checkbox input {
        display: none;
    }
    .component-playlist-item-checkbox .checkbox-custom {
        width: 20px;
        height: 20px;
        border: 2px solid var(--text-secondary, #aaaaaa);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s ease;
        box-sizing: border-box;
    }
    .component-playlist-item-checkbox .checkbox-custom span {
        font-size: 16px;
        color: white;
        display: none;
    }
    .component-playlist-item-checkbox input:checked + .checkbox-custom {
        background-color: var(--primary-color, #3ea6ff);
        border-color: var(--primary-color, #3ea6ff);
    }
    .component-playlist-item-checkbox input:checked + .checkbox-custom span {
        display: block;
    }
    .component-playlist-item-checkbox .playlist-title {
        flex-grow: 1;
        font-size: 14px;
        color: var(--text-primary, #ffffff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .component-playlist-item-checkbox .playlist-visibility-icon {
        font-size: 18px;
        color: var(--text-secondary, #aaaaaa);
    }
</style>