"""The open-alert read model (0063).

  GET /api/alerts/summary[?org_id=] — how many rule conditions are OPEN right now, how many of those
                                      are critical, and how many are UNCONFIRMED.

WHY THIS EXISTS. public.alert_state has recorded a fire since 0016 and, until 0063, nothing else:
`active` was set true on every fire, never set back, and never read. So no surface could answer "is
this still true", and the dashboard tile that wanted that answer was pointed at unread notifications
instead — a count a farmer clears by glancing at the bell once, while the heat rule keeps firing
underneath. This endpoint is the honest version of that number.

THREE ANSWERS, NOT TWO — and the third is the whole point:
  * open        — the rule was observed MATCHING within OPEN_MAX_AGE_HOURS. A still-firing rule
                  stamps last_match_at on every run, even when the notification is held back by the
                  cooldown or quiet hours, so this is a live fact and not an echo of an old send.
  * resolved    — rules/engine.py watched it stop matching enough times in a row (it is simply absent
                  from every count here).
  * unconfirmed — it fired, and nothing since has confirmed it either way: no fresh scene, no fresh
                  forecast, a field the pipeline stopped processing, or a producer that cannot report
                  what it evaluated (pest — see engine._pest_candidates). These are NOT counted as
                  open and are NOT counted as resolved. Folding them into either would be a lie in
                  one direction or the other, and folding them into "resolved" would tell a farmer a
                  problem went away because we stopped looking.

CHEAP BY CONSTRUCTION, same discipline as GET /api/orgs/{id}/wellness: one aggregate query per call,
no per-field fan-out, nothing computed on read. The GROUP BY collapses to a handful of rows (distinct
source × rule_type × severity), which is what lets the per-user notification matrix be applied in
Python — using notify_prefs itself, never a second copy of its (source, type) → category mapping.

NO CAP, deliberately. The notification list is capped at 30 rows and therefore reports a floor
("30+"); these are SQL counts over the whole open set, so the number is exact for the rules whose
categories this user still receives.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends

from .. import notify_prefs
from ..db import connection
from ..deps import get_current_user_id, safe_uuid
from ..rules.engine import OPEN_MAX_AGE_HOURS

router = APIRouter(prefix="/api", tags=["alerts"])

# The predicates live in ONE string so "open" and "unconfirmed" can never drift into overlapping or
# leaving a gap: they are complements over the unresolved, unmuted rows.
#
# A muted row counts as neither. A mute is the farmer saying "stop telling me about this one", and a
# badge that keeps counting it would just be the same interruption with a smaller font.
#
# Openness is measured from last_match_at, never from last_fired_at: the latter is the cooldown's
# clock and only advances when something was actually delivered, so a rule that keeps matching every
# hour under an 18h cooldown would look 18 hours stale on every second check.
_SUMMARY_SQL = """
select a.source, a.rule_type, a.last_severity,
       count(*) filter (
         where a.resolved_at is null
           and (a.muted_until is null or a.muted_until <= now())
           and a.last_match_at is not null
           and a.last_match_at >= now() - $2::interval)                as open_n,
       count(*) filter (
         where a.resolved_at is null
           and (a.muted_until is null or a.muted_until <= now())
           and (a.last_match_at is null
                or a.last_match_at < now() - $2::interval))            as unconfirmed_n
from public.alert_state a
join public.fields f on f.id = a.field_id and f.deleted_at is null
join public.organization_members m
  on m.org_id = f.org_id and m.user_id = $1::uuid and m.status = 'active'
where ($3::uuid is null or f.org_id = $3::uuid)
group by 1, 2, 3
"""


@router.get("/alerts/summary")
async def alerts_summary(org_id: Optional[str] = None,
                         user_id: str = Depends(get_current_user_id)):
    """Open / critical / unconfirmed alert counts across the caller's orgs (or one of them).

    `org_id` is optional so the bell can ask about everything the user can see while the dashboard,
    which is scoped to one organization at a time, asks about the org on screen. Membership is
    enforced by the join rather than by require_member: with no org_id there is no single org to
    check, and the join gives both cases the same rule.
    """
    org = safe_uuid(org_id, "org_not_found") if org_id else None
    async with connection(user_id) as conn:
        prefs = await notify_prefs.load(conn, user_id)
        rows = await conn.fetch(_SUMMARY_SQL, user_id,
                                timedelta(hours=OPEN_MAX_AGE_HOURS), org)

    open_n = critical_n = unconfirmed_n = 0
    for r in rows:
        # The same filter the bell applies (routers/advice.py::list_notifications). A farmer who
        # muted Weather in-app must not be handed a count driven by frost alerts they asked not to
        # see — the tile and the list they would open from it have to agree.
        #
        # A row written before 0063 has source NULL and therefore falls into notify_prefs' default
        # category, which is ON. It is counted rather than dropped, which is the safe direction (the
        # count can only be too generous, never too quiet), and it self-heals: the dispatcher
        # back-fills `source` the first time it sees that rule again.
        if not notify_prefs.allows_notification(prefs, r["source"], r["rule_type"], "inapp"):
            continue
        open_n += r["open_n"]
        unconfirmed_n += r["unconfirmed_n"]
        if (r["last_severity"] or "") == "critical":
            critical_n += r["open_n"]
    return {"open": open_n, "critical": critical_n, "unconfirmed": unconfirmed_n,
            # Echoed so a client cannot mistake an all-orgs answer for a scoped one.
            "org_id": org}
