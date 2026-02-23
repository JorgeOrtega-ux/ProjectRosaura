<?php 
// includes/modules/moduleLanguage.php
$userPrefs = $_SESSION['user_prefs'] ?? [];
$currentLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');

$languages = [
    'en-US' => 'English (United States)',
    'en-GB' => 'English (United Kingdom)',
    'fr-FR' => 'Français (France)',
    'de-DE' => 'Deutsch (Deutschland)',
    'it-IT' => 'Italiano (Italia)',
    'es-419' => 'Español (Latinoamérica)',
    'es-MX' => 'Español (México)',
    'es-ES' => 'Español (España)',
    'pt-BR' => 'Português (Brasil)',
    'pt-PT' => 'Português (Portugal)'
];
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleLanguage">
    
    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-header">
            <div class="component-search component-search--full component-search--h36">
                <div class="component-search-icon">
                    <span class="material-symbols-rounded">search</span>
                </div>
                <div class="component-search-input">
                    <input type="text" placeholder="Buscar idioma...">
                </div>
            </div>
        </div>

        <div class="component-menu-list component-menu-list--scrollable">
            <?php foreach ($languages as $code => $name): ?>
            <div class="component-menu-link <?php echo ($currentLang === $code) ? 'active' : ''; ?>" data-action="setPref" data-key="language" data-value="<?php echo htmlspecialchars($code); ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">language</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo htmlspecialchars($name); ?></span>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>