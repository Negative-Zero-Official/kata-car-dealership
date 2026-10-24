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
from app.repositories.user import UserRepository
from app.schemas.auth import UserResponse

protected = APIRouter()


@protected.get("/test/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return UserResponse.model_validate(user)


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    app.include_router(protected, prefix="/api")
    return app


def register_and_login(client: TestClient) -> tuple[dict, str]:
    credentials = {"email": "alice@example.com", "password": "s3cret-password"}
    user = client.post("/api/auth/register", json=credentials).json()
    token = client.post("/api/auth/login", json=credentials).json()["access_token"]
    return user, token


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_protected_route_returns_current_user_for_valid_token(client: TestClient) -> None:
    user, token = register_and_login(client)

    response = client.get("/api/test/me", headers=bearer(token))

    assert response.status_code == 200
    assert response.json() == {"id": user["id"], "email": "alice@example.com", "role": "user"}


def test_protected_route_rejects_missing_header_with_401(client: TestClient) -> None:
    response = client.get("/api/test/me")

    assert response.status_code == 401


def test_protected_route_rejects_malformed_token_with_401(client: TestClient) -> None:
    response = client.get("/api/test/me", headers=bearer("garbage"))

    assert response.status_code == 401


def test_protected_route_rejects_token_signed_with_another_secret_with_401(
    client: TestClient, settings: Settings
) -> None:
    user, _ = register_and_login(client)
    forged = jwt.encode(
        {"sub": str(user["id"]), "role": "admin", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "another-secret-that-is-also-32-chars-long",
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get("/api/test/me", headers=bearer(forged))

    assert response.status_code == 401


def test_protected_route_rejects_expired_token_with_401(
    client: TestClient, settings: Settings
) -> None:
    user, _ = register_and_login(client)
    expired = jwt.encode(
        {"sub": str(user["id"]), "role": "user", "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    response = client.get("/api/test/me", headers=bearer(expired))

    assert response.status_code == 401


def test_protected_route_rejects_token_for_deleted_user_with_401(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    _, token = register_and_login(client)
    with session_factory() as session:
        user = UserRepository(session).get_by_email("alice@example.com")
        assert user is not None
        session.delete(user)
        session.commit()

    response = client.get("/api/test/me", headers=bearer(token))

    assert response.status_code == 401
