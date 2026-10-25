from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import models  # noqa: F401  registers tables on Base.metadata
from app.core.config import Settings, get_settings
from app.db import Base, make_engine, make_session_factory
from app.exception_handlers import register_exception_handlers
from app.routes import auth, health, vehicles


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings.DATABASE_URL)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(title="Car Dealership API", lifespan=lifespan)
    app.state.settings = settings
    app.state.session_factory = make_session_factory(engine)
    register_exception_handlers(app)
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(vehicles.router, prefix="/api")
    return app
