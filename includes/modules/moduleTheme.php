<?php 
// includes/modules/moduleTheme.php
$userPrefs = $_SESSION['user_prefs'] ?? [];
$currentTheme = $userPrefs['theme'] ?? 'system';

$themes = [
    'system' => ['icon' => 'brightness_auto', 'text' => 'Sincronizar con el sistema'],
    'light'  => ['icon' => 'light_mode', 'text' => 'Tema claro'],
    'dark'   => ['icon' => 'dark_mode', 'text' => 'Tema oscuro']
];
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleTheme">
    
    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>

        <div class="component-menu-list component-menu-list--scrollable">
            <?php foreach ($themes as $val => $data): ?>
            <div class="component-menu-link <?php echo ($currentTheme === $val) ? 'active' : ''; ?>" data-action="setPref" data-key="theme" data-value="<?php echo htmlspecialchars($val); ?>">
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