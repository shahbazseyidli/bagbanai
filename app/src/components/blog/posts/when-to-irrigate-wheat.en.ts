import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "when-to-irrigate-wheat",
  locale: "en",
  title: "When to irrigate wheat: the FAO-56 method in plain words",
  description:
    "When to irrigate wheat? Follow the water balance, not the calendar: ET0 × crop coefficient (Kc) minus effective rain. Critical windows plus a worked example.",
  lead:
    "The right question is not 'how many days between irrigations?' but 'when does the soil's water reserve run down to the critical mark?' FAO's Irrigation and Drainage Paper No. 56 answers it with three numbers: how much water the atmosphere pulls out (ET0), a coefficient for the crop's current stage (Kc), and the share of rainfall that actually soaks in. When the running balance turns negative, it is time to irrigate — on the field's own arithmetic, not the calendar's.",
  minutes: 5,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "What the three numbers mean",
      paragraphs: [
        "ET0, the reference evapotranspiration, is computed from temperature, solar radiation, wind and humidity: how much water today's weather would pull out of a well-watered reference grass surface. On a hot, dry July day it reaches 6-8 mm — and since one millimetre over one hectare (about 2.5 acres) is 10 tonnes of water, that is 60-80 tonnes leaving every hectare, every day. In a cool, humid week the same figure can drop to 2-3 mm. The whole point is that it moves.",
        "Kc, the crop coefficient, scales that demand to the crop and its stage. In identical weather, wheat drinks modestly at emergence (around 0.3), heavily from heading through the milk stage (up to 1.15), then modestly again toward ripeness (0.3-0.4). Actual demand = ET0 × Kc.",
        "Effective rainfall is the honest part of the rain. Not every millimetre that falls gets into the soil — a slice of any downpour runs off the surface. The balance should only be credited with what actually soaked in.",
      ],
    },
    {
      heading: "Wheat's critical water windows",
      bullets: [
        "Stem extension to heading: the most sensitive stretch — stress here directly cuts the number of grains per head.",
        "Flowering: short but unforgiving. Even 3-4 days of hard stress damages pollination.",
        "Milk stage: the grain is filling; stress drags down the thousand-kernel weight.",
        "Tillering: comparatively tolerant — a mild deficit even nudges the roots to chase water deeper.",
      ],
    },
    {
      heading: "A worked example, simplified",
      paragraphs: [
        "Say the crop is at heading (Kc ≈ 1.15), the past 7 days brought a total ET0 of 45 mm, and 8 mm of rain fell, all of it absorbed. The crop's spend: 45 × 1.15 ≈ 52 mm. The balance: 8 − 52 = −44 mm. If the soil's readily available water held 50 mm, the reserve is all but gone: irrigate within the next day or two, not when the week 'comes round'.",
        "The laborious part of FAO-56 is not the multiplication — it is tracking ET0 and the growth stage every single day. Agradex runs that part automatically: daily ET0 from weather data, Kc from the recorded crop and stage, rainfall totals, all folded into a running water balance on the field page. The output reads like advice rather than homework: 'apply about X mm this week'.",
      ],
    },
    {
      heading: "Where the satellite comes in",
      paragraphs: [
        "The balance is arithmetic; the satellite is the audit. NDMI measures moisture in the plant tissue itself and confirms — or contradicts — what the numbers claim. If the balance insists water is adequate but NDMI keeps falling pass after pass, one of the inputs is off: the irrigation may be spreading unevenly, or the effective rainfall was smaller than you credited.",
      ],
    },
    {
      heading: "Three rules to keep",
      bullets: [
        "Balance, not calendar. A fixed 'every 10 days' over-waters in a cool spring and starves the crop in July.",
        "Record the growth stage honestly. If Kc is wrong, every number downstream of it is wrong.",
        "In the critical windows, do not ride the balance to zero — at heading, irrigating once 40-50% of the reserve is spent is the safer play.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "satellite-pass-frequency"],
};
