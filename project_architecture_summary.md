# Resumen de Arquitectura e Inventario Técnico: Project Rosaura

Este documento proporciona una visión exhaustiva de la pila tecnológica, mecanismos de autenticación, integración de servicios de terceros, almacenamiento, cobros y tratamiento de datos de la plataforma **Project Rosaura**. Su propósito es servir como insumo detallado para la redacción de términos legales (Términos de Servicio, Política de Privacidad, Política de Cookies, etc.).

---

## 1. Pila Tecnológica Core (Tech Stack)

* **Lenguaje Backend**: PHP 8.x (Arquitectura modular con Autoload PSR-4, inyección de dependencias y middlewares).
* **Frontend**: HTML5, JavaScript Vanilla (sin frameworks pesados), CSS3 personalizado (CSS moderno/responsivo).
* **Servidor Web**: Apache / Docker Nginx (configurable via `.htaccess` y `docker-compose`).
* **Control de Versiones y Dependencias**: Composer (`phpmailer`, `geoip2`, `typesense-php`, `stripe-php`, `aws-sdk-php`, `google/apiclient`, `chillerlan/php-qrcode`, `predis`).

---

## 2. Bases de Datos, Caché y Almacenamiento

* **Base de Datos Relacional (MariaDB / MySQL)**:
  * Base de datos de Identidades/Usuarios (`DB_IDENTITY_NAME`).
  * Base de datos de Lienzos/Canvases (`DB_CANVASES_NAME`).
  * Base de datos dedicada para Telemetría y Analíticas (`DB_TELEMETRY_NAME`).
* **Caché y Gestión de Sesiones**:
  * **Redis**: Manejo de sesiones persistentes en servidor (`RedisSessionHandler`), control de límite de peticiones (Rate Limiting) y almacenamiento en caché de respuestas.
* **Motor de Búsqueda**:
  * **Typesense**: Indexación rápida y búsqueda de contenido en tiempo real.
* **Almacenamiento de Archivos (Object Storage)**:
  * **Entorno de Desarrollo**: MinIO (compatible con API S3).
  * **Entorno de Producción**: AWS S3 (Amazon Simple Storage Service) para assets, imágenes y archivos multimedia.

---

## 3. Autenticación, Seguridad y Protección de Datos

* **Mecanismos de Autenticación**:
  * Registro y Autenticación local mediante usuario/correo y contraseña encriptada.
  * **Google OAuth 2.0**: Inicio de sesión único (SSO) con Google (`google/apiclient`).
  * **Autenticación de Dos Factores (2FA / TOTP)**: Integración con aplicaciones de autenticación (Google Authenticator, Authy) mediante generación de códigos QR (`chillerlan/php-qrcode`) e instructivos OTP (`GoogleAuthenticator.php`).
* **Seguridad y Anti-Bot**:
  * **Cloudflare Turnstile**: Verificación CAPTCHA invisible o interactiva para la protección contra bots en formularios de registro/login.
  * **Cloudflare CDN/DNS**: Proxy de seguridad, protección DDoS y gestión de certificados SSL/TLS.
  * **Rate Limiting**: `RedisRateLimiter` para la mitigación de ataques de fuerza bruta y abusos de API.

---

## 4. Pagos, Tienda y Suscripciones

* **Pasarela de Pagos**: **Stripe** (`stripe/stripe-php`).
  * Integración con Webhooks (`stripe/webhook.php`) para procesamiento asíncrono de eventos de pago, fallos, cancelación y renovaciones.
* **Planes y Suscripciones**:
  * Niveles de planes: `Free`, `Pro`, `Advanced`, `Ultra` (modalidades mensual y anual).
  * Paquetes de compra directa en tienda (créditos, herramientas o extensiones según `StorePackagesConfig.php`).
* **Datos Recopilados de Pago**: La plataforma procesa pagos a través de Stripe, por lo que los datos sensibles de tarjetas bancarias son manejados directamente por Stripe (cumplimiento PCI-DSS).

---

## 5. Comunicaciones y Notificaciones

* **Servicio de Correo Electrónico (SMTP)**:
  * **PHPMailer**: Envío de correos transaccionales (confirmación de cuenta, recuperación de contraseña, alertas de seguridad, recibos de compra).

---

## 6. Funcionalidades en Tiempo Real y Módulos

* **WebSockets**: Servidor dedicado en puerto `8765` para comunicación e interacción bidireccional en tiempo real (Live Chat, colaboración en vivo).
* **GeoIP**: Localización basada en IP (`geoip2/geoip2`) para analíticas, protección de seguridad y adaptación de idioma/moneda.
* **Módulos Interactivos**:
  * Lienzos / Canvases interactivos y herramientas de diseño (`moduleDesignTools.php`, `moduleSurface.php`).
  * Módulo de Timelapse / Histórico (`moduleTimelapseTools.php`).
  * Sistema de Chat en Vivo (`moduleLiveChat.php`).
  * Calendario y Opciones de usuario (`moduleCalendar.php`, `UserPrefsManager.php`).

---

## 7. Resumen de Tratamiento de Datos (Para Políticas de Privacidad y Cookies)

* **Cookies Técnicas y Necesarias**:
  * Identificador de sesión guardado en Redis (`PHPSESSID`).
  * Token de seguridad CSRF y cookies de preferencia de usuario (idioma, tema).
* **Cookies / Scripts de Terceros**:
  * Cloudflare Turnstile (seguridad anti-bot).
  * Stripe (prevención de fraude en pagos).
  * Google OAuth (sesión social).
* **Datos Personales Recopilados**:
  * Nombre, dirección de correo electrónico, contraseña hasheada.
  * Dirección IP, país/ubicación GeoIP, logs de telemetría y uso.
  * Datos de compras y estado de la suscripción (gestores vía Stripe customer ID).
