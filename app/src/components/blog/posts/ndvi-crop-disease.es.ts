import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-crop-disease",
  locale: "es",
  title: "¿El NDVI detecta enfermedades del cultivo? Respuesta honesta",
  description:
    "Directamente no: el NDVI ve estrés, no enfermedades, y no dice la causa. El rol real del satélite es dar la señal temprana; el diagnóstico se hace en el lote.",
  lead:
    "Respuesta honesta: directamente, no. El NDVI no es un detector de enfermedades — ve que la vegetación se debilita, pero no dice por qué. Una roya, la falta de agua, una deficiencia de nitrógeno o un gusano en la raíz pueden verse casi iguales desde el satélite: todos generan la misma señal, «en esta zona el NDVI está cayendo». El valor real del satélite es otro: mostrar dónde y cuándo mirar, bastante antes de que el ojo humano note algo.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "¿Qué ve el satélite en realidad?",
      paragraphs: [
        "A medida que una enfermedad destruye el tejido foliar, la fotosíntesis se debilita y la absorción de luz roja cae — el NDVI baja. Una infección extendida y seria aparece como una mancha clara en el mapa. El problema es que esa misma mancha también la producen la salinidad, una franja de suelo compactado, un riego desparejo o las hileras donde faltó fertilizante.",
        "A eso se suma el píxel de 10 metros: cuando la enfermedad arranca en las primeras 5-10 plantas o en un foco de pocos metros cuadrados, el satélite todavía no lo ve. Para cuando el foco se vuelve visible desde la órbita, ya creció. Por eso conviene desconfiar de cualquier promesa de «detección de enfermedades por satélite» sin letra chica.",
      ],
    },
    {
      heading: "¿Entonces para qué sirve?",
      bullets: [
        "Dirección temprana: en qué rincón del lote se quebró la tendencia — el recorrido deja de ser a ciegas y pasa a tener destino.",
        "Tiempo ganado: una zona de NDVI puede empezar a diferenciarse 1-2 semanas antes de que el ojo note el amarilleo.",
        "Control después del tratamiento: ¿funcionó la aplicación? En los pases siguientes, la recuperación de la zona (o su ausencia) se ve en números.",
        "Ayuda a discriminar: leído junto con el NDMI, la hipótesis «esto es estrés hídrico, no enfermedad» gana bastante precisión.",
      ],
    },
    {
      heading: "El flujo correcto: satélite → botas → foto",
      paragraphs: [
        "El esquema que funciona tiene tres pasos. Primero: ver en el mapa satelital la zona que se debilita — y confirmarla en el pase siguiente, porque una sola escena puede engañar. Segundo: caminar hasta ese punto y mirar la hoja — el color, la forma y la ubicación de las lesiones dicen más que cualquier índice. Tercero: fotografiar la hoja sospechosa; en Agradex, el diagnóstico por foto analiza la imagen, escribe la causa probable y el siguiente paso, y la observación queda guardada en la historia del lote.",
        "La última palabra del diagnóstico siempre está en el campo: un análisis de laboratorio o el ojo de un agrónomo con experiencia. El satélite no reemplaza esa cadena — la abarata: antes de ir a alguna parte, usted ya sabe adónde ir.",
      ],
    },
    {
      heading: "Una observación desde el Cáucaso",
      paragraphs: [
        "En uno de los avellanos que monitoreamos en el Cáucaso, a mitad del verano la franja norte de la plantación venía marcando un NDVI consistentemente más bajo que el de las franjas vecinas. La revisión en el terreno encontró una causa simple: en esa franja la línea de riego trabajaba mal. No había ninguna enfermedad. El satélite nunca dijo «hay enfermedad» — dijo «mire aquí». Y ese es el buen uso del índice: promete poco, rinde concreto.",
      ],
    },
  ],
  related: ["what-is-ndvi", "ndvi-ndmi-ndre"],
};
