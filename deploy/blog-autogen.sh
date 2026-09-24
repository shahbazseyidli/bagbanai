#!/usr/bin/env bash
# Standalone weekly blog-post generator — Claude API writes one new article (all its target
# locales) per run, commits it straight to main and redeploys. No human review gate: this is a
# deliberate, scoped exception to SEO_PLAN.md §4-S2's "no auto-spray to 8 locales" rule (owner's
# decision, 2026-09-24). The scope stays narrow specifically to keep that exception safe: new
# slugs only (tools/blog_autogen/generate.py never edits an existing published post), 1-4 curated
# locales per topic (never the full marketing locale set), one topic per run — see
# tools/blog_autogen/README.md.
#
# Cron (suggested — weekly, Tuesday 05:00 UTC = 09:00 Baku, clear of the nightly satellite/weather
# crons and the Wednesday digest):
#   0 5 * * 2  cd /opt/bagbanai && bash deploy/blog-autogen.sh >> /var/log/bagban-blog-autogen.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

ts() { date -u +%FT%TZ; }

if [ -z "${BLOG_AUTOGEN_ANTHROPIC_API_KEY:-}" ]; then
  echo "[$(ts)] BLOG_AUTOGEN_ANTHROPIC_API_KEY not set, skipping"
  exit 0
fi

# Paralel sessiyalar eyni checkout-u paylaşır (CLAUDE.md) — never touch someone else's in-flight
# work; if the tree is dirty, sit this run out rather than risk sweeping it into our commit.
if [ -n "$(git status --porcelain)" ]; then
  echo "[$(ts)] working tree not clean, skipping this run"
  exit 0
fi
git pull --ff-only origin main

PY="${ROOT}/.venv-blog-autogen/bin/python"
[ -x "$PY" ] || PY=python3

set +e
OUT="$("$PY" tools/blog_autogen/generate.py 2>&1)"
STATUS=$?
set -e

echo "$OUT"
if [ "$STATUS" -ne 0 ]; then
  echo "[$(ts)] generate.py exited $STATUS"
  # topics.json bookkeeping (failure reason) may have changed even on failure — commit that alone.
  if ! git diff --quiet -- tools/blog_autogen/topics.json; then
    git add tools/blog_autogen/topics.json
    git commit -m "chore(blog): record autogen queue failure"
    git push origin main
  fi
  exit 0
fi

FILES="$(echo "$OUT" | grep -E '^FILE ' | cut -d' ' -f2- | tr '\n' ' ')"
TOPIC="$(echo "$OUT" | grep -E '^TOPIC_SLUG=' | cut -d= -f2-)"

if [ -z "$FILES" ]; then
  echo "[$(ts)] nothing to publish this run"
  exit 0
fi

# shellcheck disable=SC2086
git add $FILES
git commit -m "content(blog): auto-generate '${TOPIC}' (Claude, unattended)"
git push origin main

if bash deploy/update.sh; then
  echo "[$(ts)] published '${TOPIC}' and deployed @ $(git rev-parse --short HEAD)"
else
  echo "[$(ts)] deploy failed after publishing '${TOPIC}' — reverting the commit"
  git revert --no-edit HEAD
  git push origin main
  exit 1
fi
