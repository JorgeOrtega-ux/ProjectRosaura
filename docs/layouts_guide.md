# Guía de Layouts y Componentes Estandarizados (ProjectRosaura)

Esta guía documenta todos los layouts de página y componentes comunes utilizados en la plataforma web de **ProjectRosaura**. Sirve como referencia técnica para estandarizar el diseño y para guiar a modelos de IA en la creación de nuevas vistas coherentes con el diseño de la aplicación.

---

## Tabla Comparativa de Secciones y Layouts

A continuación se detallan todas las secciones de la web clasificadas por el tipo de layout que utilizan:

| Categoría de Layout | Descripción | Clases Principales | Secciones Asociadas | Componentes Internos Comunes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Layout de Autenticación Centrado** | Formulario centrado en pantalla, ancho estrecho. | `.component-layout-centered` > `.component-form-box` | login, registro, recuperar contraseña, restablecer contraseña | Logos, inputs simples, botones primarios/de estado |
| **2. Layout de Ajustes con Ancho Restringido** | Stack vertical simple de tarjetas, ancho fijo ~625px, sin barra superior sticky. | `.view-content` > `.component-wrapper` > `.component-bottom` | Ajustes de cuenta, preferencias de accesibilidad, ajustes de invitado, seguridad y 2FA, eliminación de cuenta | Tarjetas agrupadas (`.component-card--grouped`), divisores, avatares, controles en línea |
| **3. Layout de Ajustes y Documentos Completo en Viewport** | Barra superior sticky con acciones/subtítulo, y cuerpo con scroll independiente (`.component-viewport`). | `.view-content` > `.component-top` + `.component-viewport` > `.component-wrapper` > `.component-bottom` | Configuración del servidor, automatización de copias, creación de copias, restauración de copias, moderación de usuarios, permisos de roles, resets y resize de lienzo, **términos y condiciones, política de privacidad, política de cookies, aviso legal y políticas de reembolsos** | Barra superior sticky, acordeones, formularios avanzados, bloques de lectura de políticas (`.policy-section`), listas de políticas (`.policy-list`) |
| **4. Layout de Viewport Completo con Tabla/Grilla** | Contenido a pantalla completa para visualizar listas grandes de datos o grillas. | `.view-content` > `.component-wrapper--full.no-padding` > `.component-top` + `.component-bottom` | Administración de usuarios, logs, suscripciones, base de datos de mensajes, listado de lienzos, galería de snapshots, tienda de monedas y contenido | Tablas adaptables (`.component-table`), grillas de elementos, filtros rápidos, barra de búsqueda |

---

## Plantillas de Estructura de Layouts

A continuación se presentan las plantillas HTML (PHP) listas para copiar y pegar para cada tipo de layout:

### 1. Layout de Autenticación Centrado (Auth Centered Layout)
```html
<div class="component-layout-centered">
    <div class="auth-header-logo">
        <!-- SVG o imagen del Logo -->
    </div>
    <div class="component-form-box">
        <h1 class="component-form-title">Título del Formulario</h1>
        <p class="component-form-desc">Texto descriptivo corto secundario.</p>
        
        <form id="authForm">
            <!-- Campos de formulario -->
        </form>
    </div>
</div>
```

### 2. Layout de Ajustes con Ancho Restringido (Constrained Settings Layout)
```html
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title">Ajustes Generales</h1>
                <p class="component-page-description">Configura las opciones básicas de tu cuenta.</p>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">settings</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Opción A</h2>
                            <p class="component-card__description">Descripción de lo que hace esta opción.</p>
                        </div>
                    </div>
                    <div class="component-card__actions">
                        <button class="component-button component-button--h34">Editar</button>
                    </div>
                </div>
                
                <hr class="component-divider">
                
                <div class="component-group-item">
                    <!-- Siguiente opción -->
                </div>
            </div>
        </div>
    </div>
</div>
```

### 3. Layout de Ajustes y Documentos Completo en Viewport (Viewport Settings/Documents Layout)
```html
<div class="view-content" data-ref="mi-seccion-wrapper">
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title">Configuración o Título Legal</h1>
        </div>
        <div class="component-top-right">
            <!-- Opcional: Botones de acciones primarias (Guardar, etc.) o botones de navegación -->
            <button class="component-button component-button--icon component-button--h40" data-action="save">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <!-- Usar .component-bottom. Para páginas de lectura de políticas, el texto se estructura con .policy-section y .policy-text dentro del mismo flujo de ajustes -->
            <div class="component-bottom">
                
                <!-- Estructura para políticas de sitio (Documentos): -->
                <div class="policy-section">
                    <h2 class="policy-section-title">1. Introducción</h2>
                    <p class="policy-text">Texto explicativo de la sección legal...</p>
                </div>

                <!-- Estructura para Ajustes avanzados:
                     Usar .component-card--grouped, formularios, etc. -->

            </div>
        </div>
    </div>
</div>
```

### 4. Layout de Viewport Completo con Tabla (Full Viewport Table)
```html
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title">Panel de Control</h1>
            </div>
            <div class="component-top-right">
                <!-- Barra de búsqueda o filtro -->
                <button class="component-button component-button--h40">Nuevo Elemento</button>
            </div>
        </div>
        <div class="component-bottom">
            <div class="component-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th class="actions-col">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Dato 1</td>
                            <td><span class="status-indicator status-indicator--active">Activo</span></td>
                            <td>
                                <button class="component-button component-button--icon component-button--h28">
                                    <span class="material-symbols-rounded">edit</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
```

---

## Catálogo de Componentes Estandarizados

### Acordeón Colapsable (Accordion)
Utilizado para expandir/contraer ajustes o detalles.
```html
<div class="component-card--grouped component-accordion">
    <div class="component-group-item component-group-item--wrap component-accordion-header">
        <div class="component-card__content">
            <div class="component-card__icon-container component-card__icon-container--bordered">
                <span class="material-symbols-rounded">lock</span>
            </div>
            <div class="component-card__text">
                <h2 class="component-card__title">Título del Bloque</h2>
                <p class="component-card__description">Descripción secundaria del bloque colapsable.</p>
            </div>
        </div>
        <div class="component-card__actions component-card__actions--end">
            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
        </div>
    </div>
    
    <div class="component-accordion-body">
        <div class="component-accordion-content">
            <!-- Contenido que se oculta/muestra (formularios, listas de opciones, inputs) -->
        </div>
    </div>
</div>
```

### Interruptor Deslizante (Toggle Switch)
```html
<label class="component-toggle-switch">
    <input type="checkbox" id="toggle_id">
    <span class="component-toggle-slider"></span>
</label>
```

### Divisor de Grupo de Tarjetas (Divider)
```html
<hr class="component-divider">
```

### Controles de Incremento / Botones en Línea (Inline Counter Control)
```html
<div class="component-inline-control">
    <div class="component-inline-control__group">
        <button class="component-inline-control__btn" id="decrement">
            <span class="material-symbols-rounded">remove</span>
        </button>
        <div class="component-inline-control__center">
            <span id="counter_value">100</span>
        </div>
        <button class="component-inline-control__btn" id="increment">
            <span class="material-symbols-rounded">add</span>
        </button>
    </div>
</div>
```

---

## Estandarización de Módulos y Menús Desplegables (Dropdowns)

Todos los menús desplegables del proyecto siguen una arquitectura unificada gestionada de forma automática por `ModuleManager.js` y el motor de posicionamiento dinámico `UiEngine` (`ui-engine.js`):

### 1. Reglas de Posicionamiento y Responsive
* **Desktop (> 768px)**: El posicionamiento es gestionado exclusivamente de forma dinámica por `UiEngine` (`ModuleManager._attachEngine`), con prevención de colisiones (`preventOverflow`) y auto-volteado inteligente (`flip`).
  * **Prohibido**: No se deben usar clases estáticas de orientación como `.component-module--dropdown-left`, `.component-module--dropdown-right`, `.component-module--dropdown-top` o `.component-module--dropdown-bottom`.
  * **Ubicación preferida opcional**: Se define en el botón disparador mediante `data-position="top"` o `data-position="bottom"`.
* **Mobile (<= 768px)**: `UiEngine` se desvincula por completo (`_detachEngine`) y se limpian todos los estilos inline (`top`, `left`, `transform`, etc.). El menú pasa a ser un **Bottom-Sheet** fijo con gestos táctiles de arrastre hacia abajo para cerrar (`.pill-container` > `.drag-handle`).

---

### 2. Tipos de Dropdowns y Regla de Oro de Padding y Listas

> [!IMPORTANT]
> **Regla de Padding (`component-menu--no-padding`) y Scroll (`component-menu-list--scrollable`)**:
> - **Categoría 1 (Con Encabezado/Buscador)**: Requiere `component-menu--no-padding` en `.component-menu` y `.component-menu-list--scrollable` en la lista interna para que el buscador/título quede fijo arriba y solo la lista desplace con su propio padding de 8px.
> - **Categoría 2 (Dropdowns Simples de Selección/Acciones)**: **NUNCA** deben llevar `component-menu--no-padding` ni `component-menu-list--scrollable`. El scroll y el padding de 8px son manejados limpiamente por el contenedor padre `.component-menu` (o `.component-menu--limited`), y la lista interna debe ser simplemente `<div class="component-menu-list">` para evitar barras de desplazamiento dobles.
> - **Categoría 3 (Calendarios)**: Conserva `component-menu--no-padding` ya que `.component-calendar` implementa su propio layout de rejilla.

#### A. Menú Desplegable Simple (Selección, Enlaces y Acciones)
```html
<div class="component-dropdown-wrapper">
    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleSimple">
        <span class="material-symbols-rounded">settings</span>
        <span class="component-dropdown-text">Opción Seleccionada</span>
        <span class="material-symbols-rounded">expand_more</span>
    </div>
    <div class="component-module component-module--dropdown disabled" data-module="moduleSimple">
        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-menu-list">
                <div class="component-menu-link active" data-action="selectOption" data-value="1">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">check</span></div>
                    <div class="component-menu-link-text"><span>Opción 1</span></div>
                </div>
                <div class="component-menu-link" data-action="selectOption" data-value="2">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">star</span></div>
                    <div class="component-menu-link-text"><span>Opción 2</span></div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### B. Menú Desplegable con Encabezado / Barra de Búsqueda
```html
<div class="component-dropdown-wrapper">
    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleWithSearch">
        <span class="material-symbols-rounded">language</span>
        <span class="component-dropdown-text">Español</span>
        <span class="material-symbols-rounded">expand_more</span>
    </div>
    <div class="component-module component-module--dropdown disabled" data-module="moduleWithSearch">
        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
            <div class="pill-container"><div class="drag-handle"></div></div>
            <div class="component-menu-header">
                <div class="component-search component-search--full component-search--h36">
                    <div class="component-search-icon">
                        <span class="material-symbols-rounded">search</span>
                    </div>
                    <div class="component-search-input">
                        <input type="text" data-ref="search-input" placeholder="Buscar idioma...">
                    </div>
                </div>
            </div>
            <div class="component-menu-list component-menu-list--scrollable" data-ref="items-list">
                <div class="component-menu-link active" data-action="selectItem" data-value="es">
                    <div class="component-menu-link-icon"><span class="material-symbols-rounded">language</span></div>
                    <div class="component-menu-link-text"><span>Español</span></div>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

## Solución al Bug de Scroll y Padding Colapsado

> [!NOTE]
> **Detalles de la Investigación del Bug:**
> En layouts flexbox que utilizan contenedores con `overflow-y: auto`, los navegadores basados en Blink y WebKit (Chrome, Safari, Edge, etc.) tienen un error conocido por el cual ignoran el padding inferior (`padding-bottom`) de los elementos internos en desbordamiento.
> 
> **Solución de Estilos Implementada:**
> Para resolver esto sin hacks ni pseudoelementos `::after`, eliminamos `display: flex; flex-direction: column;` de los contenedores de scroll principales:
> - **`.general-content-scrolleable`** (en [styles.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/base/styles.css))
> - **`.component-viewport`** (en [components-layout.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/components/components-layout.css))
> 
> Al comportarse ahora como contenedores de bloque normales (`display: block` implícito por ser `div`s), el motor de renderizado del navegador calcula la altura del scroll en base al flujo estándar de bloques, respetando de forma nativa los paddings inferiores de todos los hijos en todas las vistas de la web de manera limpia y global.
