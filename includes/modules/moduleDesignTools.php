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

                <hr style="border-color: rgba(255,255,255,0.1); margin: 20px 0 16px 0;">
                <h4 style="font-size: 0.8rem; text-transform: uppercase; opacity: 0.5; margin: 0 0 12px 0; font-weight: 600;">Modo En Vivo (Sync)</h4>
                
                <div class="live-share-panel" data-ref="live-share-panel">
                    
                    <div class="live-share-owner">
                        <button class="component-button component-button--full component-button--dark component-button--h40" data-action="startLiveShare">
                            <span class="material-symbols-rounded">sensors</span> Compartir Activa
                        </button>
                        
                        <div data-ref="live-controls" style="display:none; margin-top: 12px; gap: 8px; flex-direction: column; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                            <div style="padding: 8px; background: rgba(0,255,128,0.1); color: #00ff80; text-align: center; border-radius: 4px; font-family: monospace; font-size: 1.2rem; letter-spacing: 2px; font-weight: bold;" data-ref="live-share-code">...</div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div>
                                    <label style="font-size: 10px; opacity: 0.7;">Posición X</label>
                                    <input type="number" data-ref="live-input-x" class="component-input" style="width:100%; padding: 4px;">
                                </div>
                                <div>
                                    <label style="font-size: 10px; opacity: 0.7;">Posición Y</label>
                                    <input type="number" data-ref="live-input-y" class="component-input" style="width:100%; padding: 4px;">
                                </div>
                            </div>
                            
                            <div>
                                <label style="font-size: 10px; opacity: 0.7; display: flex; justify-content: space-between;">Opacidad <span data-ref="live-opacity-val">100%</span></label>
                                <input type="range" data-ref="live-input-opacity" min="0" max="1" step="0.05" value="1" style="width:100%">
                            </div>
                            
                            <button class="component-button component-button--full component-button--danger component-button--h40" data-action="stopLiveShare" style="margin-top: 8px;">
                                Detener Transmisión
                            </button>
                        </div>
                    </div>

                    <div class="live-share-spectator" style="margin-top: 16px;">
                        <label style="font-size: 0.8rem; opacity: 0.8;">Unirse a sesión (Código)</label>
                        <div style="display: flex; gap: 8px; margin-top: 4px;">
                            <input type="text" data-ref="live-join-code" class="component-input" placeholder="Ej. SHR-123" style="flex: 1; text-transform: uppercase;">
                            <button class="component-button component-button--dark" data-action="joinLiveShare">Unirse</button>
                        </div>
                    </div>

                </div>
                </div>

        </div>
    </div>

</div>