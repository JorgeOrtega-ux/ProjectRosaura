<div class="component-module h-100" style="height: 100vh; overflow: hidden;">
    <style>
        /* Contenedor adaptativo de la interfaz del lienzo */
        .design-layout-container {
            display: flex;
            flex-direction: row; /* Escritorio: Sidebar izquierda, contenido derecha */
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #ffffff;
        }

        /* Barra de herramientas adaptable (Sidebar / Footer) */
        .whiteboard-tools-bar {
            width: auto;
            height: 100%;
            padding: 8px;
            background-color: #ffffff;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column; /* Alineación vertical para escritorio */
            gap: 8px;
            box-sizing: border-box;
            z-index: 20;
        }

        /* Espacio contenedor del lienzo e información flotante */
        .whiteboard-canvas-wrapper {
            flex: 1;
            position: relative;
            height: 100%;
            overflow: hidden;
            background-color: #ffffff;
        }

        /* TÉCNICA CSS RESPONSIVA: Mutación automática a vista móvil */
        @media (max-width: 768px) {
            .design-layout-container {
                flex-direction: column; /* Móvil: Lienzo arriba, herramientas abajo */
            }

            .whiteboard-tools-bar {
                width: 100%;
                height: auto;
                order: 2; /* Envía la barra a la parte inferior como Footer */
                border-right: none;
                border-top: 1px solid #e2e8f0;
                flex-direction: row; /* Alineación horizontal de los botones */
                justify-content: flex-start;
                align-items: center;
            }

            .whiteboard-canvas-wrapper {
                order: 1; /* Mantiene el área de dibujo en la zona superior */
                flex: 1;
                height: auto;
            }
        }
    </style>

    <div class="design-layout-container">
        <aside class="whiteboard-tools-bar">
            <button class="component-button component-button--icon component-button--h40" title="Figuras Geométricas" data-ref="btn-shapes">
                <span class="material-symbols-rounded">shapes</span>
            </button>
        </aside>

        <main id="whiteboard-wrapper" class="whiteboard-canvas-wrapper">
            <canvas id="infinite-whiteboard" style="display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; touch-action: none;"></canvas>
            
            <div style="position: absolute; bottom: 20px; left: 20px; background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; font-family: sans-serif; font-size: 13px; color: #333; pointer-events: none; user-select: none; min-width: 220px; z-index: 10;">
                <div style="font-weight: 700; margin-bottom: 12px; font-size: 14px; color: #0f172a;">Lienzo Infinito</div>
                
                <div style="display: flex; flex-direction: column; gap: 8px; color: #475569;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">Zoom:</span> 
                        <span><span id="zoom-level-indicator">100</span>%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">Cámara:</span> 
                        <span>X: <span id="cam-x" style="display: inline-block; width: 35px; text-align: right;">0</span> Y: <span id="cam-y" style="display: inline-block; width: 35px; text-align: right;">0</span></span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: 600;">Mouse:</span> 
                        <span>X: <span id="mouse-x" style="display: inline-block; width: 35px; text-align: right;">0</span> Y: <span id="mouse-y" style="display: inline-block; width: 35px; text-align: right;">0</span></span>
                    </div>
                </div>

                <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 12px; text-align: center;">
                    <span><kbd style="background: #f8fafc; padding: 3px 6px; border-radius: 4px; border: 1px solid #cbd5e1; color: #333; font-family: monospace; font-weight: bold;">Shift</kbd> + Click & arrastrar</span>
                </div>
            </div>
        </main>
    </div>
</div>