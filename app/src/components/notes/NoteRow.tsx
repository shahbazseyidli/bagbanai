"use client";

// One row of the farm-wide log. Everything on it comes off the note itself, except the picture,
// which comes off the org's thumbs read model.
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { apiAsset } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { sectionHref } from "@/lib/fieldSections";
import { isResolved, pinHex } from "@/components/field/scouting/pins";
import SeverityScale from "./SeverityScale";
import { categoryLabel, type FieldThumb, type OrgScoutingNote } from "./noteTypes";
import { timeOf } from "./noteDay";

/**
 * Teardown §4.1 — the field's OWN SHAPE as its thumbnail, NDVI-coloured, instead of a generic
 * square.
 *
 * Source: GET /api/orgs/{id}/thumbs, whose `url` indices.py::preview_url() already builds as a
 * field-masked TiTiler preview.png — the identical transform that components/field/layers/
 * previewUrl.ts::scenePreviewUrl applies on the client, against the same clipped, boundary-masked
 * COG and the same _raster_style colormap. So the picture IS the field, and the machinery is
 * reused rather than rebuilt.
 *
 * Calling scenePreviewUrl here instead would first need a tile_url per field, i.e. one
 * GET /api/fields/{id}/scenes for every field that has a note — N round-trips on a phone to
 * decorate a list. One org-wide read is what /fields already pays for exactly these pictures.
 */
function FieldShapeThumb({ thumb, loading }: { thumb?: FieldThumb; loading: boolean }) {
  const [broken, setBroken] = useState(false);
  // Still fetching: a neutral square keeps the row heights from jumping when the pictures land.
  if (loading) return <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />;
  // No raster yet, or TiTiler could not render it → NOTHING. A grey placeholder would be a picture
  // of data this field does not have. Same rule as the /fields list.
  if (!thumb?.url || broken) return null;
  return (
    <img
      src={thumb.url}
      // Decorative: the field's name is printed right beside it, and a screen reader cannot read a
      // colour ramp.
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      title={tf("app.fieldsList.thumbTitle", { date: thumb.date?.slice(0, 10) ?? "" })}
      onError={() => setBroken(true)}
      // No Tailwind utility for image-rendering; a field COG is ~30x25px on purpose and must stay a
      // crisp shape when the browser upscales it.
      style={{ imageRendering: "pixelated" }}
      className="h-12 w-12 shrink-0 rounded-lg border border-line bg-slate-100 object-contain"
    />
  );
}

export function NoteRow({
  note,
  thumb,
  thumbsLoading,
}: {
  note: OrgScoutingNote;
  thumb?: FieldThumb;
  thumbsLoading: boolean;
}) {
  const [photoBroken, setPhotoBroken] = useState(false);
  const resolved = isResolved(note);
  // field_name is missing only if the payload omitted it — never a name assembled from the id.
  const fieldName = note.field_name || t("app.notes.fieldUnknown");
  const photo = note.photos?.[0] ?? null;
  const hasLocation = note.lat != null && note.lon != null;

  // Built by the section taxonomy, never hand-assembled: the ?tab= value stays typed as SectionKey,
  // it follows any future rename, and sectionHref's own sp.delete("map") rule applies for free.
  const href = sectionHref(`/fields/${note.field_id}`, "", "scouting");

  return (
    <li>
      <Link
        href={href}
        // Faded, never hidden. The endpoint returns resolved notes on purpose — "resolved is not
        // deleted" only means something if the row still arrives — so this screen has no
        // "hide resolved" control at all.
        className={`flex min-h-[var(--tap)] items-start gap-3 rounded-xl2 border border-line bg-panel px-3 py-3 transition hover:border-grass hover:shadow-soft ${
          resolved ? "opacity-60" : ""
        }`}
      >
        <FieldShapeThumb thumb={thumb} loading={thumbsLoading} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* The colour the farmer picked for the pin, from the one name→hex table. */}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: pinHex(note.color) }}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-bold text-ink">{fieldName}</span>
            <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-soft">
              {timeOf(note.observed_at)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">
              {categoryLabel(note.category)}
            </span>
            <SeverityScale value={note.severity} />
            {resolved && (
              <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">
                {t("app.field.scouting.resolved")}
              </span>
            )}
            {hasLocation && (
              // The icon says a location exists; the coordinates themselves belong on the field's
              // map, not printed as numbers in a list.
              <span title={t("app.notes.hasLocation")} className="inline-flex shrink-0">
                <MapPin className="h-3.5 w-3.5 text-ink-soft" aria-hidden="true" />
              </span>
            )}
          </div>

          {note.note && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{note.note}</p>}
        </div>

        {/* Only the FIRST photo — the scouting section behind this row owns the rest. Its own
            `broken` state, the FieldThumb precedent, so one dead upload cannot blank a row. */}
        {photo && !photoBroken && (
          <img
            src={apiAsset(photo)}
            // Not decorative: for a note with no text, the photo IS the content.
            alt={t("app.notes.photoAlt")}
            loading="lazy"
            decoding="async"
            onError={() => setPhotoBroken(true)}
            className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
          />
        )}

        {/* The destination, spoken rather than shown. Not an aria-label on the Link itself: that
            would REPLACE the row's content as the accessible name and take the note text with it. */}
        <span className="sr-only">{tf("app.notes.openField", { field: fieldName })}</span>
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      </Link>
    </li>
  );
}

export default NoteRow;
