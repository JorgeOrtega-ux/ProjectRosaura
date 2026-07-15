# Soft-Delete de Mensajes de Chat con Estados de Visibilidad

## Descripción

Cambiar el sistema de eliminación de mensajes de chat de un DELETE físico a un sistema de estados de visibilidad. Los mensajes nunca se borrarán de la BD — solo cambiará su estado.

## Estados

| Estado | Valor BD | Comportamiento en el chat |
|---|---|---|
| **Visible** | `visible` | Se muestra el mensaje normalmente |
| **En revisión** | `under_review` | Se oculta el contenido. Muestra: *"Este mensaje se encuentra en revisión"* |
| **Eliminado** | `deleted` | Se oculta el contenido. Muestra: *"Este mensaje fue eliminado"* |

## Cambios Propuestos

### Base de Datos

#### [MODIFY] tabla `canvas_chat_messages`

Agregar columna `visibility` con valor default `visible`. Migración automática en el método `history()`.

```sql
ALTER TABLE canvas_chat_messages 
ADD COLUMN visibility ENUM('visible', 'under_review', 'deleted') 
NOT NULL DEFAULT 'visible';
```

---

### Backend

#### [MODIFY] [ChatServices.php](file:///f:/htdocs/ProjectRosaura/api/services/Chat/ChatServices.php)

**`delete()`** (línea 282):
- Cambiar `DELETE FROM` → `UPDATE SET visibility = 'deleted'`
- Ya no decrementar storage (los archivos siguen existiendo)
- Cambiar el evento WS de `chat_message_deleted` → `chat_message_status_changed` con el nuevo estado

**`history()`** (línea 46):
- Incluir la columna `visibility` en el SELECT
- Los mensajes con `visibility != 'visible'` se enviarán sin `message` ni `attachments`, solo con el `visibility` status

> [!NOTE]
> No se elimina storage al marcar como eliminado porque los archivos siguen en S3. Esto permite a los admins revisar contenido reportado en el futuro si se necesita.

---

### Frontend

#### [MODIFY] [DesignChat.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignChat.js)

**`createMessageElement()`** (línea 642):
- Si `msg.visibility === 'deleted'` → renderizar un bubble especial con icono y texto de "mensaje eliminado"
- Si `msg.visibility === 'under_review'` → renderizar un bubble especial con icono y texto de "en revisión"
- En ambos casos: no mostrar contenido, no mostrar attachments, no mostrar menú de acciones

**`deleteMessage()`** (línea 514):
- En vez de `removeMessageElement()`, reemplazar el elemento existente con la versión "eliminado"

**`removeMessageElement()`** → renombrar a `updateMessageStatus()`
- En lugar de eliminar el DOM element, reemplazarlo con el bubble de estado

**Evento WS** `canvas:chat_message_deleted`:
- Renombrar a `canvas:chat_message_status_changed`
- Actualizar el handler para reemplazar el mensaje en vez de eliminarlo

#### [MODIFY] [DesignNetwork.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/DesignNetwork.js)

- Actualizar el dispatch del evento para usar el nuevo nombre

---

### Open Questions

> [!IMPORTANT]
> **¿Los moderadores también deberían poder eliminar mensajes?** Actualmente solo el autor puede eliminar. Si es así, necesitaríamos que moderadores puedan poner mensajes en `under_review` y `deleted`.

## Verificación

### Manual
- Enviar mensaje → verificar que se muestra normal
- Eliminar un mensaje propio → verificar que muestra "Este mensaje fue eliminado" para todos los usuarios
- Verificar que en la BD el registro sigue existiendo con `visibility = 'deleted'`
- Verificar que el evento WS actualiza el mensaje en tiempo real para otros usuarios
