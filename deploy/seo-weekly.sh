#!/usr/bin/env bash
# Weekly organic-search snapshot from nginx logs (SEO_PLAN.md §4-S4). Appends one dated block to
# /var/log/agradex-seo-weekly.log: page hits referred by search engines in the last 7 days, per
# engine, plus top landing paths. Ground-truth organic-click counter with no GSC login and no
# on-site analytics — the privacy policy's "no trackers" promise stays true.
# Cron: weekly, Monday early morning (root crontab). Python does the date math: the first version
# shelled out to `date` once per log line and took minutes on a 2 MB log.
set -euo pipefail
OUT="/var/log/agradex-seo-weekly.log"

{ cat /var/log/nginx/access.log /var/log/nginx/access.log.1 2>/dev/null
  zcat /var/log/nginx/access.log.*.gz 2>/dev/null || true
} | python3 -c '
import sys, re, datetime, collections
MON = {m: i+1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
line_re = re.compile(r"\[(\d{2})/(\w{3})/(\d{4}):(\d{2}):(\d{2}):(\d{2}) [^\]]+\] \"\w+ (\S+)[^\"]*\" \d+ \d+ \"([^\"]*)\"")
eng_re = re.compile(r"https?://([a-z0-9.]*(?:google|bing|yandex|duckduckgo|brave)[a-z0-9.]*)", re.I)
# accounts.google.com is the SSO flow, not a search result; wp-admin probes are bots.
noise_ref = re.compile(r"accounts\.google\.", re.I)
noise_path = re.compile(r"wp-admin|wp-login|xmlrpc")
skip_path = re.compile(r"^/(api|_next|titiler)/|\.(png|svg|ico|css|js|webmanifest|txt|xml)$")
hits, engines, paths = 0, collections.Counter(), collections.Counter()
for line in sys.stdin:
    m = line_re.search(line)
    if not m: continue
    d, mon, y, hh, mm, ss, path, ref = m.groups()
    e = eng_re.search(ref)
    if not e or skip_path.search(path): continue
    if noise_ref.search(ref) or noise_path.search(path): continue
    try:
        ts = datetime.datetime(int(y), MON.get(mon, 1), int(d), int(hh), int(mm), int(ss), tzinfo=datetime.timezone.utc)
    except ValueError:
        continue
    if ts < cutoff: continue
    hits += 1; engines[e.group(1).lower()] += 1; paths[path.split("?")[0]] += 1
print(f"=== week ending {datetime.date.today()} ===")
print(f"organic hits: {hits}")
if hits:
    print("-- by engine --")
    for k, v in engines.most_common(): print(f"{v:6d} {k}")
    print("-- top landing paths --")
    for k, v in paths.most_common(10): print(f"{v:6d} {k}")
print()
' >> "$OUT"
echo "appended to $OUT"
