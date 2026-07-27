# Resolución de Bugs del pending.txt

Revisión exhaustiva de los bugs listados en `pending.txt`. A continuación cada issue con su confirmación, análisis y propuesta de solución.

---

## ✅ Bugs Confirmados y Plan de Resolución

### 1. 🐛 Botones de cerrar modal (`component-modal-close-btn`) no funcionan
**Estado:** ✅ CONFIRMADO — Bug real

**Análisis:** En [DialogSystem.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogSystem.js#L157-L165), el método `handleClick` hace `const closeBtn = e.target.closest('.component-modal-close-btn');` en la línea 160, pero **nunca actúa sobre esa variable**. Después de asignarla, pasa directo a verificar `toggleModuleBtn` sin hacer `if (closeBtn) { this.closeCurrent(false); return; }`.

**Solución:** Agregar la lógica faltante después de la línea 160:
```js
if (closeBtn) {
    this.closeCurrent(false);
    return;
}
```

---

### 2. 🐛 Template upload no actualiza el UI
**Estado:** ✅ CONFIRMADO — Bug real

**Análisis:** En [DesignTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/templates/DesignTemplates.js#L270-L272), `loadUserLibrary()` tiene un guard `if (this.templatesLoaded || this.isLoadingTemplates) return;` (línea 272). Después del primer load, `this.templatesLoaded = true` (línea 283). Cuando `handleFileUpload` llama a `await this.loadUserLibrary()` en la línea 426, la función retorna inmediatamente porque `templatesLoaded` ya es `true`.

**Solución:** Resetear `this.templatesLoaded = false;` antes de llamar a `loadUserLibrary()` en `handleFileUpload`:
```js
// Antes de await this.loadUserLibrary();
this.templatesLoaded = false;
await this.loadUserLibrary();
```
Y lo mismo en `deleteServerTemplate` (línea 542).

---

### 3. 🐛 Modal de protección muestra botón "Desproteger" innecesario
**Estado:** ✅ CONFIRMADO — Bug de diseño

**Análisis:** En [DialogTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogTemplates.js#L1033-L1057), el template `confirmProtectAreaModal` siempre muestra 3 botones: Cancelar, Desproteger y Proteger. El usuario quiere:
- Al **seleccionar un área nueva** → solo mostrar "Cancelar" + "Proteger"
- Al **clickar sobre una zona ya protegida** → solo mostrar "Cancelar" + "Eliminar Protección"

**Solución:** 
1. Crear un segundo template `confirmUnprotectAreaModal` con solo "Cancelar" + "Eliminar Protección"
2. Modificar `confirmProtectAreaModal` para quitar el botón "Desproteger"
3. En [DesignInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignInteractions.js#L447-L458), al clickar sobre un pixel protegido, mostrar el modal de desproteger en lugar del de proteger

---

### 4. 🐛 Al clickar pixel protegido se intenta activar modo selección además del modal
**Estado:** ✅ CONFIRMADO — Bug de lógica

**Análisis:** En [DesignInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignInteractions.js#L440-L463), cuando se detecta un pixel protegido, se settea `ownerEraserBox`, `ownerEraserStep = 2`, se llama `updateSelectionUI()` y `requestRender()`, y LUEGO se muestra el modal. Pero el `ownerEraserStep = 2` hace que el UI piense que hay una selección activa.

**Solución:** Al clickar sobre un pixel protegido en modo protección, NO setear `ownerEraserStep = 2` ni `ownerEraserBox`. Solo mostrar el modal de "Eliminar protección" y manejar la respuesta sin contaminar el estado de selección.

---

### 5. 🔤 Nombres de owner tools son muy simples
**Estado:** ✅ CONFIRMADO — Mejora de UX

**Análisis:** Los badges actuales hardcodeados en [DesignInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignInteractions.js#L1660-L1714):
- Línea 1671: `"Borrador de Lienzo"` → ya tiene 2 palabras, pero podemos mejorarlo
- Línea 1689: `"Congelar Interactividad" / "Descongelar Interactividad"` → ya es descriptivo
- Línea 1707: `"Protector de Zona"` → ya tiene 2 palabras

**Solución:** Renombrar a nombres más descriptivos y usar claves de traducción:
- `"Borrador de Lienzo"` → `"Borrador Administrativo"` (o similar via traducción `badge_owner_eraser`)
- `"Congelar/Descongelar Interactividad"` → `"Control de Interactividad"` (via traducción `badge_owner_freeze`)  
- `"Protector de Zona"` → `"Protección Administrativa"` (via traducción `badge_owner_protect`)

---

### 6. 🔤 Renombrar "view restart gallery" en cards de home
**Estado:** ✅ CONFIRMADO

**Análisis:** En [CanvasCardInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/CanvasCardInteractions.js#L327), usa la key `view_restart_gallery`. La traducción actual en [general.json](file:///f:/htdocs/ProjectRosaura/translations/es-419/general.json#L771) es `"Ver galería de instantáneas"` que en realidad ya está bien. La key sin embargo es confusa (`restart_gallery`).

**Solución:** Renombrar la key de traducción a `view_snapshots_gallery` y el valor a `"Galería de instantáneas"`. Actualizar en CanvasCardInteractions.js y en general.json.

---

### 7. 🔐 Botón "Unirte" para usuarios no logueados muestra modal de términos
**Estado:** ✅ CONFIRMADO — Bug de UX

**Análisis:** En [design.php](file:///f:/htdocs/ProjectRosaura/includes/views/app/design.php#L85-L88), el botón "Unirse" se muestra sin importar si el usuario tiene sesión. `window.activeUserId` es `null` cuando no hay sesión (línea 161 de app.php). El click dispara `handleAccessRequest` en DesignNetwork.js que muestra el modal `joinCanvasTerms`.

**Solución:** En design.php, ocultar el botón "Unirte" si no hay sesión. En su lugar, mostrar un badge que diga "Inicia sesión para unirte" y que al clickar redirija a `/login`.

---

### 8. 📝 Simplificar modal de aceptar términos al unirse a lienzo
**Estado:** ✅ CONFIRMADO — Mejora de UX

**Análisis:** El template `joinCanvasTerms` en [DialogTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogTemplates.js#L777-L809) tiene un toggle switch de checkbox para "Aceptar reglas de la comunidad". El usuario quiere:
- Eliminar el toggle switch
- En la descripción del modal indicar que al unirte aceptas las reglas
- Que el botón diga "Aceptar"

**Solución:** Simplificar el template: quitar el `component-group-item` con toggle, actualizar la descripción, cambiar el botón de "Unirse" a "Aceptar". En la lógica de CanvasCardInteractions.js y DesignNetwork.js, ya no verificar `modal_join_terms` checkbox, solo verificar `res.confirmed`.

---

### 9. 📐 Input de código de transmisión con ancho restringido
**Estado:** ✅ CONFIRMADO

**Análisis:** En [DialogTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogTemplates.js#L690), el input usa clase `component-form-box component-form-box--full`. El CSS de `.component-form-box` en [components.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/components/components.css#L728-L734) tiene `max-width: 325px`. Esta clase se usa en formularios de auth y otras vistas que necesitan el max-width.

**Solución:** NO modificar `.component-form-box` (se usa en muchos formularios). En su lugar, agregar un override específico dentro del modal:
```css
.component-modal-body .component-form-box--full {
    max-width: 100%;
}
```
Esto solo afecta cuando `component-form-box--full` está dentro de un modal.

> [!IMPORTANT]
> Se verificó que `component-form-box--full` no existe como clase CSS, por lo que crear la regla de override no romperá nada existente.

---

### 10. 🔤 Modal de inyectar template muestra keys sin traducir + tokens abrumadores
**Estado:** ✅ CONFIRMADO

**Análisis:** En [DialogTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogTemplates.js#L912-L925), `confirmInjectTemplate` usa:
- `titleKey: 'title_confirm_action'` → traducido como "Confirmar acción" ✅ (la traducción existe)
- `__('confirm_inject_template')` → traducido como "¿Deseas estampar esta plantilla en el lienzo?" ✅

Los tokens se muestran en un bloque separado grande. El usuario quiere que la info de tokens se integre en la descripción de forma más sutil.

**Solución:** Integrar la info de costo en la descripción como texto inline:
```
"¿Deseas estampar esta plantilla en el lienzo? (Costo: 25 tokens · Saldo restante: 225 tokens)"
```

---

### 11. 📊 Dashboard admin: muchas cards + chart no responsive
**Estado:** ✅ CONFIRMADO

**Análisis:** [dashboard.php](file:///f:/htdocs/ProjectRosaura/includes/views/admin/dashboard.php) tiene 11 stat cards. El CSS de `.component-stat-grid` usa `grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))` que se adapta bien. Para el chart, `.dashboard-chart-body` tiene `height: 350px` fijo sin responsividad adecuada.

**Solución:**
1. **Stats cards**: Agrupar las cards en 2 filas con un sistema de "cards primarias" (4 principales visibles siempre) y "cards secundarias" (7 restantes) colapsables con un botón "Ver más estadísticas"
2. **Chart responsive**: Agregar `min-height` en vez de `height` fijo, y `overflow-x: auto` al container en pantallas pequeñas

---

### 12. 🦴 Skeleton especial faltante para `/design`
**Estado:** ✅ CONFIRMADO

**Análisis:** En [RouteModulesMap.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/router/RouteModulesMap.js#L11), la ruta `/design` usa `skeletonType: 'layout-basic'`, que es un skeleton genérico. La sección de design con su canvas necesitaría un skeleton especializado.

**Solución:** Crear un skeleton `layout-design` que simule el header con badges/botones, un canvas placeholder grande, y la barra inferior. Registrarlo en RouteModulesMap y en el sistema de skeletons.

---

### 13. 🍪 Aviso de cookies
**Estado:** ✅ CONFIRMADO — Feature faltante

**Análisis:** No existe ninguna implementación de cookie consent banner en el proyecto. El proyecto ya tiene una ruta `/site-policy/cookies-policy` pero no tiene el banner.

**Solución:** Crear un cookie consent banner sencillo y elegante que:
- Aparezca en la parte inferior como un banner flotante
- Se guarde en localStorage la preferencia
- Tenga link a la política de cookies existente
- Se muestre solo una vez

---

### 14. 🛡️ Rate limiting para owner tools (protección contra abuso)
**Estado:** ⚠️ PARCIALMENTE EXISTENTE

**Análisis:** Ya existe un cooldown para el borrador: en [DesignInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignInteractions.js#L1770) hay un `showMessage("Espera X segundos antes de usar el borrador de nuevo")`. Pero no hay rate limiting del lado del servidor explícito visible para las herramientas de owner.

**Solución:** Este es un cambio más complejo que involucra el backend. Lo dejo como item de discusión.

> [!WARNING]
> La implementación de rate limiting del servidor requiere cambios en la API backend (PHP). ¿Deseas que incluya esto en la implementación o lo dejamos para después?

---

## Open Questions

> [!IMPORTANT]
> **Nombres de owner tools:** Los nombres actuales ya tienen 2+ palabras ("Borrador de Lienzo", "Congelar Interactividad", "Protector de Zona"). ¿Tienes en mente nombres específicos que te gusten más? Te propongo:
> - `"Borrador de Lienzo"` → `"Borrador Administrativo"` ó `"Limpiador de Zonas"`
> - `"Protector de Zona"` → `"Protección Administrativa"` ó `"Escudo de Zona"`
> - `"Congelar/Descongelar Interactividad"` → `"Control de Interactividad"` ó `"Pausa de Actividad"`

> [!IMPORTANT]
> **Dashboard stats cards:** ¿Prefieres el sistema colapsable (mostrar 4 principales + "ver más"), o prefieres un carrusel horizontal que rote entre las cards?

> [!IMPORTANT]
> **Skeleton de /design:** ¿Quieres un skeleton que simule la interfaz completa del canvas (header + canvas grande + barra lateral), o un skeleton más simple con un placeholder rectangular central?

---

## Proposed Changes

### DialogSystem (Close Button Fix)
#### [MODIFY] [DialogSystem.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogSystem.js)
- Agregar `if (closeBtn) { this.closeCurrent(false); return; }` después de línea 160

---

### Template System (Upload UI + Inject Modal)
#### [MODIFY] [DesignTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/templates/DesignTemplates.js)
- Reset `templatesLoaded = false` antes de `loadUserLibrary()` en `handleFileUpload` y `deleteServerTemplate`

#### [MODIFY] [DialogTemplates.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/DialogTemplates.js)
- Simplificar template `confirmInjectTemplate` — integrar token info en la descripción
- Simplificar template `joinCanvasTerms` — quitar toggle, cambiar botón a "Aceptar"
- Modificar `confirmProtectAreaModal` — quitar botón "Desproteger"
- Crear template `confirmUnprotectAreaModal` — solo "Cancelar" + "Eliminar Protección"

---

### Join / Auth UX Flow
#### [MODIFY] [design.php](file:///f:/htdocs/ProjectRosaura/includes/views/app/design.php)
- Reemplazar botón "Unirte" con badge "Inicia sesión para unirte" cuando no hay sesión

#### [MODIFY] [CanvasCardInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/CanvasCardInteractions.js)
- Ya no verificar `modal_join_terms` checkbox, solo `res.confirmed`

#### [MODIFY] [DesignNetwork.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignNetwork.js)
- Ya no verificar `modal_join_terms` checkbox, solo `res.confirmed`

---

### Owner Tools (Names + Protection)
#### [MODIFY] [DesignInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignInteractions.js)
- Usar claves de traducción para nombres de owner tools
- Fix: al clickar pixel protegido, no contaminar estado de selección + usar modal correcto

#### [MODIFY] [CanvasCardInteractions.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/components/CanvasCardInteractions.js)
- Renombrar key `view_restart_gallery` → `view_snapshots_gallery`

---

### Live Join Code Width Fix
#### [MODIFY] [components.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/components/components.css)
- Agregar regla `.component-modal-body .component-form-box--full { max-width: 100%; }`

---

### Admin Dashboard
#### [MODIFY] [dashboard.php](file:///f:/htdocs/ProjectRosaura/includes/views/admin/dashboard.php)
- Reorganizar stat cards con sección colapsable

#### [MODIFY] [components.css](file:///f:/htdocs/ProjectRosaura/public/assets/css/components/components.css)
- Mejorar responsividad del chart: usar `min-height` + `overflow-x: auto` en mobile

---

### Skeleton de /design
#### [MODIFY] [RouteModulesMap.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/core/router/RouteModulesMap.js)
- Cambiar skeletonType de `/design` a `layout-design`

*(Requiere crear el skeleton en el sistema de skeletons)*

---

### Aviso de Cookies
#### [NEW] Cookie consent banner
- Implementar en el layout principal (app.php)
- Estilo coherente con el design system existente
- Guardar preferencia en localStorage

---

### Traducciones
#### [MODIFY] [general.json](file:///f:/htdocs/ProjectRosaura/translations/es-419/general.json)
- Renombrar key `view_restart_gallery` → `view_snapshots_gallery`
- Agregar keys para nombres de owner tools
- Agregar keys para cookie consent

---

## Verification Plan

### Manual Verification
1. Abrir un modal y verificar que el botón X de cerrar funciona
2. Subir un template y verificar que aparece en la galería sin recargar
3. Abrir el modal de protección desde selección nueva → solo Cancelar + Proteger
4. Clickar pixel protegido → solo Cancelar + Eliminar Protección
5. Verificar nombres de owner tools actualizados
6. Verificar que el input de código de transmisión se expande al 100% del modal
7. Verificar modal de inyectar template con tokens integrados en la descripción
8. Verificar badge "Inicia sesión para unirte" sin sesión
9. Verificar modal de join simplificado sin toggle
10. Verificar dashboard responsive con chart y cards colapsables
11. Verificar cookie consent banner
