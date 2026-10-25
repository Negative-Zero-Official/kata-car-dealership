import time
from collections.abc import Callable

import jwt
import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.security import PasswordHasher
from app.models import User
from app.repositories.user import UserRepository
from tests.factories import PASSWORD


def test_register_returns_created_user_without_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": PASSWORD},
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body == {"id": body["id"], "email": "alice@example.com", "role": "user"}
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_stores_password_as_verifiable_hash(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    client.post("/api/auth/register", json={"email": "alice@example.com", "password": PASSWORD})

    with session_factory() as session:
        user = UserRepository(session).get_by_email("alice@example.com")

    assert user is not None
    assert user.hashed_password != PASSWORD
    assert PasswordHash.recommended().verify(PASSWORD, user.hashed_password)


def test_register_rejects_duplicate_email_with_409(
    client: TestClient, make_user: Callable[..., User]
) -> None:
    make_user(email="alice@example.com")

    response = client.post(
        "/api/auth/register", json={"email": "alice@example.com", "password": PASSWORD}
    )

    assert response.status_code == 409


def test_register_racing_a_duplicate_past_the_existence_check_returns_409(
    client: TestClient, make_user: Callable[..., User], monkeypatch: pytest.MonkeyPatch
) -> None:
    # Two simultaneous sign-ups both see "no such email"; the second insert must still be a 409.
    make_user(email="alice@example.com")
    monkeypatch.setattr(UserRepository, "get_by_email", lambda self, email: None)

    response = client.post(
        "/api/auth/register", json={"email": "alice@example.com", "password": PASSWORD}
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Email already registered"}


def test_register_rejects_email_differing_only_in_case_with_409(
    client: TestClient, make_user: Callable[..., User]
) -> None:
    make_user(email="alice@x.com")

    response = client.post(
        "/api/auth/register", json={"email": "Alice@X.com", "password": PASSWORD}
    )

    assert response.status_code == 409


def test_register_stores_email_lowercase(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "Alice@X.com", "password": PASSWORD},
    )

    with session_factory() as session:
        user = UserRepository(session).get_by_email("alice@x.com")

    assert response.json()["email"] == "alice@x.com"
    assert user is not None


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"email": "not-an-email", "password": PASSWORD}, id="invalid-email"),
        pytest.param(
            {"email": "alice@example.com", "password": "short12"}, id="password-under-8-chars"
        ),
        pytest.param({"password": PASSWORD}, id="missing-email"),
        pytest.param({"email": "alice@example.com"}, id="missing-password"),
        pytest.param({}, id="empty-body"),
    ],
)
def test_register_rejects_invalid_payload_with_422(
    client: TestClient, payload: dict[str, str]
) -> None:
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422


def test_register_ignores_role_in_payload_and_creates_user_role(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "mallory@example.com", "password": PASSWORD, "role": "admin"},
    )

    with session_factory() as session:
        user = UserRepository(session).get_by_email("mallory@example.com")

    assert response.status_code == 201
    assert response.json()["role"] == "user"
    assert user is not None
    assert user.role == "user"


def test_login_returns_bearer_token_with_user_claims(
    client: TestClient, settings: Settings, make_user: Callable[..., User]
) -> None:
    user = make_user(email="alice@example.com")

    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": PASSWORD},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": user.id, "email": "alice@example.com", "role": "user"}

    claims = jwt.decode(body["access_token"], settings.JWT_SECRET, algorithms=["HS256"])
    assert claims["sub"] == str(user.id)
    assert claims["role"] == "user"
    expected_exp = time.time() + settings.JWT_EXPIRE_MINUTES * 60
    assert abs(claims["exp"] - expected_exp) < 60


def test_login_matches_email_case_insensitively(client: TestClient) -> None:
    client.post("/api/auth/register", json={"email": "alice@x.com", "password": PASSWORD})

    response = client.post("/api/auth/login", json={"email": "Alice@X.com", "password": PASSWORD})

    assert response.status_code == 200


@pytest.mark.parametrize(
    "credentials",
    [
        pytest.param(
            {"email": "alice@example.com", "password": "wrong-password"}, id="wrong-password"
        ),
        pytest.param({"email": "nobody@example.com", "password": PASSWORD}, id="unknown-email"),
    ],
)
def test_login_rejects_invalid_credentials_with_401_and_generic_detail(
    client: TestClient, make_user: Callable[..., User], credentials: dict[str, str]
) -> None:
    make_user(email="alice@example.com")

    response = client.post("/api/auth/login", json=credentials)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


def test_login_with_unknown_email_still_verifies_a_password_hash(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Skipping the slow hash check for unknown emails would let response times reveal accounts.
    verified: list[str] = []
    real_verify = PasswordHasher.verify

    def spy(self: PasswordHasher, password: str, hashed: str) -> bool:
        verified.append(password)
        return real_verify(self, password, hashed)

    monkeypatch.setattr(PasswordHasher, "verify", spy)

    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )

    assert response.status_code == 401
    assert verified == [PASSWORD]


def test_login_rejects_password_longer_than_registration_allows_with_422(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Hashing an unbounded password on every login attempt is a cheap way to burn server CPU.
    def fail_verify(self: PasswordHasher, password: str, hashed: str) -> bool:
        raise AssertionError("password should be rejected before hashing")

    monkeypatch.setattr(PasswordHasher, "verify", fail_verify)

    response = client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": "x" * 129}
    )

    assert response.status_code == 422
