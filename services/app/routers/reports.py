"""Prepared report library (HYBRID_PLAN W7, B9).

Three ready-made reports the farmer can open and print:
  * season report      — one field, one season (crop, satellite summary, operations, yields, tasks…)
  * operations journal — one field, a date range, everything that happened in one timeline
  * cost summary       — one org, per field + per category (mirrors routers/ledger.py aggregation)

The API image ships no PDF/DOCX/Excel library and there is no authenticated static-file serving,
so nothing is ever written to disk: every report is rendered ON THE FLY and streamed.
  format=html -> a COMPLETE self-contained printable document (browser "Save as PDF")
  format=csv  -> csv stdlib output with a UTF-8 BOM (Excel opens Azerbaijani text correctly)
  format=json -> the raw payload
`public.reports` (0041 columns) only remembers that a report was generated, with its frozen
payload; `storage_path` stays NULL by design.

SECURITY: every user-supplied string (field names, notes, buyer/crop free text) goes through
html.escape() before it reaches the HTML output.
"""
import csv
import html
import io
import json
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..db import connection
from ..deps import get_current_user_id, require_member
from .fields import _org_of_field
from .ledger import _expense_by_category, _field_pnl  # reuse the ledger's exact aggregation

router = APIRouter(prefix="/api", tags=["reports"])

# ---------------------------------------------------------------- helpers ----

_FORMATS = ("html", "csv", "json")


def _check_format(fmt: Optional[str]) -> str:
    """Never trust a raw query param — validate against the allowed set (400, not 500)."""
    f = (fmt or "html").strip().lower()
    if f not in _FORMATS:
        raise HTTPException(status_code=400, detail="invalid_format")
    return f


def _f(v: Any) -> float:
    return float(v) if v is not None else 0.0


def _money(v: Any) -> str:
    return f"{_f(v):,.0f} ₼".replace(",", " ")


def _dec(v: Any, nd: int = 2) -> str:
    if v is None:
        return "—"
    try:
        return f"{float(v):,.{nd}f}".replace(",", " ")
    except (TypeError, ValueError):
        return "—"


def _d(v: Any) -> str:
    if v is None:
        return "—"
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    return str(v)[:10]


def _iso(v: Any) -> Optional[str]:
    return v.isoformat() if v is not None and hasattr(v, "isoformat") else (v if v is None else str(v))


def _jload(v: Any) -> Any:
    if v is None or v == "":
        return None
    if isinstance(v, (list, dict)):
        return v
    try:
        return json.loads(v)
    except (TypeError, ValueError):
        return None


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


_OP_AZ = {"planting": "Əkin", "spraying": "Çiləmə", "fertilizing": "Gübrələmə",
          "irrigation": "Suvarma", "harvest": "Yığım", "tillage": "Şumlama",
          "scouting": "Skautinq", "other": "Digər"}
_TASK_STATUS_AZ = {"todo": "Gözləyir", "in_progress": "İcrada", "done": "Tamamlandı",
                   "cancelled": "Ləğv edildi"}
_SCOUT_AZ = {"pest": "Zərərverici", "disease": "Xəstəlik", "weed": "Alaq", "nutrient": "Qida",
             "water": "Su", "damage": "Zədə", "other": "Digər"}
_SEVERITY_AZ = {"low": "Aşağı", "medium": "Orta", "high": "Yüksək",
                "aşağı": "Aşağı", "orta": "Orta", "yüksək": "Yüksək"}
_SEASON_STATUS_AZ = {"preparation": "Hazırlıq", "planted": "Əkilib", "vegetation": "Vegetasiya",
                     "harvest": "Yığım", "fallow": "Herik", "closed": "Bağlanıb"}


def _label(m: dict, v: Any) -> str:
    s = (str(v).strip().lower() if v is not None else "")
    if not s:
        return "—"
    return m.get(s, str(v))


def _inputs_text(v: Any) -> str:
    """field_operations.inputs is free-form jsonb ([{product,rate,unit}] by convention)."""
    data = _jload(v)
    if not data:
        return ""
    if isinstance(data, list):
        parts = []
        for it in data:
            if isinstance(it, dict):
                bits = [str(it[k]) for k in ("product", "rate", "unit")
                        if it.get(k) not in (None, "")]
                if bits:
                    parts.append(" ".join(bits))
            elif it:
                parts.append(str(it))
        return ", ".join(parts)
    if isinstance(data, dict):
        return ", ".join(f"{k}: {val}" for k, val in data.items())
    return str(data)


def _text_list(v: Any) -> list[str]:
    """AI findings arrays hold either plain strings or {title,detail} objects."""
    if not v:
        return []
    if isinstance(v, str):
        return [v]
    out = []
    for it in v if isinstance(v, list) else [v]:
        if isinstance(it, dict):
            bits = [str(it[k]) for k in ("title", "detail", "text", "note") if it.get(k)]
            if bits:
                out.append(" — ".join(bits))
        elif it:
            out.append(str(it))
    return out


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
 h2{break-after:avoid;page-break-after:avoid}
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


# ---------------------------------------------------------- library record ----

async def _record(conn, *, org_id: str, field_id: Optional[str], rtype: str, fmt: str,
                  title: str, season_year: Optional[int], period_from: Optional[date],
                  period_to: Optional[date], params: dict, payload: dict, user_id: str) -> None:
    """Remember the generated report so the library can list it. storage_path stays NULL."""
    await conn.execute(
        """delete from public.reports
           where org_id=$1::uuid and type=$2
             and field_id is not distinct from $3::uuid
             and season_year is not distinct from $4::int
             and period_from is not distinct from $5::date
             and period_to is not distinct from $6::date""",
        org_id, rtype, field_id, season_year, period_from, period_to)
    await conn.execute(
        """insert into public.reports
             (org_id, field_id, type, format, params, storage_path, generated_by,
              title, season_year, period_from, period_to, payload)
           values ($1::uuid,$2::uuid,$3,$4,$5::jsonb,null,$6::uuid,$7,$8::int,$9::date,$10::date,$11::jsonb)""",
        org_id, field_id, rtype, fmt, json.dumps(params, default=str), user_id,
        title, season_year, period_from, period_to, json.dumps(payload, default=str))


# ================================================================ catalog ====

_CATALOG = [
    {
        "id": "season",
        "title": "Mövsüm hesabatı",
        "description": "Bir sahənin bir mövsümü: məhsul, peyk xülasəsi, əməliyyatlar və xərc, "
                       "məhsuldarlıq və gəlir, tapşırıqlar, skautinq və son AI məsləhəti.",
        "scope": "field",
        "path": "/api/fields/{field_id}/reports/season",
        "params": [
            {"name": "field_id", "label": "Sahə", "type": "field", "required": True},
            {"name": "season", "label": "Mövsüm (il)", "type": "year", "required": False},
        ],
        "formats": list(_FORMATS),
    },
    {
        "id": "journal",
        "title": "Əməliyyat jurnalı",
        "description": "Seçilmiş tarix aralığında sahədə baş verən hər şey bir xronoloji "
                       "cədvəldə: əməliyyatlar, tapşırıqlar və skautinq qeydləri.",
        "scope": "field",
        "path": "/api/fields/{field_id}/reports/journal",
        "params": [
            {"name": "field_id", "label": "Sahə", "type": "field", "required": True},
            {"name": "from", "label": "Başlanğıc", "type": "date", "required": False},
            {"name": "to", "label": "Son", "type": "date", "required": False},
        ],
        "formats": list(_FORMATS),
    },
    {
        "id": "cost",
        "title": "Xərc xülasəsi",
        "description": "Təsərrüfat üzrə xərc: sahə-sahə xərc/gəlir/mənfəət və kateqoriya "
                       "(əməliyyat növü) üzrə bölgü.",
        "scope": "org",
        "path": "/api/orgs/{org_id}/reports/cost",
        "params": [
            {"name": "org_id", "label": "Təsərrüfat", "type": "org", "required": True},
            {"name": "season", "label": "Mövsüm (il)", "type": "year", "required": False},
        ],
        "formats": list(_FORMATS),
    },
]


@router.get("/reports/catalog")
async def reports_catalog(user_id: str = Depends(get_current_user_id)):
    """The report library: what can be generated and which parameters each needs."""
    return {"reports": _CATALOG}


@router.get("/orgs/{org_id}/reports/scope")
async def reports_scope(org_id: str, user_id: str = Depends(get_current_user_id)):
    """Pickers for the reports page: the org's fields + the seasons that hold any data."""
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        fields = await conn.fetch(
            """select f.id, f.name, f.area_ha
               from public.fields f join public.farms fa on fa.id = f.farm_id
               where fa.org_id=$1::uuid and f.deleted_at is null order by f.name""", org_id)
        years = await conn.fetch(
            """select y from (
                 select season_year as y from public.field_seasons where org_id=$1::uuid
                 union
                 select yl.season_year from public.yields yl
                   join public.fields f2 on f2.id = yl.field_id
                   join public.farms fa2 on fa2.id = f2.farm_id
                  where fa2.org_id=$1::uuid
                 union
                 select extract(year from o.performed_on)::int from public.field_operations o
                   join public.fields f3 on f3.id = o.field_id
                   join public.farms fa3 on fa3.id = f3.farm_id
                  where fa3.org_id=$1::uuid
               ) s where y is not null order by y desc""", org_id)
    seasons = [int(r["y"]) for r in years]
    this_year = date.today().year
    if this_year not in seasons:
        seasons.insert(0, this_year)
    return {
        "fields": [{"id": str(r["id"]), "name": r["name"],
                    "area_ha": float(r["area_ha"]) if r["area_ha"] is not None else None}
                   for r in fields],
        "seasons": seasons,
    }


@router.get("/orgs/{org_id}/reports")
async def list_reports(org_id: str, limit: int = Query(default=20, ge=1, le=100),
                       user_id: str = Depends(get_current_user_id)):
    """Previously generated reports (library list). Each row carries a ready-to-open html URL."""
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        rows = await conn.fetch(
            """select r.id, r.type, r.format, r.title, r.field_id, r.season_year,
                      r.period_from, r.period_to, r.generated_at, f.name as field_name
               from public.reports r
               left join public.fields f on f.id = r.field_id
               where r.org_id=$1::uuid and r.title is not null
               order by r.generated_at desc limit $2""", org_id, limit)
    out = []
    for r in rows:
        rtype = r["type"]
        fid = str(r["field_id"]) if r["field_id"] else None
        if rtype == "season" and fid:
            url = f"/api/fields/{fid}/reports/season?format=html"
            if r["season_year"]:
                url += f"&season={r['season_year']}"
        elif rtype == "journal" and fid:
            url = f"/api/fields/{fid}/reports/journal?format=html"
            if r["period_from"]:
                url += f"&from={r['period_from'].isoformat()}"
            if r["period_to"]:
                url += f"&to={r['period_to'].isoformat()}"
        elif rtype == "cost":
            url = f"/api/orgs/{org_id}/reports/cost?format=html"
            if r["season_year"]:
                url += f"&season={r['season_year']}"
        else:
            url = None
        out.append({
            "id": str(r["id"]), "type": rtype, "format": r["format"], "title": r["title"],
            "field_id": fid, "field_name": r["field_name"], "season_year": r["season_year"],
            "period_from": _iso(r["period_from"]), "period_to": _iso(r["period_to"]),
            "generated_at": _iso(r["generated_at"]), "url": url,
        })
    return {"reports": out}


# ========================================================= season report ====

async def _season_payload(conn, field_id: str, season: Optional[int]) -> dict:
    fld = await conn.fetchrow(
        """select f.id, f.name, f.area_ha, f.org_id, fa.name as farm_name, o.name as org_name
           from public.fields f
           join public.farms fa on fa.id = f.farm_id
           join public.organizations o on o.id = fa.org_id
           where f.id=$1::uuid""", field_id)
    if not fld:
        raise HTTPException(status_code=404, detail="field_not_found")

    if season is None:
        srow = await conn.fetchrow(
            """select * from public.field_seasons where field_id=$1::uuid
               order by is_current desc, season_year desc limit 1""", field_id)
    else:
        srow = await conn.fetchrow(
            """select * from public.field_seasons where field_id=$1::uuid and season_year=$2
               order by is_current desc limit 1""", field_id, season)
    year = int(srow["season_year"]) if srow else (season or date.today().year)
    season_id = str(srow["id"]) if srow else None

    meta = await conn.fetchrow(
        """select crop_type, variety, planting_date, expected_harvest, growth_stage,
                  soil_type, irrigation_method, target_yield
           from public.field_metadata where field_id=$1::uuid""", field_id)

    feats = await conn.fetchrow(
        """select crop_type, ndvi_peak, ndvi_mean, ndvi_integral, gdd_total, precip_total_mm,
                  n_scenes, sensor, computed_at
           from public.field_season_features where field_id=$1::uuid and season_year=$2""",
        field_id, year)

    ops = await conn.fetch(
        """select type, performed_on, inputs, cost, currency, phi_days, notes
           from public.field_operations
           where field_id=$1::uuid
             and (season_id = $2::uuid or (season_id is null and extract(year from performed_on) = $3))
           order by performed_on, created_at""", field_id, season_id, year)

    yrows = await conn.fetch(
        """select season_year, crop_type, yield_value, yield_unit, area_ha, revenue, price, notes
           from public.yields
           where field_id=$1::uuid
             and (season_id = $2::uuid or (season_id is null and season_year = $3))
           order by crop_type""", field_id, season_id, year)

    trows = await conn.fetch(
        """select title, type, due_date, status, notes, created_at
           from public.tasks
           where field_id=$1::uuid
             and (season_id = $2::uuid or (season_id is null and (
                   (due_date is not null and extract(year from due_date) = $3)
                or (due_date is null and extract(year from created_at) = $3))))
           order by coalesce(due_date, created_at::date), created_at""", field_id, season_id, year)

    srows = await conn.fetch(
        """select category, severity, note, observed_at, status
           from public.scouting_observations
           where field_id=$1::uuid and extract(year from observed_at) = $2
           order by observed_at""", field_id, year)

    events = []
    if season_id:
        events = await conn.fetch(
            """select from_status, to_status, occurred_on, source, note
               from public.field_season_events where season_id=$1::uuid
               order by occurred_on, created_at""", season_id)

    adv = await conn.fetchrow(
        """select summary, findings, generated_at, model_name
           from public.advice where field_id=$1::uuid order by generated_at desc limit 1""",
        field_id)

    by_cat = await _expense_by_category(conn, field_id, year)
    pnl = await _field_pnl(conn, field_id, year)

    crop = (srow["crop_type"] if srow and srow["crop_type"] else None) \
        or (meta["crop_type"] if meta else None) \
        or (feats["crop_type"] if feats else None)

    findings = _jload(adv["findings"]) if adv else None
    advice = None
    if adv:
        advice = {
            "summary": adv["summary"],
            "generated_at": _iso(adv["generated_at"]),
            "model": adv["model_name"],
            "risks": _text_list((findings or {}).get("risks") if isinstance(findings, dict) else None),
            "recommendations": _text_list(
                (findings or {}).get("recommendations") if isinstance(findings, dict) else None),
            "next_steps": _text_list(
                (findings or {}).get("next_steps") if isinstance(findings, dict) else None),
        }

    return {
        "kind": "season",
        "generated_at": _now_str(),
        "field": {"id": str(fld["id"]), "name": fld["name"],
                  "area_ha": float(fld["area_ha"]) if fld["area_ha"] is not None else None,
                  "farm_name": fld["farm_name"], "org_name": fld["org_name"],
                  "org_id": str(fld["org_id"])},
        "season": {
            "year": year,
            "crop_type": crop,
            "variety": (srow["variety"] if srow else None) or (meta["variety"] if meta else None),
            "status": srow["status"] if srow else None,
            "planting_date": _iso((srow["planting_date"] if srow else None)
                                  or (meta["planting_date"] if meta else None)),
            "emergence_date": _iso(srow["emergence_date"] if srow else None),
            "expected_harvest": _iso((srow["expected_harvest"] if srow else None)
                                     or (meta["expected_harvest"] if meta else None)),
            "actual_harvest_date": _iso(srow["actual_harvest_date"] if srow else None),
            "growth_stage": (srow["growth_stage"] if srow else None)
                            or (meta["growth_stage"] if meta else None),
            "target_yield": _f(srow["target_yield"]) if srow and srow["target_yield"] is not None
                            else (_f(meta["target_yield"]) if meta and meta["target_yield"] is not None else None),
            "soil_type": meta["soil_type"] if meta else None,
            "irrigation_method": meta["irrigation_method"] if meta else None,
        },
        "satellite": ({
            "ndvi_peak": _f(feats["ndvi_peak"]) if feats["ndvi_peak"] is not None else None,
            "ndvi_mean": _f(feats["ndvi_mean"]) if feats["ndvi_mean"] is not None else None,
            "ndvi_integral": _f(feats["ndvi_integral"]) if feats["ndvi_integral"] is not None else None,
            "gdd_total": _f(feats["gdd_total"]) if feats["gdd_total"] is not None else None,
            "precip_total_mm": _f(feats["precip_total_mm"]) if feats["precip_total_mm"] is not None else None,
            "n_scenes": feats["n_scenes"], "sensor": feats["sensor"],
            "computed_at": _iso(feats["computed_at"]),
        } if feats else None),
        "operations": [{
            "type": r["type"], "performed_on": _iso(r["performed_on"]),
            "inputs": _inputs_text(r["inputs"]),
            "cost": _f(r["cost"]) if r["cost"] is not None else None,
            "currency": r["currency"], "phi_days": r["phi_days"], "notes": r["notes"],
        } for r in ops],
        "by_category": by_cat,
        "operations_total": round(sum(_f(r["cost"]) for r in ops), 2),
        "yields": [{
            "crop_type": r["crop_type"], "yield_value": _f(r["yield_value"]) if r["yield_value"] is not None else None,
            "yield_unit": r["yield_unit"], "area_ha": _f(r["area_ha"]) if r["area_ha"] is not None else None,
            "revenue": _f(r["revenue"]) if r["revenue"] is not None else None,
            "price": _f(r["price"]) if r["price"] is not None else None, "notes": r["notes"],
        } for r in yrows],
        "tasks": [{
            "title": r["title"], "type": r["type"], "due_date": _iso(r["due_date"]),
            "status": r["status"], "notes": r["notes"],
        } for r in trows],
        "tasks_done": sum(1 for r in trows if (r["status"] or "") == "done"),
        "scouting": [{
            "category": r["category"], "severity": r["severity"], "note": r["note"],
            "observed_at": _iso(r["observed_at"]), "status": r["status"],
        } for r in srows],
        "events": [{
            "from_status": r["from_status"], "to_status": r["to_status"],
            "occurred_on": _iso(r["occurred_on"]), "source": r["source"], "note": r["note"],
        } for r in events],
        "advice": advice,
        "totals": {"expenses": pnl["expenses"], "revenue": pnl["revenue"], "profit": pnl["profit"],
                   "profit_per_ha": pnl["profit"] / float(fld["area_ha"])
                                    if fld["area_ha"] else None},
    }


def _season_html(p: dict) -> str:
    fld, se, sat, tot = p["field"], p["season"], p["satellite"], p["totals"]
    title = f"{se['year']} mövsüm hesabatı — {fld['name']}"
    sub_bits = [b for b in [fld.get("org_name"), fld.get("farm_name")] if b]
    body = "<h2>Sahə və mövsüm</h2>" + _kv([
        ("Sahə", fld["name"]),
        ("Ölçü", f"{_dec(fld['area_ha'], 2)} ha" if fld.get("area_ha") is not None else "—"),
        ("Məhsul", se.get("crop_type") or "—"),
        ("Sort", se.get("variety") or "—"),
        ("Mövsüm statusu", _label(_SEASON_STATUS_AZ, se.get("status"))),
        ("Əkin tarixi", _d(se.get("planting_date"))),
        ("Gözlənilən yığım", _d(se.get("expected_harvest"))),
        ("Faktiki yığım", _d(se.get("actual_harvest_date"))),
        ("İnkişaf mərhələsi", se.get("growth_stage") or "—"),
        ("Suvarma", se.get("irrigation_method") or "—"),
    ])

    body += "<h2>Peyk xülasəsi</h2>"
    if sat:
        body += _kv([
            ("NDVI pik", _dec(sat.get("ndvi_peak"), 3)),
            ("NDVI orta", _dec(sat.get("ndvi_mean"), 3)),
            ("NDVI inteqralı", _dec(sat.get("ndvi_integral"), 1)),
            ("GDD (cəm)", _dec(sat.get("gdd_total"), 0)),
            ("Yağıntı (mm)", _dec(sat.get("precip_total_mm"), 0)),
            ("Səhnə sayı", sat.get("n_scenes") if sat.get("n_scenes") is not None else "—"),
            ("Sensor", sat.get("sensor") or "—"),
        ])
    else:
        body += '<p class="empty">Bu mövsüm üçün hesablanmış peyk xülasəsi yoxdur.</p>'

    body += "<h2>Maliyyə</h2>" + _kv([
        ("Ümumi xərc", _money(tot["expenses"])),
        ("Ümumi gəlir", _money(tot["revenue"])),
        ("Mənfəət", _money(tot["profit"])),
        ("Mənfəət / ha", _money(tot["profit_per_ha"]) if tot.get("profit_per_ha") is not None else "—"),
    ])
    body += _table([("Xərc kateqoriyası", False), ("Məbləğ", True), ("Pay", True)],
                   [[_label(_OP_AZ, c["category"]), _money(c["amount"]),
                     f"{round(c['amount'] / tot['expenses'] * 100)}%" if tot["expenses"] else "—"]
                    for c in p["by_category"]],
                   empty="Xərc qeydi yoxdur.")

    body += "<h2>Əməliyyatlar</h2>"
    ops = p["operations"]
    body += _table(
        [("Tarix", False), ("Növ", False), ("Girişlər", False), ("Xərc", True), ("Qeyd", False)],
        [[_d(o["performed_on"]), _label(_OP_AZ, o["type"]), o["inputs"] or "—",
          _money(o["cost"]) if o["cost"] is not None else "—", o["notes"] or "—"] for o in ops],
        empty="Bu mövsümdə əməliyyat qeydi yoxdur.",
        total=["Cəmi", f"{len(ops)} əməliyyat", "", _money(p["operations_total"]), ""] if ops else None)

    body += "<h2>Məhsuldarlıq və gəlir</h2>" + _table(
        [("Məhsul", False), ("Məhsuldarlıq", True), ("Vahid", False), ("Sahə (ha)", True),
         ("Qiymət", True), ("Gəlir", True)],
        [[y["crop_type"] or "—", _dec(y["yield_value"], 2), y["yield_unit"] or "—",
          _dec(y["area_ha"], 2), _money(y["price"]) if y["price"] is not None else "—",
          _money(y["revenue"]) if y["revenue"] is not None else "—"] for y in p["yields"]],
        empty="Məhsuldarlıq qeydi yoxdur.")

    body += f"<h2>Tapşırıqlar ({p['tasks_done']} / {len(p['tasks'])} tamamlandı)</h2>" + _table(
        [("Son tarix", False), ("Tapşırıq", False), ("Növ", False), ("Status", False)],
        [[_d(t["due_date"]), t["title"], _label(_OP_AZ, t["type"]),
          _label(_TASK_STATUS_AZ, t["status"])] for t in p["tasks"]],
        empty="Tapşırıq yoxdur.")

    body += "<h2>Skautinq müşahidələri</h2>" + _table(
        [("Tarix", False), ("Kateqoriya", False), ("Şiddət", False), ("Status", False), ("Qeyd", False)],
        [[_d(s["observed_at"]), _label(_SCOUT_AZ, s["category"]), _label(_SEVERITY_AZ, s["severity"]),
          "Açıq" if (s["status"] or "open") == "open" else "Bağlı", s["note"] or "—"]
         for s in p["scouting"]],
        empty="Müşahidə qeydi yoxdur.")

    if p["events"]:
        body += "<h2>Mövsüm mərhələləri</h2>" + _table(
            [("Tarix", False), ("Keçid", False), ("Mənbə", False), ("Qeyd", False)],
            [[_d(ev["occurred_on"]),
              f"{_label(_SEASON_STATUS_AZ, ev['from_status'])} → {_label(_SEASON_STATUS_AZ, ev['to_status'])}",
              ev["source"] or "—", ev["note"] or "—"] for ev in p["events"]])

    adv = p["advice"]
    body += "<h2>Son AI məsləhəti</h2>"
    if adv:
        body += f'<p class="sub">{_e(_d(adv["generated_at"]))} · {_e(adv.get("model") or "AI")}</p>'
        body += f'<p class="pre">{_e(adv.get("summary") or "—")}</p>'
        body += "<p><strong>Risklər</strong></p>" + _bullets(adv.get("risks") or [], "Risk qeyd olunmayıb.")
        body += "<p><strong>Tövsiyələr</strong></p>" + _bullets(adv.get("recommendations") or [], "—")
        body += "<p><strong>Növbəti addımlar</strong></p>" + _bullets(adv.get("next_steps") or [], "—")
    else:
        body += '<p class="empty">Hələ AI məsləhəti yaradılmayıb.</p>'

    return _doc(title, " · ".join(sub_bits) if sub_bits else "Mövsüm hesabatı", body)


def _season_csv_rows(p: dict) -> list[list[Any]]:
    fld, se, tot = p["field"], p["season"], p["totals"]
    rows: list[list[Any]] = [
        ["Agradex — mövsüm hesabatı"],
        ["Hazırlandı", p["generated_at"]],
        ["Sahə", fld["name"]],
        ["Təsərrüfat", fld.get("farm_name") or ""],
        ["Ölçü (ha)", fld.get("area_ha") if fld.get("area_ha") is not None else ""],
        ["Mövsüm", se["year"]],
        ["Məhsul", se.get("crop_type") or ""],
        ["Əkin tarixi", se.get("planting_date") or ""],
        ["Gözlənilən yığım", se.get("expected_harvest") or ""],
        [],
        ["Ümumi xərc (₼)", round(tot["expenses"], 2)],
        ["Ümumi gəlir (₼)", round(tot["revenue"], 2)],
        ["Mənfəət (₼)", round(tot["profit"], 2)],
        [],
        ["Xərc kateqoriyası", "Məbləğ (₼)"],
    ]
    rows += [[_label(_OP_AZ, c["category"]), round(c["amount"], 2)] for c in p["by_category"]]
    rows += [[], ["Əməliyyatlar"], ["Tarix", "Növ", "Girişlər", "Xərc (₼)", "Qeyd"]]
    rows += [[o["performed_on"] or "", _label(_OP_AZ, o["type"]), o["inputs"] or "",
              o["cost"] if o["cost"] is not None else "", o["notes"] or ""] for o in p["operations"]]
    rows += [[], ["Məhsuldarlıq"], ["Məhsul", "Məhsuldarlıq", "Vahid", "Sahə (ha)", "Gəlir (₼)"]]
    rows += [[y["crop_type"] or "", y["yield_value"] if y["yield_value"] is not None else "",
              y["yield_unit"] or "", y["area_ha"] if y["area_ha"] is not None else "",
              y["revenue"] if y["revenue"] is not None else ""] for y in p["yields"]]
    rows += [[], ["Tapşırıqlar"], ["Son tarix", "Tapşırıq", "Növ", "Status"]]
    rows += [[t["due_date"] or "", t["title"], _label(_OP_AZ, t["type"]),
              _label(_TASK_STATUS_AZ, t["status"])] for t in p["tasks"]]
    rows += [[], ["Skautinq"], ["Tarix", "Kateqoriya", "Şiddət", "Status", "Qeyd"]]
    rows += [[(s["observed_at"] or "")[:10], _label(_SCOUT_AZ, s["category"]),
              _label(_SEVERITY_AZ, s["severity"]), s["status"] or "", s["note"] or ""]
             for s in p["scouting"]]
    return rows


@router.get("/fields/{field_id}/reports/season")
async def season_report(field_id: str,
                        season: Optional[int] = Query(default=None, ge=1990, le=2100),
                        format: str = Query(default="html"),
                        user_id: str = Depends(get_current_user_id)):
    fmt = _check_format(format)
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        payload = await _season_payload(conn, field_id, season)
        title = f"{payload['season']['year']} mövsüm hesabatı — {payload['field']['name']}"
        await _record(conn, org_id=org_id, field_id=field_id, rtype="season", fmt=fmt, title=title,
                      season_year=payload["season"]["year"], period_from=None, period_to=None,
                      params={"season": payload["season"]["year"]}, payload=payload, user_id=user_id)
    if fmt == "json":
        return payload
    if fmt == "csv":
        return _csv_response(
            f"agradex-movsum-{payload['season']['year']}-{_slug(payload['field']['name'])}.csv",
            _season_csv_rows(payload))
    return _html_response(_season_html(payload))


# ====================================================== operations journal ====

async def _journal_payload(conn, field_id: str, d_from: date, d_to: date) -> dict:
    fld = await conn.fetchrow(
        """select f.id, f.name, f.area_ha, fa.name as farm_name, o.name as org_name
           from public.fields f
           join public.farms fa on fa.id = f.farm_id
           join public.organizations o on o.id = fa.org_id
           where f.id=$1::uuid""", field_id)
    if not fld:
        raise HTTPException(status_code=404, detail="field_not_found")

    ops = await conn.fetch(
        """select type, performed_on, inputs, cost, currency, phi_days, notes
           from public.field_operations
           where field_id=$1::uuid and performed_on between $2::date and $3::date
           order by performed_on, created_at""", field_id, d_from, d_to)
    tasks = await conn.fetch(
        """select title, type, due_date, status, notes
           from public.tasks
           where field_id=$1::uuid and due_date between $2::date and $3::date
           order by due_date""", field_id, d_from, d_to)
    scouts = await conn.fetch(
        """select category, severity, note, observed_at, status
           from public.scouting_observations
           where field_id=$1::uuid and observed_at::date between $2::date and $3::date
           order by observed_at""", field_id, d_from, d_to)

    timeline: list[dict] = []
    total_cost = 0.0
    for r in ops:
        cost = _f(r["cost"]) if r["cost"] is not None else None
        if cost:
            total_cost += cost
        timeline.append({
            "date": _iso(r["performed_on"]), "kind": "operation",
            "kind_label": "Əməliyyat", "type": r["type"], "type_label": _label(_OP_AZ, r["type"]),
            "title": _label(_OP_AZ, r["type"]), "inputs": _inputs_text(r["inputs"]),
            "cost": cost, "status": None,
            "notes": " · ".join([b for b in [
                r["notes"], (f"PHI {r['phi_days']} gün" if r["phi_days"] else None)] if b]) or None,
        })
    for r in tasks:
        timeline.append({
            "date": _iso(r["due_date"]), "kind": "task", "kind_label": "Tapşırıq",
            "type": r["type"], "type_label": _label(_OP_AZ, r["type"]), "title": r["title"],
            "inputs": "", "cost": None, "status": _label(_TASK_STATUS_AZ, r["status"]),
            "notes": r["notes"],
        })
    for r in scouts:
        timeline.append({
            "date": _iso(r["observed_at"])[:10] if r["observed_at"] else None,
            "kind": "scouting", "kind_label": "Skautinq", "type": r["category"],
            "type_label": _label(_SCOUT_AZ, r["category"]),
            "title": f"{_label(_SCOUT_AZ, r['category'])} · {_label(_SEVERITY_AZ, r['severity'])}",
            "inputs": "", "cost": None,
            "status": "Açıq" if (r["status"] or "open") == "open" else "Bağlı",
            "notes": r["note"],
        })
    timeline.sort(key=lambda x: (x["date"] or "", x["kind"]))

    return {
        "kind": "journal",
        "generated_at": _now_str(),
        "field": {"id": str(fld["id"]), "name": fld["name"],
                  "area_ha": float(fld["area_ha"]) if fld["area_ha"] is not None else None,
                  "farm_name": fld["farm_name"], "org_name": fld["org_name"]},
        "period": {"from": d_from.isoformat(), "to": d_to.isoformat()},
        "timeline": timeline,
        "counts": {"operations": len(ops), "tasks": len(tasks), "scouting": len(scouts)},
        "total_cost": total_cost,
    }


def _journal_html(p: dict) -> str:
    fld, per = p["field"], p["period"]
    title = f"Əməliyyat jurnalı — {fld['name']}"
    body = _kv([
        ("Dövr", f"{per['from']} — {per['to']}"),
        ("Əməliyyat", p["counts"]["operations"]),
        ("Tapşırıq", p["counts"]["tasks"]),
        ("Skautinq", p["counts"]["scouting"]),
        ("Ümumi xərc", _money(p["total_cost"])),
    ])
    body += "<h2>Xronoloji jurnal</h2>" + _table(
        [("Tarix", False), ("Qeyd növü", False), ("Başlıq", False), ("Girişlər", False),
         ("Xərc", True), ("Status", False), ("Şərh", False)],
        [[_d(e["date"]), e["kind_label"], e["title"], e["inputs"] or "—",
          _money(e["cost"]) if e["cost"] is not None else "—", e["status"] or "—",
          e["notes"] or "—"] for e in p["timeline"]],
        empty="Bu dövrdə qeyd yoxdur.",
        total=["Cəmi", f"{len(p['timeline'])} qeyd", "", "", _money(p["total_cost"]), "", ""]
        if p["timeline"] else None)
    sub = " · ".join([b for b in [fld.get("org_name"), fld.get("farm_name")] if b])
    return _doc(title, sub or "Əməliyyat jurnalı", body)


def _journal_csv_rows(p: dict) -> list[list[Any]]:
    rows: list[list[Any]] = [
        ["Agradex — əməliyyat jurnalı"],
        ["Hazırlandı", p["generated_at"]],
        ["Sahə", p["field"]["name"]],
        ["Dövr", f"{p['period']['from']} — {p['period']['to']}"],
        ["Ümumi xərc (₼)", round(p["total_cost"], 2)],
        [],
        ["Tarix", "Qeyd növü", "Başlıq", "Girişlər", "Xərc (₼)", "Status", "Şərh"],
    ]
    rows += [[e["date"] or "", e["kind_label"], e["title"], e["inputs"] or "",
              e["cost"] if e["cost"] is not None else "", e["status"] or "", e["notes"] or ""]
             for e in p["timeline"]]
    return rows


@router.get("/fields/{field_id}/reports/journal")
async def journal_report(field_id: str,
                         date_from: Optional[date] = Query(default=None, alias="from"),
                         date_to: Optional[date] = Query(default=None, alias="to"),
                         format: str = Query(default="html"),
                         user_id: str = Depends(get_current_user_id)):
    fmt = _check_format(format)
    d_to = date_to or date.today()
    d_from = date_from or (d_to - timedelta(days=365))
    if d_from > d_to:
        raise HTTPException(status_code=400, detail="invalid_period")
    async with connection(user_id) as conn:
        org_id = await _org_of_field(conn, field_id)
        await require_member(conn, user_id, org_id)
        payload = await _journal_payload(conn, field_id, d_from, d_to)
        title = f"Əməliyyat jurnalı — {payload['field']['name']} ({d_from.isoformat()} — {d_to.isoformat()})"
        await _record(conn, org_id=org_id, field_id=field_id, rtype="journal", fmt=fmt, title=title,
                      season_year=None, period_from=d_from, period_to=d_to,
                      params={"from": d_from.isoformat(), "to": d_to.isoformat()},
                      payload=payload, user_id=user_id)
    if fmt == "json":
        return payload
    if fmt == "csv":
        return _csv_response(
            f"agradex-jurnal-{_slug(payload['field']['name'])}-{d_from.isoformat()}-{d_to.isoformat()}.csv",
            _journal_csv_rows(payload))
    return _html_response(_journal_html(payload))


# =========================================================== cost summary ====

async def _cost_payload(conn, org_id: str, season: Optional[int]) -> dict:
    org = await conn.fetchrow("select name from public.organizations where id=$1::uuid", org_id)
    if not org:
        raise HTTPException(status_code=404, detail="org_not_found")
    fields = await conn.fetch(
        """select f.id, f.name, f.area_ha
           from public.fields f join public.farms fa on fa.id = f.farm_id
           where fa.org_id=$1::uuid and f.deleted_at is null order by f.name""", org_id)

    rows: list[dict] = []
    tot_exp = tot_rev = 0.0
    cat_totals: dict[str, float] = {}
    for fr in fields:
        fid = str(fr["id"])
        pnl = await _field_pnl(conn, fid, season)
        cats = await _expense_by_category(conn, fid, season)
        for c in cats:
            cat_totals[c["category"]] = cat_totals.get(c["category"], 0.0) + c["amount"]
        area = _f(fr["area_ha"])
        rows.append({
            "field_id": fid, "name": fr["name"], "area_ha": area,
            "expenses": pnl["expenses"], "revenue": pnl["revenue"], "profit": pnl["profit"],
            "profit_per_ha": round(pnl["profit"] / area, 1) if area else None,
            "expense_per_ha": round(pnl["expenses"] / area, 1) if area else None,
            "by_category": cats,
        })
        tot_exp += pnl["expenses"]
        tot_rev += pnl["revenue"]

    by_category = sorted(({"category": k, "amount": v} for k, v in cat_totals.items()),
                         key=lambda c: c["amount"], reverse=True)
    return {
        "kind": "cost",
        "generated_at": _now_str(),
        "org": {"id": org_id, "name": org["name"]},
        "season": season,
        "fields": rows,
        "by_category": by_category,
        "totals": {"expenses": tot_exp, "revenue": tot_rev, "profit": tot_rev - tot_exp},
    }


def _cost_html(p: dict) -> str:
    tot = p["totals"]
    title = ("Xərc xülasəsi" if not p["season"] else f"{p['season']} xərc xülasəsi")
    body = _kv([
        ("Təsərrüfat", p["org"]["name"]),
        ("Mövsüm", p["season"] if p["season"] else "Bütün dövr"),
        ("Sahə sayı", len(p["fields"])),
        ("Ümumi xərc", _money(tot["expenses"])),
        ("Ümumi gəlir", _money(tot["revenue"])),
        ("Mənfəət", _money(tot["profit"])),
    ])
    body += "<h2>Kateqoriya üzrə xərc</h2>" + _table(
        [("Kateqoriya", False), ("Məbləğ", True), ("Pay", True)],
        [[_label(_OP_AZ, c["category"]), _money(c["amount"]),
          f"{round(c['amount'] / tot['expenses'] * 100)}%" if tot["expenses"] else "—"]
         for c in p["by_category"]],
        empty="Xərc qeydi yoxdur.",
        total=["Cəmi", _money(tot["expenses"]), "100%"] if p["by_category"] else None)

    body += "<h2>Sahə üzrə</h2>" + _table(
        [("Sahə", False), ("Ölçü (ha)", True), ("Xərc", True), ("Xərc/ha", True),
         ("Gəlir", True), ("Mənfəət", True), ("Mənfəət/ha", True)],
        [[r["name"], _dec(r["area_ha"], 2), _money(r["expenses"]),
          _money(r["expense_per_ha"]) if r["expense_per_ha"] is not None else "—",
          _money(r["revenue"]), _money(r["profit"]),
          _money(r["profit_per_ha"]) if r["profit_per_ha"] is not None else "—"]
         for r in p["fields"]],
        empty="Hələ sahə yoxdur.",
        total=["Cəmi", "", _money(tot["expenses"]), "", _money(tot["revenue"]),
               _money(tot["profit"]), ""] if p["fields"] else None)

    detail = [r for r in p["fields"] if r["by_category"]]
    if detail:
        body += "<h2>Sahə × kateqoriya</h2>" + _table(
            [("Sahə", False), ("Kateqoriya", False), ("Məbləğ", True)],
            [[r["name"], _label(_OP_AZ, c["category"]), _money(c["amount"])]
             for r in detail for c in r["by_category"]])
    return _doc(title, p["org"]["name"], body)


def _cost_csv_rows(p: dict) -> list[list[Any]]:
    tot = p["totals"]
    rows: list[list[Any]] = [
        ["Agradex — xərc xülasəsi"],
        ["Hazırlandı", p["generated_at"]],
        ["Təsərrüfat", p["org"]["name"]],
        ["Mövsüm", p["season"] if p["season"] else "Bütün dövr"],
        ["Ümumi xərc (₼)", round(tot["expenses"], 2)],
        ["Ümumi gəlir (₼)", round(tot["revenue"], 2)],
        ["Mənfəət (₼)", round(tot["profit"], 2)],
        [],
        ["Sahə", "Ölçü (ha)", "Xərc (₼)", "Gəlir (₼)", "Mənfəət (₼)", "Mənfəət/ha (₼)"],
    ]
    rows += [[r["name"], r["area_ha"], round(r["expenses"], 2), round(r["revenue"], 2),
              round(r["profit"], 2), r["profit_per_ha"] if r["profit_per_ha"] is not None else ""]
             for r in p["fields"]]
    rows += [[], ["Kateqoriya üzrə"], ["Kateqoriya", "Məbləğ (₼)"]]
    rows += [[_label(_OP_AZ, c["category"]), round(c["amount"], 2)] for c in p["by_category"]]
    rows += [[], ["Sahə x kateqoriya"], ["Sahə", "Kateqoriya", "Məbləğ (₼)"]]
    rows += [[r["name"], _label(_OP_AZ, c["category"]), round(c["amount"], 2)]
             for r in p["fields"] for c in r["by_category"]]
    return rows


@router.get("/orgs/{org_id}/reports/cost")
async def cost_report(org_id: str,
                      season: Optional[int] = Query(default=None, ge=1990, le=2100),
                      format: str = Query(default="html"),
                      user_id: str = Depends(get_current_user_id)):
    fmt = _check_format(format)
    async with connection(user_id) as conn:
        await require_member(conn, user_id, org_id)
        payload = await _cost_payload(conn, org_id, season)
        title = (f"{season} xərc xülasəsi — {payload['org']['name']}" if season
                 else f"Xərc xülasəsi — {payload['org']['name']}")
        await _record(conn, org_id=org_id, field_id=None, rtype="cost", fmt=fmt, title=title,
                      season_year=season, period_from=None, period_to=None,
                      params={"season": season}, payload=payload, user_id=user_id)
    if fmt == "json":
        return payload
    if fmt == "csv":
        return _csv_response(
            f"agradex-xerc-{season or 'hamisi'}-{_slug(payload['org']['name'])}.csv",
            _cost_csv_rows(payload))
    return _html_response(_cost_html(payload))
