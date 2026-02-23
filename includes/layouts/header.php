<?php 
// includes/layouts/header.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$userPic = $_SESSION['user_pic'] ?? '';
?>
<script>
    // Diccionario de títulos para la SPA
    window.AppRouteTitles = {
        '/': "Inicio",
        '/explore': "Explorar colecciones",
        '/login': "Iniciar sesión",
        '/register': "Crear cuenta",
        '/settings': "Configuración",
        '/settings/your-profile': "Tu perfil",
        '/settings/security': "Inicio de sesión y seguridad",
        '/settings/accessibility': "Accesibilidad",
        '/settings/guest': "Configuración de invitado"
    };
    window.AppName = "ProjectRosaura";
</script>

<div class="header">
    <div class="header-left">
        <div class="component-actions">
            <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleSurface">
                <span class="material-symbols-rounded">menu</span>
            </button>
        </div>
    </div>
    <div class="header-center">
        <div class="component-search">
            <div class="component-search-icon">
                <span class="material-symbols-rounded">search</span>
            </div>
            <div class="component-search-input">
                <input type="text" placeholder="Buscar...">
            </div>
        </div>
    </div>
    <div class="header-right">
        <div class="component-actions">
            
            <button class="component-button component-button--icon component-button--h40 mobile-search-btn" data-action="toggleMobileSearch">
                <span class="material-symbols-rounded">search</span>
            </button>

            <?php if (!$isLoggedIn): ?>
                <button class="component-button component-button--dark component-button--h40" data-nav="/ProjectRosaura/login">
                    Acceder
                </button>
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleMainOptions">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
            <?php else: ?>
                <button class="component-button component-button--profile role-<?php echo htmlspecialchars($userRole); ?>" data-action="toggleModuleMainOptions">
                    <img src="/ProjectRosaura/<?php echo htmlspecialchars($userPic); ?>" alt="Perfil">
                </button>
            <?php endif; ?>

        </div>
    </div>

    <?php include __DIR__ . '/../modules/moduleMainOptions.php'; ?>

</div>