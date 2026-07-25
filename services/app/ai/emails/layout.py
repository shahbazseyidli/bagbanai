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
      "cta": {"label": str, "url": str},         # optional
      "outro": [str, ...],                        # optional paragraphs
      "signoff": str,                             # e.g. "Ülkər Nəsirova — Agradex"
    }
"""
from __future__ import annotations

import html as _html
from typing import Any

GREEN = "#15803D"
GREEN_D = "#0E3B24"
INK = "#10231A"
MUTED = "#5B6B60"
FAINT = "#8A978D"
LINE = "#E2E9E1"
TINT = "#F2F8F3"

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
}


def _foot(locale: str | None) -> dict[str, str]:
    return _FOOTER.get((locale or "")[:2].lower(), _FOOTER["az"])


def _paras(v: Any) -> list[str]:
    if not v:
        return []
    return [v] if isinstance(v, str) else list(v)


def _leaf_svg() -> str:
    return ('<span style="display:inline-block;width:26px;height:26px;border-radius:7px;'
            'background:rgba(255,255,255,.18);vertical-align:middle;text-align:center;line-height:26px">'
            '<span style="color:#fff;font-size:15px">🌱</span></span>')


def render(content: dict, *, locale: str | None, unsub_url: str | None,
           show_unsub: bool = True) -> tuple[str, str]:
    """Return (html, text). `show_unsub` False for transactional mail (still shows reason/address)."""
    e = _html.escape
    f = _foot(locale)
    heading = content.get("heading", "")
    intro = _paras(content.get("intro"))
    steps = content.get("steps") or []
    stats = content.get("stats") or []
    cta = content.get("cta")
    outro = _paras(content.get("outro"))
    signoff = content.get("signoff", "")
    preheader = content.get("preheader", "")

    # ---- HTML ----
    parts: list[str] = []
    parts.append(f'<div style="display:none;max-height:0;overflow:hidden;opacity:0">{e(preheader)}</div>')
    parts.append(
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#EEF2EC;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">'
        '<tr><td align="center">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ' + LINE + '">'
    )
    # header
    parts.append(
        f'<tr><td style="background:{GREEN};padding:18px 24px">'
        f'{_leaf_svg()}'
        f'<span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:-.01em;'
        f'vertical-align:middle;margin-left:8px">Agradex</span>'
        '</td></tr>'
    )
    # body
    body: list[str] = ['<tr><td style="padding:26px 26px 22px">']
    if heading:
        body.append(f'<h1 style="margin:0 0 14px;font-size:21px;line-height:1.25;color:{INK};'
                    f'font-weight:800;letter-spacing:-.01em">{e(heading)}</h1>')
    for p in intro:
        body.append(f'<p style="margin:0 0 13px;font-size:15px;line-height:1.6;color:{MUTED}">{p}</p>')
    if steps:
        body.append('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px">')
        for s in steps:
            body.append(
                '<tr>'
                f'<td width="34" valign="top" style="padding:6px 0"><span style="display:inline-block;'
                f'width:24px;height:24px;border-radius:999px;background:{TINT};color:{GREEN};'
                f'font-weight:800;font-size:12px;text-align:center;line-height:24px">{e(str(s.get("n","")))}</span></td>'
                f'<td valign="top" style="padding:6px 0;font-size:14px;line-height:1.55;color:{INK}">{s.get("text","")}</td>'
                '</tr>')
        body.append('</table>')
    if stats:
        cells = "".join(
            f'<td align="center" style="padding:10px 8px">'
            f'<div style="font-size:22px;font-weight:800;color:{GREEN};line-height:1">{e(str(st.get("val","")))}</div>'
            f'<div style="font-size:11px;color:{MUTED};margin-top:4px">{e(str(st.get("lab","")))}</div></td>'
            for st in stats)
        body.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{TINT};border:1px solid {LINE};border-radius:12px;margin:2px 0 16px">'
            f'<tr>{cells}</tr></table>')
    if cta and cta.get("url"):
        body.append(
            '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr>'
            f'<td style="border-radius:10px;background:{GREEN}">'
            f'<a href="{e(cta["url"])}" style="display:inline-block;padding:12px 24px;font-size:15px;'
            f'font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">{e(cta.get("label",""))}</a>'
            '</td></tr></table>')
    for p in outro:
        body.append(f'<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:{MUTED}">{p}</p>')
    if signoff:
        body.append(f'<p style="margin:16px 0 0;font-size:14px;color:{INK};font-weight:600">{e(signoff)}</p>')
    body.append('</td></tr>')
    parts.append("".join(body))
    # footer
    foot = [f'<tr><td style="border-top:1px solid {LINE};padding:16px 26px;font-size:11px;'
            f'line-height:1.5;color:{FAINT}">']
    foot.append(f'{e(f["reason"])}<br>')
    if show_unsub and unsub_url:
        foot.append(f'<a href="{e(unsub_url)}" style="color:{FAINT};text-decoration:underline">{e(f["unsub"])}</a> · ')
    foot.append(e(f["addr"]))
    foot.append('</td></tr>')
    parts.append("".join(foot))
    parts.append('</table></td></tr></table>')
    html_out = "".join(parts)

    # ---- text ----
    tl: list[str] = []
    if heading:
        tl.append(heading)
        tl.append("")
    tl += [_strip(p) for p in intro]
    if steps:
        tl.append("")
        tl += [f'{s.get("n","")}. {_strip(s.get("text",""))}' for s in steps]
    if stats:
        tl.append("")
        tl += [f'• {st.get("val","")} — {st.get("lab","")}' for st in stats]
    if cta and cta.get("url"):
        tl.append("")
        tl.append(f'{cta.get("label","")}: {cta["url"]}')
    if outro:
        tl.append("")
        tl += [_strip(p) for p in outro]
    if signoff:
        tl.append("")
        tl.append(signoff)
    tl.append("")
    tl.append("—")
    tl.append(f["reason"])
    if show_unsub and unsub_url:
        tl.append(f'{f["unsub"]}: {unsub_url}')
    tl.append(f["addr"])
    return html_out, "\n".join(tl)


def _strip(s: str) -> str:
    """Very small HTML→text for the inline <b> we allow in copy."""
    return (s.replace("<b>", "").replace("</b>", "")
             .replace("<strong>", "").replace("</strong>", ""))
