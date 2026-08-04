"""Printable field report — recovered from the module deleted in 81660df, minus the ERP half.

WHY IT COMES BACK. The old reports module read from `ledger`, `sales`, `tasks` and `yields`, which
the 27 July simplification removed, so the whole 1027-line file went with them. But the FARMER-
facing half never depended on those tables, and a paper report has been asked for since 2020 in the
research corpus and never delivered — "I'm old-fashioned, I like to compare on paper… you can't
always explain to field workers with a computer in your hand". That is a distribution problem, not
nostalgia.

NO PDF LIBRARY, DELIBERATELY. The API image ships none and does not need one: the report is a
complete self-contained HTML document with an A4 print stylesheet and a "print / save as PDF"
button. The browser is the PDF engine. Same decision the deleted module made, and its stylesheet,
escaping, table/kv builders, RFC 5987 filename and BOM'd CSV writer are reused verbatim rather than
rewritten — they were correct, and re-deriving them would have reintroduced the bugs they fixed.

Everything it reads still holds data: field_metadata, field_seasons, field_operations
(dormant since 2026-08-04 — historical rows only, and the section is skipped when there are none),
scouting_observations, index_stats, advice, field_wellness.

SECURITY: every user-supplied string (field name, notes, free-text crop) goes through html.escape()
before reaching the output.
"""
import csv
import html
import json
import io
import re
import unicodedata
from datetime import date, datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..db import connection
from ..deps import get_current_user_id, require_field_read
from .report_labels import (_CROP_AZ, _IRR_AZ, _OPTYPE_AZ, _SCOUTCAT_AZ, _SEASON_STATUS_AZ,
                            _SEVERITY_AZ, _SOIL_AZ, label)

router = APIRouter(prefix="/api", tags=["reports"])

_FORMATS = ("html", "csv")


def _check_format(fmt: Optional[str]) -> str:
    f = (fmt or "html").lower().strip()
    if f not in _FORMATS:
        raise HTTPException(status_code=400, detail="unknown_format")
    return f


def _dec(v: Any, nd: int = 2) -> str:
    if v is None:
        return "—"
    try:
        return f"{float(v):.{nd}f}"
    except (TypeError, ValueError):
        return "—"


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _d(v: Any) -> str:
    if v is None:
        return "—"
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    return str(v)[:10]


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


# ------------------------------------------------------------ html output ----

_STYLE = """
:root{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--brand:#15803D;--soft:#f1f5f9}
*{box-sizing:border-box}
body{margin:0;padding:20px 14px 40px;background:#f8fafc;color:var(--ink);font-size:13px;line-height:1.45;
 font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
.actions{max-width:900px;margin:0 auto 12px;text-align:right}
.actions button{min-height:44px;padding:0 18px;border:0;border-radius:10px;background:var(--brand);
 color:#fff;font-size:14px;font-weight:600;cursor:pointer}
.sheet{max-width:900px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:12px;padding:26px}
header.rpt{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
 border-bottom:2px solid var(--brand);padding-bottom:12px;margin-bottom:16px}
.brand{font-size:17px;font-weight:800;color:var(--brand);letter-spacing:.02em}
h1{font-size:20px;margin:6px 0 2px;line-height:1.25}
h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--line);
 text-transform:uppercase;letter-spacing:.04em;color:#334155}
h3{font-size:12px;margin:14px 0 6px;color:#334155;text-transform:uppercase;letter-spacing:.03em}
.muted{color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0}
.sub{color:var(--muted);font-size:12px}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin:4px 0 6px}
.kv .box{border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:#fcfdfe}
.kv .k{color:var(--muted);font-size:11px}
.kv .v{font-weight:700;font-size:14px;font-variant-numeric:tabular-nums;margin-top:2px}
.wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:var(--soft);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#475569}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.total td{font-weight:800;background:#f8fafc;border-top:2px solid var(--line)}
.empty{color:var(--muted);font-style:italic;padding:6px 0}
ul.list{margin:6px 0 0;padding-left:18px}
ul.list li{margin-bottom:4px}
.pre{white-space:pre-wrap}
footer.rpt{margin-top:26px;border-top:1px solid var(--line);padding-top:8px;color:var(--muted);font-size:11px}
@media print{
 @page{size:A4;margin:14mm}
 body{background:#fff;padding:0;font-size:11px}
 .sheet{max-width:none;border:0;border-radius:0;padding:0}
 .no-print{display:none!important}
 h2,h3{break-after:avoid;page-break-after:avoid}
 tr,.kv .box{break-inside:avoid;page-break-inside:avoid}
}
"""


def _e(v: Any) -> str:
    """Escape any user-supplied value for HTML (mandatory — names/notes are user input)."""
    if v is None:
        return "—"
    return html.escape(str(v))


def _kv(pairs: list[tuple[str, Any]]) -> str:
    boxes = "".join(
        f'<div class="box"><div class="k">{_e(k)}</div><div class="v">{_e(v)}</div></div>'
        for k, v in pairs)
    return f'<div class="kv">{boxes}</div>'


def _table(headers: list[tuple[str, bool]], rows: list[list[Any]],
           empty: str = "Qeyd yoxdur.", total: Optional[list[Any]] = None) -> str:
    if not rows:
        return f'<p class="empty">{_e(empty)}</p>'
    th = "".join(f'<th class="{"num" if num else ""}">{_e(lbl)}</th>' for lbl, num in headers)
    body = ""
    for r in rows:
        tds = "".join(
            f'<td class="{"num" if (i < len(headers) and headers[i][1]) else ""}">{_e(c)}</td>'
            for i, c in enumerate(r))
        body += f"<tr>{tds}</tr>"
    if total:
        tds = "".join(
            f'<td class="{"num" if (i < len(headers) and headers[i][1]) else ""}">{_e(c)}</td>'
            for i, c in enumerate(total))
        body += f'<tr class="total">{tds}</tr>'
    return f'<div class="wrap"><table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'


def _bullets(items: list[str], empty: str = "—") -> str:
    if not items:
        return f'<p class="empty">{_e(empty)}</p>'
    lis = "".join(f"<li>{_e(x)}</li>" for x in items)
    return f'<ul class="list">{lis}</ul>'


def _doc(title: str, subtitle: str, body: str) -> str:
    return (
        '<!doctype html><html lang="az"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{_e(title)}</title><style>{_STYLE}</style></head><body>"
        '<div class="actions no-print">'
        '<button type="button" onclick="window.print()">Çap et / PDF kimi saxla</button></div>'
        '<div class="sheet"><header class="rpt"><div>'
        '<div class="brand">Agradex</div>'
        f"<h1>{_e(title)}</h1><div class=\"sub\">{_e(subtitle)}</div></div>"
        f'<div class="sub">Hazırlandı:<br>{_e(_now_str())}</div></header>'
        f"{body}"
        '<footer class="rpt">Agradex · agradex.com — bu hesabat platformadakı qeydlər əsasında '
        "avtomatik hazırlanıb. Rəqəmlər daxil edilmiş məlumatlardan asılıdır.</footer>"
        "</div></body></html>")


def _html_response(doc: str) -> Response:
    return Response(content=doc, media_type="text/html; charset=utf-8")


# ------------------------------------------------------------- csv output ----

def _disposition(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "-", ascii_name).strip("-._")
    if not ascii_name:
        ascii_name = "agradex-hesabat"
    if not ascii_name.lower().endswith(".csv"):
        ascii_name += ".csv"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}"


def _csv_response(filename: str, rows: list[list[Any]]) -> Response:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    for r in rows:
        w.writerow(["" if c is None else c for c in r])
    # BOM so Excel detects UTF-8 and renders ə/ğ/ı/ö/ş/ü correctly.
    return Response(content="\ufeff" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": _disposition(filename)})


def _slug(s: str, maxlen: int = 40) -> str:
    out = re.sub(r"\s+", "-", (s or "").strip())
    return out[:maxlen] or "sahe"



# ------------------------------------------------------------------ report ----

@router.get("/fields/{field_id}/report")
async def field_report(field_id: str, format: Optional[str] = Query("html"),
                       user_id: str = Depends(get_current_user_id)):
    """One field, everything the platform knows about it, on one printable page.

    Free by the same argument as the boundary export: this is the farmer's own record. The
    farmer's own language is NOT applied here yet — the document is Azerbaijani, like the module it
    came from — and that is recorded rather than hidden: see the TODO at the end of this docstring.

    TODO(i18n): the section titles and the enum labels below are the recovered AZ ones. They should
    move to the same code+params contract the alerts now use (rules/alert_copy.py) so a Turkish
    farmer can print a Turkish report. Left as-is in this change to keep the recovery reviewable.
    """
    fmt = _check_format(format)
    async with connection(user_id) as conn:
        # The ONE read surface a field_grant opens (0061). Deliberately this endpoint and no other:
        # it is already a complete, read-only, single-field document, so "show my agronomist this
        # orchard" needs no second decision about which of eighty routes to widen — and a grantee
        # can never reach a sibling field, the farm, the team or the org, because nothing here
        # addresses them.
        await require_field_read(conn, user_id, field_id)

        field = await conn.fetchrow(
            """select f.name, f.area_ha, fa.name as farm_name,
                      m.crop_type, m.crop_cycle, m.variety, m.region, m.soil_type, m.soil_ph,
                      m.irrigation_method, m.planting_date, m.expected_harvest
                 from public.fields f
                 join public.farms fa on fa.id = f.farm_id
                 left join public.field_metadata m on m.field_id = f.id
                where f.id=$1::uuid and f.deleted_at is null""", field_id)
        if not field:
            raise HTTPException(status_code=404, detail="field_not_found")

        seasons = await conn.fetch(
            """select season_year, crop_type, variety, status, planting_date, actual_harvest_date,
                      target_yield
                 from public.field_seasons where field_id=$1::uuid
                order by season_year desc limit 10""", field_id)
        ops = await conn.fetch(
            """select type, performed_on, notes, cost, currency
                 from public.field_operations where field_id=$1::uuid
                order by performed_on desc limit 60""", field_id)
        notes = await conn.fetch(
            """select category, severity, note, observed_at, status
                 from public.scouting_observations where field_id=$1::uuid
                order by observed_at desc limit 60""", field_id)
        idx = await conn.fetch(
            """select i.index_name, i.acquired_at, i.mean, i.p10, i.p90
                 from public.index_stats i
                 join public.scenes s on s.id = i.scene_id
                where i.field_id=$1::uuid and i.index_name in ('NDVI','NDMI')
                  and s.sensor='S2' and i.mean is not null
                order by i.acquired_at desc limit 40""", field_id)
        well = await conn.fetchrow(
            """select score, tone, computed_on from public.field_wellness
                where field_id=$1::uuid order by computed_on desc limit 1""", field_id)
        adv = await conn.fetchrow(
            """select summary, findings, generated_at, lang from public.advice
                where field_id=$1::uuid order by generated_at desc limit 1""", field_id)

    name = field["name"] or "Sahə"
    if fmt == "csv":
        # The satellite series is the part anyone actually re-uses in a spreadsheet.
        rows: list[list[Any]] = [["index", "tarix", "orta", "p10", "p90"]]
        rows += [[r["index_name"], _d(r["acquired_at"]), _dec(r["mean"], 3),
                  _dec(r["p10"], 3), _dec(r["p90"], 3)] for r in idx]
        return _csv_response(f"{_slug(name)}-hesabat.csv", rows)

    parts: list[str] = []
    parts.append("<h2>Sahə</h2>")
    parts.append(_kv([
        ("Sahə", name), ("Ferma", field["farm_name"]),
        ("Sahə ölçüsü", f'{_dec(field["area_ha"])} ha'),
        ("Məhsul", label(_CROP_AZ, field["crop_type"])), ("Sort", field["variety"]),
        ("Rayon", field["region"]), ("Torpaq", label(_SOIL_AZ, field["soil_type"])),
        ("pH", _dec(field["soil_ph"], 1)), ("Suvarma", label(_IRR_AZ, field["irrigation_method"])),
        ("Əkin", _d(field["planting_date"])), ("Gözlənilən yığım", _d(field["expected_harvest"])),
        ("Sağlamlıq balı", f'{int(well["score"])}/100' if well and well["score"] is not None else "—"),
    ]))

    parts.append("<h2>Mövsümlər</h2>")
    parts.append(_table(
        [("İl", True), ("Məhsul", False), ("Sort", False), ("Status", False),
         ("Əkin", False), ("Yığım", False)],
        [[s["season_year"], label(_CROP_AZ, s["crop_type"]), s["variety"],
          label(_SEASON_STATUS_AZ, s["status"]), _d(s["planting_date"]),
          _d(s["actual_harvest_date"])] for s in seasons],
        empty="Mövsüm qeydi yoxdur."))

    # Only when there is something to show. The Operations section was removed from the product on
    # 2026-08-04 and its last writer (POST /api/bulk/operations) went with it, so no field created
    # from that day on can ever have a row here — and a headed chapter reading "no operations
    # recorded" on every new report advertises a feature that is gone. Fields that DID log work keep
    # printing it: those rows are real history, which is why the table was never dropped.
    if ops:
        parts.append("<h2>Əməliyyatlar</h2>")
        parts.append(_table(
            [("Tarix", False), ("Növ", False), ("Xərc", True), ("Qeyd", False)],
            [[_d(o["performed_on"]), label(_OPTYPE_AZ, o["type"]),
              (f'{_dec(o["cost"])} {o["currency"] or ""}'.strip() if o["cost"] is not None else "—"),
              o["notes"]] for o in ops],
            empty="Əməliyyat qeydi yoxdur."))

    parts.append("<h2>Skautinq qeydləri</h2>")
    parts.append(_table(
        [("Tarix", False), ("Kateqoriya", False), ("Şiddət", True), ("Qeyd", False)],
        [[_d(n["observed_at"]), label(_SCOUTCAT_AZ, n["category"]), label(_SEVERITY_AZ, n["severity"]), n["note"]]
         for n in notes],
        empty="Skautinq qeydi yoxdur."))

    parts.append("<h2>Peyk göstəriciləri (Sentinel-2)</h2>")
    parts.append(_table(
        [("Tarix", False), ("İndeks", False), ("Orta", True), ("p10", True), ("p90", True)],
        [[_d(r["acquired_at"]), r["index_name"], _dec(r["mean"], 3),
          _dec(r["p10"], 3), _dec(r["p90"], 3)] for r in idx],
        empty="Peyk ölçməsi yoxdur."))

    if adv and adv["summary"]:
        # The advice prose is stored ONCE, in the language it was generated in (advice.lang, 0049),
        # and is never translated on read. Printing it verbatim is therefore correct — and the
        # language is printed with it so a page that mixes AZ headings with, say, Russian prose is
        # self-explaining rather than looking like a bug.
        parts.append(f'<h2>AI aqronom rəyi <span class="muted">({_d(adv["generated_at"])}'
                     f' · {_e((adv["lang"] or "az").upper())})</span></h2>')
        parts.append(f'<p class="pre">{_e(adv["summary"])}</p>')
        f = adv["findings"]
        if isinstance(f, str):
            try:
                f = json.loads(f)
            except (ValueError, TypeError):
                f = None
        if isinstance(f, dict):
            risks = [x for x in (f.get("risks") or []) if isinstance(x, dict)]
            if risks:
                parts.append("<h3>Risklər</h3>")
                parts.append(_table(
                    [("Risk", False), ("Şiddət", False), ("İzah", False)],
                    [[r.get("title"), label(_SEVERITY_AZ, r.get("severity")), r.get("detail")]
                     for r in risks],
                    empty="—"))
            recs = [x for x in (f.get("recommendations") or []) if isinstance(x, dict)]
            if recs:
                parts.append("<h3>Tövsiyələr</h3>")
                parts.append(_bullets(
                    [" — ".join(p for p in [r.get("title"), r.get("detail")] if p) for r in recs]))
            steps = [str(x) for x in (f.get("next_steps") or []) if x]
            if steps:
                parts.append("<h3>Növbəti addımlar</h3>")
                parts.append(_bullets(steps))

    subtitle = " · ".join(x for x in [field["farm_name"], field["region"]] if x)
    return _html_response(_doc(f"{name} — sahə hesabatı", subtitle, "".join(parts)))
