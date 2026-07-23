"""Bağban AI API (FastAPI). Multi-tenant, own JWT auth, server-side gating (spec §22)."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import close_pool, init_pool
from .routers import (admin, advice, auth, events, farms, fields, geo, health, indices,
                      internal, knowledge, messaging, mgmt, orgs, scouting, subsidy, uploads)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


def create_app() -> FastAPI:
    app = FastAPI(title="Bağban AI API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.next_public_app_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(orgs.router)
    app.include_router(farms.router)
    app.include_router(fields.router)
    app.include_router(geo.router)
    app.include_router(indices.router)
    app.include_router(subsidy.router)
    app.include_router(scouting.router)
    app.include_router(mgmt.router)
    app.include_router(uploads.router)
    app.include_router(advice.router)
    app.include_router(knowledge.router)
    app.include_router(internal.router)
    app.include_router(messaging.router)
    app.include_router(admin.router)
    app.include_router(events.router)
    return app


app = create_app()
