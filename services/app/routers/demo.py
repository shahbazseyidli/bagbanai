"""The public demo-field tour (GET /api/public/demo). NO authentication.

This is the second unauthenticated field route after /api/public/share/{token}, and it lives in its
own module because its security model is the OPPOSITE of a share link's. There the token IS the
capability — mint it, revoke it, expire it, count the views. Here there is no capability at all:
one boolean on one row, set by a platform admin, and the payload is richer (wellness, advice,
weather). Folding that into shares.py would make its docstring false about half its own file.

WHY NO OTHER FIELD CAN EVER BE READ:
  * The route signature takes NO path param, NO query param and NO body. There is no input to
    poison — a caller cannot even express "some other field".
  * The only predicate is `where f.is_demo and f.deleted_at is null`, and migration 0050's partial
    unique index `fields_one_demo_idx` makes at most one row satisfiable. `limit 1` caps it even if
    that index were ever dropped.
  * Every downstream query is keyed on the field_id resolved FROM THAT ROW, never from anything the
    caller sent.
  * Nothing flagged / soft-deleted → 404 `not_found`, the same shape shares.py returns. No 403, no
    "a demo exists but…".
  * The payload is an EXPLICIT whitelist assembled key by key. `dict(row)` is never returned, and
    the wellness component `detail` blobs are rebuilt from exactly the six keys the frontend reads,
    so a future key added to a component's `extra` cannot silently ship to the public internet.

WHAT IS DELIBERATELY ABSENT: org_id, farm_id, field_id, farm name, owner name/email, created_by,
the metadata notes / target yield / prior yields / pest and fertilizer history, every ledger, cost,
yield, task and scouting row, knowledge-passport blocks and share tokens. No id of any kind appears
in the JSON.

COST: five indexed SELECTs and ZERO writes. Wellness is READ from public.field_wellness rather than
computed for the same reason GET /api/orgs/{id}/wellness never computes — one compute_wellness runs
~8 queries and would be a DoS lever on a route with no auth in front of it. Advice is read from
public.advice; the demo never calls the LLM.
"""
import json
from typing import Any, Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request

from ..ai import wellness as wellness_mod
from ..config import settings
from ..db import connection

router = APIRouter(prefix="/api", tags=["demo"])

# Fixed on purpose — the tour narrates crop cover, and there is no parameter that could pivot the
# public payload to another index.
DEMO_INDEX = "NDVI"
# How many dates the timeline strip offers. Small enough that the page stays light on a 3G phone.
TIMELINE_LIMIT = 8
FORECAST_DAYS = 5

# The exact keys lib/wellnessText.ts reads out of a component's `detail`. Rebuilding the blob from
# this tuple (instead of passing `extra` through) is what keeps a future backend field from leaking.
_DETAIL_KEYS = ("reason_code", "reason_params", "calibrated", "crop", "baseline", "delta")

_LOCALES = {"az", "en", "ru", "tr", "de", "hu", "it", "pl"}


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _iso(v) -> Optional[str]:
    return v.isoformat() if v is not None else None


def _locale(request: Request) -> str:
    """The reader's language, for picking which stored advice row to serve. Header before cookie for
    the reason advice.py documents: the app host and the marketing apex can each hold a
    `bagban_locale` cookie and the two can disagree. X-Locale is whatever t() renders with."""
    for cand in ((request.headers.get("x-locale") or "").strip().lower(),
                 request.cookies.get("bagban_locale")):
        if cand and cand in _LOCALES:
            return cand
    return "az"


def _jsonb(raw) -> Any:
    """jsonb → python; tolerant of asyncpg handing back a str depending on the codec."""
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except ValueError:
            return None
    return raw


def _component(c: dict) -> dict:
    """One wellness component, whitelisted key by key (see the module docstring)."""
    detail = c.get("detail") if isinstance(c.get("detail"), dict) else {}
    return {
        "key": c.get("key"),
        "label": c.get("label"),
        "label_code": c.get("label_code"),
        "score": _f(c.get("score")),
        "weight": _f(c.get("weight")),
        "weight_pct": c.get("weight_pct"),
        "reason": c.get("reason"),
        "detail": {k: detail[k] for k in _DETAIL_KEYS if k in detail},
    }


@router.get("/public/demo")
async def public_demo(request: Request):
    """The single demo field, read-only. Takes no parameter of any kind — see the module docstring
    for why that is the security guarantee and not merely a convenience."""
    locale = _locale(request)

    async with connection(None) as conn:
        row = await conn.fetchrow(
            """select f.id, f.name, f.area_ha,
                      st_asgeojson(f.geom) as geom,
                      st_asgeojson(coalesce(f.centroid, st_centroid(f.geom))) as centroid,
                      m.crop_type, m.region
               from public.fields f
               left join public.field_metadata m on m.field_id = f.id
               where f.is_demo and f.deleted_at is null
               limit 1""")
        if row is None:
            raise HTTPException(status_code=404, detail="not_found")
        field_id = str(row["id"])

        # Newest STORED score. Never computed here — see the module docstring.
        wrow = await conn.fetchrow(
            """select score, tone, components, missing, computed_on
               from public.field_wellness
               where field_id=$1::uuid and score is not null
               order by computed_on desc limit 1""", field_id)

        # Prefer Sentinel-2 (10m) over NASA HLS (30m) — the same rule shares.py applies, for the
        # same reason: this is a main view and must show the finer scene when one exists.
        # distinct on (acquired_at) keeps the least-cloudy scene of each day.
        scene_rows = await conn.fetch(
            """select storage_path, acquired_at, cloud_pct, mean from (
                 select distinct on (r.acquired_at)
                        r.storage_path, r.acquired_at, s.cloud_pct, st.mean, r.sensor
                 from public.index_rasters r
                 join public.scenes s on s.id = r.scene_id
                 left join public.index_stats st
                        on st.scene_id = r.scene_id and st.index_name = r.index_name
                 where r.field_id=$1::uuid and r.index_name=$2
                 order by r.acquired_at, (r.sensor = 'S2') desc, s.cloud_pct asc nulls last
               ) t order by acquired_at desc limit $3""",
            field_id, DEMO_INDEX, TIMELINE_LIMIT)

        # Prose is stored per language: serve the reader's when it exists, otherwise the newest row
        # with its own `lang` attached so the page can say which language it is in.
        arow = await conn.fetchrow(
            """select summary, findings, disclaimer, lang
               from public.advice where field_id=$1::uuid
               order by (lang = $2) desc, generated_at desc limit 1""", field_id, locale)

        # Numbers only — nothing here needs localizing. distinct on keeps the freshest fetch of each
        # forecast day, and the limit applies AFTER that dedup, so it really is five days.
        wx_rows = await conn.fetch(
            """select distinct on (forecast_date)
                      forecast_date, t_min, t_max, precip_mm, precip_prob
               from public.weather_cache
               where field_id=$1::uuid and forecast_date >= current_date
               order by forecast_date, fetched_at desc limit $2""", field_id, FORECAST_DAYS)

    wellness = None
    if wrow is not None:
        score = int(wrow["score"])
        tone = wrow["tone"] or wellness_mod._tone(float(score))
        comps = _jsonb(wrow["components"])
        comps = comps if isinstance(comps, dict) else {}
        _worst, headline_code, headline_params = wellness_mod.headline_from_components(
            score, tone, comps)
        wellness = {
            "score": score,
            "tone": tone,
            "headline_code": headline_code,
            "headline_params": headline_params,
            "components": {k: _component(c) for k, c in comps.items() if isinstance(c, dict)},
            "missing": list(wrow["missing"] or []),
            "computed_on": _iso(wrow["computed_on"]),
        }

    timeline = []
    for r in scene_rows:
        tile_url = None
        if r["storage_path"]:
            # Clipped, field-masked COG (one per scene+index) — it holds nothing outside this
            # field's boundary, so serving it publicly exposes no other field.
            url_param = quote(r["storage_path"], safe="")
            tile_url = (f"{settings.titiler_public_base}/cog/tiles/WebMercatorQuad/"
                        f"{{z}}/{{x}}/{{y}}.png?url={url_param}"
                        "&colormap_name=rdylgn&rescale=-0.1,0.9")
        value = _f(r["mean"])
        timeline.append({
            "date": _iso(r["acquired_at"]),
            "value": round(value, 3) if value is not None else None,
            "cloud_pct": _f(r["cloud_pct"]),
            "tile_url": tile_url,
        })

    advice = None
    if arow is not None:
        findings = _jsonb(arow["findings"])
        findings = findings if isinstance(findings, dict) else {}
        advice = {
            "summary": arow["summary"],
            "risks": findings.get("risks") or [],
            "recommendations": findings.get("recommendations") or [],
            "next_steps": findings.get("next_steps") or [],
            # The product never shows AI prose without its disclaimer; this is the stored
            # per-language column, not a sentence invented here.
            "disclaimer": arow["disclaimer"],
            "lang": arow["lang"] or "az",
        }

    days = [{
        "date": _iso(r["forecast_date"]),
        "t_min": _f(r["t_min"]),
        "t_max": _f(r["t_max"]),
        "precip_mm": _f(r["precip_mm"]),
        "precip_prob": _f(r["precip_prob"]),
    } for r in wx_rows]

    # EXPLICIT whitelist — do not replace with dict(row). No id of any kind belongs here.
    return {
        "field": {
            "name": row["name"],
            "area_ha": _f(row["area_ha"]),
            "crop_type": row["crop_type"],
            "region": row["region"],
            "geom": json.loads(row["geom"]) if row["geom"] else None,
            "centroid": json.loads(row["centroid"]) if row["centroid"] else None,
        },
        "wellness": wellness,
        "timeline": timeline,
        "advice": advice,
        # An object rather than a bare list so a later addition (alerts, a spray window) does not
        # change the shape the page already parses. Null when the weather cron has not run yet.
        "weather": {"days": days} if days else None,
        "index": DEMO_INDEX,
        "brand": "Agradex",
    }
