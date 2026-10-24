from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.dependencies import get_current_user
from app.models import User
from app.schemas.auth import UserResponse

protected = APIRouter()


@protected.get("/test/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return UserResponse.model_validate(user)


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    app.include_router(protected, prefix="/api")
    return app


def test_protected_route_returns_current_user_for_valid_token(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.get("/api/test/me", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json() == {"id": user.id, "email": "alice@example.com", "role": "user"}


def test_protected_route_rejects_missing_header_with_401(client: TestClient) -> None:
    response = client.get("/api/test/me")

    assert response.status_code == 401


def test_protected_route_rejects_malformed_token_with_401(client: TestClient) -> None:
    response = client.get("/api/test/me", headers={"Authorization": "Bearer garbage"})

    assert response.status_code == 401


def test_protected_route_rejects_token_signed_with_another_secret_with_401(
    client: TestClient, settings: Settings, make_user: Callable[..., User]
) -> None:
    user = make_user()
    forged = jwt.encode(
        {"sub": str(user.id), "role": "admin", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "another-secret-that-is-also-32-chars-long",
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get("/api/test/me", headers={"Authorization": f"Bearer {forged}"})

    assert response.status_code == 401


def test_protected_route_rejects_expired_token_with_401(
    client: TestClient, settings: Settings, make_user: Callable[..., User]
) -> None:
    user = make_user()
    expired = jwt.encode(
        {"sub": str(user.id), "role": "user", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get("/api/test/me", headers={"Authorization": f"Bearer {expired}"})

    assert response.status_code == 401


def test_protected_route_rejects_token_for_deleted_user_with_401(
    client: TestClient,
    session_factory: sessionmaker[Session],
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user()
    headers = auth_headers(user)
    with session_factory() as session:
        session.delete(session.get(User, user.id))
        session.commit()

    response = client.get("/api/test/me", headers=headers)

    assert response.status_code == 401
