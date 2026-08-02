import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "why-no-satellite-image",
  locale: "en",
  title: "Why is there no new satellite image of my field?",
  description:
    "Why no new satellite image of your field? Nearly always: cloud. The satellite passed on schedule, but the image was unusable. When to wait — and when to check.",
  lead:
    "The shortest answer: the satellite has not stopped flying — your field has been sitting under cloud. Sentinel-2 passes roughly every 5 days, but it carries an optical instrument, and optics cannot see through cloud. Behind almost every long gap is a run of clouded-out passes, one after another. The distinction matters, because 'the system is broken' and 'the weather refused' lead to different decisions — and below is how to tell them apart from your own field page.",
  minutes: 3,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "When does an image count as unusable?",
      paragraphs: [
        "After every pass, the processing chain grades what came down. Agradex logs each attempt with one of four outcomes: the image was written; no valid pixels were left over the field, because cloud or shadow covered all of it; the whole scene was too cloudy; or — rarely — a read error. Two of those four are cloud under different names, and that is exactly why the log matters: it turns 'no image' from a mystery into a dated list of reasons. A July case from our records: for one field, the passes on the 8th, the 13th and the 18th all ended as 'too cloudy'. That is the entire explanation of a 15-day gap.",
        "The cloud mask, Fmask, cuts out not just cloud but cloud shadow too. So a day that looked clear from your yard can still yield an incomplete acquisition, if part of the field sat inside a shadow track at the minute of the pass.",
      ],
    },
    {
      heading: "When not to worry",
      bullets: [
        "A gap under 15 days is normal rhythm — two or three cloudy passes in a row. Nothing is wrong, and nothing needs doing.",
        "In spring and autumn, gaps of 2-3 weeks are common; in winter, with snow and persistent overcast, 3-4 weeks happen.",
        "The neighbor has a fresh image and you don't? The neighboring field most likely sits in a different orbit swath, with a different pass day.",
        "Context beats duration: a 15-day gap in April says nothing about the system, while a 25-day gap in a cloudless August is genuinely odd.",
      ],
    },
    {
      heading: "When it is worth checking",
      paragraphs: [
        "If it is the middle of summer, the sky has been clear for weeks, and still nothing has arrived after more than 3 weeks — look at the field boundary. A boundary drawn slightly off, or a very small field, can shrink the number of valid pixels until scenes stop qualifying; a boundary traced along the road instead of the crop edge is the most frequent case we see. In Agradex the field timeline lists cloudy passes next to successful images, with the reason written on each and the date of the next expected pass — the gap explains itself instead of inviting guesses.",
      ],
    },
    {
      heading: "What to lean on during a gap",
      paragraphs: [
        "A quiet satellite does not mean a blind field. The weather forecast, rainfall totals and the irrigation water balance keep updating daily — rain does not stop being measurable just because photography does. In long overcast stretches, let those layers carry the decisions; the first cloud-free image will arrive on its own, because the system tries again at every Sentinel-2 pass.",
        "One more honest note: radar satellites do exist and do see through cloud, but the vegetation indexes farmers actually use — NDVI and its relatives — come from optical sensors. Every optical tool on the market shares this limit. Nobody sells weather-proof NDVI.",
      ],
    },
  ],
  related: ["satellite-pass-frequency", "free-ndvi-map"],
};
