"""Named funnel/activation events (D3.6). Fire-and-forget from the client to measure the onboarding
funnel + activation. Authenticated; the endpoint never blocks or errors the caller — an unknown or
malformed event is silently ignored so instrumentation can never break the UI."""
import json

from fastapi import APIRouter, Depends

from ..db import connection
from ..deps import get_current_user_id

router = APIRouter(prefix="/api/events", tags=["events"])

# Allow-list keeps the table clean and bounds cardinality.
_ALLOWED = {
    "onboarding_start", "field_created", "crop_set", "first_scene_seen",
    "advice_viewed", "telegram_connected", "checklist_complete",
}


@router.post("")
async def log_event(body: dict, user_id: str = Depends(get_current_user_id)):
    name = str(body.get("name") or "")[:64]
    if name not in _ALLOWED:
        return {"ok": False, "reason": "unknown_event"}
    org_id = body.get("org_id")
    meta = body.get("meta")
    try:
        async with connection(user_id) as conn:
            await conn.execute(
                """insert into public.user_events (user_id, org_id, name, meta)
                   values ($1::uuid, $2::uuid, $3, $4::jsonb)""",
                user_id, org_id if org_id else None, name,
                json.dumps(meta) if meta is not None else None)
    except Exception:  # noqa: BLE001 — analytics must never surface an error to the caller
        pass
    return {"ok": True}
