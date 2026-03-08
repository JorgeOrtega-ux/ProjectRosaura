<?php
// includes/views/studio/manage-content.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
                
                <div class="component-view-top-right">
                    <div class="component-actions">
                        
                        <div class="component-dropdown-wrapper component-dropdown-wrapper--fit">
                            <div class="component-dropdown-trigger disabled" id="btnQuickVisibility" data-action="toggleModule" data-target="quickVisibilityMenu" disabled>
                                <span class="material-symbols-rounded" id="quickVisibilityBtnIcon">public</span>
                                <span class="component-dropdown-text" id="quickVisibilityBtnText">Público</span>
                                <span class="material-symbols-rounded">expand_more</span>
                            </div>
                            
                            <div class="component-module component-module--dropdown component-module--dropdown-left disabled" id="quickVisibilityMenu" data-module="quickVisibilityMenu">
                                <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                                    <div class="pill-container"><div class="drag-handle"></div></div>
                                    <div class="component-menu-list component-menu-list--scrollable">
                                        
                                        <div class="component-menu-link active" data-action="selectQuickVisibility" data-value="public" data-icon="public" data-text="Público">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">public</span></div>
                                            <div class="component-menu-link-text">
                                                <span>Público</span>
                                            </div>
                                        </div>
                                        
                                        <div class="component-menu-link" data-action="selectQuickVisibility" data-value="unlisted" data-icon="link" data-text="No listado">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">link</span></div>
                                            <div class="component-menu-link-text">
                                                <span>No listado</span>
                                            </div>
                                        </div>

                                        <div class="component-menu-link" data-action="selectQuickVisibility" data-value="private" data-icon="lock" data-text="Privado">
                                            <div class="component-menu-link-icon"><span class="material-symbols-rounded">lock</span></div>
                                            <div class="component-menu-link-text">
                                                <span>Privado</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="component-button component-button--icon component-button--h40 btn-delete-video disabled" id="btnDeleteSelectedVideo" data-tooltip="Eliminar video" disabled>
                            <span class="material-symbols-rounded">delete</span>
                        </button>

                        <button class="component-button component-button--icon component-button--h40 disabled" id="btnEditSelectedVideo" data-tooltip="Editar video seleccionado" disabled>
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        
                        <button class="component-button component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/upload" data-tooltip="Subir video">
                            <span class="material-symbols-rounded">upload</span>
                        </button>

                    </div>
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