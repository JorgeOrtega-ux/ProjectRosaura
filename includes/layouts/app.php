<?php
// includes/layouts/app.php
global $serverConfig; // Rescatamos la config generada en bootstrap.php

// Evaluar restricción de mantenimiento para la UI
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;
$currentUserRole = $_SESSION['user_role'] ?? 'user';
$isPrivileged = in_array($currentUserRole, ['administrator', 'founder']);
$isMaintenanceRestricted = ($isMaintenanceActive && !$isPrivileged);
// Ocultamos la barra superior si es auth route o si el usuario está bloqueado por el mantenimiento
$topBarClass = ($isAuthRoute || $isMaintenanceRestricted) ? 'disabled' : '';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="<?php echo APP_URL; ?>/">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">

    <link rel="stylesheet" type="text/css" href="assets/css/components/components.css">

    <link rel="stylesheet" type="text/css" href="assets/css/components/components-admin.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-auth.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-settings.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-channel.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-watch.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-studio.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-player.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-comments.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-search.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-playlist.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components-trends.css">

    <script src="https://unpkg.com/hls.js@latest/dist/hls.min.js"></script>
    <link rel="stylesheet" type="text/css" href="assets/css/root.css">
    <title>Project Rosaura</title>

    <script>
        // Inyectar URL Base para JS (Para que SpaRouter.js y ApiServices.js la consuman)
        window.AppBasePath = "<?php echo APP_URL; ?>";

        // Inyectar Preferencias de Usuario
        window.AppUserPrefs = <?php echo ($isLoggedIn && isset($_SESSION['user_prefs'])) ? json_encode($_SESSION['user_prefs']) : 'null'; ?>;

        // Inyectar Configuración Global del Servidor para validaciones en JS
        window.AppServerConfig = <?php echo isset($serverConfig) ? json_encode($serverConfig) : '{}'; ?>;

        // Inyectar Traducciones
        window.AppTranslations = <?php echo json_encode(\App\Core\System\Translator::getAll()); ?>;

        // Motor de traducción en JS (Si los params existen, los reemplaza)
        function __(key, params = {}) {
            let text = (window.AppTranslations && window.AppTranslations[key] !== undefined) ? window.AppTranslations[key] : key;
            for (const [pKey, pValue] of Object.entries(params)) {
                text = text.replace(new RegExp(`{${pKey}}`, 'g'), pValue);
            }
            return text;
        }

        // Script de inicialización de Tema para evitar flash blanco (FOUC)
        (function() {
            var theme = 'system';
            if (window.AppUserPrefs && window.AppUserPrefs.theme) theme = window.AppUserPrefs.theme;
            else {
                var guestTheme = localStorage.getItem('pr_theme');
                if (guestTheme) theme = guestTheme;
            }
            var isDark = false;
            if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            else if (theme === 'dark') isDark = true;
            if (isDark) document.documentElement.classList.add('dark-theme');
            else document.documentElement.classList.add('light-theme');
        })();
    </script>
</head>

<body>
    <div id="component-age-gate" class="component-age-gate component-age-gate--active">
        <div class="component-age-gate-container">
            <div class="component-age-gate-header">
                <span class="material-symbols-rounded component-age-gate-icon">warning</span>
                <h2 class="component-age-gate-title">Advertencia de Contenido Sensible</h2>
            </div>
            <div class="component-age-gate-body">
                <p class="component-age-gate-desc">
                    Este sitio web contiene material restringido a menores de edad, que incluye desnudez y representaciones explícitas de actividad sexual. Al entrar, afirma que tiene por lo menos 18 años de edad o la mayoría de edad en la jurisdicción desde que está accediendo el sitio web y que da consentimiento en ver contenido sexualmente explícito.
                </p>
            </div>
            <div class="component-age-gate-actions">
                <button id="btn-age-reject" class="component-btn component-btn--secondary">Rechazar</button>
                <button id="btn-age-confirm" class="component-btn component-btn--primary">Confirmo que tengo 18 años</button>
            </div>
        </div>
    </div>

    <script>
        if (localStorage.getItem('age_verified') === 'true') {
            document.getElementById('component-age-gate').classList.remove('component-age-gate--active');
            document.getElementById('component-age-gate').classList.add('component-age-gate--hidden');
        }
    </script>

    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                <div class="general-content-top <?php echo $topBarClass; ?>">
                    <?php include __DIR__ . '/header.php'; ?>
                </div>
                <div class="general-content-bottom">
                    <?php include __DIR__ . '/../modules/moduleSurface.php'; ?>
                    <div class="general-content-scrolleable" data-ref="app-router-outlet">
                        <?php $loader->load($currentView); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/@popperjs/core@2"></script>
    <script type="module" src="assets/js/AppInit.js"></script>
</body>

</html>