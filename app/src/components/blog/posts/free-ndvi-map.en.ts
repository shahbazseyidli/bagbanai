import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "free-ndvi-map",
  locale: "en",
  title: "Free NDVI map: 3 real ways to monitor your field",
  description:
    "Three working ways to get a free NDVI map of your field: Copernicus Browser, OneSoil and Agradex. Strengths and limits of each — an honest comparison.",
  lead:
    "You do not need to pay to watch a field from space. Sentinel-2 data is open, and several genuinely free tools are built on top of it — the differences lie in how much work they leave to you. Here are three real routes: the official browser for raw data, a well-known international app, and our own platform. All three described honestly, with who each one actually suits — and none of them will cost you anything to try this afternoon.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "1. Copernicus Browser — the raw source itself",
      paragraphs: [
        "The European Space Agency's official browser opens any Sentinel-2 scene on the planet, renders an NDVI layer on demand and lets you walk back through years of archive. It is completely free, and the data is as first-hand as it gets — this is the source every other tool drinks from.",
        "The weak side: it was built for researchers, not for a Tuesday-evening field check. It does not remember your field boundary, cloud masking is your problem, and it will not say what a value means for your crop. Checking a field by hand every week takes real patience — though if you want to learn what raw scenes actually contain, there is no better classroom.",
      ],
    },
    {
      heading: "2. OneSoil — the well-known international app",
      paragraphs: [
        "OneSoil spent years fully free, and for millions of farmers around the world it was the first contact with drawing a field boundary and watching NDVI change week to week. The clean interface and the mobile app are genuine strengths.",
        "Worth knowing before you settle in: in 2026 the mobile app moved to a freemium model — the free tier narrowed, and some features now sit behind a subscription. A normal commercial decision, noted here without judgment, but it changed what 'free' means there. The advice layer is generic rather than tied to your field's own history, so the interpreting stays with you.",
      ],
    },
    {
      heading: "3. Agradex — our way: the map plus the explanation",
      paragraphs: [
        "Agradex's free plan carries the field's satellite map — nine indexes, NDVI among them, refreshed at every cloud-free pass — a 0-100 condition score, and the field's weather. You outline the field on the map in a few taps; no land documents, no coordinates. The AI agronomist's advice runs on a 1-month free trial, no card asked.",
        "The difference is the stance. We do not hand over a map with 'interpret it yourself': the interface runs in 9 languages, every index carries a plain-language note, and cloudy passes are shown openly, so 'where is my image' always has an answer. And before registering at all, you can open the live demo field — a real farm on a real satellite feed.",
      ],
    },
    {
      heading: "Which route fits whom?",
      table: {
        headers: ["You need", "The better fit"],
        rows: [
          ["Raw scenes, research work, full control", "Copernicus Browser"],
          ["A familiar app for a quick NDVI look", "OneSoil"],
          ["A plain-language readout, condition score and weather in one place", "Agradex"],
        ],
      },
    },
    {
      heading: "The honest limit of every free route",
      paragraphs: [
        "Whichever tool you pick, the physics stays the same. Sentinel-2 passes about every 5 days; a cloudy pass yields nothing; a 10-metre pixel — about 100 to the hectare, 40 to the acre — will never show a single tree. Free tools do not differ in the data. They differ in how much sense they help you make of it, and our bet is simply that a map plus an explanation beats a map alone.",
      ],
    },
  ],
  related: ["what-is-ndvi", "satellite-pass-frequency"],
};
