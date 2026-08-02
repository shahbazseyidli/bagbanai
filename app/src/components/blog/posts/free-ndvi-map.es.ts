import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "free-ndvi-map",
  locale: "es",
  title: "Mapa NDVI gratis: 3 formas reales de monitorear tu campo",
  description:
    "Tres formas gratuitas de ver el NDVI de un campo: Copernicus Browser, OneSoil y Agradex. Ventajas y límites de cada una — comparación honesta, sin humo.",
  lead:
    "No hace falta pagar para seguir un campo desde el satélite: los datos de Sentinel-2 son abiertos y sobre ellos se construyeron varias herramientas gratuitas. Aquí van tres caminos que funcionan: el navegador oficial de los datos crudos, una app internacional conocida y nuestra propia plataforma. Los tres contados con honestidad — incluido a quién le conviene cada uno.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "1. Copernicus Browser: la fuente cruda oficial",
      paragraphs: [
        "El navegador oficial de la Agencia Espacial Europea permite abrir cualquier escena de Sentinel-2, activar la capa NDVI y recorrer el historial completo. Es totalmente gratuito y es la primera mano del dato.",
        "Su lado débil: está pensado para investigadores. No guarda el límite de su lote, la máscara de nubes corre por su cuenta y no responde la pregunta «¿qué significa este número para mí?». Revisarlo a mano cada semana exige paciencia.",
      ],
    },
    {
      heading: "2. OneSoil: la app internacional conocida",
      paragraphs: [
        "Durante años totalmente gratuita, OneSoil fue el primer contacto con el NDVI para millones de productores: se dibuja el lote y se mira el índice. Su interfaz simple y su app móvil son el punto fuerte.",
        "A tener en cuenta: en 2026 la app móvil pasó a un modelo freemium — la parte gratuita se redujo y algunas funciones quedaron detrás de la suscripción. La capa de consejos, además, es de carácter general. Para quien solo quiere mirar el índice de vez en cuando, sigue siendo una opción razonable.",
      ],
    },
    {
      heading: "3. Agradex: nuestro camino — mapa + explicación",
      paragraphs: [
        "En Agradex, el plan gratuito incluye el mapa satelital del lote (nueve índices, NDVI incluido), un puntaje de estado de 0 a 100 y el clima agrícola con pronóstico desde las coordenadas del propio lote. El campo se marca en el mapa con un toque — sin papeles catastrales ni coordenadas. Para el consejo del agrónomo IA hay 1 mes de prueba gratis, sin pedir tarjeta.",
        "Nuestra diferencia está en la postura: no mostramos el mapa para decirle «interprételo usted». La interfaz está en 9 idiomas (español incluido), cada índice lleva al lado una explicación simple y los pases nublados se muestran abiertamente, para que «¿por qué no llegó imagen?» nunca quede sin respuesta. Antes de registrarse puede recorrer el campo de demostración en vivo — el lote de un productor real, con el flujo satelital real.",
      ],
    },
    {
      heading: "¿Cuál le conviene a quién?",
      table: {
        headers: ["Necesidad", "Opción adecuada"],
        rows: [
          ["Escenas crudas, trabajo científico, control total", "Copernicus Browser"],
          ["Experiencia de app internacional, vista NDVI simple", "OneSoil"],
          ["Explicación en su idioma + puntaje de estado + clima en un solo lugar", "Agradex"],
        ],
      },
    },
    {
      heading: "El límite honesto de lo gratuito",
      paragraphs: [
        "Elija la herramienta que elija, la física es la misma: Sentinel-2 pasa más o menos cada 5 días, un pase nublado no deja imagen y el píxel de 10 metros no muestra un árbol aislado. La diferencia entre las herramientas gratuitas no está en el dato — está en qué tan comprensible lo vuelven.",
        "Y nada obliga a casarse con una sola: hay productores que validan una duda puntual en el Copernicus Browser y usan una plataforma para el seguimiento diario. Lo importante es mirar el lote con regularidad — la herramienta es el medio, no el fin.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency"],
};
