# 📌 Guía de Zonas de Anuncios y Patrocinios en Spriteboard

Este documento detalla la arquitectura centralizada, los formatos soportados, el sistema de caché con Redis y la invalidación reactiva mediante `CacheInvalidator`.

---

## 🏗️ 1. Arquitectura Central del Sistema

- **Constantes Centralizadas**:
  - **Backend (PHP)**: [`includes/core/System/AdvertisementConstants.php`](includes/core/System/AdvertisementConstants.php)
    - Define los formatos válidos (`feed`, `module_colors`, `module_templates`), tipos de proveedor (`direct`, `network`), estados, eventos de métricas y catálogo descriptivo con iconos y etiquetas.
  - **Frontend (JS)**: [`public/assets/js/core/constants/AdvertisementConstants.js`](public/assets/js/core/constants/AdvertisementConstants.js)
    - Define `ADVERTISEMENT_FORMATS`, `getFormatIcon`, `getFormatLabel` y catálogo reutilizado en modales y controladores.
- **Servicio Centralizado en Cliente**: [`public/assets/js/core/services/PromoCardService.js`](public/assets/js/core/services/PromoCardService.js)
  - Administra la obtención de anuncios desde la API (`/api/advertisements/get-active`), inyección en feeds (`feedPromos`) y módulos (`modulePromos`).
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

## ⚡ 2. Capa de Caché en Redis y `CacheInvalidator`

El sistema publicitario implementa una capa de alto rendimiento con Redis:

1. **Pool Activo Público (`ads:active:public:raw`)**:
   - Almacena en memoria Redis todo el conjunto de anuncios activos, proveedores vigentes y sus recursos multimedia (TTL: 1 hora).
   - Las peticiones de visitantes resuelven la segmentación geográfica (GeoIP) directamente en memoria sin impactar la base de datos MySQL.
2. **Listados Paginados Administrativos**:
   - `ads:providers:list:{hash}`: Listado de proveedores y conteos agregados (TTL: 1 hora).
   - `ads:provider:ads:{uuid}:{hash}`: Listado de anuncios y creativos por proveedor (TTL: 1 hora).
   - `ads:provider:details:{uuid}`: Detalle individual de proveedor (TTL: 1 hora).
3. **Reportes y Auditoría**:
   - `ads:report:global:{period}`: Resumen global y rankings para auditorías (TTL: 5 minutos).
   - `ads:report:ad:{uuid}:{period}`: Métricas individuales y desglose diario (TTL: 5 minutos).
4. **Invalidación Automática**:
   - Centralizada en [`includes/core/System/CacheInvalidator.php`](includes/core/System/CacheInvalidator.php) mediante `advertisements()`, `advertisementProvider($uuid)` y `advertisement($adUuid, $providerUuid)`.
   - Se ejecuta inmediatamente ante cualquier creación, modificación, cambio de estado (`toggle`) o eliminación.

---

## 📍 3. Mapa de Zonas y Formatos Activos

| Formato (`format`) | Identificador UI | Icono | Zonas / Rutas Asignadas | Tipo de Carga |
| :--- | :--- | :--- | :--- | :--- |
| **`feed`** | Feed Principal | `view_carousel` | 1. **Feed Home** (`/` o `/home`): 1 card cada 8 lienzos.<br>2. **Búsqueda** (`/search`): 1 card cada 8 resultados.<br>3. **Capturas** (`/design/s/:uuid`): 1 card cada 2 capturas. | Dinámica en cliente (SPA) y SSR en galería de capturas. |
| **`module_colors`** | Módulo: Paleta de Colores | `palette` | `/design/:id` (Panel lateral `menu-colors` -> `data-ref="module-promo-bottom-colors"`) | Modular fijo en la parte inferior del menú de paletas. |
| **`module_templates`** | Módulo: Plantillas | `dashboard_customize` | `/design/:id` (Panel lateral `menu-templates` -> `data-ref="module-promo-bottom-templates"`) | Modular fijo en la parte inferior del menú de biblioteca. |

---

## 🎬 4. Comportamiento Multimedia e Interactividad

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







Mira tengo un problema y es que quiero llevar mi web app, a otro nivel lo que me bloquea es que yo quiero ser como canva.con que te deja crear cientos de lienzos, el problema de mi web es que te limita segun tu nivel de suscripcion a ya sea, 1, 5, etc, entonces, como te dije yo quisiera llevar la web a otro nivel donde no solo sea para batallas de pixeles si no que tambien sea la web como una web para pintar pixeles, tenia pensado en eliminar el limite de lienzos de todas las suscripciones y en su lugar usar la cuota de almacenamiento, pero como se que todos los lienzos se estan almacenando en redis, seria imposible otrogar lienzos casi infinitos sin saturar redis, estuve pensando en una solucion de que al crear un lienzo no active el online