import type { BlogPost } from "../types";

// The "OneSoil alternative" query page. HONESTY IS THE STRATEGY here: OneSoil is a respected
// product with a huge user base, and a comparison that pretends otherwise would deserve to rank
// nowhere. Update the freemium details if OneSoil's pricing changes — a stale comparison is worse
// than none.
export const post: BlogPost = {
  slug: "agradex-vs-onesoil",
  locale: "en",
  title: "Agradex vs OneSoil: an honest comparison for 2026",
  description:
    "OneSoil moved its mobile app to freemium in 2026, and many farmers are comparing options. What each platform does well, what stays free, and how to choose.",
  lead:
    "Short version: OneSoil is a polished, widely used field-monitoring app that moved its mobile version to a freemium model in 2026. Agradex is a younger platform built around one idea — the satellite map should come with an explanation, not homework. Which one fits you depends on whether you want a map you interpret yourself or an agronomist's reading of it in your own language.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Where OneSoil is genuinely strong",
      paragraphs: [
        "Credit first. OneSoil helped bring free NDVI monitoring to millions of farmers, its mobile apps are polished, its automatic field-boundary detection is well known, and it has years of head start in user experience. In 2026 it also introduced its own AI agronomist feature. If you have used it and it serves you well, there may be no reason to switch.",
        "What changed is the business model: in 2026 the mobile app moved to freemium, and parts of what used to be free now sit behind a subscription. That is a legitimate business decision — satellites are not free to process — but it is the moment many users started looking around, which is probably why you are reading this page.",
      ],
    },
    {
      heading: "Where Agradex takes a different path",
      paragraphs: [
        "Agradex starts from the assumption that most farmers do not want to interpret a color map — they want to know what to do. So every index layer ships with a plain-language explanation, a 0-100 field condition score summarizes the picture, and the AI agronomist writes its advice from your field's actual context: satellite trends, weather, and the scouting notes you logged. The interface runs in 9 languages, including several that large platforms rarely prioritize — Azerbaijani, Hungarian, Polish among them.",
        "Two smaller differences matter day to day. First, honesty about gaps: Agradex records cloudy satellite passes and shows when the next pass is expected, so \"why is there no new image\" always has an answer. Second, the demo: you can open a live demo field — a real farmer's field with live data — without creating an account.",
      ],
    },
    {
      heading: "Side by side",
      table: {
        headers: ["", "Agradex", "OneSoil"],
        rows: [
          ["Free tier", "Satellite map (9 indices), 0-100 condition score, weather", "Reduced since the 2026 freemium shift; core NDVI viewing"],
          ["AI agronomist", "Advice + chat from your field's full context; 1-month free trial, no card", "AI agronomist feature introduced in 2026"],
          ["Languages", "9 (az, en, ru, tr, de, hu, it, pl, es)", "Several major languages"],
          ["Cloud-gap transparency", "Cloudy passes logged, next pass predicted", "Not a core feature"],
          ["Photo diagnosis", "Yes — photo of a leaf feeds the advice", "No (as of writing)"],
          ["Mobile experience", "Web app / PWA, installable", "Native apps, very mature"],
          ["Track record", "Young platform (2026)", "Years of history, large user base"],
        ],
      },
    },
    {
      heading: "How to actually decide",
      bullets: [
        "You mostly want a quick NDVI look on a phone, and the current OneSoil free tier covers your fields — stay. Switching costs attention, and attention is scarce in season.",
        "You keep looking at the map and wondering what it means — try a platform that explains. That is the exact gap Agradex was built for.",
        "Your language matters to you: if you work in Azerbaijani, Spanish, Polish or Hungarian, check which platform actually speaks it end to end.",
        "Either way, test with one real field for two or three weeks before moving your whole operation. Both platforms read the same Sentinel-2 physics; the difference is what they do with it.",
      ],
    },
    {
      heading: "Try both, honestly",
      paragraphs: [
        "The cheapest experiment: open the Agradex demo field (no signup), then add one of your own fields on the free plan and compare a fortnight of readings against whatever you use today. If our explanation layer does not earn its place, you have lost nothing — the underlying imagery is the same public Sentinel-2 data everywhere.",
      ],
    },
  ],
  related: ["free-ndvi-map", "what-is-ndvi"],
};
