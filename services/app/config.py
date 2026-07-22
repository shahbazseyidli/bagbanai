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

    # URLs
    next_public_app_url: str = "http://localhost:3000"
    internal_api_token: str = "change-me"

    # Satellite / weather / AI / storage (used in later steps)
    stac_url: str = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
    open_meteo_base: str = "https://api.open-meteo.com/v1"
    # AI advice + chat (provider-agnostic; default Claude). Key added to .env by the user.
    llm_provider: str = "anthropic"
    llm_model: str = "claude-opus-4-8"
    llm_api_key: str = ""
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
    smtp_from: str = "Bağban AI <no-reply@agradex.com>"

    # Email via Resend (preferred over SMTP) + OTP signup verification (U3). Empty key → the app
    # degrades gracefully: signups auto-verify (never blocked) and emails just log.
    resend_api_key: str = ""
    email_from: str = "Bağban AI <no-reply@agradex.com>"
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
