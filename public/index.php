<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">
    <title>Estructura Base</title>
</head>

<body>
    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                
                <div class="general-content-top">
                    <div class="header" id="main-header">
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
                                <button class="component-button component-button--dark component-button--h40">
                                    Acceder
                                </button>

                                <button id="mobile-search-toggle" class="component-button component-button--icon component-button--h40 mobile-search-btn">
                                    <span class="material-symbols-rounded">search</span>
                                </button>

                                <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleMainOptions">
                                    <span class="material-symbols-rounded">more_vert</span>
                                </button>
                            </div>
                        </div>

                        <div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
                            <div class="component-menu component-menu--w265 component-menu--h-auto">
                                <div class="component-menu-list">
                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">settings</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Configuración</span>
                                        </div>
                                    </a>
                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">help</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Ayuda y comentarios</span>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="general-content-bottom">
                    
                    <div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
                        <div class="component-menu component-menu--w265 component-menu--h-full">
                            
                            <div class="component-menu-top">
                                <div class="component-menu-list">
                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">home</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Página principal</span>
                                        </div>
                                    </a>
                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">explore</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Explorar tendencias</span>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            <div class="component-menu-bottom">
                                <div class="component-menu-list">
                                    
                                    <?php /* if(isset($_SESSION['es_admin']) && $_SESSION['es_admin'] === true): */ ?>
                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">admin_panel_settings</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Panel de Control</span>
                                        </div>
                                    </a>
                                    <?php /* endif; */ ?>

                                    <a href="#" class="component-menu-link">
                                        <div class="component-menu-link-icon">
                                            <span class="material-symbols-rounded">settings</span>
                                        </div>
                                        <div class="component-menu-link-text">
                                            <span>Configuración</span>
                                        </div>
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="general-content-scrolleable">
                    </div>

                </div>

            </div>
        </div>
    </div>

    <script type="module" src="assets/js/app-init.js"></script>
</body>

</html>