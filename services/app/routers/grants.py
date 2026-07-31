"""Per-field access for a named person (0061).

WHAT THIS IS FOR. "My agronomist should look at this field" is the commonest access request in the
research corpus, and until now there were only two answers, both wrong:
  * a token share link (0040) — anonymous, so it cannot be revoked from one person or audited, and
    it shows a summary card rather than the record;
  * an organization membership — which hands over every field, every farm, the team and the costs,
    in order to show one orchard.

A grant is the honest middle: one field, one named signed-in person, revocable, read-only.

WHAT A GRANTEE CAN ACTUALLY REACH. Exactly one route: GET /api/fields/{id}/report. Not the field
page, not the indices, not the org. That is a deliberate design decision rather than a first
instalment — the report is already a complete read-only single-field document, so widening it
answers the whole request without a second judgement call about which of eighty routes is safe.
Nothing in that document addresses a sibling field, the farm, the team or the organization, so
there is no path from a grant to anything but the field it names.

GRANTING IS A WRITE ON THE FIELD, so it takes ROLES_WRITE on the organization — the same gate as
renaming it. Revoking is deliberately WIDER on one axis: a grantee may revoke their own access,
because being able to walk away from data someone shared with you should never require asking them.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field as PField

from ..db import connection
from ..deps import ROLES_WRITE, get_current_user_id, require_role
from ..display import public_display_name
from .fields import _org_of_field

router = APIRouter(prefix="/api", tags=["grants"])


class GrantIn(BaseModel):
    # The person is named by EMAIL, not by user id. A farmer knows their agronomist's email; they
    # have no way to discover a uuid, and an endpoint that accepted one would be an invitation to
    # enumerate the user table.
    email: str = PField(min_length=3, max_length=254)
    note: Optional[str] = PField(default=None, max_length=200)


def _norm_email(v: str) -> str:
    return (v or "").strip().lower()


@router.get("/fields/{field_id}/grants")
async def list_grants(field_id: str, user_id: str = Depends(get_current_user_id)):
    """Who this field is shared with. Org-side view, so it takes the org write role."""
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)
        rows = await conn.fetch(
            """select g.id, g.note, g.created_at, g.revoked_at, g.expires_at,
                      u.id as uid, u.email, u.full_name, u.role, u.name_public
                 from public.field_grants g
                 join public.users u on u.id = g.grantee_user_id
                where g.field_id=$1::uuid and g.revoked_at is null
                order by g.created_at desc""", field_id)
    return [
        {
            "id": str(r["id"]),
            # The email is shown back because the granter TYPED it — it is the only handle they
            # have on this person and echoing it is how they confirm they picked the right one.
            "email": r["email"],
            # The name follows the product's single visibility rule (display.py / 0045) rather than
            # a second one invented here.
            "name": public_display_name(r["full_name"], r["role"], r["name_public"], r["uid"]),
            "note": r["note"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
        }
        for r in rows
    ]


@router.post("/fields/{field_id}/grants")
async def create_grant(field_id: str, body: GrantIn,
                       user_id: str = Depends(get_current_user_id)):
    """Give one signed-in person read access to this field."""
    email = _norm_email(body.email)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_role(conn, user_id, org_id, ROLES_WRITE)

        # Case-insensitively, because 0059 made lower(email) the unique key and people type their
        # own address in whatever case they please.
        grantee = await conn.fetchrow(
            "select id, full_name, role, name_public from public.users "
            "where lower(email)=$1 and deleted_at is null", email)
        if not grantee:
            # NOT an invitation. Creating an account for someone because a third party typed their
            # address is a decision the account holder has to make. The client turns this into
            # "ask them to sign up first".
            raise HTTPException(status_code=404, detail="user_not_found")
        if str(grantee["id"]) == user_id:
            raise HTTPException(status_code=400, detail="cannot_grant_to_self")

        row = await conn.fetchrow(
            """insert into public.field_grants (field_id, org_id, grantee_user_id, created_by, note)
               values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)
               on conflict (field_id, grantee_user_id) do update set
                 -- Re-granting a revoked pair RESTORES it rather than failing or piling up rows.
                 revoked_at = null, note = excluded.note, created_by = excluded.created_by
               returning id, created_at""",
            field_id, org_id, str(grantee["id"]), user_id, body.note)
    return {
        "id": str(row["id"]),
        "email": email,
        "name": public_display_name(grantee["full_name"], grantee["role"],
                                    grantee["name_public"], grantee["id"]),
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.delete("/fields/{field_id}/grants/{grant_id}")
async def revoke_grant(field_id: str, grant_id: str,
                       user_id: str = Depends(get_current_user_id)):
    """Revoke access. Either side may do it.

    The org side because it is their field. The GRANTEE side because walking away from data someone
    else shared with you must never require asking them for permission — and because a revoked row
    is how the grantee's own "shared with me" list is cleaned up.
    """
    async with connection(user_id) as conn:
        row = await conn.fetchrow(
            """select id, org_id, grantee_user_id from public.field_grants
                where id=$1::uuid and field_id=$2::uuid""", grant_id, field_id)
        if not row:
            raise HTTPException(status_code=404, detail="grant_not_found")
        if str(row["grantee_user_id"]) != user_id:
            await require_role(conn, user_id, str(row["org_id"]), ROLES_WRITE)
        await conn.execute(
            "update public.field_grants set revoked_at=now() where id=$1::uuid and revoked_at is null",
            grant_id)
    return {"ok": True}


@router.get("/shared-fields")
async def shared_with_me(user_id: str = Depends(get_current_user_id)):
    """Fields other people have shared with ME.

    Returns only what is needed to render a list and open the report: id, name, area, crop and who
    shared it. NOT the org, NOT the farm, NOT the boundary — a list entry must not become a second
    way to learn things the report itself would not show.
    """
    async with connection(user_id) as conn:
        rows = await conn.fetch(
            """select f.id, f.name, f.area_ha, m.crop_type, g.created_at, g.note,
                      o.id as owner_id, o.full_name as owner_name, o.role as owner_role,
                      o.name_public as owner_public
                 from public.field_grants g
                 join public.fields f on f.id = g.field_id and f.deleted_at is null
                 left join public.field_metadata m on m.field_id = f.id
                 left join public.users o on o.id = g.created_by
                where g.grantee_user_id=$1::uuid
                  and g.revoked_at is null
                  and (g.expires_at is null or g.expires_at > now())
                order by g.created_at desc""", user_id)
    return [
        {
            "id": str(r["id"]),
            "name": r["name"],
            "area_ha": float(r["area_ha"]) if r["area_ha"] is not None else None,
            "crop_type": r["crop_type"],
            "note": r["note"],
            "shared_at": r["created_at"].isoformat() if r["created_at"] else None,
            # Whoever shared it, under the product's one display rule. Their EMAIL is deliberately
            # not here: a farmer who has switched their name off would otherwise be identified by
            # something stronger than the name they hid.
            "shared_by": (public_display_name(r["owner_name"], r["owner_role"],
                                              r["owner_public"], r["owner_id"])
                          if r["owner_id"] else None),
        }
        for r in rows
    ]
