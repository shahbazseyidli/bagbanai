import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "what-is-ndvi",
  locale: "es",
  title: "¿Qué es el NDVI? Explicación simple con tabla de valores",
  description:
    "El NDVI mide la densidad del cultivo de −1 a +1 con imágenes satelitales. Qué significan 0.2, 0.4 y 0.7: tabla de valores, ejemplos reales y 3 errores comunes.",
  lead:
    "El NDVI (índice de vegetación de diferencia normalizada) es un número que se calcula a partir de imágenes satelitales y resume qué tan densa y vigorosa está la vegetación de un lote. La escala va de −1 a +1: el suelo desnudo ronda el 0.1 y un cultivo sano y cerrado supera el 0.6. En una frase: cuanto más alto el NDVI, más masa verde haciendo fotosíntesis hay en el campo.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "¿De dónde sale ese número?",
      paragraphs: [
        "Una hoja sana absorbe la luz roja (la usa para la fotosíntesis) y refleja con fuerza el infrarrojo cercano. El NDVI normaliza la diferencia entre esos dos canales: (NIR − Rojo) / (NIR + Rojo). Sentinel-2 capta ambos con píxeles de 10 metros, así que cada cuadro de 10×10 m del lote recibe su propio valor — en una hectárea son unos 100 píxeles.",
        "La fórmula es simple; la fuerza está en la comparación. El NDVI de esta semana contra el de hace dos semanas, la mancha débil contra la zona fuerte del mismo lote: de ahí salen las decisiones agronómicas, no del número suelto.",
      ],
    },
    {
      heading: "Tabla de valores del NDVI",
      paragraphs: [
        "Los rangos de abajo son orientativos: el «normal» de un trigo en macollaje no es el de un maizal en floración ni el de un viñedo con la canopia plena. Léalos siempre junto con la historia de su propio lote.",
      ],
      table: {
        headers: ["NDVI", "Qué significa", "Aspecto típico en el campo"],
        rows: [
          ["< 0.1", "Sin vegetación", "Suelo desnudo, agua, rastrojo"],
          ["0.1 – 0.2", "Cobertura muy rala", "Emergencia reciente, fallas de siembra"],
          ["0.2 – 0.35", "Cobertura débil", "Etapa temprana o estrés"],
          ["0.35 – 0.5", "Cobertura media", "Desarrollo en marcha; conviene vigilar"],
          ["0.5 – 0.7", "Buena cobertura", "Cultivo sano, vegetación activa"],
          ["> 0.7", "Cobertura muy densa", "Pico vegetativo, canopia cerrada"],
        ],
      },
    },
    {
      heading: "Ejemplo real: ¿0.3 es malo o normal?",
      paragraphs: [
        "Depende de la etapa. Un trigo de invierno en el sur de Buenos Aires puede marcar 0.3 en pleno macollaje de julio y estar perfecto: la planta recién se está armando. Ese mismo 0.3 en octubre, con el cultivo encañando, ya es una señal — falta agua, falta nitrógeno o algo empezó a moverse. Y en uno de los avellanos que monitoreamos en el Cáucaso, un 0.3 a mitad del verano casi siempre es problema: una plantación sana de canopia cerrada no debería bajar de 0.6.",
        "En los lotes que seguimos, la pregunta más útil no resultó ser «¿cuánto da el NDVI?» sino «¿hacia dónde va?». El mismo 0.45 sobre una curva que sube es tranquilidad; sobre una curva que baja es motivo de recorrida.",
      ],
    },
    {
      heading: "Tres errores típicos",
      bullets: [
        "Mirar un solo día. El valor de una escena puede estar afectado por la sombra de una nube o por el ángulo del sensor — mire siempre la tendencia.",
        "Comparar lotes distintos entre sí. Otro cultivo, otra fecha de siembra, otro suelo: la comparación de NDVI solo es confiable dentro de la historia del mismo lote.",
        "Leer el NDVI como «porcentaje de salud». 0.6 NO significa 60% sano. El índice mide densidad de cobertura; un cultivo denso pero con sed puede sostener un NDVI alto durante un tiempo.",
      ],
    },
    {
      heading: "¿Cómo verlo en su propio campo?",
      paragraphs: [
        "En Agradex usted marca su lote en el mapa con un toque; el sistema descarga el archivo de Sentinel-2 y, con cada pase nuevo sin nubes, calcula el mapa NDVI junto con un puntaje de estado de 0 a 100. El plan gratuito incluye el mapa satelital, ese puntaje y el clima. Y hay un campo de demostración abierto sin registro — el lote de un productor real, con datos satelitales reales.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "free-ndvi-map"],
};
