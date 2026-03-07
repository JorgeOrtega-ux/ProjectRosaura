<?php
// includes/modules/moduleTagsSelector.php
// Variables esperadas: $selectorId, $placeholder, $icon
?>
<div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding" id="<?php echo htmlspecialchars($selectorId); ?>" style="display: none; position: absolute; z-index: 100; max-height: 250px; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    <div class="pill-container"><div class="drag-handle"></div></div>
    
    <div class="component-menu-header" style="position: sticky; top: 0; background: var(--background-primary); z-index: 2; padding-bottom: 4px; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));">
        <div class="component-search component-search--full component-search--h36">
            <div class="component-search-icon">
                <span class="material-symbols-rounded">search</span>
            </div>
            <div class="component-search-input">
                <input type="text" class="tag-search-input" placeholder="<?php echo htmlspecialchars($placeholder); ?>" autocomplete="off">
            </div>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); padding: 4px 16px 0; text-align: center;">
            Selecciona una oficial o escribe para crear una local.
        </div>
    </div>

    <div class="component-menu-list component-menu-list--scrollable tag-results-list" style="overflow-y: auto;">
        </div>
</div>