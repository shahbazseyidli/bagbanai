import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "satellite-pass-frequency",
  locale: "en",
  title: "How often do satellites pass over my field?",
  description:
    "Sentinel-2's twin satellites pass over the same field about every 5 days. We measured the rhythm across 7 fields and 120 days — and a pass is not a picture.",
  lead:
    "Short answer: the Sentinel-2 twin satellites — 2A and 2B — pass over the same point on Earth about once every 5 days. Where their orbital swaths overlap, which happens over wide bands of the map, one field can sit under two or even three orbits, and passes come more often still. One distinction matters more than the schedule itself: a pass is not the same thing as a usable image.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Where the 5-day rhythm comes from",
      paragraphs: [
        "The programme flies two identical satellites on the same orbit, half a revolution apart. Each covers the globe in 10 days; together they come back to any given point every 5. That figure is usually quoted from the mission datasheet — we went and measured it in our own data instead.",
        "We took 120 days of acquisition dates across seven of the fields we monitor and grouped each field's dates by (date mod 5). The pattern is strict: the dates fall into two or three groups, and every gap inside a group is an exact multiple of 5 days — all 86 gaps, without a single exception. Fields land in more than one group because neighboring swaths overlap. Whatever orbits your field sits under, images arrive on those orbits' 5-day beat.",
      ],
    },
    {
      heading: "Why do 15-20 days sometimes pass without an image?",
      paragraphs: [
        "Because a pass is not a picture. The satellite crosses on schedule, but if the field is under cloud at that moment, the acquisition is worthless. A July example from our records: one field had passes on the 8th, the 13th and the 18th — and all three were lost to cloud. From the ground this reads as 'the satellite has not flown in 20 days'. It flew three times. The weather said no.",
        "Agradex makes that difference visible: the system records cloudy passes alongside successful images, and the field page shows the date of the next expected pass. 'Why is there no image' then gets a measured answer instead of a shrug.",
      ],
    },
    {
      heading: "What to expect by season",
      bullets: [
        "Summer: in dry-summer climates most passes come back clean — expect a fresh image every 5-10 days.",
        "Spring and autumn: changeable. Two or three clouded-out passes in a row are routine, which stretches gaps to 10-15 days.",
        "Winter: the leanest stretch. Snow and persistent overcast can open gaps of 3-4 weeks — physics, not a fault in the system.",
      ],
    },
    {
      heading: "What a 10-metre pixel sees — and what it misses",
      paragraphs: [
        "Sentinel-2's main bands resolve 10 metres, so one hectare is roughly 100 pixels — call it 40 to the acre. That is plenty to pick out weak zones inside a field. It is not enough to see a single tree, a narrow strip between rows, or a garden plot of a few hundred square metres. On small fields the edge pixels blend with whatever grows next door, which is why a precisely drawn boundary earns its keep.",
      ],
    },
    {
      heading: "The practical takeaway",
      paragraphs: [
        "Plan monitoring around the pass rhythm rather than the calendar: when a fresh image lands, read the map; when nothing lands, find out why. Decisions with a deadline — irrigation, spraying — should not wait on a satellite; that is what the daily weather layers are for. In Agradex both sides live on one field timeline, successful scenes and cloudy passes alike, and the live demo field shows the whole thing without registration.",
      ],
    },
  ],
  related: ["why-no-satellite-image", "what-is-ndvi"],
};
