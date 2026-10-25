from collections.abc import Callable

import pytest
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


def test_purchase_accepts_a_positive_quantity(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle(quantity=5)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/purchase", json={"quantity": 3}, headers=auth_headers(user)
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2


@pytest.mark.parametrize("quantity", [0, -1, 1.5])
def test_purchase_rejects_a_non_positive_or_fractional_quantity(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    quantity: float,
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle(quantity=5)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/purchase",
        json={"quantity": quantity},
        headers=auth_headers(user),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("stock", "body"),
    [(0, None), (2, {"quantity": 3})],
    ids=["out-of-stock", "quantity-exceeds-stock"],
)
def test_purchase_fails_when_stock_is_insufficient(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    stock: int,
    body: dict[str, int] | None,
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle(quantity=stock)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/purchase", json=body, headers=auth_headers(user)
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Vehicle is out of stock"}
    listing = client.get("/api/vehicles", headers=auth_headers(user))
    assert listing.json()[0]["quantity"] == stock


def test_purchasing_unknown_vehicle_returns_404(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")

    response = client.post("/api/vehicles/999/purchase", headers=auth_headers(user))

    assert response.status_code == 404


def test_purchasing_vehicle_without_token_returns_401(
    client: TestClient, make_vehicle: Callable[..., Vehicle]
) -> None:
    vehicle = make_vehicle(quantity=5)

    response = client.post(f"/api/vehicles/{vehicle.id}/purchase")

    assert response.status_code == 401


def test_admin_restocking_vehicle_increases_stock(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    vehicle = make_vehicle(quantity=2)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/restock", json={"quantity": 5}, headers=auth_headers(admin)
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 7
    listing = client.get("/api/vehicles", headers=auth_headers(admin))
    assert listing.json()[0]["quantity"] == 7


def test_restocking_vehicle_as_regular_user_returns_403(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    user = make_user(email="alice@example.com")
    vehicle = make_vehicle(quantity=2)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/restock", json={"quantity": 5}, headers=auth_headers(user)
    )

    assert response.status_code == 403
    listing = client.get("/api/vehicles", headers=auth_headers(user))
    assert listing.json()[0]["quantity"] == 2


@pytest.mark.parametrize(
    "body",
    [None, {}, {"quantity": 0}, {"quantity": -1}],
    ids=["no-body", "missing", "zero", "negative"],
)
def test_restock_rejects_a_missing_or_non_positive_quantity(
    client: TestClient,
    make_user: Callable[..., User],
    make_vehicle: Callable[..., Vehicle],
    auth_headers: Callable[[User], dict[str, str]],
    body: dict[str, int] | None,
) -> None:
    admin = make_user(email="root@example.com", role="admin")
    vehicle = make_vehicle(quantity=2)

    response = client.post(
        f"/api/vehicles/{vehicle.id}/restock", json=body, headers=auth_headers(admin)
    )

    assert response.status_code == 422


def test_restocking_unknown_vehicle_returns_404(
    client: TestClient,
    make_user: Callable[..., User],
    auth_headers: Callable[[User], dict[str, str]],
) -> None:
    admin = make_user(email="root@example.com", role="admin")

    response = client.post(
        "/api/vehicles/999/restock", json={"quantity": 5}, headers=auth_headers(admin)
    )

    assert response.status_code == 404
