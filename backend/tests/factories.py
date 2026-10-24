from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.security import PasswordHasher
from app.models import User
from app.repositories.user import UserRepository
from app.services.token import TokenService

PASSWORD = "s3cret-password"


@pytest.fixture
def make_user(client: TestClient, session_factory: sessionmaker[Session]) -> Callable[..., User]:
    # Depends on `client` so the app's lifespan has created the tables.
    def make(
        email: str = "alice@example.com", password: str = PASSWORD, role: str = "user"
    ) -> User:
        user = User(email=email, hashed_password=PasswordHasher().hash(password), role=role)
        with session_factory() as session:
            return UserRepository(session).add(user)

    return make


@pytest.fixture
def auth_headers(settings: Settings) -> Callable[[User], dict[str, str]]:
    tokens = TokenService(settings.JWT_SECRET, settings.JWT_ALGORITHM, settings.JWT_EXPIRE_MINUTES)

    def headers(user: User) -> dict[str, str]:
        return {"Authorization": f"Bearer {tokens.issue(user)}"}

    return headers
