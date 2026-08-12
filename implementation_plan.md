# Sistema Centralizado de Invalidación de Caché

## Contexto y Problema

El proyecto usa Redis como sistema de caché en toda la aplicación. Actualmente las claves de caché están **parcialmente centralizadas** en `CacheConstants.php`, pero la **invalidación** está dispersa, inconsistente y tiene huecos reales donde datos se modifican pero el caché no se invalida.

---

## 🔍 Diagnóstico: Problemas Encontrados

### 1. Claves Hardcodeadas que No Están en `CacheConstants`

Hay claves de caché escritas como strings literales en el código que **no tienen constante**:

| Clave Hardcodeada | Archivo | Línea |
|---|---|---|
| `"canvas:{$canvasId}:meta:u:{$userId}"` | `CanvasRepository.php` (delete) / `CanvasCoreService.php` (write) | L64 / L210 |
| `"canvas_weight:u{$userId}:c{$canvasId}"` | `CanvasRepository.php` | L66, L1578 |
| `"auth:token:" . md5($selector)` | `TokenRepository.php` | múltiples líneas |
| `"vercode:id:{$id}"` | `RedisVerificationCodeRepository.php` | L37, L55, L93 |
| `"vercode:ident:{$identifier}:{$codeType}"` | `RedisVerificationCodeRepository.php` | L38, L50 |
| `"vercode:code:{$code}:{$codeType}"` | `RedisVerificationCodeRepository.php` | L39, L69 |
| `"user:perks:all:{$userId}"` | `StoreRepository.php` | múltiples líneas |
| `"user:perks:unused:{$userId}"` | `StoreRepository.php` | múltiples líneas |

### 2. Acciones que Modifican Datos Sin Invalidar el Caché

| Método | Datos Modificados | Caché No Invalidado |
|---|---|---|
| `UserRepository::deleteUserHard()` | Elimina el usuario completo | `PREFIX_USER_PROFILE`, `PREFIX_USER_ROLES`, `PREFIX_USER_PERMS`, etc. |
| `SubscriptionRepository::updateUserStripeCustomerId()` | `stripe_customer_id` en `users` | Ninguno |
| `SubscriptionRepository::createSubscription()` | INSERT en `subscriptions` | `PREFIX_USER_SUBSCRIPTION` no se invalida |
| `StoreRepository` (múltiples ops de perks) | Modifica perks | Solo invalida `all:{userId}` y `unused:{userId}` — si el subkey cambia, se rompe |

### 3. Invalidación Incompleta del Dashboard de Canvases

En `CanvasRepository::invalidateUserCanvasListCaches()`, se invalida:
- `PREFIX_CANVAS_DASHBOARD . "u{$userId}:{$filter}:20:0"` ✅

Pero se **omite** borrar páginas distintas a `limit=20, offset=0`. Si el usuario tiene más páginas cacheadas con `limit=50` u otros offsets, siguen sucias.

En `invalidateMemberCache()` sí se borran tanto el de 20 como 50, pero en `invalidateUserCanvasListCaches()` **falta** el de `limit=50`.

### 4. Invalidaciones Duplicadas en Múltiples Repos

`PREFIX_USER_PROFILE` se borra desde 5 lugares distintos:
- `UserRepository` (via `invalidateProfileCache`)
- `StoreRepository` (directamente en 4 métodos)
- `SubscriptionRepository` (en `updateUserTier`)
- `StripeServices.php` (3 lugares)
- `StripeWebhookController.php`

Esto es un síntoma de que no hay una **sola fuente de verdad** sobre "¿qué debo invalidar cuando cambia el perfil de usuario?".

### 5. El `StripeServices.php` Invalida Caché Directamente

Los servicios de Stripe hacen `$redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $userId)` sin pasar por `UserRepository::invalidateProfileCache()`, lo que significa que **si se agrega una clave nueva al perfil, hay que recordar actualizarla en Stripe también**.

### 6. Subkeys con Strings Concatenados Directamente

Los perks usan `PREFIX_USER_PERKS . "all:{$userId}"` en lugar de una constante/método que construya la clave. Si el formato cambia en un lugar, los otros quedan rotos.

---

## Solución Propuesta: `CacheInvalidator` Centralizado

La idea es crear una clase **`CacheInvalidator`** en `includes/core/System/` que actúe como directorio central de invalidaciones. Cada "tipo de entidad" tiene su propio método de invalidación que sabe exactamente qué claves eliminar.

### Arquitectura

```
includes/core/System/
├── CacheConstants.php      (ya existe — agregar constantes faltantes)
└── CacheInvalidator.php    (NUEVO — métodos de invalidación por entidad)
```

### Qué hace `CacheInvalidator`

- Recibe el cliente Redis en el constructor
- Expone métodos estáticos/instancia por "grupo de entidad":
  - `invalidateUser(int $userId, ?string $uuid)` — perfil, roles, perms, storage
  - `invalidateUserPerks(int $userId)` — all y unused
  - `invalidateCanvas(int $canvasId)` — detalle, páginas públicas
  - `invalidateUserCanvasList(int $userId)` — counts, dashboard (todos los limits)
  - `invalidateCanvasMember(int $canvasId, int $userId)` — member roles, weight, meta, permisos
  - `invalidateSubscription(int $userId)` — subscription cache
  - `invalidateServerConfig()` — server config

- Todos los repos y servicios llaman a `CacheInvalidator` en lugar de hacer `del()` directamente.

---

## Propuesta de Cambios

### Fase 1 — `CacheConstants.php`: Agregar constantes faltantes

#### [MODIFY] [CacheConstants.php](file:///f:/htdocs/ProjectRosaura/includes/core/System/CacheConstants.php)

Agregar:
```php
public const PREFIX_CANVAS_META         = 'canvas:meta:u:';  // canvas:{canvasId}:meta:u:{userId}
public const PREFIX_CANVAS_WEIGHT       = 'canvas_weight:u'; // canvas_weight:u{userId}:c{canvasId}
public const PREFIX_AUTH_TOKEN          = 'auth:token:';
public const PREFIX_VERCODE_ID          = 'vercode:id:';
public const PREFIX_VERCODE_IDENT       = 'vercode:ident:';
public const PREFIX_VERCODE_CODE        = 'vercode:code:';
public const SUBKEY_PERKS_ALL           = 'all:';
public const SUBKEY_PERKS_UNUSED        = 'unused:';
```

---

### Fase 2 — Crear `CacheInvalidator.php`

#### [NEW] [CacheInvalidator.php](file:///f:/htdocs/ProjectRosaura/includes/core/System/CacheInvalidator.php)

```php
class CacheInvalidator {
    private $redis;
    
    public function __construct($redis) { $this->redis = $redis; }
    
    public function user(int $userId, ?string $uuid = null, ?string $lookupUuid = null): void
    public function userPerks(int $userId): void
    public function userSubscription(int $userId): void
    public function canvas(int $canvasId): void
    public function userCanvasList(int $userId): void
    public function canvasMember(int $canvasId, int $userId): void
    public function serverConfig(): void
}
```

Cada método sabe exactamente qué claves borrar. Un solo lugar de verdad.

---

### Fase 3 — Refactorizar repositorios para usar `CacheInvalidator`

#### [MODIFY] [UserRepository.php](file:///f:/htdocs/ProjectRosaura/includes/core/Repositories/UserRepository.php)

- Reemplazar `invalidateProfileCache()` por llamada a `$this->cacheInvalidator->user()`
- Agregar invalidación en `deleteUserHard()`

#### [MODIFY] [CanvasRepository.php](file:///f:/htdocs/ProjectRosaura/includes/core/Repositories/CanvasRepository.php)

- Reemplazar los 3 métodos privados `invalidateCanvasCache()`, `invalidateUserCanvasListCaches()`, `invalidateMemberCache()` por llamadas a `CacheInvalidator`
- Corregir: agregar `limit=50` faltante en `invalidateUserCanvasListCaches()`
- Agregar constantes para `canvas:meta:u:` y `canvas_weight:u`

#### [MODIFY] [SubscriptionRepository.php](file:///f:/htdocs/ProjectRosaura/includes/core/Repositories/SubscriptionRepository.php)

- `createSubscription()`: agregar invalidación de `PREFIX_USER_SUBSCRIPTION`
- `updateUserStripeCustomerId()`: agregar invalidación de perfil
- Usar `CacheInvalidator`

#### [MODIFY] [StoreRepository.php](file:///f:/htdocs/ProjectRosaura/includes/core/Repositories/StoreRepository.php)

- Usar `CacheInvalidator::userPerks()` en lugar de las 6+ llamadas `del()` directas

#### [MODIFY] [StripeServices.php](file:///f:/htdocs/ProjectRosaura/includes/core/Repositories/StripeServices.php) + [StripeWebhookController.php](file:///f:/htdocs/ProjectRosaura/api/controllers/Stripe/StripeWebhookController.php)

- Usar `CacheInvalidator::user()` en lugar de `del(PREFIX_USER_PROFILE)`

---

## Plan de Verificación

### Claves antes/después

| Escenario | Antes | Después |
|---|---|---|
| Se crea nueva suscripción (Stripe) | ❌ subscription cache queda activo | ✅ Se invalida |
| Se actualiza stripe_customer_id | ❌ No se invalida nada | ✅ Perfil se invalida |
| Canvas list con limit=50 | ❌ Solo se borra el de limit=20 | ✅ Ambos se borran |

### Manual
- Cambiar username → revisar que el perfil se refleja inmediatamente
- Crear canvas → revisar que el dashboard y el conteo se actualizan
- Cancelar suscripción (webhook Stripe) → verificar que el tier cambia en la UI

---

## Preguntas Abiertas

> [!IMPORTANT]
> **¿Inyectamos `CacheInvalidator` vía el Container o lo pasamos como dependencia directa a cada repo?**
> La opción más limpia es registrarlo en el `Container.php` y pasarlo como dependencia a los repos. Confirma si esto es lo que quieres o prefieres un patrón singleton.

> [!NOTE]
> **`TokenRepository` y `RedisVerificationCodeRepository`** son casos especiales: sus claves Redis son su mecanismo de persistencia primario (no solo caché), así que no las moveremos a `CacheInvalidator` pero sí agregaremos sus prefijos a `CacheConstants`.
