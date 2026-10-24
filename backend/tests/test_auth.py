from fastapi.testclient import TestClient


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
