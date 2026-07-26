"use client";

// One scouting note, opened by tapping its pin on the map or its row in the list (6.5).
//
// Rendered INLINE at the top of the section, not as a fixed or sticky overlay. Two reasons: the
// map card sits directly above, so an inline panel keeps the pin and its note on screen together
// instead of covering the picture the farmer just tapped; and this project's map rules are
// unforgiving about position — a sticky ancestor leaves a MapLibre canvas blank until something
// forces a resize, and a fixed sheet at z-40 would fight BottomNav for the same layer.
//
// Every write here is online-only, and the panel says so rather than pretending. lib/offlineQueue
// can only replay a POST of a NEW note; queueing a PATCH against a row the server may never have
// seen would either 404 forever (its flush loop retries failures indefinitely) or apply out of
// order against an edit made from another device.
import { useEffect, useRef, useState } from "react";
import { Check, MapPin as MapPinIcon, RotateCcw, Trash2, X } from "lucide-react";
import { ApiError, api, apiAsset, azError } from "@/lib/api";
import { t, tf, type I18nKey } from "@/lib/i18n";
import { ErrorNote, Field as FormField } from "@/components/ui";
import PinPicker from "./PinPicker";
import { DEFAULT_PIN_COLOR, isResolved } from "./pins";
import type { Scouting } from "@/lib/types";

const CATEGORIES = ["pest", "disease", "weed", "nutrient", "water", "damage", "other"] as const;

function catLabel(c: string): string {
  return t(`scout.cat.${c}` as I18nKey);
}

function day(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function ScoutNoteSheet({
  note,
  onClose,
  onChanged,
  onShowOnMap,
}: {
  note: Scouting;
  onClose: () => void;
  /** Reload the list — the panel does not own the data, only this one edit. */
  onChanged: (message: string) => void;
  /** Undefined when no map is on screen; the button is then not offered at all. */
  onShowOnMap?: (lng: number, lat: number) => void;
}) {
  const [category, setCategory] = useState(note.category);
  const [severity, setSeverity] = useState(note.severity != null ? String(note.severity) : "");
  const [color, setColor] = useState<string>(note.color ?? DEFAULT_PIN_COLOR);
  const [text, setText] = useState(note.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Re-seed when the farmer taps a DIFFERENT pin without closing the panel: the component stays
  // mounted, so the fields would otherwise still hold the previous note's values.
  //
  // Keyed on note.id ALONE, deliberately. The parent reloads the whole list after every write, so
  // depending on the note's contents would re-seed the form on each reload — and "Mark as
  // resolved" reloads too, which would silently throw away text the farmer had typed but not yet
  // saved. A different note is the only event that should overwrite the fields.
  useEffect(() => {
    setCategory(note.category);
    setSeverity(note.severity != null ? String(note.severity) : "");
    setColor(note.color ?? DEFAULT_PIN_COLOR);
    setText(note.note ?? "");
    setError("");
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const resolved = isResolved(note);
  const locked = busy || !online;

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/scouting/${note.id}`, body);
      onChanged(message);
    } catch (err) {
      setError(azError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    await patch(
      {
        category,
        // "" clears the severity rather than sending NaN; the endpoint accepts null explicitly.
        severity: severity === "" ? null : Number(severity),
        note: text || null,
        color,
      },
      t("app.field.scouting.saved"),
    );
  }

  async function onToggleResolved() {
    await patch(
      { status: resolved ? "open" : "resolved" },
      resolved ? t("app.field.scouting.open") : t("app.field.scouting.resolved"),
    );
  }

  async function onDelete() {
    // The confirmation carries the pointer to "resolve" deliberately: deleting to mean "done" is
    // what turns a record back into a to-do list, and it is the mistake this dialog exists to catch.
    if (!window.confirm(`${t("app.field.scouting.deleteConfirm")}\n\n${t("app.field.scouting.deleteHint")}`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.del(`/api/scouting/${note.id}`);
      onChanged(t("app.field.scouting.deleted"));
    } catch (err) {
      setError(
        err instanceof ApiError && err.detail === "scouting_delete_forbidden"
          ? t("app.field.scouting.deleteForbidden")
          : azError(err),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="rounded-xl border-[1.5px] border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">{t("app.field.scouting.noteTitle")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {day(note.observed_at)} ·{" "}
            {resolved ? t("app.field.scouting.resolved") : t("app.field.scouting.open")}
          </p>
          {resolved && note.resolved_at && (
            <p className="text-xs text-slate-500">
              {tf("app.field.scouting.resolvedOn", { date: day(note.resolved_at) })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label={t("scout.category")}>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("scout.severity")}>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          />
        </FormField>
      </div>

      <div className="mt-3">
        <FormField label={t("app.field.scouting.color")}>
          <PinPicker value={color} onChange={setColor} />
        </FormField>
      </div>

      <div className="mt-3">
        <FormField label={t("scout.note")}>
          <textarea className="input h-20" value={text} onChange={(e) => setText(e.target.value)} />
        </FormField>
      </div>

      {note.photos && note.photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={apiAsset(note.photos[0])}
          alt=""
          className="mt-3 h-32 w-32 rounded object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="tabular-nums">
          {note.lat != null && note.lon != null
            ? tf("app.field.scouting.coords", {
                lat: note.lat.toFixed(5),
                lon: note.lon.toFixed(5),
              })
            : t("app.field.scouting.noCoords")}
        </span>
        {onShowOnMap && note.lat != null && note.lon != null && (
          <button
            type="button"
            onClick={() => onShowOnMap(note.lon as number, note.lat as number)}
            className="min-h-9 font-semibold text-emerald-700 hover:underline"
          >
            {t("app.field.scouting.showOnMap")}
          </button>
        )}
      </div>

      <ErrorNote message={error} />
      {!online && (
        <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {t("app.field.scouting.offlineLocked")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={locked}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <button
          type="button"
          onClick={onToggleResolved}
          disabled={locked}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          {resolved ? (
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          {resolved ? t("app.field.scouting.reopen") : t("app.field.scouting.resolve")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={locked}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t("common.remove")}
        </button>
      </div>
    </div>
  );
}
