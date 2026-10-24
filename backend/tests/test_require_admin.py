from typing import Annotated

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.dependencies import require_admin
from app.models import User
from app.repositories.user import UserRepository
from app.schemas.auth import UserResponse

admin_only = APIRouter()


@admin_only.get("/test/admin", response_model=UserResponse)
def admin_area(user: Annotated[User, Depends(require_admin)]) -> UserResponse:
    return UserResponse.model_validate(user)


@pytest.fixture
def app(app: FastAPI) -> FastAPI:
    app.include_router(admin_only, prefix="/api")
    return app


def register_and_login(
    client: TestClient,
    session_factory: sessionmaker[Session],
    email: str,
    role: str = "user",
) -> str:
    credentials = {"email": email, "password": "s3cret-password"}
    client.post("/api/auth/register", json=credentials)
    if role != "user":
        with session_factory() as session:
            user = UserRepository(session).get_by_email(email)
            assert user is not None
            user.role = role
            session.commit()
    return client.post("/api/auth/login", json=credentials).json()["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_route_rejects_regular_user_with_403(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    token = register_and_login(client, session_factory, "alice@example.com")

    response = client.get("/api/test/admin", headers=bearer(token))

    assert response.status_code == 403


def test_admin_route_allows_admin(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    token = register_and_login(client, session_factory, "root@example.com", role="admin")

    response = client.get("/api/test/admin", headers=bearer(token))

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
