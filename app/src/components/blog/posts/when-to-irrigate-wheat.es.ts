import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "when-to-irrigate-wheat",
  locale: "es",
  title: "¿Cuándo regar el trigo? El método FAO-56 explicado simple",
  description:
    "Elija el momento de riego por balance hídrico, no por calendario: ET0 × Kc − lluvia efectiva. Las etapas críticas del trigo y un ejemplo numérico paso a paso.",
  lead:
    "La pregunta correcta no es «¿cada cuántos días riego?» sino «¿cuándo la reserva de agua del suelo llega a un nivel crítico?». La metodología FAO-56 lo calcula con tres números: el agua que la atmósfera «extrae» (ET0), un coeficiente que depende de la etapa del cultivo (Kc) y la parte de la lluvia que de verdad entra al suelo. Cuando el balance se acerca al negativo, es momento de regar — según la cuenta del propio lote, no según el calendario.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Qué significan los tres números",
      paragraphs: [
        "ET0, la evapotranspiración de referencia, se calcula con temperatura, radiación, viento y humedad, y dice «cuánta agua se llevaría hoy el clima de una pastura de referencia». En pleno verano — un enero de riego en Cuyo, un abril seco en el norte de México — el ET0 llega a 6-8 mm por día; son 60-80 mil litros por hectárea, cada día.",
        "Kc, el coeficiente del cultivo: con el mismo clima, el trigo gasta poco en emergencia (alrededor de 0.3), muchísimo entre la espigazón y el grano lechoso (hasta 1.15) y de nuevo poco hacia la madurez (0.3-0.4). La demanda real = ET0 × Kc.",
        "Lluvia efectiva: no todo milímetro caído se infiltra — parte de un aguacero escurre y se pierde. En el balance solo debe contarse la parte que realmente entró al suelo.",
      ],
    },
    {
      heading: "Las ventanas críticas del trigo",
      bullets: [
        "Encañazón a espigazón: el período más sensible; el estrés aquí reduce directamente el número de granos por espiga.",
        "Floración: corta pero implacable — 3 o 4 días de estrés severo alcanzan para dañar la polinización.",
        "Grano lechoso: se está llenando el grano; el estrés baja el peso de mil granos.",
        "Macollaje: relativamente tolerante — una restricción leve incluso empuja las raíces a profundizar.",
      ],
    },
    {
      heading: "La cuenta en la práctica: un ejemplo simplificado",
      paragraphs: [
        "Supongamos que el cultivo está espigando (Kc ≈ 1.15), el ET0 de los últimos 7 días sumó 45 mm y llovieron 8 mm que se infiltraron completos. Gasto del cultivo: 45 × 1.15 ≈ 52 mm de demanda. Balance: 8 − 52 = −44 mm. Si el agua fácilmente disponible de su suelo era de 50 mm, la reserva está prácticamente agotada: hay que regar en los próximos 1-2 días, sin esperar a que «se cumpla el turno de la semana».",
        "Lo trabajoso de esta cuenta es seguir el ET0 y la etapa todos los días. Agradex lo hace automático: ET0 diario a partir de datos de Open-Meteo, Kc según el cultivo y la etapa del lote, acumulado de lluvia — todo aparece como balance hídrico ya resuelto en la página del lote, y la recomendación llega en la forma «esta semana aplique unos X mm».",
      ],
    },
    {
      heading: "¿Dónde entra el satélite?",
      paragraphs: [
        "El balance es aritmética; el satélite es la verificación. El NDMI muestra la humedad dentro del tejido de la planta y confirma que la cuenta coincide con la realidad del campo. Si el balance dice «el agua alcanza» pero el NDMI cae de forma sostenida, algo hay que revisar: quizá el riego no se reparte parejo, quizá la lluvia efectiva fue menor que la que usted anotó.",
      ],
    },
    {
      heading: "Tres reglas para llevarse",
      bullets: [
        "Balance, no calendario: el «cada 10 días» riega de más en invierno y de menos en plena espigazón.",
        "Registre bien la etapa: si el Kc está mal, toda la cuenta está mal.",
        "En las ventanas críticas no deje que el balance se acerque a cero — durante la espigazón es más seguro regar cuando se consumió el 40-50% de la reserva.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "satellite-pass-frequency"],
};
