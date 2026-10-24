from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.security import PasswordHasher
from app.domain.errors import EmailBelongsToNonAdmin
from app.models import User
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.token import TokenService
from tests.factories import PASSWORD


@pytest.fixture
def session(client: TestClient, session_factory: sessionmaker[Session]) -> Iterator[Session]:
    # Depends on `client` so the app's lifespan has created the tables.
    with session_factory() as session:
        yield session


@pytest.fixture
def auth_service(session: Session, settings: Settings) -> AuthService:
    tokens = TokenService(settings.JWT_SECRET, settings.JWT_ALGORITHM, settings.JWT_EXPIRE_MINUTES)
    return AuthService(UserRepository(session), PasswordHasher(), tokens)


def test_create_admin_creates_user_with_admin_role(
    auth_service: AuthService, session: Session
) -> None:
    auth_service.create_admin("root@example.com", PASSWORD)

    admin = UserRepository(session).get_by_email("root@example.com")
    assert admin is not None
    assert admin.role == "admin"
    assert PasswordHash.recommended().verify(PASSWORD, admin.hashed_password)


def test_create_admin_twice_does_not_create_duplicate(
    auth_service: AuthService, session: Session
) -> None:
    auth_service.create_admin("root@example.com", PASSWORD)
    auth_service.create_admin("root@example.com", PASSWORD)

    count = session.scalar(select(func.count()).select_from(User))
    assert count == 1


def test_create_admin_stores_email_lowercase(auth_service: AuthService, session: Session) -> None:
    auth_service.create_admin("Root@Example.com", PASSWORD)

    admin = UserRepository(session).get_by_email("root@example.com")
    assert admin is not None


def test_create_admin_twice_with_different_case_does_not_create_duplicate(
    auth_service: AuthService, session: Session
) -> None:
    auth_service.create_admin("Root@Example.com", PASSWORD)
    auth_service.create_admin("ROOT@example.com", PASSWORD)

    count = session.scalar(select(func.count()).select_from(User))
    assert count == 1


def test_create_admin_rejects_email_of_regular_user_and_keeps_role(
    auth_service: AuthService, session: Session, make_user: Callable[..., User]
) -> None:
    make_user(email="root@example.com")

    with pytest.raises(EmailBelongsToNonAdmin):
        auth_service.create_admin("root@example.com", PASSWORD)

    user = UserRepository(session).get_by_email("root@example.com")
    assert user is not None
    assert user.role == "user"
