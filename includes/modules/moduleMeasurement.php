<?php 
// includes/modules/moduleMeasurement.php
$userPrefs = $_SESSION['user_prefs'] ?? [];
// Obtenemos la preferencia actual, asegurando compatibilidad con tu clase UserPrefsManager
$currentMeasurement = $userPrefs['measurement_system'] ?? ($_COOKIE['measurement_system'] ?? 'metric');

$measurements = [
    'metric'   => ['icon' => 'square_foot', 'text' => 'Métrico (kg / cm)'],
    'imperial' => ['icon' => 'straighten', 'text' => 'Imperial (lbs / ft-in)']
];
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleMeasurement">
    
    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>

        <div class="component-menu-list component-menu-list--scrollable">
            <?php foreach ($measurements as $val => $data): ?>
            <div class="component-menu-link <?php echo ($currentMeasurement === $val) ? 'active' : ''; ?>" data-action="setPref" data-key="measurement_system" data-value="<?php echo htmlspecialchars($val); ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded"><?php echo $data['icon']; ?></span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo $data['text']; ?></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>