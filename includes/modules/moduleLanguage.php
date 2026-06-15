<?php 
$userPrefs = $_SESSION['user_prefs'] ?? [];
$currentLang = $userPrefs['language'] ?? ($_COOKIE['pr_language'] ?? 'es-419');
$languages = \App\Core\System\Translator::getAvailableLanguages();
?>
<div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleLanguage">
    <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
        <div class="pill-container"><div class="drag-handle"></div></div>
        <div class="component-menu-header">
            <div class="component-search component-search--full component-search--h36">
                <div class="component-search-icon">
                    <span class="material-symbols-rounded">search</span>
                </div>
                <div class="component-search-input">
                    <input type="text" data-ref="language-search" placeholder="<?php echo __('search_language'); ?>">
                </div>
            </div>
        </div>
        <div class="component-menu-list component-menu-list--scrollable" data-ref="language-list">
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
            
            <div class="component-menu-empty" data-ref="language-empty" hidden>
                 <div class="component-menu-link disabled-interactive">
                     <div class="component-menu-link-icon"><span class="material-symbols-rounded">search_off</span></div>
                     <div class="component-menu-link-text"><span class="component-text-notice--muted"><?php echo __('no_results_found') ?? 'No se encontraron resultados'; ?></span></div>
                 </div>
            </div>
        </div>
    </div>
</div>