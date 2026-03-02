<?php
// includes/views/admin/logs-viewer.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content view-fade-in" style="height: calc(100vh - 65px); display: flex; flex-direction: column;">
    <div class="component-wrapper component-wrapper--full" style="flex: 1; display: flex; flex-direction: column; padding: 12px; gap: 12px; max-width: 100% !important;">
        
        <div class="component-toolbar-primary" style="flex-shrink: 0; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 6px;">
            <div class="component-toolbar-mode active">
                <div class="component-toolbar-left">
                    <button class="component-button component-button--icon component-button--h40" data-nav="/ProjectRosaura/admin/logs" data-tooltip="Volver a logs" data-position="bottom">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <span class="component-toolbar-title" style="border: none; padding-left: 4px; font-size: 16px;">Visor de Archivos</span>
                </div>
            </div>
        </div>

        <div id="logs-viewer-loader" class="active" style="display: flex; justify-content: center; align-items: center; flex: 1;">
            <div class="component-spinner"></div>
        </div>

        <div class="component-file-viewer disabled" id="logs-viewer-container">
            <div class="component-tabs-header" id="logs-viewer-tabs">
                </div>
            <div class="component-viewer-area">
                <textarea id="logs-viewer-textarea" class="component-viewer-textarea" readonly spellcheck="false" placeholder="Selecciona un archivo para ver su contenido..."></textarea>
            </div>
        </div>

    </div>
</div>