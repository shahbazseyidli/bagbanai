"""Application settings (pydantic-settings). Values from environment / .env (spec §26, adapted)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database (self-hosted Postgres + PostGIS)
    database_url: str = "postgresql://bagban:change-me@localhost:5432/bagban"

    # Auth (own JWT)
    jwt_secret: str = "change-me"
    jwt_expires_hours: int = 168
    cookie_name: str = "bagban_session"
    # Empty in dev; set to ".agradex.com" in prod so the session cookie is shared between the
    # marketing apex and panel.agradex.com (Phase 2 panel split).
    cookie_domain: str = ""

    # URLs
    next_public_app_url: str = "http://localhost:3000"
    # The app host (app.agradex.com) from the Phase-2 panel split — used to build public links in
    # emails (next_public_app_url is the internal container URL in prod, unusable for email).
    next_public_panel_host: str = ""
    internal_api_token: str = "change-me"
    # Google sign-in (0062). Empty → the routes 404 and the button never renders; the operator
    # adds these to .env and restarts, no rebuild. The redirect URI registered with Google is
    # derived from next_public_panel_host — see routers/oauth.py::_redirect_uri.
    google_client_id: str = ""
    google_client_secret: str = ""

    # Satellite / weather / AI / storage (used in later steps)
    stac_url: str = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
    open_meteo_base: str = "https://api.open-meteo.com/v1"
    # AI advice + chat. Provider-agnostic seam; the default names the provider the product actually
    # uses, and .env supplies the key.
    #
    # THE DEFAULT MUST MATCH THE PRIVACY PAGE, which is why it moved. That page is static text baked
    # into the web image and it now names DeepSeek (text, servers in China) and Google Gemini
    # (images) as the subprocessors. Leaving the code default on anthropic meant any window where
    # the image had shipped but .env had not been edited — including the documented case where a
    # malformed .env aborts update.sh without replacing containers — would send farmer data to a
    # processor the published notice no longer names. A disabled AI is a smaller failure than a
    # truthful-looking notice that is false: with no DEEPSEEK/LLM key, is_configured() returns False
    # and advice/chat/research degrade the way they already do when the key is absent.
    llm_provider: str = "deepseek"
    llm_model: str = "deepseek-v4-flash"
    llm_api_key: str = ""
    # Per-provider keys. llm_api_key serves ONLY the provider named by llm_provider; these two exist
    # so the vision provider (a different vendor entirely) can be keyed at the same time as the text
    # provider, without either key ever standing in for the other — see ai/llm.py::_key_for.
    deepseek_api_key: str = ""
    gemini_api_key: str = ""
    # Vision is a SEPARATE provider choice, because DeepSeek accepts no images on any endpoint: its
    # native API rejects image blocks outright, and its Anthropic-compatible endpoint returns HTTP
    # 200 with the literal string "[Unsupported Image]" substituted for the picture. Pointing the
    # text provider at photos would therefore deploy green and diagnose nothing. Default is gemini
    # for the same reason the text default moved: it is what the privacy page says.
    # vision_model empty = that provider's default (see ai/llm.py::_vision_model).
    vision_provider: str = "gemini"
    vision_model: str = ""
    # DeepSeek reasoning. OFF by default and force-disabled on every structured call: a forced
    # function call with thinking enabled is an HTTP 400 from this API, measured.
    deepseek_thinking: bool = False
    # EPPO Data Services token; added to .env by the operator; empty → pest data degrades.
    eppo_token: str = ""
    # Knowledge layer (M3): web-search provider for zone research. 'anthropic' folds search into
    # the LLM call (web_search tool); a dedicated vendor (tavily/exa) can be wired behind it later.
    search_provider: str = "anthropic"
    # Reverse-geocoder for rayon (zone_id) resolution; free OSM Nominatim by default.
    nominatim_base: str = "https://nominatim.openstreetmap.org"

    # Email notifications (optional; web/in-app work without these). SMTP or an API relay.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Agradex <no-reply@agradex.com>"

    # Email via Resend (preferred over SMTP) + OTP signup verification (U3). Empty key → the app
    # degrades gracefully: signups auto-verify (never blocked) and emails just log.
    resend_api_key: str = ""
    email_from: str = "Agradex <no-reply@agradex.com>"
    otp_ttl_min: int = 15

    # Telegram one-way alert bot (U4 / T22). Empty token → the channel stays dormant; in-app
    # notifications are unaffected.
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    object_storage_driver: str = "local"
    object_storage_root: str = "./storage"
    tile_server_base: str = "http://localhost:8000/api/tiles"
    # Public path where nginx proxies TiTiler (serves the clipped index COGs).
    titiler_public_base: str = "/titiler"


settings = Settings()
