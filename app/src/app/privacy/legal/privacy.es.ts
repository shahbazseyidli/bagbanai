// Spanish privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
// Register: LatAm-neutral, formal "usted" throughout.
import type { PrivacyDoc } from "./types";

export const privacyEs: PrivacyDoc = {
  title: "Política de privacidad",
  lead:
    "Agradex es una plataforma que monitorea campos de cultivo mediante imágenes satelitales, " +
    "datos meteorológicos e inteligencia artificial. Esta página no es una plantilla legal: " +
    "explica, tal como es, qué recopila el sistema sobre usted, dónde lo guarda, a quién se " +
    "envía y qué ocurre cuando usted cierra su cuenta.",
  summary: [
    "Todos los datos se almacenan dentro de la UE — en un único servidor en Helsinki, Finlandia, en una base Postgres que gestionamos nosotros. Una excepción: el texto y las imágenes enviados al análisis de IA salen de la UE mientras se procesan — vea “Subencargados” más abajo.",
    "No hay ningún rastreador publicitario, ningún píxel de analítica ni cookies de terceros; por eso no hay banner de consentimiento.",
    "Los datos del campo van a la IA, los datos de la cuenta no: su nombre, su correo electrónico y el hash de su contraseña nunca se envían al proveedor del modelo.",
    "El único correo recurrente es un resumen semanal (los miércoles); un clic basta para darse de baja.",
    "Cerrar su cuenta borra a la persona pero conserva los registros que usted escribió: ya no apuntan a nadie.",
  ],
  sections: {
    scope: {
      heading: "Qué cubre este documento",
      body: [
        {
          kind: "p",
          text:
            "Esta política se aplica a agradex.com (el sitio de marketing), app.agradex.com (la " +
            "aplicación) y la aplicación web instalable (PWA). Todas funcionan en el mismo " +
            "servidor contra la misma base de datos.",
        },
        {
          kind: "p",
          text:
            "Una cosa por delante, por honestidad: Agradex todavía está en desarrollo y no se ha " +
            "declarado ninguna entidad legal registrada (razón social, número de registro, " +
            "domicilio legal) detrás del producto. Por eso este documento no designa a ningún " +
            "responsable formal del tratamiento de datos. Toda solicitud relacionada con sus " +
            "datos llega al equipo que opera la plataforma en info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "El documento cubre únicamente nuestro sistema. Los enlaces que lo llevan fuera de " +
            "Agradex — por ejemplo, a las páginas oficiales de las fuentes de datos satelitales — " +
            "tienen sus propias reglas de privacidad.",
        },
      ],
    },
    "account-data": {
      heading: "Datos de la cuenta",
      body: [
        {
          kind: "p",
          text: "Esto es lo que guardamos cuando usted se registra y cuando cambia su configuración:",
        },
        {
          kind: "ul",
          items: [
            "Dirección de correo electrónico: es su identificador de inicio de sesión y es única.",
            "Contraseña: solo como hash bcrypt. No guardamos la contraseña en claro ni podemos recuperarla.",
            "Nombre completo (opcional), idioma de la interfaz, país y región.",
            "Rol: agricultor, laboratorio, agrónomo consultor o proveedor.",
            "Preferencia de unidad de superficie (hectárea / dönüm / sotka), derivada de su país si usted no ha elegido una.",
            "Preferencias de notificación (qué canales desactivó) y el indicador de baja del resumen por correo.",
            "Por cada dispositivo en el que usted activa las notificaciones push, la suscripción que nos entrega el navegador (punto de entrega, claves de cifrado, cadena de identificación del navegador); la fila se elimina cuando usted cancela la suscripción.",
            "Preferencia de visibilidad del nombre: si su nombre se muestra o no a otros usuarios.",
            "Las respuestas del breve cuestionario de la página de marketing (cultivo, país, región, problema principal, necesidades), si usted lo completó antes de registrarse.",
            "El estado de verificación del correo y un código temporal de 6 dígitos; el código se elimina en cuanto se usa.",
            "La hora de última visita, escrita como máximo una vez por hora, solo para saber si la cuenta sigue en uso.",
          ],
        },
        {
          kind: "p",
          text:
            "Existe una columna de número de teléfono en la base de datos, pero el formulario de " +
            "registro nunca lo pide, así que en la práctica no se recopila ningún número de " +
            "teléfono. No se recopilan datos de tarjetas ni de pago en absoluto (vea \"Paquetes y " +
            "pago\" en las Condiciones de uso).",
        },
      ],
    },
    "field-data": {
      heading: "Datos del campo y de la finca",
      body: [
        { kind: "p", text: "La sustancia de la plataforma son los datos agrícolas que usted introduce:" },
        {
          kind: "ul",
          items: [
            "El límite del campo dibujado en el mapa y su superficie (siempre almacenada en hectáreas; el ajuste de unidad solo afecta la visualización).",
            "Los nombres del campo, de la finca y de la organización.",
            "El pasaporte del campo: cultivo, variedad, fechas de siembra y cosecha, tipo de suelo y pH, método de riego, etapa de crecimiento, cultivo anterior, notas de texto libre.",
            "Observaciones de campo, fotos que usted sube y temporadas.",
            "Registros antiguos que ya no recopilamos pero seguimos almacenando: labores de campo, registros de rendimiento, tareas, filas de libro, ventas, inventario y equipos, y documentos que subió antes. Esas secciones se retiraron del producto; sus registros no se eliminaron y se anonimizan junto con el resto al cerrar la cuenta.",
            "Análisis de laboratorio de suelo: el escaneo que usted sube y los valores extraídos de él por OCR.",
          ],
        },
        { kind: "p", text: "Además de eso, el sistema calcula y almacena:" },
        {
          kind: "ul",
          items: [
            "Estadísticas por escena para 9 índices (NDVI, NDMI y los demás) y archivos ráster recortados a su campo.",
            "Historial meteorológico, la puntuación de salud del campo, los grados-día de crecimiento (GDD).",
            "El texto del consejo de la IA, los datos de entrada con los que se generó, qué modelo lo escribió y en qué idioma.",
            "Mensajes del chat de IA, notificaciones, tokens de enlaces para compartir.",
            "Contabilidad de tokens y costos del uso de IA.",
            "Siete eventos de producto específicos (cuestionario iniciado, campo creado, cultivo definido, primera escena vista, consejo visto, Telegram conectado, lista de inicio completada); esa lista está fijada en el código y nada más de lo que usted hace se registra.",
          ],
        },
      ],
    },
    storage: {
      heading: "Dónde viven los datos",
      body: [
        {
          kind: "p",
          text:
            "Todo se almacena en un único servidor de Hetzner en Helsinki, Finlandia (Unión " +
            "Europea). La base de datos es nuestra propia instalación de Postgres 16 + PostGIS " +
            "ejecutándose en Docker en esa máquina. Los archivos que usted sube residen en el " +
            "disco local de ese servidor, y los rásteres satelitales, en una carpeta separada " +
            "del mismo disco.",
        },
        {
          kind: "p",
          text:
            "No usamos ninguna base de datos gestionada de terceros (como Supabase) ni ningún " +
            "almacenamiento de objetos de terceros (S3 y similares); es una decisión de " +
            "arquitectura deliberada.",
        },
        {
          kind: "p",
          text:
            "Las copias de seguridad se guardan en un servidor operado por el mismo equipo, " +
            "dentro de la Unión Europea. No hay un período formal de retención configurado para " +
            "las copias de seguridad.",
        },
      ],
    },
    processors: {
      heading: "A quién se envían los datos",
      body: [
        {
          kind: "p",
          text:
            "Estos son los servicios externos que usa la plataforma. La lista es completa: no " +
            "pasamos sus datos a redes publicitarias, corredores de datos ni plataformas de " +
            "marketing, y no los vendemos.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "DeepSeek (el modelo de texto)",
              v:
                "Consejo de IA, chat y la capa de investigación. Qué se " +
                "envía: nombre del campo, superficie, pasaporte del cultivo (incluidas las " +
                "notas), tendencias de los índices, clima, notas de campo recientes, labores, " +
                "un resumen del consejo " +
                "anterior y los últimos turnos del chat. " +
                "Qué no se envía: su correo electrónico, su nombre, el hash de su " +
                "contraseña — ni ninguna fotografía, porque este modelo no puede leer imágenes en " +
                "absoluto. El procesamiento ocurre en los servidores de DeepSeek (la empresa " +
                "tiene su sede en China).",
            },
            {
              k: "Google (Gemini — solo imágenes)",
              v:
                "Etiquetado de fotos, diagnóstico de enfermedades/plagas y lectura de informes " +
                "de laboratorio de suelo. Qué se envía: la imagen que usted sube y el cultivo del " +
                "campo. Tenga en cuenta que lo que aparece impreso en un escaneo viaja con él: el " +
                "nombre del laboratorio, su nombre, una dirección; a diferencia del contexto de " +
                "texto, nosotros no elegimos qué contiene la imagen. Al modelo de texto no se le " +
                "envía ninguna fotografía.",
            },
            {
              k: "Resend",
              v:
                "Entrega de correo electrónico: la dirección del destinatario, el nombre del " +
                "saludo y el cuerpo del mensaje. Se usa SMTP como respaldo si está configurado.",
            },
            {
              k: "Open-Meteo",
              v: "Las coordenadas del centro del campo, para el pronóstico a 7 días y la evapotranspiración (ET0).",
            },
            { k: "ISRIC SoilGrids", v: "Las coordenadas del campo, para obtener un perfil de suelo." },
            {
              k: "FAOSTAT",
              v: "Estadísticas de rendimiento a nivel de país. Nada sobre usted sale.",
            },
            {
              k: "EPPO",
              v:
                "Solo el nombre del cultivo, y solo cuando hay una clave de API configurada. Hoy " +
                "no hay ninguna clave configurada, así que no se hace ninguna solicitud a este " +
                "servicio.",
            },
            {
              k: "NASA Earthdata (HLS) y Copernicus Sentinel-2",
              v:
                "Los datos entran, no salen: la búsqueda de escenas envía el rectángulo " +
                "delimitador del campo y un rango de fechas. No se transmite ninguna cuenta, " +
                "ningún nombre ni ninguna dirección.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "El nombre de lugar que usted escribe en el buscador del mapa (desde su " +
                "navegador) y la conversión de una coordenada en un nombre de lugar (desde el " +
                "servidor).",
            },
            {
              k: "Servidores de teselas de mapas base",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap y las teselas " +
                "de terreno se cargan directamente en su navegador, así que esos servidores ven " +
                "su dirección IP y qué zona está mirando.",
            },
            {
              k: "El servicio push de su navegador",
              v:
                "Si usted activa las notificaciones push, el mensaje se entrega a través del " +
                "servicio push de su navegador (Google, Mozilla o Apple, según el navegador). " +
                "El texto viaja cifrado, pero el servicio ve el punto de suscripción de su " +
                "dispositivo.",
            },
            {
              k: "Google (Iniciar sesión con Google)",
              v:
                "Solo si usted mismo presiona “Continuar con Google”. Qué va a Google: su " +
                "navegador (es decir, su dirección IP) y en qué aplicación está iniciando " +
                "sesión. Qué nos devuelve Google: el identificador permanente de la cuenta, la " +
                "dirección de correo, si está verificada y su nombre visible. Nada sobre sus " +
                "campos, notas o datos satelitales va a Google. En nuestras páginas no se carga " +
                "ningún script de Google: el botón es un enlace ordinario, así que hasta que " +
                "usted lo presiona Google no ve que usted está en nuestro sitio.",
            },
            {
              k: "Telegram",
              v:
                "Solo si usted mismo conecta el bot. Hoy no hay ningún token de bot configurado, " +
                "así que el canal está inactivo.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Inteligencia artificial",
      body: [
        {
          kind: "p",
          text:
            "El consejo, el chat y la investigación funcionan sobre el modelo de texto de " +
            "DeepSeek; las imágenes —la etiqueta de la foto, el diagnóstico de enfermedades y la " +
            "lectura del informe de laboratorio— sobre Gemini de Google, porque el modelo de " +
            "texto no acepta imágenes y allí no se envía ninguna. " +
            "El contexto que se envía al modelo trata sobre el campo, no sobre su " +
            "identidad: el código que lo compone no lee ninguna columna de la tabla de cuentas. " +
            "La excepción es la propia imagen: lo que haya en ella viaja con ella, y un informe " +
            "de laboratorio escaneado es el caso evidente.",
        },
        {
          kind: "p",
          text:
            "El número de tokens y el costo estimado de cada llamada a la IA se registran en " +
            "nuestra propia base de datos, para la contabilidad de cuotas y el control de costos.",
        },
        {
          kind: "p",
          text:
            "Si la clave de IA se retira de la configuración, el sistema se degrada de forma " +
            "controlada: no se genera ningún consejo, el chat deja de responder y todo lo demás " +
            "sigue funcionando.",
        },
        {
          kind: "p",
          text:
            "Las respuestas de la IA son análisis automatizado y pueden estar equivocadas. Sus " +
            "límites se detallan por separado en las Condiciones de uso.",
        },
      ],
    },
    email: {
      heading: "Correo electrónico",
      body: [
        {
          kind: "p",
          text:
            "El único mensaje recurrente es el resumen semanal, enviado cada miércoles a las " +
            "07:00 hora de Bakú, y técnicamente incapaz de enviarse más de una vez por semana.",
        },
        {
          kind: "p",
          text:
            "Aparte de eso solo hay mensajes transaccionales: el código de verificación, el " +
            "correo de bienvenida y el informe que llega cuando su campo está listo por primera " +
            "vez. Cada uno de ellos se envía como máximo una vez cada 24 horas.",
        },
        {
          kind: "p",
          text:
            "Cada resumen lleva al pie un enlace de baja de un solo clic, sin necesidad de " +
            "iniciar sesión. Puede desactivar el mismo ajuste en la página de la cuenta. Nota: " +
            "incluso después de darse de baja, los mensajes transaccionales (como el código de " +
            "verificación) siguen llegando, porque la cuenta no funciona sin ellos.",
        },
        {
          kind: "p",
          text:
            "No enviamos correo publicitario y no compartimos su dirección con nadie. Por " +
            "honestidad: el resumen llega actualmente en inglés a los lectores turcos, alemanes, " +
            "húngaros, italianos y polacos; la traducción aún no está terminada.",
        },
      ],
    },
    cookies: {
      heading: "Cookies y almacenamiento del navegador",
      body: [
        { kind: "p", text: "Hay tres cookies, todas funcionales:" },
        {
          kind: "ul",
          items: [
            "bagban_session — la sesión de inicio de sesión. httpOnly (JavaScript no puede leerla), SameSite=Lax, Secure sobre https, 7 días. No se usa para nada más.",
            "bagban_locale — recuerda el idioma que usted eligió, 1 año.",
            "bagban_oauth_state — se crea solo cuando usted presiona “Continuar con Google”, y solo para proteger ese inicio de sesión (CSRF). httpOnly, SameSite=Lax, Secure, 10 minutos; se elimina en cuanto termina el inicio de sesión.",
          ],
        },
        {
          kind: "p",
          text:
            "Eso es todo. No hay Google Analytics, Google Tag Manager, Plausible, Hotjar, " +
            "Mixpanel, PostHog, píxel de Facebook ni ningún otro rastreador en ninguna parte del " +
            "código. Precisamente por eso el sitio no le muestra ningún banner de consentimiento " +
            "de cookies: no hay nada que preguntar.",
        },
        {
          kind: "p",
          text:
            "Por separado, el almacenamiento local de su navegador guarda algunas preferencias " +
            "de la interfaz: el mapa base, el modo de ahorro de datos, la cola sin conexión, el " +
            "estado de la lista de primeros pasos y las respuestas del cuestionario que usted " +
            "completó antes de registrarse. Se quedan en su dispositivo; las respuestas del " +
            "cuestionario viajan al servidor solo junto con la solicitud de registro.",
        },
      ],
    },
    visibility: {
      heading: "Quién puede ver sus datos",
      body: [
        {
          kind: "ul",
          items: [
            "Los demás miembros de su organización: ven los campos de la organización según su rol; el permiso se verifica en el servidor en cada solicitud.",
            "Un enlace compartido (/s/…) muestra una ficha del campo deliberadamente mínima y de solo lectura a cualquiera que lo tenga. Usted puede revocar el enlace en cualquier momento.",
            "Acceso por campo: si usted abre un campo a un usuario determinado, esa persona ve el informe de ese campo únicamente (no sus otros campos, su finca ni su equipo). Usted puede revocarlo en cualquier momento, y esa persona también.",
            "Si usted desactiva la visibilidad del nombre, su nombre se sustituye por un alias \"user_…\" en todas las superficies que ven otros usuarios.",
            "Las cifras de comparación y de referencia no se calculan sin una cohorte de al menos otros 5 campos, y nunca nombran un campo o una finca concretos.",
            "El equipo que opera la plataforma: a través de un panel de administración que ve el uso, el costo de IA y las cuentas de todas las organizaciones y, como operadores del servidor, con acceso técnico a la base de datos.",
          ],
        },
      ],
    },
    retention: {
      heading: "Retención y eliminación",
      body: [
        {
          kind: "p",
          text:
            "Eliminar un campo es un borrado suave: desaparece de la lista y puede restaurarse; " +
            "no se elimina físicamente de la base de datos.",
        },
        {
          kind: "p",
          text:
            "Cerrar su cuenta (el botón en la página de la cuenta) es irreversible y hace " +
            "exactamente esto:",
        },
        {
          kind: "ul",
          items: [
            "Usted tiene que escribir su propia dirección de correo para confirmar.",
            "Si una organización de su propiedad aún tiene otros miembros activos, la solicitud se rechaza: primero transfiera la organización.",
            "Se eliminan todas las membresías, así que el acceso termina de inmediato.",
            "Los campos de las organizaciones donde usted era el único miembro se marcan como eliminados (borrado suave).",
            "La dirección de correo se reescribe a una dirección interna no enrutable, lo que libera su dirección real, de modo que puede volver a registrarse con ella.",
            "El nombre, el país, la región, las respuestas del cuestionario y las preferencias de notificación se borran; el hash de la contraseña se sustituye por un valor que ninguna contraseña puede producir; la cuenta se desactiva.",
          ],
        },
        {
          kind: "p",
          text:
            "Qué sobrevive: los registros que usted escribió — campos, límites, observaciones, " +
            "filas del libro contable, rendimientos. La razón es técnica y no la ocultamos: " +
            "quince tablas hacen referencia al usuario, y un borrado en cascada destruiría el " +
            "historial de toda una finca porque un trabajador se fue. Esos registros permanecen, " +
            "pero ya no apuntan a una persona identificable. El registro de uso, el registro de " +
            "correos enviados y las filas de eventos conservan un identificador de usuario que " +
            "ya no corresponde a nadie.",
        },
        {
          kind: "p",
          text: "No hay caducidad automática para los datos satelitales ni para los derivados.",
        },
      ],
    },
    rights: {
      heading: "Sus derechos y lo que puede hacer hoy",
      body: [
        { kind: "p", text: "Todo esto está en la página de la cuenta, de inmediato, por usted mismo:" },
        {
          kind: "ul",
          items: [
            "Cambiar su contraseña.",
            "Editar su nombre, país y región.",
            "Cambiar el idioma de la interfaz y la unidad de superficie.",
            "Ajustar la matriz de notificaciones (categoría × canal).",
            "Desactivar la visibilidad del nombre.",
            "Darse de baja del resumen por correo.",
            "Cerrar la cuenta.",
          ],
        },
        {
          kind: "p",
          text: "Los límites de los campos pueden descargarse como GeoJSON o KML desde la pantalla de creación del campo.",
        },
        {
          kind: "p",
          text:
            "Todavía no existe una exportación automática de la cuenta completa; no lo " +
            "ocultamos. Si usted quiere una copia de sus datos o su eliminación completa, " +
            "escriba a info@agradex.com y la prepararemos a mano.",
        },
      ],
    },
    changes: {
      heading: "Cambios",
      body: [
        {
          kind: "p",
          text:
            "Este documento describe el sistema, así que tiene que cambiar cuando el sistema " +
            "cambie. La fecha de la última actualización se muestra en la parte superior de la " +
            "página.",
        },
        {
          kind: "p",
          text:
            "Cualquier cambio sustancial en lo que se recopila o en el destino al que se envía " +
            "se anunciará con antelación, mediante una notificación dentro de la aplicación o el " +
            "resumen semanal.",
        },
      ],
    },
  },
};
