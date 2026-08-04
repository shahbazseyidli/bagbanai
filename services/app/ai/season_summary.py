"""AI season summary — the field's own seasons, read against each other.

WHY THIS IS NOT ADVICE: ai/advice.py answers "what is happening on this field right now" from the
last few weeks of indices. This answers "how does this season stand against the ones before it",
which is a different question over a different input (public.field_season_features, T16) with a
different failure mode — and that failure mode is the whole design problem here.

MOST FIELDS HAVE ONE SEASON. A new field is processed ~60 days back, so until the farmer asks for a
backfill (A8) there is exactly one, partial, season on record. "Compare with previous years" over
one season is not a hard question, it is an impossible one, and a model asked it anyway will still
answer — in comparative grammar, from which the farmer reads a trend that does not exist. So the
comparison never reaches the model unless the data supports it:

  mode "none"   (0 comparable seasons) — NO LLM CALL. There is no satellite season yet.
  mode "single" (1)                    — NO LLM CALL. The UI names the one season on record and
                                         points at the backfill card, which is the ONE action that
                                         changes the answer. No prose is generated or stored, so
                                         there is no sentence that could imply a second season.
  mode "pair"   (2)                    — call, with the prompt forbidding trend/tendency language:
                                         two points are a difference, not a direction.
  mode "multi"  (3+)                   — call, trend language allowed. Three is also the threshold
                                         T16 set for its (still deferred) yield-correlation model.

A season counts as comparable only with at least MIN_SCENES usable vegetation scenes. A year holding
two cloud-free days is a handful of pixels, not a season, and counting it would manufacture a pair
out of nothing.

THE ONGOING SEASON IS PARTIAL BY CONSTRUCTION. Its integral, GDD and rainfall accumulate to today,
so they are SMALLER than any finished season for arithmetic reasons alone. That is the easiest wrong
sentence in this feature ("this year is far behind"), so it is stated twice: in the facts
(`partial`, `through_doy`) and again as a rule in the prompt.

PROSE IS WRITTEN ONCE, IN ONE LANGUAGE, AND STORED — never translated on read (the standing rule,
identical to advice). The language is recorded next to the text so the UI can offer to rewrite it
rather than silently showing a foreign paragraph.

CACHE: public.field_knowledge, block_type='season_summary' — the existing per-field block store,
whose `input_hash` column exists for exactly this. No migration is needed: block_type is free text,
and ai/context.py feeds only soil_profile + resolved_clarifications into the advice prompt, so this
block cannot leak into another model's context (KnowledgePassport.tsx likewise renders named blocks
only).

INVALIDATION: the hash covers every number the prose is allowed to talk about — per season the year,
scene count, NDVI peak/mean/integral, GDD, rainfall, crop and the partial flag — plus the mode. A new
scene that moves the current season's numbers marks the stored summary stale. Nothing regenerates
automatically: a GET must never cost an LLM call, so the UI offers the refresh and the farmer spends
the quota deliberately.

QUOTA: this consumes the org's monthly ADVICE allowance and is recorded as kind='advice'. A separate
kind would be a hole — tiers.month_count() counts one kind at a time, so a new one would be a second,
unenforced budget of the same LLM calls. The cost row still carries field_id and source='user'.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field

from . import knowledge as kb, llm, usage as ai_usage
# One table of language names for the whole product; advice.py owns it. Re-declaring it here is how
# auth.py::_effective_area_unit came to be a duplicate that has to be edited twice — don't repeat it.
from .advice import DISCLAIMERS, LANG_NAMES

BLOCK_TYPE = "season_summary"

# How far back to look. The HLS archive reaches 2015, but a farmer comparing 2026 with 2016 is not
# reading the same field: crop, planting and irrigation have usually all changed.
#
# The season chart above this summary requests the same five (SeasonCompareChart, ?years=5). Keep
# them equal — prose that cites a season the chart beside it does not draw reads as a contradiction.
YEARS_BACK = 5

# Fewer usable scenes than this is not a season. S2 revisits every ~5 days, so four surviving scenes
# is roughly a cloud-hit month — the floor at which a peak and a shape mean anything.
MIN_SCENES = 4

MODE_NONE, MODE_SINGLE, MODE_PAIR, MODE_MULTI = "none", "single", "pair", "multi"

# es is missing from advice.LANG_NAMES (it was added as a partial marketing locale after that table
# was written). Falling through would silently write Azerbaijani prose for a Spanish reader, so it is
# filled in here rather than left to the fallback.
_LANG_NAMES = {**LANG_NAMES, "es": "Spanish (Español)"}
_DISCLAIMERS = {**DISCLAIMERS,
                "es": ("Este resumen es un análisis automático basado en datos satelitales del "
                       "propio campo; verifíquelo sobre el terreno antes de decidir.")}

# Sensor families, preference order — identical to ai/season.py so the numbers here and the numbers
# in the season chart come from the same pixels.
_S2 = ["S2"]
_HLS = ["S30", "L30"]

# Per-year NDVI aggregate straight from index_stats: count, peak, mean, trapezoidal integral
# (Σ (v+v_prev)/2 · Δdays — acquired_at is a date, so the difference is plain days) and the last
# observation. One query for every year at once; ai/season.py runs the same arithmetic per season.
_YEAR_AGG = """
with src as (
  select extract(year from acquired_at)::int as y, acquired_at, mean
  from public.index_stats
  where field_id=$1::uuid and index_name='NDVI' and mean is not null
    and sensor = any($3::text[])
    and extract(year from acquired_at)::int = any($2::int[])
),
tr as (
  select y, acquired_at, mean,
         lag(mean)        over (partition by y order by acquired_at) as pv,
         lag(acquired_at) over (partition by y order by acquired_at) as pd
  from src
)
select y,
       count(*)                                       as n,
       max(mean)                                      as peak,
       avg(mean)                                      as mean_v,
       coalesce(sum(case when pv is not null
                         then (mean + pv) / 2 * (acquired_at - pd) else 0 end), 0) as integral,
       max(extract(doy from acquired_at)::int)        as last_doy
from tr group by y
"""

# The stored T16 row. gdd_total / precip_total_mm exist nowhere else, so the feature store is read
# even when the NDVI numbers come from the live aggregate above. The 0037 columns are read through
# to_jsonb() so this query also runs on a database where 0037 has not been applied — naming a
# missing column would raise, and connection() holds one transaction per request, so that error
# would poison every later query in the same request.
_STORED = """
select season_year, crop_type, sensor, n_scenes, ndvi_peak, ndvi_mean, ndvi_integral,
       gdd_total, precip_total_mm,
       (to_jsonb(f) ->> 'precip_total_src')      as precip_src,
       (to_jsonb(f) ->> 'ndvi_peak_doy')::int    as peak_doy,
       (to_jsonb(f) ->> 'ndvi_by_doy')           as by_doy
from public.field_season_features f
where field_id=$1::uuid and season_year = any($2::int[])
"""


# ----------------------------------------------------------------- structured output
class SeasonSummaryOut(BaseModel):
    headline: str = Field(description="Bir cümlə — ən vacib nəticə")
    comparison: str = Field(description="2-4 cümlə: mövsümlərin verilən rəqəmlər üzrə müqayisəsi")
    watch: list[str] = Field(description="0-3 qısa, konkret diqqət maddəsi (boş ola bilər)")


def _f(v) -> Optional[float]:
    return None if v is None else float(v)


def _round(v: Optional[float], nd: int) -> Optional[float]:
    return None if v is None else round(float(v), nd)


def _last_doy(raw: Any) -> Optional[int]:
    """Day-of-year of the last binned observation in a stored [[doy, ndvi], ...] curve."""
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return None
    if isinstance(raw, list) and raw:
        last = raw[-1]
        if isinstance(last, (list, tuple)) and last:
            try:
                return int(last[0])
            except (TypeError, ValueError):
                return None
    return None


async def collect(conn, field_id: str) -> dict:
    """Every season fact this feature is allowed to talk about. Deterministic, no LLM, safe on
    partial data — this is also exactly what renders when no LLM key is configured at all.

    NDVI numbers prefer the stored T16 row so the summary and the season chart (which reads the same
    store) can never quote different peaks for the same year; a year the monthly job has not reached
    yet — which includes the current season on most fields, and every year right after a backfill —
    is filled from the live aggregate instead and marked `source: "live"`.
    """
    this_year = date.today().year
    wanted = [this_year - i for i in range(YEARS_BACK)]

    stored = {int(r["season_year"]): r for r in await conn.fetch(_STORED, field_id, wanted)}

    # Live aggregate: Sentinel-2 first, HLS only for the years S2 did not cover — mixing the two
    # families inside one year would double the scene count and distort the curve.
    live: dict[int, tuple[Any, str]] = {}
    for family, label in ((_S2, "S2"), (_HLS, "HLS")):
        missing = [y for y in wanted if y not in live]
        if not missing:
            break
        for r in await conn.fetch(_YEAR_AGG, field_id, missing, family):
            if int(r["n"] or 0) > 0:
                live[int(r["y"])] = (r, label)

    crop_now = await conn.fetchval(
        "select crop_type from public.field_metadata where field_id=$1::uuid", field_id)

    seasons: list[dict] = []
    for y in wanted:
        srow = stored.get(y)
        lrow, lsensor = live.get(y, (None, None))
        # A stored row with no scenes carries nothing to compare (the T16 job writes one only when
        # the season had vegetation data, but a hand-run or an older row can still be empty), so it
        # only counts when the live aggregate has nothing either — and then there is no season.
        from_store = srow is not None and int(srow["n_scenes"] or 0) > 0
        if not from_store and lrow is None:
            continue
        n_scenes = int((srow["n_scenes"] if from_store else lrow["n"]) or 0)
        peak = _f(srow["ndvi_peak"]) if from_store else _f(lrow["peak"])
        mean_v = _f(srow["ndvi_mean"]) if from_store else _f(lrow["mean_v"])
        integral = _f(srow["ndvi_integral"]) if from_store else _f(lrow["integral"])
        through = (_last_doy(srow["by_doy"]) if from_store else None)
        if through is None and lrow is not None and lrow["last_doy"] is not None:
            through = int(lrow["last_doy"])
        seasons.append({
            "season_year": y,
            "crop_type": (srow["crop_type"] if srow is not None else None) or crop_now or None,
            "sensor": (srow["sensor"] if from_store else None) or lsensor,
            "n_scenes": n_scenes,
            "ndvi_peak": _round(peak, 3),
            "ndvi_peak_doy": (srow["peak_doy"] if srow is not None else None),
            "ndvi_mean": _round(mean_v, 3),
            "ndvi_integral": _round(integral, 1),
            "gdd_total": _round(_f(srow["gdd_total"]) if srow is not None else None, 0),
            "precip_total_mm": _round(_f(srow["precip_total_mm"]) if srow is not None else None, 0),
            # 'forecast_only' precipitation is derived from the FAO-56 balance and is wiped on every
            # recompute; the prompt is told so it does not quote it as a measurement.
            "precip_src": (srow["precip_src"] if srow is not None else None),
            "source": "store" if from_store else "live",
            # The running season's totals stop at today. Everything downstream leans on this flag.
            "partial": y == this_year,
            "through_doy": through,
            "thin": n_scenes < MIN_SCENES,
        })

    comparable = [s for s in seasons if not s["thin"]]
    mode = (MODE_NONE if not comparable else
            MODE_SINGLE if len(comparable) == 1 else
            MODE_PAIR if len(comparable) == 2 else MODE_MULTI)
    return {
        "current_year": this_year,
        "seasons": seasons,
        "comparable_years": [s["season_year"] for s in comparable],
        "thin_years": [s["season_year"] for s in seasons if s["thin"]],
        "mode": mode,
        "min_scenes": MIN_SCENES,
    }


def facts_hash(facts: dict) -> str:
    """Stable hash of everything the prose may cite. Any change to it marks a stored summary stale.

    Deliberately NOT hashing the language: prose is written once and stored, so a second reader in a
    second language must not silently rewrite the first reader's summary. The read path reports
    `lang_mismatch` instead and the farmer decides.
    """
    return kb.input_hash({
        "mode": facts["mode"],
        "seasons": [[s["season_year"], s["n_scenes"], s["ndvi_peak"], s["ndvi_mean"],
                     s["ndvi_integral"], s["gdd_total"], s["precip_total_mm"],
                     s["crop_type"], s["partial"]]
                    for s in facts["seasons"]],
    })


async def load_cached(conn, field_id: str) -> Optional[dict]:
    """The stored summary block, or None. Never raises on a malformed blob — an unreadable cache
    entry must degrade to "no summary yet", not to a broken section."""
    row = await conn.fetchrow(
        """select content, input_hash, refreshed_at from public.field_knowledge
           where field_id=$1::uuid and block_type=$2""", field_id, BLOCK_TYPE)
    if not row:
        return None
    content = row["content"]
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except ValueError:
            return None
    if not isinstance(content, dict):
        return None
    return {**content, "input_hash": row["input_hash"],
            "generated_at": (row["refreshed_at"].isoformat() if row["refreshed_at"] else None)}


# ----------------------------------------------------------------------- prompt
_SYSTEM = (
    "Sən təcrübəli aqronomsan. Sənə BİR sahənin öz mövsümlərinin peyk göstəriciləri JSON kimi "
    "verilir: hər mövsüm üçün NDVI zirvəsi, orta NDVI, NDVI inteqralı (NDVI-gün — mövsüm boyu "
    "yığılmış bitki örtüyü), səhnə sayı, varsa GDD cəmi və yağıntı cəmi. Vəzifən: bu mövsümləri "
    "BİR-BİRİ İLƏ müqayisə edib qısa nəticə yazmaq.\n"
    "Qaydalar:\n"
    "- YALNIZ verilən rəqəmlərə əsaslan. Başqa sahə, rayon ortalaması, məhsuldarlıq və ya qiymət "
    "  haqqında heç nə demə — onlar sənə verilmir.\n"
    "- `partial: true` olan mövsüm HƏLƏ BİTMƏYİB: onun inteqralı, GDD-si və yağıntısı yalnız "
    "  bugünə qədər yığılıb, ona görə bitmiş mövsümdən RİYAZİ OLARAQ kiçikdir. Bunu geriləmə kimi "
    "  təqdim etmə. Belə mövsüm üçün ancaq zirvə/orta NDVI-ni və indiyə qədər olan gedişi "
    "  müqayisə et və mövsümün davam etdiyini açıq yaz.\n"
    "- JSON-un sahə adlarını (`through_doy`, `n_scenes`, `ndvi_integral`, `partial` və s.) cavabda "
    "  YAZMA — onlar bizim daxili adlarımızdır, fermer üçün mənasızdır. Onların əvəzinə nəyi "
    "  bildirdiklərini adi sözlə de: tarixi, səhnə sayını, yığılmış artımı.\n"
    "- `n_scenes` az olan mövsümün rəqəmi zəifdir (buludlu keçidlər) — belə mövsümü müqayisə "
    "  edərkən bunu qeyd et.\n"
    "- `precip_src: \"forecast_only\"` olan yağıntı ölçmə deyil, hesablama qalığıdır — onu fakt "
    "  kimi sitat gətirmə.\n"
    "- Rəqəmi uydurma; verilməyən dəyər üçün 'məlum deyil' de.\n"
    "- Qısa yaz. Fermerə birbaşa müraciət et. Bütün mətn DÜZ MƏTN olsun — Markdown işarələri "
    "  (**qalın**, *kursiv*, #) istifadə etmə.\n"
    "- `watch` 0-3 maddə: yalnız bu müqayisədən çıxan konkret diqqət maddəsi. Çıxmırsa boş buraxıl."
)

_PAIR_RULE = (
    "\nBU MÜQAYİSƏDƏ CƏMİ İKİ MÖVSÜM VAR. İki nöqtə FƏRQ verir, MEYL (trend) vermir: 'yaxşılaşır', "
    "'pisləşir', 'ildən-ilə', 'tendensiya' kimi ifadələr işlətmə. Yalnız iki mövsümün fərqini yaz."
)
_MULTI_RULE = (
    "\nÜÇ VƏ DAHA ÇOX MÖVSÜM VAR — ardıcıllıqdan meyl oxumaq olar, amma meyli yalnız rəqəmlər onu "
    "həqiqətən göstərəndə adlandır və neçə mövsümə əsaslandığını yaz."
)


def _lang_clause(lang: str) -> str:
    if lang == "az" or lang not in _LANG_NAMES:
        return ""
    return ("\n\nDİL: Bütün mətni (headline, comparison, watch) "
            f"{_LANG_NAMES[lang]} dilində yaz.")


async def generate_and_store(conn, field_id: str, org_id: str, lang: str = "az",
                             user_id: Optional[str] = None) -> dict:
    """Generate the summary and cache it. Returns a result dict; never raises for the expected
    refusals so the caller can map them to a status code:

      {"ok": False, "reason": "not_configured" | "not_comparable" | "quota_exceeded" | "unavailable"}
      {"ok": True, "summary": {...}}

    `not_comparable` is the single-season case and it is a REFUSAL, not an empty success: the caller
    must not be able to read it as "the model had nothing to say".
    """
    if not llm.is_configured():
        return {"ok": False, "reason": "not_configured"}

    facts = await collect(conn, field_id)
    if facts["mode"] in (MODE_NONE, MODE_SINGLE):
        return {"ok": False, "reason": "not_comparable", "mode": facts["mode"], "facts": facts}

    from .. import tiers
    tier = await tiers.org_tier(conn, org_id)
    used = await tiers.month_count(conn, org_id, "advice")
    limit = tiers.limit(tier, "advice_per_month")
    if used >= limit:
        return {"ok": False, "reason": "quota_exceeded", "tier": tier, "limit": limit}

    system = _SYSTEM + (_PAIR_RULE if facts["mode"] == MODE_PAIR else _MULTI_RULE) + _lang_clause(lang)
    user = ("Mövsüm göstəriciləri (JSON):\n"
            + json.dumps({"current_year": facts["current_year"], "seasons": facts["seasons"]},
                         ensure_ascii=False, indent=2)
            + "\n\nBu mövsümləri bir-biri ilə müqayisə et.")

    try:
        result, usage = await llm.complete_structured(
            system, user, SeasonSummaryOut, max_tokens=1500, model=tiers.model_for(tier))
    except llm.LLMUnavailable:
        return {"ok": False, "reason": "unavailable"}

    content = {
        "headline": result.headline,
        "comparison": result.comparison,
        "watch": list(result.watch or [])[:3],
        "lang": lang,
        "mode": facts["mode"],
        "years": facts["comparable_years"],
        # From the usage dict, i.e. the model that actually answered — not llm.model_info(), which
        # reports the configured DEFAULT and would mislabel every Business-tier call.
        "model": usage["model"],
        "disclaimer": _DISCLAIMERS.get(lang, _DISCLAIMERS["az"]),
    }
    await kb.upsert_field_block(conn, field_id, org_id, BLOCK_TYPE, content,
                                sources=[], input_hash_val=facts_hash(facts))

    try:
        await ai_usage.record_usage(
            conn, kind="advice", provider=usage["provider"], model=usage["model"],
            input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"],
            org_id=org_id, user_id=user_id, field_id=field_id,
            # Always 'user': there is no automatic trigger for this summary — a farmer pressed a
            # button and is waiting, which is exactly what source='user' means (0056).
            source="user")
    except Exception:  # noqa: BLE001 — a ledger failure must not lose the farmer's summary
        pass

    return {"ok": True, "summary": content, "facts": facts}
