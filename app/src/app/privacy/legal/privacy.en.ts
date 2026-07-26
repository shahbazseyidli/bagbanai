// English privacy policy — a translation of privacy.az.ts. Same section keys, same facts.
import type { PrivacyDoc } from "./types";

export const privacyEn: PrivacyDoc = {
  title: "Privacy policy",
  lead:
    "Agradex is a platform that monitors crop fields using satellite imagery, weather data and " +
    "artificial intelligence. This page is not a legal template — it explains, as it is, what the " +
    "system collects about you, where it keeps it, who it is sent to, and what happens when you " +
    "close your account.",
  summary: [
    "All data is stored inside the EU — on a single server in Helsinki, Finland, in a Postgres database we run ourselves.",
    "There is no advertising tracker, no analytics pixel and no third-party cookie; that is why there is no consent banner.",
    "Field data goes to the AI, account data does not: your name, email and password hash are never sent to the model provider.",
    "The only recurring email is a weekly digest (Wednesdays); one click unsubscribes you.",
    "Closing your account erases the person but keeps the records you wrote — they no longer point to anyone.",
  ],
  sections: {
    scope: {
      heading: "What this document covers",
      body: [
        {
          kind: "p",
          text:
            "This policy applies to agradex.com (the marketing site), app.agradex.com (the app) " +
            "and the installable web app (PWA). They all run on the same server against the same " +
            "database.",
        },
        {
          kind: "p",
          text:
            "One thing up front, for honesty: Agradex is still in development, and no registered " +
            "legal entity (company name, registration number, registered address) has been " +
            "declared behind the product. This document therefore names no formal data " +
            "controller. Every request about your data reaches the team running the platform at " +
            "info@agradex.com.",
        },
        {
          kind: "p",
          text:
            "The document covers our system only. Links that take you off Agradex — for example " +
            "to the official pages of the satellite data sources — have privacy rules of their own.",
        },
      ],
    },
    "account-data": {
      heading: "Account data",
      body: [
        {
          kind: "p",
          text: "This is what we store when you sign up and when you change your settings:",
        },
        {
          kind: "ul",
          items: [
            "Email address — it is your login identifier and is unique.",
            "Password — only as a bcrypt hash. We neither store nor can recover the plain password.",
            "Full name (optional), interface language, country and region.",
            "Role: farmer, laboratory, consulting agronomist or supplier.",
            "Area-unit preference (hectare / dönüm / sotka) — derived from your country if you have not chosen one.",
            "Notification preferences (which channels you switched off) and the email-digest opt-out flag.",
            "For every device on which you turn push notifications on, the subscription the browser hands us (delivery endpoint, encryption keys, browser string) — the row is deleted when you unsubscribe.",
            "Name-visibility preference — whether your name is shown to other users.",
            "The answers to the short quiz on the marketing page (crop, country, region, main problem, needs), if you filled it in before signing up.",
            "Email verification state and a temporary 6-digit code — the code is deleted the moment it is used.",
            "Last-seen time — written at most once an hour, only to know whether the account is still in use.",
          ],
        },
        {
          kind: "p",
          text:
            "There is a phone-number column in the database, but the signup form never asks for " +
            "it — so in practice no phone number is collected. No card or payment data is " +
            "collected at all (see \"Packages and payment\" in the Terms of use).",
        },
      ],
    },
    "field-data": {
      heading: "Field and farm data",
      body: [
        { kind: "p", text: "The substance of the platform is the farm data you enter:" },
        {
          kind: "ul",
          items: [
            "The field boundary drawn on the map and its area (always stored in hectares — the unit setting only affects display).",
            "Field, farm and organisation names.",
            "The field passport: crop, variety, planting and harvest dates, soil type and pH, irrigation method, growth stage, previous crop, free-text notes.",
            "Scouting observations, photos you upload, field operations, yield records, tasks and seasons.",
            "Ledger, sales, inventory and equipment rows, and documents you upload.",
            "Soil laboratory analyses — the scan you upload and the values read out of it by OCR.",
          ],
        },
        { kind: "p", text: "On top of that, the system computes and stores:" },
        {
          kind: "ul",
          items: [
            "Per-scene statistics for 9 indices (NDVI, NDMI and the rest) and raster files clipped to your field.",
            "Weather history, the field wellness score, growing degree days (GDD).",
            "The AI advice text, the inputs it was generated from, which model wrote it and in which language.",
            "AI chat messages, notifications, share-link tokens.",
            "Token and cost accounting for AI usage.",
            "Seven specific product events (quiz started, field created, crop set, first scene seen, advice viewed, Telegram connected, checklist completed) — that list is fixed in the code; nothing else you do is tracked.",
          ],
        },
      ],
    },
    storage: {
      heading: "Where the data lives",
      body: [
        {
          kind: "p",
          text:
            "Everything is stored on a single Hetzner server in Helsinki, Finland (European " +
            "Union). The database is our own Postgres 16 + PostGIS installation running in Docker " +
            "on that machine. Files you upload sit on that server's local disk, and the satellite " +
            "rasters in a separate folder on the same disk.",
        },
        {
          kind: "p",
          text:
            "We use no managed third-party database (such as Supabase) and no third-party object " +
            "storage (S3 and the like) — that is a deliberate architectural decision.",
        },
        {
          kind: "p",
          text:
            "Backups are kept on a server operated by the same team, inside the European Union. " +
            "No formal retention period is configured for backups.",
        },
      ],
    },
    processors: {
      heading: "Who the data is sent to",
      body: [
        {
          kind: "p",
          text:
            "These are the external services the platform uses. The list is complete — we do not " +
            "pass your data to advertising networks, data brokers or marketing platforms, and we " +
            "do not sell it.",
        },
        {
          kind: "kv",
          rows: [
            {
              k: "Anthropic (Claude)",
              v:
                "AI advice, chat, photo diagnosis and the research layer. What goes: field name, " +
                "area, crop passport (including notes), index trends, weather, recent scouting " +
                "notes, operations, open tasks, recent yield records, a summary of the previous " +
                "advice, the last chat turns, and the photo you send for diagnosis. What does " +
                "not: your email, your name, your password hash.",
            },
            {
              k: "Resend",
              v:
                "Email delivery — the recipient address, the greeting name and the message body. " +
                "SMTP is used as a fallback if configured.",
            },
            {
              k: "Open-Meteo",
              v: "The field's centre coordinates, for the 7-day forecast and evapotranspiration (ET0).",
            },
            { k: "ISRIC SoilGrids", v: "The field's coordinates, to fetch a soil profile." },
            {
              k: "FAOSTAT",
              v: "Country-level yield statistics. Nothing about you leaves.",
            },
            {
              k: "EPPO",
              v:
                "The crop name only, and only when an API key is configured. No key is " +
                "configured today, so no request is made to this service at all.",
            },
            {
              k: "NASA Earthdata (HLS) and Copernicus Sentinel-2",
              v:
                "Data flows in, not out: the scene search sends the field's bounding box and a " +
                "date range. No account, name or address is transmitted.",
            },
            {
              k: "OpenStreetMap Nominatim",
              v:
                "The place name you type into the map search (from your browser) and turning a " +
                "coordinate into a place name (from the server).",
            },
            {
              k: "Basemap tile hosts",
              v:
                "Esri World Imagery, EOX s2cloudless, OpenStreetMap, OpenTopoMap and terrain " +
                "tiles load straight into your browser — so those hosts see your IP address and " +
                "which area you are looking at.",
            },
            {
              k: "Your browser's push service",
              v:
                "If you turn push notifications on, the message is delivered through your " +
                "browser's push service (Google, Mozilla or Apple, depending on the browser). " +
                "The text travels encrypted, but the service sees your device's subscription " +
                "endpoint.",
            },
            {
              k: "Telegram",
              v:
                "Only if you connect the bot yourself. No bot token is configured today, so the " +
                "channel is dormant.",
            },
          ],
        },
      ],
    },
    ai: {
      heading: "Artificial intelligence",
      body: [
        {
          kind: "p",
          text:
            "Advice, chat and photo diagnosis run on Anthropic's Claude models. The context sent " +
            "to the model is about the field, not about your identity — the code that assembles " +
            "it reads no column from the accounts table.",
        },
        {
          kind: "p",
          text:
            "The token count and estimated cost of every AI call is recorded in our own database, " +
            "for quota accounting and cost control.",
        },
        {
          kind: "p",
          text:
            "If the AI key is removed from the configuration the system degrades gracefully: no " +
            "advice is generated, chat stops answering, and everything else keeps working.",
        },
        {
          kind: "p",
          text:
            "AI answers are automated analysis and can be wrong. Their limits are set out " +
            "separately in the Terms of use.",
        },
      ],
    },
    email: {
      heading: "Email",
      body: [
        {
          kind: "p",
          text:
            "The only recurring message is the weekly digest — sent every Wednesday at 07:00 " +
            "Baku time, and technically incapable of being sent more than once a week.",
        },
        {
          kind: "p",
          text:
            "Apart from that there are only transactional messages: the verification code, the " +
            "welcome mail and the report that arrives when your field is ready for the first " +
            "time. Each of those is sent at most once per 24 hours.",
        },
        {
          kind: "p",
          text:
            "Every digest carries a one-click unsubscribe link at the bottom — no login " +
            "required. You can switch the same setting off on the account page. Note: even after " +
            "unsubscribing, transactional messages (such as the verification code) keep arriving, " +
            "because the account does not work without them.",
        },
        {
          kind: "p",
          text:
            "We send no advertising mail and share your address with no one. For honesty: the " +
            "digest currently reaches Turkish, German, Hungarian, Italian and Polish readers in " +
            "English — the translation is not finished yet.",
        },
      ],
    },
    cookies: {
      heading: "Cookies and browser storage",
      body: [
        { kind: "p", text: "There are two cookies, both functional:" },
        {
          kind: "ul",
          items: [
            "bagban_session — the login session. httpOnly (JavaScript cannot read it), SameSite=Lax, Secure over https, 7 days. It is used for nothing else.",
            "bagban_locale — remembers the language you chose, 1 year.",
          ],
        },
        {
          kind: "p",
          text:
            "That is all. There is no Google Analytics, Google Tag Manager, Plausible, Hotjar, " +
            "Mixpanel, PostHog, Facebook pixel or any other tracker anywhere in the code. That is " +
            "precisely why the site shows you no cookie consent banner — there is nothing to ask " +
            "about.",
        },
        {
          kind: "p",
          text:
            "Separately, your browser's local storage holds a few interface preferences: the " +
            "basemap, data-saver mode, the offline queue, the state of the getting-started " +
            "checklist, and the answers to the quiz you filled in before signing up. They stay on " +
            "your device; the quiz answers travel to the server only together with the signup " +
            "request.",
        },
      ],
    },
    visibility: {
      heading: "Who can see your data",
      body: [
        {
          kind: "ul",
          items: [
            "Other members of your organisation — they see its fields according to their role; the permission is checked on the server on every request.",
            "A share link (/s/…) shows a deliberately minimal, read-only field card to anyone holding it. You can revoke the link at any time.",
            "If you switch name visibility off, your name is replaced by a \"user_…\" alias on every surface other users see.",
            "Comparison and benchmark figures are not computed without a cohort of at least 5 other fields, and they never name a specific field or farm.",
            "The team running the platform — through an admin panel that sees usage, AI cost and accounts across all organisations, and, as the server's operators, with technical access to the database.",
          ],
        },
      ],
    },
    retention: {
      heading: "Retention and deletion",
      body: [
        {
          kind: "p",
          text:
            "Deleting a field is a soft delete: it disappears from the list and can be restored; " +
            "it is not physically removed from the database.",
        },
        {
          kind: "p",
          text:
            "Closing your account (the button on the account page) is irreversible and does " +
            "exactly this:",
        },
        {
          kind: "ul",
          items: [
            "You have to type your own email address to confirm.",
            "If an organisation you own still has other active members, the request is refused — hand the organisation over first.",
            "All memberships are deleted, so access ends immediately.",
            "Fields of organisations where you were the only member are soft-deleted.",
            "The email address is rewritten to a non-routable internal address — which frees your real address, so you can register with it again.",
            "Name, country, region, quiz answers and notification preferences are cleared; the password hash is replaced with a value no password can produce; the account is deactivated.",
          ],
        },
        {
          kind: "p",
          text:
            "What survives: the records you wrote — fields, boundaries, observations, ledger " +
            "rows, yields. The reason is technical and we are not hiding it: fifteen tables " +
            "reference the user, and a cascading delete would destroy a whole farm's history " +
            "because one worker left. Those records stay, but they no longer point to an " +
            "identifiable person. The usage ledger, the email send log and the event rows keep a " +
            "user identifier that no longer resolves to anyone.",
        },
        {
          kind: "p",
          text: "There is no automatic expiry for satellite or derived data.",
        },
      ],
    },
    rights: {
      heading: "Your rights and what you can do today",
      body: [
        { kind: "p", text: "All of this is on the account page, immediately, by yourself:" },
        {
          kind: "ul",
          items: [
            "Change your password.",
            "Edit your name, country and region.",
            "Change the interface language and the area unit.",
            "Adjust the notification matrix (category × channel).",
            "Switch off name visibility.",
            "Opt out of the email digest.",
            "Close the account.",
          ],
        },
        {
          kind: "p",
          text: "Field boundaries can be downloaded as GeoJSON or KML from the field creation screen.",
        },
        {
          kind: "p",
          text:
            "There is no automated full-account export yet — we are not hiding that. If you want " +
            "a copy of your data or its complete deletion, write to info@agradex.com and we will " +
            "prepare it by hand.",
        },
      ],
    },
    changes: {
      heading: "Changes",
      body: [
        {
          kind: "p",
          text:
            "This document describes the system, so it has to change when the system does. The " +
            "date of the last update is shown at the top of the page.",
        },
        {
          kind: "p",
          text:
            "Any material change to what is collected or where it is sent will be announced in " +
            "advance, through an in-app notification or the weekly digest.",
        },
      ],
    },
  },
};
