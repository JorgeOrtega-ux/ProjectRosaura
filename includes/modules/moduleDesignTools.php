<?php
// includes/modules/moduleDesignTools.php

use App\Core\System\SubscriptionPlanConstants;

// 1. Obtenemos el nivel desde la sesión asegurando que sea un número entero (int).
$userTier = (int) ($_SESSION['subscription_tier'] ?? $_SESSION['tier'] ?? $_SESSION['user_tier'] ?? SubscriptionPlanConstants::TIER_BASIC);

// 2. En lugar de hacer una validación manual (>=), usamos tu método oficial hasFeature.
$hasLiveSync = SubscriptionPlanConstants::hasFeature($userTier, 'live_templates');
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
                    <span class="material-symbols-rounded">color_lens</span>
                    <span class="component-menu-header-title">Colores predeterminados</span>
                </div>
            </div>
            
            <div class="component-menu-bottom">
               <div class="component-items-grid" data-ref="color-palette-grid">
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
                <span class="material-symbols-rounded">photo_library</span>
                <span class="component-menu-header-title">Plantillas</span>
            </div>
        </div>
        
        <div class="component-menu-section-parent">
            <div class="component-menu-top">
                <div class="component-template-upload-section">
                    <input type="file" accept="image/jpeg, image/png, image/webp" class="hidden-input" data-ref="template-file-input">
                    <button class="component-button component-button--full component-button--dark component-button--h40" data-action="triggerTemplateUpload">
                        <span class="material-symbols-rounded">cloud_upload</span>
                        Subir a mi librería
                    </button>
                </div>
            </div>

            <div class="component-menu-bottom">
                <div class="component-menu-header-box component-menu-header-box--section" style="margin-bottom: 8px;">
                    <span class="material-symbols-rounded">collections_bookmark</span>
                    <span class="component-menu-header-title">Mi Librería</span>
                </div>
                
                <div class="component-items-grid component-items-grid--5" data-ref="user-templates-grid">
                </div>
            </div>
        </div>
    </div>

</div>