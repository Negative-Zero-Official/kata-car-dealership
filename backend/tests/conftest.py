from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.db import get_session, make_engine, make_session_factory
from app.factory import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        DATABASE_URL=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        JWT_SECRET="test-secret-at-least-32-characters-long",
    )


@pytest.fixture
def session_factory(settings: Settings) -> Iterator[sessionmaker[Session]]:
    engine = make_engine(settings.DATABASE_URL)
    yield make_session_factory(engine)
    engine.dispose()


@pytest.fixture
def app(settings: Settings, session_factory: sessionmaker[Session]) -> FastAPI:
    app = create_app(settings)

    def override_get_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    return app


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
