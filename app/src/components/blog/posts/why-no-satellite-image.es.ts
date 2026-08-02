import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "why-no-satellite-image",
  locale: "es",
  title: "¿Por qué no hay imagen satelital nueva de mi lote?",
  description:
    "La causa casi siempre son las nubes: el satélite pasó a tiempo, pero la toma salió inservible. Cómo reconocer los pases nublados y cuándo sí conviene revisar.",
  lead:
    "La respuesta más corta: el satélite no dejó de pasar — su lote estaba tapado por nubes. Sentinel-2 pasa aproximadamente cada 5 días, pero es un satélite óptico: no puede ver a través de una nube. Detrás de casi cualquier pausa larga hay pases nublados consecutivos. Y la diferencia importa, porque «se rompió el sistema» y «el clima no dejó» llevan a decisiones distintas.",
  minutes: 3,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "¿Cuándo se descarta una imagen?",
      paragraphs: [
        "Después de cada pase, la cadena de procesamiento evalúa la calidad de la toma. En el registro de procesamiento de Agradex, cada intento queda anotado con su resultado, y hay cuatro casos posibles: la imagen se escribió con éxito; no quedaron píxeles confiables sobre el lote (la nube o su sombra lo cubrieron todo); la escena entera venía demasiado nublada; o — rara vez — un error de lectura. Un ejemplo real de julio: para un mismo lote, los pases del 8, del 13 y del 18 terminaron los tres en «demasiado nublado». Esa es toda la explicación de una pausa de 15 días.",
        "La máscara de nubes (Fmask) recorta no solo la nube sino también la sombra que proyecta. Por eso a veces el cielo parece despejado y aun así el pase se considera incompleto: una parte del lote quedó en sombra y esos píxeles no son confiables.",
      ],
    },
    {
      heading: "Cuándo no preocuparse",
      bullets: [
        "Si la pausa lleva menos de 15 días: es el ritmo completamente normal (2 o 3 pases nublados seguidos).",
        "En primavera y otoño ocurren pausas de 2-3 semanas; en invierno o en plena temporada de lluvias, hasta de 3-4 semanas.",
        "Si el vecino tiene imagen y usted no: lo más probable es que su campo caiga en otra franja orbital, con otro día de pase.",
        "La pausa no borra nada: cuando llega la primera imagen despejada, la curva del índice se retoma donde había quedado y la historia del lote sigue completa.",
      ],
    },
    {
      heading: "Cuándo sí vale la pena revisar",
      paragraphs: [
        "Si en pleno verano, con días despejados, pasan más de 3 semanas sin nada, mire el límite del lote: un límite mal trazado o una parcela muy chica reducen la cantidad de píxeles confiables, porque los del borde se mezclan con el camino o el terreno vecino. Para dimensionarlo: en media hectárea quedan unos 50 píxeles de 10 metros, y cada borde pesa. En Agradex, la línea de tiempo del lote muestra los pases nublados junto a las imágenes logradas — el motivo de cada hueco queda escrito ahí, sin necesidad de adivinar. La fecha del próximo pase esperado está en el mismo lugar.",
      ],
    },
    {
      heading: "Qué mirar mientras tanto",
      paragraphs: [
        "Cuando el satélite calla, el lote no queda a ciegas: el pronóstico del clima, el acumulado de lluvia y el balance de riego se siguen actualizando todos los días, porque no dependen de la imagen. Un riego, por ejemplo, puede decidirse con el balance hídrico aunque la última toma tenga dos semanas. En los períodos nublados largos, apoye las decisiones en esas capas; apenas se abra el cielo, la primera imagen despejada llega sola — el sistema vuelve a intentarlo en el siguiente pase de Sentinel-2, sin que usted tenga que pedir nada.",
      ],
    },
  ],
  related: ["satellite-pass-frequency", "free-ndvi-map"],
};
