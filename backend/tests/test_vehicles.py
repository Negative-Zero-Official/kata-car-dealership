from collections.abc import Callable

from fastapi.testclient import TestClient

from app.models import User


def test_admin_creates_vehicle_and_price_round_trips_as_string(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.post(
        "/api/vehicles",
        json={
            "make": "Toyota",
            "model": "Corolla",
            "category": "sedan",
            "price": "24999.99",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body == {
        "id": body["id"],
        "make": "Toyota",
        "model": "Corolla",
        "category": "sedan",
        "price": "24999.99",
        "quantity": 5,
    }
