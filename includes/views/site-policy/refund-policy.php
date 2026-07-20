<?php
$appName = htmlspecialchars($_ENV['APP_NAME']);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="refund-policy-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('policy_refunds_title'); ?></h1>
                <p class="policy-subtitle">Última actualización: 20 de Julio de 2026 | Versión 5.0 Enterprise Ultra-Shield Standard</p>
            </div>
        </div>
        <div class="component-bottom policy-container">

            <div class="policy-section">
                <h2 class="policy-section-title">PREÁMBULO Y ALCANCE DE LA POLÍTICA DE REEMBOLSOS</h2>
                <p class="policy-text">
                    La presente Política de Reembolsos y Cancelaciones (en adelante, la "Política de Reembolsos") rige de manera obligatoria y exclusiva las condiciones financieras, comerciales y los procedimientos aplicables a las solicitudes de devolución, reembolsos monetarios, cancelaciones de suscripciones y cancelaciones de compras realizadas en la plataforma digital **<?php echo $appName; ?>** (en adelante, la "Plataforma", la "Empresa", "Nosotros" o "Nuestro"). Este documento forma parte integrante e indisociable de nuestros Términos de Uso y es plenamente exigible a todos los usuarios (en adelante, el "Usuario" o "Usted") que contraten cualquier Plan de Suscripción pagado o adquieran créditos y productos digitales en nuestra Tienda Virtual.
                </p>
                <p class="policy-text">
                    La contratación de cualquier servicio tarifado en <?php echo $appName; ?> implica la aceptación expresa, libre e incondicional de los términos contemplados en este documento. La Plataforma opera bajo modelos de servicios digitales de ejecución inmediata, por lo que las políticas de cancelación y devolución están diseñadas para proteger la integridad operativa de la Empresa, prevenir el abuso comercial y cumplir con las normativas internacionales de procesamiento de pagos y redes de tarjetas de crédito.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">1. PRINCIPIO GENERAL DE NO REEMBOLSO EN SERVICIOS DIGITALES</h2>
                <p class="policy-text">
                    Debido a la naturaleza intangible, digital y de consumo inmediato de los servicios de Software como Servicio (SaaS), las herramientas de lienzo colaborativo en tiempo real, las funciones avanzadas y el almacenamiento en la nube prestados por <?php echo $appName; ?>, **TODOS LOS PAGOS REALIZADOS EN LA PLATAFORMA SON DEFINITIVOS, FINALES Y NO REEMBOLSABLES**, salvo en los supuestos de excepción legal expresamente contemplados en la Sección 4 de este documento.
                </p>
                <p class="policy-text">
                    Al contratar un Plan de Suscripción (Pro, Advanced, Ultra) o realizar compras en la Tienda Virtual, el Usuario reconoce y acepta que los recursos informáticos, capacidad de servidores y herramientas digitales quedan activados y puestos a su disposición de forma inmediata, considerándose el servicio plenamente ejecutado y consumido desde el momento de la confirmación del pago.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">2. GESTIÓN DE SUSCRIPCIONES Y CANCELACIÓN DE RENOVACIÓN AUTOMÁTICA</h2>
                <p class="policy-text">
                    Las suscripciones pagadas en <?php echo $appName; ?> se contratan bajo la modalidad de renovación automática periódica (mensual o anual). Al suscribirse, el Usuario autoriza a la Plataforma y a sus pasarelas de pago a realizar los cargos recurrentes automáticos al inicio de cada periodo de facturación.
                </p>
                <p class="policy-text">
                    <strong>2.1. Procedimiento de Cancelación por el Usuario:</strong> El Usuario puede cancelar la renovación automática de su suscripción en cualquier momento a través de la sección de configuración de su perfil de Cuenta. La solicitud de cancelación detendrá futuros cobros automáticos, pero **NO** generará el reembolso proporcional ni la devolución del dinero pagado por el ciclo de facturación en curso.
                </p>
                <p class="policy-text">
                    <strong>2.2. Conservación del Acceso Hasta el Término del Periodo:</strong> Tras solicitar la cancelación, el Usuario mantendrá el acceso completo a los beneficios y herramientas de su Plan pagado hasta el último día del ciclo de facturación vigente. Una vez concluido dicho periodo, la Cuenta revertirá automáticamente al nivel de servicio del Plan Free.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">3. ADQUISICIÓN DE CRÉDITOS Y PRODUCTOS EN LA TIENDA VIRTUAL</h2>
                <p class="policy-text">
                    Los créditos digitales consumibles, paquetes de utilidades y extensiones disponibles en la Tienda Virtual constituyen productos digitales de uso exclusivo dentro de <?php echo $appName; ?>. Una vez adquiridos y acreditados en la Cuenta del Usuario, dichos productos no pueden ser devueltos, reembolsados, transferidos a otras cuentas ni canjeados por dinero en efectivo bajo ninguna circunstancia.
                </p>
                <p class="policy-text">
                    En el supuesto de que el Usuario decida cerrar voluntariamente su Cuenta o su acceso sea suspendido por violaciones a los Términos de Uso, los créditos o productos no consumidos acumulados en su perfil se perderán definitivamente sin derecho a compensación económica.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">4. EXCEPCIONES LEGALES Y DERECHO DE DESISTIMIENTO</h2>
                <p class="policy-text">
                    En aquellas jurisdicciones (como la Unión Europea) donde la legislación de protección al consumidor reconozca un derecho de desistimiento obligatorio para compras a distancia, dicho derecho aplicará conforme a los plazos legales imperativos (normalmente 14 días naturales desde la compra), **SIEMPRE Y CUANDO** el Usuario no haya iniciado la ejecución, acceso o consumo del servicio digital.
                </p>
                <p class="policy-text">
                    El Usuario acepta expresamente que, al iniciar sesión, crear o modificar un Lienzo, conectar herramientas en tiempo real o consumir créditos tras la compra, está solicitando la ejecución inmediata del servicio digital y renunciando de forma explícita a su derecho de desistimiento, conforme lo autoriza la normativa aplicable en materia de servicios contenidos digitales intangibles.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">5. ERRORES DE FACTURACIÓN Y COBROS DUPLICADOS</h2>
                <p class="policy-text">
                    En caso de que el Usuario detecte una anomalia en su facturación, un cobro duplicado por error técnico del sistema o una discrepancia en el monto cobrado por la pasarela de pagos, deberá notificarlo a la Plataforma dentro de un plazo máximo de treinta (30) días naturales posteriores a la fecha del cargo.
                </p>
                <p class="policy-text">
                    Las reclamaciones deben enviarse por escrito a **billing@projectrosaura.com** acompañadas de los comprobantes de pago correspondientes. Una vez verificado el error técnico por nuestro equipo de finanzas, la Plataforma procederá a la corrección del cobro y al reembolso del saldo cobrado por error a través del mismo método de pago utilizado en la transacción original.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">6. PROTOCOLO ANTI-FRAUDE, DISPUTAS Y CONTRACARGOS BANCARIOS</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> monitorea de forma continua las transacciones para prevenir actividades de fraude con tarjetas de crédito. La iniciación de una disputa bancaria o contracargo injustificado por parte del Usuario sin previa notificación o intento de resolución amigable con la Plataforma será considerada una infracción comercial grave.
                </p>
                <p class="policy-text">
                    Ante la recepción de un contracargo o disputa fraudulenta, la Plataforma procederá al bloqueo inmediato y definitivo de la Cuenta de Usuario, la cancelación de todos los Lienzos asociados y la inclusión de los datos de pago en nuestras listas de bloqueo de seguridad. La Empresa se reserva el derecho de interponer las acciones legales pertinentes para recuperar los costos financieros y honorarios legales ocasionados por disputas infundadas.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">7. MODIFICACIONES A LA POLÍTICA DE REEMBOLSOS</h2>
                <p class="policy-text">
                    La Empresa se reserva la facultad de modificar, actualizar o adaptar la presente Política de Reembolsos en cualquier momento. Las modificaciones serán aplicables a todas las compras y suscripciones contratadas con posterioridad a la fecha de publicación del documento actualizado en el sitio web de la Plataforma.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">8. CANALES OFICIALES DE ATENCIÓN FINANCIERA Y SOPORTE</h2>
                <p class="policy-text">
                    Para cualquier consulta relacionada con pagos, suscripciones, facturación o reclamaciones de cargos, el Usuario puede ponerse en contacto con nuestro equipo de atención financiera a través de los siguientes canales:
                </p>
                <ul class="policy-list">
                    <li><strong>Correo Electrónico de Facturación:</strong> billing@projectrosaura.com</li>
                    <li><strong>Correo Electrónico Legal:</strong> legal@projectrosaura.com</li>
                    <li><strong>Centro de Políticas del Sitio:</strong> Sección de Políticas en la Plataforma (`/site-policy/refund-policy`)</li>
                </ul>
                <p class="policy-text">
                    En caso de cualquier conflicto de interpretación entre la versión oficial redactada en idioma español de esta Política y cualquiera de sus traducciones a otros idiomas, prevalecerá a todos los efectos legales la versión en español publicada en el sitio web de <?php echo $appName; ?>.
                </p>
            </div>

        </div>
    </div>
</div>