import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-pass-frequency",
  locale: "es",
  title: "¿Cada cuánto pasa el satélite sobre mi campo?",
  description:
    "Sentinel-2 pasa sobre el mismo lote en promedio cada 5 días, pero no todo pase deja imagen. Medimos 7 lotes durante 120 días: el ritmo real y qué esperar.",
  lead:
    "Respuesta corta: los satélites gemelos Sentinel-2 (2A y 2B) pasan sobre el mismo punto en promedio cada 5 días. En las zonas donde las franjas orbitales se superponen, un lote puede caer en 2 o 3 órbitas distintas y recibir pases más seguidos. Pero hay una distinción que importa: pase no es lo mismo que imagen.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "¿De dónde sale el ritmo de 5 días?",
      paragraphs: [
        "El programa Sentinel-2 opera dos satélites idénticos, uno en cada lado de la misma órbita. Cada uno cubre el planeta completo en 10 días; entre los dos, vuelven al mismo punto cada 5. No lo tomamos de un folleto técnico: lo medimos en nuestros propios datos.",
        "Al agrupar 120 días de fechas de toma sobre 7 lotes apareció un patrón limpio: las fechas de cada lote caen en 2 o 3 grupos según la regla (fecha mod 5), y todos los intervalos dentro de un grupo son múltiplos exactos de 5 — los 86 intervalos, sin una sola excepción. Es decir: según en qué franjas orbitales caiga su campo, las imágenes llegan con el ritmo de 5 días de esas franjas.",
      ],
    },
    {
      heading: "¿Por qué a veces pasan 15 o 20 días sin imagen?",
      paragraphs: [
        "Porque pase ≠ imagen. El satélite cruza puntual, pero si el lote está tapado por nubes, esa pasada no sirve. Un caso real de julio: sobre uno de los campos hubo pases el 8, el 13 y el 18 — y los tres salieron nublados. Para el productor eso se siente como «el satélite lleva 20 días sin volar»; en realidad pasó tres veces y el clima no dejó.",
        "Agradex hace visible esa diferencia: registra también los pases nublados, no solo las imágenes logradas, y muestra en la página del lote la fecha del próximo pase esperado. Así la respuesta a «¿por qué no hay imagen?» es un dato medido, no una suposición.",
      ],
    },
    {
      heading: "Qué esperar según la estación",
      bullets: [
        "Verano seco y despejado: la proporción de pases sin nubes es alta — imagen fresca cada 5-10 días, típicamente.",
        "Primavera y otoño: variable; 2 o 3 pases nublados seguidos son normales, o sea pausas de 10-15 días.",
        "Invierno o temporada de lluvias: el período más pobre — la nubosidad persistente puede abrir huecos de 3-4 semanas. No es una falla del sistema: es física.",
      ],
    },
    {
      heading: "¿Qué ve — y qué no ve — un píxel de 10 metros?",
      paragraphs: [
        "Las bandas principales de Sentinel-2 se toman a 10 m de resolución. Una hectárea equivale a unos 100 píxeles: suficiente para separar las zonas débiles dentro del lote. Lo que no se puede es distinguir un árbol aislado, un entresurco angosto o una huerta de unos cientos de metros cuadrados. En parcelas chicas, además, los píxeles del borde se mezclan con el terreno vecino — por eso conviene trazar el límite con precisión.",
      ],
    },
    {
      heading: "Conclusión práctica",
      paragraphs: [
        "Planifique las decisiones con el ritmo de pases, no con ansiedad diaria: cuando llega imagen fresca, mire el mapa; cuando no llega, revise el motivo — en Agradex aparece en la línea de tiempo del lote, junto con la fecha del próximo pase esperado. Y para probar sin registrarse hay un campo de demostración en vivo, con datos satelitales reales.",
      ],
    },
  ],
  related: ["why-no-satellite-image", "what-is-ndvi"],
};
