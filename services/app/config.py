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
    llm_provider: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    object_storage_driver: str = "local"
    object_storage_root: str = "./storage"
    tile_server_base: str = "http://localhost:8000/api/tiles"
    # Public path where nginx proxies TiTiler (serves the clipped index COGs).
    titiler_public_base: str = "/titiler"


settings = Settings()
