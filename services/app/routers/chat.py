"""In-app messaging (HYBRID_PLAN §E, 0031): farmer↔provider and farmer↔farmer conversations, the
people directory that fills the Messages screen, contextual peer suggestions (E7 — other growers
with the same crop / nearby region), and the pinned Agradex AI pseudo-conversation. User-scoped: a
caller may only read conversations they participate in. Distinct from routers/messaging.py, which
is the Telegram delivery channel.

THREE THINGS IN HERE ARE LOAD-BEARING AND SHOULD NOT BE "SIMPLIFIED":

1. AGRADEX AI IS SYNTHETIC. There is deliberately no row in public.users for it and no row in
   public.conversations. A real user row would show up in this very directory, be messageable by
   strangers, need an email and a password hash, and be counted in every user statistic — for an
   entity that is a prompt. A conversations row would be worse: _assert_participant checks that the
   caller is a_user_id or b_user_id, and the assistant is neither, so the guard would have to be
   loosened for it. Instead the API *describes* the assistant (GET /assistant) and the client pins
   it like any other thread. Its transcript stays in public.ai_chat_messages, keyed by FIELD,
   because the whole value of this assistant is the field context (ai/context.py) — an AI chat with
   no field attached would be a generic chatbot. That is why every assistant route takes a
   field_id in the path rather than implying one.

2. THE DIRECTORY IS NOT "every user in the database". Providers publish a profile in order to be
   found, so they are listed freely. Farmers did not: they are scoped to the caller's own crops and
   regions (the same rule /peers has always used, widened from one field to all of them), and every
   farmer name goes through display.public_display_name so an opted-out farmer appears as a stable
   alias. Listing all farmers to everyone would be a privacy leak, not a fuller screen.

3. THE EXISTING GUARANTEES STAY. _assert_participant on every conversation read/write, conversation
   reads scoped to the caller, cannot_message_self.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from .. import tiers
from ..ai import chat as ai_chat
from ..ai import llm
from ..db import connection
from ..deps import get_current_user_id, require_member, safe_uuid
from ..display import public_display_name
from ..schemas import (AssistantFieldOut, AssistantInfoOut, AssistantMessageIn, AssistantReplyOut,
                       AssistantThreadOut, AssistantTurnOut, ConversationOut, DirectoryOut,
                       DirectoryPersonOut, DirectoryScopeOut, MessageIn, MessageOut,
                       StartConversationIn)
# Imported rather than re-derived on purpose. _resolve_locale is the single rule for "what language
# do we write prose in" (body → X-Locale → cookie → az) and a second copy would drift the way
# auth.py::_effective_area_unit drifted from defaultAreaUnit(). _org_of_field is the one funnel that
# turns a field id into an org id and a malformed id into a 404 instead of a Postgres 22P02 → 500.
from .advice import _resolve_locale
from .fields import _org_of_field
from .providers import list_providers as _list_providers

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ai/chat.py writes the question and the reply in ONE transaction, so both rows carry the same
# now() to the microsecond — verified live: the newest two turns came back with an identical
# created_at. Ordering by that column alone therefore has NO tiebreak, Postgres may return either
# row of a pair first, and it showed the farmer's question BELOW the answer it prompted while the
# thread preview alternated between the question and the reply. Role is the tiebreak: inside a pair
# the assistant always follows the user, by construction.


# The synthetic assistant. NOT a uuid, and that is the point: any client or query that mistakes it
# for a user id fails loudly at the ::uuid cast instead of silently addressing some real account.
ASSISTANT_ID = "agradex-ai"
ASSISTANT_NAME = "Agradex AI"           # a brand name — identical in all 8 locales, so not an i18n key

# conversations.kind is a free-text column (0031) with no CHECK. Clamp unknown input rather than let
# a client invent categories the UI cannot render.
_CONV_KINDS = {"peer", "provider"}
_PROVIDER_KINDS = {"lab", "consultant", "supplier"}


def _iso(v):
    return v.isoformat() if v is not None else None


@router.get("", response_model=list[ConversationOut])
async def list_conversations(user_id: str = Depends(get_current_user_id)):
    """The caller's threads, newest activity first.

    One query, not one-per-conversation: the old shape ran a fetchrow per row to resolve the other
    participant, so a farmer with 40 threads paid 41 round-trips to draw one list."""
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """with mine as (
                 select c.id, c.kind, c.last_text, c.last_at, c.created_at,
                        case when c.a_user_id=$1::uuid then c.b_user_id else c.a_user_id end as other_id
                   from public.conversations c
                  where c.a_user_id=$1::uuid or c.b_user_id=$1::uuid
               )
               select m.id, m.kind, m.last_text, m.last_at, m.other_id,
                      u.full_name, u.role, u.name_public, u.deleted_at,
                      pp.company,
                      (select count(*) from public.messages msg
                        where msg.conversation_id = m.id
                          and msg.sender_id <> $1::uuid
                          and msg.read_at is null) as unread
                 from mine m
                 -- LEFT so a thread still renders if the counterpart row is somehow gone; the
                 -- transcript belongs to the caller too and must not vanish with them.
                 left join public.users u on u.id = m.other_id
                 left join public.provider_profiles pp on pp.user_id = u.id
                order by m.last_at desc nulls last, m.created_at desc
                limit 100""", user_id)
    return [ConversationOut(
        id=str(r["id"]), other_user_id=str(r["other_id"]),
        other_name=public_display_name(
            r["full_name"], r["role"], r["name_public"], r["other_id"]) if r["role"] else None,
        other_role=r["role"],
        other_company=r["company"],
        other_deleted=r["deleted_at"] is not None,
        kind=r["kind"], last_text=r["last_text"], last_at=_iso(r["last_at"]),
        unread=int(r["unread"] or 0)) for r in rows]


@router.post("/start")
async def start_conversation(body: StartConversationIn, user_id: str = Depends(get_current_user_id)):
    """Get-or-create a conversation with another user; optionally post a first message."""
    # Canonicalise before comparing AND before sorting: the a<b dedup key below is a string sort, so
    # an uppercase uuid would hash to a different pair than the same account in lowercase and create
    # a second thread with the same person.
    other_id = safe_uuid(body.other_user_id, "user_not_found")
    if other_id == user_id:
        raise HTTPException(status_code=400, detail="cannot_message_self")
    kind = body.kind if body.kind in _CONV_KINDS else "peer"
    a, b = sorted([user_id, other_id])
    async with connection(user_id) as conn:
        exists = await conn.fetchval(
            # A closed account (0052 anonymises rather than deletes) is not a valid recipient:
            # nobody will ever read the message.
            "select 1 from public.users where id=$1::uuid and deleted_at is null", other_id)
        if not exists:
            raise HTTPException(status_code=404, detail="user_not_found")
        conv_id = await conn.fetchval(
            """insert into public.conversations (a_user_id, b_user_id, kind)
               values ($1::uuid, $2::uuid, $3)
               on conflict (a_user_id, b_user_id) do update set kind=public.conversations.kind
               returning id""", a, b, kind)
        if body.body:
            await conn.execute(
                "insert into public.messages (conversation_id, sender_id, body) values ($1::uuid,$2::uuid,$3)",
                conv_id, user_id, body.body)
            await conn.execute(
                "update public.conversations set last_text=$2, last_at=now() where id=$1::uuid",
                conv_id, body.body[:200])
    return {"id": str(conv_id)}


async def _assert_participant(conn, conv_id: str, user_id: str) -> None:
    ok = await conn.fetchval(
        "select 1 from public.conversations where id=$1::uuid and ($2::uuid in (a_user_id, b_user_id))",
        conv_id, user_id)
    if not ok:
        raise HTTPException(status_code=403, detail="forbidden")


# ---------------------------------------------------------------------------------------------
# People directory — what the Messages screen shows when the caller has no threads yet (task 3).
# Declared before /{conv_id}/... so the literal path can never be read as a conversation id.
# ---------------------------------------------------------------------------------------------
@router.get("/directory", response_model=DirectoryOut)
async def directory(
    user_id: str = Depends(get_current_user_id),
    kind: Optional[str] = Query(default=None, description="farmer | lab | consultant | supplier"),
    region: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
):
    """Who the caller can write to.

    Two lists, because they are two different kinds of claim:

    * `providers` — labs, consultants and suppliers. Public by construction: they published a
      profile precisely so farmers would find them. Sourced from routers/providers.py's own
      directory query, called as a plain function, so there is exactly one filter language for
      "find a provider" and the catalog and the Messages screen can never disagree.
    * `farmers` — NOT public. Scoped to the caller's own crops and regions, and every name run
      through public_display_name. `scope` reports what that scoping used so the UI can explain an
      empty list honestly instead of implying the platform is deserted.

    `q` searches provider company/bio; for farmers it matches crop and region only — matching it
    against names would defeat the alias for exactly the people who asked to be hidden.
    """
    want_providers = kind is None or kind in _PROVIDER_KINDS
    want_farmers = kind is None or kind == "farmer"

    provider_rows = []
    if want_providers:
        # Called directly, not through HTTP. Every parameter must be passed explicitly: the defaults
        # in that signature are FastAPI Query/Depends objects, not None, so an omitted argument
        # would reach SQL as a Query instance.
        provider_rows = await _list_providers(
            user_id=user_id, kind=kind if kind in _PROVIDER_KINDS else None,
            country=None, region=region, q=q, spec=None)

    like = f"%{q}%" if q else None
    region_like = f"%{region}%" if region else None

    async with connection(user_id) as conn:
        # Existing threads, so the card can say "open" instead of silently starting a second one.
        conv_rows = await conn.fetch(
            """select id,
                      case when a_user_id=$1::uuid then b_user_id else a_user_id end as other_id
                 from public.conversations
                where a_user_id=$1::uuid or b_user_id=$1::uuid""", user_id)
        conv_by_user = {str(r["other_id"]): str(r["id"]) for r in conv_rows}

        providers: list[DirectoryPersonOut] = []
        if provider_rows:
            # One lookup for all provider owners. public_display_name returns the real name for
            # every non-farmer role, but routing them through it anyway keeps ONE rule for
            # "what may one user see of another" instead of a role check at each call site.
            owner_ids = [p.user_id for p in provider_rows]
            urows = await conn.fetch(
                # text[]::uuid[] rather than a bare uuid[]: these ids came back from ProviderOut as
                # plain strings (see routers/bulk.py::_verify_fields for the same encoding note).
                "select id, full_name, role, name_public, deleted_at from public.users "
                "where id = any($1::text[]::uuid[]) and deleted_at is null", owner_ids)
            by_id = {str(u["id"]): u for u in urows}
            for p in provider_rows:
                if p.user_id == user_id:
                    continue                      # never offer the caller themselves
                u = by_id.get(p.user_id)
                if u is None:
                    continue                      # closed account — the profile outlives the person
                person = public_display_name(u["full_name"], u["role"], u["name_public"], u["id"])
                providers.append(DirectoryPersonOut(
                    # `name` falls back to the person only when the profile has no company —
                    # otherwise the company IS the public identity. The registrant's own name is
                    # deliberately NOT sent as a separate field: public_display_name is a no-op for
                    # non-farmer roles (display.py), so a person_name column would hand every
                    # authenticated caller the real name of whoever registered the business, which
                    # GET /api/providers has never done. Nothing rendered it either.
                    user_id=p.user_id, name=p.company or person, role=p.kind,
                    company=p.company, bio=p.bio, specializations=list(p.specializations or []),
                    country=p.country, region=p.region, rating=p.rating, featured=p.featured,
                    provider_id=p.id, match="provider",
                    conversation_id=conv_by_user.get(p.user_id)))
                if len(providers) >= limit:
                    break

        # ---- providers who never filled in a profile ----
        # provider_profiles has ZERO rows in production while six lab/consultant/supplier accounts
        # exist, so sourcing this list from profiles alone ships the owner's original complaint
        # back to them: "hazırda bu hissə çox boşdur". A consultant who signed up and has not yet
        # written a bio is still a consultant, is still reachable, and is exactly who a farmer with
        # a problem wants to find. Publishing a profile controls how you are DESCRIBED in the
        # catalog; it does not control whether you can be written to.
        #
        # Listed after the profiled ones and with company/bio/rating left null, so a filled profile
        # still outranks an empty one and the card renders the absence rather than inventing text.
        # Their names are their real names, which is the same rule the catalog already applies:
        # public_display_name is a no-op for non-farmer roles, because a business that registered to
        # be found has not asked to be hidden.
        if want_providers and len(providers) < limit:
            seen = {pr.user_id for pr in providers} | {user_id}
            kinds = [kind] if kind in _PROVIDER_KINDS else sorted(_PROVIDER_KINDS)
            urows = await conn.fetch(
                """select u.id, u.full_name, u.role, u.region, u.country
                     from public.users u
                     left join public.provider_profiles pp on pp.user_id = u.id
                    where u.role::text = any($1::text[])
                      and u.deleted_at is null
                      and pp.id is null
                      and ($2::text is null or u.region ilike $2)
                      and ($3::text is null or u.full_name ilike $3)
                    order by u.full_name nulls last, u.id
                    limit $4""",
                kinds, region_like, like, limit)
            for u in urows:
                uid = str(u["id"])
                if uid in seen or len(providers) >= limit:
                    continue
                providers.append(DirectoryPersonOut(
                    user_id=uid,
                    name=public_display_name(u["full_name"], u["role"], True, u["id"]),
                    role=u["role"], country=u["country"], region=u["region"],
                    match="provider", conversation_id=conv_by_user.get(uid)))

        # ---- scope: what the caller grows and where ----
        scope_rows = await conn.fetch(
            """select distinct nullif(fm.crop_type, '') as crop, nullif(fm.region, '') as region
                 from public.organization_members om
                 join public.farms fa on fa.org_id = om.org_id
                 join public.fields f on f.farm_id = fa.id and f.deleted_at is null
                 left join public.field_metadata fm on fm.field_id = f.id
                where om.user_id = $1::uuid and om.status = 'active'""", user_id)
        crops = sorted({r["crop"] for r in scope_rows if r["crop"]})
        regions = {r["region"] for r in scope_rows if r["region"]}
        # A caller with no fields yet (a brand-new farmer, or a consultant) still has a home region
        # on their account. Region only — country would be "everyone in Azerbaijan", which is the
        # unbounded list this scoping exists to prevent.
        own_region = await conn.fetchval(
            "select nullif(region, '') from public.users where id=$1::uuid", user_id)
        if own_region:
            regions.add(own_region)
        region_list = sorted(regions)

        # WHO MAY SEE FARMERS AT ALL. The scoping below bounds WHICH farmers, and the docstring
        # above describes it as "the caller's own crops and regions" — a sentence that quietly
        # assumes a farmer is asking. Nothing enforced that. users.region is set at signup for
        # PROVIDER accounts too (schemas.SignupIn / auth.py), so a supplier could register with
        # region='Quba', add no fields at all, and receive up to `limit` farmers in that region —
        # real names wherever name_public is true, which is the default — each with a one-tap
        # message button. That is an enumeration tool, not a peer directory.
        #
        # The rule this endpoint generalised, GET /api/chat/peers, is farmer-to-farmer by
        # construction: capped at six, scoped to ONE field, and reachable only from a field page the
        # caller already owns. Generalising it must not also widen who it answers.
        #
        # A provider reaching a farmer is not blocked, it is simply not initiated here: the farmer
        # finds the provider in the catalog and writes first. That asymmetry is the point.
        caller_role = await conn.fetchval(
            "select role::text from public.users where id=$1::uuid", user_id)
        farmers: list[DirectoryPersonOut] = []
        # 2026-08-03, owner decision: the directory lists EVERY farmer, not only crop/region
        # matches — the community is small and an empty screen read as "the platform is deserted".
        # What SURVIVES of the original design: the caller must be a farmer (providers still cannot
        # enumerate growers — they are found in the catalog and written to first), names still pass
        # through public_display_name, and crop/region now drive ORDERING instead of filtering
        # (`scope` stays in the response so the UI can explain the sort).
        if want_farmers and caller_role == "farmer":
            frows = await conn.fetch(
                """select u.id as uid, u.full_name, u.name_public,
                          fm2.crop, coalesce(fm2.region, u.region) as region,
                          coalesce(fm2.crop = any($2::text[]), false) as crop_match,
                          coalesce(coalesce(fm2.region, u.region) = any($3::text[]), false) as region_match
                     from public.users u
                     left join lateral (
                        select fm.crop_type as crop, nullif(fm.region, '') as region
                          from public.field_metadata fm
                          join public.fields f on f.id = fm.field_id and f.deleted_at is null
                          join public.farms fa on fa.id = f.farm_id
                          join public.organization_members om
                               on om.org_id = fa.org_id and om.status = 'active' and om.user_id = u.id
                         order by (fm.crop_type = any($2::text[])) desc nulls last
                         limit 1) fm2 on true
                    where u.id <> $1::uuid
                      and u.role = 'farmer'
                      and u.deleted_at is null
                      and ($4::text is null
                           or fm2.crop ilike $4 or coalesce(fm2.region, u.region, '') ilike $4)
                      and ($5::text is null
                           or coalesce(fm2.region, u.region, '') ilike $5)
                    order by crop_match desc, region_match desc, u.created_at
                    limit $6""",
                user_id, crops, region_list, like, region_like, limit)
            for r in frows:
                farmers.append(DirectoryPersonOut(
                    user_id=str(r["uid"]),
                    name=public_display_name(r["full_name"], "farmer", r["name_public"], r["uid"]),
                    role="farmer", crop=r["crop"], region=r["region"],
                    match="crop" if r["crop_match"] else ("region" if r["region_match"] else None),
                    conversation_id=conv_by_user.get(str(r["uid"]))))

    return DirectoryOut(providers=providers, farmers=farmers,
                        scope=DirectoryScopeOut(crops=crops, regions=region_list))


# ---------------------------------------------------------------------------------------------
# Agradex AI — the pinned pseudo-conversation (task 2).
# ---------------------------------------------------------------------------------------------
def _assistant_info(configured: bool, fields: list[AssistantFieldOut]) -> AssistantInfoOut:
    """The list-row description of the assistant: identity, plus the newest turn across all of the
    caller's fields so the pinned row shows a preview like every other thread."""
    newest = max((f for f in fields if f.last_at), key=lambda f: f.last_at, default=None)
    return AssistantInfoOut(
        id=ASSISTANT_ID, name=ASSISTANT_NAME, role="assistant", configured=configured,
        # Open on the field the farmer was last talking about; otherwise the first field they own.
        default_field_id=(newest.field_id if newest else (fields[0].field_id if fields else None)),
        last_text=newest.last_text if newest else None,
        last_at=newest.last_at if newest else None,
        fields=fields)


async def _quota(conn, org_id: str, cache: dict) -> tuple[int, int]:
    """(limit, used) for an org's AI chat this month, memoised per request.

    Two fields in one organization share one allowance, so resolving this per field would be both
    wrong to display and N queries. The rule itself stays in ai/chat.py — this is a rendering hint,
    exactly like GET /api/fields/{id}/chat's chat_enabled."""
    if org_id not in cache:
        tier = await tiers.org_tier(conn, org_id)
        cache[org_id] = (tiers.limit(tier, "chat_per_month"),
                         await tiers.month_count(conn, org_id, "chat"))
    return cache[org_id]


async def _assistant_fields(conn, user_id: str) -> list[AssistantFieldOut]:
    rows = await conn.fetch(
        """select f.id, f.org_id, f.name, f.area_ha, fm.crop_type
             from public.organization_members om
             join public.farms fa on fa.org_id = om.org_id
             join public.fields f on f.farm_id = fa.id and f.deleted_at is null
             left join public.field_metadata fm on fm.field_id = f.id
            where om.user_id = $1::uuid and om.status = 'active'
            order by f.created_at""", user_id)
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    # Newest turn per field (distinct on) + volume (group by) — two cheap passes over the same
    # rows, which beats a window function nobody will read in six months.
    last = await conn.fetch(
        """select distinct on (field_id) field_id, content, created_at
             from public.ai_chat_messages where field_id = any($1::uuid[])
            order by field_id, created_at desc, (role = 'assistant') desc""", ids)
    counts = await conn.fetch(
        """select field_id, count(*) as n from public.ai_chat_messages
            where field_id = any($1::uuid[]) group by field_id""", ids)
    last_by = {str(r["field_id"]): r for r in last}
    count_by = {str(r["field_id"]): int(r["n"]) for r in counts}

    cache: dict = {}
    out: list[AssistantFieldOut] = []
    for r in rows:
        fid, oid = str(r["id"]), str(r["org_id"])
        lim, used = await _quota(conn, oid, cache)
        lr = last_by.get(fid)
        out.append(AssistantFieldOut(
            field_id=fid, org_id=oid, name=r["name"], crop=r["crop_type"],
            area_ha=float(r["area_ha"]) if r["area_ha"] is not None else None,
            message_count=count_by.get(fid, 0),
            last_text=lr["content"][:200] if lr else None,
            last_at=_iso(lr["created_at"]) if lr else None,
            chat_limit=lim, chat_used=used, chat_enabled=lim > used))
    return out


@router.get("/assistant", response_model=AssistantInfoOut)
async def assistant_info(user_id: str = Depends(get_current_user_id)):
    """Describe the Agradex AI thread so the client can pin it above the real conversations.

    Returns every field the caller may talk about, because this assistant is field-scoped: the
    client picks one (default_field_id) and the picker is the "which field?" affordance."""
    async with connection(user_id) as conn:
        fields = await _assistant_fields(conn, user_id)
    return _assistant_info(llm.is_configured(), fields)


async def _assistant_field(conn, user_id: str, field_id: str) -> AssistantFieldOut:
    """Gate + describe one field for the assistant thread.

    require_member, NOT require_field_read: a field GRANT (0061) widens who may *look* at a field,
    and talking to the AI is neither looking nor free — it spends the owning organization's monthly
    chat quota and writes into their transcript. Grants stay read-only by design."""
    org_id = await _org_of_field(conn, field_id)
    await require_member(conn, user_id, org_id)
    r = await conn.fetchrow(
        """select f.id, f.org_id, f.name, f.area_ha, fm.crop_type
             from public.fields f
             left join public.field_metadata fm on fm.field_id = f.id
            where f.id = $1::uuid and f.deleted_at is null""", field_id)
    if not r:
        raise HTTPException(status_code=404, detail="field_not_found")
    lim, used = await _quota(conn, org_id, {})
    return AssistantFieldOut(
        field_id=str(r["id"]), org_id=org_id, name=r["name"], crop=r["crop_type"],
        area_ha=float(r["area_ha"]) if r["area_ha"] is not None else None,
        chat_limit=lim, chat_used=used, chat_enabled=lim > used)


async def _turns(conn, rows, user_id: str) -> list[AssistantTurnOut]:
    """ai_chat_messages rows → MessageOut-compatible bubbles.

    A teammate in the same organization can have asked earlier questions on the same field, so a
    user turn is not necessarily the caller's: resolve those names (privacy-filtered) rather than
    letting the client attribute someone else's question to the reader."""
    others = {str(r["user_id"]) for r in rows
              if r["role"] == "user" and r["user_id"] and str(r["user_id"]) != user_id}
    names: dict[str, str] = {}
    if others:
        urows = await conn.fetch(
            # text[]::uuid[] — `others` holds str(...) ids, not uuid.UUID objects.
            "select id, full_name, role, name_public from public.users "
            "where id = any($1::text[]::uuid[])", list(others))
        names = {str(u["id"]): public_display_name(
            u["full_name"], u["role"], u["name_public"], u["id"]) for u in urows}
    out = []
    for r in rows:
        assistant = r["role"] != "user"
        sender = ASSISTANT_ID if assistant else (str(r["user_id"]) if r["user_id"] else "")
        out.append(AssistantTurnOut(
            id=str(r["id"]), sender_id=sender,
            sender_name=ASSISTANT_NAME if assistant else names.get(sender),
            body=r["content"], created_at=_iso(r["created_at"]), mine=(not assistant) and sender == user_id,
            role="assistant" if assistant else "user"))
    return out


@router.get("/assistant/{field_id}/messages", response_model=AssistantThreadOut)
async def assistant_messages(field_id: str, user_id: str = Depends(get_current_user_id)):
    """The AI transcript for one field, in the same bubble shape as a human thread."""
    async with connection(user_id) as conn:
        fld = await _assistant_field(conn, user_id, field_id)
        rows = await conn.fetch(
            """select id, role, content, user_id, created_at from public.ai_chat_messages
                where field_id=$1::uuid
                order by created_at asc, (role = 'user') desc limit 500""", fld.field_id)
        msgs = await _turns(conn, rows, user_id)
        fields = await _assistant_fields(conn, user_id)
    return AssistantThreadOut(
        assistant=_assistant_info(llm.is_configured(), fields), field=fld, messages=msgs,
        configured=llm.is_configured(), chat_limit=fld.chat_limit, chat_used=fld.chat_used,
        chat_enabled=fld.chat_enabled)


@router.post("/assistant/{field_id}/messages", response_model=AssistantReplyOut)
async def assistant_send(field_id: str, body: AssistantMessageIn, request: Request,
                         user_id: str = Depends(get_current_user_id)):
    """Ask Agradex AI about this field. Same engine as the field page's analysis chat — one
    transcript, whichever screen the farmer typed on."""
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="empty_message")
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="ai_not_configured")
    locale = _resolve_locale(request, body.locale)
    async with connection(user_id) as conn:
        fld = await _assistant_field(conn, user_id, field_id)
        # ai/chat.py::answer returns the tier/quota refusal as an ephemeral string and stores
        # NOTHING, so "was this a real answer?" is decided by observing the store, not by
        # re-implementing the gate predicate here — a second copy of that rule is exactly how two
        # answers to the same question start to drift.
        before = int(await conn.fetchval(
            "select count(*) from public.ai_chat_messages where field_id=$1::uuid", fld.field_id) or 0)
        reply = await ai_chat.answer(conn, fld.field_id, user_id, body.body, locale=locale)
        if reply is None:
            raise HTTPException(status_code=503, detail="ai_unavailable")
        after = int(await conn.fetchval(
            "select count(*) from public.ai_chat_messages where field_id=$1::uuid", fld.field_id) or 0)
        persisted = after > before
        msgs: list[AssistantTurnOut] = []
        if persisted:
            # answer() writes exactly two rows: the farmer's question and the reply.
            rows = await conn.fetch(
                """select id, role, content, user_id, created_at from public.ai_chat_messages
                    where field_id=$1::uuid
                    order by created_at desc, (role = 'assistant') desc limit 2""", fld.field_id)
            msgs = await _turns(conn, list(reversed(rows)), user_id)
        # Re-read the quota AFTER the turn so the client's counter reflects what it just spent.
        lim, used = await _quota(conn, fld.org_id, {})
    return AssistantReplyOut(reply=reply, persisted=persisted, messages=msgs,
                             chat_limit=lim, chat_used=used, chat_enabled=lim > used)


# ---------------------------------------------------------------------------------------------
# Human conversations. Parameterised paths come last so /directory and /assistant win the match.
# ---------------------------------------------------------------------------------------------
@router.get("/{conv_id}/messages", response_model=list[MessageOut])
async def list_messages(conv_id: str, user_id: str = Depends(get_current_user_id)):
    conv_id = safe_uuid(conv_id, "conversation_not_found")
    async with connection(user_id) as conn:
        await _assert_participant(conn, conv_id, user_id)
        rows = await conn.fetch(
            "select id, sender_id, body, created_at from public.messages "
            "where conversation_id=$1::uuid order by created_at asc limit 500", conv_id)
        await conn.execute(
            "update public.messages set read_at=now() where conversation_id=$1::uuid "
            "and sender_id<>$2::uuid and read_at is null", conv_id, user_id)
    return [MessageOut(id=str(r["id"]), sender_id=str(r["sender_id"]), body=r["body"],
                       created_at=_iso(r["created_at"]), mine=str(r["sender_id"]) == user_id)
            for r in rows]


@router.post("/{conv_id}/messages", response_model=MessageOut)
async def send_message(conv_id: str, body: MessageIn, user_id: str = Depends(get_current_user_id)):
    conv_id = safe_uuid(conv_id, "conversation_not_found")
    async with connection(user_id) as conn:
        await _assert_participant(conn, conv_id, user_id)
        r = await conn.fetchrow(
            "insert into public.messages (conversation_id, sender_id, body) "
            "values ($1::uuid,$2::uuid,$3) returning id, sender_id, body, created_at",
            conv_id, user_id, body.body)
        await conn.execute(
            "update public.conversations set last_text=$2, last_at=now() where id=$1::uuid",
            conv_id, body.body[:200])
    return MessageOut(id=str(r["id"]), sender_id=str(r["sender_id"]), body=r["body"],
                      created_at=_iso(r["created_at"]), mine=True)


@router.get("/peers")
async def peer_suggestions(
    field_id: str = Query(...), user_id: str = Depends(get_current_user_id)):
    """E7 — suggest other farmers growing the same crop or in the same region as this field, so the
    farmer can consult a peer. Best-effort: any query error returns an empty list (never blocks UI)."""
    try:
        async with connection(user_id) as conn:
            fm = await conn.fetchrow(
                """select fm.crop_type, coalesce(fm.region, '') as region
                   from public.fields f left join public.field_metadata fm on fm.field_id=f.id
                   where f.id=$1::uuid""", field_id)
            crop = fm["crop_type"] if fm else None
            region = fm["region"] if fm else None
            rows = await conn.fetch(
                """select distinct u.id, u.full_name, u.name_public,
                          fm.crop_type, coalesce(fm.region, u.region) as region
                   from public.field_metadata fm
                   join public.fields f on f.id = fm.field_id
                   join public.farms fa on fa.id = f.farm_id
                   join public.organization_members om on om.org_id = fa.org_id
                   join public.users u on u.id = om.user_id
                   where u.id <> $1::uuid and u.role = 'farmer' and u.deleted_at is null
                     and (($2::text is not null and fm.crop_type = $2)
                          or ($3::text <> '' and fm.region = $3))
                   limit 6""", user_id, crop, region or "")
        return [{"user_id": str(r["id"]),
                 "name": public_display_name(r["full_name"], "farmer", r["name_public"], r["id"]),
                 "crop": r["crop_type"], "region": r["region"]} for r in rows]
    except Exception:  # noqa: BLE001 — suggestions must never surface an error
        return []
