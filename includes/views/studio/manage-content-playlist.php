<?php
// includes/views/studio/manage-content-playlist.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions">
                        <button class="component-button component-button--outline" id="btnManageVideos" style="display: none;" data-tooltip="Administrar videos">
                            <span class="material-symbols-rounded">video_library</span>
                            <span>Administrar videos</span>
                        </button>

                        <button class="component-button component-button--outline" id="btnEditPlaylist" style="display: none;" data-tooltip="Editar lista de reproducción">
                            <span class="material-symbols-rounded">edit</span>
                            <span>Editar</span>
                        </button>
                        
                        <button class="component-button component-button--danger" id="btnDeletePlaylist" style="display: none;" data-tooltip="Eliminar lista de reproducción">
                            <span class="material-symbols-rounded">delete</span>
                            <span>Eliminar</span>
                        </button>

                        <button class="component-button component-button--primary" id="btnCreatePlaylist" data-tooltip="<?php echo __('studio_tooltip_new_playlist') ?? 'Nueva lista'; ?>">
                            <span class="material-symbols-rounded">playlist_add</span>
                            <span><?php echo __('studio_btn_new_playlist') ?? 'Nueva lista'; ?></span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-table-wrapper">
                    <table class="component-table component-table--media">
                        <thead>
                            <tr>
                                <th style="width: 40px;"></th>
                                <th><?php echo __('studio_th_playlist') ?? 'Lista de reproducción'; ?></th>
                                <th><?php echo __('studio_th_type') ?? 'Tipo'; ?></th>
                                <th><?php echo __('studio_th_status_visibility') ?? 'Visibilidad'; ?></th>
                                <th><?php echo __('studio_th_last_update') ?? 'Última actualización'; ?></th>
                                <th><?php echo __('studio_th_video_count') ?? 'Cantidad de videos'; ?></th>
                                <th><?php echo __('studio_th_views') ?? 'Vistas'; ?></th>
                            </tr>
                        </thead>
                        <tbody id="managePlaylistTableBody">
                            <tr>
                                <td colspan="7" class="component-empty-table-cell">
                                    <div class="component-empty-state component-empty-state--table">
                                        <span class="material-symbols-rounded component-empty-state-icon">playlist_play</span>
                                        <p class="component-empty-state-text"><?php echo __('studio_empty_playlists') ?? 'No hay listas de reproducción'; ?></p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
</div>

<template id="createPlaylistTemplate">
    <div class="dialog-content" style="min-width: 400px;">
        <h3 class="dialog-title" id="playlistModalTitle" style="margin-bottom: 20px; font-size: 1.25rem; font-weight: 500;">Crear lista de reproducción</h3>
        
        <input type="hidden" id="playlistId" value="">

        <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: var(--text-secondary);">Título (obligatorio)</label>
            <input type="text" id="playlistTitle" class="component-input" placeholder="Añade un título" required style="width: 100%;">
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: var(--text-secondary);">Descripción</label>
            <textarea id="playlistDesc" class="component-input" placeholder="Añade una descripción" style="width: 100%; min-height: 80px; resize: vertical;"></textarea>
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: var(--text-secondary);">Visibilidad</label>
            <select id="playlistVisibility" class="component-input" style="width: 100%;">
                <option value="public">Pública</option>
                <option value="unlisted">No listada</option>
                <option value="private">Privada</option>
            </select>
        </div>
        
        <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: var(--text-secondary);">Orden predeterminado</label>
            <select id="playlistOrder" class="component-input" style="width: 100%;">
                <option value="manual">Manual</option>
                <option value="date_added_newest">Fecha en la que se añadió (más reciente)</option>
                <option value="date_added_oldest">Fecha en la que se añadió (más antigua)</option>
                <option value="date_published_newest">Fecha de publicación (más reciente)</option>
                <option value="date_published_oldest">Fecha de publicación (más antigua)</option>
            </select>
        </div>
        
        <div style="text-align: right; margin-top: 20px;">
            <button id="btnSubmitPlaylist" class="component-button component-button--primary">Guardar</button>
        </div>
    </div>
</template>