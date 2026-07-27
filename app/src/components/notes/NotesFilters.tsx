"use client";

// Two chip rows, both derived from the LOADED NOTES — no extra request, and you can only filter by
// something that is actually in the log.
//
// Each row appears only when it would offer a choice: with one field, or with only pest notes, the
// row is not rendered at all. A farmer with a single field and a single category therefore sees no
// filter chrome whatsoever, which is the point — a filter over one option is furniture.
import { t } from "@/lib/i18n";
import { categoryLabel, type OrgScoutingNote } from "./noteTypes";

interface Option {
  value: string;
  label: string;
}

/** Distinct fields in the log, in the order they first appear (i.e. most recently written first). */
function fieldOptions(items: OrgScoutingNote[]): Option[] {
  const seen = new Map<string, string>();
  for (const n of items) {
    if (!seen.has(n.field_id)) seen.set(n.field_id, n.field_name || t("app.notes.fieldUnknown"));
  }
  return Array.from(seen).map(([value, label]) => ({ value, label }));
}

function categoryOptions(items: OrgScoutingNote[]): Option[] {
  const seen = new Set<string>();
  const out: Option[] = [];
  for (const n of items) {
    if (seen.has(n.category)) continue;
    seen.add(n.category);
    out.push({ value: n.category, label: categoryLabel(n.category) });
  }
  return out;
}

function chipCls(active: boolean): string {
  // --tap is the project's 48px touch floor; these are the first thing a thumb lands on.
  return `min-h-[var(--tap)] shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-sm font-medium transition ${
    active
      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
      : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300"
  }`;
}

function ChipRow({
  aria,
  allLabel,
  options,
  value,
  onChange,
}: {
  aria: string;
  allLabel: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    // role="group" with aria-pressed buttons, not a tablist: these filter a list in place, they do
    // not switch between panels. The negative margin lets the row bleed to the screen edge while
    // the first and last chip keep their padding.
    <div role="group" aria-label={aria} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button type="button" aria-pressed={value === ""} onClick={() => onChange("")} className={chipCls(value === "")}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={chipCls(value === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NotesFilters({
  items,
  fieldFilter,
  catFilter,
  onFieldChange,
  onCatChange,
}: {
  /** The FULL log, not the filtered view — otherwise picking one chip would erase the others. */
  items: OrgScoutingNote[];
  fieldFilter: string;
  catFilter: string;
  onFieldChange: (v: string) => void;
  onCatChange: (v: string) => void;
}) {
  const fields = fieldOptions(items);
  const cats = categoryOptions(items);
  const showFields = fields.length >= 2;
  const showCats = cats.length >= 2;
  if (!showFields && !showCats) return null;

  return (
    <div className="space-y-1.5">
      {showFields && (
        <ChipRow
          aria={t("app.notes.filterFieldsAria")}
          allLabel={t("app.notes.filterAllFields")}
          options={fields}
          value={fieldFilter}
          onChange={onFieldChange}
        />
      )}
      {showCats && (
        <ChipRow
          aria={t("app.notes.filterCategoriesAria")}
          allLabel={t("app.notes.filterAllCategories")}
          options={cats}
          value={catFilter}
          onChange={onCatChange}
        />
      )}
    </div>
  );
}

export default NotesFilters;
