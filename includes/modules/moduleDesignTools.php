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
        <div class="component-menu-top" style="display: flex; flex-direction: column; height: calc(100% - 60px);">
            
            <div style="padding-bottom: 16px;">
                <input type="file" accept="image/jpeg, image/png, image/webp" style="display: none;" data-ref="template-file-input">
                <button class="component-button component-button--full component-button--dark component-button--h40" data-action="triggerTemplateUpload">
                    <span class="material-symbols-rounded">cloud_upload</span>
                    Subir a mi librería
                </button>
            </div>

            <div style="flex: 1; overflow-y: auto; padding-right: 4px;">
                <h4 style="font-size: 0.8rem; text-transform: uppercase; opacity: 0.5; margin: 0 0 12px 0; font-weight: 600;">Mi Librería</h4>
                <div data-ref="user-templates-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px;">
                    </div>

                <h4 style="font-size: 0.8rem; text-transform: uppercase; opacity: 0.5; margin: 0 0 12px 0; font-weight: 600;">En el Lienzo</h4>
                <div class="component-template-grid" data-ref="template-list">
                    </div>
            </div>

        </div>
    </div>

</div>