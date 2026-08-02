// Locale overlay for the long-form marketing content (solutions + guide content.ts).
//
// content.ts stays the az source of truth. For any other locale we deep-clone the az object and
// overlay translated leaves by dotted path (e.g. "SEGMENTS.fermer.headline"). Missing paths keep
// the az text, so a partial translation degrades gracefully. Structural fields (slug/icon/accent/
// visual/href/tone/id) were never extracted, so they are never overwritten.
import type { Locale } from "@/lib/i18n";
import { en } from "@/lib/content-locales/en";
import { ru } from "@/lib/content-locales/ru";
import { tr } from "@/lib/content-locales/tr";
import { de } from "@/lib/content-locales/de";
import { hu } from "@/lib/content-locales/hu";
import { it } from "@/lib/content-locales/it";
import { pl } from "@/lib/content-locales/pl";
import { es } from "@/lib/content-locales/es";

export type ContentOverlay = Record<string, string>;
const OVERLAY: Partial<Record<Locale, ContentOverlay>> = { en, ru, tr, de, hu, it, pl, es };

export function overlayFor(locale?: Locale | null): ContentOverlay | undefined {
  return locale && locale !== "az" ? OVERLAY[locale] : undefined;
}

/** Deep-clone `obj` and replace string leaves whose `${prefix}.<path>` is in the locale overlay. */
export function localize<T>(obj: T, prefix: string, locale?: Locale | null): T {
  const ov = overlayFor(locale);
  if (!ov) return obj;
  const clone = structuredClone(obj) as unknown;
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => {
        if (typeof v === "string") {
          const t = ov[`${path}.${i}`];
          if (t != null) node[i] = t;
        } else walk(v, `${path}.${i}`);
      });
    } else if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      for (const k of Object.keys(rec)) {
        const v = rec[k];
        if (typeof v === "string") {
          const t = ov[`${path}.${k}`];
          if (t != null) rec[k] = t;
        } else walk(v, `${path}.${k}`);
      }
    }
  };
  walk(clone, prefix);
  return clone as T;
}
