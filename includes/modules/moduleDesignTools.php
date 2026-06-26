<?php
// includes/modules/moduleDesignTools.php

use App\Core\System\SubscriptionPlanConstants;

// Obtenemos el nivel desde la sesión (exactamente como lo hace tu SessionManager)
$userTier = $_SESSION['subscription_tier'] ?? SubscriptionPlanConstants::TIER_BASIC;

// Consideramos Premium a cualquier plan PRO o superior
$isPremium = $userTier >= SubscriptionPlanConstants::TIER_PRO;
?>
<div class="component-module component-module--sidebar component-module--sidebar-responsive disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="material-symbols-rounded">palette</span>
                <span class="component-menu-header-title">Seleccionar color</span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="component-menu-top">
                <div class="component-menu-header-box">
                    <span class="component-menu-header-title">Colores predeterminados</span>
                </div>
            </div>
            
            <div class="component-menu-bottom">
               <div class="component-color-grid" data-ref="color-palette-grid">
                    <div class="component-loader-center component-loader-center--compact">
                        <div class="component-empty-state-content">
                            <span class="material-symbols-rounded icon-spin-slow">palette</span><br>
                            Cargando...
                        </div>
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
        
        <div class="component-menu-top h-full-flex component-menu-top--gapped">
            <div class="component-template-upload-section">
                <input type="file" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
                <button class="component-button component-button--full component-button--dark component-button--h40" data-action="triggerTemplateUpload">
                    <span class="material-symbols-rounded">cloud_upload</span>
                    Subir a mi librería
                </button>
            </div>

            <div class="component-viewport component-viewport--padded">
                <div class="component-menu-header-box component-menu-header-box--section">
                    <span class="component-menu-header-title">Mi Librería</span>
                </div>
                
                <div class="component-library-grid" data-ref="user-templates-grid">
                </div>

                <?php if ($isPremium): ?>
                <hr class="component-divider component-divider--spaced">
                
                <div class="component-menu-header-box component-menu-header-box--section">
                    <span class="component-menu-header-title">Modo En Vivo (Sync)</span>
                </div>
                
                <div class="live-share-panel" data-ref="live-share-panel">
                    
                    <div class="live-share-owner">
                        <button class="component-button component-button--full component-button--dark component-button--h40" data-action="startLiveShare">
                            <span class="material-symbols-rounded">sensors</span> Compartir Activa
                        </button>
                        
                        <div class="live-share-controls disabled" data-ref="live-controls">
                            <div class="live-share-code-display" data-ref="live-share-code">...</div>
                            
                            <div class="live-share-inputs-grid">
                                <div class="live-share-input-group">
                                    <label class="live-share-label">Posición X</label>
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="number" data-ref="live-input-x" class="component-input-field component-input-field--simple">
                                    </div>
                                </div>
                                <div class="live-share-input-group">
                                    <label class="live-share-label">Posición Y</label>
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="number" data-ref="live-input-y" class="component-input-field component-input-field--simple">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="live-share-input-group">
                                <label class="live-share-label live-share-label--flex">Opacidad <span data-ref="live-opacity-val">100%</span></label>
                                <input type="range" data-ref="live-input-opacity" min="0" max="1" step="0.05" value="1" class="live-share-range">
                            </div>
                            
                            <button class="component-button component-button--full component-button--danger component-button--h40 live-share-stop-btn" data-action="stopLiveShare">
                                Detener Transmisión
                            </button>
                        </div>
                    </div>

                    <div class="live-share-spectator">
                        <label class="live-share-label live-share-label--spectator">Unirse a sesión (Código)</label>
                        
                        <div class="component-search component-search--full component-search--h36">
                            <div class="component-search-icon">
                                <span class="material-symbols-rounded">search</span>
                            </div>
                            <div class="component-search-input">
                                <input type="text" data-ref="live-join-code" class="live-share-join-input" placeholder="Ej. SHR-123">
                            </div>
                        </div>

                        <button class="component-button component-button--full component-button--dark component-button--h40 live-share-join-btn" data-action="joinLiveShare">Unirse</button>
                    </div>

                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

</div>