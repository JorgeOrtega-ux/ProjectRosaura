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
                <button class="component-button component-button--dark component-button--h40">Nuevo Elemento</button>
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

## Solución al Bug de Scroll y Padding Colapsado

> [!NOTE]
> **Detalles de la Investigación del Bug:**
> En layouts flexbox que utilizan contenedores con `overflow-y: auto`, los navegadores basados en Blink y WebKit (Chrome, Safari, Edge, etc.) tienen un error conocido por el cual ignoran el padding inferior (`padding-bottom`) de los elementos internos en desbordamiento.
> 
> **Solución de Estilos Implementada:**
> Para resolver esto sin hacks ni pseudoelementos `::after`, eliminamos `display: flex; flex-direction: column;` de los contenedores de scroll principales:
> - **`.general-content-scrolleable`** (en [styles.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/styles.css))
> - **`.component-viewport`** (en [components.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/components/components.css))
> 
> Al comportarse ahora como contenedores de bloque normales (`display: block` implícito por ser `div`s), el motor de renderizado del navegador calcula la altura del scroll en base al flujo estándar de bloques, respetando de forma nativa los paddings inferiores de todos los hijos en todas las vistas de la web de manera limpia y global.
