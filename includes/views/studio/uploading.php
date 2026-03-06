<?php
// includes/views/studio/uploading.php
?>
<div class="view-content">

    <div class="component-wrapper disabled" id="uploading-empty-state" style="margin-top: 48px;">
        <div class="component-empty-state">
            <span class="material-symbols-rounded component-empty-state-icon" style="font-size: 64px !important;">upload_file</span>
            <p class="component-empty-state-text" style="margin-bottom: 24px; font-size: 16px;">No tienes contenido subiéndose en estos momentos.</p>
            <button type="button" class="component-button component-button--dark component-button--h40" data-nav="<?php echo APP_URL; ?>/studio/upload">
                <span class="material-symbols-rounded">upload</span>
                Subir videos
            </button>
        </div>
    </div>

    <div class="component-wrapper component-wrapper--full no-padding" id="uploading-active-state">
        
        <div class="component-view-layout">
            <div class="component-view-top">
                <div class="component-view-top-left studio-badge-container">
                    <span class="studio-badge active">Video 1</span>
                    <span class="studio-badge">Video 2</span>
                    <span class="studio-badge">Video 3</span>
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="studio-uploading-wrapper">
                    
                    <div class="studio-uploading-details">
                        <h1 style="margin-top: 0; font-size: 24px; margin-bottom: 24px;">Detalles</h1>
                        
                        <div class="component-card--grouped">
                            <div class="component-group-item component-group-item--stateful">
                                <div class="active component-state-box" data-state="title-view">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Título del video (obligatorio)</h2>
                                            <span class="component-display-value" data-ref="display-title">Mi Video de Prueba 1</span>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title">Editar</button>
                                    </div>
                                </div>

                                <div class="disabled component-state-box" data-state="title-edit" style="display: none;">
                                    <div class="component-card__content">
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Título del video (obligatorio)</h2>
                                            <div class="component-edit-row">
                                                <div class="component-input-group component-input-group--h34">
                                                    <input type="text" data-ref="input-title" class="component-input-field component-input-field--simple" value="Mi Video de Prueba 1" data-original-value="Mi Video de Prueba 1" placeholder="Ingresa un título que destaque">
                                                </div>
                                                <div class="component-card__actions component-card__actions--stretch">
                                                    <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="title">Cancelar</button>
                                                    <button type="button" class="component-button component-button--h34 component-button--dark" data-action="saveTitle">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="component-card--grouped" style="margin-top: 24px;">
                            <div class="component-group-item component-group-item--stacked">
                                <div class="component-card__content component-card__content--full">
                                    <div class="component-card__text">
                                        <h2 class="component-card__title">Descripción</h2>
                                        <p class="component-card__description">Cuenta a los espectadores de qué trata tu video.</p>
                                        <div class="component-card__form-area">
                                            <textarea class="component-input-field" data-ref="inp_video_description" placeholder="Añade tu descripción aquí..." maxlength="1000" rows="5"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="studio-uploading-preview">
                        <div class="studio-video-card">
                            <div class="studio-video-card__player">
                                </div>
                            <div class="studio-video-card__info">
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label">Enlace del video</span>
                                    <a href="#" class="meta-link">https://192.168.8.13/v/xyz123</a>
                                </div>
                                <div class="studio-video-card__meta-group">
                                    <span class="meta-label">Nombre del archivo</span>
                                    <span class="meta-value">video_prueba_1.mp4</span>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="component-button component-button--full component-button--h40" style="margin-top: 16px;">
                            <span class="material-symbols-rounded">add_photo_alternate</span>
                            Subir miniatura
                        </button>
                    </div>

                </div>
            </div>
        </div>

    </div>
</div>