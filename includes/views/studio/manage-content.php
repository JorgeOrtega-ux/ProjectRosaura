<?php
// includes/views/studio/manage-content.php
?>
<div class="view-content">
    <div class="component-view-layout">
        
        <div class="component-view-top">
            <div class="component-view-top-left">
                </div>
            
            <div class="component-view-top-right">
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
                            <th>Visibilidad</th>
                            <th>Restricciones</th>
                            <th>Fecha</th>
                            <th>Vistas</th>
                            <th>Comentarios</th>
                            <th>"Me gusta"</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="component-empty-table-cell">
                                <div class="component-empty-state component-empty-state--table">
                                    <span class="material-symbols-rounded component-empty-state-icon">video_library</span>
                                    <p class="component-empty-state-text">No hay videos disponibles por el momento.</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>