"""Render a localized content dict into email-safe HTML + a plain-text alternative.

Deliberately table-based with inline styles (the only thing every email client renders the same),
plus a small <style> block for progressive enhancement (dark mode, mobile). Agradex brand: emerald
header, white body, green CTA. One layout serves all templates.

A content dict (produced by `catalog`) looks like:
    {
      "subject": str, "preheader": str, "heading": str,
      "intro": [str, ...],                       # paragraphs (str also accepted)
      "steps": [{"n": 1, "text": str}, ...],     # optional
      "stats": [{"val": str, "lab": str}, ...],  # optional
      "blocks": [ {...}, ... ],                  # optional, ordered — see BLOCKS below
      "cta": {"label": str, "url": str},         # optional
      "outro": [str, ...],                        # optional paragraphs
      "signoff": str,                             # e.g. "Ülkər Nəsirova — Agradex"
    }

Render order: heading → intro → blocks → steps → stats → cta → outro → signoff.
The weekly digest should put everything in `blocks`, which is ordered and may mix any block type
(including "steps"/"stats"/"cta"), so one email can interleave sections freely.

BLOCKS
    {"type": "image",   "url": str, "alt": str, "width": int, "height": int, "href": str|None}
    {"type": "score",   "val": int|float (0-100), "label": str, "tone": "good"|"warn"|"bad"|None,
                        "caption": str|None}
    {"type": "bullets", "items": [{"text": str, "sev": "good"|"info"|"warn"|"bad",
                                   "label": str|None}, ...]}
    {"type": "divider"}
    {"type": "text",    "text": str}                       # one paragraph (trusted copy)
    {"type": "heading", "text": str, "small": bool|None}   # section heading
    {"type": "steps",   "items": [{"n": int, "text": str}, ...]}
    {"type": "stats",   "items": [{"val": str, "lab": str}, ...]}
    {"type": "cta",     "label": str, "url": str}

IMAGES: every image is decorative-plus. The mail must read completely with images blocked — the
stats strip and the score block carry the same numbers as text, so never put a fact only in a PNG.

ESCAPING — which slots are trusted:
  * TRUSTED (raw inline HTML honoured): `intro`, `outro`, `steps[].text`, block "text".
    These come from `catalog` copy, which documents inline <b>. They are NOT passed through raw:
    `_rich()` escapes everything and then re-enables a whitelist of bare inline tags
    (<b> <strong> <i> <em> <u> <br>). Attributes are impossible, so a user-controlled field name or
    an LLM-written summary interpolated into these slots (catalog `{field}` / `{summary}`) cannot
    inject markup, links or event handlers.
  * UNTRUSTED (always fully escaped, no HTML at all): `heading`, `preheader`, `signoff`,
    `stats[].val/lab`, `cta.label`, every value in image/score/bullets blocks, and all URLs
    (which additionally must pass `_safe_url` — http/https/mailto only).
  Callers that build ctx from user or LLM data may also use the exported `esc()` on a value before
  handing it to catalog; double-escaping is not a concern for `_rich()` slots (it is idempotent for
  the tag whitelist, and entities render as the literal characters).
"""
from __future__ import annotations

import html as _html
import re
from typing import Any

GREEN = "#15803D"
GREEN_D = "#0E3B24"
INK = "#10231A"
MUTED = "#5B6B60"
FAINT = "#8A978D"
LINE = "#E2E9E1"
TINT = "#F2F8F3"
CARD = "#ffffff"
PAGE = "#EEF2EC"

# Tone palette for score / bullets. Light value, then the brighter dark-mode value used by the
# <style> override below (dark backgrounds need higher-luminance ink to stay AA-legible).
GOOD = "#15803D"
WARN = "#B45309"
BAD = "#B91C1C"
INFO = "#5B6B60"
_TONE = {"good": GOOD, "warn": WARN, "bad": BAD, "info": INFO}

# Score → tone when the caller does not pin one.
SCORE_GOOD = 70
SCORE_WARN = 40

# Footer i18n — reason line + unsubscribe label + brand tagline. Missing locale → az.
_FOOTER: dict[str, dict[str, str]] = {
    "az": {"reason": "Bu məktubu Agradex hesabınız olduğu üçün alırsınız.",
           "unsub": "Bu cür məktublardan imtina et", "addr": "Agradex · Bakı, Azərbaycan"},
    "en": {"reason": "You're receiving this because you have an Agradex account.",
           "unsub": "Unsubscribe from emails like this", "addr": "Agradex · Baku, Azerbaijan"},
    "tr": {"reason": "Bu e-postayı bir Agradex hesabınız olduğu için alıyorsunuz.",
           "unsub": "Bu tür e-postalardan çık", "addr": "Agradex · Bakü, Azerbaycan"},
    "de": {"reason": "Sie erhalten diese E-Mail, weil Sie ein Agradex-Konto haben.",
           "unsub": "Solche E-Mails abbestellen", "addr": "Agradex · Baku, Aserbaidschan"},
    "hu": {"reason": "Azért kapja ezt az e-mailt, mert van Agradex-fiókja.",
           "unsub": "Leiratkozás az ilyen e-mailekről", "addr": "Agradex · Baku, Azerbajdzsán"},
    "it": {"reason": "Ricevi questa email perché hai un account Agradex.",
           "unsub": "Annulla l'iscrizione a email come questa", "addr": "Agradex · Baku, Azerbaigian"},
    "pl": {"reason": "Otrzymujesz tę wiadomość, ponieważ masz konto Agradex.",
           "unsub": "Zrezygnuj z takich wiadomości", "addr": "Agradex · Baku, Azerbejdżan"},
    "ru": {"reason": "Вы получаете это письмо, потому что у вас есть аккаунт Agradex.",
           "unsub": "Отказаться от таких писем", "addr": "Agradex · Баку, Азербайджан"},
}

# Progressive enhancement only. Gmail keeps embedded <style> (it strips <head>, so this rides in the
# fragment); Outlook desktop ignores media queries entirely — hence every rule here is additive and
# the inline styles alone already render a correct light-mode email.
_STYLE = (
    '<style>'
    ':root{color-scheme:light dark;supported-color-schemes:light dark}'
    '@media (max-width:480px){'
    '.ax-pad{padding:20px 18px !important}'
    '.ax-h1{font-size:19px !important}'
    '.ax-stat{display:block !important;width:100% !important}'
    '}'
    '@media (prefers-color-scheme:dark){'
    '.ax-page{background:#0B140F !important}'
    '.ax-card{background:#111C16 !important;border-color:#22332A !important}'
    '.ax-ink{color:#E8F1EA !important}'
    '.ax-muted{color:#A8B8AC !important}'
    '.ax-faint{color:#8A9A8E !important}'
    '.ax-tint{background:#16241C !important;border-color:#22332A !important}'
    '.ax-line{border-color:#22332A !important}'
    '.ax-good{color:#4ADE80 !important}'
    '.ax-warn{color:#FBBF24 !important}'
    '.ax-bad{color:#F87171 !important}'
    '.ax-info{color:#A8B8AC !important}'
    '.ax-badge{background:#16241C !important;color:#4ADE80 !important}'
    '}'
    '</style>'
)


def _foot(locale: str | None) -> dict[str, str]:
    return _FOOTER.get((locale or "")[:2].lower(), _FOOTER["az"])


def _paras(v: Any) -> list[str]:
    if not v:
        return []
    return [v] if isinstance(v, str) else list(v)


def esc(v: Any) -> str:
    """Full HTML escape. Use for every value that did not come from our own copy files."""
    return _html.escape("" if v is None else str(v), quote=True)


# Bare inline tags our copy is allowed to use (see the ESCAPING note in the module docstring).
_INLINE_OK = ("b", "strong", "i", "em", "u")
_BR_RE = re.compile(r"&lt;br\s*/?&gt;", re.I)


def _rich(v: Any) -> str:
    """Escape everything, then re-enable the whitelisted *bare* inline tags.

    This is what keeps `intro`/`outro`/`steps[].text` safe: catalog copy interpolates untrusted
    ctx values ({field} = a user-typed field name, {summary} = LLM output) straight into these
    strings, so the string reaching us is a mix of our markup and theirs. Escaping first and
    re-opening only tags with no attributes means injected markup stays inert text.
    """
    # quote=True as well: the whitelist only re-opens attribute-less tags, so quotes can never
    # reach an attribute context — but escaping them costs nothing (&quot; renders as ") and keeps
    # the output safe if this string is ever spliced somewhere less careful.
    out = _html.escape("" if v is None else str(v), quote=True)
    for tag in _INLINE_OK:
        out = out.replace(f"&lt;{tag}&gt;", f"<{tag}>").replace(f"&lt;/{tag}&gt;", f"</{tag}>")
        out = out.replace(f"&lt;{tag.upper()}&gt;", f"<{tag}>").replace(f"&lt;/{tag.upper()}&gt;", f"</{tag}>")
    return _BR_RE.sub("<br>", out)


_URL_OK = ("http://", "https://", "mailto:")


def _safe_url(v: Any) -> str:
    """Escaped URL, or "" when the scheme is not one we allow (blocks javascript:/data: hrefs)."""
    s = ("" if v is None else str(v)).strip()
    if not s.lower().startswith(_URL_OK):
        return ""
    return _html.escape(s, quote=True)


def _tone_of(block: dict, val: Any = None) -> str:
    t = (block.get("tone") or block.get("sev") or "").lower()
    if t in _TONE:
        return t
    try:
        n = float(val)
    except (TypeError, ValueError):
        return "info"
    return "good" if n >= SCORE_GOOD else ("warn" if n >= SCORE_WARN else "bad")


def _int_attr(v: Any) -> str:
    try:
        return str(max(0, int(round(float(v)))))
    except (TypeError, ValueError):
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# Blocks — each renderer returns (html, [text lines]). Add a type here and you MUST add its text
# mirror in the same function, otherwise the block silently disappears from the text/alt part.
# ─────────────────────────────────────────────────────────────────────────────

def _b_text(b: dict) -> tuple[str, list[str]]:
    t = b.get("text", "")
    if not t:
        return "", []
    return (f'<p class="ax-muted" style="margin:0 0 13px;font-size:15px;line-height:1.6;'
            f'color:{MUTED}">{_rich(t)}</p>', [_strip(t)])


def _b_heading(b: dict) -> tuple[str, list[str]]:
    t = b.get("text", "")
    if not t:
        return "", []
    small = bool(b.get("small"))
    size = "15px" if small else "17px"
    return (f'<p class="ax-ink" style="margin:18px 0 8px;font-size:{size};line-height:1.3;'
            f'color:{INK};font-weight:800;letter-spacing:-.01em">{esc(t)}</p>',
            ["", _strip(t), "-" * min(48, len(_strip(t)))])


def _b_divider(_b: dict) -> tuple[str, list[str]]:
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:18px 0"><tr><td class="ax-line" height="1" '
            f'style="height:1px;line-height:1px;font-size:0;background:{LINE};'
            f'border-top:1px solid {LINE}">&nbsp;</td></tr></table>',
            ["", "— — —"])


def _b_image(b: dict) -> tuple[str, list[str]]:
    """<img> with explicit width/height so blocked-image clients keep the layout from collapsing."""
    url = _safe_url(b.get("url"))
    if not url:
        return "", []
    alt = esc(b.get("alt") or "")
    w, h = _int_attr(b.get("width")), _int_attr(b.get("height"))
    attrs = f' width="{w}"' if w else ""
    attrs += f' height="{h}"' if h else ""
    style = ("display:block;border:0;outline:none;text-decoration:none;max-width:100%;"
             "height:auto;border-radius:12px")
    img = (f'<img src="{url}" alt="{alt}"{attrs} border="0" '
           f'style="{style}">')
    href = _safe_url(b.get("href"))
    if href:
        img = f'<a href="{href}" style="text-decoration:none;border:0">{img}</a>'
    html = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:4px 0 16px"><tr><td align="center">{img}</td></tr></table>')
    label = _strip(b.get("alt") or "").strip()
    lines = [f'[{label}]'] if label else []
    if href:
        lines.append(str(b.get("href")))
    return html, ([""] + lines if lines else [])


def _b_score(b: dict) -> tuple[str, list[str]]:
    """A 0-100 number, large and tone-coloured."""
    val = b.get("val")
    if val is None:
        return "", []
    tone = _tone_of(b, val)
    col = _TONE[tone]
    shown = _int_attr(val) or esc(val)
    label = b.get("label") or ""
    caption = b.get("caption") or ""
    inner = [f'<div class="ax-{tone}" style="font-size:44px;line-height:1;font-weight:800;'
             f'color:{col};letter-spacing:-.02em">{esc(shown)}'
             f'<span style="font-size:17px;font-weight:700"> / 100</span></div>']
    if label:
        inner.append(f'<div class="ax-ink" style="margin-top:6px;font-size:14px;font-weight:700;'
                     f'color:{INK}">{esc(label)}</div>')
    if caption:
        inner.append(f'<div class="ax-muted" style="margin-top:3px;font-size:12px;line-height:1.5;'
                     f'color:{MUTED}">{esc(caption)}</div>')
    html = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'bgcolor="{TINT}" class="ax-tint" style="background:{TINT};border:1px solid {LINE};'
            f'border-radius:12px;margin:4px 0 16px"><tr>'
            f'<td align="center" style="padding:18px 14px">{"".join(inner)}</td></tr></table>')
    line = f'{shown}/100'
    if label:
        line = f'{_strip(label)}: {line}'
    text = ["", line]
    if caption:
        text.append(_strip(caption))
    return html, text


def _b_bullets(b: dict) -> tuple[str, list[str]]:
    """List where each item carries its own severity colour (good/info/warn/bad)."""
    items = b.get("items") or []
    rows, lines = [], []
    for it in items:
        if isinstance(it, str):
            it = {"text": it}
        txt = it.get("text", "")
        if not txt:
            continue
        tone = _tone_of(it)
        col = _TONE[tone]
        lab = it.get("label")
        lab_html = (f'<span class="ax-{tone}" style="color:{col};font-weight:700">{esc(lab)} · </span>'
                    if lab else "")
        rows.append(
            '<tr>'
            f'<td width="18" valign="top" style="padding:5px 0"><span class="ax-{tone}" '
            f'style="color:{col};font-size:15px;line-height:1.5;font-weight:800">•</span></td>'
            f'<td valign="top" class="ax-ink" style="padding:5px 0;font-size:14px;line-height:1.55;'
            f'color:{INK}">{lab_html}{esc(txt)}</td>'
            '</tr>')
        lines.append(f'• {_strip(lab)} — {_strip(txt)}' if lab else f'• {_strip(txt)}')
    if not rows:
        return "", []
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:2px 0 14px">{"".join(rows)}</table>', [""] + lines)


def _b_steps(b: dict) -> tuple[str, list[str]]:
    items = b.get("items") or []
    if not items:
        return "", []
    rows = []
    for s in items:
        rows.append(
            '<tr>'
            f'<td width="34" valign="top" style="padding:6px 0"><span class="ax-badge" '
            f'style="display:inline-block;width:24px;height:24px;border-radius:999px;'
            f'background:{TINT};color:{GREEN};font-weight:800;font-size:12px;text-align:center;'
            f'line-height:24px">{esc(s.get("n", ""))}</span></td>'
            f'<td valign="top" class="ax-ink" style="padding:6px 0;font-size:14px;line-height:1.55;'
            f'color:{INK}">{_rich(s.get("text", ""))}</td>'
            '</tr>')
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:6px 0 14px">{"".join(rows)}</table>',
            [""] + [f'{s.get("n", "")}. {_strip(s.get("text", ""))}' for s in items])


def _b_stats(b: dict) -> tuple[str, list[str]]:
    items = b.get("items") or []
    if not items:
        return "", []
    cells = "".join(
        f'<td align="center" class="ax-stat" style="padding:10px 8px">'
        f'<div class="ax-good" style="font-size:22px;font-weight:800;color:{GREEN};'
        f'line-height:1">{esc(st.get("val", ""))}</div>'
        f'<div class="ax-muted" style="font-size:11px;color:{MUTED};margin-top:4px">'
        f'{esc(st.get("lab", ""))}</div></td>'
        for st in items)
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'bgcolor="{TINT}" class="ax-tint" style="background:{TINT};border:1px solid {LINE};'
            f'border-radius:12px;margin:2px 0 16px"><tr>{cells}</tr></table>',
            [""] + [f'• {_strip(st.get("val", ""))} — {_strip(st.get("lab", ""))}'
                    for st in items])


def _b_cta(b: dict) -> tuple[str, list[str]]:
    url = _safe_url(b.get("url"))
    if not url:
        return "", []
    label = b.get("label", "")
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr>'
        f'<td bgcolor="{GREEN}" style="border-radius:10px;background:{GREEN}">'
        f'<a href="{url}" style="display:inline-block;padding:12px 24px;font-size:15px;'
        f'font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">{esc(label)}</a>'
        '</td></tr></table>',
        ["", f'{_strip(label)}: {b.get("url", "")}'])


_BLOCKS = {
    "text": _b_text, "paragraph": _b_text,
    "heading": _b_heading,
    "divider": _b_divider, "hr": _b_divider,
    "image": _b_image,
    "score": _b_score,
    "bullets": _b_bullets,
    "steps": _b_steps,
    "stats": _b_stats,
    "cta": _b_cta, "button": _b_cta,
}


def _render_blocks(blocks: Any) -> tuple[list[str], list[str]]:
    html: list[str] = []
    text: list[str] = []
    for b in (blocks or []):
        if not isinstance(b, dict):
            continue
        fn = _BLOCKS.get(str(b.get("type", "")).lower())
        if not fn:
            continue
        h, t = fn(b)
        if h:
            html.append(h)
            text += t
    return html, text


def render(content: dict, *, locale: str | None, unsub_url: str | None,
           show_unsub: bool = True) -> tuple[str, str]:
    """Return (html, text). `show_unsub` False for transactional mail (still shows reason/address)."""
    f = _foot(locale)
    heading = content.get("heading", "")
    intro = _paras(content.get("intro"))
    steps = content.get("steps") or []
    stats = content.get("stats") or []
    cta = content.get("cta")
    outro = _paras(content.get("outro"))
    signoff = content.get("signoff", "")
    preheader = content.get("preheader", "")
    blocks_html, blocks_text = _render_blocks(content.get("blocks"))

    # ---- HTML ----
    parts: list[str] = [_STYLE]
    parts.append(f'<div style="display:none;max-height:0;overflow:hidden;opacity:0">{esc(preheader)}</div>')
    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{PAGE}" '
        f'class="ax-page" '
        f'style="background:{PAGE};padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'
        '<tr><td align="center">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{CARD}" '
        f'class="ax-card" '
        f'style="max-width:520px;background:{CARD};border-radius:16px;overflow:hidden;border:1px solid {LINE}">'
    )
    # header
    parts.append(
        f'<tr><td bgcolor="{GREEN}" style="background:{GREEN};padding:18px 24px">'
        f'{_leaf_svg()}'
        f'<span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:-.01em;'
        f'vertical-align:middle;margin-left:8px">Agradex</span>'
        '</td></tr>'
    )
    # body
    body: list[str] = ['<tr><td class="ax-pad" style="padding:26px 26px 22px">']
    if heading:
        body.append(f'<h1 class="ax-h1 ax-ink" style="margin:0 0 14px;font-size:21px;line-height:1.25;'
                    f'color:{INK};font-weight:800;letter-spacing:-.01em">{esc(heading)}</h1>')
    for p in intro:
        # TRUSTED slot: catalog copy with inline <b>, sanitized by _rich (see module docstring).
        body.append(f'<p class="ax-muted" style="margin:0 0 13px;font-size:15px;line-height:1.6;'
                    f'color:{MUTED}">{_rich(p)}</p>')
    body += blocks_html
    if steps:
        body.append(_b_steps({"items": steps})[0])
    if stats:
        body.append(_b_stats({"items": stats})[0])
    if cta and cta.get("url"):
        body.append(_b_cta(cta)[0])
    for p in outro:
        # TRUSTED slot (same treatment as intro).
        body.append(f'<p class="ax-muted" style="margin:12px 0 0;font-size:15px;line-height:1.6;'
                    f'color:{MUTED}">{_rich(p)}</p>')
    if signoff:
        body.append(f'<p class="ax-ink" style="margin:16px 0 0;font-size:14px;color:{INK};'
                    f'font-weight:600">{esc(signoff)}</p>')
    body.append('</td></tr>')
    parts.append("".join(body))
    # footer
    foot = [f'<tr><td class="ax-line ax-faint" style="border-top:1px solid {LINE};padding:16px 26px;'
            f'font-size:11px;line-height:1.5;color:{FAINT}">']
    foot.append(f'{esc(f["reason"])}<br>')
    if show_unsub and unsub_url:
        u = _safe_url(unsub_url)
        if u:
            foot.append(f'<a href="{u}" class="ax-faint" style="color:{FAINT};'
                        f'text-decoration:underline">{esc(f["unsub"])}</a> · ')
    foot.append(esc(f["addr"]))
    foot.append('</td></tr>')
    parts.append("".join(foot))
    parts.append('</table></td></tr></table>')
    html_out = "".join(parts)

    # ---- text (mirror of every block above; a block missing here vanishes from the alt part) ----
    tl: list[str] = []
    if heading:
        tl.append(_strip(heading))
        tl.append("")
    tl += [_strip(p) for p in intro]
    tl += blocks_text
    if steps:
        tl += _b_steps({"items": steps})[1]
    if stats:
        tl += _b_stats({"items": stats})[1]
    if cta and cta.get("url"):
        tl += _b_cta(cta)[1]
    if outro:
        tl.append("")
        tl += [_strip(p) for p in outro]
    if signoff:
        tl.append("")
        tl.append(_strip(signoff))
    tl.append("")
    tl.append("—")
    tl.append(f["reason"])
    if show_unsub and unsub_url:
        tl.append(f'{f["unsub"]}: {unsub_url}')
    tl.append(f["addr"])
    return html_out, "\n".join(tl)


def _leaf_svg() -> str:
    return ('<span style="display:inline-block;width:26px;height:26px;border-radius:7px;'
            'background:rgba(255,255,255,.18);vertical-align:middle;text-align:center;line-height:26px">'
            '<span style="color:#fff;font-size:15px">🌱</span></span>')


_TAG_RE = re.compile(r"<[^>]{0,200}>")


def _strip(s: Any) -> str:
    """HTML→text for the plain-text part: drop every tag, unescape entities, keep the words.

    Broader than the old <b>-only strip on purpose — untrusted values reach these strings too, and
    the text/alt part must never leak raw markup.
    """
    out = re.sub(r"<br\s*/?>", "\n", "" if s is None else str(s), flags=re.I)
    out = _TAG_RE.sub("", out)
    return _html.unescape(out)
