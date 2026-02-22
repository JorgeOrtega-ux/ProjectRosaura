<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">
    <title>Sistema de Botones UI</title>
</head>

<body>
    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                
                <div class="general-content-top">
                    <div class="header">
                        <div class="header-left"></div>
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
                        <div class="header-right"></div>
                    </div>
                </div>

                <div class="general-content-bottom">
                    <div class="general-content-scrolleable">
                        
                        <div class="buttons-demo-container">
                            
                            <div class="buttons-row">
                                <div class="buttons-row-title">1. Alturas Base (Width Auto + Padding)</div>
                                <button class="component-button component-button--h40">Button 40px</button>
                                <button class="component-button component-button--h38">Button 38px</button>
                                <button class="component-button component-button--h36">Button 36px</button>
                                <button class="component-button component-button--h34">Button 34px</button>
                                <button class="component-button component-button--h32">Button 32px</button>
                                <button class="component-button component-button--h30">Button 30px</button>
                            </div>

                            <div class="buttons-row">
                                <div class="buttons-row-title">2. Botones Cuadrados (Iconos 40x40 hasta 30x30)</div>
                                <button class="component-button component-button--icon component-button--h40">
                                    <span class="material-symbols-rounded">add</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h38">
                                    <span class="material-symbols-rounded">edit</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h36">
                                    <span class="material-symbols-rounded">favorite</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h34">
                                    <span class="material-symbols-rounded">delete</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h32">
                                    <span class="material-symbols-rounded">settings</span>
                                </button>
                                <button class="component-button component-button--icon component-button--h30">
                                    <span class="material-symbols-rounded">close</span>
                                </button>
                            </div>

                            <div class="buttons-row">
                                <div class="buttons-row-title">3. Modificador: Píldora (--pill)</div>
                                <button class="component-button component-button--h40 component-button--pill">Píldora 40px</button>
                                <button class="component-button component-button--h36 component-button--pill">Píldora 36px</button>
                                <button class="component-button component-button--h32 component-button--pill">Píldora 32px</button>
                            </div>

                            <div class="buttons-row">
                                <div class="buttons-row-title">4. Modificador: Color Oscuro (--dark)</div>
                                <button class="component-button component-button--h40 component-button--dark">Botón Oscuro</button>
                                <button class="component-button component-button--h36 component-button--pill component-button--dark">Píldora Oscura</button>
                                <button class="component-button component-button--icon component-button--h40 component-button--dark">
                                    <span class="material-symbols-rounded">send</span>
                                </button>
                                <button class="component-button component-button--icon component-button--circle component-button--h36 component-button--dark">
                                    <span class="material-symbols-rounded">arrow_forward</span>
                                </button>
                            </div>

                            <div class="buttons-row">
                                <div class="buttons-row-title">5. Combinación: Icono + Texto</div>
                                <button class="component-button component-button--h40">
                                    <span class="material-symbols-rounded" style="font-size: 20px;">download</span>
                                    Descargar
                                </button>
                                <button class="component-button component-button--h36 component-button--dark">
                                    <span class="material-symbols-rounded" style="font-size: 18px;">save</span>
                                    Guardar Cambios
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>

</html>