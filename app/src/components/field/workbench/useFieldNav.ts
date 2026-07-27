"use client";

// Where this field sits among the org's fields — the data behind the desktop "previous / next
// field" row and the breadcrumb above the map.
//
// It lives under workbench/ because that directory is about the field screen's FRAME (the stage
// measurement, the wide layout) rather than about any one card; the header is part of that frame.
//
// The org is taken from the field itself (FieldDetail carries org_id), never from orgs[0]: a user
// who belongs to two organisations would otherwise get the other org's field list next to this
// org's field. The module-level cache mirrors FieldHeader's own five-minute pattern, so walking
// through six fields with the arrows costs ONE round-trip, not six.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Farm, Field, Org } from "@/lib/types";

export interface FieldNavEntry {
  id: string;
  name: string;
}

export interface FieldNav {
  /** Org fields in the order the field list shows them; [] until loaded (or on any failure). */
  fields: FieldNavEntry[];
  /** Position of the current field, or -1 when it is not in the list yet. */
  pos: number;
  orgName: string | null;
  /** How many orgs this user belongs to — the breadcrumb only names the org when it is >1. */
  orgCount: number;
  farmName: string | null;
}

const EMPTY: FieldNav = { fields: [], pos: -1, orgName: null, orgCount: 0, farmName: null };

// Same shape and the same reason as FieldHeader's cache: writes only happen inside effects, i.e.
// only in the browser, so this map can never be shared between users on the server. Its job is to
// stop a remount — a section change, a walk to the next field — from re-asking a read-only question.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

function cachedGet<T>(key: string, run: () => Promise<T | null>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at <= CACHE_MS) return Promise.resolve((hit.value as T | null) ?? null);
  const busy = inflight.get(key);
  if (busy) return busy as unknown as Promise<T | null>;
  // Everything here is garnish: a 403/404/offline must leave the header rendering, minus the row.
  const p = run()
    .catch(() => null)
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      inflight.delete(key);
      return value;
    });
  inflight.set(key, p);
  return p;
}

interface GeoRow {
  id: string;
  name: string;
}

async function loadFields(orgId: string): Promise<FieldNavEntry[]> {
  // One call for every field of the org that has geometry — the same endpoint and the same order as
  // the MULTI-FIELD MAP (TodayHome/DashboardMap), so the arrows walk the fields in the order the
  // reader last saw them on the dashboard.
  //
  // NOT the same as the /fields page, which fans out /api/orgs → /api/farms → /api/fields and
  // concatenates per farm; with more than one farm those two orders genuinely differ. An earlier
  // version of this comment claimed they were the same endpoint. They are not.
  const g = await api.get<{ fields: GeoRow[] }>(`/api/fields/geo?org_id=${orgId}`).catch(() => null);
  const list = (g?.fields ?? []).map((f) => ({ id: f.id, name: f.name }));
  if (list.length > 0) return list;

  // Fallback for an OUTAGE on /geo — not for a geometry-less field. /geo does filter on
  // `f.geom is not null`, but this only runs when the list came back completely empty, so a farm
  // that has one drawn field and one undrawn one still returns the drawn one and never reaches
  // here. Covering that case properly would mean merging both sources, which costs a request per
  // farm on every field page; the walk is over fields that have a map, and that is the honest
  // description of it.
  const farms = await api.get<Farm[]>(`/api/farms?org_id=${orgId}`).catch(() => null);
  const lists = await Promise.all(
    (farms ?? []).map((f) => api.get<Field[]>(`/api/fields?farm_id=${f.id}`).catch(() => [] as Field[])),
  );
  return lists.flat().map((f) => ({ id: f.id, name: f.name }));
}

export function useFieldNav(
  fieldId: string,
  orgId: string | null | undefined,
  farmId: string | null | undefined,
  /** false ⇒ ask for nothing. The narrow field screen has no previous/next row to fill. */
  enabled: boolean,
): FieldNav {
  const [nav, setNav] = useState<FieldNav>(EMPTY);

  useEffect(() => {
    if (!enabled || !orgId) {
      setNav(EMPTY);
      return;
    }
    let alive = true;
    void (async () => {
      const [fields, orgs, farms] = await Promise.all([
        cachedGet<FieldNavEntry[]>(`nav:fields:${orgId}`, () => loadFields(orgId)),
        cachedGet<Org[]>("nav:orgs", () => api.get<Org[]>("/api/orgs")),
        farmId
          ? cachedGet<Farm[]>(`nav:farms:${orgId}`, () => api.get<Farm[]>(`/api/farms?org_id=${orgId}`))
          : Promise.resolve(null),
      ]);
      if (!alive) return;
      const list = fields ?? [];
      setNav({
        fields: list,
        pos: list.findIndex((f) => f.id === fieldId),
        orgName: (orgs ?? []).find((o) => o.id === orgId)?.name ?? null,
        orgCount: (orgs ?? []).length,
        farmName: farmId ? ((farms ?? []).find((f) => f.id === farmId)?.name ?? null) : null,
      });
    })();
    return () => {
      alive = false;
    };
  }, [fieldId, orgId, farmId, enabled]);

  return nav;
}
