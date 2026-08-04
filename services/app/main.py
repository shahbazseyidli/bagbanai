"""Agradex API (FastAPI). Multi-tenant, own JWT auth, server-side gating (spec §22)."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import close_pool, init_pool
from .routers import (admin, advice, analytics, auth, backfill, bulk, chat, demo, documents,
                      email_prefs, events, farms, fertilizer, fields, geo, grants, health, indices, internal, knowledge, messaging,
                      nowcast, oauth, orgs, photos, providers, push, reports, scouting,
                      seasons, shares, uploads, weather_history)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


def create_app() -> FastAPI:
    app = FastAPI(title="Agradex API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.next_public_app_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(oauth.router)
    app.include_router(orgs.router)
    app.include_router(farms.router)
    app.include_router(fields.router)
    app.include_router(geo.router)
    app.include_router(indices.router)
    app.include_router(indices.org_router)
    app.include_router(scouting.router)
    # routers/mgmt.py (the field operation log + spray safety) was removed on 2026-08-04 with the
    # "Əməliyyatlar" section. public.field_operations is NOT dropped — the rows are still read by
    # ai/context.py and routers/reports.py. There is NO write path left: POST /api/bulk/operations
    # went the same day, so this table is now read-only history — which is exactly why it was kept.
    app.include_router(uploads.router)
    app.include_router(advice.router)
    app.include_router(knowledge.router)
    app.include_router(internal.router)
    app.include_router(messaging.router)
    app.include_router(admin.router)
    app.include_router(events.router)
    app.include_router(providers.router)
    app.include_router(chat.router)
    app.include_router(fertilizer.router)
    app.include_router(photos.router)
    app.include_router(seasons.router)
    app.include_router(documents.router)
    app.include_router(weather_history.router)
    app.include_router(analytics.router)
    app.include_router(bulk.router)
    app.include_router(backfill.router)
    app.include_router(grants.router)
    app.include_router(reports.router)
    app.include_router(shares.router)
    app.include_router(demo.router)
    app.include_router(nowcast.router)
    app.include_router(email_prefs.router)
    app.include_router(push.router)
    return app


app = create_app()
