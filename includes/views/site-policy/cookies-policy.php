<?php
$appName = htmlspecialchars($_ENV['APP_NAME']);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="cookies-policy-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('policy_cookies_title'); ?></h1>
                <p class="policy-subtitle">Última actualización: 20 de Julio de 2026 | Versión 5.0 Enterprise Ultra-Shield Standard</p>
            </div>
        </div>
        <div class="component-bottom policy-container">

            <div class="policy-section">
                <h2 class="policy-section-title">PREÁMBULO Y ALCANCE FORMAL DE LA POLÍTICA DE COOKIES</h2>
                <p class="policy-text">
                    La presente Política de Cookies (en adelante, la "Política de Cookies") forma parte integrante, vinculante e indisociable del cuerpo legal de la plataforma digital **<?php echo $appName; ?>** (en adelante, la "Plataforma", la "Empresa", "Nosotros" o "Nuestro"), complementando lo estipulado en nuestros Términos de Uso y en nuestra Política de Privacidad. Este documento tiene por objeto informar al usuario (en adelante, el "Usuario" o "Usted") de manera exhaustiva, transparente, rigurosa y legalmente formal sobre la naturaleza, tipología, finalidades, plazos de conservación y mecanismos de gestión de las cookies, objetos de almacenamiento local, identificadores de sesión y tecnologías de seguimiento asociadas que son instaladas o ejecutadas en su dispositivo al acceder y utilizar la Plataforma.
                </p>
                <p class="policy-text">
                    Al navegar por <?php echo $appName; ?>, registrar una Cuenta de Usuario, interactuar con los Lienzos digitales, utilizar herramientas gráficas vectoriales, conectarse a los servidores de comunicación en tiempo real o realizar transacciones en la Tienda Virtual, el Usuario manifiesta su aceptación plena y conocimiento de la instalación y uso de las cookies estrictamente necesarias, funcionales y de seguridad descritas en este documento. La Plataforma garantiza que no utiliza cookies con fines de publicidad de comportamiento de terceros ni comercializa la información técnica obtenida a través de tecnologías de seguimiento con redes publicitarias ajenas.
                </p>
                <p class="policy-text">
                    El consentimiento otorgado por el Usuario para el uso de cookies se extiende a todas las páginas web, subdominios, módulos y servicios integrados que componen el ecosistema digital de <?php echo $appName; ?>. Si el Usuario no está de acuerdo con el uso de estas tecnologías en los términos expuestos, deberá configurar adecuadamente su navegador web o abstenerse de utilizar los servicios de la Plataforma.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">1. NATURALEZA TÉCNICA Y CONCEPTO DE COOKIES Y TECNOLOGÍAS ASOCIADAS</h2>
                <p class="policy-text">
                    Las cookies son pequeños archivos de texto informáticos, identificadores alfanuméricos o fragmentos de código que los servidores web envían y almacenan en el almacenamiento local del dispositivo, navegador web, teléfono móvil o tableta del Usuario al acceder a determinadas páginas web. Estas tecnologías permiten a la Plataforma reconocer el navegador del Usuario, recordar sus preferencias de navegación, mantener activa su sesión de trabajo de forma segura, proteger los formularios contra ataques informáticos e incrementar la eficiencia operativa de los servicios interactivos prestados.
                </p>
                <p class="policy-text">
                    Junto con las cookies de texto tradicionales, <?php echo $appName; ?> emplea tecnologías modernas asociadas de almacenamiento técnico, tales como objetos de almacenamiento local en HTML5 (Local Storage y Session Storage), identificadores de sesión de red, tokens de seguridad y contadores de solicitudes de servidor. Estas tecnologías resultan fundamentales para mantener la sincronización gráfica en tiempo real dentro de los Lienzos y garantizar la autenticidad de las solicitudes enviadas por el navegador del Usuario.
                </p>
                <p class="policy-text">
                    A todos estos elementos tecnológicos de almacenamiento y seguimiento se les denominará de forma conjunta como "Cookies" a los efectos de la presente Política. El Usuario queda informado de que el uso de estas tecnologías responde a criterios de necesidad técnica, ciberseguridad, optimización del rendimiento e integridad del servicio prestado.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">2. TIPOLOGÍA, CLASIFICACIÓN DETALLADA Y FINALIDADES OPERATIVAS</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> utiliza una estructura técnica de cookies orientada exclusivamente a la operatividad, ciberseguridad, rendimiento y personalización del servicio, clasificadas en las siguientes categorías específicas:
                </p>
                <p class="policy-text">
                    <strong>2.1. Cookies Técnicas y Estrictamente Necesarias:</strong> Son aquellas indispensablemente requeridas para permitir la navegación por la Plataforma, la gestión de sesiones de usuario registradas, el acceso a zonas de administración privada, el mantenimiento del estado de autenticación de cuenta y la protección de peticiones de formulario mediante tokens de seguridad anti-CSRF. Sin estas cookies, los servicios interactivos de la Plataforma, el renderizado de lienzos vectoriales y la edición gráfica colaborativa no pueden ser suministrados de forma funcional.
                </p>
                <p class="policy-text">
                    <strong>2.2. Cookies de Ciberseguridad, Prevención de Abusos y Control Anti-Bot:</strong> Comprende aquellas cookies e identificadores de red utilizados para implementar verificaciones de ciberseguridad transparentes, prevenir la creación automatizada de cuentas por bots o scripts maliciosos, controlar la frecuencia de peticiones por segundo (Rate Limiting) y proteger los servidores de la Plataforma frente a ataques de denegación de servicio (DDoS) o accesos ilegítimos a la infraestructura.
                </p>
                <p class="policy-text">
                    <strong>2.3. Cookies de Rendimiento, Telemetría y Diagnóstico de Red:</strong> Son aquellas que recopilan información disociada sobre el uso que los Usuarios hacen de la Plataforma, métricas de latencia en servidores de sockets en tiempo real, velocidad de carga de componentes gráficos y registros de errores del sistema. Esta información se utiliza exclusivamente para analizar el rendimiento técnico, solucionar fallos en la interfaz y optimizar la infraestructura de red sin identificar personalmente al Usuario.
                </p>
                <p class="policy-text">
                    <strong>2.4. Cookies de Preferencias y Personalización Regional por IP:</strong> Permiten recordar decisiones previas del Usuario, tales como el idioma seleccionado de la interfaz, el tema visual aplicado y los parámetros de moneda regional asignados automáticamente en función de la geolocalización por dirección IP.
                </p>
                <p class="policy-text">
                    <strong>2.5. Cookies Funcionales de Terceros Proveedores Integrados:</strong> Corresponden a cookies gestionadas por proveedores externos autorizados cuyas herramientas se encuentran integradas en la Plataforma, incluyendo pasarelas de pago seguras de terceros (necesarias para el procesamiento de transacciones bajo el estándar PCI-DSS), proveedores de autenticación federada (SSO) y servicios de geolocalización.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">3. DECLARACIÓN CATEGÓRICA DE AUSENCIA DE COOKIES PUBLICITARIAS</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> ratifica de manera categórica que **NO** utiliza cookies de publicidad comportamental, cookies de perfilado comercial, píxeles de seguimiento publicitario ni redes de rastreo de terceros orientadas al envío de anuncios personalizados. La Plataforma es un entorno de creación gráfica profesional libre de publicidad de terceros, por lo que las cookies empleadas responden única y exclusivamente a necesidades técnicas, de seguridad y de funcionamiento del software.
                </p>
                <p class="policy-text">
                    La Empresa asume el compromiso explícito de no vender, alquilar, ceder ni compartir los datos recopilados por las cookies técnicas con corredores de datos (data brokers), agencias de marketing o redes publicitarias externas, garantizando que el uso de estas tecnologías permanezca confinado al ámbito estrictamente operativo del servicio.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">4. PLAZOS DE PERMANENCIA Y CADUCIDAD DE LAS COOKIES</h2>
                <p class="policy-text">
                    Atendiendo a su plazo de permanencia y caducidad en el dispositivo del Usuario, las cookies utilizadas por la Plataforma se dividen en las siguientes dos categorías temporales:
                </p>
                <p class="policy-text">
                    <strong>4.1. Cookies Temporales o de Sesión:</strong> Son cookies diseñadas para recabar y almacenar datos únicamente mientras el Usuario navega por la Plataforma o mantiene abierta su sesión de trabajo. Estas cookies se eliminan automáticamente del dispositivo al cerrar el navegador web o al cerrar la sesión de la Cuenta.
                </p>
                <p class="policy-text">
                    <strong>4.2. Cookies Persistentes de Almacenamiento Local:</strong> Son cookies que permanecen almacenadas en el dispositivo del Usuario durante un periodo de tiempo determinado (que puede variar desde minutos hasta varios meses), permitiendo a la Plataforma recordar sus preferencias, mantener la verificación de ciberseguridad o reconocer su dispositivo en futuras visitas.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">5. GESTIÓN, DESACTIVACIÓN Y ADVERTENCIA DE IMPACTO TÉCNICO</h2>
                <p class="policy-text">
                    El Usuario tiene el derecho inalienable de configurar, bloquear o eliminar en cualquier momento las cookies instaladas en su dispositivo mediante la modificación de los parámetros de configuración del navegador web que utilice (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge).
                </p>
                <p class="policy-text">
                    <strong>Advertencia Técnica Formal de Impacto:</strong> El Usuario debe tener en cuenta que el bloqueo o la eliminación total de las cookies técnicas y estrictamente necesarias provocará el mal funcionamiento de la Plataforma, imposibilitando el inicio de sesión en su Cuenta de Usuario, bloqueando la sincronización en tiempo real de los Lienzos digitales, generando errores en el procesamiento de pagos o activando bloqueos automáticos de seguridad anti-CSRF.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">6. DESLINDE DE RESPONSABILIDAD RESPECTO A TERCEROS INTEGRADOS</h2>
                <p class="policy-text">
                    La Plataforma integra herramientas de proveedores externos autorizados (tales como pasarelas de pago externas, proveedores de inicio de sesión SSO y servicios de geolocalización). Dichas entidades operan sus propias cookies bajo sus respectivas políticas de privacidad y cookies. <?php echo $appName; ?> no ejerce un control directo sobre los mecanismos de seguimiento de dichos terceros ni asume responsabilidad por las prácticas de privacidad adoptadas por los mismos.
                </p>
                <p class="policy-text">
                    Se recomienda al Usuario consultar las políticas de privacidad y cookies de dichos terceros proveedores al momento de utilizar las funcionalidades integradas correspondientes.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">7. MODIFICACIONES Y ACTUALIZACIÓN DE LA POLÍTICA DE COOKIES</h2>
                <p class="policy-text">
                    La Empresa se reserva el derecho de modificar, actualizar o reemplazar en cualquier momento la presente Política de Cookies con el fin de adaptarla a novedades técnicas, actualizaciones en el servicio o cambios en la legislación aplicable.
                </p>
                <p class="policy-text">
                    Cualquier modificación sustancial será comunicada formalmente a los Usuarios a través del sitio web o vía correo electrónico con al menos quince (15) días de antelación a su entrada en vigor. El uso continuado de la Plataforma tras la entrada en vigor de los cambios constituirá la aceptación completa de la Política de Cookies actualizada.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">8. CANALES OFICIALES DE ATENCIÓN Y CONSULTAS DE PRIVACIDAD</h2>
                <p class="policy-text">
                    Si el Usuario tiene dudas, consultas o comentarios respecto al uso de cookies en nuestra Plataforma, puede ponerse en contacto con nuestro Departamento de Privacidad a través de la dirección de correo electrónico **privacy@projectrosaura.com** o mediante la sección de soporte del sitio (`/site-policy/cookies-policy`).
                </p>
                <p class="policy-text">
                    En caso de cualquier discrepancia entre la versión oficial redactada en idioma español de esta Política y cualquiera de sus traducciones, prevalecerá a todos los efectos legales la versión en español publicada en el sitio web de <?php echo $appName; ?>.
                </p>
            </div>

        </div>
    </div>
</div>