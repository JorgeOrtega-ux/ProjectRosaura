<?php
$appName = htmlspecialchars($_ENV['APP_NAME']);
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="terms-conditions-wrapper">
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('policy_terms_title'); ?></h1>
                <p class="policy-subtitle">Última actualización: 20 de Julio de 2026 | Versión 5.0 Enterprise Ultra-Shield Standard</p>
            </div>
        </div>
        <div class="component-bottom policy-container">

            <div class="policy-section">
                <h2 class="policy-section-title">PREÁMBULO Y ACEPTACIÓN DE LOS TÉRMINOS</h2>
                <p class="policy-text">
                    El presente documento constituye un contrato legalmente vinculante, integral, ejecutable y de obligatorio cumplimiento (en adelante, los "Términos de Uso" o el "Contrato") suscrito y celebrado entre el usuario final (en adelante, el "Usuario", "Usted" o el "Licenciatario") y la plataforma digital **<?php echo $appName; ?>** (en adelante, la "Plataforma", la "Empresa", "Nosotros" o "Nuestro"). Este acuerdo regula de manera exhaustiva y detallada las condiciones jurídicas, operativas y técnicas bajo las cuales el Usuario está autorizado a acceder, navegar, registrarse, interactuar en tiempo real con lienzos digitales, utilizar herramientas gráficas vectoriales y de composición, conectarse a la infraestructura de comunicación síncrona, consumir servicios de almacenamiento distribuido en la nube, procesar pagos y utilizar cualquiera de las interfaces, aplicaciones o APIs expuestas por <?php echo $appName; ?>. Al realizar cualquier acto de interacción, navegación o uso de la Plataforma, el Usuario manifiesta su conformidad absoluta, libre, informada y sin reservas con el texto completo de este Contrato, así como con la Política de Privacidad, Política de Cookies y Política de Reembolsos integradas formalmente al mismo.
                </p>
                <p class="policy-text">
                    La aceptación del presente Contrato se perfecciona desde el preciso instante en que el Usuario accede a cualquier página, dirección URL, subdominio o servicio de <?php echo $appName; ?>, o bien al hacer clic en las casillas de verificación de aceptación durante el procedimiento de registro de cuenta. Esta manifestación de voluntad digital posee la misma validez y eficacia jurídica que una firma autógrafa prestada por escrito. En consecuencia, el Usuario declara que ha leído con detenimiento cada una de las cláusulas aquí contenidas, que comprende su alcance legal y que acepta someterse incondicionalmente a los derechos, obligaciones, limitaciones y exenciones de responsabilidad fijados en este instrumento contractual.
                </p>
                <p class="policy-text">
                    Si el Usuario no está de acuerdo con la totalidad de los términos, condiciones, restricciones o salvaguardas legales estipuladas en el presente documento, o bien carece de la capacidad jurídica exigida por la legislación aplicable en su país de residencia para obligarse contractualmente, deberá abstenerse de manera inmediata, definitiva e incondicional de acceder, navegar, registrar una cuenta o hacer uso de cualquier componente digital de <?php echo $appName; ?>. La continuación en el uso del sitio o sus servicios se interpretará indiscutiblemente como una ratificación voluntaria, plena y formal de todas las disposiciones contenidas en este documento regulatorio.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">1. DEFINICIONES OPERATIVAS Y MARCO CONCEPTUAL</h2>
                <p class="policy-text">
                    A los efectos de garantizar una interpretación unívoca, transparente y formal de las obligaciones asumidas por las partes en el marco del presente Contrato, se establece que los términos definidos a continuación mantendrán el significado que expresamente se les atribuye en esta sección, con independencia de que aparezcan redactados en formato singular o plural dentro de la estructura documental de la Plataforma.
                </p>
                <p class="policy-text">
                    <strong>1.1. La Plataforma, Lienzos Digitales y Servicios en Tiempo Real:</strong> La expresión "La Plataforma" o "<?php echo $appName; ?>" comprende la totalidad del entorno web interactivo, aplicaciones, interfaces de diseño gráfico, herramientas de superficie, sistemas informáticos y redes de comunicación dedicadas a la creación digital colaborativa. Por su parte, el término "Lienzo" o "Canvas" hace referencia al espacio virtual bidimensional dispuesto en la interfaz del cliente donde los Usuarios crean, editan, dibujan, componen elementos gráficos vectoriales, superponen capas y colaboran en tiempo real con otros usuarios conectados. Los "Servicios en Tiempo Real" identifican la infraestructura de red bidireccional basada en sockets que permite la sincronización instantánea de trazos y mensajería en vivo. Asimismo, el "Módulo Timelapse" identifica la herramienta integrada que graba y reproduce la secuencia cronológica de trazos y modificaciones realizadas en un Lienzo.
                </p>
                <p class="policy-text">
                    <strong>1.2. Usuarios, Cuentas, Contenido e Infraestructura de Terceros:</strong> El "Usuario" representa a cualquier persona física que haya alcanzado la mayoría de edad o a la entidad corporativa representada por un individuo facultado, que accede o utiliza la Plataforma. La "Cuenta de Usuario" constituye el registro digital único, seguro e intransferible que vincula las credenciales de acceso del Usuario con su perfil, sus lienzos privados, su historial de transacciones en la Tienda Virtual y su nivel de acceso dentro de los Planes de Suscripción vigentes (Free, Pro, Advanced y Ultra). El "Contenido del Usuario" abarca todas las ilustraciones, gráficos, vectores, composiciones visuales, archivos multimedia, textos e historiales transmitidos o guardados en la Plataforma. Finalmente, los "Proveedores e Infraestructura de Terceros" corresponden a aquellas entidades externas integradas que proveen procesamiento de pagos, almacenamiento distribuido en la nube, servicios de geolocalización, autenticación federada y ciberseguridad anti-bot.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">2. ELEGIBILIDAD, REGISTRO Y SEGURIDAD DE LA CUENTA</h2>
                <p class="policy-text">
                    El acceso a las características principales de <?php echo $appName; ?> exige la creación de una Cuenta de Usuario y la verificación de los requisitos de elegibilidad básicos de carácter legal y técnico. La Plataforma está diseñada de forma exclusiva para ser utilizada por personas con plena capacidad de ejercicio contractual conforme a la legislación aplicable en su jurisdicción, comprometiéndose el Usuario a suministrar información exacta, veraz, actualizada y completa durante todo el procedimiento de registro y mantenimiento de su perfil.
                </p>
                <p class="policy-text">
                    <strong>2.1. Requisitos de Mayoría de Edad, Capacidad Legal y Representación Institucional:</strong> El uso de la Plataforma está reservado a personas físicas que cuenten con al menos 18 años cumplidos al momento del registro (o la mayoría de edad legal superior que rija en su territorio). En el supuesto de que el registro sea llevado a cabo por un individuo en nombre y representación de una empresa, sociedad comercial, asociación u organización gubernamental, dicho individuo declara y garantiza de manera irrevocable bajo protesta de decir verdad que posee los poderes legales de representación suficientes y vigentes para obligar a su representada bajo las estipulaciones de estos Términos de Uso, asumiendo dicha entidad la responsabilidad legal solidaria por todas las operaciones realizadas bajo su cuenta.
                </p>
                <p class="policy-text">
                    <strong>2.2. Autenticación de Credenciales, Cifrado Industrial y Acceso Federado:</strong> Para la modalidad de registro directo, el Usuario deberá proporcionar una dirección de correo electrónico válida y establecer una contraseña robusta, la cual será procesada mediante algoritmos de cifrado y hash criptográfico irreversible de grado industrial para salvaguardar su confidencialidad en los servidores de la Plataforma, garantizando que las contraseñas en texto plano nunca sean almacenadas. Asimismo, la Plataforma permite la opción de autenticación federada a través de proveedores de identidad de terceros reconocidos, autorizando el Usuario el intercambio de datos básicos de perfil estrictamente necesarios para la validación de su sesión en conformidad con nuestra Política de Privacidad.
                </p>
                <p class="policy-text">
                    <strong>2.3. Autenticación Multifactores (2FA/TOTP), Custodia de Acceso y Medidas Anti-Abuso:</strong> El Usuario podrá habilitar voluntariamente mecanismos de Autenticación de Dos Factores (2FA / TOTP) basados en contraseñas temporales de un solo uso para incrementar la seguridad de su Cuenta, asumiendo la responsabilidad exclusiva de custodiar sus dispositivos autenticadores y claves de recuperación. El Usuario es el único responsable de mantener la confidencialidad de sus credenciales, presumiéndose que todas las actividades realizadas desde su Cuenta han sido autorizadas por él. Con el fin de evitar registros automatizados por software malicioso o ataques a la red, la Plataforma implementa comprobaciones anti-bot transparentes y controles de frecuencia de peticiones por segundo, constituyendo cualquier intento de eludir estos mecanismos una violación grave que facultará el cierre inmediato de la Cuenta.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">3. PROPIEDAD INTELECTUAL, DERECHOS DE AUTOR Y LICENCIAS DE USO</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> promueve el respeto irrestricto a la propiedad intelectual y los derechos de autor, estableciendo una clara distinción entre la titularidad de los componentes tecnológicos que integran la Plataforma y la propiedad exclusiva de los contenidos artísticos y gráficos creados libremente por los Usuarios dentro de los Lienzos digitales.
                </p>
                <p class="policy-text">
                    <strong>3.1. Titularidad Exclusiva de la Plataforma e Infraestructura:</strong> Todos los derechos de propiedad intelectual, industrial, derechos de autor, secretos comerciales, patentes, marcas registradas, logotipos, nombres de dominio, arquitectura de software, diseños de interfaz, motores de búsqueda interna, componentes de comunicación en tiempo real y código fuente que componen <?php echo $appName; ?> son de la titularidad única y exclusiva de la Empresa o de sus respectivos licenciantes, estando protegidos por la legislación nacional e internacional en la materia. Queda prohibida la reproducción, modificación, distribución o creación de obras derivadas basadas en la Plataforma sin autorización escrita.
                </p>
                <p class="policy-text">
                    <strong>3.2. Dominio Intacto y Derechos de Autor del Usuario sobre su Contenido:</strong> El Usuario conserva la propiedad absoluta, titularidad patrimonial y moral de todos los derechos de autor sobre las ilustraciones, composiciones vectoriales, diseños, trazos y obras originales que elabore o cargue en los Lienzos de la Plataforma. Ninguna disposición de este Contrato se interpretará como una venta, cesión o transferencia de la propiedad intelectual del Usuario a favor de <?php echo $appName; ?>, manteniendo el creador el control pleno sobre la comercialización y explotación de sus obras.
                </p>
                <p class="policy-text">
                    <strong>3.3. Licencia Operativa para la Plataforma y Regulación del Módulo Timelapse:</strong> Para posibilitar la operación técnica del servicio, el alojamiento distribuido y la visualización interactiva, el Usuario otorga a la Plataforma una licencia global, no exclusiva, exenta de regalías y sublicenciable a proveedores de infraestructura, con el fin único de almacenar, respaldar, procesar, renderizar y transmitir su Contenido dentro del sitio. Asimismo, respecto al Módulo Timelapse, el Usuario autoriza el registro automatizado de la secuencia de trazos de sus Lienzos para la generación de historiales en video, los cuales mantendrán el mismo nivel de privacidad (público o privado) asignado al Lienzo de origen.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">4. PLANES DE SUSCRIPCIÓN, TIENDA Y CONDICIONES COMERCIALES</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> comercializa el acceso a sus herramientas avanzadas y capacidades de infraestructura bajo el modelo de Software como Servicio (SaaS), estructurando su oferta en diferentes niveles de planes y disponiendo de una Tienda Virtual para la adquisición de complementos y bienes digitales consumibles.
                </p>
                <p class="policy-text">
                    <strong>4.1. Planes de Suscripción SaaS, Niveles de Servicio y Renovación Automática:</strong> La Plataforma pone a disposición del Usuario planes de suscripción denominados Free, Pro, Advanced y Ultra, cuyas tarifas, cuotas de almacenamiento en la nube, límites de concurrencia en tiempo real y herramientas avanzadas se especifican en el catálogo comercial del sitio. Las suscripciones de pago se ofrecen bajo modalidades de facturación periódica mensual o anual, cobrándose de forma adelantada al inicio de cada ciclo de servicio contratado. Las suscripciones se renovarán de forma automática al término de cada ciclo a menos que el Usuario solicite la cancelación previa a la fecha de renovación.
                </p>
                <p class="policy-text">
                    <strong>4.2. Tienda Virtual, Créditos Consumibles y Procesamiento Seguro PCI-DSS:</strong> Adicionalmente a las suscripciones periódicas, los Usuarios pueden adquirir créditos digitales consumibles o paquetes de utilidades dentro de la Tienda Virtual de la Plataforma. Dichos créditos constituyen licencias de uso digital de carácter consumible, intransferibles entre cuentas, no canjeables por dinero en efectivo y desprovistas de valor monetario fuera del ecosistema cerrado de <?php echo $appName; ?>. Todas las transacciones monetarias y cobros recurrentes se procesan utilizando pasarelas de pago externas que operan bajo los más estrictos estándares de seguridad bancaria e infraestructura PCI-DSS, no almacenando la Plataforma datos de tarjetas bancarias.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">5. POLÍTICA DE CANCELACIONES, SUSPENSIÓN Y REEMBOLSOS</h2>
                <p class="policy-text">
                    El Usuario cuenta con la libertad de gestionar el estado de su suscripción en todo momento a través de su panel de configuración de perfil. La cancelación de una suscripción de pago detendrá los cargos automáticos del siguiente ciclo de facturación, conservando el Usuario el acceso a los beneficios de su Plan contratado hasta el último día del periodo de facturación en curso, momento en el cual su Cuenta revertirá automáticamente al nivel de servicio del Plan Free, sujeto a las restricciones de almacenamiento y funciones de dicho nivel.
                </p>
                <p class="policy-text">
                    Salvo que las leyes de protección al consumidor de aplicación imperativa en el país de residencia del Usuario establezcan un derecho de desistimiento obligatorio no renunciable, todos los pagos realizados por concepto de suscripciones mensuales o anuales, paquetes de la Tienda Virtual o créditos digitales son finales, definitivos y no reembolsables. No se otorgarán reembolsos parciales o prorrateados por periodos de suscripción no consumidos, ni por créditos o herramientas adquiridas y no utilizadas por el Usuario.
                </p>
                <p class="policy-text">
                    <?php echo $appName; ?> se reserva la facultad de suspender temporalmente el acceso o rescindir definitivamente la Cuenta de un Usuario, restringir su conexión a los servidores en tiempo real o bloquear sus direcciones IP registradas de forma inmediata y sin previo aviso en casos de incumplimiento grave de estos Términos, sospechas de fraude en pagos, contracargos bancarios injustificados o requerimientos emitidos por autoridades judiciales o administrativas competentes.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">6. SERVICIOS EN TIEMPO REAL, COLABORACIÓN Y REGLAS DE COMUNIDAD</h2>
                <p class="policy-text">
                    La Plataforma dispone de capacidades avanzadas de comunicación e interactividad síncrona en tiempo real a través de servidores dedicados de sockets de red, permitiendo a los Usuarios colaborar simultáneamente en Lienzos compartidos y comunicarse mediante el sistema de Chat en Vivo.
                </p>
                <p class="policy-text">
                    <strong>6.1. Infraestructura de Comunicación Síncrona y Requisitos de Conectividad:</strong> La sincronización instantánea de trazos, capas y mensajería entre múltiples usuarios depende de la calidad, ancho de banda, estabilidad y latencia de la conexión a Internet contratada individualmente por el Usuario. La Plataforma no garantiza una experiencia síncrona fluida si la red del cliente presenta inestabilidad, alta latencia o pérdida de paquetes de datos, siendo el Usuario el único responsable de contar con el equipamiento informático y la conectividad requerida.
                </p>
                <p class="policy-text">
                    <strong>6.2. Código de Conducta en Canales Colaborativos, Chat en Vivo y Moderación:</strong> Durante la participación en salas de trabajo compartidas o canales de chat, los Usuarios deben mantener un trato ético y profesional, quedando prohibido publicar contenido obsceno, difamatorio, de acoso, discriminatorio por motivos de raza, género o religión, o incitador a la violencia o actividades ilícitas. Para resguardar la seguridad de la comunidad, la Plataforma se reserva el derecho de supervisar los canales públicos, aplicar filtros de vocabulario, eliminar contenidos inapropiados, silenciar o expulsar a usuarios infractores y aplicar restricciones permanentes de acceso a las herramientas de chat.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">7. CONDUCTA PROHIBIDA Y MEDIDAS ANTI-ABUSO</h2>
                <p class="policy-text">
                    El uso de los recursos de <?php echo $appName; ?> debe ajustarse estrictamente a fines legítimos de creación gráfica y colaboración. La Plataforma aplica una política de cero tolerancia frente a conductas que atenten contra la seguridad informática o la integridad de sus sistemas.
                </p>
                <p class="policy-text">
                    <strong>7.1. Prohibición de Ingeniería Inversa, Scraping Automatizado y Alteración del Código:</strong> Queda estrictamente prohibido descompilar, desmontar, realizar ingeniería inversa, descifrar o intentar extraer el código fuente, la lógica de negocio, los algoritmos de renderizado o la estructura interna de los servidores e interfaces de la Plataforma. Asimismo, el Usuario se compromete a no utilizar bots, arañas web (crawlers), raspadores de datos o scripts de automatización para recopilar información de Lienzos o usuarios sin autorización previa por escrito.
                </p>
                <p class="policy-text">
                    <strong>7.2. Interferencia con la Seguridad de Red, Ataques DDoS y Uso Indebido de Almacenamiento:</strong> Queda prohibido manipular, desactivar o evadir los sistemas anti-bot transparentes, los controles de frecuencia de peticiones por segundo o los cortafuegos de la Plataforma. Asimismo, se prohíbe el uso de la Plataforma para alojar archivos ajenos a la creación gráfica, distribuir virus o malware, o ejecutar ataques de denegación de servicio (DDoS). La detección de cualquier actividad maliciosa facultará el bloqueo inmediato de IP y la interposición de las acciones legales pertinentes.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">8. DISPONIBILIDAD DEL SERVICIO, MANTENIMIENTO Y TERCEROS</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> realiza esfuerzos continuos por mantener altos estándares de operatividad en sus sistemas; sin embargo, la prestación de servicios digitales en la nube se encuentra sujeta a variables técnicas de red e infraestructura fuera del control absoluto de la Empresa. En consecuencia, la Plataforma, sus herramientas de tiempo real y el almacenamiento en la nube se proporcionan estrictamente bajo la modalidad "TAL CUAL" ("AS IS") y "SEGÚN DISPONIBILIDAD" ("AS AVAILABLE"), sin otorgar garantías explícitas o implícitas de comerciabilidad, continuidad ininterrumpida o idoneidad para un fin específico.
                </p>
                <p class="policy-text">
                    La Plataforma se reserva el derecho de interrumpir temporalmente el acceso a sus servidores para llevar a cabo labores de mantenimiento preventivo o correctivo, actualización de versiones, parches de ciberseguridad, migración de infraestructura u optimización de bases de datos. Siempre que sea técnicamente factible, la Plataforma procurará notificar previamente a los Usuarios sobre las ventanas de mantenimiento programadas a través del sitio web o canales de soporte.
                </p>
                <p class="policy-text">
                    El Usuario reconoce y acepta que la Plataforma depende para su funcionamiento de proveedores externos de almacenamiento en la nube, redes de distribución de contenido (CDN), pasarelas de pago y servicios de geolocalización. <?php echo $appName; ?> no asume responsabilidad alguna por caídas de servicio, lentitud de red, pérdidas de información o interrupciones directamente imputables a dichos proveedores externos o a eventos insuperables de fuerza mayor, tales como desastres naturales, cortes de energía eléctrica o interrupciones globales de telecomunicaciones.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">9. TRATAMIENTO DE DATOS, PRIVACIDAD Y TELEMETRÍA OPERATIVA</h2>
                <p class="policy-text">
                    La protección de los datos de los Usuarios es una prioridad para la Plataforma, regulándose el tratamiento de la información técnica y personal conforme a las normativas de privacidad vigentes y lo dispuesto en nuestra Política de Privacidad y Política de Cookies.
                </p>
                <p class="policy-text">
                    <strong>9.1. Tratamiento de Datos de Cuenta y Procesamiento de Geolocalización por IP:</strong> La Plataforma almacena de forma segura los datos de cuenta necesarios para la prestación del servicio, incluyendo direcciones de correo electrónico, nombres de usuario e historiales cifrados de acceso. Asimismo, las direcciones IP de los Usuarios se procesan de forma automatizada mediante servicios de geolocalización para verificar la legitimidad de los accesos, prevenir fraudes, adaptar parámetros regionales de idioma o moneda y fortalecer la seguridad del sistema.
                </p>
                <p class="policy-text">
                    <strong>9.2. Registro de Telemetría Operativa, Métricas de Rendimiento y Cookies Técnicas:</strong> Con el fin de garantizar el rendimiento técnico y la estabilidad de los servidores, la Plataforma recopila datos disociados de telemetría, métricas de error y registros de uso del sistema. Asimismo, se utilizan cookies técnicas estrictamente necesarias para la gestión de sesiones de usuario, mantenimiento del estado de autenticación y prevención de ataques informáticos de falsificación de peticiones.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">10. LIMITACIÓN DE RESPONSABILIDAD</h2>
                <p class="policy-text">
                    En la máxima medida permitida por las leyes aplicables en la jurisdicción correspondiente, <?php echo $appName; ?> establece exenciones y límites claros respecto a los daños o pérdidas económicas que pudieran derivarse del acceso o uso de sus servicios.
                </p>
                <p class="policy-text">
                    <strong>10.1. Exclusión General de Daños Consecuentes, Indirectos y Lucro Cesante:</strong> En ningún caso <?php echo $appName; ?>, sus directores, administradores, empleados, socios, colaboradores o licenciantes serán responsables ante el Usuario o terceros por daños indirectos, incidentales, especiales, consecuentes, punitivos o ejemplares de cualquier naturaleza. Esta exclusión abarca, sin limitación, pérdidas de beneficios, lucros cesantes, pérdidas de ingresos, datos, oportunidades de negocio, fondo de comercio, corrupción de archivos en el almacenamiento o interrupciones en las conexiones en tiempo real.
                </p>
                <p class="policy-text">
                    <strong>10.2. Tope Monetario Máximo Agregado y Ajustes Jurisdiccionales:</strong> En caso de que un tribunal o autoridad judicial competente determine la existencia de una responsabilidad legal a cargo de <?php echo $appName; ?>, la responsabilidad total acumulada de la Empresa no superará en ningún caso el monto total efectivamente pagado por el Usuario en concepto de suscripciones durante los últimos tres (3) meses anteriores al hecho generador, o la suma de $100.00 USD (cien dólares de los Estados Unidos de América), lo que sea menor. En aquellas jurisdicciones que no permitan la exclusión de ciertos daños, la responsabilidad se limitará en la máxima medida permitida por la ley.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">11. INDEMNIZACIÓN Y DEFENSA LEGAL</h2>
                <p class="policy-text">
                    El Usuario se compromete a defender, indemnizar y sacar en paz y a salvo a <?php echo $appName; ?>, su empresa matriz, filiales, ejecutivos, directores, empleados, agentes y licenciantes frente a cualquier reclamación, demanda, juicio, responsabilidad, pérdida, daño, sanción o gasto (incluyendo honorarios razonables de abogados y costas judiciales) que surjan de o estén relacionados con el uso o mal uso de la Plataforma por parte del Usuario o de cualquier persona que acceda a la Cuenta.
                </p>
                <p class="policy-text">
                    Esta obligación de indemnización aplica plenamente en casos de incumplimiento de cualquier cláusula de estos Términos de Uso, violación de leyes aplicables o infracción de derechos de propiedad intelectual, derechos de autor o privacidad de terceros causada por el Contenido del Usuario cargado o creado en los Lienzos. El Usuario se compromete a prestar la máxima colaboración requerida por la Plataforma en la defensa de cualquier reclamo legal presentado por terceros.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">12. MODIFICACIONES A LOS TÉRMINOS DE USO</h2>
                <p class="policy-text">
                    <?php echo $appName; ?> mantiene la facultad de revisar, modificar, actualizar o reemplazar discrecionalmente cualquier apartado o cláusula del presente Contrato en cualquier momento, con el fin de adaptarlo a modificaciones legislativas, requerimientos técnicos, mejoras operativas o cambios en el modelo comercial de la Plataforma.
                </p>
                <p class="policy-text">
                    En caso de efectuarse modificaciones sustanciales que alteren de forma relevante los derechos u obligaciones de los Usuarios, la Plataforma notificará dichos cambios con al menos quince (15) días de antelación a su entrada en vigor, mediante el envío de un correo electrónico a la dirección registrada en la Cuenta o a través de un aviso destacado en la interfaz de usuario. El uso continuado de la Plataforma tras la entrada en vigor de las modificaciones constituirá la aceptación plena y vinculante de las modificaciones realizadas.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">13. LEY APLICABLE Y RESOLUCIÓN DE CONTROVERSIAS</h2>
                <p class="policy-text">
                    Para la resolución de cualquier conflicto, controversia o reclamación derivada de la interpretación, validez o cumplimiento de estos Términos de Uso, las partes se someten estrictamente al marco legal y a los procedimientos de solución de disputas fijados a continuación.
                </p>
                <p class="policy-text">
                    <strong>13.1. Ley Reguladora y Etapa de Negociación Informal Previa:</strong> El presente Contrato se regirá e interpretará exclusivamente conforme a las leyes vigentes en la jurisdicción del domicilio legal de la entidad operadora de <?php echo $appName; ?>. Ante cualquier discrepancia, el Usuario y la Plataforma se obligan a intentar resolver la controversia de buena fe mediante negociación directa e informal durante un periodo mínimo de treinta (30) días hábiles contados desde la notificación formal por escrito.
                </p>
                <p class="policy-text">
                    <strong>13.2. Sometimiento a Arbitraje Vinculante, Tribunales Ordinarios y Renuncia a Acciones Colectivas:</strong> De no lograrse una solución amigable en la etapa informal, la disputa se someterá a arbitraje vinculante de derecho o a la jurisdicción de los tribunales ordinarios competentes de la sede legal de la Plataforma. El Usuario acepta expresamente que cualquier reclamación contra <?php echo $appName; ?> se tramitará y resolverá de forma estrictamente individual, renunciando a participar en demandas colectivas, acumuladas o acciones de clase (class actions).
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">14. DISPOSICIONES GENERALES Y VALIDEZ CONTRACTUAL</h2>
                <p class="policy-text">
                    Si cualquier cláusula o estipulación de este Contrato fuere determinada como ilegal, nula o inejecutable por un tribunal o autoridad judicial competente, dicha disposición se considerará separable y no afectará la validez, legalidad ni la ejecutabilidad de las disposiciones restantes, las cuales permanecerán con pleno vigor y efecto legal.
                </p>
                <p class="policy-text">
                    El presente Contrato, junto con la Política de Privacidad, Política de Cookies y Política de Reembolsos, constituye el acuerdo completo y exclusivo entre el Usuario y <?php echo $appName; ?> respecto del uso de la Plataforma, sustituyendo cualquier propuesta, acuerdo o entendimiento previo verbal o escrito. La omisión o demora por parte de la Plataforma en exigir el cumplimiento estricto de cualquier derecho no constituirá una renuncia al mismo. La Plataforma podrá ceder o transferir este Contrato sin restricción en casos de fusión, adquisición o reorganización corporativa.
                </p>
            </div>

            <div class="policy-section">
                <h2 class="policy-section-title">15. INFORMACIÓN DE CONTACTO Y ATENCIÓN LEGAL</h2>
                <p class="policy-text">
                    Para el envío de notificaciones legales formales, requerimientos de información o consultas referentes a los presentes Términos de Uso, el Usuario puede ponerse en contacto con nuestro Departamento Legal a través del correo electrónico oficial <strong>legal@projectrosaura.com</strong> o mediante el módulo de soporte integrado en la interfaz privada de la Cuenta.
                </p>
                <p class="policy-text">
                    En caso de existir cualquier discrepancia, divergencia o conflicto de interpretación entre la versión oficial en idioma español de estos Términos de Uso y cualquiera de sus traducciones a otros idiomas, prevalecerá en todo momento a todos los efectos legales la versión en español publicada en el sitio web de la Plataforma.
                </p>
            </div>

        </div>
    </div>
</div>