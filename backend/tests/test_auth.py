import time

import jwt
import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.repositories.user import UserRepository


def test_register_returns_created_user_without_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "s3cret-password"},
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body == {"id": body["id"], "email": "alice@example.com", "role": "user"}
    assert "password" not in body
    assert "hashed_password" not in body

def test_register_stores_password_as_verifiable_hash(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    password = "s3cret-password"
    
    client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password" : password}
    )
    
    with session_factory() as session:
        user = UserRepository(session).get_by_email("alice@example.com")
    
    assert user is not None
    assert user.hashed_password != password
    assert PasswordHash.recommended().verify(password, user.hashed_password)

def test_register_rejects_duplicate_email_with_409(client: TestClient) -> None:
    payload = {"email": "alice@example.com", "password": "s3cret-password"}
    client.post("/api/auth/register", json=payload)

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 409


def test_register_rejects_email_differing_only_in_case_with_409(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "alice@x.com", "password": "s3cret-password"},
    )

    response = client.post(
        "/api/auth/register",
        json={"email": "Alice@X.com", "password": "s3cret-password"},
    )

    assert response.status_code == 409


def test_register_stores_email_lowercase(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "Alice@X.com", "password": "s3cret-password"},
    )

    with session_factory() as session:
        user = UserRepository(session).get_by_email("alice@x.com")

    assert response.json()["email"] == "alice@x.com"
    assert user is not None


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"email": "not-an-email", "password": "s3cret-password"}, id="invalid-email"),
        pytest.param({"email": "alice@example.com", "password": "short12"}, id="password-under-8-chars"),
        pytest.param({"password": "s3cret-password"}, id="missing-email"),
        pytest.param({"email": "alice@example.com"}, id="missing-password"),
        pytest.param({}, id="empty-body"),
    ],
)
def test_register_rejects_invalid_payload_with_422(client: TestClient, payload: dict[str, str]) -> None:
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422


def test_register_ignores_role_in_payload_and_creates_user_role(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "mallory@example.com", "password": "s3cret-password", "role": "admin"},
    )

    with session_factory() as session:
        user = UserRepository(session).get_by_email("mallory@example.com")

    assert response.status_code == 201
    assert response.json()["role"] == "user"
    assert user is not None
    assert user.role == "user"


def test_login_returns_bearer_token_with_user_claims(
    client: TestClient, settings: Settings
) -> None:
    registered = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "s3cret-password"},
    ).json()

    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "s3cret-password"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": registered["id"], "email": "alice@example.com", "role": "user"}

    claims = jwt.decode(body["access_token"], settings.JWT_SECRET, algorithms=["HS256"])
    assert claims["sub"] == str(registered["id"])
    assert claims["role"] == "user"
    expected_exp = time.time() + settings.JWT_EXPIRE_MINUTES * 60
    assert abs(claims["exp"] - expected_exp) < 60
