<?php
// includes/modules/moduleTagsSelector.php
// Variables esperadas: $selectorId, $placeholder, $icon
?>
<div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding" id="<?php echo htmlspecialchars($selectorId); ?>" style="display: none; position: absolute; z-index: 100; max-height: 250px; flex-direction: column;">
    <div class="pill-container"><div class="drag-handle"></div></div>
    
    <div class="component-menu-header" style="position: sticky; top: 0; background: var(--background-primary); z-index: 2;">
        <div class="component-search component-search--full component-search--h36">
            <div class="component-search-icon">
                <span class="material-symbols-rounded">search</span>
            </div>
            <div class="component-search-input">
                <input type="text" class="tag-search-input" placeholder="<?php echo htmlspecialchars($placeholder); ?>">
            </div>
        </div>
    </div>

    <div class="component-menu-list component-menu-list--scrollable tag-results-list" style="overflow-y: auto;">
        </div>
</div>