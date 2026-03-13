<?php
// includes/views/settings/history.php
?>
<div class="view-content view-content--history">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title">Historial de actividad</h1>
            <p class="component-page-description">Administra tu historial de búsqueda y reproducción de videos.</p>
        </div>

        <div class="component-toolbar">
            <div class="component-toolbar__tabs">
                <button type="button" class="component-toolbar__tab active" data-tab="watch-history">
                    <span class="material-symbols-rounded">play_circle</span>
                    Historial de reproducción
                </button>
                <button type="button" class="component-toolbar__tab" data-tab="search-history">
                    <span class="material-symbols-rounded">search</span>
                    Historial de búsqueda
                </button>
            </div>
            
            <div class="component-toolbar__actions">
                <button type="button" class="component-button component-button--danger-outline component-button--h36" id="btn-clear-history">
                    <span class="material-symbols-rounded">delete_forever</span>
                    Borrar historial
                </button>
            </div>
        </div>

        <div id="watch-history-container" class="history-tab-content active" style="display: block;">
            <div class="history-list" id="watch-history-list"></div>
            <div class="component-loading-spinner" id="watch-loading" style="display: none;"></div>
        </div>

        <div id="search-history-container" class="history-tab-content" style="display: none;">
            <div class="history-list" id="search-history-list"></div>
            <div class="component-loading-spinner" id="search-loading" style="display: none;"></div>
        </div>

    </div>
</div>