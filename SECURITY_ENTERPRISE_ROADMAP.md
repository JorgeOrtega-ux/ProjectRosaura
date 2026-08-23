# 🛡️ Hoja de Ruta de Seguridad y Auditoría Nivel Enterprise — ProjectRosaura

Este documento consolida la auditoría de seguridad realizada sobre **ProjectRosaura**, las remediaciones aplicadas y la matriz comparativa de mejoras hacia un estándar de seguridad **Nivel Enterprise (OWASP ASVS Nivel 3 / NIST SP 800-63B / Zero-Trust)**.

---

## 1. Resumen de Remediaciones Inmediatas Aplicadas

| ID | Severidad | Categoría | Componente | Descripción de la Solución |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **Media** | Criptografía / Auth | `CanvasCoreService.php` / `handlers.rs` | Eliminado el secreto JWT de respaldo hardcodeado (`default_secret`). Ahora se exige estrictamente `INTERNAL_API_SECRET` del entorno. |
| **SEC-02** | **Media** | Red / Anti-Spoofing | `Utils::isTrustedProxy` | Eliminada la regla que confiaba ciegamente en cualquier IP privada. Se implementó validación estricta contra `127.0.0.1`, `::1` y subredes CIDR en `TRUSTED_PROXIES`. |
| **SEC-03** | **Baja** | CORS | `api/index.php` | Eliminado `Access-Control-Allow-Origin: *` en preflights `OPTIONS`, validando el origen contra `APP_URL`. |
| **SEC-05** | **Informativa** | CSRF | `api/index.php` | Restringida la extracción del token CSRF en peticiones mutantes (`POST`, `PUT`, `DELETE`, `PATCH`) a cabeceras HTTP y cuerpo `POST`. |

---

## 2. Tabla Comparativa: Estado Actual vs. Nivel Enterprise

| Área / Componente | Estado Actual en tu Web | Estándar Nivel Enterprise | Beneficio / Ataque que Mitiga | Prioridad / Esfuerzo |
| :--- | :--- | :--- | :--- | :---: |
| **1. Hashing de Contraseñas** | `PASSWORD_BCRYPT` (Cost 10/12) | **`PASSWORD_ARGON2ID`** con migración transparente al vuelo | Máxima resistencia contra ataques de fuerza bruta acelerados por GPU y ASIC. | 🔴 **Alta** / 🟢 Bajo |
| **2. Fijación de Sesión** | Sesión persistente en Redis sin rotación de ID en login | **Regeneración estricta de Session ID** (`session_regenerate_id(true)`) al elevar privilegios | Previene secuestro de sesión (*Session Hijacking / Fixation*). | 🔴 **Alta** / 🟢 Bajo |
| **3. Content Security Policy (CSP)** | CSP con directiva `'unsafe-inline'` | **CSP Estricto con Nonces criptográficos** (`nonce-xxxx`) por petición | Elimina por completo vectores de Cross-Site Scripting (XSS) reflejado y almacenado. | 🔴 **Alta** / 🟡 Medio |
| **4. Algoritmo de Rate Limiting** | Ventana Fija (`INCR` + `EXPIRE` en Redis) | **Ventana Deslizante (Sliding Window Log)** con script Lua en Redis | Elimina ráfagas maliciosas en los bordes de la ventana temporal (*Boundary Bursts*). | 🟡 **Media** / 🟢 Bajo |
| **5. Segmentación de Base de Datos** | Usuario único (`system_web_executor`) con acceso a todas las BDs | **Usuarios MySQL independientes** con mínimo privilegio por base de datos | Si un módulo (ej. anuncios) se compromete, no puede leer usuarios ni finanzas. | 🔴 **Alta** / 🟡 Medio |
| **6. Cifrado de Datos PII en Reposo** | Correos, tokens y secretos 2FA en texto plano en MySQL | **Envelope Encryption (`AES-256-GCM`)** con Clave Maestra externa | En caso de volcado accidental o robo de backup, los datos personales son ilegibles. | 🟡 **Media** / 🟡 Medio |
| **7. Integridad de Recursos Externos** | Carga directa de scripts/estilos desde CDNs externos | **Subresource Integrity (SRI)** con hashes criptográficos `sha384-...` | Protege contra ataques a la cadena de suministro si hackean el CDN externo. | 🟡 **Media** / 🟢 Bajo |
| **8. Escaneo de Archivos Subidos** | Validación MIME con `finfo` y re-renderizado GD | Pipeline asíncrono con **Antivirus ClamAV** antes de publicar en S3 | Bloquea malware oculto o exploits de día cero en archivos multimedia. | 🟢 **Baja** / 🟡 Medio |
| **9. Detección de Anomalías** | Rate limit por IP y cuenta en login | **Detección de Viaje Imposible (*Impossible Travel*)** y salto anómalo de ASN | Detecta y bloquea credenciales robadas usadas simultáneamente desde otros países. | 🟡 **Media** / 🟡 Medio |
| **10. Trazabilidad y Logs** | Archivos de texto locales en `storage/private/logs/` | **Logs firmados con HMAC** y streaming a SIEM centralizado (Wazuh/ELK) | Evita que un intruso borre o altere los registros de auditoría del servidor. | 🟢 **Baja** / 🔴 Alto |
| **11. Autenticación Multifactor** | Códigos TOTP de 6 dígitos (Google Authenticator) | **Passkeys / WebAuthn (FIDO2)** con autenticación biométrica | Inmune a ataques de phishing de intermediario (Man-in-the-Middle). | 🟢 **Baja** / 🔴 Alto |

---

## 3. Plan de Implementación por Fases

### 🚀 Fase 1: Mejoras Inmediatas (Alto Impacto / Bajo Esfuerzo)
1. **Migración a `Argon2id`**:
   - En `AuthService::registerStep1` y `resetPassword`, utilizar `PASSWORD_ARGON2ID`.
   - En `AuthService::login`, verificar con `password_verify` y aplicar `password_needs_rehash($hash, PASSWORD_ARGON2ID)` para migrar hashes sobre la marcha sin pedir cambio de contraseña al usuario.
2. **Regeneración de ID de Sesión**:
   - Invocar `session_regenerate_id(true)` en `AuthService::setAuthSession` para destruir la sesión previa y reemitir una nueva en Redis.
3. **CSP con Nonces**:
   - Generar `$nonce = base64_encode(random_bytes(16))` en `bootstrap.php` e inyectarlo en la cabecera CSP y en los tags `<script nonce="...">`.

### 🛡️ Fase 2: Robustez de Red y Datos (Medio Plazo)
1. **Segmentación de Credenciales de Bases de Datos**:
   - Crear usuarios separados en MySQL para `db_identity`, `db_canvases` y `db_advertisements`.
2. **Rate Limiting con Ventana Deslizante**:
   - Migrar la implementación de `RedisRateLimiter.php` a estructuras `ZSET` con script Lua para evitar picos en límites de minuto.
3. **Cifrado de PII (AES-256-GCM)**:
   - Cifrar columnas sensibles (`two_factor_secret`, `two_factor_recovery_codes`, tokens OAuth) antes de persistir en MySQL.

### 🏢 Fase 3: Enterprise & Compliance (Largo Plazo)
1. **Pipeline ClamAV**: Escaneo antivirus asíncrono para archivos multimedia subidos.
2. **SIEM / Auditoría Centralizada**: Exportación estructurada de logs con firma HMAC hacia Wazuh o ELK.
3. **Soporte FIDO2 / Passkeys**: Integración de autenticación biométrica WebAuthn.
