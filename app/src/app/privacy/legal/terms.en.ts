// English terms of use — a translation of terms.az.ts. The "ai-limits" section quotes the English
// DISCLAIMERS string from services/app/ai/advice.py verbatim.
import type { TermsDoc } from "./types";

export const termsEn: TermsDoc = {
  title: "Terms of use",
  lead:
    "This page explains what Agradex promises and — more importantly — what it does not. It is " +
    "not a legal template: everything written here matches the product as it stands today.",
  summary: [
    "Agradex is a decision-support tool; it does not replace an agronomist, a laboratory or walking the field.",
    "AI advice is automated analysis and can be wrong — the final decision is yours.",
    "No payment system is connected today: no card data is collected and nothing is charged without notice.",
    "Your farm data is yours; we do not sell it.",
    "The service runs on a single server, with no SLA and no guaranteed uptime.",
  ],
  sections: {
    service: {
      heading: "What the service is",
      body: [
        {
          kind: "p",
          text:
            "Agradex is a crop-monitoring and farm-management platform built on satellite imagery " +
            "(Sentinel-2 and the harmonised Landsat–Sentinel product), weather forecasts, " +
            "agronomic models and artificial intelligence. The service includes the website, the " +
            "app and the installable web app (PWA).",
        },
        {
          kind: "p",
          text:
            "No registered legal entity has been declared behind the platform yet, so this " +
            "document names no company, registration number or governing law. We write that " +
            "openly so nobody is left with the wrong impression of what this document is. " +
            "Contact: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "By using the service you accept these terms. If you do not agree, do not create an " +
            "account, or close the one you have.",
        },
      ],
    },
    account: {
      heading: "Account",
      body: [
        {
          kind: "ul",
          items: [
            "One email address corresponds to one account; the email is also your login identifier.",
            "After signup the email address is confirmed with a 6-digit code.",
            "Keeping your credentials safe is your responsibility; actions taken from your account count as yours.",
            "You must give accurate information — especially the field boundary and the crop, because all the analysis is built on them.",
            "Permissions inside an organisation are granted by role; the organisation owner can add and remove members.",
            "You can close your account at any time. What happens then is described step by step in the Privacy policy.",
          ],
        },
      ],
    },
    "ai-limits": {
      heading: "Limits of the artificial intelligence",
      body: [
        {
          kind: "p",
          text:
            "This exact sentence is printed under every piece of AI advice: \"This advice is an " +
            "automated analysis based on satellite and field data; verify on-site before " +
            "deciding.\" It is not a formality — it is literally the boundary of the service.",
        },
        {
          kind: "ul",
          items: [
            "The AI can be wrong: it can misread a field sitting under cloud, and if the passport data is incomplete the result will be incomplete too.",
            "Photo diagnosis never names a specific pesticide brand or dose — it points you at the list of registered products and at an agronomist.",
            "Advice is not veterinary, phytosanitary, legal or financial advice.",
            "Satellite indices and models do not replace a laboratory analysis, a soil sample or walking the field.",
            "Always read the label and your local rules before applying any chemical product.",
          ],
        },
      ],
    },
    "acceptable-use": {
      heading: "Acceptable use",
      body: [
        { kind: "p", text: "The following are not allowed:" },
        {
          kind: "ul",
          items: [
            "Sending automated bulk requests, scraping the content, or trying to bring the service down with artificial load.",
            "Accessing someone else's account without permission, attempting to bypass security mechanisms, or planting malicious code.",
            "Uploading data that is not yours and that you have no right to share (for example another farm's field documents).",
            "Posting illegal or fraudulent content, or content that infringes someone else's rights.",
            "Reselling the service or the AI answers to third parties without permission.",
            "Reverse-engineering the platform's code or models.",
          ],
        },
        {
          kind: "p",
          text:
            "Breaking these rules can lead to the account being suspended. If that happens we " +
            "will try to explain why.",
        },
      ],
    },
    packages: {
      heading: "Packages and payment",
      body: [
        {
          kind: "kv",
          rows: [
            {
              k: "Free",
              v: "1 field · 1 AI advice per month · no chat · satellite indices and weather included.",
            },
            {
              k: "Pro — 10 AZN/month",
              v: "5 fields · 8 AI advices per month · 50 chat messages per month · field passport, irrigation and spray window.",
            },
            {
              k: "Business — 25 AZN/month",
              v: "Effectively unlimited fields · 30 advices per month · 300 chat messages · 30 photo diagnoses · benchmarks and reports.",
            },
          ],
        },
        {
          kind: "p",
          text:
            "A newly created organisation opens on a 1-month Pro trial and falls back to the free " +
            "package by itself when the trial ends — there is no automatic payment.",
        },
        {
          kind: "p",
          text:
            "The most important note: payment is not connected yet. There is no payment provider " +
            "anywhere in the code, no card or bank data is collected, and packages are currently " +
            "set by hand. When paid plans do go live we will announce it in advance; nothing will " +
            "be charged to anyone without notice.",
        },
        { kind: "p", text: "Prices are shown in AZN." },
      ],
    },
    quotas: {
      heading: "Quotas",
      body: [
        {
          kind: "p",
          text:
            "AI advice, chat and photo diagnosis have monthly limits per package. When a limit is " +
            "reached the request is refused and you are told why; the limit resets the following " +
            "month.",
        },
        {
          kind: "p",
          text:
            "The limits exist to cover the real cost of the AI. We reserve the right to restrict " +
            "use that puts unusual load on the system.",
        },
        {
          kind: "p",
          text:
            "The speed of satellite processing depends on things outside our control — how often " +
            "the satellite passes over your field, and cloud cover.",
        },
      ],
    },
    ownership: {
      heading: "Who owns the data",
      body: [
        {
          kind: "p",
          text:
            "Field boundaries, passport data, notes, photos, ledger rows — all yours. You grant " +
            "us the right to process them in order to deliver the service (store, process, " +
            "analyse, show back to you); nothing beyond that.",
        },
        {
          kind: "ul",
          items: [
            "We do not sell your data and do not pass it on for advertising.",
            "Aggregate figures (comparisons, benchmarks) are computed only over cohorts of at least 5 fields and never identify a specific field.",
            "The platform's code, design, index models and content belong to us.",
            "You are responsible for the content you upload being yours, or yours to upload.",
          ],
        },
      ],
    },
    availability: {
      heading: "Availability",
      body: [
        {
          kind: "p",
          text:
            "The service runs on a single server and is provided on a best-effort basis. There " +
            "is no guaranteed uptime (no SLA); planned and unplanned outages can happen.",
        },
        {
          kind: "p",
          text:
            "Satellite data is not continuous: cloud cover and the satellite's revisit schedule " +
            "can mean days without a new image. That is not a fault — it is how orbits work.",
        },
        {
          kind: "p",
          text:
            "We may add, change or remove features. If we remove something that matters to you, " +
            "we will try to say so in advance.",
        },
      ],
    },
    liability: {
      heading: "Liability",
      body: [
        {
          kind: "p",
          text:
            "Agronomic decisions are yours. Irrigating, fertilising, spraying, harvesting — each " +
            "is a decision made by the person who knows the field, and Agradex takes no " +
            "responsibility for its outcome.",
        },
        {
          kind: "p",
          text:
            "Specifically: if crop loss, reduced yield, higher costs or any other damage results " +
            "from work done (or not done) on the basis of advice from the platform, we do not " +
            "take responsibility for it.",
        },
        {
          kind: "p",
          text:
            "The service is provided \"as is\"; we give no guarantee that the data will be " +
            "complete or accurate.",
        },
        {
          kind: "p",
          text:
            "This section does not limit any rights granted to you by mandatory provisions of " +
            "your local law.",
        },
      ],
    },
    changes: {
      heading: "Changes to these terms",
      body: [
        {
          kind: "p",
          text:
            "As the product changes, these terms will change with it. The date at the top of the " +
            "page shows the last edit.",
        },
        {
          kind: "p",
          text:
            "Material changes — payment going live, for instance — will be announced in advance " +
            "through an in-app notification or by email. Continuing to use the service after a " +
            "change means you accept the new terms.",
        },
      ],
    },
    contact: {
      heading: "Contact",
      body: [
        {
          kind: "p",
          text:
            "Questions, complaints, a request for a copy of your data or for its deletion — all " +
            "go to one address: info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "Formal legal-entity details (company name, registration, address, governing law) do " +
            "not exist yet; this section will be updated once they do.",
        },
      ],
    },
  },
};
