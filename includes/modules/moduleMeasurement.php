<?php
// includes/modules/moduleMeasurement.php
// Usamos la preferencia cargada en your-profile.php
$currentMeasurement = $userPrefs['measurement_system'] ?? 'metric';
?>
<div class="component-module-floating" id="module-measurement" style="display: none; min-width: 200px;">
    <div class="component-module__header" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
        <h3 class="component-module__title" style="margin: 0; font-size: 14px; font-weight: 500;">Sistema de medición</h3>
    </div>
    <div class="component-module__content" style="padding: 8px 0;">
        <ul class="component-list" style="list-style: none; margin: 0; padding: 0;">
            <li class="component-list-item <?php echo $currentMeasurement === 'metric' ? 'active' : ''; ?>" data-action="setMeasurement" data-value="metric" data-text="Métrico (kg / cm)" style="padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span class="component-list-text" style="font-size: 14px;">Métrico (kg / cm)</span>
                <?php if($currentMeasurement === 'metric'): ?>
                    <span class="material-symbols-rounded" style="font-size: 18px;">check</span>
                <?php endif; ?>
            </li>
            <li class="component-list-item <?php echo $currentMeasurement === 'imperial' ? 'active' : ''; ?>" data-action="setMeasurement" data-value="imperial" data-text="Imperial (lbs / ft-in)" style="padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span class="component-list-text" style="font-size: 14px;">Imperial (lbs / ft-in)</span>
                <?php if($currentMeasurement === 'imperial'): ?>
                    <span class="material-symbols-rounded" style="font-size: 18px;">check</span>
                <?php endif; ?>
            </li>
        </ul>
    </div>
</div>