from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.factory import create_app
from app.models import User
from tests.factories import PASSWORD


def test_get_session_writes_through_the_app_session_factory(
    settings: Settings, session_factory: sessionmaker[Session]
) -> None:
    # No dependency override: requests use the app's own get_session.
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/auth/register", json={"email": "alice@example.com", "password": PASSWORD}
        )

    with session_factory() as session:
        user = session.scalar(select(User).where(User.email == "alice@example.com"))
    assert response.status_code == 201
    assert user is not None
