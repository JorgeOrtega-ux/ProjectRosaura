# Migración de Sistema de Colores: Roles a Suscripciones

Este documento resume todos los cambios realizados durante la migración de la arquitectura de la aplicación, donde se eliminó la dependencia de colores atados a los **Roles del Sistema** y se trasladó esa responsabilidad a los **Niveles de Suscripción (Tiers)**.

## 1. Cambios en Base de Datos
- **Eliminación de la columna `color`**: Se eliminó la columna `color` de la tabla `roles`.
- **Nueva fuente de verdad**: La tabla `subscription_tiers` ahora es la única responsable de dictar los estilos y colores (sólidos o degradados) que representan la jerarquía del usuario en la interfaz.

## 2. Refactorización del Backend (PHP)
- **`RoleRepository.php`**: Se actualizó el método `create()` y las consultas de actualización para remover cualquier mención o manipulación de la columna `color`.
- **`RoleRepositoryInterface.php`**: Se corrigió el error fatal de PHP (`Fatal Error: Declaration must be compatible`) sincronizando la firma de la interfaz con la nueva firma del repositorio (removiendo `$colorJson`).
- **`AdminServices.php`**: Se ajustó la lógica de los servicios administrativos para que ya no envíen el parámetro de color al crear o editar roles de sistema.

## 3. Correcciones de Enrutamiento (Router)
- **`routes.php`**: Se solucionó un error **404** en la vista de edición de suscripciones. La ruta `/admin/subscription-edit` se actualizó a `/admin/subscription-edit/:uuid` para que el enrutador pueda capturar correctamente el ID de la suscripción (ej. `/admin/subscription-edit/4`).

## 4. Refactorización de Controladores Frontend (JavaScript)
- **`AdminSubscriptionsController.js`**: 
  - Se eliminaron las referencias a `role-id` obsoletas.
  - Se actualizaron los selectores del DOM a `data-tier-id` para permitir la correcta selección visual de filas en la tabla.
  - Se actualizaron las funciones de navegación (`navigateToAddTier`, `navigateToEditTier`) para apuntar a las nuevas rutas.
- **`AdminSubscriptionBuilderController.js`**:
  - Se reemplazaron todas las variables de estado internas como `this.roleId` o `this.isSystemRole` por `this.tierId` y `this.isSystemTier`.
  - Se corrigió la lógica de inicialización en `handleViewLoaded` para que se ejecute correctamente cuando el Router carga las rutas `/admin/subscription-create` y `/admin/subscription-edit`.

## 5. Rediseño de Interfaz de Usuario (UI/UX)
- **Vista `subscription-builder.php`**:
  - Se aplicó un **rediseño total** para alinear la sección con los estándares modernos de la aplicación (similar a la vista de _Configuración de Cuenta_).
  - Se utilizaron las nuevas clases CSS base: `component-card--grouped`, `component-group-item--wrap`, `component-input-field--simple`, y `component-toggle-switch`.
  - **Layout a dos columnas (Grid)**:
    - **Columna Izquierda (Detalles y Límites):** Contiene campos para Nombre, Nivel (Numérico), IDs de Stripe (Mensual/Anual), configuración de límites (Lienzos, Almacenamiento, Miembros, Snapshots) y características especiales (Chat en vivo, Plantillas, Roles avanzados).
    - **Columna Derecha (Estilo y Diseño):** Se restauró y acomodó el módulo de diseño, el cual permite cambiar el "Tipo de Color" mediante un menú desplegable interactivo, alternando dinámicamente entre diseño de color *Sólido* y *Degradado* con todas sus opciones de bloques.

## Conclusión
El flujo completo de administración de suscripciones ("Tiers") ahora es un módulo autónomo, robusto y visualmente integrado. El sistema de Roles ha quedado simplificado, encargándose exclusivamente de **permisos estructurales** (ej. acceso al panel admin, editar usuarios), mientras que el aspecto premium (colores, bordes) recae donde pertenece: en la suscripción adquirida por el usuario.
