<?php
// includes/modules/moduleDesignTools.php
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="component-menu-header-title">Paleta de colores</span>
            </div>
        </div>
        <div class="component-menu-top">
            <div class="component-menu-list">
                
               <div class="component-color-grid" data-ref="color-palette-grid">
                    <div style="padding: 20px; text-align: center; width: 100%; opacity: 0.5;">
                        <span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">palette</span><br>
                        Cargando...
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-templates">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="component-menu-header-title">Plantillas</span>
            </div>
        </div>
        <div class="component-menu-top">
            <input type="file" accept="image/*" style="display: none;" data-ref="template-file-input">
            <button class="component-button component-button--full component-button--h40" data-action="triggerTemplateUpload">
                <span class="material-symbols-rounded">upload_file</span>
                Subir Plantilla
            </button>
            <div class="component-template-grid" data-ref="template-list" style="margin-top: 12px;">
                </div>
        </div>
    </div>

</div>