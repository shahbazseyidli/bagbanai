"""asyncpg pool + per-request connection that sets the RLS session GUC.

The app connects as the table-owning role (bypasses RLS), but we still set
`app.user_id` so public.current_user_id() is populated for policies and
owner-scoped checks (spec §8, adapted — see CLAUDE.md)."""
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg

from .config import settings

_pool: Optional[asyncpg.Pool] = None


async def init_pool() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("db pool not initialized")
    return _pool


@asynccontextmanager
async def connection(user_id: Optional[str] = None):
    """Acquire a connection inside a transaction, with app.user_id set (SET LOCAL)."""
    async with pool().acquire() as conn:
        async with conn.transaction():
            # set_config(..., is_local=true) == SET LOCAL — scoped to this transaction
            await conn.execute("select set_config('app.user_id', $1, true)", user_id or "")
            yield conn
