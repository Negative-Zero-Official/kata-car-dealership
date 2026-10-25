from collections.abc import Callable

from fastapi.testclient import TestClient

from app.models import User, Vehicle


def test_purchasing_vehicle_decreases_stock_by_one(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle(quantity=5)

    response = client.post(f"/api/vehicles/{vehicle.id}/purchase", headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["quantity"] == 4
    listing = client.get("/api/vehicles", headers=auth_headers(user))
    assert listing.json()[0]["quantity"] == 4
