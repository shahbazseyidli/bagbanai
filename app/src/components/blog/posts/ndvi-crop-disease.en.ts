import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "ndvi-crop-disease",
  locale: "en",
  title: "Can NDVI detect crop disease? An honest answer",
  description:
    "Can NDVI detect crop disease? Not directly — it sees stress, not the cause. Rust, drought and nitrogen gaps look alike from space; its job is early warning.",
  lead:
    "The honest answer: not directly. NDVI is not a disease detector — it shows that vegetation somewhere is weakening, and says nothing about why. Leaf rust, drought, nitrogen shortage and root-feeding grubs can look nearly identical from orbit: each prints the same 'NDVI is falling in this zone' signature. The satellite's real value is different, and it is considerable — it shows where to look and when, well before your own eyes would.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "What the satellite actually sees",
      paragraphs: [
        "As a disease destroys leaf tissue, photosynthesis weakens, less red light gets absorbed, and NDVI drops. A well-established infection does show up as a clear patch on the map. The trouble is that the very same patch is produced by salinity, a compacted wheel track, uneven irrigation, or rows that missed their fertilizer pass. The map shows a symptom; it does not name a culprit — and fields are full of look-alikes.",
        "Then there is the pixel. At 10 metres, a disease starting on the first handful of trees, or in a hotspot a few square metres wide, is simply invisible from orbit. By the time the patch reads clearly on the map, it has already grown. Any tool promising 'disease detection from NDVI' is making the word 'detection' work very hard.",
      ],
    },
    {
      heading: "So what is the satellite good for?",
      paragraphs: [
        "Used with the right expectations, the map earns its place in a disease strategy four ways.",
      ],
      bullets: [
        "Early direction. It shows which corner of the field broke its trend — so scouting gets an address instead of a blind walk.",
        "Time. An NDVI zone can start diverging 1-2 weeks before the eye picks up any yellowing — and in disease control, two weeks is often the difference between a spot treatment and a full-field spray.",
        "Checking treatment. Did the spray work? Recovery — or the lack of it — shows up as numbers on the following passes.",
        "Narrowing the cause. Read together with NDMI, 'this is water stress, not disease' becomes a much safer call.",
      ],
    },
    {
      heading: "The workflow that works: satellite → boots → photo",
      paragraphs: [
        "Three steps. First, the satellite map shows a zone losing ground. Second, you walk to that exact spot and look at leaves: the color of the damage, its shape, where on the plant it sits. Third, you photograph a suspect leaf — in Agradex, photo diagnosis reads the image, suggests the likely cause and a next step, and the observation stays pinned to the field's history, so a recurring hotspot is recognized as recurring.",
        "The last word on any diagnosis belongs on the ground — a lab test, or an experienced agronomist's eye on the actual leaf. The satellite does not replace that chain; it makes it cheaper. You know where to go before you spend a morning going there, and a photo costs nothing while a wrong spray costs twice: once in money, once in lost time.",
      ],
    },
    {
      heading: "A note from a hazelnut orchard",
      paragraphs: [
        "In one of the hazelnut orchards we monitor in the Caucasus, the northern strip ran consistently below its neighbors on NDVI through mid-summer. The walk-through found a plain cause: the irrigation line feeding that strip was underperforming. No disease anywhere. The satellite never said 'disease' — it said 'look here', and looking there took an hour instead of a season. That is this index used properly: modest claims, concrete payoff.",
      ],
    },
  ],
  related: ["what-is-ndvi", "ndvi-ndmi-ndre"],
};
