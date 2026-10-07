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

## Production install runbook (Contabo)

Written to be executed end to end by an operator or a Claude Code session on a machine that can
SSH to the host. Host facts live in CLAUDE.md → "Deployment": `admin@169.58.53.17`, passwordless
`sudo`, checkout at `/opt/bagbanai`. The cron runs from **root's** crontab, so every git check
below is done **as root**. Never print secrets. Never reinstall or reset the server.

1. **Inspect, change nothing.** Owner of `/opt/bagbanai`, `git remote -v`, `git status --porcelain`
   (must be empty — if not, STOP and report), whether `deploy/update.sh` is running
   (`pgrep -af update.sh`), and `sudo crontab -l` to learn the host's PATH and log conventions.
2. **Pull.** `git pull --ff-only origin main` in `/opt/bagbanai` as the checkout's owner. Do **not**
   run `deploy/update.sh` — nothing needs deploying for the install itself.
3. **Venv.**
   ```bash
   cd /opt/bagbanai
   python3 -m venv .venv-blog-autogen          # apt-get install -y python3-venv if missing
   .venv-blog-autogen/bin/pip install -r tools/blog_autogen/requirements.txt
   git status --porcelain                       # must still be empty (.gitignore covers .venv-*/)
   ```
4. **Push credential for root.** The script pushes new posts to `main` from the host, which only
   ever pulled before.
   - `sudo ssh-keygen -t ed25519 -N '' -C agradex-blog-deploy -f /root/.ssh/agradex_blog_deploy`
   - Add `/root/.ssh/agradex_blog_deploy.pub` to the repo as a deploy key **with write access** —
     `gh repo deploy-key add <pubfile> -R shahbazseyidli/bagbanai -t agradex-blog-deploy --allow-write`
     if `gh` is logged in on the operator machine; otherwise STOP and hand the public key to the
     owner for https://github.com/shahbazseyidli/bagbanai/settings/keys ("Allow write access").
   - `/root/.ssh/config`: `Host github.com` → `IdentityFile /root/.ssh/agradex_blog_deploy`,
     `IdentitiesOnly yes`.
   - If `origin` is HTTPS, switch it: `git remote set-url origin git@github.com:shahbazseyidli/bagbanai.git`.
   - If the checkout is not root-owned: `sudo git config --global --add safe.directory /opt/bagbanai`.
   - Verify **as root**: `sudo git -C /opt/bagbanai fetch origin` and
     `sudo git -C /opt/bagbanai push --dry-run origin main` both succeed. `update.sh`'s pull must
     keep working.
5. **API key — the owner types it, never pasted into a chat.** Back up first
   (`sudo cp .env /root/agradex.env.bak.$(date +%F)`), then the owner adds to `/opt/bagbanai/.env`
   with `sudo nano` (a **separate, dedicated** Claude API key — not the old Anthropic key noted for
   rotation in CLAUDE.md, not `LLM_API_KEY`, which is DeepSeek's):
   ```
   BLOG_AUTOGEN_ANTHROPIC_API_KEY=sk-ant-...
   BLOG_AUTOGEN_MODEL=claude-sonnet-5   # optional, this is the default
   ```
   Then check `bash -n .env` passes and the variable is non-empty **without printing it**, and make
   one tiny call from the venv (a ~5-token message) to prove the key works.
6. **Cron** — root crontab (`sudo crontab -e`), same PATH convention as the existing lines, clear of
   the nightly satellite/weather crons and the Wednesday digest:
   ```
   0 5 * * 2  cd /opt/bagbanai && bash deploy/blog-autogen.sh >> /var/log/bagban-blog-autogen.log 2>&1
   ```
7. **First supervised live run.** `sudo bash -c 'cd /opt/bagbanai && bash deploy/blog-autogen.sh'`
   and watch it to the end. It publishes the first pending topic and redeploys. Confirm
   https://agradex.com/blog/<slug> and its locale variants (`/en/blog/<slug>` …) load and the
   containers are healthy. If the build failed, confirm the script reverted its own commit.
8. **Record it.** In CLAUDE.md, change the blog autogen line from "KOD HAZIR" to installed, and add
   the cron line to the Deployment → Cron-lar list. Commit and push.

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
