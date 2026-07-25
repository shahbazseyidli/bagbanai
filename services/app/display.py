"""Cross-user display name (New-B).

A farmer who opted out of name visibility (users.name_public=false) is shown to OTHER users as a
stable alias instead of their real name. Apply this ONLY where one user sees another (chat
participant, peer suggestions, community); a user always sees their own real name elsewhere."""
from __future__ import annotations


def alias_for(user_id) -> str:
    """Stable, non-identifying handle derived from the user id, e.g. 'user_3f9a1c'."""
    return "user_" + str(user_id).replace("-", "")[:6]


def public_display_name(full_name, role, name_public, user_id) -> str:
    """Name to show to other users. Farmers who opted out get the alias; everyone else their name."""
    if role == "farmer" and name_public is False:
        return alias_for(user_id)
    return full_name or alias_for(user_id)
