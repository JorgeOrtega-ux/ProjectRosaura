<?php
// includes/layouts/app.php
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/ProjectRosaura/">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
    
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components.css">
    <title>Project Rosaura</title>
    
    <script>
        window.AppUserPrefs = <?php echo ($isLoggedIn && isset($_SESSION['user_prefs'])) ? json_encode($_SESSION['user_prefs']) : 'null'; ?>;
        window.AppTranslations = <?php echo json_encode(\App\Core\System\Translator::getAll()); ?>;
        function __(key) { return (window.AppTranslations && window.AppTranslations[key] !== undefined) ? window.AppTranslations[key] : key; }
        (function() {
            var theme = 'system';
            if (window.AppUserPrefs && window.AppUserPrefs.theme) theme = window.AppUserPrefs.theme;
            else { var guestTheme = localStorage.getItem('pr_theme'); if (guestTheme) theme = guestTheme; }
            var isDark = false;
            if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            else if (theme === 'dark') isDark = true;
            if (isDark) document.documentElement.classList.add('dark-theme');
            else document.documentElement.classList.add('light-theme');
        })();
    </script>
</head>
<body>
    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                <div class="general-content-top <?php echo $isAuthRoute ? 'disabled' : ''; ?>">
                    <?php include __DIR__ . '/header.php'; ?>
                </div>
                <div class="general-content-bottom">
                    <?php include __DIR__ . '/../modules/moduleSurface.php'; ?>
                    <div class="general-content-scrolleable" id="app-router-outlet">
                        <?php $loader->load($currentView); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="toast-container" class="toast-container"></div>
    <div id="dialog-container"></div>
    
    <script src="https://unpkg.com/@popperjs/core@2"></script>
    <script type="module" src="assets/js/app-init.js"></script>
</body>
</html>