import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-subsidy-check",
  locale: "en",
  title: "Your subsidy claim is checked by satellite — here is what it sees",
  description:
    "CAP area monitoring watches farmland with Copernicus Sentinel data instead of sending an inspector. What the satellite can and cannot prove, and how to look at your own parcel first.",
  lead:
    "Short answer: an inspector is no longer the first thing that looks at your parcel — a satellite is. Under the EU's Area Monitoring System, agricultural areas are observed regularly and systematically using Copernicus Sentinel data, and those observations feed the administrative checks inside IACS. Nothing about that is secret: the imagery is open, and you can look at your own fields through exactly the same data before anyone else does.",
  minutes: 5,
  datePublished: "2026-10-26",
  dateModified: "2026-10-26",
  sections: [
    {
      heading: "What is the Area Monitoring System?",
      paragraphs: [
        "EU regulation defines it plainly: a procedure of regular and systematic observation, tracking and assessment of agricultural activities and practices on agricultural areas, using Copernicus Sentinel satellite data or other data of at least equivalent value. The wording matters — Sentinel data is named, but it is not the only permitted source.",
        "This is not new, only newly continuous. Satellite imagery has been part of CAP control since 1992; what changed in 2018 was the arrival of Checks by Monitoring, which uses the full image time series rather than a single snapshot taken for a single inspection.",
      ],
    },
    {
      heading: "Why time series beats a single photograph",
      paragraphs: [
        "One image can be argued with. A cloud, a cut taken a week early, a field that happens to look bare on the day — any of them can mislead. A season of images cannot be argued with in the same way, because it shows a shape: bare soil, emergence, canopy closure, senescence, harvest. That shape is what distinguishes a grassland from an arable field, and a mown meadow from an abandoned one.",
        "Sentinel-1 and Sentinel-2 together make the series dependable. Sentinel-2 sees colour and vegetation but is stopped by cloud; Sentinel-1 is radar and sees through it. Where an optical gap would otherwise swallow three weeks of evidence, radar keeps the record going.",
      ],
    },
    {
      heading: "What it means for the farm office",
      paragraphs: [
        "The practical effect of continuous monitoring is fewer routine visits. Observations that match the declaration need no follow-up; the ones that do not are what gets a human involved. So the question stops being \"will an inspector come\" and becomes \"does my parcel look, from orbit, like what I declared\".",
        "That reframes the paperwork too. A declared crop that never produced a canopy, a parcel boundary that overlaps a neighbour's, a cut recorded on a date the imagery does not support — these are now visible cheaply, at scale, across every parcel rather than a sampled few.",
      ],
      bullets: [
        "Parcel boundaries have to be right — pixels are taken from inside them",
        "A declared crop should produce the growth curve that crop produces",
        "Dated operations are easier to defend when the imagery agrees",
        "Gaps caused by cloud are normal; a flat season-long signal is not",
      ],
    },
    {
      heading: "Look at your own parcel first",
      paragraphs: [
        "The single most useful preparation is to see what the administration sees before they see it. The data source is open: Copernicus Sentinel-2 imagery is free, and the vegetation indices computed from it are the same arithmetic wherever they are computed.",
        "Agradex does that part for you — draw the boundary once, and it pulls that parcel's Sentinel-2 history and plots the index curve over the season. It makes no claim about your entitlement and runs no eligibility calculation; that is the paying agency's job. What it shows is the physical record the monitoring is built on, in the same resolution.",
      ],
    },
    {
      heading: "What a satellite still cannot tell you",
      paragraphs: [
        "It cannot name a disease, read a contract, or see under a canopy. A 10-metre pixel covers 100 square metres, so a small infestation nest, a single tree or a narrow strip between rows does not resolve into its own pixel. And an index is a measurement of reflected light, not a diagnosis — it tells you where to walk, not what you will find when you get there.",
        "That boundary is worth keeping in mind in both directions: it limits what monitoring can hold against you, and it limits what you should expect a map to settle on your behalf.",
      ],
    },
    {
      heading: "In short",
      paragraphs: [
        "Satellite-based area monitoring is cheaper, more uniform and less intrusive than the inspection regime it replaces, and it runs on open data you can read yourself. The preparation is unglamorous and entirely within your control: get the boundary right, and know what your own season looks like from above before the question is asked.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency", "free-ndvi-map"],
};
