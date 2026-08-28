# Toolbar Vertical Derecha para Lienzos Offline (Ajustar Tamaño y Reinicios)

Implementar una toolbar vertical en el lado derecho del lienzo en **modo offline**, con dos opciones principales: **Ajustar Tamaño** y **Reinicios**. Ambas opciones desplegarán un modal estándar multietapa (`window.modalSystem`) que reutiliza la lógica, endpoints y estilos existentes en la plataforma, bloqueando de manera explícita las opciones programadas al encontrarse en modo offline.

---

## Decisiones Confirmadas

- **Toolbar derecha:** Ubicada verticalmente en el lado derecho del canvas, como espejo simétrico de la toolbar izquierda de herramientas offline. Solo visible cuando el lienzo está en modo offline y el usuario es propietario/administrador.
- **Tipo de interfaz:** Modales estándar integrados con `window.modalSystem` y `ModalTemplates.js` con flujo multietapa (Etapa 1: tipo de operación, Etapa 2: configuración/tamaño y confirmación).
- **Opciones programadas bloqueadas:** Tanto la **Expansión Programada** como el **Reinicio Programado** estarán visualmente deshabilitados en offline con un distintivo/badge explicativo.

---

## Flujo de Modales Multietapa

### 1. Modal "Ajustar Tamaño" (`offlineResizeModal`)

```
[Click en Toolbar Derecha: Ajustar Tamaño]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 1: Tipo de Expansión                                  │
├─────────────────────────────────────────────────────────────┤
│  • Trigger / Dropdown:                                      │
│    - [✓] Expansión rápida (Inmediata)                       │
│    - [🚫] Expansión programada (Bloqueada en offline)       │
│                                                             │
│  [Cancelar]                                   [Continuar >] │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (Al pulsar Continuar)
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 2: Selección de Tamaño                                │
├─────────────────────────────────────────────────────────────┤
│  • Selector / Dropdown de tamaños disponibles               │
│    (16x16 ... 4096x4096 según Tier del usuario)             │
│  • Alerta visual si el tamaño seleccionado es menor         │
│    (advertencia de recorte de canvas)                       │
│                                                             │
│  [< Atrás]                                  [Aplicar Tamaño]│
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Ejecuta endpoint POST `ApiRoutes.Canvases.Resize` con `{ id, size }`.
Actualiza el canvas sin salir del lienzo.
```

---

### 2. Modal "Reiniciar Lienzo" (`offlineResetModal`)

```
[Click en Toolbar Derecha: Reiniciar Lienzo]
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 1: Tipo de Reinicio                                   │
├─────────────────────────────────────────────────────────────┤
│  • Trigger / Dropdown:                                      │
│    - [✓] Reinicio inmediato                                 │
│    - [🚫] Reinicio programado (Bloqueado en offline)        │
│                                                             │
│  [Cancelar]                                   [Continuar >] │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (Al pulsar Continuar)
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 2: Opciones de Reinicio y Confirmación                │
├─────────────────────────────────────────────────────────────┤
│  • Toggle: Tomar captura/snapshot antes de reiniciar        │
│  • Mensaje de confirmación/advertencia de borrado           │
│                                                             │
│  [< Atrás]                             [Confirmar Reinicio] │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Ejecuta endpoint POST `ApiRoutes.Canvases.ResetNow` con `{ id, take_snapshot }`.
Limpia el canvas y notifica al usuario.
```

---

## Cambios Propuestos

### Componente 1: Vista PHP del Lienzo

#### [MODIFY] [design.php](./includes/views/app/design.php)
- Agregar la estructura HTML de la toolbar vertical derecha `.canvas-design-toolbar-vertical-right`:
  - Solo se renderiza si `!$isOnlineModeActive` y `$isOwner`.
  - Botón 1: `data-action="openOfflineResizeModal"` con icono `photo_size_select_large` o `aspect_ratio`.
  - Botón 2: `data-action="openOfflineResetModal"` con icono `restart_alt` o `delete_forever`.
- Añadir el atributo `data-user-tier="<?php echo (int)($userTier ?? 0); ?>"` en el wrapper si no estuviera disponible, para filtrar los tamaños según suscripción.

---

### Componente 2: Estilos CSS

#### [MODIFY] [components-canvas.css](./public/assets/css/components/components-canvas.css)
- Agregar clase `.canvas-design-toolbar-vertical-right`:
  - Posicionamiento `position: absolute; top: 50%; right: 16px; transform: translateY(-50%);`.
  - Estilo de píldora flotante oscura idéntica a `.canvas-design-toolbar-vertical`.
  - Soporte responsivo (ajuste de margen en pantallas pequeñas).
- Estilos para los pasos de modales multietapa (`.component-modal-step`, `.component-modal-step.active`, `.component-modal-step.disabled`).

---

### Componente 3: Plantillas de Modal (`ModalTemplates.js`)

#### [MODIFY] [ModalTemplates.js](./public/assets/js/core/components/ModalTemplates.js)
- Registrar `offlineResizeModal`:
  - **Paso 1:** Selector de tipo (Rápida vs Programada bloqueada con badge informativo).
  - **Paso 2:** Dropdown de tamaños filtrados por tier con iconos de `canvas_sizes.json` y alerta de reducción (`shrink warning`).
- Registrar `offlineResetModal`:
  - **Paso 1:** Selector de tipo de reinicio (Inmediato vs Programado bloqueado).
  - **Paso 2:** Switch para snapshot previo + botón de peligro de confirmación.

---

### Componente 4: Interacción y Controladores JS

#### [NEW] [InteractionOfflineWorkspace.js](./public/assets/js/modules/app/design/interactions/InteractionOfflineWorkspace.js)
- Módulo mixin para `DesignController` que gestiona:
  - `openOfflineResizeModal()`: Abre el modal multietapa de resize, maneja la navegación de pasos (1 ↔ 2), valida el tamaño seleccionado y despacha la petición `ApiRoutes.Canvases.Resize`.
  - `openOfflineResetModal()`: Abre el modal de reset, maneja pasos (1 ↔ 2) y despacha `ApiRoutes.Canvases.ResetNow`.
  - Métodos de actualización del canvas tras éxito (actualización de dimensiones en memoria y worker, o limpieza del buffer de píxeles).

#### [MODIFY] [DesignInteractions.js](./public/assets/js/modules/app/design/DesignInteractions.js)
- Importar y combinar `InteractionOfflineWorkspace` con las demás herramientas de interacción del diseño.

#### [MODIFY] [InteractionEvents.js](./public/assets/js/modules/app/design/interactions/InteractionEvents.js)
- Delegar las acciones `openOfflineResizeModal` y `openOfflineResetModal` en el dispatcher de clics.

---

## Plan de Verificación

### Verificación Manual
1. **Visibilidad de la toolbar:**
   - Abrir un lienzo propio en modo offline → La toolbar vertical derecha debe aparecer con los 2 botones.
   - Activar modo online o entrar como espectador → La toolbar derecha no debe mostrarse.
2. **Modal de Ajustar Tamaño:**
   - Pulsar botón de tamaño → Comprobar que en Etapa 1 la opción "Expansión Rápida" está seleccionable y "Expansión Programada" aparece deshabilitada con aviso.
   - Pulsar "Continuar" → Comprobar que pasa a Etapa 2 con la lista de tamaños según tier.
   - Seleccionar un tamaño mayor → Aplicar → Verificar que se llama al endpoint y el canvas se redimensiona correctamente.
   - Probar botón "Atrás" entre etapas.
3. **Modal de Reiniciar:**
   - Pulsar botón de reinicio → Comprobar bloqueo de reinicio programado en Etapa 1.
   - Avanzar a Etapa 2 → Marcar/desmarcar captura previa y confirmar reinicio → Verificar que se limpia el lienzo.
