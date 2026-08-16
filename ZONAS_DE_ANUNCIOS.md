# 📌 Guía de Zonas de Anuncios y Patrocinios en ProjectRosaura

Este documento detalla todas las zonas y módulos de la plataforma donde se encuentran implementados los espacios publicitarios y patrocinios nativos, su comportamiento interactivo, archivos asociados y reglas de exención.

---

## 🏗️ 1. Arquitectura Central del Sistema

- **Servicio Centralizado**: [`public/assets/js/core/services/PromoCardService.js`](public/assets/js/core/services/PromoCardService.js)
  - Administra el catálogo de anuncios para Feeds (`FEED_PROMOS`) y Módulos (`MODULE_PROMOS`).
  - Controla la inyección de cards según frecuencia y la delegación global de eventos (`mouseover`, `mouseout`, clicks en dots).
- **Plantilla de Card Unificada**: [`public/assets/js/core/components/CardTemplates.js`](public/assets/js/core/components/CardTemplates.js) (`CardTemplates.promoCard`)
  - Misma estructura HTML y CSS que las cards de lienzos (`.component-gallery-card`).
  - Badge "Patrocinado" superior izquierdo y badge con nombre de la empresa patrocinadora superior derecho.
  - Pista multimedia (`.component-gallery-media-track`) con soporte de imágenes y video al final.
  - Indicadores de etapas tipo dots (`.component-gallery-dots`).
- **Seguridad y Anti-Adblock**: Cero nombres de clases que contengan palabras bloqueables (`ad`, `ads`, `advertisement`, etc.).
- **Exención por Suscripción (`feat_no_ads`)**:
  - Usuarios con planes activos (Tier 1 Plus, Tier 2 Pro, Tier 3 Ultra) quedan **100% exentos de ver anuncios** en cualquier sección.
  - Validación frontend mediante `isAdFreeUser()` en [`uiUtils.js`](public/assets/js/core/utils/uiUtils.js).

---

## 📍 2. Mapa Completo de Zonas con Anuncios

### 🏠 Zona 1: Feed Principal (Home)
- **Ruta**: `/` o `/home`
- **Frecuencia / Posición**: **1 card de patrocinador cada 8 cards de lienzos**.
- **Tipo de Carga**: Dinámica en cliente (SPA) con scroll infinito y virtualización DOM (`VirtualGridObserver`).
- **Archivos Clave**:
  - Control: [`public/assets/js/modules/app/home/HomeController.js`](public/assets/js/modules/app/home/HomeController.js)
  - Vista Base: [`includes/views/app/home.php`](includes/views/app/home.php)

---

### 🔍 Zona 2: Resultados de Búsqueda (Search)
- **Ruta**: `/search?q=...`
- **Frecuencia / Posición**: **1 card de patrocinador cada 8 cards de resultados**.
- **Tipo de Carga**: Dinámica en cliente (SPA) con scroll infinito y virtualización DOM (`VirtualGridObserver`).
- **Archivos Clave**:
  - Control: [`public/assets/js/modules/app/search/SearchController.js`](public/assets/js/modules/app/search/SearchController.js)
  - Vista Base: [`includes/views/app/search.php`](includes/views/app/search.php)

---

### 📸 Zona 3: Galería de Capturas Históricas del Lienzo
- **Ruta**: `/design/s/:uuid`
- **Frecuencia / Posición**: **1 card de patrocinador cada 2 cards de capturas**.
- **Tipo de Carga**: Renderizado en Servidor (SSR con PHP) e interactividad global en JS.
- **Archivos Clave**:
  - Vista: [`includes/views/canvases/snapshots/snapshots-gallery.php`](includes/views/canvases/snapshots/snapshots-gallery.php)
  - Control: [`public/assets/js/modules/canvases/history/CanvasSnapshotsGalleryController.js`](public/assets/js/modules/canvases/history/CanvasSnapshotsGalleryController.js)

---

### 🎨 Zona 4: Módulo de Paleta de Colores (Diseño)
- **Ruta**: `/design/:id` (Panel lateral `menu-colors`)
- **Frecuencia / Posición**: **1 card fija anclada en la parte inferior (`bottom`) del menú**.
- **Tipo de Carga**: Modular lateral inyectado al cargar herramientas de diseño.
- **Archivos Clave**:
  - Módulo HTML: [`includes/modules/moduleDesignTools.php`](includes/modules/moduleDesignTools.php) (`[data-ref="module-promo-bottom-colors"]`)
  - Control: [`public/assets/js/modules/app/design/DesignController.js`](public/assets/js/modules/app/design/DesignController.js)

---

### 📐 Zona 5: Módulo de Plantillas (Diseño)
- **Ruta**: `/design/:id` (Panel lateral `menu-templates`)
- **Frecuencia / Posición**: **1 card fija anclada en la parte inferior (`bottom`) del menú**.
- **Tipo de Carga**: Modular lateral inyectado al cargar herramientas de diseño.
- **Archivos Clave**:
  - Módulo HTML: [`includes/modules/moduleDesignTools.php`](includes/modules/moduleDesignTools.php) (`[data-ref="module-promo-bottom-templates"]`)
  - Control: [`public/assets/js/modules/app/design/DesignController.js`](public/assets/js/modules/app/design/DesignController.js)

---

### ℹ️ Zona 6: Módulo de Información / Detalles del Lienzo
- **Ruta**: `/` o `/home` o `/search` (Panel lateral `menu-canvas-info` al abrir opciones del lienzo)
- **Frecuencia / Posición**: **1 card fija anclada en la parte inferior (`bottom`) del menú de información**.
- **Tipo de Carga**: Modular lateral dinámico al hacer clic en "Información del lienzo".
- **Archivos Clave**:
  - Módulo HTML: [`includes/modules/moduleCanvasInfo.php`](includes/modules/moduleCanvasInfo.php) (`[data-ref="module-promo-bottom-info"]`)
  - Control: [`public/assets/js/core/components/CanvasCardInteractions.js`](public/assets/js/core/components/CanvasCardInteractions.js)

---

## 🎬 3. Comportamiento Multimedia e Interactividad

1. **Pase Automático al Hover (`mouseover`)**:
   - Al colocar el cursor sobre la card, inicia una rotación automática pasando de una imagen a la siguiente cada **2 segundos (2000ms)**.
2. **Video Siempre al Final**:
   - Si el anuncio contiene video, este siempre se coloca como el último slide del carrusel.
   - Al alcanzar el último dot, se muestra y reproduce el video silenciado (`muted`, `loop`, `playsinline`).
3. **Reinicio Instantáneo al Salir (`mouseout`)**:
   - Al retirar el cursor, el temporizador se detiene, el video se pausa y se regresa inmediatamente a la **primera imagen (dot 1)**.
4. **Navegación Manual por Dots**:
   - Los dots `.component-gallery-dot` permiten hacer clic directamente para ir a cualquier foto o al video.
5. **Animación Visual Suave**:
   - Transición de **crossfade cinematográfico con micro-zoom** (`opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)` y `transform: scale(1.05)` a `scale(1)`).
