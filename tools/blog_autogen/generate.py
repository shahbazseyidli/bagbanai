#!/usr/bin/env python3
"""Standalone Claude-powered blog post generator for the Agradex marketing blog.

Runs on the deploy host, independent of the api/web/geo containers (own venv, own Anthropic key —
see README.md). One run = one topic from topics.json, all its target locales, all-or-nothing:

  1. pick the first status:"pending" topic
  2. call the Claude API once per target locale for a market-adapted (not translated) article,
     using a forced tool call so the model returns structured fields, never raw TypeScript
  3. this script alone turns that JSON into `posts/<slug>.<locale>.ts` — json.dumps() is a safe
     TS/JS literal serializer (valid quoting, no injection risk), so the model's prose never has to
     be trusted to write syntactically valid TS
  4. register the new slug in blog/index.ts via three anchored, additive text insertions (imports /
     BLOG_SLUGS / POSTS) — every topic here MUST be a brand-new slug so the patch is always a pure
     append, never an edit of existing structure. That is what makes unattended edits to this file
     safe: see CLAUDE.md's "İş prinsipləri" note about scripted edits mangling exactly this class of
     file (JSX blocks, i18n registries) when they try to be clever instead of purely additive.

Prints machine-readable lines for deploy/blog-autogen.sh to parse:
  FILE <path relative to repo root>      (one per changed/created file)
  TOPIC_SLUG=<slug>                      (for the commit message)
Exits 0 with nothing printed when there is no pending topic, or when a topic fails validation after
retry (topics.json is still updated to record the failure so the queue does not spin on it forever;
the failure detail goes to stderr for the cron log).
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

MODEL = os.environ.get("BLOG_AUTOGEN_MODEL", "claude-sonnet-5")
MAX_TOKENS = 4096
RETRIES = 1  # one retry on a bad/unparseable response, per locale

MARKET_NOTES = {
    "az": "Azərbaycan fermeri üçün yaz: buğda, pambıq, fındıq (Xudat/Qax/Zaqatala), üzüm kimi yerli məhsullar; hektar. Ton dürüst, təvazökar, peşəkar — həddindən artıq satış dili yox.",
    "en": "Write for an international audience (mainly US/Europe row-crop and orchard growers reading in English). Use hectares as the primary unit but you may mention acres in passing. Direct, plain, no hype.",
    "tr": "Türkiye çiftçisi üçün yaz: dönüm/dekar (hektar deyil, əsas vahid kimi dönümü işlət), fındık (Karadeniz), buğday. Səmimi amma peşəkar ton.",
    "ru": "Пиши для русскоязычной аудитории Закавказья и Центральной Азии — упоминай Казахстан (пшеница) и/или Узбекистан (хлопок) там, где это уместно, а не только Россию. Гектар как единица. Тон — по делу, без воды.",
    "de": "Schreibe für deutschsprachige Landwirte (DE/AT/CH). Verwende Hektar, deutsche Fachbegriffe (z. B. Beregnung statt 'Bewässerung' wo passend). Sachlich, kein Marketing-Ton.",
    "es": "Escribe para agricultores hispanohablantes (España y Latinoamérica neutral, registro 'usted'). Usa hectáreas. Tono directo y profesional, sin exageraciones de marketing.",
}

SYSTEM_PROMPT = """You are writing one article for the Agradex blog (agradex.com) — a satellite \
(Sentinel-2) + AI crop-monitoring product for farmers. House style, non-negotiable:

- Answer-first: the `lead` field gives the direct answer to the implied question before any wind-up.
- Honest, specific, first-party where possible (Agradex's own product does satellite index tracking,
  AI agronomy advice, weather, and a photo-based diagnosis tool — mention these only where genuinely
  relevant to the topic, never force a pitch into every section).
- No markdown syntax in any field (no **bold**, no #headings, no markdown tables) — plain prose only.
  Use the `table` field for actual tables, `bullets` for actual lists.
- No invented statistics, no invented named studies, no invented customer quotes. If you don't have
  a real number, describe the mechanism instead of making one up.
- This locale's article is a genuine adaptation for its market (different crops/examples/units where
  natural), not a translation of some other language's article — you are only given this one locale.
- 4-7 sections. At least one section should go beyond generic advice into something concrete and
  specific (a worked example, a real mechanism, a table).
- `related`: pick 0-3 slugs ONLY from the provided whitelist that a reader of this article would
  plausibly want next. Never invent a slug that isn't in the whitelist.

Call the emit_blog_post tool exactly once with the finished article. Do not write any other text."""

POST_TOOL = {
    "name": "emit_blog_post",
    "description": "Return the finished blog post as structured fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "H1 and <title>. Keyword-bearing, ideally under 60 characters.",
            },
            "description": {
                "type": "string",
                "description": "Meta description, 140-160 characters.",
            },
            "lead": {
                "type": "string",
                "description": "Answer-first opening paragraph: the direct answer, before any wind-up.",
            },
            "minutes": {"type": "integer", "description": "Estimated reading time, 3-8."},
            "sections": {
                "type": "array",
                "minItems": 3,
                "maxItems": 8,
                "items": {
                    "type": "object",
                    "properties": {
                        "heading": {"type": "string", "description": "h2. Omit only for a direct continuation of the previous section."},
                        "paragraphs": {"type": "array", "items": {"type": "string"}},
                        "bullets": {"type": "array", "items": {"type": "string"}},
                        "table": {
                            "type": "object",
                            "properties": {
                                "headers": {"type": "array", "items": {"type": "string"}},
                                "rows": {
                                    "type": "array",
                                    "items": {"type": "array", "items": {"type": "string"}},
                                },
                            },
                        },
                    },
                },
            },
            "related": {
                "type": "array",
                "items": {"type": "string"},
                "description": "0-3 slugs from the whitelist given in the prompt.",
            },
        },
        "required": ["title", "description", "lead", "minutes", "sections", "related"],
    },
}


def slug_to_camel(slug: str, locale: str) -> str:
    parts = re.split(r"[-_]", slug)
    camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
    return camel + locale.capitalize()


def load_topics(path: Path) -> dict:
    return json.loads(path.read_text())


def save_topics(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def existing_slugs(index_ts: str) -> list[str]:
    m = re.search(r"export const BLOG_SLUGS = \[(.*?)\] as const;", index_ts, re.DOTALL)
    if not m:
        raise RuntimeError("could not find BLOG_SLUGS array in blog/index.ts")
    return re.findall(r'"([^"]+)"', m.group(1))


def call_claude(client, topic: dict, locale: str, whitelist: list[str]) -> dict:
    user_prompt = (
        f"Locale: {locale}\n"
        f"Market notes: {MARKET_NOTES.get(locale, '')}\n"
        f"Target keyword: {topic['keyword'].get(locale, topic['keyword'].get('en', ''))}\n"
        f"Topic brief: {topic['brief']}\n"
        f"Related-slug whitelist (pick 0-3, or none): {', '.join(whitelist)}\n"
    )
    last_err: Exception | None = None
    for attempt in range(RETRIES + 1):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=[POST_TOOL],
                tool_choice={"type": "tool", "name": "emit_blog_post"},
                messages=[{"role": "user", "content": user_prompt}],
            )
            block = next(b for b in resp.content if b.type == "tool_use")
            fields = block.input
            validate_fields(fields, whitelist)
            return fields
        except Exception as e:  # noqa: BLE001 — one retry regardless of failure kind, then surface it
            last_err = e
            continue
    raise RuntimeError(f"locale {locale}: {last_err}") from last_err


def validate_fields(fields: dict, whitelist: list[str]) -> None:
    if not fields.get("title") or not fields.get("lead"):
        raise ValueError("missing title/lead")
    desc = fields.get("description", "")
    if not (60 <= len(desc) <= 220):
        raise ValueError(f"description length {len(desc)} out of range")
    sections = fields.get("sections") or []
    if len(sections) < 3:
        raise ValueError("fewer than 3 sections")
    for s in sections:
        if not s.get("paragraphs") and not s.get("bullets") and not s.get("table"):
            raise ValueError("a section has no paragraphs, bullets, or table")
    fields["related"] = [r for r in (fields.get("related") or []) if r in whitelist][:3]
    fields["minutes"] = max(3, min(8, int(fields.get("minutes") or 4)))


def clean_sections(sections: list[dict]) -> list[dict]:
    out = []
    for s in sections:
        entry = {}
        if s.get("heading"):
            entry["heading"] = s["heading"]
        if s.get("paragraphs"):
            entry["paragraphs"] = [p for p in s["paragraphs"] if p]
        if s.get("bullets"):
            entry["bullets"] = [b for b in s["bullets"] if b]
        table = s.get("table")
        if table and table.get("headers") and table.get("rows"):
            entry["table"] = {"headers": table["headers"], "rows": table["rows"]}
        if entry.get("paragraphs") or entry.get("bullets") or entry.get("table"):
            out.append(entry)
    return out


def serialize_post_ts(slug: str, locale: str, today: str, fields: dict) -> str:
    obj = {
        "slug": slug,
        "locale": locale,
        "title": fields["title"],
        "description": fields["description"],
        "lead": fields["lead"],
        "minutes": fields["minutes"],
        "datePublished": today,
        "dateModified": today,
        "sections": clean_sections(fields["sections"]),
        "related": fields["related"],
    }
    body = json.dumps(obj, ensure_ascii=False, indent=2)
    return f'import type {{ BlogPost }} from "../types";\n\nexport const post: BlogPost = {body};\n'


def patch_index_ts(index_path: Path, slug: str, locale_vars: dict[str, str]) -> None:
    text = index_path.read_text()

    import_lines = "".join(
        f'import {{ post as {var} }} from "./posts/{slug}.{loc}";\n' for loc, var in locale_vars.items()
    )
    import_matches = list(re.finditer(r'import \{ post as \w+ \} from "\./posts/[^"]+";\n', text))
    if not import_matches:
        raise RuntimeError("no existing post imports found to anchor on")
    insert_at = import_matches[-1].end()
    text = text[:insert_at] + import_lines + text[insert_at:]

    m = re.search(r"(export const BLOG_SLUGS = \[)(.*?)(\] as const;)", text, re.DOTALL)
    if not m:
        raise RuntimeError("BLOG_SLUGS anchor not found")
    text = text[: m.end(2)] + f'  "{slug}",\n' + text[m.end(2):]

    m = re.search(
        r"(const POSTS: Record<string, Partial<Record<BlogLocale, BlogPost>>> = \{)(.*?)(\n\};\n)",
        text,
        re.DOTALL,
    )
    if not m:
        raise RuntimeError("POSTS object anchor not found")
    # group(2) ends right after the last entry's trailing comma (no newline — the single "\n"
    # before the closing brace belongs to group(3)'s required "\n};\n"), so the new entry must
    # supply its own leading newline and must NOT add a trailing one.
    if len(locale_vars) == 1:
        (loc, var), = locale_vars.items()
        entry = f'\n  "{slug}": {{ {loc}: {var} }},'
    else:
        pairs = ", ".join(f"{loc}: {var}" for loc, var in locale_vars.items())
        entry = f'\n  "{slug}": {{\n    {pairs},\n  }},'
    text = text[: m.end(2)] + entry + text[m.end(2):]

    index_path.write_text(text)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    topics_path = Path(__file__).resolve().parent / "topics.json"
    posts_dir = repo_root / "app/src/components/blog/posts"
    index_path = repo_root / "app/src/components/blog/index.ts"

    api_key = os.environ.get("BLOG_AUTOGEN_ANTHROPIC_API_KEY")
    if not api_key:
        print("BLOG_AUTOGEN_ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 1

    data = load_topics(topics_path)
    topic = next((t for t in data["topics"] if t.get("status") == "pending"), None)
    if topic is None:
        print("no pending topics", file=sys.stderr)
        return 0

    whitelist = existing_slugs(index_path.read_text())
    if topic["slug"] in whitelist:
        topic["status"] = "failed"
        topic["error"] = f"slug '{topic['slug']}' already published"
        save_topics(topics_path, data)
        print(topic["error"], file=sys.stderr)
        return 1

    from anthropic import Anthropic

    client = Anthropic(api_key=api_key)

    results: dict[str, dict] = {}
    try:
        for locale in topic["locales"]:
            results[locale] = call_claude(client, topic, locale, whitelist)
    except Exception as e:  # noqa: BLE001
        topic["status"] = "failed"
        topic["error"] = str(e)
        topic["failedAt"] = datetime.now(timezone.utc).isoformat()
        save_topics(topics_path, data)
        print(f"topic '{topic['slug']}' failed: {e}", file=sys.stderr)
        return 1

    today = date.today().isoformat()
    slug = topic["slug"]
    locale_vars = {loc: slug_to_camel(slug, loc) for loc in topic["locales"]}
    changed_files: list[str] = []

    for locale, fields in results.items():
        ts_source = serialize_post_ts(slug, locale, today, fields)
        post_path = posts_dir / f"{slug}.{locale}.ts"
        post_path.write_text(ts_source)
        changed_files.append(str(post_path.relative_to(repo_root)))

    patch_index_ts(index_path, slug, locale_vars)
    changed_files.append(str(index_path.relative_to(repo_root)))

    topic["status"] = "published"
    topic["publishedAt"] = datetime.now(timezone.utc).isoformat()
    save_topics(topics_path, data)
    changed_files.append(str(topics_path.relative_to(repo_root)))

    for f in changed_files:
        print(f"FILE {f}")
    print(f"TOPIC_SLUG={slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
