"use client";

// Fields OTHER people have shared with me (migration 0061).
//
// This is the receiving end of GrantAccess. An agronomist who advises five farmers has no
// organization in common with any of them, so before this there was nowhere in the product those
// five fields could appear — the grant existed in the database and was invisible to the person it
// was for.
//
// EACH ENTRY OPENS THE REPORT, not the field page, because the report is exactly what the grant
// authorises: one read-only document about one field. The server enforces that bound (only
// /api/fields/{id}/report calls require_field_read); the link here simply does not pretend
// otherwise by pointing somewhere that would 403.
//
// RENDERS NOTHING WHEN THE LIST IS EMPTY, which is the normal case for a farmer. An empty state
// explaining a feature you are not using is clutter on the screen everyone opens most.
import { useEffect, useState } from "react";
import { FileText, Users } from "lucide-react";
import { api } from "@/lib/api";
import { t, tf } from "@/lib/i18n";
import { formatArea, useAreaUnit } from "@/lib/units";

interface SharedField {
  id: string;
  name: string;
  area_ha: number | null;
  crop_type: string | null;
  shared_by: string | null;
  shared_at: string | null;
}

export default function SharedWithMe() {
  const [items, setItems] = useState<SharedField[]>([]);
  const areaUnit = useAreaUnit();

  useEffect(() => {
    let active = true;
    api
      .get<SharedField[]>("/api/shared-fields")
      .then((r) => {
        if (active) setItems(r);
      })
      .catch(() => {
        // Silent: a server that predates the endpoint, or a signed-out race. Nothing here is worth
        // an error banner on the fields list.
      });
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-slate-500">
        <Users className="h-4 w-4" aria-hidden="true" />
        {t("app.field.sharedWithMe.title")}
      </h2>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.map((f) => (
          <li key={f.id}>
            <a
              href={`/api/fields/${f.id}/report`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[var(--tap)] items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
            >
              <FileText className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">{f.name}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {f.area_ha != null ? formatArea(f.area_ha, areaUnit) : "—"}
                  {f.shared_by
                    ? ` · ${tf("app.field.sharedWithMe.by", { who: f.shared_by })}`
                    : ""}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
