from fastapi import FastAPI

from app.routes import health


def create_app() -> FastAPI:
    app = FastAPI(title="Car Dealership API")
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()
