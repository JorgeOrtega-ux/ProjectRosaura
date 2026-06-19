<?php
// includes/modules/moduleDesignTools.php
?>
<div class="component-module component-module--sidebar disabled" data-module="moduleDesignTools">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-colors">
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="component-menu-header-title">Paleta de colores</span>
            </div>
        </div>
        <div class="component-menu-top">
            <div class="component-menu-list">
                
               <div class="design-color-grid">
                    <button class="design-color-btn active" data-action="selectColor" data-color="#000000" style="--color-val: #000000;" title="Negro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#515252" style="--color-val: #515252;" title="Gris oscuro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#898D90" style="--color-val: #898D90;" title="Gris"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#D4D7D9" style="--color-val: #D4D7D9;" title="Gris claro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FFFFFF" style="--color-val: #FFFFFF;" title="Blanco"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#6D001A" style="--color-val: #6D001A;" title="Borgoña"></button>
                    
                    <button class="design-color-btn" data-action="selectColor" data-color="#BE0039" style="--color-val: #BE0039;" title="Rojo oscuro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FF4500" style="--color-val: #FF4500;" title="Rojo"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FFA800" style="--color-val: #FFA800;" title="Naranja"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FFD635" style="--color-val: #FFD635;" title="Amarillo"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FFF8B8" style="--color-val: #FFF8B8;" title="Amarillo pálido"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#00A368" style="--color-val: #00A368;" title="Verde oscuro"></button>
                    
                    <button class="design-color-btn" data-action="selectColor" data-color="#00CC78" style="--color-val: #00CC78;" title="Verde"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#7EED56" style="--color-val: #7EED56;" title="Verde claro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#00756F" style="--color-val: #00756F;" title="Verde azulado oscuro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#009EAA" style="--color-val: #009EAA;" title="Verde azulado"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#00CCC0" style="--color-val: #00CCC0;" title="Verde azulado claro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#2450A4" style="--color-val: #2450A4;" title="Azul oscuro"></button>
                    
                    <button class="design-color-btn" data-action="selectColor" data-color="#3690EA" style="--color-val: #3690EA;" title="Azul"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#51E9F4" style="--color-val: #51E9F4;" title="Azul claro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#493AC1" style="--color-val: #493AC1;" title="Índigo"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#6A5CFF" style="--color-val: #6A5CFF;" title="Periwinkle"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#94B3FF" style="--color-val: #94B3FF;" title="Lavanda"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#811E9F" style="--color-val: #811E9F;" title="Púrpura oscuro"></button>
                    
                    <button class="design-color-btn" data-action="selectColor" data-color="#B44AC0" style="--color-val: #B44AC0;" title="Púrpura"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#E4ABFF" style="--color-val: #E4ABFF;" title="Púrpura pálido"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#DE107F" style="--color-val: #DE107F;" title="Magenta"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FF3881" style="--color-val: #FF3881;" title="Rosa"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FF99AA" style="--color-val: #FF99AA;" title="Rosa claro"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#6D482F" style="--color-val: #6D482F;" title="Marrón oscuro"></button>
                    
                    <button class="design-color-btn" data-action="selectColor" data-color="#9C6926" style="--color-val: #9C6926;" title="Marrón"></button>
                    <button class="design-color-btn" data-action="selectColor" data-color="#FFB470" style="--color-val: #FFB470;" title="Beige"></button>
                </div>

            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding disabled" data-ref="menu-templates">
        <div class="component-menu-header">
            <div class="component-menu-header-box">
                <span class="component-menu-header-title">Plantillas</span>
            </div>
        </div>
        <div class="component-menu-top">
            <input type="file" accept="image/*" style="display: none;" data-ref="template-file-input">
            <button class="component-button component-button--full" data-action="triggerTemplateUpload">
                <span class="material-symbols-rounded">upload_file</span>
                Subir Plantilla
            </button>
            <div class="design-template-grid" data-ref="template-list" style="margin-top: 12px;">
                </div>
        </div>
    </div>

</div>