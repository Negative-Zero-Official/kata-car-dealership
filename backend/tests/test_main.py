import importlib
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI

from app.core.config import get_settings


@pytest.fixture
def fresh_settings() -> Iterator[None]:
    # get_settings is cached; clear it so this test reads its own env and leaks nothing.
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.usefixtures("fresh_settings")
def test_main_builds_the_app_from_environment_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{(tmp_path / 'env.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("JWT_SECRET", "env-secret-at-least-32-characters-long")
    monkeypatch.delitem(sys.modules, "app.main", raising=False)

    main = importlib.import_module("app.main")

    assert isinstance(main.app, FastAPI)
    assert database_url == main.app.state.settings.DATABASE_URL
