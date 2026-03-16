<?php
// includes/views/studio/manage-content-playlist.php
if (session_status() === PHP_SESSION_NONE) session_start();

$isCreator = $_SESSION['is_creator'] ?? 0;
$hasPermission = ($isCreator == 1);

if (!$hasPermission) {
    echo '<div class="view-content"><div class="component-wrapper component-wrapper--full no-padding"><div class="component-container" style="text-align:center; padding: 50px;"><span class="material-symbols-rounded" style="font-size: 64px; color: var(--color-error);">block</span><h1 style="margin-top:20px;">Acceso Denegado</h1><p style="opacity:0.7;">No tienes habilitado el modo de creador. No puedes administrar listas de reproducción.</p></div></div></div>';
    return;
}
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions">
                        <button class="component-button component-button--icon component-button--h40 disabled" id="btnManageVideos" data-tooltip="Administrar videos" disabled>
                            <span class="material-symbols-rounded">video_library</span>
                        </button>

                        <button class="component-button component-button--icon component-button--h40 disabled" id="btnEditPlaylist" data-tooltip="Editar lista de reproducción" disabled>
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        
                        <button class="component-button component-button--icon component-button--h40 btn-delete-video disabled" id="btnDeletePlaylist" data-tooltip="Eliminar lista de reproducción" disabled>
                            <span class="material-symbols-rounded">delete</span>
                        </button>

                        <button class="component-button component-button--icon component-button--h40" id="btnCreatePlaylist" data-tooltip="<?php echo __('studio_tooltip_new_playlist') ?? 'Nueva lista'; ?>">
                            <span class="material-symbols-rounded">playlist_add</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-table-wrapper">
                    <table class="component-table component-table--media" data-prevent-system="true">
                        <thead>
                            <tr>
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
                                <td colspan="6" class="component-empty-table-cell">
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
                <option value="manual">Manual (Arrastrar y soltar videos)</option>
                <option value="published_newest">Fecha de publicación (más reciente)</option>
                <option value="published_oldest">Fecha de publicación (más antigua)</option>
                <option value="uploaded_newest">Fecha de subida (más reciente)</option>
                <option value="uploaded_oldest">Fecha de subida (más antigua)</option>
                <option value="popular">Más populares</option>
            </select>
        </div>
        
        <div style="text-align: right; margin-top: 20px;">
            <button id="btnSubmitPlaylist" class="component-button component-button--primary">Guardar</button>
        </div>
    </div>
</template>