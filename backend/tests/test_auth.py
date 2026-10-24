from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from sqlalchemy.orm import Session, sessionmaker

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