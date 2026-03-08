<?php
// includes/views/studio/upload-video.php
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-view-layout">
            
            <div class="component-view-top">
                <div class="component-view-top-left">
                </div>
            </div>

            <div class="component-view-bottom">
                <div class="component-upload-area" id="videoDropZone">
                    <div class="component-upload-content">
                        <div class="component-upload-icon-wrapper">
                            <span class="material-symbols-rounded component-upload-icon">upload</span>
                        </div>
                        <h2 class="component-upload-title" data-i18n="studio_drag_drop">Arrastra y suelta archivos de video para subirlos</h2>
                        <p class="component-upload-subtitle" data-i18n="studio_private_until_publish">Tus videos serán privados hasta que los publiques.</p>
                        
                        <input type="file" id="videoFileInput" class="disabled" multiple accept="video/*">
                        <button class="component-upload-button" type="button" onclick="document.getElementById('videoFileInput').click();" data-i18n="studio_select_files">Seleccionar archivos</button>
                        
                        <div id="uploadProgressContainer" class="disabled">
                            <div>
                                <div id="uploadProgressBar"></div>
                            </div>
                            <p data-i18n="studio_uploading_network">Subiendo archivos...</p>
                        </div>
                    </div>
                    
                    <div class="component-upload-footer">
                        <p class="component-upload-terms">
                            Si envías tus videos a YouTube, aceptas las <a href="#" class="component-upload-terms-link">Condiciones del Servicio</a> y los <a href="#" class="component-upload-terms-link">Lineamientos de la Comunidad</a> de YouTube.<br>
                            Asegúrate de no infringir los derechos de autor o de privacidad de otras personas. <a href="#" class="component-upload-terms-link">Más información</a>
                        </p>
                    </div>
                </div>

            </div>

        </div>
    </div>
</div>