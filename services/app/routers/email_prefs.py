"""Public, no-login email unsubscribe. Every lifecycle email footer links here with an opaque token
that maps to a user; hitting it turns off their lifecycle/marketing email (transactional email —
OTP, welcome, alerts — is unaffected). GET returns a small localized confirmation page so the link
works straight from an email client; POST is the programmatic form."""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse

from ..db import connection

router = APIRouter(prefix="/api/emails", tags=["emails"])

# Localized confirmation copy (title, done, note). Missing locale → az.
_MSG = {
    "az": ("Abunəlikdən çıxdınız", "Bundan sonra bu cür məktublar göndərilməyəcək.",
           "Vacib hesab məktubları (təsdiq kodu, xəbərdarlıqlar) yenə də gələcək."),
    "en": ("You've unsubscribed", "You will no longer receive emails like this.",
           "Important account emails (verification, alerts) will still be sent."),
    "tr": ("Abonelikten çıktınız", "Bundan sonra bu tür e-postalar gönderilmeyecek.",
           "Önemli hesap e-postaları (doğrulama, uyarılar) yine de gönderilir."),
    "de": ("Abmeldung erfolgt", "Sie erhalten keine solchen E-Mails mehr.",
           "Wichtige Konto-E-Mails (Bestätigung, Warnungen) werden weiterhin gesendet."),
    "hu": ("Leiratkozott", "Többé nem küldünk ilyen e-maileket.",
           "A fontos fiók-e-mailek (megerősítés, riasztások) továbbra is megérkeznek."),
    "it": ("Iscrizione annullata", "Non riceverai più email come questa.",
           "Le email importanti dell'account (verifica, avvisi) continueranno ad arrivare."),
    "pl": ("Zrezygnowano z subskrypcji", "Nie będziesz już otrzymywać takich wiadomości.",
           "Ważne e-maile konta (weryfikacja, alerty) nadal będą wysyłane."),
}


async def _apply(token: str):
    """Returns (ok, locale). Toggles email_lifecycle off for the token's user."""
    if not token:
        return False, "az"
    async with connection() as conn:
        row = await conn.fetchrow(
            """select u.id, u.locale from public.email_unsub_tokens t
               join public.users u on u.id = t.user_id where t.token=$1""", token)
        if not row:
            return False, "az"
        await conn.execute("update public.users set email_lifecycle=false where id=$1::uuid", row["id"])
    return True, (row["locale"] or "az")


def _page(ok: bool, locale: str) -> str:
    title, done, note = _MSG.get((locale or "")[:2].lower(), _MSG["az"])
    if not ok:
        title, done, note = ("Link etibarsızdır", "Bu keçid işləmir və ya vaxtı keçib.", "")
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{title} — Agradex</title></head>"
        "<body style='margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
        "background:#EEF2EC;color:#10231A'>"
        "<div style='max-width:460px;margin:12vh auto;background:#fff;border:1px solid #E2E9E1;"
        "border-radius:16px;overflow:hidden'>"
        "<div style='background:#15803D;padding:16px 22px;color:#fff;font-weight:800;font-size:18px'>🌱 Agradex</div>"
        f"<div style='padding:24px 22px'><h1 style='margin:0 0 10px;font-size:20px'>{title}</h1>"
        f"<p style='margin:0 0 8px;color:#5B6B60;font-size:15px;line-height:1.5'>{done}</p>"
        f"<p style='margin:0;color:#8A978D;font-size:13px;line-height:1.5'>{note}</p></div></div></body></html>"
    )


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe_get(token: str = ""):
    ok, locale = await _apply(token)
    return HTMLResponse(_page(ok, locale), status_code=200 if ok else 400)


@router.post("/unsubscribe")
async def unsubscribe_post(token: str = ""):
    ok, _ = await _apply(token)
    return JSONResponse({"ok": ok}, status_code=200 if ok else 400)
