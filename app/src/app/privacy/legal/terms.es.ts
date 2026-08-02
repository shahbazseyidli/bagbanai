// Spanish terms of use — a translation of terms.az.ts. Same section keys, same facts. The
// "ai-limits" section renders the advice.py DISCLAIMERS sentence in Spanish (there is no Spanish
// UI locale yet, so no verbatim string exists to quote). Register: LatAm-neutral, formal "usted".
import type { TermsDoc } from "./types";

export const termsEs: TermsDoc = {
  title: "Condiciones de uso",
  lead:
    "Esta página explica qué promete Agradex y — más importante aún — qué no promete. No es una " +
    "plantilla legal: todo lo escrito aquí corresponde al producto tal como está hoy.",
  summary: [
    "Agradex es una herramienta de apoyo a la decisión; no sustituye a un agrónomo, a un laboratorio ni a recorrer el campo.",
    "El consejo de la IA es análisis automatizado y puede estar equivocado; la decisión final es suya.",
    "Hoy no hay ningún sistema de pago conectado: no se recopilan datos de tarjetas y no se cobra nada sin previo aviso.",
    "Los datos de su finca son suyos; no los vendemos.",
    "El servicio funciona en un único servidor, sin SLA y sin disponibilidad garantizada.",
  ],
  sections: {
    service: {
      heading: "Qué es el servicio",
      body: [
        {
          kind: "p",
          text:
            "Agradex es una plataforma de monitoreo de cultivos y gestión agrícola construida " +
            "sobre imágenes satelitales (Sentinel-2 y el producto armonizado Landsat–Sentinel), " +
            "pronósticos meteorológicos, modelos agronómicos e inteligencia artificial. El " +
            "servicio incluye el sitio web, la aplicación y la aplicación web instalable (PWA).",
        },
        {
          kind: "p",
          text:
            "Todavía no se ha declarado ninguna entidad legal registrada detrás de la " +
            "plataforma, así que este documento no nombra ninguna empresa, ningún número de " +
            "registro ni ninguna ley aplicable. Lo escribimos abiertamente para que nadie se " +
            "quede con una impresión equivocada de qué es este documento. Contacto: " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Al usar el servicio usted acepta estas condiciones. Si no está de acuerdo, no cree " +
            "una cuenta, o cierre la que tiene.",
        },
      ],
    },
    account: {
      heading: "Cuenta",
      body: [
        {
          kind: "ul",
          items: [
            "Una dirección de correo electrónico corresponde a una cuenta; el correo es también su identificador de inicio de sesión.",
            "Después del registro, la dirección de correo se confirma con un código de 6 dígitos.",
            "Proteger sus credenciales es su responsabilidad; las acciones realizadas desde su cuenta cuentan como suyas.",
            "Usted debe proporcionar información exacta — especialmente el límite del campo y el cultivo, porque todo el análisis se construye sobre ellos.",
            "Los permisos dentro de una organización se otorgan por rol; el propietario de la organización puede añadir y quitar miembros.",
            "Usted puede cerrar su cuenta en cualquier momento. Lo que ocurre entonces está descrito paso a paso en la Política de privacidad.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Límites de la inteligencia artificial",
      body: [
        {
          kind: "p",
          text:
            "Esta frase exacta se imprime debajo de cada consejo de la IA: \"Este consejo es un " +
            "análisis automatizado basado en datos satelitales y de campo; verifíquelo en el " +
            "lugar antes de decidir.\" No es una formalidad: es, literalmente, la frontera del " +
            "servicio.",
        },
        {
          kind: "ul",
          items: [
            "La IA puede equivocarse: puede leer mal un campo cubierto de nubes, y si los datos del pasaporte están incompletos, el resultado también lo estará.",
            "El diagnóstico por foto nunca nombra una marca ni una dosis concreta de pesticida: lo remite a la lista de productos registrados y a un agrónomo.",
            "El consejo no es asesoramiento veterinario, fitosanitario, legal ni financiero.",
            "Los índices satelitales y los modelos no sustituyen un análisis de laboratorio, una muestra de suelo ni recorrer el campo.",
            "Lea siempre la etiqueta y sus normas locales antes de aplicar cualquier producto químico.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Uso aceptable",
      body: [
        { kind: "p", text: "No está permitido lo siguiente:" },
        {
          kind: "ul",
          items: [
            "Enviar solicitudes masivas automatizadas, extraer el contenido de forma sistemática (scraping) o intentar hacer caer el servicio con carga artificial.",
            "Acceder a la cuenta de otra persona sin permiso, intentar eludir los mecanismos de seguridad o introducir código malicioso.",
            "Subir datos que no son suyos y que no tiene derecho a compartir (por ejemplo, documentos de campo de otra finca).",
            "Publicar contenido ilegal o fraudulento, o contenido que infrinja los derechos de otra persona.",
            "Revender el servicio o las respuestas de la IA a terceros sin permiso.",
            "Hacer ingeniería inversa del código o de los modelos de la plataforma.",
          ],
        },
        {
          kind: "p",
          text:
            "Incumplir estas reglas puede llevar a la suspensión de la cuenta. Si eso ocurre, " +
            "intentaremos explicar el porqué.",
        },
      ],
    },
    packages: {
      heading: "Paquetes y pago",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Free",
              v: "1 campo · 1 consejo de IA al mes · sin chat · índices satelitales y clima incluidos.",
            },
            {
              k: "Pro — 10 AZN/mes",
              v: "5 campos · 8 consejos de IA al mes · 50 mensajes de chat al mes · pasaporte del campo, riego y ventana de pulverización.",
            },
            {
              k: "Business — 25 AZN/mes",
              v: "Campos prácticamente ilimitados · 30 consejos al mes · 300 mensajes de chat · 30 diagnósticos por foto · comparativas (benchmarks) e informes.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "Una organización recién creada comienza con una prueba de 1 mes del paquete Pro y " +
            "vuelve por sí sola al paquete gratuito cuando la prueba termina; no hay ningún " +
            "pago automático.",
        },
        {
          kind: "p",
          text:
            "La nota más importante: el pago todavía no está conectado. No hay ningún proveedor " +
            "de pagos en ninguna parte del código, no se recopilan datos de tarjetas ni datos " +
            "bancarios, y los paquetes se asignan actualmente a mano. Cuando los planes de pago " +
            "entren en vigor, lo anunciaremos con antelación; no se cobrará nada a nadie sin " +
            "previo aviso.",
        },
        { kind: "p", text: "Los precios se muestran en AZN." },
      ],
    },
    quotas: {
      heading: "Cuotas",
      body: [
        {
          kind: "p",
          text:
            "El consejo de IA, el chat y el diagnóstico por foto tienen límites mensuales por " +
            "paquete. Cuando se alcanza un límite, la solicitud se rechaza y se le explica el " +
            "motivo; el límite se reinicia el mes siguiente.",
        },
        {
          kind: "p",
          text:
            "Los límites existen para cubrir el costo real de la IA. Nos reservamos el derecho " +
            "de restringir un uso que ponga una carga inusual sobre el sistema.",
        },
        {
          kind: "p",
          text:
            "La velocidad del procesamiento satelital depende de cosas fuera de nuestro " +
            "control: la frecuencia con la que el satélite pasa sobre su campo y la nubosidad.",
        },
      ],
    },
    ownership: {
      heading: "De quién son los datos",
      body: [
        {
          kind: "p",
          text:
            "Los límites de los campos, los datos del pasaporte, las notas, las fotos, las " +
            "filas del libro contable — todo es suyo. Usted nos concede el derecho de " +
            "procesarlos para prestar el servicio (almacenarlos, procesarlos, analizarlos, " +
            "mostrárselos de vuelta); nada más allá de eso.",
        },
        {
          kind: "ul",
          items: [
            "No vendemos sus datos ni los cedemos para publicidad.",
            "Las cifras agregadas (comparaciones, referencias) se calculan solo sobre cohortes de al menos 5 campos y nunca identifican un campo concreto.",
            "El código de la plataforma, el diseño, los modelos de índices y el contenido nos pertenecen.",
            "Usted es responsable de que el contenido que sube sea suyo, o de tener derecho a subirlo.",
          ],
        },
      ],
    },
    availability: {
      heading: "Disponibilidad",
      body: [
        {
          kind: "p",
          text:
            "El servicio funciona en un único servidor y se presta sobre la base del mejor " +
            "esfuerzo. No hay disponibilidad garantizada (sin SLA); pueden ocurrir " +
            "interrupciones planificadas y no planificadas.",
        },
        {
          kind: "p",
          text:
            "Los datos satelitales no son continuos: la nubosidad y el calendario de revisita " +
            "del satélite pueden significar días sin una imagen nueva. Eso no es una avería — " +
            "así funcionan las órbitas.",
        },
        {
          kind: "p",
          text:
            "Podemos añadir, cambiar o retirar funciones. Si retiramos algo que le importa, " +
            "intentaremos avisarlo con antelación.",
        },
      ],
    },
    liability: {
      heading: "Responsabilidad",
      body: [
        {
          kind: "p",
          text:
            "Las decisiones agronómicas son suyas. Regar, fertilizar, pulverizar, cosechar — " +
            "cada una es una decisión de la persona que conoce el campo, y Agradex no asume " +
            "ninguna responsabilidad por su resultado.",
        },
        {
          kind: "p",
          text:
            "En concreto: si de un trabajo hecho (o no hecho) sobre la base de un consejo de la " +
            "plataforma resulta una pérdida de cosecha, un rendimiento menor, costos más altos " +
            "o cualquier otro daño, no asumimos responsabilidad por ello.",
        },
        {
          kind: "p",
          text:
            "El servicio se presta \"tal cual\"; no damos ninguna garantía de que los datos " +
            "sean completos o exactos.",
        },
        {
          kind: "p",
          text:
            "Esta sección no limita ningún derecho que le otorguen las disposiciones " +
            "imperativas de su legislación local.",
        },
      ],
    },
    changes: {
      heading: "Cambios en estas condiciones",
      body: [
        {
          kind: "p",
          text:
            "A medida que el producto cambie, estas condiciones cambiarán con él. La fecha en " +
            "la parte superior de la página muestra la última edición.",
        },
        {
          kind: "p",
          text:
            "Los cambios sustanciales — por ejemplo, la entrada en vigor del pago — se " +
            "anunciarán con antelación mediante una notificación dentro de la aplicación o por " +
            "correo electrónico. Seguir usando el servicio después de un cambio significa que " +
            "usted acepta las nuevas condiciones.",
        },
      ],
    },
    contact: {
      heading: "Contacto",
      body: [
        {
          kind: "p",
          text:
            "Preguntas, quejas, una solicitud de copia de sus datos o de su eliminación — todo " +
            "va a una sola dirección: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Los datos formales de entidad legal (razón social, registro, domicilio, ley " +
            "aplicable) todavía no existen; esta sección se actualizará cuando existan.",
        },
      ],
    },
  },
};
