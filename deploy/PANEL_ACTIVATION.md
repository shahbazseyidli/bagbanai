# panel.agradex.com split — activation steps (Phase 2)

The code ships DORMANT: middleware is a no-op while `NEXT_PUBLIC_PANEL_HOST` is empty, and the
session cookie stays host-scoped while `COOKIE_DOMAIN` is empty. Everything is served from the apex
exactly as before. To go live once the panel DNS is created:

1. **DNS (user):** Cloudflare → add `A` record `panel` → `95.216.208.82` (proxied, like the apex).

2. **Secrets** (`/opt/bagbanai/.env`):
   ```
   NEXT_PUBLIC_PANEL_HOST=panel.agradex.com
   COOKIE_DOMAIN=.agradex.com
   ```

3. **nginx** — add `panel.agradex.com` to BOTH server blocks' `server_name` in
   `/etc/nginx/sites-enabled/agradex.com` (same proxy/locations; the app's middleware does the
   marketing-vs-app routing). Then `nginx -t && systemctl reload nginx`.

4. **TLS** — extend the Let's Encrypt cert to cover the panel:
   ```
   certbot --nginx -d agradex.com -d www.agradex.com -d panel.agradex.com --expand
   ```
   (Cloudflare must be in DNS-only or the HTTP-01 challenge reachable; or use the DNS-01 plugin.)

5. **Rebuild + restart** (NEXT_PUBLIC_PANEL_HOST is inlined into the edge middleware at BUILD time):
   ```
   cd /opt/bagbanai && set -a && . ./.env && set +a
   docker compose -f deploy/docker-compose.prod.yml build web
   docker compose -f deploy/docker-compose.prod.yml up -d web api
   ```
   Existing sessions must re-login once (cookie domain changed).

After this: `agradex.com` = marketing (landing, pricing, login, signup); `panel.agradex.com` = the app
(dashboard, fields, …). Logged-in users on the apex are bounced to the panel; logged-out users on the
panel are bounced to `agradex.com/login?next=…`.
