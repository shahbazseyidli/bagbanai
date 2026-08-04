"""Rule engine + dispatcher (T1).

DELIVERY CHANNELS: alerts are delivered **in-app (public.notifications) + Telegram + Web Push**.
Email is NOT an alert channel — everything the farmer needs by email arrives once a week in the
Wednesday 07:00 (Azerbaijan) digest, which reads the same notifications this engine writes.

`run_rules(conn, field_id)` gathers candidate alerts from every registered producer and dispatches
each through anti-spam gating:
  - quiet hours 22:00–07:00 (Azerbaijan, UTC+4): non-critical alerts are held; critical (e.g.
    frost during flowering) always goes out;
  - cooldown: the same (field, rule_type) won't re-fire within COOLDOWN_HOURS unless the severity
    escalates;
so a notification lands in public.notifications at most once per real event, not once per cron run.
That gating still matters: it protects the in-app feed, the Telegram message and the phone push —
and the push is the one that would hurt most, since it lights up a screen rather than waiting to be
opened.

Producers are pure readers of already-computed state (e.g. the weather job stores its alerts in the
`spray_window` field_knowledge block) — the engine owns notification writing, the jobs don't.

PER-USER PREFERENCES: every candidate is mapped to one of the five categories in
`services/app/notify_prefs.py`. The notification row is org-scoped, so it is written unless NOBODY
in the org wants that category in-app or in the digest; the individual member's choice is applied
where it can be applied per person — on read (the bell, the digest) and on the per-recipient sends
(Telegram, Web Push).

RESOLUTION (0063) — a rule evaluation has THREE outcomes, not two:
  * fired            — the condition matched and a notification went out;
  * still-firing     — it matched, but delivery was held (quiet hours, cooldown, mute). The weather
                       does not care that we already told someone, so this still stamps last_match_at;
  * no-longer-matching — the rule was EVALUATED and did not match. That writes a clear, and after
                       CLEAR_STREAK_TO_RESOLVE consecutive clears the row is resolved.
`producers` therefore return `(candidates, covered)`, where `covered` is the set of rule_types the
producer could genuinely judge on this run. A rule_type that is NOT in `covered` is left completely
untouched: no scene, no forecast, a field the pipeline never processed — none of that is evidence
that a problem went away, and treating it as such would tell a farmer their field recovered because
we stopped looking. Anything neither confirmed nor cleared ages into `unconfirmed` in the read model
(routers/notifications.py), which is a third answer and not a quiet "resolved"."""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone

from .. import notify_prefs
from . import alert_copy

# Azerbaijan is UTC+4 year-round (no DST) — quiet-hours are computed in field-local time.
_AZ_TZ = timezone(timedelta(hours=4))
_QUIET_START, _QUIET_END = 22, 7           # local hour window [22:00, 07:00)
COOLDOWN_HOURS = 18                        # min gap between same-type alerts (unless escalated)
_SEVERITY_RANK = {"info": 0, "warning": 1, "critical": 2}

# ── resolution model ────────────────────────────────────────────────────────────────────────────
# How many consecutive clear evaluations end an alert. TWO, not one: every input this engine reads
# is a sample with noise in it — one hazy scene moves NDVI, one forecast refresh moves the 48-hour
# minimum by a fraction of a degree — so a threshold sitting on its boundary would flip a badge back
# and forth on single samples. Two says "it stopped matching and stayed stopped". It is also not
# three: the clear evidence is a whole new scene or a whole new forecast, and making a farmer wait
# three of those to see a resolved alert would make the badge as useless in the other direction.
CLEAR_STREAK_TO_RESOLVE = 2

# Two clears count as one observation unless they are this far apart. run_rules is called from the
# weather drain AND after every satellite scene, so two runs can land minutes apart and read exactly
# the same stored forecast and the same stored index rows. That is one look at the data, not two,
# and it must not be able to resolve an alert on its own.
CLEAR_MIN_GAP_MINUTES = 60

# How long a confirmed match stays "open" without being re-confirmed. A still-matching rule stamps
# last_match_at on EVERY run (delivery gating no longer hides that), and run_rules reaches every
# field at least daily — deploy/run-weather.sh drains 200 fields at 03:45 UTC and the geo pipeline
# calls /rules/run after each scene — so 48h is two full cycles plus one missed cron. Past it the row
# is neither open nor resolved: it is `unconfirmed`, and the read model says so out loud. Imported by
# routers/notifications.py and routers/advice.py so the number is defined exactly once.
OPEN_MAX_AGE_HOURS = 48

# The stored forecast block is a snapshot. Beyond this it can no longer clear anything: the daily
# weather cron would have overwritten it, so an old block means the refresh stopped, and reading
# "no frost alert in it" as "the frost passed" is the failure mode this whole module guards against.
_WEATHER_BLOCK_FRESH_HOURS = 36

# How old the newest usable scene may be before the vegetation rules stop being able to clear
# anything. Sentinel-2 repeats every 5 days (measured — see 0060_scene_attempts.sql) and a cloudy
# run of three passes is ordinary, so 21 days still tolerates a bad fortnight. Past it we are not
# looking at the canopy any more, and index_trends' own 120-day window starts to shift `prior` as
# old rows drop out — a "clear" produced by data leaving the window is not an observation.
_VEG_FRESH_DAYS = 21

_WEATHER_TITLES = {
    "frost": "🥶 Şaxta xəbərdarlığı",
    "heat": "🌡️ İstilik stresi",
    "wind": "💨 Güclü külək",
}

# CODE + PARAMS (0057). Every candidate now carries a stable id next to its Azerbaijani prose, so
# the reader's own surface can render the alert in the reader's own language. The prose stays
# because Telegram, web push and the weekly digest render SERVER-side and still need a string; the
# in-app bell resolves the code and only falls back to the prose when there is none.
_WEATHER_TITLE_CODES = {
    "frost": "alert.frost.title",
    "heat": "alert.heat.title",
    "wind": "alert.wind.title",
}


def _weather_coverage(content: dict, refreshed_at) -> set[str]:
    """Which weather rules this stored block is allowed to CLEAR.

    Two conditions, both about evidence rather than about the alert list being empty:
      * the block is fresh — an old block means the daily refresh stopped, not that the frost passed;
      * the input the rule reads is actually in it — ai/weather.compute_alerts can only judge frost
        and heat when the hours carry a temperature, and wind when they carry a wind speed.

    KNOWN NARROWNESS, stated rather than hidden: a crop with no heat_threshold_c never produces a
    heat alert at all, and the block does not record which thresholds were in play, so a field that
    LOSES its heat threshold will clear an open heat alert. That is defensible (the rule can no
    longer fire for that field) but it is inferred, not observed. Fixing it properly means
    ai/weather.py publishing the rule types it evaluated — see the report for this change.
    """
    if refreshed_at is None:
        return set()
    if datetime.now(timezone.utc) - refreshed_at > timedelta(hours=_WEATHER_BLOCK_FRESH_HOURS):
        return set()
    hours = content.get("hours") or []
    covered: set[str] = set()
    if any(h.get("temp") is not None for h in hours):
        covered |= {"frost", "heat"}
    if any(h.get("wind") is not None for h in hours):
        covered.add("wind")
    return covered


async def _weather_candidates(conn, field_id: str) -> tuple[list[dict], set[str]]:
    """Read the weather job's stored alerts (spray_window block) → candidate notifications."""
    row = await conn.fetchrow(
        """select content, refreshed_at from public.field_knowledge
           where field_id=$1::uuid and block_type='spray_window'""", field_id)
    if not row or not row["content"]:
        return [], set()
    content = row["content"]
    c = json.loads(content) if isinstance(content, str) else content
    out = []
    for a in c.get("alerts") or []:
        rt = a.get("type")
        if not rt:
            continue
        out.append({
            "rule_type": rt,
            "severity": a.get("severity", "warning"),
            "source": "weather",
            "title": _WEATHER_TITLES.get(rt, "Hava xəbərdarlığı"),
            "title_code": _WEATHER_TITLE_CODES.get(rt, "alert.weather.title"),
            # The weather job already emits detail_code/detail_params for exactly this reason
            # (ai/weather.py) — KnowledgePassport renders them. The rule engine was re-reading the
            # AZ `detail` fallback and dropping the code, so the same alert was localized on the
            # passport and Azerbaijani in the bell. Now it carries the code through.
            "body": a.get("detail") or "",
            "body_code": a.get("detail_code"),
            "body_params": a.get("detail_params"),
            "dedup_key": "",
        })
    return out, _weather_coverage(c, row["refreshed_at"])


def _fmt(v) -> str:
    return f"{float(v):.3f}"


def _json_or_null(v):
    """asyncpg wants a JSON string for a jsonb parameter, and NULL must stay NULL rather than
    becoming the four characters 'null' — a reader testing `params is None` would then never fire."""
    return None if v is None else json.dumps(v)


def _scene_is_fresh(trend: dict | None) -> bool:
    """Is this index trend recent enough to be evidence of anything TODAY?

    A trend built from a scene five weeks old still fires its rule perfectly well — the numbers have
    not changed — but it must not be allowed to CLEAR one, because nothing has been observed since.
    """
    d = (trend or {}).get("latest_date")
    if not d:
        return False
    try:
        return (date.today() - date.fromisoformat(str(d)[:10])).days <= _VEG_FRESH_DAYS
    except ValueError:  # a malformed date is not a fresh one
        return False


async def _vegetation_candidates(conn, field_id: str) -> tuple[list[dict], set[str]]:
    """Vegetation alerts VG-1..VG-4 from the field's Sentinel-2 index trends (T2)."""
    from ..ai import analytics
    from ..ai.context import index_trends
    trends = await index_trends(conn, field_id, sensor="S2", indices=["NDVI", "NDMI", "NBR"])
    by = {t["index"]: t for t in trends}
    ndvi, ndmi, nbr = by.get("NDVI"), by.get("NDMI"), by.get("NBR")
    out: list[dict] = []
    # A rule enters `covered` when its INPUT exists and is fresh — never when it merely failed to
    # match. index_trends returns nothing for an index with no scenes in 120 days, so a field the
    # pipeline never processed reaches this point with an empty coverage set and keeps whatever it
    # had open.
    covered: set[str] = set()
    ndvi_fresh, ndmi_fresh, nbr_fresh = (_scene_is_fresh(ndvi), _scene_is_fresh(ndmi),
                                        _scene_is_fresh(nbr))
    if ndvi_fresh and ndvi.get("delta") is not None:
        covered.add("ndvi_drop")
    if ndmi_fresh and ndmi.get("latest") is not None:
        covered.add("ndmi_low")
    if ndvi_fresh and nbr_fresh and ndvi.get("delta") is not None and nbr.get("delta") is not None:
        covered.add("ndvi_nbr")

    # VG-1 — NDVI dropping fast (canopy stress).
    if ndvi and ndvi.get("delta") is not None:
        d, pct = ndvi["delta"], ndvi.get("pct")
        if d <= -0.12 or (pct is not None and pct <= -15):
            sev = "critical" if d <= -0.20 else "warning"
            out.append({"rule_type": "ndvi_drop", "severity": sev, "source": "vegetation",
                        "title": "📉 Bitki sağlamlığı düşür",
                        "title_code": "alert.ndviDrop.title",
                        "body": f"NDVI {_fmt(ndvi['prior'])}→{_fmt(ndvi['latest'])}"
                                + (f" ({pct}%)" if pct is not None else "")
                                + " — çətir stresi. Sahəni yoxlayın: su, zərərverici, qidalanma.",
                        "body_code": "alert.ndviDrop.body",
                        "body_params": {"prior": _fmt(ndvi["prior"]), "latest": _fmt(ndvi["latest"]),
                                        "pct": ("" if pct is None else f" ({pct}%)")},
                        "dedup_key": ""})

    # VG-2 — NDMI low (water stress).
    if ndmi and ndmi.get("latest") is not None and ndmi["latest"] < 0.15:
        out.append({"rule_type": "ndmi_low", "severity": "warning", "source": "vegetation",
                    "title": "💧 Su stresi (nəmlik aşağı)",
                    "title_code": "alert.ndmiLow.title",
                    "body": f"Bitki nəmliyi (NDMI) {_fmt(ndmi['latest'])} — aşağı. Suvarma ehtiyacını yoxlayın.",
                    "body_code": "alert.ndmiLow.body",
                    "body_params": {"ndmi": _fmt(ndmi["latest"])},
                    "dedup_key": ""})

    # VG-4 — NDVI + NBR both dropping (burn / rapid senescence).
    if (ndvi and nbr and ndvi.get("delta") is not None and nbr.get("delta") is not None
            and ndvi["delta"] <= -0.10 and nbr["delta"] <= -0.10):
        out.append({"rule_type": "ndvi_nbr", "severity": "warning", "source": "vegetation",
                    "title": "🔥 Kəskin dəyişim (yanıq/senescens?)",
                    "title_code": "alert.ndviNbr.title",
                    "body": "NDVI və NBR birlikdə kəskin düşüb — yanıq, biçin və ya sürətli quruma ola bilər.",
                    "body_code": "alert.ndviNbr.body",
                    "dedup_key": ""})

    # VG-3 — NDVI anomalously below the field's own seasonal baseline.
    try:
        an = await analytics.anomaly_for(conn, field_id, "NDVI")
    except Exception:  # noqa: BLE001
        an = None
    # anomaly_for returns None when there is not enough baseline history to judge — which is the
    # difference between "not anomalous" and "cannot say", and only the first may clear the rule.
    if an is not None and ndvi_fresh:
        covered.add("veg_anomaly")
    if an and an.get("is_anomaly") and an.get("direction") == "low":
        out.append({"rule_type": "veg_anomaly", "severity": "warning", "source": "vegetation",
                    "title": "⚠️ NDVI normadan aşağı",
                    "title_code": "alert.vegAnomaly.title",
                    "body": f"NDVI {_fmt(an['latest'])} bu həftə üçün sahənizin adi həddindən "
                            f"(p10 {_fmt(an['p10'])}) aşağıdır — anomaliya.",
                    "body_code": "alert.vegAnomaly.body",
                    "body_params": {"latest": _fmt(an["latest"]), "p10": _fmt(an["p10"])},
                    "dedup_key": ""})
    return out, covered


async def _pest_candidates(conn, field_id: str) -> tuple[list[dict], set[str]]:
    """Pest/disease risks (T9) — candidates only, and DELIBERATELY no coverage.

    ai/pest.py returns an empty list for four different reasons: the field has no crop, it has no
    GDD row, there is no risk model for the crop, or every model was evaluated and none is in its
    development window. Only the last of those is a clear. The module does not report which models
    it judged, so from here the four are indistinguishable, and resolving on that emptiness would
    close a disease warning because the GDD series went missing — the exact failure this design
    exists to prevent.

    So pest rules never auto-resolve. They re-fire while they match, and once they stop they age
    into `unconfirmed` after OPEN_MAX_AGE_HOURS: out of the open count, but never labelled resolved.
    Giving them a real clear needs ai/pest.py to return the set of models it evaluated.
    """
    from ..ai.pest import pest_candidates
    return await pest_candidates(conn, field_id), set()


# Registered producers. Irrigation alerts (T8) can append here later — a new producer returns
# (candidates, covered_rule_types) and gets resolution for free; returning an empty coverage set is
# always the safe default, since it can only ever mean "this run cannot end anything".
_PRODUCERS = [_weather_candidates, _vegetation_candidates, _pest_candidates]


async def evaluate(conn, field_id: str) -> tuple[list[dict], set[str]]:
    """All producers → (candidates, the rule_types that were genuinely evaluated this run)."""
    candidates: list[dict] = []
    covered: set[str] = set()
    for producer in _PRODUCERS:
        try:
            got, cov = await producer(conn, field_id)
            candidates.extend(got)
            covered |= cov
        except Exception:  # noqa: BLE001 — one bad producer must not sink the others
            # And it contributes NO coverage: a producer that raised did not evaluate anything, so
            # its rules must keep whatever state they had rather than being cleared by its silence.
            pass
    return candidates, covered


def _in_quiet_hours(now_utc: datetime) -> bool:
    h = now_utc.astimezone(_AZ_TZ).hour
    return h >= _QUIET_START or h < _QUIET_END


async def _mark_match(conn, field_id: str, rule_type: str, dedup_key: str, source: str) -> None:
    """Record "this condition is STILL true" for an alert whose delivery was held back.

    UPDATE-ONLY, and that is load-bearing. Inserting here would create a row whose last_fired_at is
    now(), which is the cooldown's clock — a candidate held by quiet hours at 23:00 would then be
    silenced until 17:00 the next day instead of going out at 07:00. A rule that has never fired
    also has no open alert to keep open, so there is nothing for a new row to say.

    last_severity is deliberately not touched: it means "severity of the last DELIVERED alert" and
    the escalation test compares against it. `source` is backfilled only when missing, so rows
    written before 0063 pick up a category the first time their rule is seen again.
    """
    await conn.execute(
        """update public.alert_state set
             last_match_at=now(), clear_streak=0, last_clear_at=null,
             resolved_at=null, active=true, source=coalesce(source, $4)
           where field_id=$1::uuid and rule_type=$2 and dedup_key=$3""",
        field_id, rule_type, dedup_key, source)


# One statement so the streak, the resolution and the legacy `active` mirror can never disagree.
# The CTE re-reads the row it is about to write, which is what lets the new streak be computed from
# the old one and used in the same UPDATE. `resolved_at is null` there also makes this idempotent:
# an already-resolved row joins to nothing and is left exactly as it was.
_CLEAR_SQL = """
with cur as (
  select field_id, rule_type, dedup_key,
         clear_streak + (case when last_clear_at is null or now() - last_clear_at >= $5::interval
                              then 1 else 0 end) as n
  from public.alert_state
  where field_id=$1::uuid and rule_type=$2 and dedup_key=$3 and resolved_at is null
)
update public.alert_state s set
  last_clear_at = now(),
  clear_streak  = cur.n,
  resolved_at   = case when cur.n >= $4 then now() else null end,
  active        = cur.n < $4
from cur
where s.field_id=cur.field_id and s.rule_type=cur.rule_type and s.dedup_key=cur.dedup_key
returning (s.resolved_at is not null) as resolved
"""


async def _record_clears(conn, field_id: str, covered: set[str],
                         matched: set[tuple[str, str]]) -> tuple[int, int]:
    """The third outcome: rules that WERE evaluated this run and did not match.

    Only rule_types in `covered` are considered, so a field with no fresh scene and no fresh
    forecast passes through here without a single row being touched. That is the whole guard — the
    query below cannot even see a rule the producers could not judge.
    """
    if not covered:
        return 0, 0
    rows = await conn.fetch(
        """select rule_type, dedup_key from public.alert_state
           where field_id=$1::uuid and resolved_at is null and rule_type = any($2::text[])""",
        field_id, sorted(covered))
    cleared = resolved = 0
    for r in rows:
        if (r["rule_type"], r["dedup_key"]) in matched:
            continue                      # it matched this run — already handled by the loop above
        got = await conn.fetchval(_CLEAR_SQL, field_id, r["rule_type"], r["dedup_key"],
                                  CLEAR_STREAK_TO_RESOLVE,
                                  timedelta(minutes=CLEAR_MIN_GAP_MINUTES))
        cleared += 1
        if got:
            resolved += 1
    return cleared, resolved


async def dispatch(conn, field_id: str, org_id: str, candidates: list[dict],
                   covered: set[str] | None = None) -> dict:
    now = datetime.now(timezone.utc)
    quiet = _in_quiet_hours(now)
    fired = 0
    suppressed = 0
    held = 0
    # Every (rule_type, dedup_key) observed TRUE this run, whether or not anyone was told. The clear
    # sweep at the end subtracts this set — without it, an alert held by the cooldown would be read
    # as "did not match" and start resolving itself while it was still firing.
    matched: set[tuple[str, str]] = set()
    # Loaded once per run, not per candidate: the membership rarely changes mid-dispatch and a
    # weather-heavy field can produce half a dozen candidates in one pass.
    audience = await notify_prefs.org_audience(conn, org_id)
    for c in candidates:
        rt, sev = c["rule_type"], c.get("severity", "warning")
        key = c.get("dedup_key", "")
        # Resolved ONCE. Gating on c.get("source") while writing c.get("source", "vegetation") let
        # a candidate with no source be muted as "system" but stored as "vegetation" — the read
        # filter and the digest would then disagree with the gate about the same alert.
        src = c.get("source") or "vegetation"
        cat = notify_prefs.category_for(src, rt)
        matched.add((rt, key))
        crit = sev == "critical"
        st = await conn.fetchrow(
            """select last_fired_at, last_severity, muted_until from public.alert_state
               where field_id=$1::uuid and rule_type=$2 and dedup_key=$3""",
            field_id, rt, key)
        # ── delivery gates ──────────────────────────────────────────────────────────────────────
        # Quiet hours holds everything except critical; a mute and the cooldown hold the rest. All
        # three are statements about our willingness to interrupt a person, and NONE of them is a
        # statement about the field — so each ends in _mark_match() rather than a bare `continue`.
        # Before 0063 they returned early and the row went stale, which is how a still-firing rule
        # became indistinguishable from one that had stopped.
        hold = None
        if quiet and not crit:
            hold = "quiet_hours"
        elif st and st["muted_until"] and st["muted_until"] > now:
            hold = "muted"
        elif st:
            escalated = _SEVERITY_RANK.get(sev, 1) > _SEVERITY_RANK.get(st["last_severity"] or "info", 0)
            if not escalated and now - st["last_fired_at"] < timedelta(hours=COOLDOWN_HOURS):
                hold = "cooldown"
        if hold:
            await _mark_match(conn, field_id, rt, key, src)
            held += 1
            continue
        # The row is org-scoped (public.notifications has no per-user copy) AND the Wednesday digest
        # reads this very table, so "in-app off" alone must NOT suppress the write — that would
        # silently mute the digest column too. Skip only when nobody in the org wants this category
        # on either surface; a member who muted just one of the two is filtered on read instead
        # (routers/advice.list_notifications for the bell, ai/emails/weekly._alerts for the digest).
        #
        # "push" is deliberately NOT in this tuple, and neither is "telegram". This gate decides
        # whether a ROW gets written, and the row is read by exactly two surfaces: the bell and the
        # digest. Adding push here would mean someone who wants alerts ONLY on their phone also gets
        # an entry in a feed they muted — the gate would keep writing rows for a reader who asked
        # for none. The per-device channels do not read the row at all, so they fire on their own
        # below and answer only to their own column.
        if notify_prefs.any_wants(audience, cat, ("inapp", "digest")):
            await conn.execute(
                """insert into public.notifications
                     (field_id, org_id, source, type, severity, title, body,
                      title_code, title_params, body_code, body_params, delivered_channels)
                   values ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,
                           array['inapp'])""",
                field_id, org_id, src, rt, sev, c["title"], c["body"],
                c.get("title_code"), _json_or_null(c.get("title_params")),
                c.get("body_code"), _json_or_null(c.get("body_params")))
        else:
            suppressed += 1
        # alert_state is written either way: the cooldown describes the EVENT, not its delivery. If
        # it depended on who was listening, re-enabling a category would replay a week of history.
        # A fire also ENDS any resolution in progress — the streak goes back to zero and resolved_at
        # back to NULL, so an alert that comes back is open again rather than staying closed.
        await conn.execute(
            """insert into public.alert_state
                 (field_id, rule_type, dedup_key, source, last_severity, last_fired_at,
                  last_match_at, clear_streak, last_clear_at, resolved_at, active)
               values ($1::uuid,$2,$3,$4,$5,now(),now(),0,null,null,true)
               on conflict (field_id, rule_type, dedup_key) do update set
                 source=excluded.source, last_severity=excluded.last_severity,
                 last_fired_at=now(), last_match_at=now(),
                 clear_streak=0, last_clear_at=null, resolved_at=null, active=true""",
            field_id, rt, key, src, sev)
        # NO EMAIL HERE — on purpose. This used to call _deliver_email(), which sent one message
        # per fired alert per field: a farmer with 3 fields in bad weather got a dozen emails a
        # day, none of them going through send_template (no idempotency ledger, no opt-out gate,
        # no unsubscribe link). Alerts are now in-app + Telegram + phone push for immediacy; email
        # is delivered once a week by the Wednesday digest, which reads public.notifications. Do
        # not re-add — and note that push arriving does NOT weaken this: a push is dismissible and
        # costs the farmer nothing, whereas each of those emails was a permanent thing to delete.
        await _deliver_telegram(conn, org_id, cat, c["title"], c["body"], c)
        # Quiet hours and the cooldown were both applied above, so the phone push inherits them for
        # free — which is the whole point of putting it here rather than in the producers. A 3 a.m.
        # frost ping is exactly the failure a new channel would otherwise reintroduce.
        await _deliver_push(conn, org_id, cat, c["title"], c["body"], field_id, c)
        fired += 1
    # The third outcome, after every candidate has been counted as matched.
    cleared, resolved = await _record_clears(conn, field_id, covered or set(), matched)
    # `fired` = alerts that survived quiet-hours and cooldown; `suppressed` = how many of those
    # wrote no notification row because the whole org had muted the category. They overlap on
    # purpose — the cron log needs both "the rule triggered" and "nobody was listening".
    # `held` = matched but not delivered (still-firing); `cleared`/`resolved` = evaluated and not
    # matching, and of those, how many crossed the streak. `evaluated` is the size of the coverage
    # set, which is the number the log should be read against: cleared==0 with evaluated==0 means
    # we could not judge anything, not that everything is still wrong.
    return {"candidates": len(candidates), "fired": fired, "suppressed": suppressed,
            "held": held, "cleared": cleared, "resolved": resolved,
            "evaluated": len(covered or ()), "quiet_hours": quiet}


async def _deliver_telegram(conn, org_id: str, category: str, title: str, body: str,
                            c: dict | None = None) -> None:
    """Best-effort push of a dispatched alert to org members' linked+opted-in Telegram chats (U4).

    Unlike the notification row, a Telegram message has exactly one recipient, so the per-user
    opt-out applies cleanly here: the query carries each member's notify_prefs and telegram.send_alert
    drops the ones who muted this category.
    """
    from ..messaging import telegram
    if not telegram.configured():
        return
    try:
        rows = await conn.fetch(
            """select c.id, c.chat_id, u.notify_prefs, u.locale from public.messaging_channels c
               join public.organization_members m on m.user_id = c.user_id
               join public.users u on u.id = c.user_id
               where m.org_id=$1::uuid and c.channel='telegram'
                 and c.verified and c.opt_in and c.chat_id is not null""", org_id)
        for r in rows:
            # EACH RECIPIENT IN THEIR OWN LANGUAGE. One Telegram message has exactly one reader —
            # the same property that makes the per-user opt-out apply cleanly here — so the locale
            # applies cleanly too. Before this, every recipient got the Azerbaijani prose the rule
            # engine writes as its fallback, whatever language they use the product in.
            r_title = alert_copy.render((c or {}).get("title_code"), (c or {}).get("title_params"),
                                        r["locale"], title)
            r_body = alert_copy.render((c or {}).get("body_code"), (c or {}).get("body_params"),
                                       r["locale"], body)
            status = await telegram.send_alert(r["chat_id"], r["notify_prefs"], category,
                                               f"{r_title}\n{r_body}")
            # A muted send never happened — logging it would make message_log read like a delivery.
            if status == "muted":
                continue
            await conn.execute(
                "insert into public.message_log (channel_id, text, status) values ($1,$2,$3)",
                r["id"], r_title, status)
    except Exception:  # noqa: BLE001 — never let delivery break dispatch
        pass


async def _deliver_push(conn, org_id: str, category: str, title: str, body: str,
                        field_id: str, c: dict | None = None) -> None:
    """Best-effort Web Push of a dispatched alert to org members' subscribed devices (H-push).

    The same per-user opt-out story as Telegram: one push has one recipient, so the category switch
    applies cleanly, and deliver_org enforces it on the push path itself. The tap target is the
    field the alert is about — a banner that opens a notification list would make the farmer search
    for the thing they were just told about.
    """
    from ..routers.push import configured, deliver_org  # lazy, like the telegram import above
    if not configured():
        return
    try:
        # The codes ride along so deliver_org can render per SUBSCRIBER — a push lands on one
        # person's lock screen, so it has exactly one correct language.
        await deliver_org(conn, org_id, category, title, body, url=f"/fields/{field_id}",
                          codes=(c or {}))
    except Exception:  # noqa: BLE001 — never let delivery break dispatch
        pass


async def run_rules(conn, field_id: str) -> dict:
    """Evaluate all producers for a field and dispatch the surviving alerts. Never raises."""
    org_id = await conn.fetchval("select org_id from public.fields where id=$1::uuid", field_id)
    if not org_id:
        return {"ok": False, "reason": "field_not_found"}
    candidates, covered = await evaluate(conn, field_id)
    result = await dispatch(conn, field_id, str(org_id), candidates, covered)
    return {"ok": True, **result}
