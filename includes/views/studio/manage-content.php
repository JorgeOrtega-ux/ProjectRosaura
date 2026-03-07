<?php
// includes/views/studio/manage-content.php
?>
<style>
    /* Estilos inyectados directamente para no requerir tocar el CSS de la app principal por ahora */
    .component-table-row--selected {
        background-color: rgba(255, 255, 255, 0.08) !important;
        border-left: 3px solid var(--primary-color, #007bff);
    }
    .component-table tbody tr {
        cursor: pointer;
        transition: background-color 0.2s ease;
    }
    .component-table tbody tr:hover {
        background-color: rgba(255, 255, 255, 0.04);
    }
</style>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right" style="display: flex; gap: 8px;">
                    <button class="component-button component-button--icon component-button--h36 disabled" id="btnEditSelectedVideo" data-tooltip="Editar video seleccionado" disabled>
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="component-button component-button--icon component-button--h36" data-nav="<?php echo APP_URL; ?>/studio/upload" data-tooltip="Subir video">
                        <span class="material-symbols-rounded">upload</span>
                    </button>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-table-wrapper">
                    <table class="component-table component-table--media">
                        <thead>
                            <tr>
                                <th>Video</th>
                                <th>Orientación</th>
                                <th>Estado / Visibilidad</th>
                                <th>Restricciones</th>
                                <th>Fecha</th>
                                <th>Vistas</th>
                                <th>Comentarios</th>
                                <th>"Me gusta"</th>
                            </tr>
                        </thead>
                        <tbody id="manageContentTableBody">
                            </tbody>
                    </table>

                    <template id="emptyTableTemplate">
                        <tr>
                            <td colspan="8" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">video_library</span>
                                    <p class="component-empty-state-text">No hay videos disponibles por el momento.</p>
                                </div>
                            </td>
                        </tr>
                    </template>
                </div>
            </div>

        </div>
    </div>
</div>