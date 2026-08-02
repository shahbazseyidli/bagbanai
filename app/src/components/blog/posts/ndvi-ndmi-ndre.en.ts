import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-ndmi-ndre",
  locale: "en",
  title: "NDVI vs NDMI vs NDRE: which index to check, and when",
  description:
    "NDVI shows canopy density, NDMI water in the plant, NDRE nitrogen-chlorophyll status. How to read the three together — and which question each one answers.",
  lead:
    "Three indexes answer three different questions. NDVI: how dense is the canopy? NDMI: is there water inside the plant? NDRE: how is chlorophyll — in practice, nitrogen nutrition — holding up? Most reading mistakes come from asking NDVI all three questions at once. A dense crop running short of water can look perfectly fine on NDVI while NDMI has already started to slide. The fix is cheap: know which question each index answers, and check them in order.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "The comparison at a glance",
      paragraphs: [
        "If you only ever check one layer, make it NDVI — it is the best single summary of canopy condition. But the moments that cost real money, water stress and nitrogen gaps, are exactly the ones NDVI is late to. That is what the other two are for.",
      ],
      table: {
        headers: ["Index", "What it measures", "The question it answers", "Typical range"],
        rows: [
          ["NDVI", "Density of green biomass", "Overall condition, weak zones, trend", "0.1 – 0.8"],
          ["NDMI", "Moisture in plant tissue", "Water stress, before you irrigate", "−0.2 – 0.4"],
          ["NDRE", "Chlorophyll / nitrogen signal", "Fertilizer timing, differences inside a dense canopy", "0.1 – 0.5"],
        ],
      },
    },
    {
      heading: "NDMI: sees water stress before NDVI does",
      paragraphs: [
        "NDMI compares near-infrared light against shortwave infrared. Water absorbs shortwave infrared, so the index responds directly to how much moisture the leaf tissue is holding. Its working range runs from about −0.20 to 0.40: a green, well-watered crop sits on the positive side, a drying canopy slips below zero. Put simply, NDVI reports how the crop looks; NDMI reports how it feels.",
        "A real case from our monitoring: a field still read 'medium' on NDVI while NDMI had fallen to −0.13. The canopy was keeping its shape; the water behind it was running out. That gap between the two indexes is what lets you make the irrigation call one or two satellite passes earlier than NDVI alone would allow.",
      ],
    },
    {
      heading: "NDRE: takes over where NDVI saturates",
      paragraphs: [
        "At peak season a closed canopy pushes NDVI up against its ceiling near 0.8, and from there the differences inside a field vanish from the map — everything reads 'high'. NDRE uses the red-edge band instead, and it keeps separating exactly in that saturated zone: which strip is falling behind on nitrogen, where a top-dressing would actually pay.",
        "In wheat, NDRE does its best work between stem extension and heading. In orchards and vineyards, watch it through the first half of summer, when the canopy is full and NDVI has gone quiet. This is also why fertilizer maps built on NDVI alone disappoint in good years — the map is flat where the need is not.",
      ],
    },
    {
      heading: "A practical reading order",
      bullets: [
        "Open the NDVI trend first at every pass. If it is falling, go find the reason.",
        "NDVI normal, weather hot and dry? Check NDMI — water stress surfaces there first.",
        "NDVI high and even, but you suspect differences inside the field? That is NDRE's question.",
        "All three sinking together means the problem is not local — water, roots or disease. Time for a proper scouting round.",
      ],
    },
    {
      heading: "How this looks in Agradex",
      paragraphs: [
        "Every field gets nine indexes, switchable as map layers with one tap, each with a one-line plain-language note beside it. The AI analysis reads the disagreements between indexes on its own and raises them as risk flags — a sentence like 'NDVI is stable, but NDMI has been falling for 10 days' arrives ready-made.",
      ],
    },
  ],
  related: ["what-is-ndvi", "when-to-irrigate-wheat"],
};
