# Refactorización y Mejora de Ventajas (Perks)

Este plan aborda los problemas de sincronización de píxeles protegidos, las mejoras en la interfaz de usuario para la ventaja "Sin Cooldown", y la refactorización de la lógica de ventajas a un archivo centralizado para que sea más escalable en el futuro.

## Open Questions
- ¿Deseas que el archivo `perks.json` se guarde en la raíz del proyecto (ej. `config/perks.json`) para que tanto PHP, Python y JS puedan acceder a él?

## Proposed Changes

### Archivo Central de Configuración

#### [NEW] `config/perks.json`
Crearemos un archivo JSON que contenga la lógica y configuración de las ventajas. Esto permitirá que tanto el backend (PHP, Python) como el frontend (JS) compartan las mismas reglas (duración, cantidad, tipo de ventaja).
Ejemplo de contenido:
```json
{
  "no_cooldown_10s": {
    "id": "no_cooldown_10s",
    "duration_seconds": 10,
    "type": "cooldown_modifier"
  },
  "pixel_protection_25": {
    "id": "pixel_protection_25",
    "duration_seconds": 86400,
    "type": "protection",
    "amount": 25
  }
}
```

### Backend (Python y PHP)

#### [MODIFY] `scripts/websocket_server.py`
- Leerá `config/perks.json` al iniciar o periódicamente para obtener la duración de las protecciones y los cooldowns.
- Cuando un píxel sea rechazado por estar protegido (`pixel_protected_error`), el servidor **también devolverá el estado del cooldown del usuario** (balance, tiempo restante). Esto solucionará el problema donde el cliente pierde su balance localmente al intentar sobrescribir un píxel protegido.

#### [MODIFY] `api/services/StoreServices.php`
- En lugar de tener las duraciones hardcodeadas en PHP (`60` segundos para cooldown y `86400` para protección), leerá el archivo `perks.json` para aplicar la duración correcta en Redis.

### Frontend (JavaScript)

#### [MODIFY] `public/assets/js/modules/app/design/DesignInteractions.js`
- Al activar `no_cooldown_10s`, en lugar de solo usar un `setTimeout`, guardaremos el timestamp de expiración (`this.perkNoCooldownExpires = Date.now() + 10000`).
- Modificaremos el badge de la izquierda para que muestre una cuenta regresiva dinámica en lugar de texto estático, de acuerdo al requisito del usuario.

#### [MODIFY] `public/assets/js/modules/app/design/DesignNetwork.js`
- En `pixel_protected_error`, además de revertir el píxel a su color original, actualizaremos el `cooldownBalance` con los datos que nos enviará el servidor para que el usuario no pierda el píxel (ya que falló la acción).
- Evitaremos el spam del mensaje "Este píxel está protegido" si el usuario intenta colocar múltiples píxeles a la vez.

#### [MODIFY] `public/assets/js/modules/app/design/DesignController.js`
- En `startCooldownLoop()`, agregaremos la lógica para actualizar en tiempo real los segundos restantes en el badge de "Sin Cooldown".
- Actualizaremos el texto del contador superior (`uiCooldownCounter`) a `∞/5` y el icono del timer (`uiCooldownTimer`) al icono `all_inclusive` cuando no haya cooldown, cumpliendo el requerimiento visual.

## Verification Plan
### Pruebas Manuales
1. **Protección de Píxel**: Proteger un píxel. Entrar con otro usuario y tratar de sobrescribirlo. Verificar que el píxel vuelva a su color original inmediatamente y que el usuario atacante no pierda un balance de su cooldown.
2. **Sin Cooldown**: Activar la ventaja "Sin Cooldown". Confirmar que el contador superior muestre el icono de infinito y `∞/5`. Confirmar que el badge inferior izquierdo muestre la cuenta regresiva en segundos (Ej: "Sin Cooldown (8s)").
3. **Escalabilidad**: Validar que Python y PHP lean correctamente `perks.json` y funcionen con esos valores dinámicos.
