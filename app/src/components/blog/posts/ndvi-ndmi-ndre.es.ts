import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-ndmi-ndre",
  locale: "es",
  title: "NDVI, NDMI y NDRE: la diferencia y cuándo mirar cada uno",
  description:
    "El NDVI mide la densidad de cobertura; el NDMI, el agua en la planta; el NDRE, clorofila y nitrógeno. Qué pregunta responde cada índice y cómo leerlos juntos.",
  lead:
    "Tres índices, tres preguntas distintas. NDVI: «¿qué tan densa está la cobertura?». NDMI: «¿tiene agua la planta por dentro?». NDRE: «¿en qué nivel está la clorofila — en la práctica, la nutrición nitrogenada?». El error más común es usar el NDVI para responder las tres: un cultivo denso pero con sed puede seguir viéndose bien en NDVI cuando el NDMI ya empezó a caer.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Comparación de un vistazo",
      paragraphs: [
        "La tabla resume lo esencial; más abajo, el detalle de los dos índices que más dudas generan en el trabajo diario: el NDMI y el NDRE.",
      ],
      table: {
        headers: ["Índice", "Qué mide", "Para qué sirve", "Rango típico"],
        rows: [
          ["NDVI", "Densidad de la masa verde", "Estado general, zonas débiles, tendencia", "0.1 – 0.8"],
          ["NDMI", "Humedad del tejido vegetal", "Estrés hídrico ANTES de regar", "−0.2 – 0.4"],
          ["NDRE", "Señal de clorofila / nitrógeno", "Momento de refertilizar, matices bajo canopia densa", "0.1 – 0.5"],
        ],
      },
    },
    {
      heading: "NDMI: ve el estrés hídrico antes que el NDVI",
      paragraphs: [
        "El NDMI compara el infrarrojo cercano con el infrarrojo de onda corta; como el agua absorbe la onda corta, el índice responde directamente a la humedad del tejido. Su rango práctico va de −0.20 a 0.40: un cultivo verde y bien hidratado queda del lado positivo; una cobertura que se está secando cae por debajo de cero.",
        "Un caso real: en uno de los lotes que monitoreamos, el NDVI todavía se veía «medio» cuando el NDMI ya había caído a −0.13 — la cobertura mantenía la forma, pero la reserva de agua se estaba agotando. Esa señal permite decidir el riego 1 o 2 pases antes de que el NDVI lo muestre.",
      ],
    },
    {
      heading: "NDRE: entra en juego cuando el NDVI se satura",
      paragraphs: [
        "En el pico vegetativo, una canopia densa empuja el NDVI hasta un techo cercano a 0.8 — y a partir de ahí las diferencias dentro del lote desaparecen del NDVI. El NDRE usa la banda de borde rojo (red edge) y justamente en esa zona de saturación sigue discriminando: qué franja viene atrasada en nitrógeno, hacia dónde dirigir la refertilización.",
        "En trigo, la ventana más útil va de la encañazón a la espigazón; en maíz, las semanas previas a la floración; en frutales y viñedos, la primera mitad del verano. Ahí las diferencias de NDRE son la mejor señal para afinar el plan de fertilización.",
      ],
    },
    {
      heading: "Regla práctica de lectura",
      bullets: [
        "En cada pase, mire primero la tendencia del NDVI: si baja, busque la causa.",
        "NDVI normal pero días calurosos y secos: revise el NDMI — el estrés hídrico aparece antes ahí.",
        "NDVI alto y parejo, y usted busca diferencias dentro del lote: abra el mapa NDRE.",
        "Si los tres índices empeoran a la vez, el problema no es local — toca revisar en serio: agua, raíces o sanidad.",
      ],
    },
    {
      heading: "Cómo se ve en Agradex",
      paragraphs: [
        "Para cada lote se calculan nueve índices; la capa del mapa se cambia con un toque y cada índice lleva al lado una explicación simple, sin jerga. El análisis con IA detecta por sí solo las inconsistencias entre índices y las convierte en señal de riesgo — la frase «el NDVI está estable, pero el NDMI lleva 10 días cayendo» llega ya escrita, junto con el paso sugerido para la semana.",
      ],
    },
  ],
  related: ["what-is-ndvi", "when-to-irrigate-wheat"],
};
