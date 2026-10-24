from collections.abc import Callable
from typing import Annotated

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from app.dependencies import require_admin
from app.models import User
from app.schemas.auth import UserResponse

admin_only = APIRouter()


@admin_only.get("/test/admin", response_model=UserResponse)
def admin_area(user: Annotated[User, Depends(require_admin)]) -> UserResponse:
    return UserResponse.model_validate(user)


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    app.include_router(admin_only, prefix="/api")
    return app


def test_admin_route_rejects_regular_user_with_403(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get("/api/test/admin", headers=auth_headers(user))

    assert response.status_code == 403


def test_admin_route_allows_admin(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.get("/api/test/admin", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
