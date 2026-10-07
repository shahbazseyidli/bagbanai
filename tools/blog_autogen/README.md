# Blog auto-generator (Claude API, unattended)

Writes one new `/blog` article (all its target locales) per run, straight to production, with no
human review step. `generate.py`'s module docstring has the mechanics; this file is the operator
setup guide.

**This is a deliberate, scoped exception** to `docs/SEO_PLAN.md` §4-S2's "no auto-spray to 8
locales" rule (owner's explicit decision, 2026-09-24 — see the note added to that section). The
scope stays narrow on purpose so the exception stays safe:

- brand-new slugs only — an already-published post is never touched by this tool
- 1-4 curated locales per topic (never the full marketing locale set), chosen per-topic in
  `topics.json`, not auto-sprayed to every locale by default
- one topic per run, topics drawn from the already-approved editorial calendar
- all-or-nothing per topic: if any target locale fails validation twice, nothing is published and
  the topic is marked `"failed"` for manual attention — never a half-translated slug

## One-time setup on the deploy host (Contabo)

```bash
cd /opt/bagbanai
python3 -m venv .venv-blog-autogen
.venv-blog-autogen/bin/pip install -r tools/blog_autogen/requirements.txt
```

Add to `/opt/bagbanai/.env` (a **separate, dedicated** Claude API key — do not reuse the old
Anthropic key noted for rotation in CLAUDE.md, and do not reuse `LLM_API_KEY`, which is DeepSeek's):

```
BLOG_AUTOGEN_ANTHROPIC_API_KEY=sk-ant-...
BLOG_AUTOGEN_MODEL=claude-sonnet-5   # optional, this is the default
```

Add to root crontab (`crontab -e`), clear of the nightly satellite/weather crons and the Wednesday
digest:

```
0 5 * * 2  cd /opt/bagbanai && bash deploy/blog-autogen.sh >> /var/log/bagban-blog-autogen.log 2>&1
```

## Running it by hand

```bash
cd /opt/bagbanai
set -a; . ./.env; set +a
.venv-blog-autogen/bin/python tools/blog_autogen/generate.py
```

This only writes files under `app/src/components/blog/` and updates `tools/blog_autogen/
topics.json` — it never touches git or docker itself. `deploy/blog-autogen.sh` is the layer that
commits, pushes to `main`, and redeploys (`bash deploy/update.sh`); it reverts the commit
automatically if the deploy build fails, so a bad generation never sits live or blocks the next
real deploy.

## Growing the queue

Add entries to `topics.json` any time, in the same shape as the existing ones. `related_hint` is
advisory only — the model still has to pick from the real, current slug whitelist read out of
`blog/index.ts` at generation time, so a hint that later becomes stale is harmless.

## What this does NOT do

- Does not add locales to an already-published slug (the `index.ts` patch is purely additive by
  design — see `generate.py`'s docstring for why).
- Does not run a typecheck itself before pushing; it trusts `deploy/update.sh`'s own `docker build`
  as the safety net and reverts on failure. A local `tsc` check was used to validate the serializer
  during development (see git history / ask the session that built this) but isn't wired into the
  cron path, since the host has no local `node_modules`.
- Does not touch `docs/SEO_PLAN.md`'s content calendar automatically — `topics.json` is a separate,
  hand-edited file the owner curates.
