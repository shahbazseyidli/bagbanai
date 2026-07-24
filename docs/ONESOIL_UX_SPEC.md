# OneSoil UX form — alignment spec (from live app screenshots, 2026-07-24)

Source: user's logged-in OneSoil session (app.yield.onesoil.ai, app.onesoil.ai, onesoil.ai marketing, intercom help).
Directive: "Bu formaya sal. Sol tərəfdən yaxşıdır, userlar belə öyrəşib." → match OneSoil's overall *form*; keep our left rail.

## The shell (what the whole app looks like)
`[78px icon rail] [~280px context panel] [flex-1 MAP STAGE]`
- **Map-first**: the satellite map is the dominant, always-present element. Panels are light and sit beside it, never a wall of stacked cards.
- **Icon rail** (we keep our teal rail): logo tile top, vertical icon stack, support/account at the bottom. Active = accent-tinted.
- **Context panel** (our FieldListPanel — align it to OneSoil's "My Fields"):
  - Header: title + "Owner" subline + a collapse chevron.
  - **Season selector** row: "Season 2026 · N.NN ha" (we have field_seasons — surface the current season + total area).
  - **Search + Sort** row.
  - Field cards (name, area, score dot, attention line). Selecting → opens the field.
  - Empty state: centered icon + "Sahələrinizi əlavə edin" + one-line why + a green **primary** button.
  - Pinned at the BOTTOM: a **"Sualınız var? — Pulsuz zəng istəyin"** support card (matches OneSoil's "Request a free call"). This is our C9 SupportCard.
- **Map stage**: full satellite. Top-left a "Məhsul / Sahə adı" toggle pill; top-right a search. Existing map controls (zoom/3D/measure/locate) stay.

## Visual language
- Light, airy, **thin 1px borders**, generous padding, ONE green accent (our --grass #1E9852 / OneSoil green), rounded ~10–14px, subtle shadows. Less density than today.
- Our approved tokens already cover this: paper/panel/line/teal/mint/grass, shadow-soft, rounded-xl2, font-display. Use them; do not invent a new palette.

## Marketing / solutions (already close — keep)
- Solutions split exactly like OneSoil: "who grow" = Fermer; "who help to grow" = Laboratoriya · Konsultant · (Texnika dilerləri) · Təchizatçı. Our /solutions already does this.
- Help center = our /guide hub (C8): search + article collections, like intercom.help/onesoil.

## Concrete alignment tasks (keep everything that works; only re-form)
1. **FieldListPanel → OneSoil "My Fields"**: owner subline, season selector (current field_season + Σ area), search+sort, score-dot field cards, bottom SupportCard. Collapsible.
2. **/fields as a map-first screen**: the field list panel beside a full-bleed multi-field map (we have FieldsOverviewMap + FieldListPanel — compose them map-first instead of a plain list page).
3. **Lighten density** on the app screens toward OneSoil's airiness where ours is heavier — spacing, border weight, one-accent discipline. Do NOT restyle working data components wholesale; adjust shells/containers.
4. Keep the teal rail (approved mockup + user said the left nav is good).
