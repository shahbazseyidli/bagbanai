import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "what-is-ndvi",
  locale: "en",
  title: "What is NDVI? A plain explanation with a values table",
  description:
    "What is NDVI? A satellite index of vegetation density on a −1 to +1 scale. A plain values table, real field examples, and the three most common mistakes.",
  lead:
    "NDVI — the Normalized Difference Vegetation Index — is a number calculated from satellite imagery that tells you how much dense, actively growing vegetation a field is carrying. The scale runs from −1 to +1: bare soil sits near 0.1, while a healthy, well-closed crop reads above 0.6. In one sentence: the higher the NDVI, the more green, photosynthesizing leaf area the satellite is looking at.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Where does the number come from?",
      paragraphs: [
        "A healthy leaf absorbs red light to drive photosynthesis and throws near-infrared light back. NDVI normalizes the difference between those two channels: (NIR − Red) / (NIR + Red). Sentinel-2 records both at 10-metre resolution, so every 10×10 m patch of ground gets its own value — about 100 pixels per hectare, or roughly 40 to the acre.",
        "The formula is simple; the power is in comparison. This week's value against two weeks ago. The weak corner against the strong middle of the same field. A single number on its own settles very little — agronomic decisions come out of the differences.",
      ],
    },
    {
      heading: "The NDVI values table",
      paragraphs: [
        "Treat the bands below as a compass, not a verdict. A wheat field and a walnut orchard have different normals, and early season looks nothing like mid-season. Read the table against your own field's history — and if you farm several crops, expect to hold several different tables in your head.",
      ],
      table: {
        headers: ["NDVI", "What it means", "Typical picture in the field"],
        rows: [
          ["< 0.1", "No vegetation", "Bare soil, water, fresh tillage"],
          ["0.1 – 0.2", "Very sparse cover", "Emergence, severe gaps in the stand"],
          ["0.2 – 0.35", "Weak cover", "Early growth stage, or stress"],
          ["0.35 – 0.5", "Moderate cover", "Crop developing, keep watching"],
          ["0.5 – 0.7", "Good cover", "Healthy, active growth"],
          ["> 0.7", "Very dense cover", "Peak season, closed canopy"],
        ],
      },
    },
    {
      heading: "A real example: is 0.3 bad, or normal?",
      paragraphs: [
        "It depends entirely on the stage. Winter wheat showing 0.3 in December is doing fine — the crop is still tillering. The same wheat stuck at 0.3 in May is sending a signal: short of water, short of nitrogen, or getting sick. And in a mature orchard or vineyard in the middle of summer, 0.3 almost always spells trouble; a healthy closed canopy should not fall below 0.6.",
        "Across the fields we monitor, the most useful question has never been 'what is the NDVI?' but 'which way is it moving?' The same 0.45 on a rising curve is reassurance. On a falling curve, it is a reason to put your boots on.",
      ],
    },
    {
      heading: "Three common mistakes",
      bullets: [
        "Reading a single date. One scene can be skewed by a cloud shadow or the viewing angle — judge the trend, not the snapshot.",
        "Comparing your field with the neighbor's. Different crop, different planting date, different soil. NDVI comparison is only reliable inside one field's own history.",
        "Treating NDVI as a health percentage. A reading of 0.6 does not mean '60% healthy'. The index measures canopy density — a dense crop running out of water can hold a high NDVI for a while before anything shows.",
      ],
    },
    {
      heading: "How to check your own field",
      paragraphs: [
        "In Agradex you outline the field on the map in a few taps; the system pulls the Sentinel-2 archive and, at every cloud-free pass, produces a fresh NDVI map along with a 0-100 condition score and the field's weather — all of it on the free plan. A new look arrives roughly every 5 days when the sky cooperates. There is also a live demo field, a real farm on a real satellite feed, that opens without any signup.",
      ],
    },
  ],
  related: ["ndvi-ndmi-ndre", "free-ndvi-map"],
};
