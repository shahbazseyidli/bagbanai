#!/usr/bin/env python3
"""Model bake-off for the ADVICE call — the one that scales with users.

THE QUESTION THIS ANSWERS is not "which model is cheapest". DeepSeek is ~50x cheaper than Opus per
token and no experiment is needed to learn that. The question is:

    which model is cheapest that still honours the advice contract, in Azerbaijani?

That contract is not decoration. `severity` is a CODE — exactly one of aşağı | orta | yüksək — that
the frontend maps to a coloured badge in eight languages (grep severityLabel in
app/src/lib/wellnessText.ts). A model that writes "medium", or localises the code, or omits a risk's
severity, produces an object the UI cannot render. Cheapness that breaks it is not a saving.

HOW IT STAYS HONEST
  * REAL INPUTS. Prompts are rebuilt from public.advice.input_snapshot — actual field context that
    actually produced advice for a real farmer — not a hand-written sample that flatters everyone.
  * MECHANICAL CHECKS ARE MECHANICAL. Schema shape and severity codes are verified in code, never
    by asking a model whether it did well.
  * THE JUDGE IS BLIND. Candidates are shuffled and labelled A/B/C/D per prompt; the judge is never
    told which model wrote which answer, and the mapping is only re-joined after scoring.
  * COST IS MEASURED, not priced. Every number comes from the provider's own usage fields in the
    response. ai/pricing.py converts them, so the ledger and this report agree by construction.
  * IT WRITES NOTHING. SELECT only; no INSERT into public.advice, no notification, no ai_usage row.
    A farmer cannot be affected by running this.

WHY RAW HTTP AND NOT FOUR SDKs: adding three client libraries to compare them would mean the
comparison depends on three libraries' defaults. httpx is already a dependency, and each provider's
structured-output mechanism is then explicit in one place — which matters, because THEY ARE NOT THE
SAME MECHANISM and that difference is half the finding:

    Anthropic  tool with input_schema + forced tool_choice   → schema enforced
    OpenAI     response_format json_schema, strict: true     → schema enforced
    Gemini     responseSchema + responseMimeType             → schema declared (compat layer beta)
    DeepSeek   response_format json_object                   → NO user schema; prompt-only

Run:  docker exec -i deploy-api-1 python - < tools/bakeoff.py        (env comes from the container)
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import sys
from typing import Any, Optional

import httpx

# ── the contract under test (mirrors ai/advice.py::AdviceResult) ────────────────────────────────
SEVERITIES = ["aşağı", "orta", "yüksək"]

ADVICE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": SEVERITIES},
                    "detail": {"type": "string"},
                },
                "required": ["title", "severity", "detail"],
                "additionalProperties": False,
            },
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"title": {"type": "string"}, "detail": {"type": "string"}},
                "required": ["title", "detail"],
                "additionalProperties": False,
            },
        },
        "next_steps": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "risks", "recommendations", "next_steps"],
    "additionalProperties": False,
}

# Copied verbatim from ai/advice.py so the replay is faithful. If that prompt changes, this must be
# re-copied — a bake-off against a stale prompt measures a product that no longer exists.
SYSTEM = (
    "Sən Azərbaycan fermerləri üçün təcrübəli aqronomsan. Sənə bir sahənin NASA/Sentinel peyk "
    "indeksləri (NDVI bitki sağlamlığı, NDMI bitki nəmliyi, NDWI su, EVI, SAVI, NBR), məhsul "
    "məlumatı və sahə qeydləri verilir. Bu məlumatlara əsasən qısa, praktiki və Azərbaycan "
    "şəraitinə uyğun aqronomik məsləhət ver. Uydurma — yalnız verilən rəqəmlərə əsaslan."
)

CANDIDATES = [
    ("anthropic", "claude-opus-4-8"),   # today's production model — the baseline
    ("anthropic", "claude-sonnet-5"),
    ("anthropic", "claude-haiku-4-5"),
    ("openai", "gpt-5"),

    # NOT gemini-2.5-flash: it is in the models list but returns
    # "no longer available to new users" for this key. The *-latest aliases are what a new key can
    # actually call, verified by probing each one.
    ("gemini", "gemini-flash-latest"),
    ("deepseek", "deepseek-v4-flash"),
]

TIMEOUT = httpx.Timeout(180.0)

# The first run used 2000 and every Anthropic model came back at EXACTLY out=2000 with
# `recommendations` and `next_steps` missing — the ceiling truncated the object mid-contract and the
# harness then scored the model as having broken a contract the harness broke for it. Production
# advice averages ~1,528 output tokens, so this leaves real headroom; a model that still overruns is
# genuinely verbose and deserves the mark.
MAX_TOKENS = 4000


# ── provider adapters — each returns (parsed_or_None, raw_text, usage) ───────────────────────────
async def call_anthropic(client: httpx.AsyncClient, model: str, user: str) -> tuple:
    """USES THE SAME MECHANISM PRODUCTION USES, and that distinction cost this harness two runs.

    Anthropic has two different ways to get a shaped object back, and they are not equally strict:
      * a forced TOOL call with `input_schema` — best-effort adherence. This harness used it first,
        and both Opus and Sonnet intermittently returned objects missing `recommendations` or
        `next_steps`. The failures moved between prompts from run to run, and `stop_reason` was
        never max_tokens, so it was not truncation — it was simply a mechanism that does not
        guarantee `required`.
      * `messages.parse(output_format=...)` — structured outputs, validated against the schema.
        This is what ai/llm.py::complete_structured calls, so it is what production actually gets.

    Measuring the first while production runs the second made the production model look like it
    broke its own contract one time in three. It does not. The SDK is already a dependency here
    (the api image installs anthropic>=0.69), so the honest comparison uses it.

    The other three providers keep raw HTTP because raw HTTP IS their real mechanism —
    OpenAI's strict json_schema, Gemini's responseSchema, and DeepSeek's schemaless json_object.
    """
    from anthropic import AsyncAnthropic
    from pydantic import BaseModel, Field
    from typing import Literal, List

    # Rebuilt as Pydantic because that is what output_format takes — same shape as
    # ai/advice.py::AdviceResult, deliberately duplicated so a change there shows up as a diff here.
    class Risk(BaseModel):
        title: str
        severity: Literal["aşağı", "orta", "yüksək"]
        detail: str

    class Recommendation(BaseModel):
        title: str
        detail: str

    class AdviceOut(BaseModel):
        summary: str
        risks: List[Risk]
        recommendations: List[Recommendation]
        next_steps: List[str]

    sdk = AsyncAnthropic(api_key=os.environ["LLM_API_KEY"])
    resp = await sdk.messages.parse(
        model=model, max_tokens=MAX_TOKENS, system=SYSTEM,
        messages=[{"role": "user", "content": user}], output_format=AdviceOut)
    u = getattr(resp, "usage", None)
    usage = {"in": getattr(u, "input_tokens", 0), "out": getattr(u, "output_tokens", 0),
             "stop": getattr(resp, "stop_reason", None)}
    parsed = getattr(resp, "parsed_output", None)
    if parsed is None:
        return None, "parsed_output was None", usage
    obj = parsed.model_dump()
    return obj, json.dumps(obj, ensure_ascii=False), usage


async def call_openai(client: httpx.AsyncClient, model: str, user: str) -> tuple:
    r = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
        json={
            "model": model,
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
            "response_format": {"type": "json_schema", "json_schema": {
                "name": "advice", "strict": True, "schema": ADVICE_SCHEMA}},
        })
    r.raise_for_status()
    d = r.json()
    u = d.get("usage", {})
    usage = {"in": u.get("prompt_tokens", 0), "out": u.get("completion_tokens", 0)}
    txt = d["choices"][0]["message"].get("content") or ""
    try:
        return json.loads(txt), txt, usage
    except Exception:
        return None, txt[:800], usage


async def call_gemini(client: httpx.AsyncClient, model: str, user: str) -> tuple:
    key = os.environ["GEMINI_API_KEY"]
    r = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
        json={
            "systemInstruction": {"parts": [{"text": SYSTEM}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"responseMimeType": "application/json",
                                 "responseSchema": _gemini_schema(ADVICE_SCHEMA)},
        })
    r.raise_for_status()
    d = r.json()
    u = d.get("usageMetadata", {})
    usage = {"in": u.get("promptTokenCount", 0), "out": u.get("candidatesTokenCount", 0)}
    try:
        txt = d["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(txt), txt, usage
    except Exception:
        return None, json.dumps(d)[:800], usage


def _gemini_schema(s: dict) -> dict:
    """Gemini's schema dialect is OpenAPI-ish, not JSON Schema: it rejects additionalProperties and
    wants an explicit `enum` + `format` shape. Strip what it will not accept rather than let the
    request 400 and score the model as a failure it did not commit."""
    out: dict[str, Any] = {}
    for k, v in s.items():
        if k == "additionalProperties":
            continue
        if k == "properties":
            out[k] = {pk: _gemini_schema(pv) for pk, pv in v.items()}
        elif k == "items":
            out[k] = _gemini_schema(v)
        else:
            out[k] = v
    return out


async def call_deepseek(client: httpx.AsyncClient, model: str, user: str) -> tuple:
    # THE POINT OF THIS ADAPTER: DeepSeek has json_object mode but NO user-supplied schema, so the
    # contract can only be ASKED for in prose. Whether it holds is exactly what we are measuring —
    # so the schema goes in the prompt and nothing enforces it.
    sys_msg = (SYSTEM + "\n\nCavabı YALNIZ bu JSON sxeminə uyğun ver:\n"
               + json.dumps(ADVICE_SCHEMA, ensure_ascii=False)
               + "\nseverity yalnız: aşağı | orta | yüksək")
    r = await client.post(
        "https://api.deepseek.com/chat/completions",
        headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
        json={"model": model,
              "messages": [{"role": "system", "content": sys_msg}, {"role": "user", "content": user}],
              "response_format": {"type": "json_object"}, "max_tokens": MAX_TOKENS})
    r.raise_for_status()
    d = r.json()
    u = d.get("usage", {})
    usage = {"in": u.get("prompt_tokens", 0), "out": u.get("completion_tokens", 0)}
    txt = d["choices"][0]["message"].get("content") or ""
    try:
        return json.loads(txt), txt, usage
    except Exception:
        return None, txt[:800], usage


ADAPTERS = {"anthropic": call_anthropic, "openai": call_openai,
            "gemini": call_gemini, "deepseek": call_deepseek}


# ── mechanical checks: never ask a model whether it obeyed ──────────────────────────────────────
def contract_check(obj: Optional[dict]) -> dict:
    if not isinstance(obj, dict):
        return {"parsed": False, "schema_ok": False, "severity_ok": False, "problems": ["not JSON"]}
    problems: list[str] = []
    for key in ("summary", "risks", "recommendations", "next_steps"):
        if key not in obj:
            problems.append(f"missing {key}")
    risks = obj.get("risks")
    if not isinstance(risks, list):
        problems.append("risks is not a list")
        risks = []
    # A risk that is not an object at all (a bare string, say) is a contract break worth naming
    # precisely — and it must not crash the checker, or the run dies on the first model that does it
    # and the remaining models never get measured.
    nonobj = [r for r in risks if not isinstance(r, dict)]
    if nonobj:
        problems.append(f"{len(nonobj)} risk(s) not objects, e.g. {str(nonobj[0])[:40]!r}")
    objs = [r for r in risks if isinstance(r, dict)]
    bad = [r.get("severity") for r in objs if r.get("severity") not in SEVERITIES]
    if bad:
        problems.append(f"bad severity: {bad!r}")
    for r in objs:
        for k in ("title", "severity", "detail"):
            if k not in r:
                problems.append(f"risk missing {k}")
    return {"parsed": True, "schema_ok": not problems, "severity_ok": not bad,
            "risks": len(risks), "problems": problems}


# ── the blind judge ─────────────────────────────────────────────────────────────────────────────
JUDGE_SYSTEM = (
    "Sən aqronomik mətnləri qiymətləndirən sərt hakimsən. Sənə bir sahənin GİRİŞ məlumatı (JSON) "
    "və həmin girişə əsasən yazılmış bir neçə anonim cavab verilir. Cavabları A, B, C… hərfləri ilə "
    "tanıyırsan; onları kimin yazdığını BİLMİRSƏN və təxmin etməyə çalışma.\n\n"
    "Hər cavab üçün 0-5 arası bal ver:\n"
    "- grounded: cavabdakı HƏR rəqəm və fakt girişdə varmı? Girişdə olmayan ölçü uydurulubsa 0.\n"
    "- azerbaijani: dil təbii, fermerin başa düşəcəyi Azərbaycancadırmı? Tərcümə qoxusu varsa aşağı.\n"
    "- actionable: tövsiyələr konkret və icra edilə biləndirmi? Ümumi sözlərsə aşağı.\n"
    "Ən vacibi GROUNDED-dir: uydurulmuş rəqəm fermeri yanlış qərara aparır."
)

JUDGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "grounded": {"type": "integer"},
                    "azerbaijani": {"type": "integer"},
                    "actionable": {"type": "integer"},
                    "note": {"type": "string"},
                },
                "required": ["label", "grounded", "azerbaijani", "actionable", "note"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["scores"],
    "additionalProperties": False,
}


async def judge(client: httpx.AsyncClient, ctx_json: str, labelled: list[tuple[str, dict]]) -> dict:
    """One judge call per prompt, scoring every candidate together so the comparison is relative.
    Uses the strongest model available — judging is the one place to not economise."""
    body = "GİRİŞ MƏLUMATI:\n" + ctx_json + "\n\nCAVABLAR:\n"
    for label, obj in labelled:
        body += f"\n--- {label} ---\n" + json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
    r = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": os.environ["LLM_API_KEY"], "anthropic-version": "2023-06-01"},
        json={"model": "claude-opus-4-8", "max_tokens": 2000, "system": JUDGE_SYSTEM,
              "messages": [{"role": "user", "content": body}],
              "tools": [{"name": "score", "description": "Qiymətlər",
                         "input_schema": JUDGE_SCHEMA}],
              "tool_choice": {"type": "tool", "name": "score"}})
    r.raise_for_status()
    d = r.json()
    for block in d.get("content", []):
        if block.get("type") == "tool_use":
            return block.get("input", {})
    return {"scores": []}


async def main() -> None:
    import asyncpg
    n_prompts = int(os.environ.get("BAKEOFF_N", "3"))

    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn)
    try:
        # READ ONLY. Real prompts that really produced advice for a real field.
        rows = await conn.fetch(
            """select id, field_id, input_snapshot
               from public.advice
               where input_snapshot is not null
               order by generated_at desc limit $1""", n_prompts)
    finally:
        await conn.close()

    if not rows:
        print("No advice.input_snapshot rows to replay — nothing to measure."); return

    # Two switches so a re-measurement can be narrowed to the thing in doubt. Re-running a provider
    # whose numbers are already sound does not make them sounder — it spends money and adds variance.
    only = {p.strip() for p in os.environ.get("BAKEOFF_ONLY", "").split(",") if p.strip()}
    candidates = [(p, m) for p, m in CANDIDATES if not only or p in only]
    no_judge = os.environ.get("BAKEOFF_NOJUDGE") == "1"

    print(f"Replaying {len(rows)} real prompt(s) across {len(candidates)} models"
          f"{' (contract only, no judge)' if no_judge else ''}\n")
    sys.path.insert(0, "/srv")
    from app.ai import pricing

    totals: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for idx, row in enumerate(rows, 1):
            ctx = row["input_snapshot"]
            ctx = json.loads(ctx) if isinstance(ctx, str) else ctx
            ctx_json = json.dumps(ctx, ensure_ascii=False, indent=2)
            user = ("Sahə məlumatları (JSON):\n" + ctx_json
                    + "\n\nBu sahə üçün xülasə, risklər, məsləhətlər və növbəti addımları çıxar.")
            print(f"── prompt {idx}/{len(rows)}  (field {str(row['field_id'])[:8]}, "
                  f"{len(ctx_json)} chars)")

            results = []
            for provider, model in candidates:
                try:
                    obj, raw, usage = await ADAPTERS[provider](client, model, user)
                    err = None
                except Exception as exc:  # noqa: BLE001 — a provider failing IS a finding
                    obj, raw, usage, err = None, str(exc)[:200], {"in": 0, "out": 0}, str(exc)[:120]
                chk = contract_check(obj)
                cost = pricing.cost_usd(model, usage["in"], usage["out"])
                results.append({"provider": provider, "model": model, "obj": obj, "raw": raw,
                                "usage": usage, "cost": cost, "check": chk, "error": err})
                stop = usage.get("stop")
                truncated = stop in ("max_tokens", "length")
                if truncated:
                    # Our ceiling, not their mistake. Excluded from the contract tally entirely.
                    chk["schema_ok"] = None
                flag = "CUT" if truncated else ("ok " if chk["schema_ok"] else "BAD")
                print(f"   {flag} {model:<20} in={usage['in']:>6} out={usage['out']:>5} "
                      f"${cost:.5f}  {('stop=' + str(stop) + ' ') if truncated else ''}"
                      f"{err or ','.join(chk['problems'][:2])}")

            # Blind the judge: shuffle, relabel, and keep the mapping out of the prompt.
            usable = [r for r in results if r["check"]["parsed"]]
            random.shuffle(usable)
            labels = [chr(ord("A") + i) for i in range(len(usable))]
            labelled = list(zip(labels, [r["obj"] for r in usable]))
            scored = {}
            if labelled and not no_judge:
                try:
                    js = await judge(client, ctx_json, labelled)
                    scored = {s["label"]: s for s in js.get("scores", [])}
                except Exception as exc:  # noqa: BLE001
                    print(f"   judge failed: {str(exc)[:120]}")

            for label, r in zip(labels, usable):
                s = scored.get(label, {})
                r["scores"] = s
                print(f"      {label} = {r['model']:<20} grounded={s.get('grounded','?')} "
                      f"az={s.get('azerbaijani','?')} act={s.get('actionable','?')} "
                      f"{str(s.get('note',''))[:70]}")

            for r in results:
                t = totals.setdefault(r["model"], {"cost": 0.0, "ok": 0, "n": 0,
                                                   "g": [], "a": [], "act": []})
                t["cost"] += r["cost"]; t["n"] += 1
                if r["check"]["schema_ok"] is None:
                    t["n"] -= 1          # truncated by us: not evidence either way
                elif r["check"]["schema_ok"]:
                    t["ok"] += 1
                s = r.get("scores") or {}
                for key, field in (("g", "grounded"), ("a", "azerbaijani"), ("act", "actionable")):
                    if isinstance(s.get(field), int):
                        t[key].append(s[field])
            print()

    print("\n" + "=" * 92)
    print(f"{'model':<22}{'contract':>10}{'grounded':>10}{'AZ':>7}{'action':>8}"
          f"{'$/call':>11}{'vs opus':>10}")
    print("=" * 92)
    base = totals.get("claude-opus-4-8", {})
    base_per = (base.get("cost", 0) / base["n"]) if base.get("n") else 0
    avg = lambda xs: (sum(xs) / len(xs)) if xs else float("nan")  # noqa: E731
    for model, t in sorted(totals.items(), key=lambda kv: kv[1]["cost"] / max(kv[1]["n"], 1)):
        per = t["cost"] / max(t["n"], 1)
        rel = f"{per / base_per:.2f}x" if base_per else "—"
        print(f"{model:<22}{t['ok']}/{t['n']:<9}{avg(t['g']):>9.1f}{avg(t['a']):>7.1f}"
              f"{avg(t['act']):>8.1f}{per:>11.5f}{rel:>10}")
    print("=" * 92)
    print("contract = schema + severity codes valid, checked in code, never by a model.")
    print("A model that is cheap but fails the contract is not a saving — the UI cannot render it.")


if __name__ == "__main__":
    asyncio.run(main())
